import { getAudiusSdk } from '../services/sdkClient.js'
import { tool } from "@langchain/core/tools"
import { z } from "zod"
import { GraphState, 
  DatasetSchema, 
  ComplexityLevel, 
  EntityType, 
  QueryType, 
  AudiusCorpus,
  GetTrendingTracksRequest,
  SearchFullResponse,
  GetFavoritesRequest,
} from "../types.js";
import fs from "fs";
import { TRIMMED_CORPUS_PATH, BASE_URL } from "../constants.js";
import { END } from "@langchain/langgraph";
import type { 
  TracksResponse, 
  GetTrendingTracksTimeEnum,
  UsersResponse,
  TrackResponse,
  UserResponse,
  PlaylistResponse,
  TrackCommentsResponse,
  StemsResponse,
  FavoritesResponse,
  TrendingPlaylistsResponse,
} from '@audius/sdk';
import { ChatOpenAI } from "langchain/chat_models/openai";
import { SystemChatMessage, HumanChatMessage } from "langchain/schema";
import { TrackSDKMethods } from "../services/entity_methods/tracks/trackSDKMethods.js";
import { UserSDKMethods } from "../services/entity_methods/users/userSDKMethods.js";
import { PlaylistSDKMethods } from "../services/entity_methods/playlists/playlistSDKMethods.js";
import dotenv from 'dotenv';

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
  | FavoritesResponse
  | TrackCommentsResponse
  | TrendingPlaylistsResponse
  | GetFavoritesRequest
  | SearchFullResponse;

// Update the EXTRACT_HIGH_LEVEL_CATEGORIES mapping with proper typing
const EXTRACT_HIGH_LEVEL_CATEGORIES: Record<string, ApiCategory> = {
  'Get Trending Tracks': 'Tracks',
  'Search Tracks': 'Tracks',
  'Get Track Comments': 'Tracks',
  'Get Track Stems': 'Tracks',
  'Get Track Favorites': 'Tracks',
  'Get Trending Playlists': 'Playlists',
  'Search Playlists': 'Playlists',
  'Search Users': 'Users',
  'Get User Followers': 'Users',
  'Get User Following': 'Users',
  'Get Genre Info': 'Tracks'  // Genre info comes from track endpoints
} as const;

const apiKey = dotenv.config().parsed?.AUDIUS_API_KEY;
const baseUrl = BASE_URL;

/**
 * Selects the appropriate SDK function based on the user's query.
 */
export const selectApiTool = tool(
  async (input: { 
    categories: string[];
    entityType: EntityType | null;
    queryType: QueryType;
  }): Promise<{
    bestApi: DatasetSchema;
    queryType: QueryType;
    entityType: EntityType | null;
  }> => {
    try {
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
      
      return {
        bestApi: selectedApi,
        queryType: input.queryType,
        entityType: input.entityType
      };

    } catch (err: unknown) {
      throw err;
    }
  },
  {
    name: "select_api",
    description: "Selects appropriate API based on query type",
    schema: z.object({
      categories: z.array(z.string()),
      entityType: z.enum(['track', 'user', 'playlist']).nullable(),
      queryType: z.enum(['trending_tracks', 'trending_playlists', 'tracks', 'users', 'playlists', 'genre_info', 'general'])
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
          return ['Search Tracks'];
        case 'users':
          if (query.includes('follower')) return ['Get User Followers'];
          if (query.includes('following')) return ['Get User Following'];
          if (query.includes('repost')) return ['Get User Reposts'];
          if (query.includes('favorite')) return ['Get User Favorites'];
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

/**
 * Tool to create and execute API fetch requests.
 */
export const createFetchRequestTool = tool(
  async (input: { 
    parameters: Record<string, any>;
    bestApi: { api_name: string };
  }): Promise<{ response: ApiResponse }> => {
    try {
      const sdk = await getAudiusSdk();
      const response = await executeSDKMethod(input.bestApi.api_name, input.parameters);
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

  const trackSDKMethods = new TrackSDKMethods(baseUrl, apiKey!);
  const playlistSDKMethods = new PlaylistSDKMethods(baseUrl, apiKey!);
  const userSDKMethods = new UserSDKMethods(baseUrl, apiKey!);

    try {
        const sdk = await getAudiusSdk();
        if (!sdk) {
            throw new Error('SDK not initialized');
        }
        
        let response;
        switch(apiName) {
            case 'Get Trending Tracks':
                response = await trackSDKMethods.getTrendingTracks({
                    time: params.time,
                    limit: params.limit
                });
                return response;
                
            case 'Get Track':
                response = await trackSDKMethods.getTrack(params.trackId);
                return response;
                
            case 'Search Tracks':
                response = await trackSDKMethods.searchTracks(params.query);
                return response;
                
            case 'Get Track Comments':
                response = await trackSDKMethods.getTrackComments(params.trackId);
                return response;
                
            case 'Get Track Stems':
                response = await trackSDKMethods.getTrackStems(params.trackId);
                return response;

            // Playlist endpoints
            case 'Get Trending Playlists':
                response = await playlistSDKMethods.getTrendingPlaylists(params);
                return response;
                
            case 'Get Playlist':
                response = await playlistSDKMethods.getPlaylist(params.playlistId);
                return response;
                
            case 'Search Playlists':
                response = await playlistSDKMethods.searchPlaylists(params.query);
                return response;

            // User endpoints
            case 'Get User':
                return userSDKMethods.getUser(params.userId);
            case 'Search Users':
                return userSDKMethods.searchUsers(params.query);
            case 'Get User Favorites':
                return userSDKMethods.getFavoritesRequest(params.userId);
            case 'Get User Followers':
                return userSDKMethods.getUserFollowers(params.userId);
            case 'Get User Following':
                return userSDKMethods.getUserFollowings(params.userId);
                
            default:
                throw new Error(`Unsupported API: ${apiName}`);
        }
    } catch (error) {
        console.error(`SDK request failed for ${apiName}:`, error);
        return { data: [] };
    }
}
  
export const resetState = tool(
  async (input: Record<string, any>): Promise<Partial<GraphState>> => {
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
      secondaryApi: null,
      secondaryResponse: null,
      formattedResponse: null,
      messages: null,
      initialized: false,
      sdkInitialized: false,
      sdkConfig: {
        apiKey: apiKey!,
        baseUrl: baseUrl!,
        initialized: false
      }
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

    if (input.bestApi.api_name.toLowerCase().includes('trending')) {
      parameters.time = "week";
      parameters.limit = 10;
    }

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

// Replace createFormatResponseTool with a proper tool wrapper
export const formatResponseTool = tool(
  async (input: { response: { data: any[] } }): Promise<{ formattedResponse: string }> => {
    try {
      const tracks = input.response.data;
      const structured = tracks
        .slice(0, 10)
        .map((track, index) => {
          const plays = track.play_count.toLocaleString();
          const favorites = track.favorite_count.toLocaleString();
          return `${index + 1}. "${track.title}" by ${track.user.name} (${plays} plays, ${favorites} favorites)`;
        })
        .join("\n");

      return { formattedResponse: structured };
    } catch (error) {
      throw new Error(`Failed to format response: ${error}`);
    }
  },
  {
    name: "format_response",
    description: "Formats track data into a structured string format",
    schema: z.object({
      response: z.object({
        data: z.array(z.any())
      })
    })
  }
);

export const enhanceResponseTool = tool(
  async (input: { 
    formatted: string;
    query: string;
  }): Promise<{ enhanced: string }> => {
    try {
      const systemPrompt = `You are a helpful assistant that enhances formatted data responses into natural language.
Key guidelines:
- Keep the core information intact
- Add natural language context
- Maintain a friendly, informative tone
- Reference the user's original query
- Keep responses concise but complete`;

      // Create a new LLM instance for this enhancement
      const llm = new ChatOpenAI({
        modelName: 'gpt-3.5-turbo',
        temperature: 0.1,
      });

      const messages = [
        new SystemChatMessage(systemPrompt),
        new HumanChatMessage(`Original query: "${input.query}"
Formatted data:
${input.formatted}

Please enhance this into a natural language response.`)
      ];

      const aiResponse = await llm.call(messages);
      return { enhanced: aiResponse.text };
    } catch (error) {
      throw new Error(`Failed to enhance response: ${error}`);
    }
  },
  {
    name: "enhance_response",
    description: "Enhances structured data with natural language context",
    schema: z.object({
      formatted: z.string(),
      query: z.string()
    })
  }
);
