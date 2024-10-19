import { ChatOpenAI } from "@langchain/openai";
import { DatasetSchema } from "./types.js";
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
};
