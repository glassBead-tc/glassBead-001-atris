import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { GraphState } from '../types.js';
import { logger } from '../logger.js';

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

  async _call({ state }: z.infer<typeof this.schema>): Promise<GraphState> {
    try {
      const query = state.query.toLowerCase();
      const categories = [];

      if (query.includes("track") || query.includes("song")) {
        categories.push("Tracks");
      }
      if (query.includes("playlist")) {
        categories.push("Playlists");
      }
      if (query.includes("user") || query.includes("artist")) {
        categories.push("Users");
      }
      if (query.includes("search")) {
        categories.push("Search");
      }
      if (categories.length === 0) {
        categories.push("General");
      }

      logger.debug(`Extracted high-level categories: ${categories.join(', ')}`);

      return { 
        ...state,
        categories,
        error: false,
        message: 'Categories extracted successfully.',
      };
    } catch (error) {
      logger.error("Error in ExtractHighLevelCategoriesTool:", error);
      return { 
        ...state,
        categories: ['General'],
        error: true,
        message: 'Error extracting high-level categories.',
      };
    }
  }
}
