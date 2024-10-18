import { GraphState, DatasetSchema } from "../types.js";
import { logger } from "../logger.js";
import { z } from "zod";
import { StructuredTool } from "@langchain/core/tools";

const RELEVANCE_THRESHOLD = 0.5;

export class SelectApiTool extends StructuredTool {
  name = 'select_api';
  description = 'Select the most relevant API based on the query and entity type.';

  schema = z.object({
    state: z.object({
      queryType: z.string().optional(),
      apis: z.array(z.any()).optional(),
      bestApi: z.any().nullable().optional(),
      entityType: z.enum(['user', 'track', 'playlist']).nullable().optional(),
      categories: z.array(z.string()).optional(),
      isEntityQuery: z.boolean().optional(),
      // ... include other necessary fields from GraphState
    }),
  });

  async _call({ state }: z.infer<typeof this.schema>): Promise<Partial<GraphState>> {
    const { queryType, entityType, apis, isEntityQuery, categories } = state;

    if (!apis || apis.length === 0) {
      logger.warn("No APIs available for selection");
      return {
        error: true,
        message: "Failed to select an API: No APIs available for selection."
      };
    }

    const relevantApis = apis
      .map(api => {
        const relevance = calculateRelevance(api, entityType || null, queryType || null, categories || [], isEntityQuery || false);
        logger.debug(`API: ${api.api_name}, Relevance: ${relevance}`);
        return { api, relevance };
      })
      .filter(item => item.relevance >= RELEVANCE_THRESHOLD)
      .sort((a, b) => b.relevance - a.relevance);

    if (relevantApis.length === 0) {
      logger.warn("No relevant APIs found based on relevance scores");
      return {
        error: true,
        message: "Failed to select an API: No APIs matched the query's relevance criteria."
      };
    }

    const selected = relevantApis[0];
    logger.info(`Selected API: ${selected.api.api_name} with relevance ${selected.relevance}`);

    // Set a default limit if not specified and applicable
    const parameters = selected.api.default_parameters || {};
    if (isEntityQuery && !parameters.limit) {
      parameters.limit = 5;
      logger.info(`Set default limit to ${parameters.limit}`);
    }

    return {
      bestApi: selected.api,
      parameters,
      error: false
    };
  }
}

function calculateRelevance(
  api: DatasetSchema,
  entityType: string | null,
  queryType: string | null,
  categories: string[],
  isEntityQuery?: boolean
): number {
  let relevance = 0;
  const apiNameLower = api.api_name.toLowerCase();

  logger.debug(`Calculating relevance for API: ${api.api_name}`);

  // Base relevance based on query type and API category/name
  if (
    (queryType === 'user_info' && api.category_name.toLowerCase() === 'users') ||
    (queryType === 'track_info' && api.category_name.toLowerCase() === 'tracks') ||
    (queryType === 'playlist_info' && api.category_name.toLowerCase() === 'playlists') ||
    (queryType === 'trending_tracks' && (apiNameLower.includes('trending') || apiNameLower.includes('popular'))) ||
    (queryType === 'user_tracks' && apiNameLower.includes('user') && apiNameLower.includes('tracks')) ||
    (queryType === 'user_social' && apiNameLower.includes('user') && (apiNameLower.includes('follow') || apiNameLower.includes('social'))) ||
    (queryType === 'genre_info' && (apiNameLower.includes('trending') || apiNameLower.includes('genre'))) || // Updated condition
    (queryType === 'search_tracks' && apiNameLower.includes('search'))
  ) {
    relevance += 5;
    logger.debug(`Query type and API name/category match: +5 relevance`);
  }

  // Additional relevance based on entity type
  if (isEntityQuery && entityType) {
    if (apiNameLower.includes(entityType.toLowerCase())) {
      relevance += 4;
      logger.debug(`Entity type match: +4 relevance`);
    }
    if (apiNameLower.includes('search')) {
      relevance += 1;
      logger.debug(`API name includes 'search': +1 relevance`);
    }
  }

  // Boost relevance for APIs related to trending tracks in genre_info queries
  if (
    queryType === 'genre_info' &&
    (apiNameLower.includes('trending_tracks') || apiNameLower.includes('genres'))
  ) {
    relevance += 10; // Increased boost
    logger.debug(`Query type match: +10 relevance`);
  }

  // Decrease relevance for less appropriate APIs
  if (
    queryType === 'genre_info' &&
    apiNameLower.includes('search')
  ) {
    relevance -= 5;
    logger.debug(`Less relevant API for genre_info: -5 relevance`);
  }

  // Additional relevance based on entity type
  if (isEntityQuery && entityType) {
    if (apiNameLower.includes(entityType.toLowerCase())) {
      relevance += 4;
      logger.debug(`Entity type match: +4 relevance`);
    }

    logger.debug(`Less relevant API for genre_info (search): -5 relevance`);
  }

  // Adjust category matching weight
  const apiCategories = api.category_name.split(',').map((cat: string) => cat.trim().toLowerCase());
  const matchingCategories = categories.filter((cat: string) => apiCategories.includes(cat.toLowerCase()));
  relevance += matchingCategories.length * 0.5;
  logger.debug(`Matching categories (${matchingCategories.length}): +${matchingCategories.length * 0.5} relevance`);

  return relevance;
}

export const selectApi = (state: GraphState): Partial<GraphState> => {
  const { query, queryType, entityType, categories, isEntityQuery, apis } = state;

  if (!apis || apis.length === 0) {
    logger.warn("No APIs available for selection");
    return { error: true };
  }

  const relevantApis = apis
    .map(api => {
      const relevance = calculateRelevance(api, entityType || null, queryType, categories || [], isEntityQuery || false);
      logger.debug(`API: ${api.api_name}, Relevance: ${relevance}`);
      return { api, relevance };
    })
    .filter(item => item.relevance >= RELEVANCE_THRESHOLD)
    .sort((a, b) => b.relevance - a.relevance);

  if (relevantApis.length === 0) {
    logger.warn("No relevant APIs found based on relevance scores");
    return {
      error: true,
      message: "Failed to select an API: No APIs matched the query's relevance criteria."
    };
  }

  const selected = relevantApis[0];
  logger.info(`Selected API: ${selected.api.api_name} with relevance ${selected.relevance}`);

  // Set a default limit if not specified and applicable
  const parameters = selected.api.default_parameters || {};
  if (isEntityQuery && !parameters.limit) {
    parameters.limit = 5;
    logger.info(`Set default limit to ${parameters.limit}`);
  }

  return {
    bestApi: selected.api,
    parameters,
    error: false
  };
};
