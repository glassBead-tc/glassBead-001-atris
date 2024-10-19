import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { GraphState } from "../types.js";
export declare class ProcessApiResponseTool extends StructuredTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        state: z.ZodObject<{
            fetchResponse: z.ZodAny;
            bestApi: z.ZodOptional<z.ZodNullable<z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            bestApi?: any;
            fetchResponse?: any;
        }, {
            bestApi?: any;
            fetchResponse?: any;
        }>;
    }, "strip", z.ZodTypeAny, {
        state: {
            bestApi?: any;
            fetchResponse?: any;
        };
    }, {
        state: {
            bestApi?: any;
            fetchResponse?: any;
        };
    }>;
    _call({ state }: z.infer<typeof this.schema>): Promise<Partial<GraphState>>;
    private processTrackResponse;
    private processUserResponse;
}
export declare function processApiResponse(state: GraphState): Promise<Partial<GraphState>>;
