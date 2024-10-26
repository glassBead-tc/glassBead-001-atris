import { StructuredTool, StructuredToolInterface, tool } from "@langchain/core/tools";
import { RunnableToolLike } from "@langchain/core/runnables";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import nlp from "compromise";
import { z } from "zod";
import { GraphState, DatasetSchema, DatasetParameters, ComplexityLevel, EntityType, QueryType, AudiusCorpus, TrackData } from "../types.js";
import { logger } from "../logger.js";
import * as readline from "readline";
import { findMissingParams } from "../utils.js";
import fs from "fs";
import { HIGH_LEVEL_CATEGORY_MAPPING, TRIMMED_CORPUS_PATH } from "../constants.js";
import { sdk } from '../sdkClient.js';
import { Track, User, Playlist } from '@audius/sdk';


/**
 * Selects the appropriate SDK function based on the user's query.
 *
 * @param {object} input - The input object containing state information.
 * @returns {Promise<Partial<GraphState>>} - The updated graph state.
 */
export const selectApiTool = tool(
  async (input: Record<string, any>): Promise<Partial<GraphState>> => {
    if (!input.isEntityQuery || !input.entityType || !input.apis || !input.query) {
      throw new Error("Missing required input properties");
    }

    let bestApiName: string | null = null;

    if (input.isEntityQuery) {
      switch (input.entityType) {
        case 'track':
          bestApiName = 'Search Tracks';
          break;
        case 'user':
          bestApiName = 'Search Tracks';
          break;
        case 'playlist':
          bestApiName = 'Search Playlists';
          break;
        default:
          bestApiName = null;
      }
    } else {
      bestApiName = 'Audius Web Search';
    }

    const bestApi = bestApiName ? input.apis.find((api: DatasetSchema) => api.api_name === bestApiName) || null : null;

    // Return the full state with updates
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
    description: 'Selects the best API based on whether it is an entity query, the type of entity, and available APIs.',
    schema: z.object({
      isEntityQuery: z.boolean(),
      entityType: z.enum(['track', 'user', 'playlist']).nullable(),
      apis: z.array(z.any()),
      query: z.string(),
      parameters: z.record(z.any()).nullable(),
      categories: z.array(z.string()).nullable(),
      llm: z.any().nullable(),
      queryType: z.string().nullable(),
      bestApi: z.any().nullable(),
      response: z.any().nullable(),
      complexity: z.string().nullable(),
      entityName: z.string().nullable(),
      error: z.boolean().nullable(),
      messages: z.any().nullable(),
      selectedHost: z.string().nullable(),
      entity: z.any().nullable(),
      secondaryApi: z.any().nullable(),
      secondaryResponse: z.any().nullable(),
      multiStepHandled: z.boolean().nullable(),
      initialState: z.any().nullable(),
      formattedResponse: z.string().nullable(),
      message: z.any().nullable(),
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

// Define the categorization function
export const CategorizeQueryTool = tool(
  async ({ state }: { state: { query: string } }): Promise<Partial<GraphState>> => {
    let normalizedQuery = state.query.toLowerCase().trim();

    // Check for track play count queries
    const trackPlayCountRegex = /how many plays does (the track )?(.*?) have\??/i;
    const trackPlayCountMatch = normalizedQuery.match(trackPlayCountRegex);

    if (trackPlayCountMatch) {
      const trackName = trackPlayCountMatch[2].trim();
      return {
        queryType: 'search_tracks' as QueryType,
        entityType: 'track' as EntityType,
        entityName: trackName,
        isEntityQuery: true,
        complexity: 'simple' as ComplexityLevel
      };
    }

    // Expand contractions
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
  
    // Enhanced entity extraction using NLP
    const entities = doc.terms().out('array');
    let mappedEntityType: EntityType | null = null;
  
    if (entities.length > 0) {
      const entity = entities[0].toLowerCase();
      switch (entity) {
        case 'tracks':
        case 'track':
          mappedEntityType = 'track';
          break;
        case 'users':
        case 'user':
          mappedEntityType = 'user';
          break;
        case 'playlists':
        case 'playlist':
          mappedEntityType = 'playlist';
          break;
        case 'genres':
        case 'genre':
          mappedEntityType = null; // Genres are not entities in our current system
          break;
      }
  
      return {
        queryType: mappedEntityType ? `search_${mappedEntityType}s` as QueryType : 'trending_tracks' as QueryType,
        isEntityQuery: !!mappedEntityType,
        entityType: mappedEntityType,
        complexity: mappedEntityType ? 'moderate' as ComplexityLevel : 'simple' as ComplexityLevel,
        entityName: mappedEntityType ? entity : null,
      };
    }
  
    // Default categorization for trending tracks
    if (/trending|popular|top tracks/i.test(normalizedQuery)) {
      return {
        queryType: 'trending_tracks' as QueryType,
        isEntityQuery: false,
        entityType: null,
        entityName: null,
        complexity: 'simple' as ComplexityLevel,
      };
    }
  
    // Final default return
    return {
      queryType: 'general' as QueryType,
      entityType: null,
      isEntityQuery: false,
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

/**
 * Tool to extract categories from the user's query.
 */
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

    // Ensure we have categories based on entityType
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
      categories, // Explicitly set categories based on entityType
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

export async function verifyParams(state: GraphState): Promise<Partial<GraphState>> {
  const requiredParameters = state.bestApi?.required_parameters?.map(param => param.name) || [];
  const missingParams = findMissingParams(requiredParameters, Object.keys(state.parameters || {}));

  if (missingParams.length > 0) {
    logger.info("Additional information needed to answer the question accurately.");
    logger.debug(`Missing parameters: ${missingParams.join(', ')}`);
    return {
      error: true,
      messages: "Missing parameters",
    };
  }
  return {
    error: false,
    messages: "Parameters verified successfully.",
  };
}


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



/**
 * Tool to extract parameters from a user's query.
 *
 * @param {GraphState} state - The current state of the graph.
 * @returns {Promise<Partial<GraphState>>} - The updated graph state with extracted parameters.
 */
export async function extractParameters(state: GraphState): Promise<Partial<GraphState>> {
  const { query } = state;

  // Update regex to extract track title and artist name separately
  const regex = /how many plays does\s+(.*?)\s+by\s+(.*?)\s*(have|\?|$)/i;
  const match = query?.match(regex);

  if (match && match[1] && match[2]) {
    // Remove trailing punctuation from track title and artist name
    const trackTitle = match[1].trim().replace(/[^\w\s]|_/g, "");
    const artistName = match[2].trim().replace(/[^\w\s]|_/g, "");
    console.log('extractParameters extracted parameters:', { trackTitle, artistName }); // Moved logging before return
    return {
      parameters: {
        trackTitle,
        artistName,
      },
    };
  }

  // If pattern doesn't match, try to extract just the track title
  const titleRegex = /how many plays does\s+(.*?)\s*(have|\?|$)/i;
  const titleMatch = query?.match(titleRegex);

  if (titleMatch && titleMatch[1]) {
    const trackTitle = titleMatch[1].trim().replace(/[^\w\s]|_/g, "");
    console.log('extractParameters extracted parameters:', { trackTitle, artistName: null }); // Added logging for missing artistName
    return {
      parameters: {
        trackTitle,
        artistName: null, // Explicitly set artistName to null
      },
    };
  }

  console.log('extractParameters failed to extract parameters from query:', query); // Added logging for failure
  throw new Error(
    "Could not extract track and artist information from the query."
  );
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
      return `High Level Category: ${high}\nTools:\n${allTools
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
 */
const existingApis: DatasetSchema[] = [
  // Populate with your DatasetSchema objects
  // Example:
  // {
  //   id: "1",
  //   category_name: "Music",
  //   tool_name: "PlaylistTool",
  //   api_name: "PlaylistAPI",
  //   api_description: "Fetches playlist data.",
  //   required_parameters: [...],
  //   optional_parameters: [...],
  //   method: "GET",
  //   api_url: "https://api.audius.co/playlists",
  // },
];

const initialQuery: string = "Find popular playlists for jazz music.";

// Instantiate the SelectAPITool
const selectAPIToolInstance = createSelectAPITool(existingApis, initialQuery);


// /**
//  * @param {GraphState} state
//  */
// export async function createFetchRequest(state: GraphState): Promise<Partial<GraphState>> {
//   const { bestApi, parameters } = state;

//   if (!bestApi) {
//     throw new Error("No best API found");
//   }

//   try {
//     let response;

//     switch (bestApi.api_name) {
//       // Tracks
//       case 'Get Track':
//         const trackId = parameters?.track_id;
//         if (!trackId) {
//           throw new Error("Track ID is required");
//         }
//         response = await sdk.tracks.getTrack({ trackId });
//         break;

//       case 'Search Tracks':
//         const trackTitle = parameters?.query || parameters?.trackTitle;
//         if (!trackTitle) {
//           throw new Error("Track title is required for searching tracks.");
//         }
//         response = await sdk.tracks.searchTracks({
//           query: trackTitle,
//           // limit and offset have been removed as they do not exist in SearchTracksRequest
//           onlyDownloadable: parameters?.onlyDownloadable,
//         });
//         break;

//       case 'Get Trending Tracks':
//         response = await sdk.tracks.getTrendingTracks({
//           genre: parameters?.genre || 'all',
//           time: parameters?.time || 'week'
//         });
//         break;

//       case 'Get Bulk Tracks':
//         const trackIds = parameters?.track_ids;
//         if (!trackIds) {
//           throw new Error("Track IDs are required for bulk fetching.");
//         }
//         const idsArray = trackIds.split(',').map((ids: string) => ids.trim());
//         response = await sdk.tracks.getBulkTracks({ id: idsArray });
//         break;

//       case 'Get Underground Trending Tracks':
//         response = await sdk.tracks.getTrendingTracks({
//           genre: parameters?.genre || 'all',
//           time: parameters?.time || 'week'
//         });
//         break;

//       case 'Stream Track':
//         const streamTrackId = parameters?.track_id;
//         if (!streamTrackId) {
//           throw new Error("Track ID is required for streaming.");
//         }
//         // Assuming the SDK provides a method to get stream URL
//         response = await sdk.tracks.getTrackStreamUrl({ trackId: streamTrackId });
//         break;

//       // Users
//       case 'Get User':
//         const userId = parameters?.user_id;
//         if (!userId) {
//           throw new Error("User ID is required");
//         }
//         response = await sdk.users.getUser({ id: userId });
//         break;

//       case 'Search Users':
//         const userQuery = parameters?.query;
//         if (!userQuery) {
//           throw new Error("Search query is required for searching users.");
//         }
//         response = await sdk.users.searchUsers({
//           query: userQuery
//         });
//         break;

//       case 'Get User By Handle':
//         const handle = parameters?.handle;
//         if (!handle) {
//           throw new Error("User handle is required");
//         }
//         response = await sdk.users.getUserByHandle({ handle });
//         break;

//       case 'Get User ID from Wallet':
//         const walletAddress = parameters?.associated_wallet;
//         if (!walletAddress) {
//           throw new Error("Associated wallet address is required");
//         }
//         response = await sdk.users.getUserIDFromWallet({ associatedWallet: walletAddress });
//         break;

//       case "Get User's Favorite Tracks":
//         const favoriteUserId = parameters?.user_id;
//         if (!favoriteUserId) {
//           throw new Error("User ID is required to fetch favorite tracks.");
//         }
//         response = await sdk.users.getFavorites({ id: favoriteUserId });
//         break;

//       case "Get User's Reposts":
//         const repostUserId = parameters?.user_id;
//         if (!repostUserId) {
//           throw new Error("User ID is required to fetch reposts.");
//         }
//         response = await sdk.users.getReposts({ id: repostUserId });
//         break;

//       case "Get User's Most Used Track Tags":
//         const tagsUserId = parameters?.user_id;
//         if (!tagsUserId) {
//           throw new Error("User ID is required to fetch most used track tags.");
//         }
//         response = await sdk.users.getTopTrackTags({ id: tagsUserId, limit: parameters?.limit ? Number(parameters.limit) : 10 });
//         break;

//       // Playlists
//       case 'Get Playlist':
//         const playlistId = parameters?.playlist_id;
//         if (!playlistId) {
//           throw new Error("Playlist ID is required");
//         }
//         response = await sdk.playlists.getPlaylist({ playlistId });
//         break;

//       case 'Search Playlists':
//         const playlistQuery = parameters?.query;
//         if (!playlistQuery) {
//           throw new Error("Search query is required for searching playlists.");
//         }
//         response = await sdk.playlists.searchPlaylists({
//           query: playlistQuery
//         });
//         break;

//       case 'Get Trending Playlists':
//         response = await sdk.playlists.getTrendingPlaylists({
//           time: parameters?.time || 'week',

//         });
//         break;

//       // General
//       case 'Audius Web Search':
//         const webSearchQuery = parameters?.["web-search"];
//         if (!webSearchQuery) {
//           throw new Error("Web search query is required.");
//         }
//         // Since this is an external API, use fetch directly
//         response = await fetch(`https://api.tavily.com/search?q=${encodeURIComponent(webSearchQuery)}`);
//         if (!response.ok) {
//           throw new Error(`Audius Web Search failed with status ${response.status}`);
//         }
//         response = await response.json();
//         break;

//       // Tips
//       case 'Get Tips':
//         const tipsUserId = parameters?.user_id;
//         if (!tipsUserId) {
//           throw new Error("User ID is required to fetch tips.");
//         }
//         response = await sdk.tips.getTips({ userId: tipsUserId, limit: parameters?.limit ? Number(parameters.limit) : 10, offset: parameters?.offset ? Number(parameters.offset) : 0 });
//         break;

//       default:
//         throw new Error(`Unsupported API: ${bestApi.api_name}`);
//     }

//     return { response };
//   } catch (error) {
//     console.error('Error in createFetchRequest:', error);
//     throw error;
//   }
// }


// Updated response formatters leveraging the types.ts definitions
const responseFormatters: { [key: string]: (data: any) => string } = {
  'Search Tracks': (data) => {
    const { title, user, playCount } = data; // Changed play_count to playCount
    const artistName = user?.name || user?.handle || "Unknown Artist";
    if (typeof playCount === 'number') {
      return `${title} by ${artistName} has ${playCount} plays on Audius.`;
    } else {
      logger.warn(`playCount is missing or invalid for track ID ${data.id}`);
      return `${title} by ${artistName} has an unknown number of plays on Audius.`;
    }
  },
  'Get User': (data) => {
    const { name, handle, followerCount } = data; // Changed followers_count to followerCount
    return `${name || handle} has ${followerCount} followers on Audius.`;
  },
  'Search Playlists': (data) => {
    const { playlistName, trackCount, user } = data; // Changed title to playlistName and tracks_count to trackCount
    const creator = user?.name || user?.handle || "Unknown Creator";
    return `Playlist "${playlistName}" by ${creator} contains ${trackCount} tracks on Audius.`;
  },
  'Get Playlist Details': (data) => {
    const { playlistName, trackCount, user, favoriteCount } = data;
    const creator = user?.name || user?.handle || "Unknown Creator";
    return `Playlist "${playlistName}" by ${creator} has ${trackCount} tracks and is favorited ${favoriteCount} times on Audius.`;
  },
  // Add more formatters as needed for other APIs
};

/**
 * Tool to create and execute API fetch requests based on `bestApi` and `parameters`, including response formatting.
 *
 * @param {object} input - The input object containing `bestApi` and `parameters`.
 * @returns {Promise<{ response: string }>} - The formatted response string.
 */
export const createFetchRequestTool = tool(
  async (input: Record<string, any>): Promise<Partial<GraphState>> => {
    const { bestApi, parameters } = input;

    if (!bestApi || !parameters) {
      throw new Error("Missing required input properties");
    }

    try {
      let apiResponse: any;

      switch (bestApi.api_name) {
        case 'Search Tracks':
          const searchQuery = parameters.trackTitle || parameters.query;
          if (!searchQuery) {
            throw new Error("Track title or query is required for searching tracks.");
          }
          // Search for tracks matching the query
          const searchResponse = await sdk.tracks.searchTracks({
            query: searchQuery,
          });

          // Check if tracks were found
          if (searchResponse.data && searchResponse.data.length > 0) {
            const track = searchResponse.data[0];
            const trackId = track.id;

            // Fetch detailed track information using track ID
            const trackResponse = await sdk.tracks.getTrack({ trackId });
            apiResponse = trackResponse;

            // Ensure data is in expected format
            if (!apiResponse.data) {
              throw new Error("No track information available.");
            }

            // Log the detailed track information for debugging
            logger.debug('Detailed Track Response:', JSON.stringify(apiResponse.data, null, 2));
          } else {
            throw new Error(`No tracks found for query "${searchQuery}".`);
          }
          break;

        // Users
        case 'Get User':
          const userId = parameters?.user_id;
          if (!userId) {
            throw new Error("User ID is required");
          }
          apiResponse = await sdk.users.getUser({ id: userId });
          break;

        case 'Search Users':
          const userQuery = parameters?.userName || parameters?.query;
          if (!userQuery) {
            throw new Error("User name is required for searching users.");
          }
          apiResponse = await sdk.users.searchUsers({
            query: userQuery,
          });
          break;

        // Playlists
        case 'Get Playlist':
          const playlistId = parameters?.playlist_id;
          if (!playlistId) {
            throw new Error("Playlist ID is required");
          }
          apiResponse = await sdk.playlists.getPlaylist({ playlistId });
          break;

        case 'Search Playlists':
          const playlistQuery = parameters?.playlistName || parameters?.query;
          if (!playlistQuery) {
            throw new Error("Playlist name is required for searching playlists.");
          }
          apiResponse = await sdk.playlists.searchPlaylists({
            query: playlistQuery,
          });
          break;

        // General
        case 'Audius Web Search':
          const webSearchQuery = parameters?.["web-search"] || parameters?.query;
          if (!webSearchQuery) {
            throw new Error("Web search query is required.");
          }
          apiResponse = await fetch(`https://api.tavily.com/search?q=${encodeURIComponent(webSearchQuery)}`);
          if (!apiResponse.ok) {
            throw new Error(`Audius Web Search failed with status ${apiResponse.status}`);
          }
          apiResponse = await apiResponse.json();
          break;

        // Add other cases as needed...

        default:
          throw new Error(`Unsupported API: ${bestApi.api_name}`);
      }

      // Format the response using the appropriate formatter
      const formatter = responseFormatters[bestApi.api_name];
      let formattedResponse = '';

      if (formatter && apiResponse.data) {
        formattedResponse = formatter(apiResponse.data);
      } else {
        formattedResponse = "No information available to format the response.";
        logger.warn(`No formatter found for API: ${bestApi.api_name} or apiResponse.data is missing.`);
      }

      return {
        ...input,
        response: formattedResponse,
        parameters,
        bestApi,
      };
    } catch (error) {
      logger.error('Error in createFetchRequestTool:', error);
      throw error;
    }
  },
  {
    name: "create_fetch_request",
    description: "Executes the selected API and formats the response.",
    schema: z.object({
      bestApi: z.any(),
      parameters: z.record(z.any()),
    }).passthrough(),
  }
);

/**
 * Tool to extract parameters from the user's query based on the entity type.
 */
export const extractParametersTool = tool(
  async (input: Record<string, any>): Promise<Partial<GraphState>> => {
    if (!input.query || !input.entityType) {
      throw new Error("Query and entityType are required");
    }

    let extractedParams: Record<string, any> = {};
    const query = input.query;
    const entityType = input.entityType;

    logger.debug(`extractParametersTool invoked with query: "${query}" and entityType: "${entityType}"`);

    switch(entityType) {
      case 'track':
        // Extract trackTitle and artistName
        const trackRegex = /how many plays does\s+(.*?)\s+by\s+(.*?)\s*(have|\?|$)/i;
        const trackMatch = query.match(trackRegex);
        if (trackMatch && trackMatch[1]) {
          extractedParams.trackTitle = trackMatch[1].trim();
          if (trackMatch[2]) {
            extractedParams.artistName = trackMatch[2].trim();
          }
        } else {
          // Handle cases without artist name
          const simpleTrackRegex = /how many plays does\s+(.*?)\s*(have|\?|$)/i;
          const simpleTrackMatch = query.match(simpleTrackRegex);
          if (simpleTrackMatch && simpleTrackMatch[1]) {
            extractedParams.trackTitle = simpleTrackMatch[1].trim();
          } else {
            throw new Error("Could not extract track title from the query.");
          }
        }
        break;

      case 'user':
        // Extract userName
        const userRegex = /how many followers does\s+(.*?)\s*(have|\?|$)/i;
        const userMatch = query.match(userRegex);
        if (userMatch && userMatch[1]) {
          extractedParams.userName = userMatch[1].trim();
        } else {
          throw new Error("Could not extract user name from the query.");
        }
        break;

      case 'playlist':
        // Extract playlistName
        const playlistRegex = /how many tracks are in\s+(.*?)\s*(have|\?|$)/i;
        const playlistMatch = query.match(playlistRegex);
        if (playlistMatch && playlistMatch[1]) {
          extractedParams.playlistName = playlistMatch[1].trim();
        } else {
          throw new Error("Could not extract playlist name from the query.");
        }
        break;

      default:
        throw new Error(`Unsupported entityType: ${entityType}`);
    }

    logger.debug(`Extracted Parameters: ${JSON.stringify(extractedParams)}`);

    return {
      ...input,
      parameters: {
        ...(input.parameters || {}),
        ...extractedParams,
      },
    };
  },
  {
    name: "extract_parameters",
    description: "Extracts necessary parameters based on the entity type from the user query.",
    schema: z.object({
      query: z.string(),
      entityType: z.enum(['track', 'user', 'playlist']),
      parameters: z.record(z.any()).nullable(),
      isEntityQuery: z.boolean(),
      apis: z.array(z.any()),
      categories: z.array(z.string()),
      bestApi: z.any(),
      // Include other state properties as nullable
      llm: z.any().nullable(),
      queryType: z.string().nullable(),
      response: z.any().nullable(),
      complexity: z.string().nullable(),
      entityName: z.string().nullable(),
      error: z.boolean().nullable(),
      messages: z.any().nullable(),
      selectedHost: z.string().nullable(),
      entity: z.any().nullable(),
      secondaryApi: z.any().nullable(),
      secondaryResponse: z.any().nullable(),
      multiStepHandled: z.boolean().nullable(),
      initialState: z.any().nullable(),
      formattedResponse: z.string().nullable(),
      message: z.any().nullable(),
    }).passthrough(),
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

  // Parse the JSON and access the endpoints array
  const allData: any = JSON.parse(fs.readFileSync(TRIMMED_CORPUS_PATH, "utf8"));
  const endpoints = allData.endpoints;

  logger.debug('All available APIs:', endpoints.map((api: { api_name: string }) => api.api_name));

  // Remove duplicate APIs based on 'api_name'
  const uniqueApis = Array.from(
    new Map(endpoints.map((api: any) => [api.api_name, api])).values()
  );

  // Validate that each API has the required fields
  const validatedApis = uniqueApis.filter((api: any) => {
    const hasRequiredFields = api.api_name && Array.isArray(api.required_parameters);
    if (!hasRequiredFields) {
      logger.warn(`API "${api.api_name || 'Unnamed API'}" is missing required fields and will be excluded.`);
    }
    return hasRequiredFields;
  });

  // Transform validated APIs to match DatasetSchema
  const transformedApis: DatasetSchema[] = validatedApis.map((api: any) => ({
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

  const apis = state.categories
    .map((category) => {
      // Filter APIs by category_name
      const matchedApis = transformedApis.filter((endpoint: DatasetSchema) => endpoint.category_name === category);
      logger.debug(`Matched APIs for category "${category}":`, matchedApis.map((api: DatasetSchema) => api.api_name));
      return matchedApis;
    })
    .flat();

  // Ensure 'apis' is not empty after filtering and validation
  if (apis.length === 0) {
    logger.error("No valid APIs found for the given categories after filtering.");
    throw new Error("No valid APIs available for selection after filtering.");
  }

  logger.debug('APIs selected for the query:', apis.map((api: DatasetSchema) => api.api_name));

  return {
    ...state,
    apis,
  };
}

/**
 * List of all tools used in the ecosystem.
 */
export const ALL_TOOLS_LIST: { [key: string]: StructuredToolInterface | RunnableToolLike | Promise<Partial<GraphState>> | ((state: GraphState) => Promise<Partial<GraphState>>) } = {
  extractCategory: extractCategoryTool,
  extractParameters: extractParameters,
  readUserInputTool,
  ExtractHighLevelCategoriesTool,
  createFetchRequest: createFetchRequestTool,
  selectApi: selectAPIToolInstance,
  readUserInput: readUserInputTool // Use the instantiated tool
  // Add other tools here as needed
};





































