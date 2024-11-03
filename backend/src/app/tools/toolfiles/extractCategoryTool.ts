import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { QueryType, EntityType, ComplexityLevel } from "../../types.js";

export const extractCategoryTool = tool(
  async (input: { query: string }): Promise<{
    queryType: QueryType,
    entityType: EntityType | null,
    isEntityQuery: boolean,
    complexity: ComplexityLevel
  }> => {
    console.log("\n=== Extract Category Tool Input ===");
    console.log("Query:", input.query);

    const normalizedQuery = input.query.toLowerCase();

    // Entity detection
    const entityType = detectEntityType(normalizedQuery);
    
    // Query type detection
    const queryType = normalizedQuery.includes('trending') ? 
      'trending_tracks' as QueryType : 
      'general' as QueryType;

    // Complexity analysis
    const complexity = analyzeComplexity(normalizedQuery);

    return {
      queryType,
      entityType,
      isEntityQuery: entityType !== null,
      complexity
    };
  },
  {
    name: "extract_category",
    description: "Extracts category from query",
    schema: z.object({
      query: z.string()
    })
  }
);

function detectEntityType(query: string): EntityType | null {
  const trackWords = ['track', 'song', 'play', 'plays', 'genre'];
  const userWords = ['user', 'artist', 'follower', 'followers'];
  const playlistWords = ['playlist', 'album'];

  if (trackWords.some(word => query.includes(word))) return 'track';
  if (userWords.some(word => query.includes(word))) return 'user';
  if (playlistWords.some(word => query.includes(word))) return 'playlist';
  return null;
}


// TODO: we must implement the below definition of complexity
// NOTE: complexity in this context is a reference to the following:
// "Simple" = Query can be answered with a specific value or set of values pulled directly from a single API call response body,
//            or a simple calculation based on a single API call response body.
// "Moderate" = Query requires multiple API calls to answer, or a more complex calculation based on multiple API call response bodies.
// "Complex" = Query requires a series of complex queries to answer, or a highly complex calculation based on multiple API call response bodies.
//            We will not attempt to answer complex queries right now.
function analyzeComplexity(query: string): ComplexityLevel {
  const words = query.split(' ').length;
  const conditions = query.split('and').length + query.split('or').length - 1;
  
  if (words > 10 || conditions > 2) return 'complex';
  if (words > 5 || conditions > 1) return 'moderate';
  return 'simple';
} 