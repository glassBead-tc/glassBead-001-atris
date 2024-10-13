import { GraphState } from "../types.js";
import { logger } from '../logger.js';
import { TrackData } from "../lib/audiusData.js";

console.log("process_api_response.ts file loaded");

export async function processApiResponse(state: GraphState): Promise<Partial<GraphState>> {
  logger.debug("Entering processApiResponse");
  logger.debug("Query:", state.query);
  logger.debug("Query Type:", state.queryType);
  
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
        logger.debug("Processing genre query");
        formattedResponse = processGenreQuery(state);
        break;
      case 'track_info':
        logger.debug("Processing track query");
        formattedResponse = processTrackQuery(state);
        break;
      case 'playlist_info':
        logger.debug("Processing playlist query");
        formattedResponse = processPlaylistQuery(state);
        break;
      default:
        logger.debug("Formatting default response");
        formattedResponse = formatDefaultResponse(state.response.data);
    }

    logger.debug("Processed response:", formattedResponse);

    if (state.secondaryResponse) {
      formattedResponse += "\n\n" + processSecondaryResponse(state);
    }

    return { formattedResponse };
  } catch (error) {
    logger.error("Error in processApiResponse:", error);
    return { 
      formattedResponse: "I'm sorry, but I encountered an error while processing your request. Could you please try rephrasing your question?",
      error: error instanceof Error ? error.message : String(error)
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

function processGenreQuery(state: GraphState): string {
  const tracks = state.response.data;
  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new Error("No tracks found matching the query");
  }

  const genreCounts: {[key: string]: number} = {};
  tracks.forEach((track) => {
    const genre = track.genre || 'Unknown';
    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
  });

  const sortedGenres = Object.entries(genreCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const trendingGenres = sortedGenres.map(([genre, count], index) => 
    `${index + 1}. ${genre} (${count} track${count !== 1 ? 's' : ''})`
  ).join('\n');

  return `Here are the top trending genres on Audius based on the ${tracks.length} tracks analyzed:\n${trendingGenres}`;
}

function processTrackQuery(state: GraphState): string {
  const tracks = state.response.data;
  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new Error("No tracks found matching the query");
  }

  const trackNameMatch = state.query.match(/'([^']+)'/);
  const artistMatch = state.query.match(/by\s+([^']+)/i);
  
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

function processPlaylistQuery(state: GraphState): string {
  const playlist = state.response.data;
  if (!playlist) {
    throw new Error("No playlist found matching the query");
  }

  const trackList = playlist.tracks.slice(0, 5).map((track: any, index: number) => 
    `${index + 1}. "${track.title}" by ${track.user.name}`
  ).join('\n');

  return `
Playlist: "${playlist.playlist_name}"
Created by: ${playlist.user.name}
Total Tracks: ${playlist.track_count}
Favorite Count: ${playlist.favorite_count}
Repost Count: ${playlist.repost_count}

Top 5 Tracks:
${trackList}
  `.trim();
}

function formatDefaultResponse(data: any): string {
  if (Array.isArray(data) && data.length > 0) {
    return `I found ${data.length} results for your query. Here's a summary of the first result: ${JSON.stringify(data[0], null, 2)}`;
  } else if (typeof data === 'object' && data !== null) {
    return `Here's the information I found: ${JSON.stringify(data, null, 2)}`;
  } else {
    return `I'm sorry, but I couldn't find any specific information for your query. Can you please try rephrasing your question?`;
  }
}

function findClosestMatch(tracks: TrackData[], trackName: string, artistName: string): TrackData | undefined {
  return tracks.reduce((closest: TrackData | undefined, current: TrackData) => {
    const currentSimilarity = calculateSimilarity(current.title, trackName) + calculateSimilarity(current.user.name, artistName);
    if (!closest || currentSimilarity > (closest as any).similarity) {
      return { ...current, similarity: currentSimilarity };
    }
    return closest;
  }, undefined);
}

function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const maxLen = Math.max(len1, len2);
  if (maxLen === 0) return 1.0;
  return (maxLen - levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())) / maxLen;
}

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }

  return dp[m][n];
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

function processSecondaryResponse(state: GraphState): string {
  if (!state.secondaryResponse) {
    return "";
  }

  // Process the secondary response based on the query type or the secondary API
  // This is a placeholder and should be customized based on your specific use cases
  return `Additional Information:\n${JSON.stringify(state.secondaryResponse.data, null, 2)}`;
}
