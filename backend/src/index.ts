import fs from "fs";
import { END, START, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { DatasetSchema } from "./types.js";
import { extractCategory } from "./tools/extract_category.js";
import { TRIMMED_CORPUS_PATH } from "./constants.js";
import { selectApi } from "./tools/select_api.js";
import { extractParameters } from "./tools/extract_parameters.js";
import { findMissingParams } from "./utils.js";
import { createFetchRequest } from "./tools/create_fetch_request.js";
import { HIGH_LEVEL_CATEGORY_MAPPING } from "./constants.js";

export type GraphState = {
  /**
   * The LLM to use for the graph
   */
  llm: ChatOpenAI;
  /**
   * The query to extract an API for
   */
  query: string;
  /**
   * The relevant API categories for the query
   */
  categories: string[] | null;
  /**
   * The relevant APIs from the categories
   */
  apis: DatasetSchema[] | null;
  /**
   * The most relevant API for the query
   */
  bestApi: DatasetSchema | null;
  /**
   * The params for the API call
   */
  params: Record<string, string> | null;
  /**
   * The API response
   */
  response: Record<string, any> | null;
};

const graphChannels = {
  llm: null,
  query: null,
  categories: null,
  apis: null,
  bestApi: null,
  params: null,
  response: null,
};

type ApiValidator = {
  validate: (response: any) => boolean;
  successMessage: (response: any) => string;
  failureMessage: string;
};

const apiValidators: Record<string, ApiValidator> = {
  "Get Trending Tracks": {
    validate: (response) => response && Array.isArray(response.data) && response.data.length > 0,
    successMessage: (response) => `Retrieved ${response.data.length} trending tracks`,
    failureMessage: "Failed to retrieve trending tracks or the response was empty",
  },
  // Add more validators for other API endpoints here
};

const verifyParams = (state: GraphState): "execute_request_node" => {
  const { bestApi, params } = state;
  if (!bestApi) {
    throw new Error("No best API found");
  }
  return "execute_request_node";
};

const getApis = async (state: GraphState): Promise<Partial<GraphState>> => {
  const { categories } = state;
  const allData: { endpoints: DatasetSchema[] } = JSON.parse(fs.readFileSync(TRIMMED_CORPUS_PATH, "utf-8"));
  
  const apis = allData.endpoints.filter((api) => 
    categories!.some((category) => 
      Object.entries(HIGH_LEVEL_CATEGORY_MAPPING).some(([high, low]) => 
        low.includes(category) && api.category_name.toLowerCase() === high.toLowerCase()
      )
    )
  );

  console.log(`Found ${apis.length} APIs for categories: ${categories!.join(', ')}`);
  return { apis };
};

function createGraph() {
  const graph = new StateGraph<GraphState>({
    channels: graphChannels,
  })
    .addNode("extract_category_node", extractCategory)
    .addNode("get_apis_node", getApis)
    .addNode("select_api_node", selectApi)
    .addNode("extract_params_node", extractParameters)
    .addNode("execute_request_node", createFetchRequest)
    .addEdge("extract_category_node", "get_apis_node")
    .addEdge("get_apis_node", "select_api_node")
    .addEdge("select_api_node", "extract_params_node")
    .addEdge("extract_params_node", "execute_request_node")
    .addEdge(START, "extract_category_node")
    .addEdge("execute_request_node", END);

  return graph.compile();
}

const audiusTestQuery = "I'm looking into what music is popular on Audius right now. Can you find the top trending tracks?";

const expectedAudiusEndpoints = [
  "/v1/tracks/trending"
]; 

function validateSelectedEndpoint(selectedEndpoint: string): boolean {
  return expectedAudiusEndpoints.includes(selectedEndpoint);
}

async function main(queries: string[]) {
  const app = createGraph();

  const llm = new ChatOpenAI({
    modelName: "gpt-4-turbo-preview",
    temperature: 0,
  });

  for (const query of queries) {
    console.log(`\n\nProcessing query: "${query}"\n`);

    const stream = await app.stream({
      llm,
      query,
    });

    let finalResult: GraphState | null = null;
    for await (const event of stream) {
      console.log("\n------\n");
      if (Object.keys(event)[0] === "execute_request_node") {
        console.log("---FINISHED---");
        finalResult = event.execute_request_node;
      } else {
        console.log("Stream event: ", Object.keys(event)[0]);
        console.log("Value(s): ", Object.values(event)[0]);
      }
    }

    if (!finalResult) {
      console.log("❌❌❌ No final result obtained ❌❌❌");
      continue;
    }
    if (!finalResult.bestApi) {
      console.log("❌❌❌ No best API found ❌❌❌");
      continue;
    }

    // Validate the selected endpoint
    if (validateSelectedEndpoint(finalResult.bestApi.api_url)) {
      console.log("✅✅✅ Selected API endpoint is valid ✅✅✅");
    } else {
      console.log("❌❌❌ Selected API endpoint is not valid ❌❌❌");
    }

    // Use the API validator
    const apiName = finalResult.bestApi.api_name;
    if (apiValidators[apiName]) {
      const validator = apiValidators[apiName];
      if (finalResult.response && validator.validate(finalResult.response)) {
        console.log("✅✅✅ API call successful ✅✅✅");
        console.log(validator.successMessage(finalResult.response));
      } else {
        console.log("❌❌❌ API call failed validation ❌❌❌");
        console.log(validator.failureMessage);
      }
    } else {
      console.log("⚠️⚠️⚠️ No validator found for this API endpoint ⚠️⚠️⚠️");
    }

    // Log the selected API and response for debugging
    console.log("Selected API:", finalResult.bestApi);
    if (finalResult.response) {
      console.log("---FETCH RESULT---");
      console.log(JSON.stringify(finalResult.response, null, 2));
    } else {
      console.log("❌❌❌ API call failed ❌❌❌");
    }
  }
}

const testQueries = [
  "Can you find information about the track with ID 'D7KyD'?",
  "Search for tracks with the keyword 'electronic'",
  "What are the current trending tracks on Audius?",
  "Can you get information about the user with ID 'eJ57D'?",
  "Find users with 'DJ' in their name",
  "Retrieve the playlist with ID 'MPk3P'",
  "Search for playlists containing 'workout' in the title",
  "What's the listen history for the track with ID 'D7KyD' over the last week?",
  "Find recent news articles about Audius blockchain integration"
];

main(testQueries);