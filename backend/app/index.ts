import { ChatOpenAI } from "@langchain/openai";
import { createAtris } from "./graph/createAtris.js";
import { globalAudiusApi } from "./services/audiusApi.js";
import { logger, logToUser } from "./logger.js";
import { handleQuery } from "./modules/queryHandler.js";
import { checkRequiredEnvVars, getOpenAiApiKey } from "./config.js";
import { classifyQuery } from "./modules/queryClassifier.js";

logger.level = "debug";

// Define getTestQueries function
function getTestQueries(): string[] {
  return [
    "What are the top trending tracks?",
    "Who are the most followed artists?",
    "Find me some electronic music playlists",
    "What's the most played track by Skrillex?",
    "Show me the latest uploads in the hip-hop genre"
  ];
}

async function main() {
  logger.info("Starting main execution");
  checkRequiredEnvVars();

  const llm = new ChatOpenAI({
    openAIApiKey: getOpenAiApiKey(),
    modelName: "gpt-3.5-turbo",
    temperature: 0,
  });

  logger.info("About to create Atris");
  const atris = createAtris();
  logger.info("Atris created successfully");

  const queries = getTestQueries();
  logger.info(`Loaded ${queries.length} test queries`);

  try {
    const isConnected = await globalAudiusApi.testConnection();
    if (isConnected) {
      logger.info("API connection successful.");
      let successfulQueries = 0;
      let failedQueries = 0;

      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        logToUser(`Query ${i + 1}/${queries.length}: ${query}`);

        try {
          logger.debug(`Processing query: ${query}`);
          const classification = await classifyQuery(query);
          logger.debug(`Query classified as: ${classification.type}, isEntityQuery: ${classification.isEntityQuery}`);

          const result = await handleQuery(atris, llm, query);
          logger.debug(`Query processed, result:`, result);
          logToUser(`Response: ${result.response}`);

          if (result.error) {
            logToUser(`Error: ${result.error}`);
            failedQueries++;
          } else {
            successfulQueries++;
          }
        } catch (queryError) {
          logger.error(`Error in query processing:`, queryError);
          logToUser(`Error processing query: ${queryError instanceof Error ? queryError.message : String(queryError)}`);
          failedQueries++;
        }

        logToUser("--------------------");
        if (i < queries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.info(`Test summary: ${successfulQueries} successful queries, ${failedQueries} failed queries`);
      logToUser(`Test summary: ${successfulQueries} successful queries, ${failedQueries} failed queries`);
    } else {
      logger.error("API connection test failed");
      logToUser("API connection test failed. Please check your internet connection and try again later.");
    }
  } catch (error) {
    logger.error(`Unexpected error in main:`, error);
    logToUser(`An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`);
  }

  logger.info("Main execution completed");
}

main().catch(error => {
  logger.error(`Unhandled error in main:`, error);
  logToUser(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
});
