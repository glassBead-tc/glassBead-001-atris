import { GraphState } from "../index.js";
import { sdk } from '@audius/sdk';

// Add this constant at the top of the file
const APP_NAME = "Atris"; // Replace with your actual app name
const AUDIUS_API_KEY = process.env.AUDIUS_API_KEY;
const AUDIUS_API_SECRET = process.env.AUDIUS_API_SECRET;

// Initialize the SDK with proper authentication
const audiusSdk = sdk({
  appName: APP_NAME,
  apiKey: AUDIUS_API_KEY,
  apiSecret: AUDIUS_API_SECRET
});

// User-friendly input mapping
const userGenreMapping: { [key: string]: string } = {
  "Drum & Bass": "DRUM_AND_BASS",
  "Drum and Bass": "DRUM_AND_BASS",
  "DNB": "DRUM_AND_BASS",
  "DnB": "DRUM_AND_BASS",
  "D&B": "DRUM_AND_BASS",
  "Jungle": "DRUM_AND_BASS",
  // Add more mappings as needed
};

// API-specific output mapping
const apiGenreMapping: { [key: string]: string } = {
  "DRUM_AND_BASS": "Drum & Bass",
  // Add more mappings for other genres
};

const FETCH_TIMEOUT = 30000; // 30 seconds timeout

async function getDiscoveryNodes(): Promise<string[]> {
  try {
    const response = await fetch('https://api.audius.co');
    const data = await response.json();
    // Remove any protocol from the returned URLs
    return data.data.map((node: string) => node.replace(/^https?:\/\//, ''));
  } catch (error) {
    console.error("Error fetching discovery nodes:", error);
    return [];
  }
}

async function retryFetchWithNodes(url: string, options: RequestInit, nodes: string[]): Promise<Response> {
  const maxAttempts = 5;
  
  for (let i = 0; i < Math.min(nodes.length, maxAttempts); i++) {
    const node = nodes[i];
    try {
      const nodeUrl = `https://${node}${url}`;
      console.log(`Attempting to fetch from node ${i + 1}/${maxAttempts}: ${nodeUrl}`);
      console.log("Request options:", JSON.stringify(options, null, 2));
      
      const response = await fetch(nodeUrl, options);
      
      console.log(`Response status: ${response.status}`);
      
      console.log("Response headers:");
      response.headers.forEach((value, key) => {
        console.log(`${key}: ${value}`);
      });
      
      if (response.ok) {
        console.log(`Successfully fetched from node: ${nodeUrl}`);
        return response;
      } else {
        console.log(`Failed to fetch from node: ${nodeUrl}. Status: ${response.status}`);
        const errorBody = await response.text();
        console.error(`Error response body: ${errorBody}`);
      }
    } catch (error) {
      console.error(`Error fetching from node ${node}:`, error);
    }
  }
  
  throw new Error(`All ${maxAttempts} discovery nodes failed`);
}

/**
 * Extract genre from the query string
 * @param {string} query
 * @returns {string | null}
 */
function extractGenre(query: string): string | null {
  const genreMatch = query.match(/in the (\w+(?:\s*[-&]\s*\w+)*) category/i);
  if (genreMatch) {
    const extractedGenre = genreMatch[1].trim();
    const normalizedGenre = Object.keys(userGenreMapping).find(key => 
      key.toLowerCase() === extractedGenre.toLowerCase()
    );
    if (normalizedGenre) {
      const apiGenre = userGenreMapping[normalizedGenre];
      return apiGenreMapping[apiGenre] || apiGenre;
    }
    return extractedGenre;
  }
  return null;
}

export const createFetchRequest = async (
  state: GraphState
): Promise<Partial<GraphState>> => {
  const { bestApi, params } = state;
  if (!bestApi) {
    console.log("No best API found");
    return { bestApi: null, response: null };
  }

  console.log(`Attempting to fetch data for API: ${bestApi.api_name}`);

  try {
    let response;
    const fetchPromise = (async () => {
      switch (bestApi.api_url) {
        case "/v1/tracks/trending":
          console.log("Fetching trending tracks...");
          response = await audiusSdk.tracks.getTrendingTracks({
            time: 'week'
          });
          break;
        case "/v1/tracks/search":
          console.log("Searching tracks...");
          response = await audiusSdk.tracks.searchTracks({
            query: params?.query || ''
          });
          break;
        case "/v1/tracks/{track_id}":
          if (params?.track_id) {
            console.log(`Fetching track with ID: ${params.track_id}`);
            response = await audiusSdk.tracks.getTrack({ trackId: params.track_id });
          } else {
            console.log("No track ID provided");
            return { bestApi, response: null };
          }
          break;
        default:
          console.log("Unhandled API URL:", bestApi.api_url);
          return { bestApi, response: null };
      }
      return response;
    })();

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timed out')), FETCH_TIMEOUT);
    });

    response = await Promise.race([fetchPromise, timeoutPromise]);

    console.log("API call successful");
    console.log("Response data:", JSON.stringify(response, null, 2));
    
    return { 
      response: { data: response },
      bestApi: bestApi
    };
  } catch (error) {
    console.error(`Error fetching data for ${bestApi.api_name}:`, error);
    if (error instanceof Error) {
      return { bestApi, response: null, error: error.message };
    } else {
      return { bestApi, response: null, error: String(error) };
    }
  }
};
