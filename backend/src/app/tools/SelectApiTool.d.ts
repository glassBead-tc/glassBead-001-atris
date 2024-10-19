import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { GraphState } from "../index.js";
import { DatasetSchema } from "../types.js";
/**
 * Given a users query, choose the API which best
 * matches the query.
 */
export declare class SelectAPITool extends StructuredTool {
    schema: z.ZodObject<{
        api: z.ZodEnum<[string, ...string[]]>;
    }, "strip", z.ZodTypeAny, {
        api: string;
    }, {
        api: string;
    }>;
    name: string;
    description: string;
    apis: DatasetSchema[];
    constructor(apis: DatasetSchema[], query: string);
    static createDescription(apis: DatasetSchema[], query: string): string;
    _call(input: z.infer<typeof this.schema>): Promise<string>;
}
/**
 * @param {GraphState} state
 */
export declare function selectApi(state: GraphState): Promise<Partial<GraphState>>;
