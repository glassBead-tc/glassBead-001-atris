import { ToolNode } from "@langchain/langgraph/prebuilt";
import { logger } from "./logger.js";
import { ChatOpenAI } from "@langchain/openai";
import { DatasetSchema } from "./types.js";
import fs from "fs";
import { findMissingParams } from "./utils.js";
import { TRIMMED_CORPUS_PATH, HIGH_LEVEL_CATEGORY_MAPPING } from "./constants.js";
import { END, START, StateGraph, MessagesAnnotation, NodeInterrupt, Annotation, GraphAnnotation} from "@langchain/langgraph";
import { extractParameters } from "./tools/ExtractParametersTool.js";
import { extractCategory } from "./tools/ExtractCategoryTool.js";
import { requestParameters } from "./tools/RequestParametersTool.js";
import { selectApi } from "./tools/SelectApiTool.js";
import { createFetchRequest } from "./tools/CreateFetchRequestTool.js";
import { processApiResponse } from "./tools/ProcessApiResponseTool.js";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { StructuredToolInterface } from "@langchain/core/tools";
import { RunnableToolLike } from "@langchain/core/runnables";
import dotenv from 'dotenv';
import { ALL_TOOLS_LIST } from "./tools/tools.js";
import { BaseMessage, type AIMessage } from "@langchain/core/messages";


dotenv.config({ path: '../.env' });

const GraphAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  requestedStockPurchaseDetails: Annotation<Partial<GraphState>>
}); 

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0
});


// Convert ALL_TOOLS_LIST to an array using Object.values
const tools: (StructuredToolInterface | RunnableToolLike)[] = Object.values(ALL_TOOLS_LIST);
const toolNodeAtris = new ToolNode(tools);

const modelWithTools = llm.bindTools(tools);

const toolNode = new ToolNode(tools);


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
  parameters: Record<string, string> | null;
  /**
   * The API response
   */
  response: Record<string, any> | null;
  /**
   * The error message
   */
  error: boolean;
  /**
   * The state messages
   */
  messages: string[] | null;
};

const graphChannels = {
  llm: null,
  query: null,
  categories: null,
  apis: null,
  bestApi: null,
  parameters: null,
  response: null,
  error: null,
  stateMessages: null,
};

/**
* @param {GraphState} state
*/
const verifyParams = (
state: GraphState
): "human_loop_node" | "execute_request_node" => {
const { bestApi, parameters } = state;
if (!bestApi) {
  throw new Error("No best API found");
}
if (!parameters) {
  return "human_loop_node";
}
const requiredParamsKeys = bestApi.required_parameters.map(
  ({ name }) => name
);
const extractedParamsKeys = Object.keys(parameters);
const missingKeys = findMissingParams(
  requiredParamsKeys,
  extractedParamsKeys
);
if (missingKeys.length > 0) {
  return "human_loop_node";
}
return "execute_request_node";
};

function getApis(state: GraphState) {
const { categories } = state;
  if (!categories || categories.length === 0) {
    throw new Error("No categories passed to get_apis_node");
  }
  const allData: DatasetSchema[] = JSON.parse(
    fs.readFileSync(TRIMMED_CORPUS_PATH, "utf8")
  );

  const apis = categories
    .map((c) => allData.filter((d) => d.category_name === c))
    .flat();

  return {
    apis,
  };
}

const callModel = async (state: typeof GraphAnnotation.State) => {
  const { messages } = state;

  const systemMessage = {
    role: "system",
    content:
      "You're an expert financial analyst, tasked with answering the users questions " +
      "about a given company or companies. You do not have up to date information on " +
      "the companies, so you much call tools when answering users questions. " +
      "All financial data tools require a company ticker to be passed in as a parameter. If you " +
      "do not know the ticker, you should use the web search tool to find it.",
  };

  const llmWithTools = llm.bindTools(tools);
  const result = await llmWithTools.invoke([systemMessage, ...messages]);
  return { messages: result };
};

const shouldContinue = (state: typeof GraphAnnotation.State) => {
  const { messages, requestedStockPurchaseDetails } = state;

  const lastMessage = messages[messages.length - 1];

  // Cast here since `tool_calls` does not exist on `BaseMessage`
  const messageCastAI = lastMessage as AIMessage;
  if (messageCastAI._getType() !== "ai" || !messageCastAI.tool_calls?.length) {
    // LLM did not call any tools, or it's not an AI message, so we should end.
    return END;
  }

  // If `requestedStockPurchaseDetails` is present, we want to execute the purchase
  if (requestedStockPurchaseDetails) {
    return "execute_purchase";
  }

  const { tool_calls } = messageCastAI;
  if (!tool_calls?.length) {
    throw new Error(
      "Expected tool_calls to be an array with at least one element"
    );
  }

  return tool_calls.map((tc) => {
    if (tc.name === "purchase_stock") {
      // The user is trying to purchase a stock, route to the verify purchase node.
      return "prepare_purchase_details";
    } else {
      return "tools";
    }
  });
};

async function main() {
  logger.info("Starting main execution");

  const atris = createGraph();

  // Initialize the LLM (ChatOpenAI)
  const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o-mini", // Or another model as appropriate
    temperature: 0,
  });

  const shouldContinue = (state: typeof GraphAnnotation.State) => {
    const { messages, requestedStockPurchaseDetails } = state;
  
    const lastMessage = messages[messages.length - 1];
  
    // Cast here since `tool_calls` does not exist on `BaseMessage`
    const messageCastAI = lastMessage as AIMessage;
    if (messageCastAI._getType() !== "ai" || !messageCastAI.tool_calls?.length) {
      // LLM did not call any tools, or it's not an AI message, so we should end.
      return END;
    }
  
    // If `requestedStockPurchaseDetails` is present, we want to execute the purchase
    if (requestedStockPurchaseDetails) {
      return "execute_purchase";
    }
  
    const { tool_calls } = messageCastAI;
    if (!tool_calls?.length) {
      throw new Error(
        "Expected tool_calls to be an array with at least one element"
      );
    }
  
    return tool_calls.map((tc) => {
      if (tc.name === "purchase_stock") {
        // The user is trying to purchase a stock, route to the verify purchase node.
        return "prepare_purchase_details";
      } else {
        return "tools";
      }
    });
  };

  /**
 * TODO: implement
 */
function createGraph() {
  const graph = new StateGraph<GraphState>({
    channels: graphChannels,
  })
    .addNode("extract_category_node", extractCategory) // get categories from user query
    .addNode("get_apis_node", getApis) // get appropriate APIs for high-level categories
    .addNode("select_api_node", selectApi) // select most relevant API endpoint among category group for use
    .addNode("extract_params_node", extractParameters) // extract parameters for API call
    .addNode("human_loop_node", requestParameters) // request parameters from user if required param is missing
    .addNode("execute_request_node", createFetchRequest) // execute API call
    .addNode("process_api_response", processApiResponse) // process API response
    .addEdge("extract_category_node", "get_apis_node") // extract categories -> get APIs
    .addEdge("get_apis_node", "select_api_node") // get APIs -> select API
    .addEdge("select_api_node", "extract_params_node") // select API -> extract params
    .addConditionalEdges("extract_params_node", verifyParams) // extract params -> verify params if params are missing
    .addConditionalEdges("human_loop_node", verifyParams) // request params -> verify params with user to get missing params
    .addEdge(START, "extract_category_node") // start -> extract categories
    .addEdge("execute_request_node", "process_api_response") // execute API -> process response
    .addEdge("process_api_response", END); // process response -> end

  const app = graph.compile();
  return app;
}



  const queries = [
    "What are the top trending tracks on Audius?",
    "Find me playlists with over 10,000 plays.",
    "What are the most popular genres on Audius?",
    // Add other test queries as needed
  ];

  for (const query of queries) {
    logger.info(`Processing query: ${query}`);

    const initialState: GraphState = {
      llm,
      query,
      categories: [],
      apis: [],
      bestApi: null,
      parameters: null,
      response: null,
      error: false,
      stateMessages: [],
    };

    try {
      const result = await atris.invoke(initialState);
      console.log(`Response:\n${result.formattedResponse}`);
    } catch (error) {
      logger.error("Error during graph execution:", error);
    }

    console.log("--------------------");
  }

  logger.info("Main execution completed");
}

main().catch(error => {
  logger.error("Unhandled error in main:", error);
});
