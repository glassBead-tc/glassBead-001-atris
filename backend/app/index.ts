import { ChatOpenAI } from "@langchain/openai";
import { createAtris } from "./graph/createAtris.js";
import { globalAudiusApi } from "./services/audiusApi.js";
import { logger } from "./logger.js";
import { handleQuery } from "./modules/queryHandler.js";
import { checkRequiredEnvVars, getOpenAiApiKey } from "./config.js";
import { classifyQuery } from "./modules/queryClassifier.js";

logger.level = "debug";

// Define getTestQueries function
function getTestQueries(): string[] {
  return [
    "How many plays does the track Lost My Mind (instrumental) have?",
    "What is the most popular song on Audius right now?",
    "Find me some electronic music playlists with over 10000 plays.",
    // "What's the most played track by Skrillex?",
    // "Show me the latest uploads in the hip-hop genre"
  ];
}

function logToUser(message: string): void {
  console.log(message);
}

async function main() {
  logger.info("Starting main execution");
  try {
    checkRequiredEnvVars();
  } catch (envError) {
    logger.error(`Environment configuration error: ${envError instanceof Error ? envError.message : String(envError)}`);
    logToUser(`Environment configuration error: ${envError instanceof Error ? envError.message : String(envError)}`);
    process.exit(1);
  }

  const llm = new ChatOpenAI({
    openAIApiKey: getOpenAiApiKey(),
    modelName: "gpt-3.5-turbo",
    temperature: 0,
  });

  logger.info("Creating Atris agent...");
  const atris = createAtris();
  logger.info("Atris agent created successfully");

  const queries = getTestQueries();
  logger.info(`Loaded ${queries.length} test queries`);

  try {
    logger.info("Testing API connection...");
    const isConnected = await globalAudiusApi.testConnection();
    logger.info(`API connection test result: ${isConnected}`);

    if (isConnected) {
      logger.info("API connection successful.");
      let successfulQueries = 0;
      let failedQueries = 0;

      for (const query of queries) {
        logToUser(`\nQuery: ${query}`);

        try {
          logger.debug(`Processing query: ${query}`);
          const result = await atris.invoke({ query });
          logger.debug("Query processed, result:", result);
          logToUser(`Response: ${result.response}`);

          if (result.error) {
            failedQueries++;
            logger.error(`Query failed: ${query}`);
            logger.error(`Error: ${result.error}`);
          } else {
            successfulQueries++;
          }
        } catch (queryError: any) {
          failedQueries++;
          logger.error(`Error in query processing:`, queryError);
          logToUser(`Error processing query: ${queryError instanceof Error ? queryError.message : String(queryError)}`);
        }

        logToUser("--------------------");
      }

      logger.info(`Test summary: ${successfulQueries} successful queries, ${failedQueries} failed queries`);
      logToUser(`Test summary: ${successfulQueries} successful queries, ${failedQueries} failed queries`);
    } else {
      logger.error("API connection test failed.");
      logToUser("API connection test failed. Please check your internet connection and try again later.");
    }
  } catch (error: any) {
    logger.error(`Unexpected error in main execution:`, error);
    logToUser(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
  }

  logger.info("Main execution completed");
}

main().catch(error => {
  logger.error(`Unhandled error in main:`, error);
  logToUser(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
});