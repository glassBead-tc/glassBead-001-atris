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
  error?: string;
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
  "Get Track": {
    validate: (response) => response && response.data && response.data.id,
    successMessage: (response) => `Retrieved track with ID: ${response.data.id}`,
    failureMessage: "Failed to retrieve track information",
  },
  "Search Tracks": {
    validate: (response) => response && Array.isArray(response.data) && response.data.length > 0,
    successMessage: (response) => `Found ${response.data.length} tracks matching the search criteria`,
    failureMessage: "Failed to search for tracks or no results found",
  },
  "Get User": {
    validate: (response) => response && response.data && response.data.id,
    successMessage: (response) => `Retrieved user information for user ID: ${response.data.id}`,
    failureMessage: "Failed to retrieve user information",
  },
  "Search Users": {
    validate: (response) => response && Array.isArray(response.data) && response.data.length > 0,
    successMessage: (response) => `Found ${response.data.length} users matching the search criteria`,
    failureMessage: "Failed to search for users or no results found",
  },
  "Get Playlist": {
    validate: (response) => response && response.data && response.data.id,
    successMessage: (response) => `Retrieved playlist with ID: ${response.data.id}`,
    failureMessage: "Failed to retrieve playlist information",
  },
  "Search Playlists": {
    validate: (response) => response && Array.isArray(response.data) && response.data.length > 0,
    successMessage: (response) => `Found ${response.data.length} playlists matching the search criteria`,
    failureMessage: "Failed to search for playlists or no results found",
  },
  "Get Track Listen History": {
    validate: (response) => response && Array.isArray(response.data) && response.data.length > 0,
    successMessage: (response) => `Retrieved listen history with ${response.data.length} entries`,
    failureMessage: "Failed to retrieve track listen history or no data available",
  },
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

// Add this new function to format the trending tracks
function formatTrendingTracks(response: any): string {
  if (!response || !response.data || !Array.isArray(response.data)) {
    return "Unable to format trending tracks data.";
  }

  const tracks = response.data.slice(0, 10); // Get top 10 tracks
  let formattedOutput = "Top Trending Tracks on Audius:\n";

  tracks.forEach((track: any, index: number) => {
    const title = track.title || "Unknown Title";
    const artist = track.user?.name || track.user?.handle || "Unknown Artist";
    const plays = track.play_count !== undefined ? `${track.play_count} plays` : "play count not available";

    formattedOutput += `${index + 1}. "${title}" by ${artist} - ${plays}\n`;
  });

  return formattedOutput;
}

// Modify the main function
async function main() {
  const app = createGraph();

  const llm = new ChatOpenAI({
    modelName: "gpt-4-turbo-preview",
    temperature: 0,
  });

  const testCase = {
    query: "I'm looking into what music is popular on Audius right now. Can you find the top trending tracks?",
    expectedEndpoint: "/v1/tracks/trending"
  };

  console.log(`\n\nProcessing query: "${testCase.query}"\n`);

  const stream = await app.stream({
    llm,
    query: testCase.query,
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
    return;
  }
  if (!finalResult.bestApi) {
    console.log("❌❌❌ No best API found ❌❌❌");
    return;
  }

  // Validate the selected endpoint
  if (finalResult.bestApi.api_url === testCase.expectedEndpoint) {
    console.log("✅✅✅ Selected API endpoint is valid ✅✅✅");
  } else {
    console.log("❌❌❌ Selected API endpoint is not valid ❌❌❌");
    console.log(`Expected: ${testCase.expectedEndpoint}, Got: ${finalResult.bestApi.api_url}`);
  }

  // Log the selected API
  console.log("Selected API:", finalResult.bestApi);

  if (finalResult.response) {
    console.log("---FETCH RESULT---");
    
    // Format and display the trending tracks
    if (finalResult.bestApi.api_name === "Get Trending Tracks") {
      const formattedTracks = formatTrendingTracks(finalResult.response);
      console.log(formattedTracks);
    } else {
      // For other API responses, just log the raw JSON
      console.log(JSON.stringify(finalResult.response, null, 2));
    }

    // Validate the response using the appropriate validator
    const validator = apiValidators[finalResult.bestApi.api_name];
    if (validator) {
      if (validator.validate(finalResult.response)) {
        console.log("✅✅✅ " + validator.successMessage(finalResult.response));
      } else {
        console.log("❌❌❌ " + validator.failureMessage);
      }
    }
  } else {
    console.log("❌❌❌ API call failed ❌❌❌");
  }
}

// Call the main function
main();