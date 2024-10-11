import { GraphState } from "../types.js";

export async function processApiResponse(state: GraphState): Promise<Partial<GraphState>> {
  const { response, bestApi, query, params } = state;

  if (!response || !bestApi) {
    return { error: "Invalid state for processing" };
  }

  try {
    let formattedResponse: string;

    switch (bestApi.api_name) {
      case "Get Trending Tracks":
        const limit = params.limit || 3;
        formattedResponse = formatTrendingTracks(response.data, limit);
        break;
      case "Search Users":
        if (params.sort_by === "follower_count" && params.order_by === "desc") {
          const topArtist = response.data[0];
          formattedResponse = `The artist with the most followers on Audius is ${topArtist.name} (@${topArtist.handle}) with ${topArtist.follower_count.toLocaleString()} followers.`;
        } else {
          formattedResponse = `Found ${response.data.length} users matching the query.`;
        }
        break;
      case "Search Tracks":
        if (query.toLowerCase().includes('genre')) {
          formattedResponse = processGenreQuery(query, response.data);
        } else {
          formattedResponse = `Found ${response.data.length} tracks matching the query.`;
        }
        break;
      default:
        formattedResponse = `Processed ${bestApi.api_name} response with ${response.data.length} results.`;
    }

    console.log(`Processed ${bestApi.api_name} response`);
    return { response: formattedResponse };
  } catch (error) {
    console.error(`Error processing ${bestApi.api_name} response:`, error);
    return { error: "Failed to process API response" };
  }
}

function formatTrendingTracks(tracks: any[], limit: number): string {
  return tracks.slice(0, limit).map((track, index) => 
    `${index + 1}. "${track.title}" by ${track.user.name}`
  ).join("\n");
}

function processGenreQuery(query: string, tracks: any[]): string {
  const trackNameMatch = query.match(/'([^']+)'/);
  const artistMatch = query.match(/by\s+([^']+)/i);
  
  if (trackNameMatch && artistMatch) {
    const trackName = trackNameMatch[1];
    const artistName = artistMatch[1].trim().replace(/[.,?!]$/, ''); // Remove trailing punctuation
    
    const exactMatch = tracks.find((track: any) => 
      track.title.toLowerCase() === trackName.toLowerCase() &&
      track.user.name.toLowerCase() === artistName.toLowerCase()
    );

    if (exactMatch) {
      return `The genre of "${exactMatch.title}" by ${exactMatch.user.name} is ${exactMatch.genre || 'Unknown'}.`;
    } else {
      // Find the closest match
      const closestMatch = tracks.reduce((closest: any, current: any) => {
        const currentSimilarity = calculateSimilarity(current.title, trackName) + calculateSimilarity(current.user.name, artistName);
        const closestSimilarity = closest ? calculateSimilarity(closest.title, trackName) + calculateSimilarity(closest.user.name, artistName) : -1;
        return currentSimilarity > closestSimilarity ? current : closest;
      }, null);

      let response = `No exact match found for "${trackName}" by ${artistName}. `;
      response += `Found ${tracks.length} tracks in the search results. `;
      
      if (closestMatch) {
        response += `The closest match is "${closestMatch.title}" by ${closestMatch.user.name}, genre: ${closestMatch.genre || 'Unknown'}. `;
      }
      
      response += "You may want to refine your search or check the spelling of the track and artist names.";
      
      return response;
    }
  } else {
    return "Unable to process the query. Please provide both the track name (in quotes) and the artist name.";
  }
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
