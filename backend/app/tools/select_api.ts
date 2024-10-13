import { GraphState, DatasetSchema } from "../types.js";
import { logger } from '../logger.js';

const RELEVANCE_THRESHOLD = 0.5;

function calculateRelevance(api: DatasetSchema, query: string, queryType: string, entityType: string | null, categories: string[], isEntityQuery: boolean): number {
  let relevance = 0;
  const queryLower = query.toLowerCase();
  const apiDescriptionLower = api.api_description.toLowerCase();
  const apiNameLower = api.api_name.toLowerCase();

  logger.debug(`Calculating relevance for API: ${api.api_name}`);

  if (
    (queryType === 'user_info' && api.category_name === 'Users') ||
    (queryType === 'track_info' && api.category_name === 'Tracks') ||
    (queryType === 'playlist_info' && api.category_name === 'Playlists') ||
    (queryType === 'trending_tracks' && (apiNameLower.includes('trending') || apiNameLower.includes('popular'))) ||
    (queryType === 'user_tracks' && apiNameLower.includes('user') && apiNameLower.includes('tracks')) ||
    (queryType === 'user_social' && apiNameLower.includes('user') && (apiNameLower.includes('follow') || apiNameLower.includes('social'))) ||
    (queryType === 'genre_info' && apiNameLower.includes('genre')) ||
    (queryType === 'search_tracks' && apiNameLower.includes('search'))
  ) {
    relevance += 5;
    logger.debug(`Query type match: +5 relevance`);
  }

  if (isEntityQuery && entityType) {
    if (apiNameLower.includes(entityType)) {
      relevance += 4;
      logger.debug(`Entity type match: +4 relevance`);
    }
    if (apiNameLower.includes('search')) {
      relevance += 3;
      logger.debug(`Search API for entity query: +3 relevance`);
    }
  }

  categories.forEach(category => {
    if (api.category_name.toLowerCase().includes(category.toLowerCase())) {
      relevance += 2;
      logger.debug(`Category match (${category}): +2 relevance`);
    }
  });

  if (apiDescriptionLower.includes(queryLower)) {
    relevance += 3;
    logger.debug(`Query found in API description: +3 relevance`);
  }

  if (apiNameLower.includes(queryLower)) {
    relevance += 4;
    logger.debug(`Query found in API name: +4 relevance`);
  }

  logger.debug(`Final relevance score for ${api.api_name}: ${relevance}`);
  return relevance;
}

export const selectApi = (state: GraphState): Partial<GraphState> => {
  logger.info("selectApi function called"); // Added log
  logger.debug("selectApi called with state:", JSON.stringify(state));

  const { query, apis, queryType, entityType, categories, isEntityQuery = false } = state;

  logger.info(`Selecting API for query: ${query} (Type: ${queryType}, Entity: ${entityType}, Categories: ${categories?.join(', ')}, IsEntityQuery: ${isEntityQuery})`);
  logger.debug(`Full state received in selectApi: ${JSON.stringify(state)}`);

  if (!apis || apis.length === 0) {
    logger.error("No APIs available for selection");
    return {
      error: "No APIs available",
      message: "Failed to select an API: No APIs were available for selection."
    };
  }

  logger.info(`Total APIs available for selection: ${apis.length}`);

  if (queryType === 'trending_tracks') {
    const trendingTracksApi = apis.find(api => api.api_name.toLowerCase().includes('trending') && api.api_name.toLowerCase().includes('tracks'));
    if (trendingTracksApi) {
      logger.info(`Selected API for trending tracks: ${trendingTracksApi.api_name}`);
      return {
        bestApi: trendingTracksApi,
        error: null
      };
    } else {
      logger.warn("No specific trending tracks API found, falling back to relevance calculation");
    }
  }

  const relevantApis = apis
    .map(api => {
      const relevance = calculateRelevance(api, query, queryType, entityType, categories, isEntityQuery);
      logger.debug(`API: ${api.api_name}, Relevance: ${relevance}`);
      return { api, relevance };
    })
    .filter(item => item.relevance > RELEVANCE_THRESHOLD)
    .sort((a, b) => b.relevance - a.relevance);

  logger.info(`Relevant APIs found: ${relevantApis.length}`);

  if (relevantApis.length > 0) {
    const bestApi = relevantApis[0].api;
    logger.info(`Selected API: ${bestApi.api_name} with relevance ${relevantApis[0].relevance}`);

    if (relevantApis.length > 1) {
      return {
        bestApi,
        secondaryApi: relevantApis[1].api,
        message: `Primary API selected: ${bestApi.api_name}, Secondary API: ${relevantApis[1].api.api_name}`
      };
    }
    
    return { bestApi, message: `API selected: ${bestApi.api_name}` };
  }

  logger.warn("No APIs passed the relevance threshold, attempting to find a general API");
  const generalApi = apis.find(api => 
    api.api_name.toLowerCase().includes('search') || 
    api.api_name.toLowerCase().includes('trending') ||
    api.api_name.toLowerCase().includes('popular')
  );
  if (generalApi) {
    logger.info(`Selected general API: ${generalApi.api_name}`);
    return {
      bestApi: generalApi,
      error: null
    };
  }

  logger.error(`No suitable API found for the given query. Query type: ${queryType}, Entity type: ${entityType}, Categories: ${categories.join(', ')}, Query: ${query}`);
  return {
    error: "No suitable API found",
    message: "Failed to select an API: No suitable API was found for the given query. Please try rephrasing your question or providing more specific information."
  };
};