import { getAudiusSdk } from '../sdkClient.js'
import { tool } from "@langchain/core/tools"
import { z } from "zod"
import { GraphState, DatasetSchema, ComplexityLevel, EntityType, QueryType, AudiusCorpus } from "../types.js";
import fs from "fs";
import { TRIMMED_CORPUS_PATH } from "../constants.js";
import { END } from "@langchain/langgraph";
import type { 
  TracksResponse, 
  GetTrendingTracksTimeEnum,
  UsersResponse,
  TrackResponse,
  UserResponse,
  PlaylistResponse,
  Track,
  User,
  Playlist,
  TrackCommentsResponse,
  StemsResponse,
  Reposts,
  FavoritesResponse
} from '@audius/sdk';

// Add at the top with other type imports
type ApiCategory = 'Tracks' | 'Playlists' | 'Users';
type ApiResponse = 
  | TracksResponse 
  | UsersResponse 
  | TrackResponse 
  | UserResponse 
  | PlaylistResponse
  | TrackCommentsResponse
  | StemsResponse
  | Reposts
  | FavoritesResponse;

// Update the EXTRACT_HIGH_LEVEL_CATEGORIES mapping with proper typing
const EXTRACT_HIGH_LEVEL_CATEGORIES: Record<string, ApiCategory> = {
  'Get Trending Tracks': 'Tracks',
  'Get Track': 'Tracks',
  'Search Tracks': 'Tracks',
  'Get Track Comments': 'Tracks',
  'Get Track Stems': 'Tracks',
  'Get Track Favorites': 'Tracks',
  'Get Track Reposts': 'Tracks',
  'Get Trending Playlists': 'Playlists',
  'Get Playlist': 'Playlists',
  'Search Playlists': 'Playlists',
  'Get User': 'Users',
  'Search Users': 'Users',
  'Get User Reposts': 'Users',
  'Get User Favorites': 'Users',
  'Get User Followers': 'Users',
  'Get User Following': 'Users',
  'Get Genre Info': 'Tracks'  // Genre info comes from track endpoints
} as const;

/**
 * Selects the appropriate SDK function based on the user's query.
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
        // For trending queries
        if (input.queryType === 'trending_tracks') {
          return endpoint.api_name === 'Get Trending Tracks';
        }
        if (input.queryType === 'trending_playlists') {
          return endpoint.api_name === 'Get Trending Playlists';
        }

        // For entity-specific queries
        if (input.entityType === 'track') {
          return endpoint.api_name === 'Get Track';
        }
        if (input.entityType === 'user') {
          return endpoint.api_name === 'Get User';
        }
        if (input.entityType === 'playlist') {
          return endpoint.api_name === 'Get Playlist';
        }

        // For search queries
        if (input.queryType === 'tracks') {
          return endpoint.api_name === 'Search Tracks';
        }
        if (input.queryType === 'users') {
          return endpoint.api_name === 'Search Users';
        }
        if (input.queryType === 'playlists') {
          return endpoint.api_name === 'Search Playlists';
        }

        // For genre info
        if (input.queryType === 'genre_info') {
          return endpoint.api_name === 'Get Genre Info';
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
      
      if (normalizedQuery.includes('user') || normalizedQuery.includes('followers')) {
        return 'users';
      }
      
      if (normalizedQuery.includes('track') || normalizedQuery.includes('song') || normalizedQuery.includes('plays')) {
        return 'tracks';
      }
      
      return 'general';
    };

    // Determine categories based on query type and context
    const getCategories = (type: QueryType): string[] => {
      const query = normalizedQuery;
      
      switch (type) {
        case 'trending_tracks':
          return ['Get Trending Tracks'];
        case 'trending_playlists':
          return ['Get Trending Playlists'];
        case 'tracks':
          if (query.includes('comment')) return ['Get Track Comments'];
          if (query.includes('stem')) return ['Get Track Stems'];
          if (query.includes('favorite')) return ['Get Track Favorites'];
          if (query.includes('repost')) return ['Get Track Reposts'];
          return ['Get Track', 'Search Tracks'];
        case 'users':
          if (query.includes('follower')) return ['Get User Followers'];
          if (query.includes('following')) return ['Get User Following'];
          if (query.includes('repost')) return ['Get User Reposts'];
          if (query.includes('favorite')) return ['Get User Favorites'];
          return ['Get User', 'Search Users'];
        case 'playlists':
          return ['Get Playlist', 'Search Playlists'];
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
  const trackWords = ['track', 'song', 'play', 'plays', 'genre', 'stem'];
  const userWords = ['user', 'artist', 'follower', 'followers', 'following']; 
  const playlistWords = ['playlist', 'collection']; 

  if (trackWords.some(word => query.includes(word))) return 'track';
  if (userWords.some(word => query.includes(word))) return 'user';
  if (playlistWords.some(word => query.includes(word))) return 'playlist';
  return null;
};

function analyzeComplexity(query: string): ComplexityLevel {
  const normalizedQuery = query.toLowerCase();
  
  // Complex: Queries requiring historical trend analysis or multiple API calls
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
    normalizedQuery.includes('following') ||
    normalizedQuery.includes('favorite') ||
    normalizedQuery.includes('repost') ||
    normalizedQuery.includes('comment')
  ) {
    return 'moderate';
  }

  // Simple: Direct property lookups
  return 'simple';
}

// Utility function to add timeout to a promise
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]);
};

/**
 * Tool to create and execute API fetch requests.
 */
export const createFetchRequestTool = tool(
  async (input: { 
    parameters: Record<string, any>;
    bestApi: { api_name: string };
  }): Promise<{ response: ApiResponse }> => {
    try {
      const sdk = await getAudiusSdk(); // Get the singleton instance
      const sdkParams = extractSdkParameters(input.bestApi.api_name, input.parameters);
      const response = await withTimeout(executeSDKMethod(input.bestApi.api_name, sdkParams), 5000); // 5 seconds timeout
      return { response };
    } catch (error) {
      console.error("SDK request failed:", error)
      return {
        response: {
          data: []
        } as TracksResponse
      };
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
);

// Helper function to extract only the parameters needed for each SDK method
function extractSdkParameters(apiName: string, params: Record<string, any>): Record<string, any> {
  switch(apiName) {
    // Track endpoints
    case 'Get Trending Tracks':
      return {
        time: "allTime",
        limit: params.limit || 10
      };
    case 'Get Track':
      return {
        trackId: params.entityName
      };
    case 'Search Tracks':
      return {
        query: params.query
      };
    case 'Get Track Comments':
      return {
        trackId: params.entityName
      };
    case 'Get Track Stems':
      return {
        trackId: params.entityName
      };

    // Playlist endpoints
    case 'Get Trending Playlists':
      return {
        time: "allTime",
        limit: params.limit || 10
      };
    case 'Get Playlist':
      return {
        playlistId: params.entityName
      };
    case 'Search Playlists':
      return {
        query: params.query
      };

    // User endpoints
    case 'Get User':
      return {
        userId: params.entityName
      };
    case 'Search Users':
      return {
        query: params.query
      };
    case 'Get User Reposts':
      return {
        userId: params.entityName
      };
    case 'Get User Favorites':
      return {
        userId: params.entityName
      };
    case 'Get User Followers':
      return {
        userId: params.entityName
      };
    case 'Get User Following':
      return {
        userId: params.entityName
      };

    default:
      throw new Error(`Unsupported API: ${apiName}`);
  }
}

// Helper function to map API names to SDK methods
async function executeSDKMethod(apiName: string, params: Record<string, any>): Promise<ApiResponse> {
    console.log(`\nExecuting ${apiName} with params:`, params);
    
    try {
        const sdk = await getAudiusSdk(); // This will now return the already-initialized instance
        if (!sdk) {
            throw new Error('SDK not initialized');
        }
        
        let response;
        switch(apiName) {
            case 'Get Trending Tracks':
                console.log("About to call getTrendingTracks");
                response = await sdk.tracks.getTrendingTracks(params);
                console.log("After getTrendingTracks call");
                return response;
                
            case 'Get Track':
                response = await sdk.tracks.getTrack(params.trackId);
                return response;
                
            case 'Search Tracks':
                response = await sdk.tracks.searchTracks(params);
                return response;
                
            case 'Get Track Comments':
                response = await sdk.tracks.trackComments(params.trackId);
                return response;
                
            case 'Get Track Stems':
                response = await sdk.tracks.getTrackStems(params.trackId);
                return response;

            // Playlist endpoints
            case 'Get Trending Playlists':
                response = await sdk.playlists.getTrendingPlaylists(params);
                return response;
                
            case 'Get Playlist':
                response = await sdk.playlists.getPlaylist(params.playlistId);
                return response;
                
            case 'Search Playlists':
                response = await sdk.playlists.searchPlaylists(params);
                return response;

            // User endpoints
            case 'Get User':
                return sdk.users.getUser(params.userId);
            case 'Search Users':
                return sdk.users.searchUsers(params);
            case 'Get User Reposts':
                return sdk.users.getReposts(params.userId);
            case 'Get User Favorites':
                return sdk.users.getFavorites(params.userId);
            case 'Get User Followers':
                return sdk.users.getFollowers(params.userId);
            case 'Get User Following':
                return sdk.users.getFollowing(params.userId);
                
            default:
                throw new Error(`Unsupported API: ${apiName}`);
        }
    } catch (error) {
        console.error(`SDK request failed for ${apiName}:`, (error as Error).message);
        return { data: [] };
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
      time?: GetTrendingTracksTimeEnum;
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
      time?: GetTrendingTracksTimeEnum;
      genre?: string;
      limit?: number;
    } = {
      entityName: null,
      query: input.query
    };

    // Add trending-specific parameters
    if (input.bestApi.api_name.toLowerCase().includes('trending')) {
      parameters.time = "allTime";
      parameters.limit = 10;
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
  const { bestApi, parameters } = input;
  
  if (!bestApi?.required_parameters) {
    throw new Error("No API selected");
  }

  const required = bestApi.required_parameters.map((p: { name: string }) => p.name);
  
  // If no required parameters, proceed
  if (required.length === 0) {
    return Promise.resolve("execute_request_node");
  }

  // Check required parameters
  const missing = required.filter((p: string) => !parameters?.[p]);
  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(", ")}`);
  }

  return Promise.resolve("execute_request_node");
}

// Replace selectHostTool with SDK initialization check
export const initSdkTool = tool(
  async (): Promise<{ initialized: boolean }> => {
    try {
      const sdk = await getAudiusSdk();
      if (!sdk) {
        throw new Error("SDK not initialized");
      }
      // Only return initialized flag - the SDK is managed by sdkClient.ts
      return { initialized: true };
    } catch (error) {
      console.error("SDK initialization failed:", error);
      throw error;
    }
  },
  {
    name: "init_sdk",
    description: "Initializes and returns the Audius SDK instance",
    schema: z.object({})
  }
);

interface ApiTrack {
  title: string;
  user: {
    name: string;
  };
  play_count: number;    // API returns snake_case
  favorite_count: number;  // API returns snake_case
}

export const formatResponseTool = tool(
  async (input: { response: ApiResponse }): Promise<{ formattedResponse: string }> => {
    try {
      if (!input.response?.data) {
        throw new Error("No response data to format");
      }

      const tracks = (input.response as TracksResponse).data;
      const topTracks = tracks!.slice(0, 10);
      
      const formattedTracks = topTracks.map(rawTrack => ({
        title: rawTrack.title,
        artist: rawTrack.user.name,
        plays: (rawTrack as any).play_count,
        favorites: (rawTrack as any).favorite_count
      }));
      
      const formattedResponse = `Top 10 Trending Tracks on Audius:\n${
        formattedTracks.map((track, index) => 
          `${index + 1}. "${track.title}" by ${track.artist} (${track.plays.toLocaleString()} plays, ${track.favorites.toLocaleString()} favorites)`
        ).join('\n')
      }`;

      return { formattedResponse };
    } catch (error) {
      console.error("Format response failed:", error);
      throw error;
    }
  },
  {
    name: "format_response",
    description: "Formats the API response into a readable string",
    schema: z.object({
      response: z.custom<ApiResponse>()
    })
  }
);
