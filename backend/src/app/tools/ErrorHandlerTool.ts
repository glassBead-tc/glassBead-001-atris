import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { GraphState } from "../types.js";
import { logger } from "../logger.js";

export class ErrorHandlerTool extends StructuredTool {
  name = "error_handler";
  description = "Handles errors and updates the state with appropriate messages.";

  schema = z.object({
    state: z.object({
      error: z.boolean(),
      message: z.string().optional(),
      formattedResponse: z.string().optional(),
      // Include other necessary state properties
    }),
  });

  async _call({ state }: z.infer<typeof this.schema>): Promise<Partial<GraphState>> {
    if (state.error) {
      logger.error("An error occurred:", state.message);

      // Provide a user-friendly message
      const userMessage = "Oops! Something went wrong while processing your request.";

      return {
        formattedResponse: userMessage,
        error: false, // Reset error flag
      };
    }
    return {};
  }
}
