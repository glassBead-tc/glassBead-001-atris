import { logger } from '../logger.js';
import { GraphState } from '../types.js';
import { AudiusApi } from '../tools/create_fetch_request.js';  

const audiusApi = new AudiusApi(); // Create an instance of AudiusApi

export const extractParameters = async (state: GraphState): Promise<Partial<GraphState>> => {
  const { query, bestApi } = state;

  let params: Record<string, string> = {};

  try {
    if (bestApi?.api_name === 'Get Playlist') {
      // Extract playlist name from the query
      const playlistNameMatch = query.match(/'([^']+)'/);
      if (playlistNameMatch) {
        const playlistName = playlistNameMatch[1];
        
        const searchResult = await audiusApi.searchPlaylists({ query: playlistName });
        if (searchResult && searchResult.data && searchResult.data.length > 0) {
          const playlistId = searchResult.data[0].id;
          params.playlist_id = playlistId;
        } else {
          logger.warn("No playlist found for the given name");
        }
      } else {
        throw new Error("Could not extract playlist name from query");
      }
    } else if (bestApi?.api_name === 'Search Playlists') {
      // Extract search query
      params.query = query.toLowerCase().includes('lofi') ? 'lofi' : query;
      params.limit = '10';
      params.offset = '0';
    }
    // Add more conditions for other API types as needed

    return { params };
  } catch (error) {
    throw error;
  }
};