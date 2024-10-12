import { GraphState } from "../types.js";
import { logger } from '../logger.js';
import { TrackData } from "../lib/audiusData.js";

console.log("process_api_response.ts file loaded");

export async function processApiResponse(state: GraphState): Promise<Partial<GraphState>> {
  console.log("1. Entering processApiResponse");
  console.log("2. Query:", state.query);
  
  try {
    console.log("3. Checking state.response");
    if (!state.response || !Array.isArray(state.response.data)) {
      console.log("4. State response:", JSON.stringify(state.response, null, 2));
      throw new Error("No response data to process");
    }

    console.log("5. Casting tracks");
    const tracks = state.response.data as TrackData[];
    console.log("6. Number of tracks:", tracks.length);

    let formattedResponse: string;

    console.log("7. Checking query type");
    if (state.query.toLowerCase().includes('trending') && state.query.toLowerCase().includes('genre')) {
      console.log("8. Formatting trending genres");
      formattedResponse = formatTrendingGenres(tracks, tracks.length);
    } else if (state.query.toLowerCase().includes('genre of')) {
      console.log("9. Processing genre query");
      formattedResponse = processGenreQuery(state.query, tracks);
    } else {
      console.log("10. Formatting default response");
      formattedResponse = formatDefaultResponse(tracks);
    }

    console.log("11. Processed response:", formattedResponse);

    return { ...state, formattedResponse, error: null };
  } catch (error) {
    console.error("12. Error in processApiResponse:", error);
    console.error("13. Error stack:", (error as Error).stack);
    console.error("14. State at error:", JSON.stringify(state, null, 2));
    return { 
      ...state, 
      formattedResponse: "I'm sorry, but I encountered an error while processing the API response. Could you please try your question again?",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function formatTrendingGenres(tracks: TrackData[], limit: number): string {
  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new Error("No trending tracks found or invalid data");
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

  return `Here are the top trending genres on Audius this week based on the top ${limit} trending tracks:\n${trendingGenres}`;
}

function processGenreQuery(query: string, tracks: TrackData[]): string {
  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new Error("No tracks found matching the query");
  }

  const trackNameMatch = query.match(/'([^']+)'/);
  const artistMatch = query.match(/by\s+([^']+)/i);
  
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
