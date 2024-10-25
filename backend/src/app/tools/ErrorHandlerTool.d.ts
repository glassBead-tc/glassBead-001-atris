import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { GraphState } from "../types.js";
export declare class ErrorHandlerTool extends StructuredTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        state: z.ZodObject<{
            error: z.ZodBoolean;
            message: z.ZodOptional<z.ZodString>;
            formattedResponse: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            error: boolean;
            message?: string | undefined;
            formattedResponse?: string | undefined;
        }, {
            error: boolean;
            message?: string | undefined;
            formattedResponse?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        state: {
            error: boolean;
            message?: string | undefined;
            formattedResponse?: string | undefined;
        };
    }, {
        state: {
            error: boolean;
            message?: string | undefined;
            formattedResponse?: string | undefined;
        };
    }>;
    _call({ state }: z.infer<typeof this.schema>): Promise<Partial<GraphState>>;
}
