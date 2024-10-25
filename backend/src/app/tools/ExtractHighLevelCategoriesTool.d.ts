import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { GraphState } from '../types.js';
export declare class ExtractHighLevelCategoriesTool extends StructuredTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        state: z.ZodObject<{
            query: z.ZodString;
            categories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            query: string;
            categories?: string[] | undefined;
        }, {
            query: string;
            categories?: string[] | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        state: {
            query: string;
            categories?: string[] | undefined;
        };
    }, {
        state: {
            query: string;
            categories?: string[] | undefined;
        };
    }>;
    _call({ state }: z.infer<typeof this.schema>): Promise<Partial<GraphState>>;
}
