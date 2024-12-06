import { tool } from "@langchain/core/tools";
import { Document } from "langchain/document";
import { OpenAIEmbeddings } from "@langchain/openai";
import { z } from "zod";

// Define input schema using zod
const graderInputSchema = z.object({
  docs: z.array(z.any()).describe("Documents to grade"),
  query: z.string().describe("Original query for context")
});

type GraderInput = z.infer<typeof graderInputSchema>;

interface GraderOutput {
  grade: number;
  relevantDocs: Document[];
}

// Create embeddings instance
const embeddings = new OpenAIEmbeddings();

/**
 * Grades retrieved documents using a binary relevance system
 */
export const graderTool = tool(
  async (input: GraderInput): Promise<GraderOutput> => {
    try {
      console.log("\n=== Grader Input ===");
      console.log("Query:", input.query);
      console.log("Number of docs:", input.docs.length);

      const { docs, query } = input;

      if (docs.length === 0) {
        console.warn("No documents to grade");
        return { grade: 0, relevantDocs: [] };
      }

      // Get query embedding
      const queryEmbedding = await embeddings.embedQuery(query);

      // Get embeddings for all documents
      const docEmbeddings = await embeddings.embedDocuments(
        docs.map(doc => doc.pageContent)
      );

      // Extract key terms from query
      const queryTerms = query.toLowerCase()
        .split(/\W+/)
        .filter(term => term.length > 3);

      // Calculate relevance for each document
      const docsWithScores = docs.map((doc, i) => {
        // Calculate cosine similarity
        const dotProduct = queryEmbedding.reduce((sum, val, j) => sum + val * docEmbeddings[i][j], 0);
        const queryMagnitude = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));
        const docMagnitude = Math.sqrt(docEmbeddings[i].reduce((sum, val) => sum + val * val, 0));
        const similarity = dotProduct / (queryMagnitude * docMagnitude);

        // Check for key term matches
        const docContent = doc.pageContent.toLowerCase();
        const termMatches = queryTerms.filter(term => docContent.includes(term)).length;
        const termMatchRatio = termMatches / queryTerms.length;

        // Calculate combined score
        const score = (similarity + termMatchRatio) / 2;

        return {
          doc,
          score,
          similarity,
          termMatchRatio
        };
      });

      // Sort by combined score
      const sortedDocs = docsWithScores.sort((a, b) => b.score - a.score);

      // A document is relevant if it has either:
      // 1. High similarity (>0.2) OR
      // 2. Good term match ratio (>0.2)
      // Lower thresholds for technical queries which may have more specialized vocabulary
      const relevantDocs = sortedDocs
        .filter(item => item.similarity > 0.2 || item.termMatchRatio > 0.2)
        .map(item => item.doc);

      // Binary grade: 1 if any relevant docs found, 0 if none
      const grade = relevantDocs.length > 0 ? 1 : 0;

      console.log(`Grade: ${grade} (${relevantDocs.length} relevant docs found)`);
      console.log('Top document scores:', 
        sortedDocs.slice(0, 3).map(d => ({
          similarity: d.similarity.toFixed(2),
          termMatchRatio: d.termMatchRatio.toFixed(2)
        }))
      );

      return {
        grade,
        relevantDocs
      };

    } catch (error) {
      console.error("Error in grader:", error);
      return { grade: 0, relevantDocs: [] };
    }
  },
  {
    name: "grader",
    description: "Grades retrieved documents using binary relevance",
    schema: graderInputSchema
  }
);
