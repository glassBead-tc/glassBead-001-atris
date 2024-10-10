import { ChatOpenAI } from "@langchain/openai";
import { createGraph } from "./graph/createGraph.js";
import { GraphState } from "./types.js";
import { globalAudiusApi } from "./tools/create_fetch_request.js";

async function main() {
  const llm = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    temperature: 0,
  });

  const app = createGraph(llm);

  try {
    const isConnected = await globalAudiusApi.testConnection();
    if (isConnected) {
      console.log('API connection successful. Proceeding with the application.');
      
      const query = "What are the top 3 trending tracks on Audius right now?";
      const stream = await app.stream({
        llm,
        query,
      });

      for await (const event of stream) {
        console.log("\n------\n");
        if (Object.keys(event)[0] === "execute_request_node") {
          console.log("---FINISHED---");
          console.log(event.execute_request_node);
        } else {
          console.log("Stream event: ", Object.keys(event)[0]);
        }
      }
    }
  } catch (error) {
    console.error("Error in main:", error);
  }
}

main().catch(console.error);