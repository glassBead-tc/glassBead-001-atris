import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { logger } from '../logger.js';

export class ExtractHighLevelCategories extends StructuredTool {
  name = "extract_high_level_categories";
  description = "Extract high-level categories from a user query";

  schema = z.object({
    query: z.string().describe("The user query to extract categories from"),
  });

  async _call({ query }: z.infer<typeof this.schema>): Promise<string> {
    try {
      const lowercaseInput = query.toLowerCase();
      const categories = [];

      if (lowercaseInput.includes("track") || lowercaseInput.includes("song")) {
        categories.push("Tracks");
      }
      if (lowercaseInput.includes("playlist")) {
        categories.push("Playlists");
      }
      if (lowercaseInput.includes("user") || lowercaseInput.includes("artist")) {
        categories.push("Users");
      }
      if (lowercaseInput.includes("search")) {
        categories.push("Search");
      }

      return JSON.stringify({ categories });
    } catch (error) {
      logger.error("Error in ExtractHighLevelCategories:", error);
      return JSON.stringify({ categories: [] });
    }
  }
}
