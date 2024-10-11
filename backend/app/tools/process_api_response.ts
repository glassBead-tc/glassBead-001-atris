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
          const track = response.data[0];
          formattedResponse = track 
            ? `The genre of "${track.title}" by ${track.user.name} is ${track.genre || 'Unknown'}.`
            : "No tracks found matching the query.";
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
