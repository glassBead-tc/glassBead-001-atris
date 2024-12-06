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
 * Calculates the cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Selects the most relevant documentation URLs based on query embeddings
 */
export const urlSelectorTool = tool(
  async (input: UrlSelectorInput): Promise<UrlSelectorOutput> => {
    try {
      console.log("\n=== URL Selector Input ===");
      console.log("Query:", input.query);

      // Get query embedding
      const queryEmbedding = await embeddings.embedQuery(input.query);

      // Process each URL and get its embedding
      const urlSimilarities = await Promise.all(
        audiusDocURLs.map(async (docUrl: DocURL) => {
          let urlEmbedding: number[];
          
          // Check cache first
          if (urlEmbeddingCache.has(docUrl.path)) {
            urlEmbedding = urlEmbeddingCache.get(docUrl.path)!;
          } else {
            // Create a richer document context
            const enrichedContent = [
              docUrl.title,
              docUrl.description,
              `Category: ${docUrl.category}`,
              // Add key terms for better matching
              docUrl.path.includes('sdk') ? 'SDK implementation development integration' : '',
              docUrl.path.includes('api') ? 'API endpoints requests responses' : '',
              docUrl.path.includes('community') ? 'Community projects implementations SDKs' : ''
            ].join('\n');

            const doc = new Document({
              pageContent: enrichedContent,
              metadata: { url: docUrl.path }
            });
            
            // Get embedding for the document
            const embedResult = await embeddings.embedDocuments([doc.pageContent]);
            urlEmbedding = embedResult[0];
            urlEmbeddingCache.set(docUrl.path, urlEmbedding);
          }
          
          // Calculate similarity
          const similarity = cosineSimilarity(queryEmbedding, urlEmbedding);

          // Check term matches
          const terms = input.query.toLowerCase().split(/\W+/);
          const content = docUrl.title.toLowerCase() + ' ' + docUrl.description.toLowerCase();
          const termMatches = terms.filter(term => content.includes(term)).length;
          const hasTermMatch = termMatches > 0;

          // Check category match
          const isCoreContent = docUrl.category === 'learn';

          // Check protocol match
          const isProtocolMatch = input.query.toLowerCase().includes('protocol') && 
            (docUrl.path.includes('protocol') || docUrl.title.toLowerCase().includes('protocol'));

          // Binary relevance: Document is relevant if it has semantic similarity OR term match OR is core content OR matches protocol query
          const isRelevant = similarity > 0.7 || hasTermMatch || isCoreContent || isProtocolMatch ? 1 : 0;

          console.log(`\nRelevance check for ${docUrl.path}:
            Similarity > 0.7: ${similarity > 0.7}
            Has Term Match: ${hasTermMatch}
            Is Core Content: ${isCoreContent}
            Protocol Match: ${isProtocolMatch}
            Is Relevant: ${isRelevant}
          `);

          return {
            url: `https://docs.audius.org${docUrl.path}`,
            similarity: isRelevant,
            category: docUrl.category,
            isSDK: docUrl.path.includes('sdk')
          };
        })
      );

      // Sort by similarity
      const sortedUrls = urlSimilarities.sort((a, b) => b.similarity - a.similarity);

      // If query is about SDKs, include community implementations
      const isSDKQuery = input.query.toLowerCase().includes('sdk') || 
                        input.query.toLowerCase().includes('implementation');

      let selectedUrls = sortedUrls.slice(0, 3).map(result => result.url);

      // Add community projects URL for SDK queries
      if (isSDKQuery) {
        selectedUrls.push("https://docs.audius.org/developers/community-projects");
      }

      console.log("Selected URLs:", selectedUrls);

      return { urls: selectedUrls };
    } catch (error) {
      console.error("Error in URL selector:", error);
      // Return broader set of URLs for SDK queries
      if (input.query.toLowerCase().includes('sdk')) {
        return {
          urls: [
            "https://docs.audius.org/developers/sdk",
            "https://docs.audius.org/developers/community-projects",
            "https://docs.audius.org/developers/sdk/advanced-options"
          ]
        };
      }
      // Default fallback
      return {
        urls: [
          "https://docs.audius.org/learn/concepts/protocol",
          "https://docs.audius.org/developers/sdk",
          "https://docs.audius.org/developers/api"
        ]
      };
    }
  },
  {
    name: "url_selector",
    description: "Selects relevant documentation URLs based on query",
    schema: urlSelectorInputSchema
  }
);
