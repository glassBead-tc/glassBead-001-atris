import { ChatOpenAI } from "@langchain/openai";
import { executeTools } from "./executeTools.js";
import { initialGraphState } from "./types.js"; // Assuming initialGraphState is defined here
import { logger } from "./logger.js";
import { checkRequiredEnvVars, getOpenAiApiKey } from "./config.js";

logger.level = "debug";

function getTestQueries(): string[] {
  return [
    "How many plays does the track Lost My Mind (instrumental) have?",
    "What is the most popular song on Audius right now?",
    "Find me some electronic music playlists with over 10000 plays.",
    // Add other test queries as needed
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

  const queries = getTestQueries();
  logger.info(`Loaded ${queries.length} test queries`);

  for (const query of queries) {
    logToUser(`\nQuery: ${query}`);

    try {
      // Set up the initial GraphState
      const initialState = {
        ...initialGraphState,
        llm,
        query,
      };

      // Execute the tools
      const resultState = await executeTools(initialState);

      // Process the result
      if (resultState.error) {
        logToUser(`Error: ${resultState.message}`);
      } else if (resultState.formattedResponse) {
        logToUser(`Response: ${resultState.formattedResponse}`);
      } else {
        logToUser(`Response: ${resultState.response}`);
      }
    } catch (queryError: unknown) {
      logger.error(`Error in query processing:`, queryError);
      logToUser(`Error processing query: ${queryError instanceof Error ? queryError.message : String(queryError)}`);
    }

    logToUser("--------------------");
  }

  logger.info("Main execution completed");
}

main().catch(error => {
  logger.error(`Unhandled error in main:`, error);
  logToUser(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
});
