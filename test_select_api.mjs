// test_select_api.ts
import { selectApi } from './backend/src/tools/select_api.js'; // Added .js extension
import { ChatOpenAI } from '@langchain/openai';
// Mocking the LLM
const llm = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    temperature: 0,
    streaming: true, // This is valid
    // Remove the following lines as they are not valid properties
    // createResponseFormat: 'json',
    // betaParsedCompletionWithRetry: false
});
// Create a mock GraphState with type assertion
const mockState = {
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
    llm: new ChatOpenAI({
        modelName: "gpt-3.5-turbo",
        temperature: 0,
        streaming: true,
        streamUsage: true, // Assert type if needed
    }), // Use 'any' to bypass type safety
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
    }
    catch (error) {
        console.error("Error during selectApi test:", error);
    }
}
// Run the test
testSelectApi();
//# sourceMappingURL=test_select_api.mjs.map