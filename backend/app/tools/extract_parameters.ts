import { logger } from '../logger.js';
import { GraphState, DatasetSchema } from "../types.js";
import { globalAudiusApi } from './create_fetch_request.js';
import { parseQuery } from "../utils/searchUtils.js";

export const extractParameters = async (state: GraphState): Promise<Partial<GraphState>> => {
  const { query, bestApi } = state;

  if (!bestApi) {
    logger.error("No API selected in extractParameters");
    return { 
      error: "No API selected",
      message: "Failed to extract parameters: No API was selected."
    };
  }

  let params: Record<string, any> = { query };  // Always include the original query

  try {
    const parsedQuery = parseQuery(query);

    switch (bestApi.api_name) {
      case "/v1/tracks/trending":
        params = { ...params, ...extractTrendingTracksParameters(query) };
        break;
      case "/v1/playlists/search":
      case "/v1/playlists/{playlist_id}":
        params = { ...params, ...await extractPlaylistParameters(query) };
        break;
      case "/v1/tracks/search":
      case "/v1/tracks/{track_id}":
        params = { ...params, ...extractTrackParameters(query) };
        break;
      case "/v1/users/search":
        params = { ...params, ...extractSearchUsersParameters(parsedQuery, query) };
        break;
      default:
        params = { ...params, ...extractDefaultParameters(parsedQuery) };
    }

    // Ensure all required parameters are set
    bestApi.required_parameters.forEach(param => {
      if (!params[param.name] && param.name !== 'query') {
        params[param.name] = param.default || '';
      }
    });

    logger.info(`Extracted parameters for ${bestApi.api_name}: ${JSON.stringify(params)}`);
    return { 
      params,
      message: `Parameters extracted successfully for ${bestApi.api_name}.`
    };
  } catch (error) {
    logger.error("Error in extractParameters:", error);
    return { 
      error: `Failed to extract parameters: ${error instanceof Error ? error.message : String(error)}`,
      message: "An error occurred while extracting parameters."
    };
  }
};

function extractTrendingTracksParameters(query: string): Record<string, any> {
  const numberMatch = query.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/i);
  if (numberMatch) {
    const numberWord = numberMatch[1].toLowerCase();
    const numberMap: Record<string, number> = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
    };
    const limit = numberMap[numberWord] || parseInt(numberWord);
    return { limit: Math.min(limit, 100) }; // Cap at 100 to prevent excessive requests
  }
  return { limit: 5 }; // Default to 5 if no number is specified
}

async function extractPlaylistParameters(query: string): Promise<Record<string, any>> {
  const playlistNameMatch = query.match(/'([^']+)'/);
  if (playlistNameMatch) {
    const playlistName = playlistNameMatch[1];
    const searchResult = await globalAudiusApi.searchPlaylists(playlistName);
    if (searchResult && searchResult.data && searchResult.data.length > 0) {
      return { playlist_id: searchResult.data[0].id };
    }
    logger.warn(`No playlist found for the name: ${playlistName}`);
    return { error: "No playlist found for the given name" };
  }
  return {};
}

function extractTrackParameters(query: string): Record<string, any> {
  const trackNameMatch = query.match(/'([^']+)'/);
  const artistMatch = query.match(/by\s+([^']+)/i);
  if (trackNameMatch && artistMatch) {
    const trackName = trackNameMatch[1];
    const artistName = artistMatch[1].trim().replace(/[.,?!]$/, ''); // Remove trailing punctuation
    return {
      query: `"${trackName}" "${artistName}"`,
      limit: 10 // Increase limit to improve chances of finding the exact match
    };
  }
  return { query: query };
}

function extractSearchUsersParameters(parsedQuery: ReturnType<typeof parseQuery>, originalQuery: string): Record<string, any> {
  if (parsedQuery.type === 'mostFollowers' || originalQuery.toLowerCase().includes('most followers')) {
    return { query: '', limit: 5, sort_by: "follower_count", order_by: "desc" };
  }
  return { query: parsedQuery.title || parsedQuery.artist || originalQuery };
}

function extractDefaultParameters(parsedQuery: ReturnType<typeof parseQuery>): Record<string, any> {
  switch (parsedQuery.type) {
    case 'genre':
      return {
        query: `"${parsedQuery.title}" "${parsedQuery.artist}"`.trim(),
        limit: 10
      };
    case 'plays':
    case 'performer':
      return {
        title: parsedQuery.title,
        artist: parsedQuery.artist
      };
    default:
      return { query: parsedQuery.title || parsedQuery.artist || "" };
  }
}
