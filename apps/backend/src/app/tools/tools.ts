import { getAudiusSdk } from '../services/sdkClient.js'
import { tool } from "@langchain/core/tools";
import { z } from "zod"
import { GraphState, 
  DatasetSchema, 
  ComplexityLevel, 
  EntityType, 
  AudiusCorpus,
  SearchFullResponse,
  GetFavoritesRequest,
  ApiEndpoint,
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
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { TrackSDKMethods } from "../services/entity_methods/tracks/trackSDKMethods.js";
import { UserSDKMethods } from "../services/entity_methods/users/userSDKMethods.js";
import { PlaylistSDKMethods } from "../services/entity_methods/playlists/playlistSDKMethods.js";
import { analyzeQuery } from './utils/queryAnalysis.js';
import dotenv from 'dotenv';
import { calculateArtistPopularity } from './utils/calculateArtistPopularity.js';
import { calculateGenrePopularity } from './utils/calculateGenrePopularity.js';
import { extractGenreFromQuery } from './utils/extractGenre.js';

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

// At the top of the file where types are defined
type QueryType = 
  | 'trending_tracks'
  | 'trending_playlists'
  | 'trending_artists'
  | 'artists_by_genre'
  | 'top_artists'
  | 'genre_info'
  | 'genre_popularity'
  | 'general'
  | 'tracks'
  | 'users'
  | 'playlists';

/**
 * Selects the appropriate SDK function based on the user's query.
 */
export const selectApiTool = tool(
  async (input: { 
    categories: string[];
    entityType: EntityType | null;
    queryType: QueryType;
    isTrendingQuery: boolean;
    isGenreQuery: boolean;
  }): Promise<{
    bestApi: DatasetSchema;
    queryType: QueryType;
    entityType: EntityType | null;
  }> => {
    try {
      // Only use genre popularity calculation for trending genre queries
      if (input.isTrendingQuery && input.isGenreQuery && !input.entityType) {
        return {
          bestApi: {
            id: 'calculate_genre_popularity',
            api_name: 'Calculate Genre Popularity',
            category_name: 'Genres',
            tool_name: 'Genre Popularity Calculator',
            api_description: 'Calculates genre popularity based on trending tracks',
            required_parameters: [],
            optional_parameters: [],
            method: 'GET',
            api_url: 'custom/genre-popularity',
            description: 'Custom calculation for genre popularity',
            parameters: {
              required: [],
              optional: ['time', 'limit']
            },
            endpoint: 'custom/genre-popularity',
            template_response: {
              data: []
            }
          } as DatasetSchema,
          queryType: 'genre_popularity',
          entityType: null
        };
      }

      // Special handling for trending artists
      if (input.queryType === 'trending_artists') {
        return {
          bestApi: {
            id: 'calculate_trending_artists',
            api_name: 'Calculate Trending Artists',
            category_name: 'Users',
            tool_name: 'Artist Popularity Calculator',
            api_description: 'Calculates trending artists based on recent track performance',
            required_parameters: [],
            optional_parameters: [],
            method: 'GET',
            api_url: 'custom/trending-artists',
            description: 'Custom calculation for trending artists',
            parameters: {
              required: [],
              optional: ['time', 'limit']
            },
            endpoint: 'custom/trending-artists',
            template_response: {
              data: []
            }
          } as DatasetSchema,
          queryType: input.queryType,
          entityType: 'user'
        };
      }

      const rawData = fs.readFileSync(TRIMMED_CORPUS_PATH, 'utf-8');
      const corpus: AudiusCorpus = JSON.parse(rawData);
      
      // Filter APIs by query type and category
      const apis = corpus.endpoints.filter((endpoint: ApiEndpoint) => {
        // For trending queries - handle playlists separately
        if (input.queryType === 'trending_playlists') {
          return endpoint.api_name === 'Get Trending Playlists';
        }
        if (input.queryType === 'trending_tracks') {
          return endpoint.api_name === 'Get Trending Tracks';
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
        bestApi: {
          ...selectedApi,
          description: selectedApi.api_description,
          parameters: {
            required: selectedApi.required_parameters.map(p => p.name),
            optional: selectedApi.optional_parameters.map(p => p.name)
          },
          endpoint: selectedApi.api_url
        } as DatasetSchema,
        queryType: input.queryType,
        entityType: input.entityType
      };

    } catch (err: unknown) {
      throw err;
    }
  },
  {
    name: "select_api",
    description: "Selects appropriate API based on query type and categories",
    schema: z.object({
      categories: z.array(z.string()),
      entityType: z.enum(['track', 'user', 'playlist']).nullable(),
      queryType: z.enum([
        'trending_tracks',
        'trending_playlists',
        'trending_artists',
        'artists_by_genre',
        'top_artists',
        'genre_info',
        'genre_popularity',
        'general',
        'tracks',
        'users',
        'playlists'
      ]),
      isTrendingQuery: z.boolean(),
      isGenreQuery: z.boolean()
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
    // Get base analysis
    const analysis = analyzeQuery(input.query);

    // Early return for non-Audius queries
    if (!analysis.isAudiusRelated) {
      return {
        queryType: 'general',
        entityType: null,
        isEntityQuery: false,
        complexity: 'simple',
        categories: ['General']
      };
    }

    // Determine if this needs custom calculations
    const needsCustomCalc = 
      (analysis.entityType === 'user' && input.query.toLowerCase().includes('trending')) ||
      (analysis.entityType === 'user' && input.query.toLowerCase().includes('popular')) ||
      (analysis.highLevelCategory === 'GENRE' && input.query.toLowerCase().includes('popular')) ||
      (input.query.toLowerCase().includes('most played'));

    // Determine complexity
    let complexity: ComplexityLevel;
    if (needsCustomCalc) {
      complexity = 'moderate';
    } else if (analysis.confidence < 0.7) {
      complexity = 'moderate';
    } else {
      complexity = 'simple';
    }

    // Map high-level category to query type
    let queryType: QueryType = 'general';
    
    if (analysis.highLevelCategory) {
      switch (analysis.highLevelCategory) {
        case 'TRENDING':
          queryType = analysis.entityType === 'user' ? 'trending_artists' :
                     analysis.entityType === 'playlist' ? 'trending_playlists' :
                     'trending_tracks';
          break;
        case 'SEARCH':
          queryType = analysis.entityType === 'user' ? 'users' :
                     analysis.entityType === 'playlist' ? 'playlists' :
                     'tracks';
          break;
        case 'GENRE':
          queryType = needsCustomCalc ? 'genre_popularity' : 'genre_info';
          break;
        case 'USER':
          queryType = needsCustomCalc ? 'trending_artists' : 'users';
          break;
        case 'PLAYLIST':
          queryType = 'trending_playlists';
          break;
        default:
          queryType = 'general';
      }
    }

    // Get available endpoints based on query type and complexity
    const endpoints = getAvailableEndpoints(queryType, needsCustomCalc);

    return {
      queryType,
      entityType: analysis.entityType,
      isEntityQuery: analysis.entityType !== null,
      complexity,
      categories: endpoints
    };
  },
  {
    name: "extract_category",
    description: "Extracts category and query information from user input",
    schema: z.object({
      query: z.string()
    })
  }
);

// Helper function to get available endpoints
function getAvailableEndpoints(queryType: QueryType, needsCustomCalc: boolean): string[] {
  if (needsCustomCalc) {
    switch (queryType) {
      case 'trending_artists':
        return ['Calculate Trending Artists'];
      case 'genre_popularity':
        return ['Calculate Genre Popularity'];
      default:
        return ['General'];
    }
  }

  // Standard endpoint mapping
  const endpointMap: Record<QueryType, string[]> = {
    'trending_tracks': ['Get Trending Tracks'],
    'trending_playlists': ['Get Trending Playlists'],
    'trending_artists': ['Calculate Trending Artists'],
    'artists_by_genre': ['Get Tracks by Genre'],
    'top_artists': ['Calculate Trending Artists'],
    'genre_info': ['Get Tracks by Genre'],
    'genre_popularity': ['Calculate Genre Popularity'],
    'tracks': ['Search Tracks', 'Get Track'],
    'users': ['Search Users', 'Get User'],
    'playlists': ['Search Playlists', 'Get Playlist'],
    'general': ['Tavily Search API']
  };

  return endpointMap[queryType] || ['General'];
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

// Helper function to map API names to SDK methods
async function executeSDKMethod(apiName: string, parameters: Record<string, any>): Promise<ApiResponse> {
  const sdk = await getAudiusSdk();
  const trackMethods = new TrackSDKMethods(BASE_URL, process.env.AUDIUS_API_KEY!);
  const userMethods = new UserSDKMethods(BASE_URL, process.env.AUDIUS_API_KEY!);
  const playlistMethods = new PlaylistSDKMethods(BASE_URL, process.env.AUDIUS_API_KEY!);

  console.log('Executing SDK method for:', apiName);
  console.log('With parameters:', parameters);

  try {
    // Handle custom calculation cases
    if (apiName === 'Calculate Trending Artists') {
      const recentTracks = await trackMethods.getTrendingTracks({
        time: 'month',
        limit: 100
      });

      if (!recentTracks.data) {
        throw new Error('No track data available for artist popularity calculation');
      }

      const artistRankings = await calculateArtistPopularity(recentTracks.data);

      // Just return the rankings directly with a data property to match ApiResponse shape
      return {
        data: artistRankings.map(artist => ({
          name: artist.name,
          trackCount: artist.trackCount,
          totalPlays: artist.totalPlays,
          totalFavorites: artist.totalFavorites,
          points: artist.points,
          topTrack: artist.topTrack
        }))
      } as unknown as ApiResponse;
    }

    if (apiName === 'Calculate Genre Popularity') {
      const recentTracks = await trackMethods.getTrendingTracks({
        time: 'month',
        limit: 100
      });

      if (!recentTracks.data) {
        throw new Error('No track data available for genre popularity calculation');
      }

      const genreRankings = await calculateGenrePopularity(recentTracks.data);

      // Return with all required ApiResponse fields
      return {
        data: genreRankings.map(genre => ({
          name: genre.name,
          trackCount: genre.trackCount,
          totalPlays: genre.totalPlays,
          totalFavorites: genre.totalFavorites,
          points: genre.points,
          topTrack: genre.topTrack
        })),
        latest_chain_block: 0,
        latest_chain_slot_plays: 0,
        latest_indexed_block: 0,
        latest_indexed_slot_plays: 0,
        signature: '',
        timestamp: Date.now(),
        version: '1.0.0'
      } as unknown as ApiResponse;  // Double type assertion to handle custom fields
    }

    // Handle standard API calls
    switch(apiName) {
      case 'Get Trending Tracks':
        const genre = extractGenreFromQuery(parameters.query);
        if (genre) {
          return await trackMethods.getTrendingTracks({
            ...parameters,
            genre
          });
        }
        // Default case - no genre filter
        return await trackMethods.getTrendingTracks(parameters);
      case 'Get Trending Playlists':
        return await playlistMethods.getTrendingPlaylists(parameters);
      case 'Search Users':
        return await userMethods.searchUsers(parameters.query);
      // ... other cases ...
      default:
        return { data: [] } as ApiResponse;
    }
  } catch (error) {
    console.error(`SDK request failed for ${apiName}:`, error);
    throw error;
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
    description: "Extract parameters from user query based on API requirements",
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
        api_url: z.string(),
        description: z.string(),
        parameters: z.object({
          required: z.array(z.string()),
          optional: z.array(z.string())
        }),
        endpoint: z.string(),
        template_response: z.object({
          data: z.any()
        })
      }).transform((data): DatasetSchema => ({
        ...data,
        description: data.api_description,
        parameters: {
          required: data.required_parameters.map(p => p.name),
          optional: data.optional_parameters.map(p => p.name)
        },
        endpoint: data.api_url,
        template_response: {
          data: data.template_response?.data || null // Ensure data is always present
        }
      }))
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
  play_count: number;
  favorite_count: number;
}

interface ApiPlaylist {
  playlist_name: string;
  user: {
    name: string;
  };
  track_count: number;
  total_play_count: number;
}

// Replace createFormatResponseTool with a proper tool wrapper
export const formatResponseTool = tool(
  async (input: { response: { data: any[] } }): Promise<{ formattedResponse: string }> => {
    try {
      const items = input.response.data;
      
      if (!items || items.length === 0) {
        throw new Error('No items in response data');
      }

      // Check what type of data we're dealing with
      const isPlaylist = 'playlist_name' in items[0];
      const isArtist = 'points' in items[0];
      
      const formatted = items
        .slice(0, 10)
        .map((item, index) => {
          if (isPlaylist) {
            const playlist = item as ApiPlaylist;
            const totalPlays = playlist.total_play_count.toLocaleString();
            return `${index + 1}. "${playlist.playlist_name}" by ${playlist.user.name} (${playlist.track_count} tracks, ${totalPlays} total plays)`;
          } else if (isArtist) {
            const artist = item as {
              name: string;
              trackCount: number;
              totalPlays: number;
              totalFavorites: number;
              points: number;
            };
            
            const plays = artist.totalPlays?.toLocaleString() || '0';
            const favorites = artist.totalFavorites?.toLocaleString() || '0';
            
            return `${index + 1}. ${artist.name} (${artist.trackCount} tracks, ${plays} plays this month, ${favorites} favorites)`;
          } else {
            // Default track handling
            const track = item as ApiTrack;
            const plays = track.play_count.toLocaleString();
            const favorites = track.favorite_count.toLocaleString();
            return `${index + 1}. "${track.title}" by ${track.user.name} (${plays} plays, ${favorites} favorites)`;
          }
        })
        .join('\n');

      return {
        formattedResponse: formatted
      };
    } catch (error) {
      console.error('Error formatting response:', error);
      throw new Error(`Failed to format response: ${error}`);
    }
  },
  {
    name: "format_response",
    description: "Formats response data into readable text",
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
        new SystemMessage(systemPrompt),
        new HumanMessage(`Original query: "${input.query}"
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
