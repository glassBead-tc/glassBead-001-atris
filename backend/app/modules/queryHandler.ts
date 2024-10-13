import { ChatOpenAI } from "@langchain/openai";
import { CompiledStateGraph } from "@langchain/langgraph";
import { GraphState, QueryType, ComplexityLevel } from "../types.js";
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

  const classification = classifyQuery(query);
  logger.info(`Query classification: ${JSON.stringify(classification)}`);

  logger.info(`Query type: ${classification.type}, Is entity query: ${classification.isEntityQuery}, Entity type: ${classification.entityType}, Entity: ${classification.entity}, Complexity: ${classification.complexity}`);

  try {
    logger.info(`Invoking graph for query (${classification.type}, Complexity: ${classification.complexity})`);
    
    // Adjust graph invocation based on complexity
    let result;
    switch (classification.complexity) {
      case 'simple':
        result = await graph.invoke({
          llm,
          query,
          queryType: classification.type,
          isEntityQuery: classification.isEntityQuery,
          entityType: classification.entityType,
          entity: classification.entity
        });
        break;
      case 'moderate':
        result = await graph.invoke({
          llm,
          query,
          queryType: classification.type,
          isEntityQuery: classification.isEntityQuery,
          entityType: classification.entityType,
          entity: classification.entity
        });
        break;
      case 'complex':
        // Future implementation for complex queries
        logger.warn("Complex query handling not yet implemented.");
        return { 
          response: "This query is too complex to handle at the moment. Please try a different question.",
          error: "Complex query handling not implemented."
        };
      default:
        logger.warn("Unknown complexity level. Treating as simple query.");
        result = await graph.invoke({
          llm,
          query,
          queryType: classification.type,
          isEntityQuery: classification.isEntityQuery,
          entityType: classification.entityType,
          entity: classification.entity
        });
    }

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
    // "What are the top 5 trending tracks on Audius right now?",
    // "Who are the most followed artists on Audius?",
    "What genres are trending on Audius this week?"
    // "What are the most popular genres on Audius?"
    // Additional test queries...
  ];
}