import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatOpenAI } from "@langchain/openai";
import { DatasetSchema, GraphState } from "../types.js";

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
    "description": "Brief description of what the API does",
  }
  
  Only include parameters that are relevant to the query.
  `);

function calculateRelevance(api: DatasetSchema, query: string): number {
  let score = 0;
  const lowerQuery = query.toLowerCase();
  const lowerApiName = api.api_name.toLowerCase();

  if (lowerQuery.includes(lowerApiName)) score += 10;
  if (lowerQuery.includes(api.category_name.toLowerCase())) score += 5;

  // Add more conditions based on your specific requirements

  return score;
}

export async function selectApi(state: GraphState): Promise<Partial<GraphState>> {
  const { query, apis, llm } = state;

  if (!apis || apis.length === 0) {
    console.error("No APIs available for selection.");
    return { error: "No APIs available for selection" };
  }

  if (!llm) {
    console.error("Language model (llm) is not initialized.");
    return { error: "Language model is not initialized" };
  }

  if (!query) {
    console.error("Query is null or undefined.");
    return { error: "Query is null or undefined" };
  }

  // Calculate relevance scores
  const scoredApis = apis.map(api => ({
    ...api,
    relevanceScore: calculateRelevance(api, query)
  }));

  // Sort APIs by relevance score
  scoredApis.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Take top 5 most relevant APIs
  const topApis = scoredApis.slice(0, 5);

  const chain = RunnableSequence.from([
    apiSelectionPrompt,
    llm,
    new StringOutputParser(),
    (output: string) => {
      try {
        return JSON.parse(output);
      } catch (error) {
        console.error("Error parsing LLM output:", error);
        throw new Error("Invalid LLM output format");
      }
    },
  ]);

  try {
    const apiList = topApis.map(api => `${api.api_name}: ${api.api_description}`).join("\n");

    const result = await chain.invoke({
      query,
      apis: apiList,
    });

    if (!isValidApiOutput(result)) {
      throw new Error("Invalid API output format");
    }

    const selectedApi = apis.find(api => api.api_name === result.api);
    if (!selectedApi) {
      throw new Error(`Selected API '${result.api}' not found in available APIs`);
    }

    return {
      bestApi: {
        ...selectedApi,
        parameters: result.parameters,
      },
      query,
    };
  } catch (error) {
    console.error("Error selecting API:", error);
    return { error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

function isValidApiOutput(output: any): output is { api: string; parameters: Record<string, any>; description: string } {
  return (
    output &&
    typeof output.api === 'string' &&
    typeof output.parameters === 'object' &&
    typeof output.description === 'string'
  );
}