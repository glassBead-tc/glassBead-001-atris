import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
export class GetApisTool extends StructuredTool {
    name = 'get_apis';
    description = 'Fetches APIs that match the given categories.';
    schema = z.object({
        categories: z.array(z.string()).describe("Categories extracted from the user's query"),
    });
    async _call({ categories }) {
        // Implement logic to get APIs based on categories
        // Return a string summary or relevant data
        return `Found APIs for categories: ${categories.join(", ")}`;
    }
}
