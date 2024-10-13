import { logger } from '../logger.js';
import { GraphState } from "../types.js";
import { globalAudiusApi } from '../services/audiusApi.js';

export function extractUserName(query: string): string {
  const userNameMatch = query.match(/(?:about|for|by)\s+([^?.,]+)/i);
  return userNameMatch ? userNameMatch[1].trim() : '';
}

export async function extractParameters(state: GraphState): Promise<GraphState> {
  try {
    const { query, queryType, entityType, entity } = state;

    if (!queryType) {
      throw new Error('No query type specified');
    }

    let params: Record<string, any> = {};

    switch (queryType) {
      case 'trending_tracks':
        params = extractTrendingTracksParameters(query, entityType);
        break;
      case 'search_tracks':
        params = extractSearchTracksParameters(query, entity);
        break;
      case 'user_social':
      case 'user_info':
      case 'user_tracks':
      case 'user_playlists':
        params = await extractUserParameters(query, entity);
        break;
      case 'playlist_info':
        params = await extractPlaylistParameters(query, entity);
        break;
      case 'track_info':
        params = await extractTrackParameters(query, entity);
        break;
      case 'genre_info':
        params = extractGenreParameters(query, entity);
        break;
      case 'playback':
        // Implement playback parameters extraction if needed
        break;
      case 'company_info':
        // No parameters needed for company info
        break;
      case 'general':
        params = { query: query };
        break;
      default:
        throw new Error(`Unsupported query type: ${queryType}`);
    }

    logger.info(`Extracted parameters: ${JSON.stringify(params)}`);
    return { ...state, params };
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error(`Error in extractParameters: ${error.message}`, { stack: error.stack });
      return { ...state, error: error.message };
    } else {
      logger.error(`Unknown error in extractParameters`);
      return { ...state, error: 'An unknown error occurred' };
    }
  }
}

function extractTrendingTracksParameters(query: string, entityType: string | null): Record<string, any> {
  let params: Record<string, any> = { limit: 5 }; // Default to top 5 tracks

  if (entityType === 'track') {
    const limitMatch = query.match(/top\s+(\d+)/i);
    if (limitMatch) {
      params.limit = parseInt(limitMatch[1], 10);
    }

    const timeMatch = query.match(/(\w+)\s+time/i);
    if (timeMatch) {
      params.time = timeMatch[1].toLowerCase();
    }
  }

  logger.info(`Extracted trending tracks parameters: ${JSON.stringify(params)}`);
  return params;
}

async function extractPlaylistParameters(query: string, entity: string | null): Promise<Record<string, any>> {
  const playlistName = entity || query.match(/'([^']+)'/)?.[ 1 ] || '';
  if (playlistName) {
    try {
      const searchResult = await globalAudiusApi.searchPlaylists(playlistName);
      if (searchResult && searchResult.data && searchResult.data.length > 0) {
        return { playlist_id: searchResult.data[0].id };
      }
    } catch (error) {
      logger.error(`Error searching for playlist: ${error}`);
    }
  }
  return { query: playlistName || query };
}

async function extractTrackParameters(query: string, entity: string | null): Promise<Record<string, any>> {
  const trackNameMatch = entity || query.match(/'([^']+)'/)?.[ 1 ] || '';
  if (trackNameMatch) {
    const artistMatch = query.match(/by\s+([^']+)/i);
    const artistName = artistMatch ? artistMatch[1].trim() : '';
    try {
      const searchResult = await globalAudiusApi.searchTracks(`${trackNameMatch} ${artistName}`);
      if (searchResult && searchResult.data && searchResult.data.length > 0) {
        return { track_id: searchResult.data[0].id };
      }
    } catch (error) {
      logger.error(`Error searching for track: ${error}`);
    }
    return {
      query: `"${trackNameMatch}" "${artistName}"`,
      limit: 10
    };
  }
  return { query: trackNameMatch || query, limit: 10 };
}

async function extractUserParameters(query: string, entity: string | null): Promise<Record<string, any>> {
  const userName = entity || extractUserName(query);
  logger.info(`Extracted user name: "${userName}"`);
  if (userName) {
    try {
      const searchResult = await globalAudiusApi.searchUsers(userName);
      if (searchResult && searchResult.data && searchResult.data.length > 0) {
        return { user_id: searchResult.data[0].id };
      }
    } catch (error) {
      logger.error(`Error searching for user: ${error}`);
    }
  }
  return { query: userName || query, limit: 1 };
}

function extractGenreParameters(query: string, entity: string | null): Record<string, any> {
  const genreName = entity || query.match(/\b(\w+)\s+genre\b/i)?.[1] || '';
  return { genre: genreName || query, limit: 10 };
}

function extractSearchTracksParameters(query: string, entity: string | null): Record<string, any> {
  return { query: entity || query, limit: 10 };
}
