import { audiusSdk } from '../sdkClient.js'
import { tool } from "@langchain/core/tools"
import { z } from "zod"
import { GraphState, DatasetSchema, ComplexityLevel, EntityType, QueryType, AudiusCorpus } from "../types.js";
import fs from "fs";
import { TRIMMED_CORPUS_PATH } from "../constants.js";
import { END } from "@langchain/langgraph";

// Add at the top with other type imports
type ApiCategory = 'Tracks' | 'Playlists' | 'Users';

// Update the EXTRACT_HIGH_LEVEL_CATEGORIES mapping with proper typing
const EXTRACT_HIGH_LEVEL_CATEGORIES: Record<string, ApiCategory> = {
  'Get Trending Tracks': 'Tracks',
  'Get Trending Playlists': 'Playlists',
  'Search Tracks': 'Tracks',
  'Search Users': 'Users',
  'Search Playlists': 'Playlists',
  'Get Genre Info': 'Tracks'  // Genre info comes from track endpoints
} as const;

/**
 * Selects the appropriate SDK function based on the user's query.
 *
 * @param {object} input - The input object containing state information.
 * @returns {Promise<Partial<GraphState>>} - The updated graph state.
 */
export const selectApiTool = tool(
  async (input: { 
    categories: string[];
    queryType: QueryType;
    entityType: EntityType | null;
  }): Promise<{
    bestApi: DatasetSchema;
    queryType: QueryType;
    entityType: EntityType | null;
  }> => {
    try {
      console.log("\n=== Select API Tool Processing ===");
      console.log("Raw Input:", JSON.stringify(input, null, 2));
      
      const rawData = fs.readFileSync(TRIMMED_CORPUS_PATH, 'utf-8');
      const corpus: AudiusCorpus = JSON.parse(rawData);
      
      // Filter APIs by query type and category
      const apis = corpus.endpoints.filter(endpoint => {
        // For trending queries, specifically look for trending APIs
        if (input.queryType === 'trending_tracks') {
          return endpoint.api_name.toLowerCase().includes('trending') &&
                 endpoint.category_name === 'Tracks';
        }

        // For other queries, match by category
        return input.categories.some(cat => 
          EXTRACT_HIGH_LEVEL_CATEGORIES[cat as keyof typeof EXTRACT_HIGH_LEVEL_CATEGORIES] === endpoint.category_name
        );
      });

      if (!apis.length) {
        throw new Error(`No APIs found for categories: ${input.categories.join(', ')}`);
      }

      // Select best API (first matching one for now)
      const selectedApi = apis[0];
      
      const result = {
        bestApi: selectedApi,
        queryType: input.queryType,
        entityType: input.entityType
      };

      console.log("Tool Output:", JSON.stringify(result, null, 2));
      console.log("\n=== Selected API Details ===");
      console.log("Selected API:", selectedApi);
      console.log("API Template Response:", selectedApi.template_response);
      console.log("Full Result:", JSON.stringify(result, null, 2));
      
      return result;
    } catch (err: unknown) {
      const error = err as Error;
      console.error("\n=== Select API Tool Error ===");
      console.error("Error Type:", error.constructor.name);
      console.error("Error Message:", error.message);
      console.error("Input State:", JSON.stringify(input, null, 2));
      throw error;
    }
  },
  {
    name: "select_api",
    description: "Selects the most appropriate API from available options",
    schema: z.object({
      categories: z.array(z.string()),
      queryType: z.enum(['trending_tracks', 'trending_playlists', 'tracks', 'users', 'playlists', 'genre_info']),
      entityType: z.enum(['track', 'user', 'playlist']).nullable()
    })
  }
);

export const extractCategoryTool = tool(
  async (input: { query: string }): Promise<{
    queryType: QueryType;
    entityType: EntityType | null;
    isEntityQuery: boolean;
    complexity: ComplexityLevel;
    categories: string[];
  }> => {
    console.log("\n=== Extract Category Tool Processing ===");
    console.log("Raw Input:", JSON.stringify(input, null, 2));
    console.log("Expected Schema:", {
      type: "object",
      properties: {
        query: { type: "string" }
      }
    });
    console.log("Query:", input.query);

    const normalizedQuery = input.query.toLowerCase();

    // Entity detection
    const entityType = detectEntityType(normalizedQuery);
    
    // Query type detection
    const queryType = (): QueryType => {
      if (normalizedQuery.includes('trending')) {
        if (normalizedQuery.includes('playlist')) {
          return 'trending_playlists';
        }
        return 'trending_tracks';
      }
      
      if (normalizedQuery.includes('genre')) {
        return 'genre_info';
      }
      
      if (normalizedQuery.includes('playlist')) {
        return 'playlists';
      }
      
      if (normalizedQuery.includes('user')) {
        return 'users';
      }
      
      if (normalizedQuery.includes('track') || normalizedQuery.includes('song')) {
        return 'tracks';
      }
      
      return 'general';
    };

    // Determine categories based on query type
    const getCategories = (type: QueryType): string[] => {
      switch (type) {
        case 'trending_tracks':
          return ['Get Trending Tracks'];
        case 'trending_playlists':
          return ['Get Trending Playlists'];
        case 'tracks':
          return ['Search Tracks'];
        case 'users':
          return ['Search Users'];
        case 'playlists':
          return ['Search Playlists'];
        case 'genre_info':
          return ['Get Genre Info'];
        default:
          return [];
      }
    };

    // Complexity analysis
    const complexity = analyzeComplexity(normalizedQuery);

    const determinedQueryType = queryType();
    const result = {
      queryType: determinedQueryType,
      entityType,
      isEntityQuery: entityType !== null,
      complexity,
      categories: getCategories(determinedQueryType)
    };

    console.log("Tool Output:", JSON.stringify(result, null, 2));
    return result;
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
  const playlistWords = ['playlist']; // removed 'album', distinct from playlist on Audius

  if (trackWords.some(word => query.includes(word))) return 'track';
  if (userWords.some(word => query.includes(word))) return 'user';
  if (playlistWords.some(word => query.includes(word))) return 'playlist';
  return null;
};

function analyzeComplexity(query: string): ComplexityLevel {
  const normalizedQuery = query.toLowerCase();
  
  // Complex: Queries requiring historical trend analysis
  if (
    // Time-based analysis
    normalizedQuery.includes('over time') ||
    normalizedQuery.includes('historical') ||
    // Cross-time comparisons
    normalizedQuery.includes('compared to last') ||
    normalizedQuery.includes('versus previous') ||
    // Pattern recognition
    normalizedQuery.includes('pattern') ||
    normalizedQuery.includes('correlation')
  ) {
    return 'complex';
  }

  // Moderate: Multiple API calls or data aggregation
  if (
    // Current trending data
    normalizedQuery.includes('trending') ||
    // Genre popularity analysis
    (normalizedQuery.includes('genre') && (
      normalizedQuery.includes('most') ||
      normalizedQuery.includes('popular') ||
      normalizedQuery.includes('top')
    )) ||
    // Multiple entity queries
    (normalizedQuery.match(/and/g)?.length || 0) > 0 ||
    // Relationship queries
    normalizedQuery.includes('followers') ||
    // followers and following could also be simple, but it's fine that this goes here
    normalizedQuery.includes('following')
  ) {
    return 'moderate';
  }

  // Simple: Direct property lookups (including single genre lookups)
  return 'simple';
}

/**
 * Tool to create and execute API fetch requests based on `bestApi`, `parameters`, and `selectedHost`, including response formatting.
 *
 * @param {object} input - The input object containing `bestApi`, `parameters`, and `selectedHost`.
 * @returns {Promise<{ response: any }>} - The API response.
 */
export const createFetchRequestTool = tool(
  async (input: { 
    parameters: Record<string, any>,
    bestApi: { api_name: string }
  }) => {
    console.log("\n=== Execute SDK Request ===")
    console.log("Input:", input)

    try {
      const response = await executeSDKMethod(input.bestApi.api_name, input.parameters)
      return { response }
    } catch (error) {
      console.error("SDK request failed:", error)
      throw error
    }
  },
  {
    name: "create_fetch_request",
    description: "Executes request using Audius SDK",
    schema: z.object({
      parameters: z.record(z.any()),
      bestApi: z.object({
        api_name: z.string()
      })
    })
  }
)

// Helper function to map API names to SDK methods
async function executeSDKMethod(apiName: string, params: Record<string, any>) {
  console.log("\n=== Execute SDK Method ===");
  console.log("API Name:", apiName);
  console.log("Input Parameters:", params);
  
  let request;
  switch(apiName) {
    case 'Get Trending Tracks':
      request = {
        time: "week" as const,  // Using exact string literal from enum
        genre: "all"  // Added default genre
      };
      console.log("Sending request to tracks.getTrendingTracks:", request);
      return audiusSdk.tracks.getTrendingTracks(request);
      
    case 'Search Tracks':
      request = {
        query: params.query
      };
      console.log("Sending request to tracks.searchTracks:", request);
      return audiusSdk.tracks.searchTracks(request);
      
    default:
      throw new Error(`Unsupported API: ${apiName}`);
  }
}

export const resetState = tool(
  async (input: Record<string, any>): Promise<Partial<GraphState>> => {
    console.log("\n=== Reset State Input ===");
    console.log(JSON.stringify(input, null, 2));

    // Reset query-specific state but maintain LLM and other persistent properties
    return {
      query: null,
      queryType: null,
      categories: null,
      apis: null,
      bestApi: null,
      parameters: null,
      response: null,
      complexity: null,
      isEntityQuery: null,
      entityName: null,
      entityType: null,
      error: null,
      entity: null,
      secondaryApi: null,
      secondaryResponse: null,
      formattedResponse: null,
      messages: null
    };
  },
  {
    name: "reset_state",
    description: "Resets query-specific state properties while maintaining persistent ones",
    schema: z.object({
      llm: z.any().optional(),
      selectedHost: z.string().optional()
    }).strict()
  }
);

export const extractParametersTool = tool(
  async (input: {
    query: string,
    entityType: EntityType | null,
    bestApi: DatasetSchema
  }): Promise<{
    parameters: {
      entityName: string | null;
      query: string;
      time?: string;
      genre?: string;
      limit?: number;
    }
  }> => {
    console.log("\n=== extractParameters Processing ===");
    console.log("Input:", input);

    // Initialize parameters with type assertion to allow additional properties
    const parameters: {
      entityName: string | null;
      query: string;
      time?: string;
      genre?: string;
      limit?: number;
    } = {
      entityName: null,
      query: input.query
    };

    // Add trending-specific parameters
    if (input.bestApi.api_name.toLowerCase().includes('trending')) {
      parameters.time = 'week';
      parameters.limit = 10;
      // Genre is optional, leave undefined unless specified
    }

    // Extract entity name if needed
    if (input.entityType) {
      const byMatch = input.query.match(/by\s+([^?.,]+)/i);
      const fromMatch = input.query.match(/from\s+([^?.,]+)/i);
      const quotedMatch = input.query.match(/"([^"]+)"|'([^']+)'/);
      
      const extractedName = quotedMatch?.[1] || 
                           byMatch?.[1] || 
                           fromMatch?.[1] || 
                           null;
                           
      parameters.entityName = extractedName?.trim() ?? null;
    }

    return { parameters };
  },
  {
    name: "extract_parameters",
    description: "Extracts parameters from the query",
    schema: z.object({
      query: z.string(),
      entityType: z.enum(['track', 'user', 'playlist']).nullable(),
      bestApi: z.object({
        id: z.string(),
        category_name: z.string(),
        tool_name: z.string(),
        api_name: z.string(),
        api_description: z.string(),
        required_parameters: z.array(z.any()),
        optional_parameters: z.array(z.any()),
        method: z.string(),
        api_url: z.string()
      })
    })
  }
);

// Add after the type definitions
export function verifyParams(input: GraphState): Promise<"execute_request_node" | typeof END> {
  console.log("\n=== Parameter Verification Start ===");
  console.log("Input State:", JSON.stringify(input, null, 2));
  console.log("Best API:", input.bestApi);
  console.log("Parameters:", input.parameters);
  
  if (!input.bestApi?.required_parameters) {
    throw new Error("No API selected");
  }

  const required = input.bestApi.required_parameters.map((p: { name: string }) => p.name);
  const extracted = Object.keys(input.parameters || {});
  
  console.log("Required:", required);
  console.log("Extracted:", extracted);

  // If no required parameters, proceed to execution
  if (required.length === 0) {
    console.log("No required parameters for the selected API. Proceeding to execute_request_node.");
    return Promise.resolve("execute_request_node");
  }

  // Check if all required parameters are present
  const missing = required.filter((p: string) => !extracted.includes(p));
  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(", ")}`);
  }

  return Promise.resolve("execute_request_node");
}

// Replace selectHostTool with SDK initialization check
export const initSdkTool = tool(
  async (): Promise<{ initialized: boolean }> => {
    if (!audiusSdk) {
      throw new Error("SDK not initialized")
    }
    return { initialized: true }
  },
  {
    name: "init_sdk",
    description: "Verifies Audius SDK initialization",
    schema: z.object({})
  }
)

// Rest of the code remains the same...
