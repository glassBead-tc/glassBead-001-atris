import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ApiEndpoint, GraphState, DatasetSchema, DatasetParameters } from "../types.js";
import { KeywordAwareness } from "./keyword_awareness.js";
import { logger, redactSensitiveInfo } from '../logger.js';

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

  constructor(apis: DatasetSchema[], query: string) {
    super();
    this.description = SelectAPITool.createDescription(apis, query);
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
      throw new Error(
        `API ${apiName} not found in list of APIs: ${this.apis
          .map((a) => a.api_name)
          .join(", ")}`
      );
    }
    return JSON.stringify(bestApi);
  }
}

export async function selectApi(state: GraphState): Promise<Partial<GraphState>> {
  const { llm, query, apis } = state;
  if (apis === null || apis.length === 0) {
    logger.error("No APIs passed to select_api_node");
    throw new Error("No APIs passed to select_api_node");
  }

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are an expert on the Audius API, helping to select the best API endpoint for user queries about Audius music streaming platform.
Given the user's query, use the 'Select_API' tool to choose the most appropriate Audius API endpoint.
Consider the following when making your selection:
- Is the query about tracks, users, playlists, or general Audius information?
- Does the query require searching or fetching a specific item by ID?
- Are there any special parameters or filters mentioned in the query?
Additionally, consider the keyword relevance scores provided for each API.`,
    ],
    ["human", `Query: {query}`],
  ]);

  const tool = new SelectAPITool(apis, query);

  // Calculate keyword relevance scores
  const scoredApis = apis.map(api => {
    const bridgeApiEndpoint = convertToBridgeApiEndpoint(api);
    return {
      ...api,
      relevanceScore: tool.keywordAwareness.calculateApiRelevance(bridgeApiEndpoint as unknown as ApiEndpoint, query)
    };
  });

  // Sort APIs by relevance score
  scoredApis.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Add relevance scores to the API descriptions
  const apisWithScores = scoredApis.map(api => ({
    ...api,
    api_description: `${api.api_description} (Relevance Score: ${api.relevanceScore})`
  }));

  const modelWithTools = llm.withStructuredOutput(tool);

  const chain = prompt.pipe(modelWithTools).pipe(tool);

  const response = await chain.invoke({
    query,
    apis: apisWithScores,
  });
  const bestApi: DatasetSchema = JSON.parse(response);

  return {
    bestApi,
    query,
  };
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