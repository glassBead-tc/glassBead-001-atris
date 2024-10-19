import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { GraphState } from "../types.js";
export declare class VerifyParamsTool extends StructuredTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        state: z.ZodObject<{
            params: z.ZodRecord<z.ZodString, z.ZodAny>;
            bestApi: z.ZodAny;
        }, "strip", z.ZodTypeAny, {
            params: Record<string, any>;
            bestApi?: any;
        }, {
            params: Record<string, any>;
            bestApi?: any;
        }>;
    }, "strip", z.ZodTypeAny, {
        state: {
            params: Record<string, any>;
            bestApi?: any;
        };
    }, {
        state: {
            params: Record<string, any>;
            bestApi?: any;
        };
    }>;
    _call({ state }: z.infer<typeof this.schema>): Promise<Partial<GraphState>>;
}
export declare function verifyParams(state: GraphState): Promise<Partial<GraphState>>;
