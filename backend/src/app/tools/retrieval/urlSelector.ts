import { tool } from "@langchain/core/tools";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "langchain/document";
import { audiusDocURLs, DocURL } from './audiusDocURLs.js';
import { z } from "zod";

// Define input schema using zod
const urlSelectorInputSchema = z.object({
  query: z.string().describe("The query to find relevant documentation for")
});

type UrlSelectorInput = z.infer<typeof urlSelectorInputSchema>;

interface UrlSelectorOutput {
  urls: string[];
}

// Create embeddings instance
const embeddings = new OpenAIEmbeddings();

// Cache for document embeddings
const urlEmbeddingCache = new Map<string, number[]>();

/**
 * Calculates the dot product of two vectors
 */
function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

/**
 * Selects the most relevant documentation URLs based on query embeddings
 */
export const urlSelectorTool = tool(
  async (input: UrlSelectorInput): Promise<UrlSelectorOutput> => {
    try {
      const { query } = input;
      // Get query embedding
      const queryEmbedding = await embeddings.embedQuery(query);

      // Get or compute embeddings for each URL
      const urlEmbeddings = await Promise.all(
        audiusDocURLs.map(async (docUrl: DocURL) => {
          if (urlEmbeddingCache.has(docUrl.path)) {
            return urlEmbeddingCache.get(docUrl.path)!;
          }
          
          // Create a document from the URL's metadata
          const doc = new Document({
            pageContent: `${docUrl.title} - ${docUrl.description}`,
            metadata: { url: docUrl.path }
          });
          
          const embedding = await embeddings.embedDocuments([doc.pageContent]);
          urlEmbeddingCache.set(docUrl.path, embedding[0]);
          return embedding[0];
        })
      );

      // Calculate similarity scores (using dot product since OpenAI embeddings are normalized)
      const similarities = urlEmbeddings.map(embedding => 
        dotProduct(queryEmbedding, embedding)
      );

      // Sort URLs by similarity and take top 3
      const urlsWithScores = audiusDocURLs.map((docUrl, i) => ({
        url: docUrl.path,
        score: similarities[i]
      }));

      const sortedUrls = urlsWithScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(item => item.url);

      return { urls: sortedUrls };
    } catch (error) {
      console.error('Error in urlSelectorTool:', error);
      return { urls: [] };
    }
  },
  {
    name: "url_selector",
    description: "Selects relevant documentation URLs based on the query",
    schema: urlSelectorInputSchema
  }
);
