import { CompiledStateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { GraphState } from "../types.js";
import { logger } from '../logger.js';
import { extractUserName } from './nameExtractor.js';
import { formatUserResponse } from './responseFormatter.js';
import { instanceOfRequestManagerNotification } from "@audius/sdk/dist/sdk/api/generated/full/index.js";

export interface QueryResult {
  response: string;
  error?: string;
}

export async function handleUserQuery(
  app: CompiledStateGraph<GraphState, Partial<GraphState>, string>,
  llm: ChatOpenAI,
  query: string
): Promise<QueryResult> {
  logger.info(`Handling user query: ${query}`);

  const userName = extractUserName(query);
  logger.info(`Extracted user name: ${userName}`);

  // Step 1: Search for the user
  const searchResult = await app.invoke({
    llm,
    query: `Search for user ${userName}`,
    categories: ["Users"],
    apis: [],
    bestApi: null,
    params: { query: userName },
    response: null,
    formattedResponse: null,
    message: null,
    error: null
  });

  if (searchResult.error) {
    return { response: `I couldn't find the user "${userName}". ${searchResult.error}`, error: searchResult.error };
  }

  // Step 2: Get user details
  const userId = extractUserId(searchResult.response);
  if (!userId) {
    return { response: `I found information about "${userName}", but couldn't extract their ID. This is likely a bug.`, error: "User ID extraction failed" };
  }

  const userDetails = await app.invoke({
    llm,
    query: `Get details for user with ID ${userId}`,
    categories: ["Users"],
    apis: [],
    bestApi: null,
    params: { user_id: userId },
    response: null,
    formattedResponse: null,
    message: null,
    error: null
  });

  if (userDetails.error) {
    return { response: `I found "${userName}", but couldn't get their details. ${userDetails.error}`, error: userDetails.error };
  }

  // Process the user details and extract the relevant information
  return { response: formatUserResponse(userDetails.response, query) };
}

function extractUserId(searchResponse: any): string | null {
  if (searchResponse && searchResponse.data && searchResponse.data.length > 0) {
    return searchResponse.data[0].id;
  }
  return null;
}