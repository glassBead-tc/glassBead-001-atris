import { tool } from "@langchain/core/tools";
import { Document } from "langchain/document";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { BaseMessage } from "@langchain/core/messages";

// Define input schema using zod
const graderInputSchema = z.object({
  docs: z.array(z.any()).describe("List of documents to grade"),
  query: z.string().describe("The original query")
});

type GraderInput = z.infer<typeof graderInputSchema>;

interface GraderOutput {
  grade: number;
}

// Initialize chat model
const chat = new ChatOpenAI({
  modelName: "gpt-4-1106-preview",
  temperature: 0
});

// Grading prompt template
const gradePrompt = PromptTemplate.fromTemplate(`
You are a documentation relevance grader. Your task is to determine if the provided documentation content is relevant to answering the user's query.

Query: {query}

Documentation Content:
{content}

Rate the relevance on a scale from 0 to 1, where:
0 = Not relevant at all, cannot help answer the query
1 = Relevant, contains information that helps answer the query

Only respond with a single number (0 or 1).
`);

/**
 * Extracts string content from a BaseMessage
 */
function extractMessageContent(message: BaseMessage): string {
  const content = message.content;
  if (typeof content === 'string') {
    return content;
  } else if (Array.isArray(content)) {
    return content
      .map(item => (typeof item === 'string' ? item : ''))
      .join('');
  }
  return '';
}

/**
 * Grades the relevance of retrieved documents for a query
 */
export const graderTool = tool(
  async (input: GraderInput): Promise<GraderOutput> => {
    try {
      const { docs, query } = input;

      if (!docs.length) {
        return { grade: 0 };
      }

      // Combine all document content
      const combinedContent = docs
        .map(doc => doc.pageContent)
        .join("\n\n");

      // Format prompt
      const formattedPrompt = await gradePrompt.format({
        query,
        content: combinedContent
      });

      // Get grade from chat model
      const response = await chat.invoke(formattedPrompt);
      const responseContent = extractMessageContent(response);
      const grade = parseInt(responseContent.trim());

      // Validate grade
      if (isNaN(grade) || (grade !== 0 && grade !== 1)) {
        console.warn("Invalid grade received:", responseContent);
        return { grade: 0 };
      }

      return { grade };
    } catch (error) {
      console.error("Error in grader:", error);
      return { grade: 0 };
    }
  },
  {
    name: "grader",
    description: "Grades the relevance of retrieved documents",
    schema: graderInputSchema
  }
);
