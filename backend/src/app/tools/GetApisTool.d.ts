import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
export declare class GetApisTool extends StructuredTool {
    name: string;
    description: string;
    schema: z.ZodObject<{
        categories: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        categories: string[];
    }, {
        categories: string[];
    }>;
    _call({ categories }: z.infer<typeof this.schema>): Promise<string>;
}
