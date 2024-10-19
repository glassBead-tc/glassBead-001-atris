import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { GraphState } from '../types.js';
import { logger } from '../logger.js';
import { HIGH_LEVEL_CATEGORY_MAPPING } from "../constants.js";

export class ExtractHighLevelCategoriesTool extends StructuredTool {
  name = "extract_high_level_categories";
  description = "Extracts high-level categories from the user's query.";

  schema = z.object({
    state: z.object({
      query: z.string().describe("The user's query to extract categories from"),
      categories: z.array(z.string()).optional(),
      // ... include other necessary fields from GraphState
    }),
  });

  async _call({ state }: z.infer<typeof this.schema>): Promise<Partial<GraphState>> {
    try {
      const query = state.query.toLowerCase();
      const categories: string[] = [];

      // Iterate over HIGH_LEVEL_CATEGORY_MAPPING to identify relevant categories
      for (const [category, keywords] of Object.entries(HIGH_LEVEL_CATEGORY_MAPPING)) {
        if (keywords.some(keyword => query.includes(keyword.toLowerCase()))) {
          categories.push(category);
        }
      }

      // Default to 'General' if no categories are matched
      if (categories.length === 0) {
        categories.push("General");
      }

      logger.debug(`Extracted high-level categories: ${categories.join(', ')}`);

      return { 
        categories,
        error: false,
        message: 'Categories extracted successfully.',
      };
    } catch (error) {
      logger.error("Error in ExtractHighLevelCategoriesTool:", error);
      return { 
        categories: ['General'],
        error: true,
        message: 'Error extracting high-level categories.',
      };
    }
  }
}
