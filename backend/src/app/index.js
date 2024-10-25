import { logger } from "./logger.js";
import { ChatOpenAI } from "@langchain/openai";
import * as dotenv from 'dotenv';
import fs from "fs";
import { findMissingParams } from "./utils.js";
import { TRIMMED_CORPUS_PATH } from "./constants.js";
import { END, StateGraph } from "@langchain/langgraph";
import { START } from "@langchain/langgraph";
import { extractParameters } from "./tools/ExtractParametersTool.js";
import { extractCategory } from "./tools/ExtractCategoryTool.js";
import { requestParameters } from "./tools/RequestParametersTool.js";
import { selectApi } from "./tools/SelectApiTool.js";
import { createFetchRequest } from "./tools/CreateFetchRequestTool.js";
dotenv.config();
const graphChannels = {
    llm: null,
    query: null,
    categories: null,
    apis: null,
    bestApi: null,
    parameters: null,
    response: null,
};
/**
* @param {GraphState} state
*/
const verifyParams = (state) => {
    const { bestApi, parameters } = state;
    if (!bestApi) {
        throw new Error("No best API found");
    }
    if (!parameters) {
        return "human_loop_node";
    }
    const requiredParamsKeys = bestApi.required_parameters.map(({ name }) => name);
    const extractedParamsKeys = Object.keys(parameters);
    const missingKeys = findMissingParams(requiredParamsKeys, extractedParamsKeys);
    if (missingKeys.length > 0) {
        return "human_loop_node";
    }
    return "execute_request_node";
};
function getApis(state) {
    const { categories } = state;
    if (!categories || categories.length === 0) {
        throw new Error("No categories passed to get_apis_node");
    }
    const allData = JSON.parse(fs.readFileSync(TRIMMED_CORPUS_PATH, "utf8"));
    const apis = categories
        .map((c) => allData.filter((d) => d.category_name === c))
        .flat();
    return {
        apis,
    };
}
async function main() {
    logger.info("Starting main execution");
    const atris = createGraph();
    // Initialize the LLM (ChatOpenAI)
    const llm = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: "gpt-4o-mini", // Or another model as appropriate
        temperature: 0,
    });
    /**
   * TODO: implement
   */
    function createGraph() {
        const graph = new StateGraph({
            channels: graphChannels,
        })
            .addNode("extract_category_node", extractCategory)
            .addNode("get_apis_node", getApis)
            .addNode("select_api_node", selectApi)
            .addNode("extract_params_node", extractParameters)
            .addNode("human_loop_node", requestParameters)
            .addNode("execute_request_node", createFetchRequest)
            .addEdge("extract_category_node", "get_apis_node")
            .addEdge("get_apis_node", "select_api_node")
            .addEdge("select_api_node", "extract_params_node")
            .addConditionalEdges("extract_params_node", verifyParams)
            .addConditionalEdges("human_loop_node", verifyParams)
            .addEdge(START, "extract_category_node")
            .addEdge("execute_request_node", END);
        const app = graph.compile();
        return app;
    }
    const queries = [
        "What are the trending tracks on Audius?",
        "Find me playlists with over 10,000 plays.",
        "What are the most popular genres on Audius?",
        // Add other test queries as needed
    ];
    for (const query of queries) {
        logger.info(`Processing query: ${query}`);
        const initialState = {
            llm,
            query,
            categories: [],
            apis: [],
            bestApi: null,
            parameters: null,
            response: null,
        };
        try {
            const result = await atris.invoke(initialState);
            console.log(`Response:\n${result.formattedResponse}`);
        }
        catch (error) {
            logger.error("Error during graph execution:", error);
        }
        console.log("--------------------");
    }
    logger.info("Main execution completed");
}
main().catch(error => {
    logger.error("Unhandled error in main:", error);
});
