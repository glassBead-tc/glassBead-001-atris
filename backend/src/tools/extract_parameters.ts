import { logger } from '../logger.js';
import { GraphState } from '../types.js';
import { globalAudiusApi } from '../tools/create_fetch_request.js';

export const extractParameters = async (state: GraphState): Promise<Partial<GraphState>> => {
  const { query, bestApi } = state;

  let params: Record<string, string> = {};
  let fullPlaylistDetails: any = null;
  let fullUserDetails: any = null;
  let fullTrackDetails: any = null;

  try {
    if (bestApi?.api_name === 'Get Playlist') {
      // Existing playlist logic...
    } else if (bestApi?.api_name === 'Search Playlists') {
      // Existing search playlists logic...
    } else if (bestApi?.api_name === 'Get User' || bestApi?.api_name === 'Search Users') {
      const userNameMatch = query.match(/'([^']+)'/);
      if (userNameMatch) {
        const userName = userNameMatch[1];
        
        const searchResult = await globalAudiusApi.searchUsers(userName);
        if (searchResult && searchResult.data && searchResult.data.length > 0) {
          const userId = searchResult.data[0].id;
          params.user_id = userId;
          
          // Fetch full user details
          const userDetails = await globalAudiusApi.getUser(userId);
          if (userDetails && userDetails.data) {
            fullUserDetails = userDetails.data;
          }
        } else {
          logger.warn("No user found for the given name");
        }
      } else {
        params.query = query;
      }
    } else if (bestApi?.api_name === 'Get Track' || bestApi?.api_name === 'Search Tracks') {
      const trackNameMatch = query.match(/'([^']+)'/);
      if (trackNameMatch) {
        const trackName = trackNameMatch[1];
        
        const searchResult = await globalAudiusApi.searchTracks(trackName);
        if (searchResult && searchResult.data && searchResult.data.length > 0) {
          const exactMatch = searchResult.data.find((track: any) => 
            track.title.toLowerCase() === trackName.toLowerCase()
          );
          const trackToUse = exactMatch || searchResult.data[0];
          params.track_id = trackToUse.id;
          fullTrackDetails = trackToUse;
        } else {
          logger.warn("No track found for the given name");
        }
      } else {
        params.query = query;
      }
    }
    // Add more conditions for other API types as needed

    return { params, fullPlaylistDetails, fullUserDetails, fullTrackDetails };
  } catch (error) {
    throw error;
  }
};