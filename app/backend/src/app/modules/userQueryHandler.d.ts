import { CompiledStateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { GraphState } from "../types.js";
export interface QueryResult {
    response: string;
    error?: string;
}
export declare function handleUserQuery(app: CompiledStateGraph<GraphState, Partial<GraphState>, string>, llm: ChatOpenAI, query: string): Promise<QueryResult>;
