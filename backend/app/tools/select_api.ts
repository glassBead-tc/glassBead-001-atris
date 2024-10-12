import { GraphState, DatasetSchema } from "../types.js";
import { logger } from '../logger.js';
import { calculateRelevance } from '../utils/relevanceCalculations.js';
import { apiConfig } from "../audiusApiConfig.js";

const RELEVANCE_THRESHOLD = 0.3; // Minimum relevance score to consider an API

export async function selectApi(state: GraphState): Promise<GraphState> {
  const { query } = state;
  const lowercaseQuery = query.toLowerCase();

  let selectedApi: DatasetSchema | null = null;

  // First, try to match based on specific keywords
  selectedApi = keywordBasedSelection(lowercaseQuery);

  // If no specific match was found, calculate relevance for each API
  if (!selectedApi) {
    selectedApi = relevanceBasedSelection(query);
  }

  if (selectedApi) {
    logger.debug(`Selected API: ${selectedApi.api_name}, Query: "${query}"`);
    return { ...state, bestApi: selectedApi };
  } else {
    logger.warn(`No suitable API found for query: "${query}"`);
    return { ...state, error: "I'm sorry, but I couldn't find a suitable API to answer your question. Could you please rephrase or provide more details?" };
  }
}

function keywordBasedSelection(lowercaseQuery: string): DatasetSchema | null {
  const apiEndpoint = findApiEndpoint(lowercaseQuery);
  return apiEndpoint ? createDatasetSchema(apiEndpoint) : null;
}

function relevanceBasedSelection(query: string): DatasetSchema | null {
  let selectedApiEndpoint: string | null = null;
  let highestRelevance = -1;

  for (const apiEndpoint of Object.keys(apiConfig)) {
    const relevance = calculateRelevance(query, apiEndpoint);
    if (relevance > highestRelevance && relevance >= RELEVANCE_THRESHOLD) {
      highestRelevance = relevance;
      selectedApiEndpoint = apiEndpoint;
    }
  }

  return selectedApiEndpoint ? createDatasetSchema(selectedApiEndpoint) : null;
}

function findApiEndpoint(lowercaseQuery: string): string | null {
  if (lowercaseQuery.includes('trending') || lowercaseQuery.includes('top') || lowercaseQuery.includes('popular')) {
    return '/v1/tracks/trending';
  } else if (lowercaseQuery.includes('most followers') || lowercaseQuery.includes('most followed') || lowercaseQuery.includes('popular artist')) {
    return '/v1/users/search';
  } else if (lowercaseQuery.includes('genre') || lowercaseQuery.includes('track') || lowercaseQuery.includes('song')) {
    return '/v1/tracks/search';
  } else if (lowercaseQuery.includes('latest releases') || lowercaseQuery.includes('new music')) {
    return '/v1/tracks/trending';
  } else if (lowercaseQuery.includes('playlist')) {
    return '/v1/playlists/search';
  } else if (lowercaseQuery.includes('favorite') || lowercaseQuery.includes('liked')) {
    return '/v1/users/{user_id}/favorites';
  } else if (lowercaseQuery.includes('repost')) {
    return '/v1/users/{user_id}/reposts';
  } else if (lowercaseQuery.includes('underground')) {
    return '/v1/tracks/trending/underground';
  }
  return null;
}

function createDatasetSchema(apiEndpoint: string): DatasetSchema {
  const config = apiConfig[apiEndpoint];
  return {
    id: `audius_${apiEndpoint.replace(/\//g, '_')}`,
    category_name: 'Audius',
    tool_name: `Audius ${apiEndpoint}`,
    api_name: apiEndpoint,
    api_description: `API endpoint for ${apiEndpoint}`,
    required_parameters: config.required.map(param => ({
      name: param,
      type: 'string',
      description: `Required parameter: ${param}`,
      default: ''
    })),
    optional_parameters: config.optional.map(param => ({
      name: param,
      type: 'string',
      description: `Optional parameter: ${param}`,
      default: ''
    })),
    method: 'GET',
    api_url: `https://discoveryprovider.audius.co${apiEndpoint}`,
    parameters: {}
  };
}
