import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  GraphState,
  DatasetSchema,
  DatasetParameters,
} from "../types.js";
import {
  HIGH_LEVEL_CATEGORY_MAPPING,
  TRIMMED_CORPUS_PATH,
} from "../constants.js";
import { findMissingParams } from "../utils.js";
import { ChatPromptTemplate } from "@langchain/core/prompts";

/**
 * Utility function to call the Audius API.
 */
export async function callAudiusAPI<
  Output extends Record<string, any> = Record<string, any>
>(fields: {
  endpoint: string;
  params: Record<string, string>;
}): Promise<Output> {
  if (!process.env.AUDIUS_API_KEY) {
    throw new Error("AUDIUS_API_KEY is not set");
  }

  const baseURL = "https://api.audius.co";
  const queryParams = new URLSearchParams(fields.params).toString();
  const url = `${baseURL}${fields.endpoint}?${queryParams}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-KEY": process.env.AUDIUS_API_KEY,
    },
  });

  if (!response.ok) {
    let res: string;
    try {
      res = JSON.stringify(await response.json(), null, 2);
    } catch (_) {
      try {
        res = await response.text();
      } catch (_) {
        res = response.statusText;
      }
    }
    throw new Error(
      `Failed to fetch data from ${fields.endpoint}.\nResponse: ${res}`
    );
  }
  const data = await response.json();
  return data;
}

/**
 * Selects the best API based on the user's query.
 */
export const selectApiTool = tool(
  async (input: { apis: DatasetSchema[]; query: string }) => {
    const { apis, query } = input;
    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are an expert software engineer, helping a junior engineer select the best API for their query.
Given their query, select the best API to serve the query.`,
      ],
      ["human", `Query: ${query}`],
    ]);

    // Logic to select the best API based on the query
    // This is a placeholder implementation
    if (apis.length === 0) {
      return `No APIs available to handle the query: "${query}"`;
    }

    const bestApi = apis[0]; // Simplified selection logic
    return JSON.stringify(bestApi);
  },
  {
    name: "select_api",
    description:
      "Selects the most appropriate Audius API based on the user's query. It analyzes the query and chooses the API that best fits the required functionality.",
    schema: z.object({
      apis: z.array(
        z.object({
          id: z.string(),
          category_name: z.string(),
          tool_name: z.string(),
          api_name: z.string(),
          api_description: z.string(),
          required_parameters: z.array(
            z.object({
              name: z.string(),
              type: z.string(),
              description: z.string(),
              default: z.string(),
            })
          ),
          optional_parameters: z.array(
            z.object({
              name: z.string(),
              type: z.string(),
              description: z.string(),
              default: z.string(),
            })
          ),
          method: z.string(),
          api_url: z.string(),
          template_response: z.record(z.any()).optional(),
          parameters: z.record(z.any()).optional(),
          default_parameters: z.record(z.any()).optional(),
        })
      ),
      query: z.string().describe("The user's query to determine the appropriate API."),
    }),
  }
);

/**
 * Example of another tool with correct schema alignment.
 */
export const fetchUserProfileTool = tool(
  async (input: { userId: string }) => {
    try {
      const data = await callAudiusAPI<{ profile: any }>({
        endpoint: `/users/${input.userId}/profile`,
        params: {},
      });
      return JSON.stringify(data.profile, null, 2);
    } catch (e: any) {
      console.warn("Error fetching user profile", e.message);
      return `An error occurred while fetching user profile: ${e.message}`;
    }
  },
  {
    name: "fetch_user_profile",
    description:
      "Fetches the profile information of a user from Audius based on the provided user ID.",
    schema: z.object({
      userId: z.string().describe("The unique identifier of the Audius user."),
    }),
  }
);

/**
 * Aggregates all tools into a single list for easy management.
 */
export const ALL_TOOLS_LIST = [
  selectApiTool,
  fetchUserProfileTool,
  // Add other tools here with correct schema alignment
];

/**
 * Aggregates a simplified list of tools, excluding purchase functionality.
 * Useful for scenarios where purchasing stocks is not required.
 */
export const SIMPLE_TOOLS_LIST = [
  fetchUserProfileTool,
  // Add other simplified tools here
];