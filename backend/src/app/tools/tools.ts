import { StructuredTool, StructuredToolInterface, tool } from "@langchain/core/tools";
import { RunnableToolLike } from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { GraphState, DatasetSchema, DatasetParameters, ComplexityLevel, EntityType, QueryType, AudiusCorpus } from "../types.js";
import { apiLogger, stateLogger, logStateTransition } from "../logger.js";
import * as readline from "readline";
import { findMissingParams } from "../utils.js";
import fs from "fs";
import { HIGH_LEVEL_CATEGORY_MAPPING, TRIMMED_CORPUS_PATH } from "../constants.js";
import { sdk } from '../sdkClient.js';
import { Track, User, Playlist } from '@audius/sdk';
import nlp from "compromise";
import { 
  isTrackProperty, 
  isUserProperty, 
  isPlaylistProperty,
  TrackData,
  UserData,
  PlaylistData
} from '../types.js';
import { ChatOpenAI } from "langchain/chat_models/openai";
import { END } from "@langchain/langgraph";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { SystemChatMessage, HumanChatMessage, BaseChatMessage } from "langchain/schema";
import { extractCategoryValidation } from "../validation/toolValidations.js";
import { validateStateTransition, validateLLMResponse } from "../validation/index.js";

// Define StateUpdate type using StateType
type StateUpdate = {
  type: "update";
  key: string[];
  value: any;
};

// Move to top after imports
export const GraphStateSchema = z.object({
  queryType: z.enum(['general', 'trending_tracks']),
  entityType: z.enum(['track', 'user', 'playlist']).nullable(),
  isEntityQuery: z.boolean(),
  complexity: z.enum(['simple', 'moderate', 'complex']),
  parameters: z.record(z.string(), z.any()).optional(),
  bestApi: z.any().optional(),
  response: z.any().optional(),
  error: z.any().optional()
});

// Now let's try the exactMatchTool with unknown state
export const exactMatchTool = tool(
  async (input: { state: unknown }): Promise<Partial<GraphState>> => {
    const state = input.state as Partial<GraphState>;
    return {
      queryType: 'general',
      entityType: null,
      isEntityQuery: false,
      complexity: 'simple'
    };
  },
  {
    name: "exact_match_tool",
    description: "Tool matching LangGraph's expected types",
    schema: z.object({
      state: GraphStateSchema.partial()
    })
  }
);

// Add at the top of tools.ts, after imports
export const minimalTool = tool(
  async (input: string): Promise<string> => {
    console.log("Minimal tool received input:", input);
    return `Processed: ${input}`;
  },
  {
    name: "minimal_tool",
    description: "Minimal test tool",
    schema: z.string()
  }
);

// Add after minimalTool
export const minimalStateTool = tool(
  async (input: { text: string }): Promise<{ processed: string }> => {
    console.log("Minimal state tool received input:", input);
    return { processed: `Processed: ${input.text}` };
  },
  {
    name: "minimal_state_tool",
    description: "Minimal tool with state structure",
    schema: z.object({
      text: z.string()
    })
  }
);

// Add after minimalStateTool
export const nestedStateTool = tool(
  async (input: { state: { text: string } }): Promise<{ state: { processed: string } }> => {
    console.log("Nested state tool received input:", input);
    return { state: { processed: `Processed: ${input.state.text}` } };
  },
  {
    name: "nested_state_tool",
    description: "Tool with nested state structure",
    schema: z.object({
      state: z.object({
        text: z.string()
      })
    })
  }
);

// Add after nestedStateTool
export const graphStateTool = tool(
  async (input: { state: Partial<GraphState> }): Promise<Partial<GraphState>> => {
    console.log("Graph state tool received input:", input);
    return {
      queryType: 'general',
      entityType: null,
      isEntityQuery: false,
      complexity: 'simple'
    };
  },
  {
    name: "graph_state_tool",
    description: "Tool with GraphState structure",
    schema: z.object({
      state: z.object({
        queryType: z.enum(['general', 'trending_tracks']).optional(),
        entityType: z.enum(['track', 'user', 'playlist']).nullable(),
        isEntityQuery: z.boolean().optional(),
        complexity: z.enum(['simple', 'moderate', 'complex']).optional()
      }).partial()
    })
  }
);

// Add after graphStateTool
export const alignedGraphStateTool = tool(
  async (input: { state: Partial<GraphState> }): Promise<Partial<GraphState>> => {
    console.log("Aligned graph state tool received input:", input);
    return {
      queryType: 'general',
      entityType: null,
      isEntityQuery: false,
      complexity: 'simple'
    };
  },
  {
    name: "aligned_graph_state_tool",
    description: "Tool with exactly aligned GraphState schema",
    schema: z.object({
      state: GraphStateSchema.partial()
    })
  }
);

// Map words to properties
const wordToPropertyMap: Record<string, string> = {
  'play': 'playCount',
  'plays': 'playCount',
  'follower': 'followerCount',
  'followers': 'followerCount',
  'song': 'trackCount',
  'songs': 'trackCount',
  'track': 'trackCount',
  'tracks': 'trackCount',
  'genre': 'genre',
  'duration': 'duration',
  'comment': 'commentCount',
  'comments': 'commentCount',
  'repost': 'repostCount',
  'reposts': 'repostCount',
  'favorite': 'favoriteCount',
  'favorites': 'favoriteCount',
  'verify': 'isVerified',
  'verified': 'isVerified',
};

// Define a mapping of keywords to their corresponding EntityType
const keywordToEntityType: Record<string, EntityType> = {
  'playlist': 'playlist',  // Move playlist first to take precedence
  'playlists': 'playlist',
  'play': 'track',
  'plays': 'track',
  'follower': 'user',
  'followers': 'user',
  'song': 'track',
  'songs': 'track',
  'track': 'track',
  'tracks': 'track',
  'genre': null,
  'genres': null,
  'repost': 'track',
  'reposts': 'track',
  'favorite': 'track',
  'favorites': 'track',
  'verify': 'user',
  'verified': 'user',
};  

// Add state normalization helper
const normalizeState = (state: Partial<GraphState>): Partial<GraphState> => {
  return {
    ...state,
    parameters: state.parameters || {},
    queryType: state.queryType || 'general',
    entityType: state.entityType || null,
  };
};

/**
 * Selects the appropriate SDK function based on the user's query.
 *
 * @param {object} input - The input object containing state information.
 * @returns {Promise<Partial<GraphState>>} - The updated graph state.
 */
export const selectApiTool = tool(
  async (input: { apis: DatasetSchema[] }): Promise<{
    bestApi: DatasetSchema;
  }> => {
    try {
      console.log("\n=== selectApiTool Processing ===");
      console.log("Available APIs:", input.apis.map(api => ({
        name: api.api_name,
        url: api.api_url,
        category: api.category_name,
        parameters: api.required_parameters.length
      })));

      // Select API based on:
      // 1. Prefer regular trending over underground for general trending queries
      // 2. Fewer required parameters (simpler is better)
      // 3. More specific endpoint (deeper path)
      const selectedApi = input.apis.sort((a, b) => {
        // First, handle trending tracks preference
        if (a.api_name.includes('Trending') && b.api_name.includes('Trending')) {
          if (a.api_name.includes('Underground')) return 1;
          if (b.api_name.includes('Underground')) return -1;
          return 0;
        }
        
        // Then, prefer exact matches over search
        if (a.api_name.includes('Search') && !b.api_name.includes('Search')) return 1;
        if (!a.api_name.includes('Search') && b.api_name.includes('Search')) return -1;
        
        // Then, sort by number of required parameters
        const paramDiff = a.required_parameters.length - b.required_parameters.length;
        if (paramDiff !== 0) return paramDiff;
        
        // Finally, prefer more specific paths
        return b.api_url.split('/').length - a.api_url.split('/').length;
      })[0];
      
      console.log("Selected API:", {
        name: selectedApi.api_name,
        url: selectedApi.api_url,
        category: selectedApi.category_name,
        parameters: selectedApi.required_parameters
      });

      return {
        bestApi: selectedApi
      };
    } catch (error) {
      console.error("Error in selectApiTool:", error);
      throw error;
    }
  },
  {
    name: "select_api",
    description: "Selects the most appropriate API from available options",
    schema: z.object({
      apis: z.array(z.any())
    })
  }
);


// READ/PARSE USER INPUT -> EXTRACT PARAMS -> REQUEST PARAMS

/**
 * Format for user input: <name>,<value>:::<name>,<value>
 */
const paramsFormat = `<name>,<value>:::<name>,<value>`;

/**
 * Parses user input from the format <name>,<value>:::<name>,<value>
 * @param input The user input string
 * @returns Record<string, string> of parameter names and values
 */
function parseUserInput(input: string): Record<string, string> {
  try {
    // Split on the separator
    const pairs = input.split(':::');
    
    // Create object from pairs
    const result: Record<string, string> = {};
    for (const pair of pairs) {
      const [name, value] = pair.split(',').map(s => s.trim());
      if (!name || !value) {
        throw new Error(`Invalid parameter pair: ${pair}`);
      }
      result[name] = value;
    }
    
    return result;
  } catch (e) {
    throw new Error(`Failed to parse user input: ${input}. Expected format: ${paramsFormat}`);
  }
}

/**
 * Tool to read user input from the command line.
 *
 * Prompts the user to provide missing parameters in a specific format.
 */
export const readUserInputTool = tool(
  async (input: { missingParams: { name: string; description: string; }[] }): Promise<StateUpdate> => {
    try {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const missingParamsString = input.missingParams
        .map((param: { name: string; description: string }) => 
          `Name: ${param.name}, Description: ${param.description}`
        )
        .join("\n----\n");

      const question = `LangTool couldn't find all the required params for the API.\nMissing params:\n${missingParamsString}\nPlease provide the missing params in the following format:\n<name>,<value>:::<name>,<value>\n`;

      apiLogger.debug(`Prompting user for input: ${question}`);

      const answer: string = await new Promise<string>((resolve) => {
        rl.question(question, (response) => {
          rl.close();
          resolve(response);
        });
      });

      apiLogger.debug(`User provided input: ${answer}`);

      return {
        type: "update",
        key: ["parameters"],
        value: parseUserInput(answer)
      };
    } catch (e: any) {
      apiLogger.error('Error in readUserInputTool:', e);
      return {
        type: "update",
        key: ["error"],
        value: {
          code: "USER_INPUT_ERROR",
          message: e.message,
          timestamp: Date.now(),
          node: "readUserInputTool"
        }
      };
    }
  },
  {
    name: "read_user_input",
    description: "Prompts the user to provide missing API parameters in the format <name>,<value>:::<name>,<value>.",
    schema: z.object({
      missingParams: z.array(
        z.object({
          name: z.string(),
          description: z.string()
        })
      )
    }).strict()
  }
);

/**
 * Categorizes the user's query to determine its type and complexity.
 */
export const CategorizeQueryTool = tool(
  async ({ state }: { state: { query: string } }): Promise<Partial<GraphState>> => {
    let normalizedQuery = state.query.toLowerCase().trim();

    // Expand contractions as needed
    const contractions: Record<string, string> = {
      "what's": "what is",
      "where's": "where is",
      "when's": "when is",
      "who's": "who is",
      "how's": "how is",
      "that's": "that is",
      "there's": "there is",
      "here's": "here is",
      "it's": "it is",
      "isn't": "is not",
      "aren't": "are not",
      "wasn't": "was not",
      "weren't": "were not",
      "haven't": "have not",
      "hasn't": "has not",
      "hadn't": "had not",
      // Add more contractions as needed
    };
  
    Object.keys(contractions).forEach((contraction) => {
      const regex = new RegExp(`\\b${contraction}\\b`, 'gi');
      normalizedQuery = normalizedQuery.replace(regex, contractions[contraction]);
    });
  
    const doc = nlp(normalizedQuery);
    apiLogger.debug(`Processing query: "${normalizedQuery}"`);

    // Extract action keywords to determine entityType
    let mappedEntityType: EntityType | null = null;
    for (const [keyword, type] of Object.entries(keywordToEntityType)) {
      if (normalizedQuery.includes(keyword)) {
        mappedEntityType = type;
        apiLogger.debug(`Keyword "${keyword}" mapped to EntityType "${type}"`);
        break; // Assign the first matching entityType
      }
    }

    apiLogger.debug(`Mapped Entity Type: ${mappedEntityType}`);

    // Default categorization for trending tracks
    if (/trending|popular|top tracks/i.test(normalizedQuery)) {
      return {
        queryType: 'trending_tracks' as QueryType,
        isEntityQuery: false,
        entityType: 'track',
        entityName: null,
        complexity: 'simple' as ComplexityLevel,
      };
    }

    // Final default return
    return {
      queryType: 'general' as QueryType,
      entityType: mappedEntityType,
      isEntityQuery: mappedEntityType !== null,
      complexity: 'simple' as ComplexityLevel,
      entityName: null,
    };
  },
  {
    name: "categorize_query",
    description: "Categorizes the user's query to determine its type and complexity.",
    schema: z.object({
      state: z.object({
        query: z.string().describe("The user's query string to classify")
      }).strict()
    }).strict()
  }
);


export const extractCategoryTool = tool(
  async (input: { query: string, llm: ChatOpenAI }): Promise<Partial<GraphState>> => {
    // Validate input
    extractCategoryValidation.input.parse(input);

    // Track previous state for validation
    const prevState = {} as GraphState; // Get this from context

    // Process with LLM if needed
    const messages: BaseChatMessage[] = [
      new SystemChatMessage("You are analyzing a query..."),
      new HumanChatMessage(input.query)
    ];

    const response = await input.llm.call(messages);
    
    // Validate LLM response
    const analysis = validateLLMResponse(
      JSON.parse(response.text),
      extractCategoryValidation.llmUsage!.validation,
      "extractCategory LLM response"
    );

    const nextState = {
      queryType: analysis.queryType,
      entityType: analysis.entityType,
      isEntityQuery: analysis.entityType !== null,
      complexity: analysis.complexity
    };

    // Validate state transition
    validateStateTransition(
      prevState,
      nextState as GraphState,
      "extractCategory",
      extractCategoryValidation
    );

    return nextState;
  },
  {
    name: extractCategoryValidation.name,
    description: "Analyzes a query to determine its type and entity",
    schema: extractCategoryValidation.input
  }
);

/**
 * Searches for the track using the combined track title and artist name query.
 *
 * @param {GraphState} state - The current state of the graph.
 * @returns {Promise<Partial<GraphState>>} - The updated graph state with the track ID and details.
 */
export const searchEntityTool = tool(
  async ({ parameters }: { parameters?: { trackTitle: string; artistName?: string | null; track_id?: string } }): Promise<Partial<GraphState>> => {
    const trackTitle = parameters?.trackTitle;
    const artistName = parameters?.artistName;
    const track_id = parameters?.track_id || '';

    console.log('searchEntity received parameters:', parameters);

    if (!trackTitle) {
      throw new Error('Track title is required to search for a track.');
    }

    try {
      const response = await sdk.tracks.searchTracks({ query: trackTitle });
      const tracks: Track[] = response.data!;

      if (!tracks || tracks.length === 0) {
        throw new Error(`No tracks found for title "${trackTitle}".`);
      }

      let track = tracks[0];

      if (artistName) { // artistName could be null, which is falsy
        const lowerArtistName = artistName.toLowerCase();
        const matchingTracks = tracks.filter((t) => {
          const userName = t.user?.name?.toLowerCase();
          const userHandle = t.user?.handle?.toLowerCase();
          return userName === lowerArtistName || userHandle === lowerArtistName;
        });

        if (matchingTracks.length > 0) {
          track = matchingTracks[0];
        } else {
          throw new Error(`No tracks found for title "${trackTitle}" by artist "${artistName}".`);
        }
      }

      return {
        parameters: {
          ...parameters,
          track_id: track.id,
        },
      };
    } catch (error) {
      console.error('Error in searchEntity:', error);
      throw error;
    }
  },
  {
    name: "search_entity",
    description: "Searches for a track using the title and optional artist name",
    schema: z.object({
      parameters: z.object({
        trackTitle: z.string().describe("The title of the track to search for"),
        artistName: z.string().optional().nullable().describe("The name of the artist"),
        track_id: z.string().optional().describe("The ID of the found track")
      }).optional()
    }).passthrough(), // Allow additional properties
  }
);

/**
 * Factory function to create the SelectAPITool.
 *
 * @param {DatasetSchema[]} apis - The list of available APIs.
 * @param {string} query - The user's query.
 * @returns {StructuredToolInterface | RunnableToolLike} - An instance of the SelectAPITool.
 */
export function createSelectAPITool(apis: DatasetSchema[], query: string): StructuredTool | RunnableToolLike {
  const description = `Given the following query by a user, select the API which will best serve the query.
Note: For trending tracks queries, use "Get Underground Trending Tracks" only if the query specifically mentions underground tracks. Otherwise, use "Get Trending Tracks".

Query: ${query}

APIs:
${apis
    .map(
      (api) => `Tool name: ${api.tool_name}
API Name: ${api.api_name}
Description: ${api.api_description}
Parameters: ${[...api.required_parameters, ...api.optional_parameters]
          .map((p) => `Name: ${p.name}, Description: ${p.description}`)
          .join("\n")}`
    )
    .join("\n---\n")}`;

  const schema = z.object({
    api: z
      .enum(apis.map((api) => api.api_name) as [string, ...string[]])
      .describe("The name of the API which best matches the query."),
  });

  return tool(
    async (input: { api: string }): Promise<Partial<GraphState>> => {
      const { api: apiName } = input;
      const bestApi = apis.find((a) => a.api_name === apiName);
      
      // Override for trending tracks
      if (apiName === "Get Underground Trending Tracks" && 
          !query.toLowerCase().includes('underground')) {
        const regularTrendingApi = apis.find(a => a.api_name === "Get Trending Tracks");
        if (regularTrendingApi) {
          return { bestApi: regularTrendingApi };
        }
      }

      if (!bestApi) {
        throw new Error(
          `API ${apiName} not found in the list of available APIs: ${apis
            .map((a) => a.api_name)
            .join(", ")}`
        );
      }
      return {
        bestApi,
      };
    },
    {
      name: "select_api",
      description,
      schema,
    }
  );
}

/**
 * Tool to create and execute API fetch requests based on `bestApi` and `parameters`, including response formatting.
 *
 * @param {object} input - The input object containing `bestApi`, `queryType`, and `parameters`.
 * @returns {Promise<Partial<GraphState>>} - The updated graph state.
 */
export const createFetchRequestTool = tool(
  async (input: Record<string, any>): Promise<Partial<GraphState>> => {
    console.log("\n=== createFetchRequestTool Input ===");
    console.log("Raw input:", JSON.stringify(input, null, 2));
    console.log("Input shape validation:");
    console.log("- bestApi present:", !!input.bestApi);
    console.log("- bestApi.api_name:", input.bestApi?.api_name);
    console.log("- queryType:", input.queryType);
    console.log("- parameters shape:", JSON.stringify(input.parameters, null, 2));
    console.log("- entityType:", input.entityType);

    logStateTransition('createFetchRequestTool', input, 'entry');
    
    const { bestApi, queryType, parameters, entityType, query } = input;

    if (!bestApi?.api_name) {
      throw new Error("Missing required API information");
    }

    try {
      // Special handling for trending queries
      if (bestApi.api_name.toLowerCase().includes('trending')) {
        console.log("\n=== Processing Trending Query ===");
        const params = {
          time: parameters?.time || 'week',
          genre: parameters?.genre || undefined,
          limit: parameters?.limit || 10
        };
        console.log("API Parameters:", params);
        
        try {
          // Make direct API call to the first healthy node we find
          const queryParams = new URLSearchParams({
            time: params.time,
            ...(params.genre && { genre: params.genre }),
            limit: params.limit.toString()
          });

          const response = await fetch(
            `https://discoveryprovider3.audius.co/v1/tracks/trending?${queryParams}`,
            {
              method: 'GET',
              headers: {
                'Accept': 'application/json'
              }
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const apiResponse = await response.json();
          console.log(`Received ${apiResponse.data.length} tracks`);

          // Only extract the fields we need
          const simplifiedTracks = apiResponse.data.map((track: any, index: number): SimplifiedTrack => ({
            type: 'track' as const,
            id: track.id,
            title: track.title,
            playCount: track.play_count || 0,
            rank: index + 1,
            user: {
              name: track.user?.name || track.user?.handle || "Unknown Artist"
            }
          }));

          return {
            response: {
              data: simplifiedTracks
            },
            formattedResponse: `Here are the top ${params.limit} trending tracks:\n${simplifiedTracks
              .map((track: SimplifiedTrack) => 
                `${track.rank}. "${track.title}" by ${track.user.name} (${track.playCount.toLocaleString()} plays)`
              ).join('\n')}`
          };
        } catch (error: unknown) {
          console.error("Error in SDK call:", error);
          throw error;
        }
      }

      // For non-trending entity queries, require entity name
      const { entityName } = parameters;
      if (!entityName) {
        throw new Error("Entity name is required for non-trending queries");
      }

      // Determine which property we're looking for based on the query
      const queryWords = query.toLowerCase().split(' ');
      const targetProperty = queryWords
        .map((word: string) => wordToPropertyMap[word])
        .find((prop: string | undefined) => prop !== undefined);

      let apiResponse;
      try {
        switch (entityType) {
          case 'track':
            apiResponse = await sdk.tracks.searchTracks({ query: entityName });
            if (apiResponse.data && apiResponse.data.length > 0) {
              const track = apiResponse.data[0];
              // Use targetProperty to determine response format
              if (targetProperty && isTrackProperty(targetProperty)) {
                return {
                  response: {
                    data: [convertTrack(track)]
                  },
                  formattedResponse: `Track "${track.title}" by ${track.user?.name || track.user?.handle || "Unknown Artist"} has ${track[targetProperty]} ${targetProperty.replace('Count', '').toLowerCase()}s.`
                };
              } else if (query.toLowerCase().includes('genre')) {
                return {
                  response: {
                    data: [convertTrack(track)]
                  },
                  formattedResponse: `Track "${track.title}" by ${track.user?.name || track.user?.handle || "Unknown Artist"} is in the ${track.genre || "unknown"} genre.`
                };
              }
            }
            break;

          case 'user':
            apiResponse = await sdk.users.searchUsers({ query: entityName });
            if (apiResponse.data && apiResponse.data.length > 0) {
              const user = apiResponse.data[0];
              if (targetProperty && isUserProperty(targetProperty)) {
                return {
                  response: {
                    data: [convertUser(user)]
                  },
                  formattedResponse: `User "${user.name || user.handle}" has ${user[targetProperty]} ${targetProperty.replace('Count', '').toLowerCase()}s.`
                };
              }
            }
            break;

          case 'playlist':
            apiResponse = await sdk.playlists.searchPlaylists({ query: entityName });
            if (apiResponse.data && apiResponse.data.length > 0) {
              const playlist = apiResponse.data[0];
              if (targetProperty && isPlaylistProperty(targetProperty)) {
                return {
                  response: {
                    data: [convertPlaylist(playlist)]
                  },
                  formattedResponse: `Playlist "${playlist.playlistName}" by ${playlist.user?.name || playlist.user?.handle || "Unknown Creator"} has ${playlist[targetProperty]} ${targetProperty.replace('Count', '').toLowerCase()}s.`
                };
              }
            }
            break;

          default:
            throw new Error(`Unsupported entityType: ${entityType}`);
        }

        throw new Error(`${entityType?.charAt(0).toUpperCase()}${entityType?.slice(1)} "${entityName}" not found.`);

      } catch (error) {
        stateLogger.error('Error in API request:', error);
        return {
          error: {
            code: 'API_ERROR',
            message: 'Failed to fetch information. Please try again later.',
            timestamp: Date.now(),
            node: 'createFetchRequestTool'
          },
          response: {
            data: []
          }
        };
      }

    } catch (error) {
      console.error('Error in createFetchRequestTool:', error);
      throw error;
    }
  },
  {
    name: "create_fetch_request",
    description: "Executes the selected API and formats the response.",
    schema: z.object({
      bestApi: z.object({
        api_name: z.string(),
        id: z.string(),
        category_name: z.string(),
        tool_name: z.string(),
        api_description: z.string(),
        required_parameters: z.array(z.any()),
        optional_parameters: z.array(z.any()),
        method: z.string(),
        template_response: z.any(),
        api_url: z.string()
      }).passthrough(),
      queryType: z.string(),
      parameters: z.object({
        query: z.string(),
        time: z.string().optional(),
        genre: z.string().nullable().optional()
      }).passthrough(),
      entityType: z.enum(['track', 'user', 'playlist']).nullable(),
      response: z.any().optional(),
      complexity: z.string().optional(),
      isEntityQuery: z.boolean().optional(),
      entityName: z.string().nullable().optional(),
      error: z.any().nullable().optional(),
      formattedResponse: z.string().optional()
    }).passthrough()
  }
);

/**
 * Fetches the list of available APIs based on the extracted categories.
 *
 * @param {GraphState} state - The current state of the graph.
 * @returns {Partial<GraphState>} - The updated state with the list of APIs.
 */
export const getApis = tool(
  async (input: { categories: string[] }): Promise<{
    apis: DatasetSchema[];  // Direct return type, no StateUpdate wrapper
  }> => {
    try {
      console.log("\n=== getApis Processing ===");
      console.log("Input categories:", input.categories);
      
      // Read and parse the API dataset
      const rawData = fs.readFileSync(TRIMMED_CORPUS_PATH, 'utf-8');
      const corpus: AudiusCorpus = JSON.parse(rawData);
      
      // Log corpus content
      console.log("\n=== Corpus Content ===");
      console.log("Available endpoints:", 
        corpus.endpoints.map(e => ({
          name: e.api_name,
          category: e.category_name,
          url: e.api_url
        }))
      );

      // Log category matching process
      console.log("\n=== Category Matching ===");
      input.categories.forEach(cat => {
        console.log(`Looking for: ${cat}`);
        console.log(`Matches:`, 
          corpus.endpoints
            .filter(e => e.api_name === cat)
            .map(e => e.api_name)
        );
      });
      
      // Filter and deduplicate APIs based on API names and URLs
      const seenApis = new Set<string>();
      const apis = corpus.endpoints
        .filter(endpoint => {
          if (input.categories.includes(endpoint.api_name)) {
            const key = `${endpoint.api_name}:${endpoint.api_url}`;
            if (!seenApis.has(key)) {
              seenApis.add(key);
              return true;
            }
          }
          return false;
        });

      console.log("\n=== Selected APIs ===");
      console.log("Found APIs:", apis.map(api => api.api_name));

      // Return direct value - LangGraph will convert to StateUpdate
      return {
        apis  // Direct array, no nesting
      };
    } catch (error) {
      console.error("Error in getApis:", error);
      throw error;
    }
  },
  {
    name: "get_apis",
    description: "Gets relevant APIs based on categories",
    schema: z.object({
      categories: z.array(z.string())
    })
  }
);


// Add a type guard to verify state shape between nodes
function isValidGraphState(state: any): state is GraphState {
  try {
    const schema = z.object({
      bestApi: z.object({
        api_name: z.string(),
      }).passthrough(),
      queryType: z.string(),
      parameters: z.object({
        query: z.string(),
      }).passthrough(),
      entityType: z.enum(['track', 'user', 'playlist']).nullable(),
    }).passthrough();

    schema.parse(state);
    return true;
  } catch (error) {
    stateLogger.error('State validation failed:', error);
    return false;
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

// Add these conversion functions at the top of tools.ts
function convertTrack(track: Track): TrackData {
  // Handle remixOf track differently
  const remixTrack = track.remixOf?.tracks?.[0];
  const remixData = remixTrack ? {
    id: remixTrack.parentTrackId || '',  // This property exists
    type: 'track' as const,
    title: track.title || '',  // Use parent track's title since parentTrackTitle isn't available
    artwork: track.artwork,
    description: null,
    genre: track.genre,
    mood: null,
    releaseDate: null,
    remixOf: null,         // Don't recurse
    repostCount: 0,
    favoriteCount: 0,
    commentCount: 0,
    tags: null,
    user: track.user,
    duration: 0,
    isDownloadable: false,
    playCount: 0,
    permalink: '',
    isStreamable: true
  } : null;

  return {
    id: track.id,
    type: 'track',
    title: track.title,
    artwork: track.artwork,
    description: track.description ?? null,
    genre: track.genre,
    mood: track.mood ?? null,
    releaseDate: track.releaseDate ?? null,
    remixOf: remixData,
    repostCount: track.repostCount,
    favoriteCount: track.favoriteCount,
    commentCount: track.commentCount || 0,
    tags: track.tags?.split(',') ?? null,
    user: track.user,
    duration: track.duration,
    isDownloadable: track.isDownloadable ?? false,
    playCount: track.playCount,
    permalink: track.permalink,
    isStreamable: track.isStreamable ?? true
  };
}

function convertUser(user: User): UserData {
  return {
    id: user.id,
    type: 'user',
    name: user.name,
    handle: user.handle,
    bio: user.bio ?? null,
    followerCount: user.followerCount,
    followeeCount: user.followeeCount,
    trackCount: user.trackCount,
    playlistCount: user.playlistCount,
    albumCount: user.albumCount,
    isVerified: user.isVerified,
    profilePicture: user.profilePicture!,
    coverPhoto: user.coverPhoto!,
    twitterHandle: user.twitterHandle ?? null,
    instagramHandle: user.instagramHandle ?? null,
    tiktokHandle: user.tiktokHandle ?? null,
    website: user.website ?? null,
    location: user.location ?? null,
    isDeactivated: user.isDeactivated,
    isAvailable: user.isAvailable,
    supporterCount: user.supporterCount,
    supportingCount: user.supportingCount,
    totalAudioBalance: user.totalAudioBalance || 0
  };
}

function convertPlaylist(playlist: Playlist): PlaylistData {
  return {
    id: playlist.id,
    playlistName: playlist.playlistName,
    description: playlist.description,
    isAlbum: playlist.isAlbum,
    trackCount: playlist.trackCount,
    totalPlayCount: playlist.totalPlayCount,
    repostCount: playlist.repostCount,
    favoriteCount: playlist.favoriteCount,
    user: playlist.user,
    playlistContents: playlist.playlistContents,
    artwork: playlist.artwork,
    permalink: playlist.permalink,
    isImageAutogenerated: playlist.isImageAutogenerated,
    access: playlist.access,
    ddexApp: playlist.ddexApp,
    upc: playlist.upc,
    tracks: [] // We'll need to fetch this separately if needed
  };
}

// Add this interface near the top with other types
interface SimplifiedTrack {
  type: 'track';
  id: string;
  title: string;
  playCount: number;
  rank: number;
  user: {
    name: string;
  };
}

export const extractParametersTool = tool(
  async (input: { query: string, entityType: EntityType }): Promise<Partial<GraphState>> => {
    console.log("\n=== extractParameters Processing ===");
    console.log("Input:", input);

    // Extract entity name using regex
    const entityNameMatch = input.query.match(/"([^"]+)"|'([^']+)'|\b(\w+(?:\s+\w+)*)\b/);
    const entityName = entityNameMatch ? entityNameMatch[0] : null;

    return {
      parameters: {
        entityName,
        query: input.query
      }
    };
  },
  {
    name: "extract_parameters",
    description: "Extracts parameters from the query",
    schema: z.object({
      query: z.string(),
      entityType: z.enum(['track', 'user', 'playlist']).nullable()
    })
  }
);

// Add after the type definitions
export function verifyParams(input: GraphState): Promise<"execute_request_node" | typeof END> {
  console.log("\n=== Parameter Check ===");
  const { bestApi, parameters } = input;

  if (!bestApi?.required_parameters) {
    throw new Error("No API selected");
  }

  const required = bestApi.required_parameters.map(p => p.name);
  const extracted = Object.keys(parameters || {});
  
  console.log("Required:", required);
  console.log("Extracted:", extracted);

  // If no required parameters, proceed to execution
  if (required.length === 0) {
    console.log("No required parameters for the selected API. Proceeding to execute_request_node.");
    return Promise.resolve("execute_request_node");
  }

  // Check if all required parameters are present
  const missing = required.filter(p => !extracted.includes(p));
  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(", ")}`);
  }

  return Promise.resolve("execute_request_node");
}


/**
 * List of all tools used in the ecosystem.
 */
export const ALL_TOOLS_LIST: { 
  [key: string]: StructuredToolInterface | RunnableToolLike 
} = {
  extractCategory: extractCategoryTool,
  extractParameters: extractParametersTool,
  readUserInputTool,
  createFetchRequest: createFetchRequestTool,
  selectApi: selectApiTool,
  readUserInput: readUserInputTool
};