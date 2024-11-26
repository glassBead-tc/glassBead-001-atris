import { tool } from "@langchain/core/tools";
import { Document } from "langchain/document";
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { z } from "zod";

// Define input schema using zod
const retrieverInputSchema = z.object({
  urls: z.array(z.string()).describe("List of URLs to retrieve content from")
});

type RetrieverInput = z.infer<typeof retrieverInputSchema>;

interface RetrieverOutput {
  docs: Document[];
}

// Cache for document content
const documentCache = new Map<string, Document[]>();

// Text splitter for chunking
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", " ", ""],
});

/**
 * Retrieves and processes content from documentation URLs
 */
export const retrieverTool = tool(
  async (input: RetrieverInput): Promise<RetrieverOutput> => {
    try {
      const { urls } = input;
      // Process each URL
      const allDocs = await Promise.all(
        urls.map(async url => {
          // Check cache first
          if (documentCache.has(url)) {
            return documentCache.get(url)!;
          }

          // Load and process the URL
          const loader = new CheerioWebBaseLoader(url, {
            selector: "article", // Most documentation sites wrap content in article tags
          });

          const rawDocs = await loader.load();
          
          // Split into chunks
          const docs = await textSplitter.splitDocuments(rawDocs);
          
          // Add metadata
          docs.forEach(doc => {
            doc.metadata = {
              ...doc.metadata,
              chunk_type: "documentation",
              source_url: url
            };
          });

          // Cache the results
          documentCache.set(url, docs);
          return docs;
        })
      );

      // Flatten and return all documents
      return { docs: allDocs.flat() };
    } catch (error) {
      console.error("Error in retriever:", error);
      return { docs: [] };
    }
  },
  {
    name: "retriever",
    description: "Retrieves and processes content from documentation URLs",
    schema: retrieverInputSchema
  }
);
