import { tool } from "@langchain/core/tools";
import { Document } from "langchain/document";
import { z } from "zod";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { SystemChatMessage, HumanChatMessage } from "langchain/schema";

// Define input schema using zod
const fallbackInputSchema = z.object({
  query: z.string().describe("Query to search with fallback method")
});

type FallbackInput = z.infer<typeof fallbackInputSchema>;

interface FallbackOutput {
  docs: Document[];
}

/**
 * Fallback search tool that uses web search when document retrieval fails
 */
export const fallbackTool = tool(
  async (input: FallbackInput): Promise<FallbackOutput> => {
    try {
      console.log("\n=== Fallback Search Input ===");
      console.log("Query:", input.query);

      // Create a new LLM instance for web search simulation
      const llm = new ChatOpenAI({
        modelName: 'gpt-3.5-turbo',
        temperature: 0.1,
      });

      const systemPrompt = `You are a helpful assistant that searches the web for Audius SDK information.
Current task: Find information about the query: "${input.query}"
If you find relevant information, format it as a clear, direct response.
If no relevant information is found, respond with "No relevant information found."`;

      const messages = [
        new SystemChatMessage(systemPrompt),
        new HumanChatMessage(input.query)
      ];

      const response = await llm.call(messages);

      // Create a document from the response
      const doc = new Document({
        pageContent: response.text,
        metadata: {
          source: 'web_search',
          query: input.query
        }
      });

      return {
        docs: [doc]
      };

    } catch (error) {
      console.error("Error in fallback search:", error);
      return { docs: [] };
    }
  },
  {
    name: "fallback",
    description: "Fallback search when no relevant docs found",
    schema: fallbackInputSchema
  }
);
