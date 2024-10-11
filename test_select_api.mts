// test_select_api.ts
import { selectApi } from './backend/app/tools/select_api.js'; // Added .js extension
import { GraphState } from './backend/app/types.js'; // Added .js extension
import { ChatOpenAICallOptions } from '@langchain/openai'; // Import the necessary types

// Create a mock GraphState
const mockState: GraphState = {
  query: "What is the best API for trending tracks?",
  apis: [
    {
      id: "1",
      category_name: "Tracks",
      tool_name: "Get Trending Tracks",
      api_name: "Get Trending Tracks",
      api_description: "Fetches the top trending tracks.",
      required_parameters: [],
      optional_parameters: [],
      method: "GET",
      template_response: {},
      api_url: "/v1/tracks/trending",
    },
    {
      id: "2",
      category_name: "Tracks",
      tool_name: "Search Tracks",
      api_name: "Search Tracks",
      api_description: "Searches for tracks based on a query.",
      required_parameters: [],
      optional_parameters: [],
      method: "GET",
      template_response: {},
      api_url: "/v1/tracks",
    },
  ],
  llm: {
    modelName: "gpt-3.5-turbo",
    temperature: 0,
    streaming: true,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    n: 1,
    streamUsage: true,
    callKeys: () => [], // Mock implementation
    lc_serializable: true, // Mock implementation
    lc_secrets: () => ({}), // Mock implementation
    lc_aliases: () => ({}), // Mock implementation
    get model() {
      return this.modelName; // Mock implementation
    },
    getLsParams: () => ({}), // Mock implementation
    bindTools: () => {}, // Mock implementation
    createResponseFormat: () => {}, // Mock implementation
  } as any, // Use 'any' to bypass type safety temporarily
  categories: [],
  params: {},
  response: undefined,
  error: undefined,
};

// Test the selectApi function
async function testSelectApi() {
  try {
    const result = await selectApi(mockState);
    console.log("Select API Result:", result);
  } catch (error) {
    console.error("Error during selectApi test:", error);
  }
}

// Run the test
testSelectApi();