import { StructuredTool, StructuredToolInterface, tool } from "@langchain/core/tools";
import { RunnableToolLike } from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { GraphState, DatasetSchema, DatasetParameters, ComplexityLevel, EntityType, QueryType, AudiusCorpus } from "../types.js";
import { logger } from "../logger.js";
import * as readline from "readline";
import { findMissingParams } from "../utils.js";
import fs from "fs";
import { HIGH_LEVEL_CATEGORY_MAPPING, TRIMMED_CORPUS_PATH } from "../constants.js";
import { sdk } from '../sdkClient.js';
import { Track, User, Playlist } from '@audius/sdk';
import nlp from "compromise";

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

/**
 * Selects the appropriate SDK function based on the user's query.
 *
 * @param {object} input - The input object containing state information.
 * @returns {Promise<Partial<GraphState>>} - The updated graph state.
 */
export const selectApiTool = tool(
  async (input: Record<string, any>): Promise<Partial<GraphState>> => {
    const { apis, query, queryType } = input;

    if (!apis || !query) {
      throw new Error("Missing required input properties");
    }

    if (queryType === 'trending_tracks') {
      // Handle trending tracks query
      return {
        ...input,
        bestApi: apis.find((api: DatasetSchema) => api.api_name === 'Get Trending Tracks'),
        // Removed parameters assignment to allow extractParametersTool to handle them
      };
    }

    let bestApiName: string | null = null;

    if (input.isEntityQuery && input.entityType) {
      // Handle entity queries
      switch (input.entityType) {
        case 'track':
          bestApiName = 'Search Tracks';
          break;
        case 'user':
          bestApiName = 'Search Users';
          break;
        case 'playlist':
          bestApiName = 'Search Playlists';
          break;
        default:
          bestApiName = null;
      }
    } else {
      bestApiName = 'Audius Web Search'; // Default to Search Tracks instead of Audius Web Search
    }

    const bestApi = apis.find((api: DatasetSchema) => api.api_name === bestApiName);
    console.log('Selected API:', bestApi?.api_name);

    if (!bestApi) {
      throw new Error(`API "${bestApiName}" not found in the available APIs.`);
    }

    return {
      ...input,
      bestApi,
      parameters: {
        ...(input.parameters || {}),
        query: input.query,
      },
    };
  },
  {
    name: 'select_api',
    description: 'Selects the best API based on query type and available APIs.',
    schema: z.object({
      apis: z.array(z.any()),
      query: z.string(),
      queryType: z.string().optional(),
      isEntityQuery: z.boolean().optional(),
      entityType: z.enum(['track', 'user', 'playlist']).nullable().optional(),
      parameters: z.record(z.any()).nullable().optional(),
    }).passthrough(),
  }
);

// READ/PARSE USER INPUT -> EXTRACT PARAMS -> REQUEST PARAMS

/**
 * Format for user input: <name>,<value>:::<name>,<value>
 */
const paramsFormat = `<name>,<value>:::<name>,<value>`;

/**
 * Tool to read user input from the command line.
 *
 * Prompts the user to provide missing parameters in a specific format.
 */
export const readUserInputTool = tool(
  async (input: { missingParams: { name: string; description: string }[] }) => { 
    try {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const missingParamsString = input.missingParams
        .map((p) => `Name: ${p.name}, Description: ${p.description}`)
        .join("\n----\n");
      const question = `LangTool couldn't find all the required params for the API.\nMissing params:\n${missingParamsString}\nPlease provide the missing params in the following format:\n<name>,<value>:::<name>,<value>\n`;

      logger.debug(`Prompting user for input: ${question}`);

      const answer: string = await new Promise<string>((resolve) => {
        rl.question(question, (response) => {
          rl.close();
          resolve(response);
        });
      });

      logger.debug(`User provided input: ${answer}`);

      return answer;
    } catch (e: any) {
      logger.error('Error in readUserInputTool:', e);
      return "";
    }
  },
  {
    name: "read_user_input",
    description:
      "Prompts the user to provide missing API parameters in the format <name>,<value>:::<name>,<value>.",
    schema: z.object({
      missingParams: z
        .array(
          z.object({
            name: z.string().describe("The name of the missing parameter."),
            description: z.string().describe("A description of the missing parameter."),
          })
        )
        .describe("A list of missing parameters with their descriptions."),
    }).passthrough(), // Allow additional properties
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
    logger.debug(`Processing query: "${normalizedQuery}"`);

    // Extract nouns from the query
    const nouns = doc.nouns().out('array').map((e: string) => e.toLowerCase());

    // Extract action keywords to determine entityType
    let mappedEntityType: EntityType | null = null;
    for (const [keyword, type] of Object.entries(keywordToEntityType)) {
      if (normalizedQuery.includes(keyword)) {
        mappedEntityType = type;
        logger.debug(`Keyword "${keyword}" mapped to EntityType "${type}"`);
        break; // Assign the first matching entityType
      }
    }

    logger.debug(`Mapped Entity Type: ${mappedEntityType}`);

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
        query: z.string().describe("The user's query string to classify"),
      }),
    }),
  }
);


export const extractCategoryTool = tool(
  async (input: { query: string }): Promise<Partial<GraphState>> => {
    if (!input.query) {
      throw new Error("Query is required");
    }

    // Use the query directly with CategorizeQueryTool
    const result = await CategorizeQueryTool.invoke({
      state: { 
        query: input.query 
      }
    });

    // Ensure we have categories based on entityType or queryType
    let categories: string[] = [];

    if (result.entityType === 'track') {
      categories = ['Tracks'];
    } else if (result.entityType === 'user') {
      categories = ['Users'];
    } else if (result.entityType === 'playlist') {
      categories = ['Playlists'];
    } 

    // Merge the result with the input state and ensure categories are set
    return {
      ...input,
      ...result,
      categories, // Explicitly set categories based on entityType or queryType
    };
  },
  {
    name: "extract_category",
    description: "Extracts the category from the user's query.",
    schema: z.object({
      query: z.string().describe("The user's query string to classify"),
    }).passthrough(),
  }
);

/**
 * Verifies the presence of required parameters.
 *
 * @param {GraphState} state - The current state of the graph.
 * @returns {string} - Determines the next node based on parameter verification.
 */
export const verifyParams = (
  state: GraphState
): "human_loop_node" | "execute_request_node" => {
  const { bestApi, parameters, queryType } = state;
  
  if (!bestApi) {
    throw new Error("No best API found");
  }
  
  if (!parameters) {
    console.warn("Parameters are missing. Redirecting to human_loop_node.");
    return "human_loop_node";
  }
  
  // Check if we have all required parameters for the selected API
  const requiredParamsKeys = bestApi.required_parameters.map(({ name }) => name);
  const extractedParamsKeys = Object.keys(parameters);
  
  // Special handling for 'Search Tracks' API
  if (bestApi.api_name === 'Search Tracks' && parameters.trackTitle) {
    parameters.query = parameters.trackTitle;
  }
  
  const missingKeys = findMissingParams(requiredParamsKeys, extractedParamsKeys);
  
  // If there are no required parameters, proceed to execute
  if (requiredParamsKeys.length === 0) {
    logger.debug("No required parameters for the selected API. Proceeding to execute_request_node.");
    return "execute_request_node";
  }
  
  if (missingKeys.length > 0) {
    console.warn(`Missing parameters: ${missingKeys.join(", ")}`);
    return "human_loop_node";
  }
  
  logger.debug("All required parameters are present. Proceeding to execute_request_node.");
  return "execute_request_node";
};

/**
 * Parses the user input string into a key-value pair.
 *
 * @param {string} input - The raw input string from the user.
 * @returns {Record<string, string>} - An object mapping parameter names to their values.
 */
export function parseUserInput(input: string): Record<string, string> {
  if (!input.includes(":::")) {
    const [key, value] = input.split(",");
    return { [key.trim()]: value.trim() };
  }

  const splitParams = input.split(":::");
  let params: Record<string, string> = {};
  splitParams.forEach((param) => {
    const [key, value] = param.split(",");
    if (key && value) {
      params[key.trim()] = value.trim();
    }
  });
  return params;
} 

/**
 * Tool to request missing parameters from the user.
 *
 * @param {GraphState} state - The current state of the graph.
 * @returns {Promise<Partial<GraphState>>} - The updated graph state with new parameters.
 */
export async function requestParameters(
  state: GraphState
): Promise<Partial<GraphState>> {
  const { bestApi, parameters } = state; // {{ edit_3 }} Removed queryType
  if (!bestApi) {
    throw new Error("No best API found");
  }

  const requiredParamsKeys = bestApi.required_parameters.map(
    ({ name }) => name
  );
  const extractedParamsKeys = Object.keys(parameters ?? {});
  const missingParams = findMissingParams(
    requiredParamsKeys,
    extractedParamsKeys
  );
  const missingParamsSchemas = missingParams
    .map((missingParamKey) =>
      bestApi.required_parameters.find(({ name }) => name === missingParamKey)
    )
    .filter((p) => p !== undefined) as DatasetParameters[];

  // Invoke the readUserInputTool to get user input for missing parameters
  const userInput = await readUserInputTool.invoke({
    missingParams: missingParamsSchemas,
  });

  // Parse the user input string into key-value pairs
  const parsedUserInput = parseUserInput(userInput as string);

  return {
    parameters: {
      ...parameters,
      ...parsedUserInput,
    },
  };
}



export async function extractParameters(state: GraphState): Promise<Partial<GraphState>> {
  const { query, entityType } = state;

  if (!query || !entityType) {
    logger.error("Query and entityType are required");
    throw new Error("Query and entityType are required");
  }

  logger.debug(`extractParameters invoked with query: "${query}", entityType: "${entityType}"`);

  // Initialize extracted parameters
  let extractedParams: Record<string, any> = {};

  // Use 'compromise' to process the query
  const doc = nlp(query);

  // Extract nouns and numbers from the query
  const nouns = doc.nouns().out('array');
  const numbers = doc.numbers().out('array');
  const extractedTokens = [...nouns, ...numbers];

  logger.debug(`Extracted Tokens (Nouns, Numbers): ${JSON.stringify(extractedTokens)}`);

  // Remove irrelevant keywords
  const irrelevantKeywords = [
    ...Object.keys(wordToPropertyMap),
    'audius', 'on', 'does', 'have', 'how', 'many',
  ];
  const entityNames = extractedTokens.filter(
    (token: string) => !irrelevantKeywords.includes(token.toLowerCase())
  );
  logger.debug(`Filtered Entity Names: ${JSON.stringify(entityNames)}`);

  if (entityNames.length > 0) {
    // Reconstruct the entity name by joining tokens with spaces
    extractedParams.entityName = entityNames.join(' ');
    logger.debug(`Extracted Entity Name: "${extractedParams.entityName}"`);
  } else {
    logger.error(`Could not extract entity name from the query.`);
    throw new Error(`Could not extract entity name from the query.`);
  }

  return {
    ...state,
    parameters: {
      ...(state.parameters || {}),
      ...extractedParams,
    },
  };
}

// EXTRACT QUERY CATEGORY

/**
 * Tool to extract high-level categories from a user query.
 */
export const ExtractHighLevelCategoriesTool = tool(
  async (input: { highLevelCategories: string[] }) => {
    const categoriesMapped = input.highLevelCategories
      .map(
        (category) =>
          HIGH_LEVEL_CATEGORY_MAPPING[
            category as keyof typeof HIGH_LEVEL_CATEGORY_MAPPING
          ]
      )
      .flat();
    return JSON.stringify(categoriesMapped);
  },
  {
    name: "ExtractHighLevelCategories",
    description:
      "Given a user query, extract the high-level category which best represents the query.",
    schema: z.object({
      highLevelCategories: z
        .array(
          z
            .enum(
              Object.keys(HIGH_LEVEL_CATEGORY_MAPPING) as [string, ...string[]]
            )
            .describe("An enum of all categories which best match the query.")
        )
        .describe("The high-level categories to extract from the query."),
    }),
  }
);

/**
 * Extracts the entity name from the user's query.
 *
 * @param {string} query - The user's query.
 * @param {EntityType} entityType - The type of the entity ('track', 'user', or 'playlist').
 * @returns {string | null} - The extracted entity name or null if not found.
 */
function extractEntityNameFromQuery(query: string, entityType: EntityType): string | null {
  const doc = nlp(query);
  let entityName: string | null = null;

  switch (entityType) {
    case 'track':
      // Look for track-related terms and extract entity name
      entityName = doc.match('track [#A-Z]+').normalize().out('text');
      break;
    case 'user':
      // Look for user-related terms and extract entity name
      entityName = doc.match('user [#A-Z]+').normalize().out('text');
      break;
    case 'playlist':
      // Look for playlist-related terms and extract entity name
      entityName = doc.match('playlist [#A-Z]+').normalize().out('text');
      break;
    default:
      break;
  }

  if (!entityName) {
    // As a fallback, extract proper nouns which are likely entity names
    const nouns = doc.nouns().toTitleCase().out('array');
    if (nouns.length > 0) {
      entityName = nouns.join(' ');
    }
  }

  return entityName || null;
}

/**
 * Modifies the extractCategory function to return only the first category.
 */
export async function extractCategory(state: GraphState): Promise<Partial<GraphState>> {
  // Prepare the prompt with categories and tools
  const allApis: AudiusCorpus = JSON.parse(fs.readFileSync(TRIMMED_CORPUS_PATH, "utf-8"));

  // Access the endpoints array
  const categoriesAndTools = Object.entries(HIGH_LEVEL_CATEGORY_MAPPING)
    .map(([high, low]) => {
      const allTools = allApis.endpoints.filter((api) => low.includes(api.category_name));
      return `High Level Category: ${high}
Tools:
${allTools
        .map((item) => `Name: ${item.tool_name}`)
        .join("\n")}`;
    })
    .join("\n\n");

  const { llm, query } = state;

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are an expert software engineer.

Currently, you are helping a fellow engineer select the best category of APIs based on their query.
You are only presented with a list of high level API categories, and their query.
Additionally, you need to determine if the query is about a specific entity (track, user, or playlist). If it is, identify the entity type and the entity name.

Think slowly, and carefully select the best category for the query.

Here are all the high level categories, and every tool name that falls under them:
${categoriesAndTools}`,
    ],
    ["human", `Query: ${query}`],
  ]);

  const schema = z.object({
    categories: z.array(z.string()).describe("The high-level categories that best match the query."),
    isEntityQuery: z.boolean().describe("Whether the query is about a specific entity."),
    entityType: z.enum(['track', 'user', 'playlist']).nullable().describe("The type of the entity if applicable."),
    entityName: z.string().nullable().describe("The name of the entity if applicable."),
  });

  const modelWithStructuredOutput = llm!.withStructuredOutput(schema, {
    name: "extract_category",
  });

  const chain = prompt.pipe(modelWithStructuredOutput);

  const res = await chain.invoke({});

  let { categories, isEntityQuery, entityType, entityName } = res;

  // If isEntityQuery is undefined, determine it based on categories
  if (typeof isEntityQuery !== 'boolean') {
    isEntityQuery = false;
    if (categories) {
      if (categories.includes('Tracks')) {
        isEntityQuery = true;
        entityType = 'track';
      } else if (categories.includes('Users')) {
        isEntityQuery = true;
        entityType = 'user';
      } else if (categories.includes('Playlists')) {
        isEntityQuery = true;
        entityType = 'playlist';
      }
    }
  }

  // If entityName is null, attempt to extract it from the query
  if (isEntityQuery && !entityName) {
    entityName = extractEntityNameFromQuery(state.query!, entityType as EntityType);
  }

  console.log(categories, isEntityQuery, entityType, entityName);

  // Ensure only one category is selected and include queryType
  return {
    categories: [categories[0]], // Select the first category as the most relevant
    isEntityQuery,
    entityType,
    entityName,
    queryType: isEntityQuery ? `search_${entityType}s` as QueryType : 'general' as QueryType, // Ensure queryType is appropriately set based on your logic
  };
}

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
 * Instantiate createSelectAPITool with actual parameters.
 * Replace `existingApis` and `initialQuery` with your actual data.
const existingApis: DatasetSchema[] = [
  {
    id: "1",
    category_name: "Tracks",
    tool_name: "SearchTracksTool",
    api_name: "Search Tracks",
    api_description: "Searches for tracks based on title and artist name.",
    required_parameters: [
      { 
        name: "query", 
        description: "Combined track title and artist name.",
        type: "string",
        default: ""
      }
    ],
    optional_parameters: [],
    method: "GET",
    api_url: "https://api.audius.co/tracks/search",
    template_response: {},
  },
  {
    id: "2",
    category_name: "Users",
    tool_name: "SearchUsersTool",
    api_name: "Search Users",
    api_description: "Searches for users based on username.",
    required_parameters: [
      { 
        name: "query", 
        description: "Username to search for.",
        type: "string",
        default: ""
      }
    ],
    optional_parameters: [],
    method: "GET",
    api_url: "https://api.audius.co/users/search",
    template_response: {},
  },
  {
    id: "3",
    category_name: "Playlists",
    tool_name: "SearchPlaylistsTool",
    api_name: "Search Playlists",
    api_description: "Searches for playlists based on name.",
    required_parameters: [
      { 
        name: "query", 
        description: "Playlist name to search for.",
        type: "string",
        default: ""
      }
    ],
    optional_parameters: [],
    method: "GET",
    api_url: "https://api.audius.co/playlists/search",
    template_response: {},
  },
  // Get Trending Tracks API definition added
  {
    id: "4",
    category_name: "Tracks",
    tool_name: "GetTrendingTracksTool",
    api_name: "Get Trending Tracks",
    api_description: "Fetches the top trending tracks on Audius.",
    required_parameters: [],
    optional_parameters: [
      {
        name: "genre",
        type: "string",
        description: "Genre of the song",
        default: ""
      },
      {
        name: "time",
        type: "string",
        description: "Time period for the trending tracks (e.g., 'week', 'month', 'allTime')",
        default: "week"
      }
    ],
    method: "GET",
    api_url: "https://api.audius.co/tracks/trending",
    template_response: {
    },
  },
  // Remove or comment out any Get APIs
  // {
  //   id: "4",
  //   category_name: "Tracks",
  //   tool_name: "GetTrackTool",
  //   api_name: "Get Track",
  //   api_description: "Retrieves track details by ID.",
  //   required_parameters: [
  //     { 
  //       name: "track_id", 
  //       description: "The ID of the track.",
  //       type: "string",
  //       default: ""
  //     }
  //   ],
  //   optional_parameters: [],
  //   method: "GET",
  //   api_url: "https://api.audius.co/tracks/get",
  //   template_response: {},
  // },
  // Add more Search APIs as needed
];

const initialQuery: string = "Find popular playlists for jazz music.";

// Instantiate the SelectAPITool
const selectAPIToolInstance = createSelectAPITool(existingApis, initialQuery);


// Updated response formatters leveraging the types.ts definitions
const responseFormatters: { [key: string]: (data: any) => string } = {
  'Search Tracks': (data) => {
    // Log the raw data for debugging
    logger.debug('Raw Search Tracks Data:', JSON.stringify(data, null, 2));

    // Check if data is an array and has at least one track
    if (Array.isArray(data) && data.length > 0) {
      const track = data[0]; // Access the first track
      const title = track.title || track.trackTitle || "Unknown Title";
      const artistName = track.user?.name || track.user?.handle || "Unknown Artist";
      const playCount = track.playCount || track.play_count || "Unknown";

      if (typeof playCount === 'number') {
        return `${title} by ${artistName} has ${playCount} plays on Audius.`;
      } else {
        logger.warn(`playCount is missing or invalid for track ID ${track.id}`);
        return `${title} by ${artistName} has an unknown number of plays on Audius.`;
      }
    } else {
      logger.warn("No track data found in the response.");
      return "No track information available.";
    }
  },
  'Search Users': (data) => {
    logger.debug('Raw Search Users Data:', JSON.stringify(data, null, 2));

    if (Array.isArray(data) && data.length > 0) {
      const user = data[0];
      const name = user.name || user.handle || "Unknown User";
      const followerCount = user.followerCount || user.followers_count || "Unknown";

      return `${name} has ${followerCount} followers on Audius.`;
    } else {
      logger.warn("No user data found in the response.");
      return "No user information available.";
    }
  },
  'Search Playlists': (data) => {
    logger.debug('Raw Search Playlists Data:', JSON.stringify(data, null, 2));

    if (Array.isArray(data) && data.length > 0) {
      const playlist = data[0];
      const playlistName = playlist.playlistName || playlist.name || "Unknown Playlist";
      const trackCount = playlist.trackCount || playlist.tracks_count || "Unknown";
      const creator = playlist.user?.name || playlist.user?.handle || "Unknown Creator";

      return `Playlist "${playlistName}" by ${creator} contains ${trackCount} tracks on Audius.`;
    } else {
      logger.warn("No playlist data found in the response.");
      return "No playlist information available.";
    }
  },
  'Get Playlist Details': (data) => {
    logger.debug('Raw Get Playlist Details Data:', JSON.stringify(data, null, 2));

    if (Array.isArray(data) && data.length > 0) {
      const playlist = data[0];
      const playlistName = playlist.playlistName || playlist.name || "Unknown Playlist";
      const trackCount = playlist.trackCount || playlist.tracks_count || "Unknown";
      const favoriteCount = playlist.favoriteCount || playlist.favorites_count || "Unknown";
      const creator = playlist.user?.name || playlist.user?.handle || "Unknown Creator";

      return `Playlist "${playlistName}" by ${creator} has ${trackCount} tracks and is favorited ${favoriteCount} times on Audius.`;
    } else {
      logger.warn("No playlist details data found in the response.");
      return "No playlist details available.";
    }
  },
  // Add more formatters as needed for other APIs
};

/**
 * Tool to create and execute API fetch requests based on `bestApi` and `parameters`, including response formatting.
 *
 * @param {object} input - The input object containing `bestApi`, `queryType`, and `parameters`.
 * @returns {Promise<{ response: string }>} - The formatted response string.
 */
export const createFetchRequestTool = tool(
  async (input: Record<string, any>): Promise<Partial<GraphState>> => {
    const { bestApi, queryType, parameters, query } = input;

    if (!bestApi) {
      throw new Error("Missing required input properties");
    }

    try {
      let apiResponse: any;

      if (queryType === 'trending_tracks') {
        logger.debug("Calling Get Trending Tracks API with parameters:", parameters);

        const maxRetries = 3;
        const timeout = 30000; // Increased timeout to 30 seconds
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            logger.debug(`Attempt ${attempt} of ${maxRetries}`);

            // Add timeout promise
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('API request timed out')), timeout);
            });

            // API call promise
            const apiCallPromise = sdk.tracks.getTrendingTracks({
              time: parameters?.time || 'week',
              genre: parameters?.genre || undefined
            });

            // Race between timeout and API call
            apiResponse = await Promise.race([apiCallPromise, timeoutPromise]);
            
            logger.debug("Raw API Response:", JSON.stringify(apiResponse, null, 2));

            // If we got here, the call succeeded
            break;
          } catch (error) {
            lastError = error as Error;
            logger.error(`Attempt ${attempt} failed:`, error);
            
            if (attempt < maxRetries) {
              // Wait before retrying (exponential backoff)
              const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }

        // If we still don't have a response after all retries
        if (!apiResponse) {
          logger.error("All retry attempts failed");
          return {
            ...input,
            response: `Failed to fetch trending tracks after ${maxRetries} attempts. ${lastError ? `Error: ${lastError.message}` : 'Please try again later.'}`,
          };
        }

        // Check if we have data and it's an array
        if (!apiResponse?.data || !Array.isArray(apiResponse.data)) {
          throw new Error("Invalid response format from Trending Tracks API");
        }

        const tracks = apiResponse.data.slice(0, 10); // Take first 10 tracks
        
        if (tracks.length === 0) {
          return {
            ...input,
            response: "No trending tracks found at this time. Please try again later.",
          };
        }

        const trackList = tracks.map((track: any, index: number) => {
          const artistName = track.user?.name || track.user?.handle || "Unknown Artist";
          const title = track.title || "Untitled";
          const playCount = track.play_count || track.playCount || 0;
          return `${index + 1}. "${title}" by ${artistName} (${playCount.toLocaleString()} plays)`;
        }).join('\n');

        logger.debug("Formatted Track List:", trackList);

        return {
          ...input,
          response: `Top ${tracks.length} trending tracks on Audius${parameters?.genre ? ` in ${parameters.genre}` : ''}${parameters?.time ? ` for ${parameters.time}` : ''}:\n${trackList}`,
        };
      }

      // [Rest of the code remains unchanged]
      // Handle entity queries
      const { entityName } = input.parameters;
      const entityType = input.entityType;

      if (!entityName) {
        throw new Error("Entity name is required");
      }

      switch (entityType) {
        case 'track':
          apiResponse = await sdk.tracks.searchTracks({ query: entityName });
          if (apiResponse.data && apiResponse.data.length > 0) {
            const track = apiResponse.data[0];
            // Check if the query is about genre
            if (query.toLowerCase().includes('genre')) {
              return {
                ...input,
                response: `Track "${track.title}" by ${track.user?.name || track.user?.handle || "Unknown Artist"} is in the ${track.genre || "unknown"} genre.`,
              };
            } else {
              return {
                ...input,
                response: `Track "${track.title}" by ${track.user?.name || track.user?.handle || "Unknown Artist"} has ${track.playCount} plays on Audius.`,
              };
            }
          }
          break;

        case 'user':
          apiResponse = await sdk.users.searchUsers({ query: entityName });
          if (apiResponse.data && apiResponse.data.length > 0) {
            const user = apiResponse.data[0];
            return {
              ...input,
              response: `User "${user.name || user.handle}" has ${user.followerCount} followers on Audius.`,
            };
          }
          break;

        case 'playlist':
          apiResponse = await sdk.playlists.searchPlaylists({ query: entityName });
          if (apiResponse.data && apiResponse.data.length > 0) {
            const playlist = apiResponse.data[0];
            return {
              ...input,
              response: `Playlist "${playlist.playlistName || playlist.name}" by ${playlist.user?.name || playlist.user?.handle || "Unknown Creator"} contains ${playlist.trackCount} tracks on Audius.`,
            };
          }
          break;

        default:
          throw new Error(`Unsupported entityType: ${entityType}`);
      }

      throw new Error(`${entityType?.charAt(0).toUpperCase()}${entityType?.slice(1)} "${entityName}" not found.`);
    } catch (error) {
      logger.error('Error in createFetchRequestTool:', error);
      throw error;
    }
  },
  {
    name: "create_fetch_request",
    description: "Executes the selected API and formats the response based on extracted entity or parameters.",
    schema: z.object({
      bestApi: z.object({
        api_name: z.string(),
        category_name: z.string(),
        tool_name: z.string(),
        required_parameters: z.array(z.any()),
        optional_parameters: z.array(z.any()),
        method: z.string(),
        api_url: z.string(),
        api_description: z.string(),
        template_response: z.any(),
        id: z.string()
      }),
      queryType: z.string(),
      // Make these optional since trending tracks don't need them
      parameters: z.record(z.any()).optional(),
      query: z.string().optional(),
      entityType: z.enum(['track', 'user', 'playlist']).nullable().optional(),
    }).passthrough(),
  }
);

// Enhanced `extractParametersTool` using wink-nlp
export const extractParametersTool = tool(
  async (input: Record<string, any>): Promise<Partial<GraphState>> => {
    const { query, entityType, queryType } = input;

    if (!query) {
      logger.error("Query is required");
      throw new Error("Query is required");
    }

    logger.debug(`extractParametersTool invoked with query: "${query}", queryType: "${queryType}"`);

    // Initialize extracted parameters
    let extractedParams: Record<string, any> = { ...(input.parameters || {}) };

    // Use 'compromise' to process the query
    const doc = nlp(query);

    if (queryType === 'trending_tracks') {
      // Define potential genres and time periods
      const genres = [
        'electronic', 'rock', 'pop', 'hip-hop', 'rap', 'r&b', 'country', 'jazz', 'classical', 'reggae', 'latin', 'metal',
        // Add more genres as needed
      ];
      const times = ['week', 'month', 'year', 'all time', 'alltime'];

      // Extract 'genre' from the query
      const genreMatch = genres.find(genre => query.toLowerCase().includes(genre.toLowerCase()));
      if (genreMatch) {
        extractedParams.genre = genreMatch;
        logger.debug(`Extracted genre: ${genreMatch}`);
      } else {
        extractedParams.genre = null; // or set a default genre if desired
        logger.debug("No genre specified. Setting genre to null.");
      }

      // Extract 'time' from the query
      const timeMatch = times.find(time => query.toLowerCase().includes(time.toLowerCase()));
      if (timeMatch) {
        extractedParams.time = timeMatch.replace(' ', ''); // Convert 'all time' to 'alltime' if necessary
        logger.debug(`Extracted time: ${extractedParams.time}`);
      } else {
        extractedParams.time = 'week'; // Set default time period
        logger.debug("No time period specified. Setting time to 'week'.");
      }

      return {
        ...input,
        parameters: extractedParams,
      };
    }

    // Handle entity queries
    if (entityType) {
      // Define regex patterns for each EntityType to extract entityName
      const regexMap: Record<Exclude<EntityType, null>, RegExp> = {
        'track': /(?:(?:the\s+)?(?:song|track)\s+['"]?([\w\s\'&\-]+)['"]?)|(?:does\s+['"]?([\w\s\'&\-]+)['"]?\s+have)/i,
        'user': /(?:does\s+([A-Za-z0-9\s\'.-]+)\s+have)/i,
        'playlist': /(?:(?:the\s+)?playlist\s+['"]?([\w\s\'&,.\-]+)['"]?)(?:\s+have|\s*$)/i,
      };

      const regex = regexMap[entityType as Exclude<EntityType, null>];
      let entityName: string | null = null;

      if (regex) {
        const match = query.match(regex);
        if (match && match[1]) {
          entityName = match[1].trim();
          logger.debug(`Extracted Entity Name via regex: "${entityName}"`);
        }
      }

      // Fallback to extracting proper nouns if regex fails
      if (!entityName) {
        // Get all terms from the query
        const terms = doc.terms().out('array');
        logger.debug(`Terms Extracted: ${JSON.stringify(terms)}`);

        // Remove irrelevant keywords
        const irrelevantKeywords = [
          ...Object.keys(wordToPropertyMap),
          'audius', 'on', 'does', 'have', 'how', 'many',
        ];
        
        const filteredTerms = terms.filter(
          (token: string) => !irrelevantKeywords.includes(token.toLowerCase())
        );
        logger.debug(`Filtered Terms: ${JSON.stringify(filteredTerms)}`);

        if (filteredTerms.length > 0) {
          entityName = filteredTerms.join(' ').trim();
          logger.debug(`Extracted Entity Name via terms: "${entityName}"`);
        } else {
          logger.error(`Could not extract entity name from the query.`);
          throw new Error(`Could not extract entity name from the query.`);
        }
      }

      extractedParams.entityName = entityName;
    }

    return {
      ...input,
      parameters: extractedParams,
    };
  },
  {
    name: "extract_parameters",
    description:
      "Extracts necessary parameters based on the entity type and properties from the user query.",
    schema: z
      .object({
        query: z.string(),
        entityType: z.enum(['track', 'user', 'playlist']).nullable(),
        queryType: z.string(),
        parameters: z.record(z.any()).nullable(),
        // ... (other properties)
      })
      .passthrough(),
  }
);

/**
 * Fetches the list of available APIs based on the extracted categories.
 *
 * @param {GraphState} state - The current state of the graph.
 * @returns {Partial<GraphState>} - The updated state with the list of APIs.
 */
export function getApis(state: GraphState) {
  logger.debug('getApis called with categories:', state.categories);
  
  if (!state.categories || state.categories.length === 0) {
    logger.error("No categories available in state for getApis.");
    throw new Error("No categories passed to get_apis_node");
  }

  try {
    const allData: any = JSON.parse(fs.readFileSync(TRIMMED_CORPUS_PATH, "utf8"));
    const endpoints = allData.endpoints;

    // Transform all APIs without filtering
    const transformedApis: DatasetSchema[] = endpoints.map((api: any) => ({
      id: api.id,
      category_name: api.category_name,
      tool_name: api.tool_name,
      api_name: api.api_name,
      api_description: api.api_description,
      required_parameters: api.required_parameters,
      optional_parameters: api.optional_parameters,
      method: api.method,
      template_response: api.template_response,
      api_url: api.api_url,
    }));

    // Filter APIs by category, including all Track-related APIs for trending queries
    const apis = state.categories
      .map((category) => {
        if (category.toLowerCase() === 'tracks') {
          // For Tracks category, include all Track-related APIs
          return transformedApis.filter((endpoint: DatasetSchema) => 
            endpoint.category_name.toLowerCase() === category.toLowerCase()
          );
        } else {
          // For other categories, only include Search APIs
          return transformedApis.filter((endpoint: DatasetSchema) => 
            endpoint.category_name.toLowerCase() === category.toLowerCase() &&
            endpoint.api_name.startsWith('Search')
          );
        }
      })
      .flat();

    logger.debug('Selected APIs:', apis.map((api: DatasetSchema) => api.api_name));

    return {
      ...state,
      apis,
    };
  } catch (error) {
    logger.error('Error in getApis:', error);
    throw error;
  }
}

/**
 * List of all tools used in the ecosystem.
 */
export const ALL_TOOLS_LIST: { 
  [key: string]: StructuredToolInterface | RunnableToolLike | Promise<Partial<GraphState>> | ((state: GraphState) => Promise<Partial<GraphState>>) 
} = {
  extractCategory: extractCategoryTool,
  extractParameters: extractParametersTool, // Ensure this points to the enhanced tool
  readUserInputTool,
  ExtractHighLevelCategoriesTool,
  createFetchRequest: createFetchRequestTool,
  selectApi: selectApiTool,
  readUserInput: readUserInputTool // Use the instantiated tool
  // Remove or comment out any Get tools if they exist
  // getTrack: getTrackTool, // Removed
  // getUser: getUserTool, // Removed
  // getPlaylist: getPlaylistTool, // Removed
  // Add other Search tools here as needed
};





