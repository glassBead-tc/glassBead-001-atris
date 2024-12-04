import { tool } from "@langchain/core/tools";
import { Document } from "langchain/document";
import { z } from "zod";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { SystemChatMessage, HumanChatMessage } from "langchain/schema";

// Define input schema using zod
const generatorInputSchema = z.object({
  docs: z.array(z.instanceof(Document)).describe("Retrieved documents to generate response from"),
  query: z.string().describe("Original query to answer")
});

type GeneratorInput = z.infer<typeof generatorInputSchema>;

interface GeneratorOutput {
  response: string;
}

/**
 * Generates a response from retrieved documents
 */
export const generatorTool = tool(
  async (input: GeneratorInput): Promise<GeneratorOutput> => {
    try {
      console.log("\n=== Generator Input ===");
      console.log("Query:", input.query);
      console.log("Number of docs:", input.docs.length);

      if (input.docs.length === 0) {
        return { 
          response: "I apologize, but I couldn't find any relevant documentation to answer your question." 
        };
      }

      // Create a new LLM instance for response generation
      const llm = new ChatOpenAI({
        modelName: 'gpt-3.5-turbo',
        temperature: 0.1,
      });

      // Combine document content
      const context = input.docs
        .map(doc => doc.pageContent)
        .join("\n\n");

      const systemPrompt = `You are a helpful assistant that answers questions about the Audius SDK.
Your task: Answer the query using ONLY the provided documentation context.
If the context doesn't contain relevant information, respond with "I apologize, but I couldn't find that information in the documentation."
Format your response in a clear, direct manner.

Documentation context:
${context}`;

      const messages = [
        new SystemChatMessage(systemPrompt),
        new HumanChatMessage(input.query)
      ];

      const response = await llm.call(messages);

      console.log("Generated response length:", response.text.length);
      
      return { response: response.text };

    } catch (error) {
      console.error("Error in generator:", error);
      return { 
        response: "I apologize, but I encountered an error while generating a response to your question." 
      };
    }
  },
  {
    name: "generator",
    description: "Generates a response from retrieved documents",
    schema: generatorInputSchema
  }
);
