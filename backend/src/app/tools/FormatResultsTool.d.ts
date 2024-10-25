import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { GraphState } from "../types.js";
export declare class FormatResultsTool extends StructuredTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        state: z.ZodObject<{
            response: z.ZodAny;
            formattedResponse: z.ZodOptional<z.ZodString>;
            queryType: z.ZodString;
            query: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            query: string;
            queryType: string;
            response?: any;
            formattedResponse?: string | undefined;
        }, {
            query: string;
            queryType: string;
            response?: any;
            formattedResponse?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        state: {
            query: string;
            queryType: string;
            response?: any;
            formattedResponse?: string | undefined;
        };
    }, {
        state: {
            query: string;
            queryType: string;
            response?: any;
            formattedResponse?: string | undefined;
        };
    }>;
    _call({ state }: z.infer<typeof this.schema>): Promise<Partial<GraphState>>;
    private formatApiResults;
    private formatTrendingTracks;
    private formatSearchTracks;
    private formatUserResults;
    private formatPlaylistResults;
    private formatGenrePopularity;
    private formatDuration;
    private capitalizeFirstLetter;
}
