import { logger } from '../logger.js';
import { GraphState } from "../types.js";
import {
  extractParam,
} from './utils/extractionUtils/extractionUtils.js';
import { extractWebSearchQuery } from './extraction/searchExtraction.js';
import { extractTrendingTracksParameters } from './utils/extractionUtils/extractTrendingTracksParameters.js';
import { extractSearchTracksParameters } from './utils/extractionUtils/extractSearchTracksParameters.js';
import { extractUserParameters } from './utils/extractionUtils/extractUserParameters.js';
import { extractPlaylistParameters } from './utils/extractionUtils/extractPlaylistParameters.js';
import { extractTrackParameters } from './utils/extractionUtils/extractTrackParameters.js';
import { isTrackData, isUserData, isPlaylistData } from './utils/typeGuards.js';
/**
 * Extracts parameters from the GraphState based on the query type and entity.
 * @param state - The current state of the GraphState.
 * @returns The updated GraphState with extracted parameters or an error message.
 */
export async function extractParameters(state: GraphState): Promise<GraphState> {
  try {
    const { query, queryType, entityType, entity } = state;

    if (!queryType) {
      throw new Error('No query type specified');
    }

    let params: Record<string, any> = {};

    switch (queryType) {
      case 'trending_tracks':
        params = extractTrendingTracksParameters(query, null);
        break;

      case 'search_tracks':
        if (isTrackData(entity)) {
          params = extractSearchTracksParameters(query, entity.title);
        } else {
          params = extractSearchTracksParameters(query, null);
        }
        break;

      case 'user_info':
        if (isUserData(entity)) {
          params = extractUserParameters(query, entity.name);
        } else {
          params = extractUserParameters(query, null);
        }
        break;

      case 'playlist_info':
        if (isPlaylistData(entity)) {
          params = extractPlaylistParameters(query, entity.playlistName);
        } else {
          params = extractPlaylistParameters(query, null);
        }
        break;

      case 'track_info':
        if (isTrackData(entity)) {
          params = extractTrackParameters(query, entity.title);
        } else {
          params = extractTrackParameters(query, null);
        }
        break;

      case 'web_search':
        params = { searchQuery: extractWebSearchQuery(query) };
        break;

      // Add other cases as needed

      default:
        throw new Error(`Unsupported query type: ${queryType}`);
    }

    // Additional parameter extraction using extractParam if needed
    // Example:
    // params.track_id = extractParam("track_id", query);
    // params.limit = extractParam("limit", query);
    // ... and so on for other parameters.

    logger.info(`Extracted parameters: ${JSON.stringify(params)}`);
    return { ...state, params };
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error(`Error in extractParameters: ${error.message}`, { stack: error.stack });
      return { ...state, error: error.message };
    } else {
      logger.error('Unknown error in extractParameters');
      return { ...state, error: 'An unknown error occurred' };
    }
  }
}