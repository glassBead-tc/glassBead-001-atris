import { StructuredTool, tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { GraphState } from "../index.js";
import { DatasetSchema, DatasetParameters } from "../types.js";
import * as readline from "readline";
import { findMissingParams } from "../utils.js";
import fs from "fs";
import { HIGH_LEVEL_CATEGORY_MAPPING, TRIMMED_CORPUS_PATH } from "../constants.js";
import { OpenAIChatInput } from "@langchain/openai";

/**
 * Utility function to call the Audius API.
 */
export async function callAudiusAPI<Output extends Record<string, any> = Record<string, any>>(
  endpoint: string,
  params: Record<string, string>
): Promise<Output> {
  if (!process.env.AUDIUS_API_KEY) {
    throw new Error("AUDIUS_API_KEY is not set");
  }

  const baseURL = process.env.AUDIUS_BASE_URL || "https://api.audius.co";
  const queryParams = new URLSearchParams(params).toString();
  const url = `${baseURL}${endpoint}?${queryParams}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-KEY": process.env.AUDIUS_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      let resText: string;
      try {
        resText = JSON.stringify(await response.json(), null, 2);
      } catch (_) {
        try {
          resText = await response.text();
        } catch (_) {
          resText = response.statusText;
        }
      }
      throw new Error(`Failed to fetch data from ${endpoint}.\nResponse: ${resText}`);
    }

    const data: Output = await response.json();
    return data;
  } catch (error) {
    console.error(`Error in callAudiusAPI: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Selects the best Audius API based on the user's query.
 *
 * @param {GraphState} state - The current state of the graph.
 * @returns {Promise<Partial<GraphState>>} - The updated graph state with the selected API.
 */
export async function selectApi(state: GraphState): Promise<Partial<GraphState>> {
  const { llm, query, apis } = state;

  if (!apis || apis.length === 0) {
    throw new Error("No APIs available for selection.");
  }

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are an expert software engineer assisting in selecting the most suitable Audius API for the given query.
Given the user's query, utilize the 'Select_API' tool to determine the best API.`,
    ],
    ["human", `Query: ${query}`],
  ]);

  const selectTool = createSelectAPITool(apis, query);
  const modelWithTools = llm.withStructuredOutput(selectTool);
  const chain = prompt.pipe(modelWithTools).pipe(selectTool);

  try {
    const response = await chain.invoke({
      api: "", // The LLM will populate this based on the prompt
    });
    const bestApi: DatasetSchema = JSON.parse(response);
    return {
      bestApi,
    };
  } catch (error) {
    console.error(`Error in selectApi: ${(error as Error).message}`);
    throw error;
  }
}

// READ/PARSE USER INPUT -> EXTRACT PARAMS -> REQUEST PARAMS

/**
 * Format for user input: <name>,<value>:::<name>,<value>
 */
const paramsFormat = `<name>,<value>:::<name>,<value>`;

/**
 * Tool to read user input from the command line.
 *
 * Prompts the user to provide missing parameters in a specific format.
 */
export const readUserInputTool = tool(
  async (input: { missingParams: { name: string; description: string }[] }) => { 
    try {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const missingParamsString = input.missingParams
        .map((p) => `Name: ${p.name}, Description: ${p.description}`)
        .join("\n----\n");
      const question = `LangTool couldn't find all the required params for the API.\nMissing params:\n${missingParamsString}\nPlease provide the missing params in the following format:\n<name>,<value>:::<name>,<value>\n`;

      return new Promise<string>((resolve) => {
        rl.question(question, (answer) => {
          rl.close();
          resolve(answer);
        });
      });
    } catch (e: any) {
      console.error(e);
      return "";
    }
  },
  {
    name: "read_user_input",
    description:
      "Prompts the user to provide missing API parameters in the format <name>,<value>:::<name>,<value>.",
    schema: z.object({
      missingParams: z
        .array(
          z.object({
            name: z.string().describe("The name of the missing parameter."),
            description: z
              .string()
              .describe("A description of the missing parameter."),
          })
        )
        .describe("A list of missing parameters with their descriptions."),
    }),
  }
);

/**
 * Parses the user input string into a key-value pair.
 *
 * @param {string} input - The raw input string from the user.
 * @returns {Record<string, string>} - An object mapping parameter names to their values.
 */
export function parseUserInput(input: string): Record<string, string> {
  if (!input.includes(":::")) {
    const [key, value] = input.split(",");
    return { [key.trim()]: value.trim() };
  }

  const splitParams = input.split(":::");
  let params: Record<string, string> = {};
  splitParams.forEach((param) => {
    const [key, value] = param.split(",");
    if (key && value) {
      params[key.trim()] = value.trim();
    }
  });
  return params;
} 

/**
 * Tool to request missing parameters from the user.
 *
 * @param {GraphState} state - The current state of the graph.
 * @returns {Promise<Partial<GraphState>>} - The updated graph state with new parameters.
 */
export async function requestParameters(
  state: GraphState
): Promise<Partial<GraphState>> {
  const { bestApi, parameters } = state;
  if (!bestApi) {
    throw new Error("No best API found");
  }

  const requiredParamsKeys = bestApi.required_parameters.map(
    ({ name }) => name
  );
  const extractedParamsKeys = Object.keys(parameters ?? {});
  const missingParams = findMissingParams(
    requiredParamsKeys,
    extractedParamsKeys
  );
  const missingParamsSchemas = missingParams
    .map((missingParamKey) =>
      bestApi.required_parameters.find(({ name }) => name === missingParamKey)
    )
    .filter((p) => p !== undefined) as DatasetParameters[];

  // Invoke the readUserInputTool to get user input for missing parameters
  const userInput = await readUserInputTool.invoke({
    missingParams: missingParamsSchemas,
  });

  // Parse the user input string into key-value pairs
  const parsedUserInput = parseUserInput(userInput as string);

  return {
    parameters: {
      ...parameters,
      ...parsedUserInput,
    },
  };
}

/**
 * Tool to extract parameters from a user's query using the ExtractHighLevelCategoriesTool.
 *
 * @param {GraphState} state - The current state of the graph.
 * @returns {Promise<Partial<GraphState>>} - The updated graph state with extracted parameters.
 */
export async function extractParameters(
  state: GraphState
): Promise<Partial<GraphState>> {
  const { llm, query, bestApi } = state;

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are an expert software engineer. You're provided with a list of required and optional parameters for an API, along with a user's query.

Given the query and the parameters, use the 'extract_params' tool to extract the parameters from the query.

If the query does not contain any of the parameters, do not return params.

Required parameters: {requiredParams}

Optional parameters: {optionalParams}`,
    ],
    ["human", `Query: {query}`],
  ]);

  const schema = z
    .object({
      params: z
        .record(z.string())
        .describe("The parameters extracted from the query.")
        .optional(),
    })
    .describe("The extracted parameters from the query.");

  // Define the extractParamsTool within tools.ts
  const extractParamsTool = tool(
    async (input: { requiredParams: string; optionalParams: string; query: string }) => {
      // This function should interact with the LLM to extract parameters
      // Implementation details would depend on the specific LLM setup
      // For demonstration, returning an empty object
      return JSON.stringify({});
    },
    {
      name: "extract_params",
      description:
        "Extracts parameters from a user's query based on the provided required and optional parameters.",
      schema: z.object({
        requiredParams: z.string().describe("List of required parameters."),
        optionalParams: z.string().describe("List of optional parameters."),
        query: z.string().describe("The user's query."),
      }),
    }
  );

  // Bind the extractParamsTool to the language model
  const modelWithTools = llm.withStructuredOutput(extractParamsTool);

  // Create the chain by piping the prompt through the model and tool
  const chain = prompt.pipe(modelWithTools).pipe(extractParamsTool);

  const requiredParams = bestApi?.required_parameters
    .map(
      (p) => `Name: ${p.name}, Description: ${p.description}, Type: ${p.type}`
    )
    .join("\n");
  const optionalParams = bestApi?.optional_parameters
    .map(
      (p) => `Name: ${p.name}, Description: ${p.description}, Type: ${p.type}`
    )
    .join("\n");

  const response = await chain.invoke({
    query,
    requiredParams,
    optionalParams,
  });

  // Parse the response to get extracted parameters
  const extractedParams: Record<string, string> = JSON.parse(response);

  return {
    parameters: extractedParams ?? null,
  };
} 

// EXTRACT QUERY CATEGORY

/**
 * Tool to extract high-level categories from a user query.
 */
export const ExtractHighLevelCategoriesTool = tool(
  async (input: { highLevelCategories: string[] }) => {
    const categoriesMapped = input.highLevelCategories
      .map(
        (category) =>
          HIGH_LEVEL_CATEGORY_MAPPING[
            category as keyof typeof HIGH_LEVEL_CATEGORY_MAPPING
          ]
      )
      .flat();
    return JSON.stringify(categoriesMapped);
  },
  {
    name: "ExtractHighLevelCategories",
    description:
      "Given a user query, extract the high level category which best represents the query.",
    schema: z.object({
      highLevelCategories: z
        .array(
          z
            .enum(
              Object.keys(HIGH_LEVEL_CATEGORY_MAPPING) as [string, ...string[]]
            )
            .describe("An enum of all categories which best match the query.")
        )
        .describe("The high level categories to extract from the query."),
    }),
  }
);

/**
 * Extracts high-level categories based on the user's query using the ExtractHighLevelCategoriesTool.
 *
 * @param {GraphState} state - The current state of the graph.
 * @returns {Promise<Partial<GraphState>>} - The updated graph state with extracted categories.
 */
export async function extractCategory(
  state: GraphState
): Promise<Partial<GraphState>> {
  const { llm, query } = state;

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are an expert software engineer.

Currently, you are helping a fellow engineer select the best category of APIs based on their query.
You are only presented with a list of high level API categories, and their query.
Think slowly, and carefully select the best category for the query.
Here are all the high level categories, and every tool name that falls under them:
{categoriesAndTools}`,
    ],
    ["human", `Query: {query}`],
  ]);

  // Prepare the prompt with categories and tools
  const allApis: DatasetSchema[] = JSON.parse(
    fs.readFileSync(TRIMMED_CORPUS_PATH, "utf-8")
  );
  const categoriesAndTools = Object.entries(HIGH_LEVEL_CATEGORY_MAPPING)
    .map(([high, low]) => {
      const allTools = allApis.filter((api) => low.includes(api.category_name));
      return `High Level Category: ${high}\nTools:\n${allTools
        .map((item) => `Name: ${item.tool_name}`)
        .join("\n")}`;
    })
    .join("\n\n");

  // Bind the tool to the language model
  const modelWithTools = llm.withStructuredOutput([ExtractHighLevelCategoriesTool]);

  // Create the chain by piping the prompt through the model and tool
  const chain = prompt.pipe(modelWithTools).pipe(ExtractHighLevelCategoriesTool);

  // Invoke the chain with the query and categories/tools mapping
  const response = await chain.invoke({
    highLevelCategories: [], // The LLM will populate this based on the prompt
  });

  // Parse the response to get high-level categories
  const highLevelCategories: string[] = JSON.parse(response);

  return {
    categories: highLevelCategories,
  };
}

/**
 * Factory function to create the SelectAPITool.
 *
 * @param {DatasetSchema[]} apis - The list of available APIs.
 * @param {string} query - The user's query.
 * @returns {StructuredTool} - An instance of the SelectAPITool.
 */
export function createSelectAPITool(apis: DatasetSchema[], query: string): StructuredTool {
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

  const schema = z.object({
    api: z
      .enum(apis.map((api) => api.api_name) as [string, ...string[]])
      .describe("The name of the API which best matches the query."),
  });

  return tool(
    async (input: { api: string }) => {
      const { api: apiName } = input;
      const bestApi = apis.find((a) => a.api_name === apiName);
      if (!bestApi) {
        throw new Error(
          `API ${apiName} not found in list of APIs: ${apis
            .map((a) => a.api_name)
            .join(", ")}`
        );
      }
      return JSON.stringify(bestApi);
    },
    {
      name: "Select_API",
      description,
      schema,
    }
  );
}

/**
 * List of all tools used in the ecosystem.
 */
export const ALL_TOOLS_LIST = {
  extractCategory,
  createSelectAPITool, // Updated to use the factory function
  extractParameters,
  requestParameters,
  readUserInputTool,
  ExtractHighLevelCategoriesTool,
  // Add other tools here as needed
};