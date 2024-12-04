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

// Cache interface with TTL
interface CacheEntry {
  docs: Document[];
  timestamp: number;
  ttl: number;
}

// Cache for document content with TTL
const documentCache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Text splitter configurations
const codeBlockSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1500,
  chunkOverlap: 200,
  separators: ["```", "'''", "\n\n", "\n", " "],
});

const conceptualSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 2000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", ". ", " "],
});

/**
 * Detects if content is primarily code/technical
 */
function isTechnicalContent(content: string): boolean {
  const codeIndicators = [
    '```',
    'function',
    'class',
    'import',
    'const',
    'let',
    'var',
    'return',
    'async',
    'await'
  ];
  
  const contentLower = content.toLowerCase();
  const matches = codeIndicators.filter(indicator => 
    contentLower.includes(indicator)
  ).length;
  
  return matches >= 3; // Consider technical if 3+ indicators present
}

/**
 * Extracts and processes code blocks
 */
function processCodeBlocks(content: string): { content: string, metadata: any } {
  const codeBlocks: string[] = [];
  let processedContent = content;
  
  // Extract code blocks
  const codeBlockRegex = /```[\s\S]*?```/g;
  processedContent = content.replace(codeBlockRegex, (match) => {
    codeBlocks.push(match);
    return '[CODE_BLOCK]';
  });
  
  return {
    content: processedContent,
    metadata: {
      hasCode: codeBlocks.length > 0,
      codeBlocks,
      contentType: isTechnicalContent(content) ? 'technical' : 'conceptual'
    }
  };
}

/**
 * Attempts to load content using different selectors
 */
async function loadWithFallback(url: string): Promise<Document[]> {
  // List of selectors to try in order
  const selectors = [
    "main", 
    "article", 
    ".content", 
    ".documentation", 
    "#content",
    ".markdown-content", // Common for docs
    ".api-content", // API docs specific
    "body"
  ];
  
  for (const selector of selectors) {
    try {
      // First load the page
      const loader = new CheerioWebBaseLoader(url, {
        selector: selector
      });
      
      // Get the Cheerio instance and remove unwanted elements
      const $ = await loader.scrape();
      ['nav', 'header', 'footer', '.navigation', '.sidebar', '.menu'].forEach(sel => {
        $(sel).remove();
      });
      
      // Now load the cleaned HTML
      const docs = await loader.load();
      
      // Check if we got meaningful content
      if (docs[0]?.pageContent?.trim().length > 100) {
        console.log(`Successfully loaded content using selector: ${selector}`);
        return docs;
      }
      console.log(`Selector ${selector} returned insufficient content, trying next...`);
    } catch (error) {
      console.log(`Failed to load with selector ${selector}, trying next...`);
    }
  }
  
  // If all selectors fail, try one last time with minimal selector
  try {
    const loader = new CheerioWebBaseLoader(url);
    return await loader.load();
  } catch (error) {
    console.error(`All loading attempts failed for ${url}`);
    return [];
  }
}

/**
 * Retrieves and processes content from documentation URLs
 */
export const retrieverTool = tool(
  async (input: RetrieverInput): Promise<RetrieverOutput> => {
    try {
      console.log("\n=== Retriever Input ===");
      console.log("URLs:", input.urls);

      const { urls } = input;
      
      // Process each URL
      const allDocs = await Promise.all(
        urls.map(async url => {
          // Check cache and TTL
          const cached = documentCache.get(url);
          if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
            console.log(`Cache hit for ${url}`);
            return cached.docs;
          }

          console.log(`Fetching content from ${url}`);

          // Load and process the URL with fallback selectors
          const rawDocs = await loadWithFallback(url);
          
          if (!rawDocs.length || !rawDocs[0].pageContent) {
            console.warn(`No content found for ${url}`);
            return [];
          }

          // Process each document
          const processedDocs = await Promise.all(
            rawDocs.map(async doc => {
              // Process code blocks and get metadata
              const { content, metadata } = processCodeBlocks(doc.pageContent);
              
              // Choose appropriate splitter based on content type
              const splitter = metadata.contentType === 'technical' 
                ? codeBlockSplitter 
                : conceptualSplitter;
              
              // Split the document
              const splitDocs = await splitter.createDocuments([content]);
              
              // Add metadata to each chunk
              return splitDocs.map(splitDoc => {
                return {
                  ...splitDoc,
                  metadata: {
                    ...splitDoc.metadata,
                    ...metadata,
                    url,
                    chunk_type: metadata.contentType,
                    source_length: content.length,
                    chunk_length: splitDoc.pageContent.length
                  }
                };
              });
            })
          );

          // Flatten processed docs
          const docs = processedDocs.flat();
          
          // Update cache with TTL
          documentCache.set(url, {
            docs,
            timestamp: Date.now(),
            ttl: DEFAULT_TTL
          });
          
          return docs;
        })
      );

      // Flatten all documents
      const docs = allDocs.flat();
      
      // Log retrieval stats
      console.log(`Retrieved ${docs.length} total chunks`);
      const stats = docs.reduce((acc, doc) => {
        const type = doc.metadata.contentType;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log("Content type distribution:", stats);

      return { docs };
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
