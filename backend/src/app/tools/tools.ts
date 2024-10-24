
import { StructuredTool, StructuredToolInterface, tool } from "@langchain/core/tools";
import { RunnableToolLike } from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import nlp from "compromise";
import { z } from "zod";
import { GraphState, DatasetSchema, DatasetParameters, ComplexityLevel, EntityType, QueryType } from "../types.js";
import { logger } from "../logger.js";
import * as readline from "readline";
import { findMissingParams } from "../utils.js";
import fs from "fs";
import { HIGH_LEVEL_CATEGORY_MAPPING, TRIMMED_CORPUS_PATH } from "../constants.js";

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

  const selectTool = createSelectAPITool(apis, query!);
  const modelWithTools = llm!.withStructuredOutput(selectTool);
  const chain = prompt.pipe(modelWithTools).pipe(selectTool);

  try {
    const response = await chain.invoke({
      api: "", // The LLM will populate this based on the prompt
    });
    const bestApi: DatasetSchema = JSON.parse(response as string);
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

// Define the categorization function
export const CategorizeQueryTool = tool(
  async ({ state }: { state: { query: string } }): Promise<Partial<GraphState>> => {
    let normalizedQuery = state.query.toLowerCase().trim();

    // Check for track play count queries
    const trackPlayCountRegex = /how many plays does (the track )?(.*?) have\??/i;
    const trackPlayCountMatch = normalizedQuery.match(trackPlayCountRegex);

    if (trackPlayCountMatch) {
      const trackName = trackPlayCountMatch[2].trim();
      return {
        queryType: 'search_tracks' as QueryType,
        entityType: 'track' as EntityType,
        entityName: trackName,
        isEntityQuery: true,
        complexity: 'simple' as ComplexityLevel
      };
    }

    // Expand contractions
    const contractions: Record<string, string> = {
      "what's": "what is",
      "where's": "where is",
      "when's": "when is",
      "who's": "who is",
      "how's": "how is",
      "that's": "that is",
      "there's": "there is",
      "here's": "here is",
      "it's": "it is",
      "isn't": "is not",
      "aren't": "are not",
      "wasn't": "was not",
      "weren't": "were not",
      "haven't": "have not",
      "hasn't": "has not",
      "hadn't": "had not",
      // Add more contractions as needed
    };
  
    Object.keys(contractions).forEach((contraction) => {
      const regex = new RegExp(`\\b${contraction}\\b`, 'gi');
      normalizedQuery = normalizedQuery.replace(regex, contractions[contraction]);
    });
  
    const doc = nlp(normalizedQuery);
    logger.debug(`Processing query: "${normalizedQuery}"`);
  
    // Enhanced entity extraction using NLP
    const entities = doc.terms().out('array');
    let mappedEntityType: EntityType | null = null;
  
    if (entities.length > 0) {
      const entity = entities[0].toLowerCase();
      switch (entity) {
        case 'tracks':
        case 'track':
          mappedEntityType = 'track';
          break;
        case 'users':
        case 'user':
          mappedEntityType = 'user';
          break;
        case 'playlists':
        case 'playlist':
          mappedEntityType = 'playlist';
          break;
        case 'genres':
        case 'genre':
          mappedEntityType = null; // Genres are not entities in our current system
          break;
      }
  
      return {
        queryType: mappedEntityType ? `search_${mappedEntityType}s` as QueryType : 'trending_tracks' as QueryType,
        isEntityQuery: !!mappedEntityType,
        entityType: mappedEntityType,
        complexity: mappedEntityType ? 'moderate' as ComplexityLevel : 'simple' as ComplexityLevel,
        entityName: mappedEntityType ? entity : null,
      };
    }
  
    // Default categorization for trending tracks
    if (/trending|popular|top tracks/i.test(normalizedQuery)) {
      return {
        queryType: 'trending_tracks' as QueryType,
        isEntityQuery: false,
        entityType: null,
        entityName: null,
        complexity: 'simple' as ComplexityLevel,
      };
    }
  
    // Final default return
    return {
      queryType: 'general' as QueryType,
      entityType: null,
      isEntityQuery: false,
      complexity: 'simple' as ComplexityLevel,
      entityName: null,
    };
  },
  {
    name: "categorize_query",
    description: "Categorizes the user's query to determine its type and complexity.",
    schema: z.object({
      state: z.object({
        query: z.string().describe("The user's query string to classify"),
      }),
    }),
  }
);

export const ExtractCategoryTool = tool(
  async ({ state }: { state: { query: string } }): Promise<Partial<GraphState>> => {
    return CategorizeQueryTool.invoke({ state });
  },
  {
    name: "extract_category",
    description: "Extracts the category from the user's query.",
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
  const modelWithTools = llm!.withStructuredOutput(extractParamsTool);

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

  const { llm, query } = state;

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are an expert software engineer.

Currently, you are helping a fellow engineer select the best category of APIs based on their query.
You are only presented with a list of high level API categories, and their query.
Think slowly, and carefully select the best category for the query.
Here are all the high level categories, and every tool name that falls under them:
${categoriesAndTools}`,
    ],
    ["human", `Query: ${query}`],
  ]);


  // Bind the tool to the language model
  const modelWithTools = llm!.withStructuredOutput([ExtractHighLevelCategoriesTool]);

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
 * @returns {StructuredToolInterface | RunnableToolLike} - An instance of the SelectAPITool.
 */
export function createSelectAPITool(apis: DatasetSchema[], query: string): StructuredTool | RunnableToolLike {
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
    async (input: { api: string }): Promise<Partial<GraphState>> => {
      const { api: apiName } = input;
      const bestApi = apis.find((a) => a.api_name === apiName);
      if (!bestApi) {
        throw new Error(
          `API ${apiName} not found in the list of available APIs: ${apis
            .map((a) => a.api_name)
            .join(", ")}`
        );
      }
      return {
        bestApi,
      };
    },
    {
      name: "select_api",
      description,
      schema,
    }
  );
}

/**
 * Instantiate createSelectAPITool with actual parameters.
 * Replace `existingApis` and `initialQuery` with your actual data.
 */
const existingApis: DatasetSchema[] = [
  // Populate with your DatasetSchema objects
  // Example:
  // {
  //   id: "1",
  //   category_name: "Music",
  //   tool_name: "PlaylistTool",
  //   api_name: "PlaylistAPI",
  //   api_description: "Fetches playlist data.",
  //   required_parameters: [...],
  //   optional_parameters: [...],
  //   method: "GET",
  //   api_url: "https://api.audius.co/playlists",
  // },
];

const initialQuery: string = "Find popular playlists for jazz music.";

// Instantiate the SelectAPITool
const selectAPIToolInstance = createSelectAPITool(existingApis, initialQuery);

/**
 * @param {GraphState} state
 */
export async function createFetchRequest(
  state: GraphState
): Promise<Partial<GraphState>> {
  const { params, bestApi } = state;
  if (!bestApi) {
    throw new Error("No best API found");
  }

  let response: any = null;
  try {
    if (!params) {
      const fetchRes = await fetch(bestApi.api_url, {
        method: bestApi.method,
      });
      response = fetchRes.ok ? await fetchRes.json() : await fetchRes.text();
    } else {
      let fetchOptions: Record<string, any> = {
        method: bestApi.method,
      };
      let parsedUrl = bestApi.api_url;

      const paramKeys = Object.entries(params);
      paramKeys.forEach(([key, value]) => {
        if (parsedUrl.includes(`{${key}}`)) {
          parsedUrl = parsedUrl.replace(`{${key}}`, value);
          delete params[key];
        }
      });

      const url = new URL(parsedUrl);

      if (["GET", "HEAD"].includes(bestApi.method)) {
        Object.entries(params).forEach(([key, value]) =>
          url.searchParams.append(key, value)
        );
      } else {
        fetchOptions = {
          ...fetchOptions,
          body: JSON.stringify(params),
        };
      }

      const fetchRes = await fetch(url, fetchOptions);
      response = fetchRes.ok ? await fetchRes.json() : await fetchRes.text();
    }

    if (response) {
      return {
        response,
      };
    }
  } catch (e) {
    console.error("Error fetching API");
    console.error(e);
  }

  return {
    response: null,
  };
}


/**
 * List of all tools used in the ecosystem.
 */
export const ALL_TOOLS_LIST: { [key: string]: StructuredToolInterface | RunnableToolLike | Promise<Partial<GraphState>> | ((state: GraphState) => Promise<Partial<GraphState>>) } = {
  extractCategory: ExtractCategoryTool,
  extractParameters: extractParameters,
  readUserInputTool,
  ExtractHighLevelCategoriesTool,
  createFetchRequest,
  selectApi: selectAPIToolInstance, // Use the instantiated tool
  // Add other tools here as needed
};














