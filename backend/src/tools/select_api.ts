import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ApiEndpoint, GraphState, DatasetSchema, DatasetParameters } from "../types.js";
import { KeywordAwareness } from "./keyword_awareness.js";

// New interface to bridge DatasetSchema and ApiEndpoint
interface BridgeApiEndpoint extends Omit<ApiEndpoint, 'required_parameters' | 'optional_parameters'> {
  required_parameters: DatasetParameters[];
  optional_parameters: DatasetParameters[];
}

export class SelectAPITool extends StructuredTool {
  schema: z.ZodObject<
    {
      api: z.ZodEnum<[string, ...string[]]>;
    },
    "strip",
    z.ZodTypeAny,
    {
      api: string;
    },
    {
      api: string;
    }
  >;

  name = "Select_API";
  description: string;
  apis: DatasetSchema[];
  keywordAwareness: KeywordAwareness;

  constructor(apis: DatasetSchema[], query: string | null) {
    super();
    this.description = SelectAPITool.createDescription(apis, query || "");
    this.schema = z.object({
      api: z
        .enum(apis.map((api) => api.api_name) as [string, ...string[]])
        .describe("The name of the API which best matches the query."),
    });
    this.apis = apis;
    // Convert DatasetSchema[] to BridgeApiEndpoint[] for KeywordAwareness
    const bridgeApiEndpoints = apis.map(convertToBridgeApiEndpoint);
    this.keywordAwareness = new KeywordAwareness(bridgeApiEndpoints as unknown as ApiEndpoint[]);
  }

  static createDescription(apis: DatasetSchema[], query: string): string {
    const apiDescriptions = apis.map(
      (api) => `${api.api_name}: ${api.api_description}`
    ).join("\n");
    return `Given the following APIs:\n${apiDescriptions}\n\nSelect the most appropriate API for the query: "${query}"`;
  }

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    const { api: apiName } = input;
    const bestApi = this.apis.find((a) => a.api_name === apiName);
    if (!bestApi) {
      console.error(`API ${apiName} not found in list of APIs: ${this.apis.map((a) => a.api_name).join(", ")}`);
      return JSON.stringify({ error: `API ${apiName} not found` });
    }
    return JSON.stringify(bestApi);
  }
}

// Fix the calculateRelevance function
export function calculateRelevance(api: DatasetSchema, query: string | null): number {
    if (!query) return 0;
    
    let score = 0;
    const lowerQuery = query.toLowerCase();

    // Check for presence of both artist and track name
    if (lowerQuery.includes(" by ") && api.api_name === "Search Tracks") {
        score += 50;
    }

    // Check for exact track name match
    const exactTrackMatch = query.match(/'([^']+)'/);
    if (exactTrackMatch && api.api_name === "Search Tracks") {
        score += 50; // Highest priority for exact track name matches
    }

    if (api.api_name === "Search Tracks" && query.includes("'")) {
        score += 40;
    } else if (api.api_name === "Search Users" && lowerQuery.includes("user")) {
        score += 40;
    } else if (api.api_name === "Search Playlists" && lowerQuery.includes("playlist")) {
        score += 40;
    }

    if (api.api_name === "Search Tracks" && (lowerQuery.includes("track") || lowerQuery.includes("song"))) {
        score += 30;
    }

    if (api.api_name === "Get Track" && lowerQuery.includes("track")) {
        score += 25;
    }

    if (api.api_name === "Search Users" && (lowerQuery.includes("user") || lowerQuery.includes("artist"))) {
        score += 30;
    }

    if (api.api_name === "Get User" && lowerQuery.includes("user")) {
        score += 25;
    }

    if (api.api_name === "Search Playlists" && lowerQuery.includes("playlist")) {
        score += 30;
    }

    if (api.api_name === "Get Playlist" && lowerQuery.includes("playlist")) {
        score += 25;
    }

    if (api.api_name === "Get Trending Tracks" && lowerQuery.includes("trending")) {
        score += 35;
    }

    return score;
}

export async function selectApi(state: GraphState): Promise<Partial<GraphState>> {
  const { query, apis, llm } = state;
  
  console.log("Selecting API for query:", query);
  
  if (!apis || apis.length === 0) {
    console.error("No APIs available for selection. Check if APIs are properly loaded.");
    return { error: "No APIs available for selection" };
  }

  console.log("Available APIs:", apis.map(api => api.api_name));

  if (!llm) {
    console.error("Language model (llm) is not initialized.");
    return { error: "Language model is not initialized" };
  }

  if (!query) {
    console.error("Query is null or undefined.");
    return { error: "Query is null or undefined" };
  }

  // Calculate relevance scores using the merged function
  const scoredApis = apis.map(api => ({
    ...api,
    relevanceScore: calculateRelevance(api, query)
  }));

  // Sort APIs by relevance score
  scoredApis.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Add relevance scores to the API descriptions
  const apisWithScores = scoredApis.map(api => ({
    ...api,
    api_description: `${api.api_description} (Relevance Score: ${api.relevanceScore.toFixed(2)})`
  }));

  // Create a new SelectAPITool instance
  const selectAPITool = new SelectAPITool(apisWithScores, query);

  // Create a prompt template
  const prompt = ChatPromptTemplate.fromTemplate(
    "Given the query: {query}\n\nSelect the most appropriate API from the following options:\n{apis}"
  );

  // Create a chain using the language model and the SelectAPITool
  const chain = prompt.pipe(llm).pipe(selectAPITool);

  try {
    console.log("Invoking chain with query:", query);
    const response = await chain.invoke({
      query,
      apis: apisWithScores.map(api => `${api.api_name}: ${api.api_description}`).join("\n"),
    });
    console.log("Chain response:", response);
    const bestApi: DatasetSchema = JSON.parse(response);

    console.log("Selected API:", bestApi.api_name);
    return {
      bestApi,
      query,
    };
  } catch (error: unknown) {
    console.error("Error selecting API:", error);
    if (error instanceof Error) {
      return { error: `Failed to select API: ${error.message}` };
    } else {
      return { error: "Failed to select API: Unknown error" };
    }
  }
}

// Helper function to convert DatasetSchema to BridgeApiEndpoint
function convertToBridgeApiEndpoint(api: DatasetSchema): BridgeApiEndpoint {
  return {
    id: api.id,
    category_name: api.category_name,
    tool_name: api.tool_name,
    api_name: api.api_name,
    api_description: api.api_description,
    required_parameters: api.required_parameters,
    optional_parameters: api.optional_parameters,
    method: api.method as 'GET' | 'POST' | 'PUT' | 'DELETE',
    template_response: api.template_response,
    api_url: api.api_url
  };
}
