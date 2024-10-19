import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { GraphState } from "../index.js";
/**
 * Given a users query, extract the high level category which
 * best represents the query.
 *
 * TODO: add schema, name, description, and _call method
 */
export declare class ExtractHighLevelCategories extends StructuredTool {
    schema: z.ZodObject<{
        highLevelCategories: z.ZodArray<z.ZodEnum<[string, ...string[]]>, "many">;
    }, "strip", z.ZodTypeAny, {
        highLevelCategories: string[];
    }, {
        highLevelCategories: string[];
    }>;
    name: string;
    description: string;
    _call(input: z.infer<typeof this.schema>): Promise<string>;
}
/**
 * @param {GraphState} state
 */
export declare function extractCategory(state: GraphState): Promise<Partial<GraphState>>;
