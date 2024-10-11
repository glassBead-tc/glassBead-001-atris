import { GraphState } from "../types.js";

export async function processApiResponse(state: GraphState): Promise<Partial<GraphState>> {
  const { response, bestApi, query, params } = state;

  if (!response) {
    return { error: "No API response to process" };
  }

  if (!bestApi) {
    return { error: "No API selected" };
  }

  try {
    let formattedResponse: string;

    switch (bestApi.api_name) {
      case "Get Trending Tracks":
        const limit = params.limit || 3;
        formattedResponse = formatTrendingTracks(response.data, limit);
        break;
      default:
        formattedResponse = JSON.stringify(response, null, 2);
    }

    console.log("User Query:", query);
    console.log("Formatted Response:", formattedResponse);

    return { response: formattedResponse };
  } catch (error) {
    console.error("Error in processApiResponse:", error);
    return { error: "Failed to process API response" };
  }
}

function formatTrendingTracks(tracks: any[], limit: number): string {
  return tracks.slice(0, limit).map((track, index) => 
    `${index + 1}. "${track.title}" by ${track.user.name}`
  ).join("\n");
}
