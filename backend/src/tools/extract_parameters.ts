import { GraphState } from "../index.js";
import { sdk } from '@audius/sdk';

const APP_NAME = "Atris"; // Replace with your actual app name
const audiusSdk = sdk({ appName: APP_NAME });

/**
 * @param {GraphState} state
 */
export const extractParameters = async (
  state: GraphState
): Promise<Partial<GraphState>> => {
  const { query, bestApi } = state;
  
  if (!bestApi) {
    return { params: null };
  }

  let params: Record<string, string> = {};

  switch (bestApi.api_url) {
    case "/v1/tracks/trending":
      // No required parameters for trending tracks
      break;
    case "/v1/tracks/search":
      params.query = extractSearchQuery(query);
      break;
    case "/v1/tracks/{track_id}":
      params.track_id = await extractTrackId(query);
      break;
    default:
      console.log("Unhandled API URL:", bestApi.api_url);
      break;
  }

  // Add any optional parameters if they're mentioned in the query
  if (query.toLowerCase().includes("limit")) {
    params.limit = extractLimit(query);
  }

  console.log("Extracted parameters:", params);
  return { params };
};

function extractSearchQuery(query: string): string {
  const matches = query.match(/'([^']+)'|"([^"]+)"|(?:about|by)\s+(\w+(?:\s+\w+)*)/i);
  return matches ? (matches[1] || matches[2] || matches[3]).trim() : "";
}

async function extractTrackId(query: string): Promise<string> {
  // Use the Audius SDK to search for the track and get its ID
  const searchQuery = extractSearchQuery(query);
  try {
    const searchResults = await audiusSdk.tracks.searchTracks({ query: searchQuery });
    if (searchResults.data && searchResults.data.length > 0) {
      return searchResults.data[0].id;
    }
  } catch (error) {
    console.error("Error searching for track:", error);
  }
  return "";
}

function extractLimit(query: string): string {
  const match = query.match(/limit\s+(\d+)/i);
  return match ? match[1] : "10"; // Default to 10 if not specified
}
