import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { GraphState, DatasetSchema } from "../types.js";
import { parseQuery } from "../utils/searchUtils.js";
import { logger } from '../logger.js';

const apiSelectionPrompt = ChatPromptTemplate.fromTemplate(`
  Given the following query: {{query}}
  
  Please select the most appropriate API from the following list:
  {{apis}}
  
  Provide your response in the following JSON format:
  {
    "api": "API Name",
    "parameters": {
      "param1": "default_value",
      "param2": "default_value"
    },
    "description": "Brief description of what the API does"
  }
  
  Only include parameters that are relevant to the query.
`, { templateFormat: "mustache" });

function calculateRelevance(api: DatasetSchema, query: string, parsedQuery: ReturnType<typeof parseQuery>): number {
  let score = 0;
  const lowerQuery = query.toLowerCase();
  const lowerApiName = api.api_name.toLowerCase();

  if (lowerQuery.includes(lowerApiName)) score += 10;
  if (lowerQuery.includes(api.category_name.toLowerCase())) score += 5;

  // Additional scoring based on parsed query
  switch (parsedQuery.type) {
    case 'genre':
    case 'plays':
    case 'performer':
      if (api.api_name === "Get Track" || api.api_name === "Search Tracks") {
        score += 5;
      }
      break;
    case 'trending':
      if (parsedQuery.title === 'tracks' && api.api_name === "Get Trending Tracks") {
        score += 10;
      } else if (parsedQuery.title === 'playlists' && api.api_name === "Get Trending Playlists") {
        score += 10;
      }
      break;
    case 'search_track':
      if (api.api_name === "Search Tracks") {
        score += 10;
      }
      break;
    case 'search_playlist':
      if (api.api_name === "Search Playlists") {
        score += 10;
      }
      break;
    case 'search_user':
      if (api.api_name === "Search Users") {
        score += 10;
      }
      break;
  }

  return score;
}

export async function selectApi(state: GraphState): Promise<Partial<GraphState>> {
  const { query, apis, llm } = state;

  if (!apis || apis.length === 0) {
    return { error: "No APIs available for selection" };
  }

  const parsedQuery = parseQuery(query);
  logger.debug(`Parsed query: ${JSON.stringify(parsedQuery)}`);

  const scoredApis = apis.map(api => ({
    ...api,
    relevanceScore: calculateRelevance(api, query, parsedQuery)
  }));

  scoredApis.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const topApis = scoredApis.slice(0, 5);

  const chain = RunnableSequence.from([
    apiSelectionPrompt,
    llm,
    new StringOutputParser(),
    (output: string) => JSON.parse(output),
  ]);

  try {
    const apiList = topApis.map(api => `${api.api_name}: ${api.api_description}`).join("\n");
    const result = await chain.invoke({ query, apis: apiList });

    const selectedApi = topApis.find(api => api.api_name === result.api);
    if (!selectedApi) {
      return { error: "No suitable API found" };
    }

    logger.info("Query:", query);
    logger.info("Selected API:", selectedApi.api_name);
    logger.info("Parameters:", result.parameters);

    return { bestApi: { ...selectedApi, parameters: result.parameters } };
  } catch (error) {
    logger.error("Error in selectApi:", error);
    return { error: "Failed to select API" };
  }
}