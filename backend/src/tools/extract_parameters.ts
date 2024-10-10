import { logger } from '../logger.js';
import { GraphState } from '../types.js';
import { globalAudiusApi } from './create_fetch_request.js';

export const extractParameters = async (state: GraphState): Promise<Partial<GraphState>> => {
  const { query, bestApi } = state;

  if (!bestApi) {
    return { error: "No API selected" };
  }

  let params: Record<string, any> = {};

  try {
    if (bestApi.api_name === 'Get Playlist' || bestApi.api_name === 'Search Playlists') {
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

    return { params };
  } catch (error) {
    console.error("Error in extractParameters:", error);
    return { error: "Failed to extract parameters" };
  }
};