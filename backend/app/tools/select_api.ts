import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { GraphState, DatasetSchema } from "../types.js";
import { parseQuery } from "../utils/searchUtils.js";
import { logger } from '../logger.js';

// const apiSelectionPrompt = ChatPromptTemplate.fromTemplate(`
//   Given the following query: {{query}}
  
//   Please select the most appropriate API from the following list:
//   {{apis}}
  
//   Provide your response in the following JSON format:
//   {
//     "api": "API Name",
//     "parameters": {
//       "param1": "default_value",
//       "param2": "default_value"
//     },
//     "description": "Brief description of what the API does"
//   }
  
//   Only include parameters that are relevant to the query.
// `, { templateFormat: "mustache" });

function calculateRelevance(api: DatasetSchema, query: string, parsedQuery: ReturnType<typeof parseQuery>): number {
  let score = 0;
  const lowerQuery = query.toLowerCase();
  const lowerApiName = api.api_name.toLowerCase();

  if (lowerQuery.includes(lowerApiName)) score += 10;
  if (lowerQuery.includes(api.category_name.toLowerCase())) score += 5;

  // Additional scoring based on parsed query
  switch (parsedQuery.type) {
    case 'trending':
      if (parsedQuery.type === 'trending' && api.api_name === "Get Trending Tracks") {
        score += 50; // Increase this score significantly
      }
      break;
    case 'mostFollowers':
      if (api.api_name === "Search Users") {
        score += 15;
      }
      break;
    case 'genre':
      if (api.api_name === "Search Tracks") {
        score += 15;
      }
      break;
  }

  return score;
}

export async function selectApi(state: GraphState): Promise<Partial<GraphState>> {
  const { query, apis } = state;

  if (!apis || apis.length === 0) {
    return { error: "No APIs available" };
  }

  const parsedQuery = parseQuery(query);

  let bestApi: DatasetSchema | null = null;
  let highestScore = -1;

  for (const api of apis) {
    const score = calculateRelevance(api, query, parsedQuery);
    if (score > highestScore) {
      highestScore = score;
      bestApi = api;
    }
  }

  if (!bestApi) {
    return { error: "No suitable API found" };
  }

  let params: Record<string, any> = {};

  switch (bestApi.api_name) {
    case "Get Trending Tracks":
      params = { limit: 3 }; // Set the limit to 3 for top trending tracks
      break;
    case "Search Users":
      if (parsedQuery.type === 'mostFollowers') {
        params = { query: "", limit: 1, sort_by: "follower_count", order_by: "desc" };
      } else {
        params = { query: parsedQuery.title || "" };
      }
      break;
    case "Search Tracks":
      if (parsedQuery.type === 'genre') {
        params = { query: `${parsedQuery.title} ${parsedQuery.artist}`.trim() };
      } else {
        params = { query: parsedQuery.title || "" };
      }
      break;
  }

  console.log(`Selected API: ${bestApi?.api_name}, Query: "${query}"`);

  return { bestApi, params };
}