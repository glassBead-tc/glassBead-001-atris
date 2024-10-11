import { ChatOpenAI } from "@langchain/openai";
import { createGraph } from "./graph/createGraph.js";
import { globalAudiusApi } from "./tools/create_fetch_request.js";
import { logger } from './logger.js';

async function main() {
  const llm = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    temperature: 0,
  });

  const app = createGraph(llm);

  const queries = [
    "What are the top 3 trending tracks on Audius right now?",
    "Who is the artist with the most followers on Audius?",
    "What genre is 'Crypto Boy' by Mack Keane?",
    // Add more queries here as needed
  ];

  try {
    const isConnected = await globalAudiusApi.testConnection();
    if (isConnected) {
      logger.info('API connection successful. Proceeding with the application.');
      
      for (const query of queries) {
        logger.info(`\n--- Processing Query: "${query}" ---`);

        const stream = await app.stream({
          llm,
          query,
        });

        let finalResponse = '';

        for await (const event of stream) {
          if (Object.keys(event)[0] === "execute_request_node") {
            finalResponse = event.execute_request_node;
            logger.info("Final Response:");
            logger.info(finalResponse);
          } else {
            logger.debug(`Stream event: ${Object.keys(event)[0]}`);
          }
        }

        logger.info("--- Query and Response Summary ---");
        logger.info(`Query: ${query}`);
        logger.info(`Response: ${finalResponse}`);
        logger.info("----------------------------------");
      }
    }
  } catch (error) {
    logger.error("Error in main:", error);
  }
}

main().catch((error) => logger.error("Unhandled error:", error));