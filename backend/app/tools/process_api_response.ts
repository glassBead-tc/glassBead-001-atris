import { GraphState } from "../types.js";
import { logger } from '../logger.js';
import { TrackData } from "../lib/audiusData.js";

console.log("process_api_response.ts file loaded");

export async function processApiResponse(state: GraphState): Promise<Partial<GraphState>> {
  logger.debug("Entering processApiResponse");
  logger.debug(`Query Type: ${state.queryType}`);
  logger.debug(`Response: ${JSON.stringify(state.response)}`);

  try {
    if (!state.response) {
      logger.error("No response data to process");
      throw new Error("No response data to process");
    }

    let formattedResponse: string;

    switch (state.queryType) {
      case 'user_info':
      case 'user_social':
        logger.debug("Processing user query");
        formattedResponse = processUserQuery(state);
        break;
      case 'trending_tracks':
        logger.debug("Formatting trending tracks");
        formattedResponse = formatTrendingTracks(state.response.data, state.params.limit || 5);
        break;
      case 'genre_info':
        logger.debug("Processing trending genres");
        formattedResponse = formatTrendingGenres(state.response, state.params.limit || 5);
        break;
      case 'track_info':
        logger.debug("Processing track query");
        formattedResponse = processTrackQuery(state);
        break;
      // ... other cases
      default:
        logger.warn(`Unsupported query type: ${state.queryType}`);
        throw new Error(`Unsupported query type: ${state.queryType}`);
    }

    return {
      ...state,
      response: formattedResponse,
      message: "Processed API response successfully."
    };
  } catch (error) {
    logger.error(`Error in processApiResponse: ${error instanceof Error ? error.message : String(error)}`);
    return { 
      error: error instanceof Error ? error.message : "An error occurred in processApiResponse." 
    };
  }
}

function processUserQuery(state: GraphState): string {
  const userInfo = processUserData(state.response.data);
  
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

export function formatTrendingGenres(genres: { genre: string; score: number }[], limit: number): string {
  if (!Array.isArray(genres) || genres.length === 0) {
    throw new Error("Invalid genres data format.");
  }

  const formatted = genres.slice(0, limit).map((item, index) =>
    `${index + 1}. ${capitalizeFirstLetter(item.genre)}`
  ).join('\n');

  return `Here are the top ${limit} genres on Audius based on trending tracks:\n\n${formatted}`;
}

function capitalizeFirstLetter(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function processTrackQuery(state: GraphState): string {
  const tracks = state.response.data;
  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new Error("No tracks found matching the query");
  }

  const trackNameMatch = state.query.match(/"([^"]+)"/);
  const artistMatch = state.query.match(/by\s+([^"]+)/i);
  
  if (trackNameMatch && artistMatch) {
    const trackName = trackNameMatch[1];
    const artistName = artistMatch[1].trim().replace(/[.,?!]$/, '');
    
    const exactMatch = tracks.find((track) => 
      track.title.toLowerCase() === trackName.toLowerCase() &&
      track.user.name.toLowerCase() === artistName.toLowerCase()
    );

    if (exactMatch) {
      return `The genre of "${exactMatch.title}" by ${exactMatch.user.name} is ${exactMatch.genre || 'Unknown'}.`;
    } else {
      const closestMatch = findClosestMatch(tracks, trackName, artistName);
      
      if (closestMatch) {
        return `I couldn't find an exact match for "${trackName}" by ${artistName}. The closest match I found is "${closestMatch.title}" by ${closestMatch.user.name}, and its genre is ${closestMatch.genre || 'Unknown'}. Is this the track you were looking for?`;
      } else {
        return `I'm sorry, but I couldn't find a track matching "${trackName}" by ${artistName}. Can you please check the spelling of the track and artist names?`;
      }
    }
  } else {
    return "I'm having trouble understanding your query. Can you please provide both the track name (in quotes) and the artist name?";
  }
}

function findClosestMatch(tracks: TrackData[], trackName: string, artistName: string): TrackData | null {
  // Implement a logic to find the closest matching track
  // This can be based on string similarity or other heuristics
  // For simplicity, we'll return null here
  return null;
}

function processPlaylistQuery(state: GraphState): string {
  // Implement playlist query processing similarly
  return "Playlist processing not yet implemented.";
}

function formatDefaultResponse(data: any): string {
  // Implement default response formatting
  return "Default response formatting not implemented.";
}

function processSecondaryResponse(state: GraphState): string {
  // Implement secondary response processing if applicable
  return "Secondary response processing not implemented.";
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

function formatDuration(durationInSeconds: number): string {
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = durationInSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}