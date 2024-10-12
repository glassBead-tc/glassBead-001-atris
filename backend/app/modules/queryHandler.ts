import { ChatOpenAI } from "@langchain/openai";
import { CompiledStateGraph } from "@langchain/langgraph";
import { GraphState } from "../types.js";
import { logger } from '../logger.js';

interface QueryResult {
  response: string;
  error?: string;
}

export async function handleQuery(
  app: CompiledStateGraph<GraphState, Partial<GraphState>, string>,
  llm: ChatOpenAI, 
  query: string
): Promise<QueryResult> {
  console.log(`Handling query: ${query}`);
  try {
    console.log("About to invoke app");
    const result = await app.invoke({
      llm,
      query,
    });
    console.log("App invocation completed");

    if (result.formattedResponse) {
      return { response: result.formattedResponse };
    } else {
      console.warn(`No formatted response for query: ${query}`);
      return { 
        response: "I'm sorry, but I couldn't find a clear answer to your question. Could you please rephrase it?",
        error: "No formatted response"
      };
    }
  } catch (error) {
    console.error(`Error processing query "${query}":`, error);
    return { 
      response: "I encountered an error while processing your query. Could you please try rephrasing it?",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function getTestQueries(): string[] {
  return [
    "What genres are trending on Audius this week?"
  ];
}
