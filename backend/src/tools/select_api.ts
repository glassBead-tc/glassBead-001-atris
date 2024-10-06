import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { GraphState } from "index.js";
import { DatasetSchema } from "types.js";

/**
 * Given a users query, choose the API which best
 * matches the query.
 */
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

  constructor(apis: DatasetSchema[], query: string) {
    super();
    this.description = SelectAPITool.createDescription(apis, query);
    this.schema = z.object({
      api: z
        .enum(apis.map((api) => api.api_name) as [string, ...string[]])
        .describe("The name of the API which best matches the query."),
    });
    this.apis = apis;
  }

  static createDescription(apis: DatasetSchema[], query: string): string {
    const description = `Given the following query by a user, select the API which will best serve the query.

Query: ${query}

APIs:
${apis
  .map(
    (api) => `Tool name: ${api.tool_name}
API Name: ${api.api_name}
Description: ${api.api_description}
Parameters: ${[...api.required_parameters, ...api.optional_parameters]
      .map((p) => `Name: ${p.name}, Description: ${p.description}`)
      .join("\n")}`
  )
  .join("\n---\n")}`;

    return description;
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

/**
 * @param {GraphState} state
 */
export async function selectApi(
  state: GraphState
): Promise<Partial<GraphState>> {
  const { llm, query, apis } = state;
  if (apis === null || apis.length === 0) {
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
- Are there any special parameters or filters mentioned in the query?`,
    ],
    ["human", `Query: {query}`],
  ]);

  const tool = new SelectAPITool(apis, query);

  const modelWithTools = llm.withStructuredOutput(tool);

  const chain = prompt.pipe(modelWithTools).pipe(tool);

  const response = await chain.invoke({
    query,
  });
  const bestApi: DatasetSchema = JSON.parse(response);

  return {
    bestApi,
    query, // Include the query in the return value
  };
}
