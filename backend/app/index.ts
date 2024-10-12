import { ChatOpenAI } from "@langchain/openai";
import { createGraph } from "./graph/createGraph.js";
import { globalAudiusApi } from "./tools/create_fetch_request.js";
import { logger, logToUser } from './logger.js';
import { handleQuery, getTestQueries } from './modules/queryHandler.js';

// Set this before any other code that uses the logger
logger.level = 'debug';

async function main() {
  const llm = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    temperature: 0,
  });

  console.log("About to create graph");
  const graph = createGraph(llm);
  console.log("Graph created");

  const queries = getTestQueries();

  try {
    const isConnected = await globalAudiusApi.testConnection();
    if (isConnected) {
      logger.info("API connection successful.");
      for (const query of queries) {
        logToUser(`Query: ${query}`);
        try {
          console.log(`Processing query: ${query}`);
          const result = await handleQuery(graph, llm, query);
          console.log(`Query processed, result:`, result);
          logToUser(`Response: ${result.response}`);
          if (result.error) {
            logToUser(`Error: ${result.error}`);
          }
        } catch (queryError) {
          console.error(`Error in query processing:`, queryError);
          logToUser(`Error processing query: ${queryError instanceof Error ? queryError.message : String(queryError)}`);
        }
        logToUser("--------------------");
      }
    } else {
      logToUser('API connection test failed. Please check your internet connection and try again later.');
    }
  } catch (error) {
    console.error(`Unexpected error in main:`, error);
    logToUser(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
  }
}

main().catch((error) => {
  console.error(`Unhandled error in main:`, error);
  logToUser(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
});
