import { logger } from "../logger.js";
import { isTrackData } from "../tools/utils/typeGuards.js";
import { isUserData } from "../tools/utils/typeGuards.js";
import { GraphState, TrackData } from "../types.js";

export async function processApiResponse(state: GraphState): Promise<GraphState> {
  logger.debug("Entering processApiResponse");
  logger.debug(`Query Type: ${state.queryType}`);
  logger.debug(`Response: ${JSON.stringify(state.response)}`);

  try {
      if (!state.response) {
          logger.error("No response data to process");
          throw new Error("No response data to process");
      }

      let formattedResponse: string;

      if (state.queryType === 'genre_info') {
          // Ensure that tracks data is available
          const tracks: TrackData[] = state.response.data.tracks; // Adjust based on actual response structure
          if (!tracks || !Array.isArray(tracks)) {
              throw new Error("Invalid or missing tracks data for genre_info");
          }

          formattedResponse = formatTrendingGenres(tracks, state.params.limit || 5);
      } else if (state.entity && state.entity.entityType === 'user') {
          formattedResponse = processUserQuery(state);
      } else if (isTrackData(state.response.data)) {
          // Handle track data
          formattedResponse = `Track: ${state.response.data.title} by ${state.response.data.artist}`;
      } else if (isUserData(state.response.data)) {
          // Handle artist data
          formattedResponse = `Artist: ${state.response.data.name} with ${state.response.data.followerCount} followers.`;
      } else {
          // Handle other cases
          logger.warn(`Unsupported query type: ${state.queryType}`);
          throw new Error(`Unsupported query type: ${state.queryType}`);
      }

      return {
          ...state,
          response: formattedResponse,
          message: "Processed API response successfully."
      };
  } catch (error: unknown) {
      if (error instanceof Error) {
          logger.error(`Error in processApiResponse: ${error.message}`, { stack: error.stack });
          return { 
              ...state, 
              error: true,
              message: error.message 
          };
      } else {
          logger.error('Unknown error in processApiResponse');
          return { 
              ...state, 
              error: true,
              message: 'An unknown error occurred while processing the API response.' 
          };
      }
  }
}

function processUserQuery(state: GraphState): string {
  const userData = state.response.data;
  const userInfo = processUserData(userData);
  
  if (state.query.toLowerCase().includes('followers')) {
    return `${userInfo.name} (@${userInfo.handle}) has ${userInfo.followers} followers on Audius.`;
  } else if (state.query.toLowerCase().includes('following')) {
    return `${userInfo.name} (@${userInfo.handle}) is following ${userInfo.following} users on Audius.`;
  } else {
    return `User: ${userInfo.name} (@${userInfo.handle})\nFollowers: ${userInfo.followers}\nFollowing: ${userInfo.following}\nTracks: ${userInfo.tracks}`;
  }
}

function formatTrendingTracks(tracks: TrackData[], limit: number): string {
  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new Error("No trending tracks found or invalid data");
  }

  const trendingTracks = tracks.slice(0, limit).map((track, index) => 
    `${index + 1}. "${track.title}" by ${track.user.name}`
  ).join('\n');

  return `Here are the top ${limit} trending tracks on Audius:\n${trendingTracks}`;
}

function formatTrendingGenres(tracks: TrackData[], limit: number): string {
  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new Error("Invalid tracks data format.");
  }

  const genreCounts: { [key: string]: number } = {};
  tracks.forEach(track => {
    if (track.genre) {
      genreCounts[track.genre] = (genreCounts[track.genre] || 0) + 1;
    }
  });

  const sortedGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  const formatted = sortedGenres.map((item, index) =>
    `${index + 1}. ${capitalizeFirstLetter(item[0])}`
  ).join('\n');

  return `Here are the top ${limit} genres on Audius based on trending tracks:\n\n${formatted}`;
}

function capitalizeFirstLetter(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function processUserData(userData: any): { name: string, handle: string, followers: string, following: string, tracks: string } {
  if (Array.isArray(userData)) {
    userData = userData[0];
  }
  
  if (userData) {
    return {
      name: userData.name || 'Unknown',
      handle: userData.handle || 'Unknown',
      followers: userData.follower_count !== undefined ? userData.follower_count.toString() : 'Unknown',
      following: userData.followee_count !== undefined ? userData.followee_count.toString() : 'Unknown',
      tracks: userData.track_count !== undefined ? userData.track_count.toString() : 'Unknown'
    };
  }
  
  return {
    name: 'Unknown',
    handle: 'Unknown',
    followers: 'Unknown',
    following: 'Unknown',
    tracks: 'Unknown'
  };
}
