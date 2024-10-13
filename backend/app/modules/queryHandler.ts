import { ChatOpenAI } from "@langchain/openai";
import { CompiledStateGraph } from "@langchain/langgraph";
import { GraphState, QueryType } from "../types.js";
import { logger } from '../logger.js';
import { classifyQuery } from './queryClassifier.js';

interface QueryResult {
  response: string;
  error?: string;
}

export async function handleQuery(
  graph: CompiledStateGraph<GraphState, Partial<GraphState>, string>,
  llm: ChatOpenAI,
  query: string
): Promise<QueryResult> {
  logger.info(`Handling query: ${query}`);

  const classification = await classifyQuery(query);
  logger.info(`Query classification: ${JSON.stringify(classification)}`);

  logger.info(`Query type: ${classification.type}, Is entity query: ${classification.isEntityQuery}, Entity type: ${classification.entityType}, Entity: ${classification.entity}`);

  try {
    logger.info(`Invoking graph for query (${classification.type})`);
    const result = await graph.invoke({
      llm,
      query,
      queryType: classification.type,
      isEntityQuery: classification.isEntityQuery,
      entityType: classification.entityType,
      entity: classification.entity
    });
    logger.info("Graph invocation completed");

    if (result.formattedResponse) {
      logger.info(`Formatted response received: ${result.formattedResponse}`);
      return { response: result.formattedResponse };
    } else if (result.error) {
      logger.warn(`Error in graph invocation: ${result.error}`);
      return { 
        response: "I'm sorry, but I encountered an error while processing your query. Could you please try again?",
        error: result.error
      };
    } else {
      logger.warn(`No formatted response or error for query: ${query}`);
      return { 
        response: "I'm sorry, but I couldn't find a clear answer to your question. Could you please rephrase it?",
        error: "No formatted response"
      };
    }
  } catch (error) {
    logger.error(`Unexpected error processing query "${query}":`, error);
    return { 
      response: "I encountered an unexpected error while processing your query. Please try again later or contact support if the issue persists.",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function getTestQueries(): string[] {
  return [
    "What are the top 5 trending tracks on Audius right now?"
    // "Who are the most followed artists on Audius?",
    // "What genres are trending on Audius this week?",
    // "How many plays does the track 'Crypto Boy' by Yung Beef have?",
    // "What are the most popular playlists on Audius?",
    // "Who created the playlist 'Chill Vibes'?",
    // "What's the latest release from RAC?",
    // "How many followers does the artist Deadmau5 have on Audius?",
    // "What are the top 3 Electronic tracks trending now?",
    // "Can you find any Lo-Fi playlists with more than 1000 favorites?",
    // "What's the average duration of the top 10 trending tracks?",
    // "Who are the top 5 most followed Hip-Hop artists on Audius?",
    // "What's the most favorited track in the past month?",
    // "Can you list the tracks in the playlist 'Summer Hits 2023'?",
    // "What's the total play count of all tracks by The Chainsmokers on Audius?",
    // "How many followers does TRICK CHENEY. have on Audius?",
    // "Who is the most followed artist on Audius?",
    // "How many users is RAC following on Audius?",
    // "Tell me about the user RAC on Audius",
    // "How many tracks has Deadmau5 uploaded to Audius?",
    // "What's the profile information for TRICK CHENEY. on Audius?",
    // "Who has more followers on Audius, RAC or Deadmau5?",
    // "How many followers and following does the user 'bitbird' have on Audius?"
  ];
}
