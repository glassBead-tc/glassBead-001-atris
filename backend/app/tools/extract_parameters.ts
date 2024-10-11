import { logger } from '../logger.js';
import { GraphState } from "../types.js";
import { globalAudiusApi } from './create_fetch_request.js';
import { parseQuery } from "../utils/searchUtils.js";

export const extractParameters = async (state: GraphState): Promise<Partial<GraphState>> => {
  const { query, bestApi } = state;

  if (!bestApi) {
    return { error: "No API selected" };
  }

  let params: Record<string, any> = {};

  try {
    const parsedQuery = parseQuery(query);
    logger.debug(`Parsed query for parameter extraction: ${JSON.stringify(parsedQuery)}`);

    if (bestApi.api_name === 'Get Trending Tracks') {
      const numberMatch = query.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/i);
      if (numberMatch) {
        const numberWord = numberMatch[1].toLowerCase();
        const numberMap: Record<string, number> = {
          'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
          'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
        };
        const limit = numberMap[numberWord] || parseInt(numberWord);
        params.limit = Math.min(limit, 100); // Cap at 100 to prevent excessive requests
      } else {
        params.limit = 5; // Default to 5 if no number is specified
      }
    } else if (bestApi.api_name === 'Get Playlist' || bestApi.api_name === 'Search Playlists') {
      // Existing playlist logic
      const playlistNameMatch = query.match(/'([^']+)'/);
      if (playlistNameMatch) {
        const playlistName = playlistNameMatch[1];
        const searchResult = await globalAudiusApi.searchPlaylists(playlistName);
        if (searchResult && searchResult.data && searchResult.data.length > 0) {
          params.playlist_id = searchResult.data[0].id;
        } else {
          return { error: "No playlist found for the given name" };
        }
      } else {
        params.query = query;
      }
    } else if (bestApi.api_name === 'Get Track' || bestApi.api_name === 'Search Tracks') {
      // Existing track logic
      const trackNameMatch = query.match(/'([^']+)'/);
      if (trackNameMatch) {
        const trackName = trackNameMatch[1];
        const searchResult = await globalAudiusApi.searchTracks(trackName);
        if (searchResult && searchResult.data && searchResult.data.length > 0) {
          params.track_id = searchResult.data[0].id;
        } else {
          return { error: "No track found for the given name" };
        }
      } else {
        params.query = query;
      }
    }

    // Add logic for other API types based on parsedQuery
    switch (parsedQuery.type) {
      case 'genre':
      case 'plays':
      case 'performer':
        if (parsedQuery.title) params.title = parsedQuery.title;
        if (parsedQuery.artist) params.artist = parsedQuery.artist;
        break;
      case 'search_user':
        params.query = parsedQuery.title || query;
        break;
    }

    // Ensure all required parameters are set
    bestApi.required_parameters.forEach(param => {
      if (!params[param.name]) {
        params[param.name] = param.default || '';
      }
    });

    logger.info(`Extracted parameters: ${JSON.stringify(params)}`);
    return { params };
  } catch (error) {
    logger.error("Error in extractParameters:", error);
    return { error: "Failed to extract parameters" };
  }
};