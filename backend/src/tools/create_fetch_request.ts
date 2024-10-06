import { GraphState } from "index.js";

// Add this constant at the top of the file
const APP_NAME = "Atris"; // Replace with your actual app name

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

export async function createFetchRequest(
  state: GraphState
): Promise<Partial<GraphState>> {
  const { bestApi, query } = state;
  if (!bestApi) {
    throw new Error("No best API found");
  }

  let url = bestApi.api_url;
  console.log("Original URL:", url);

  // Remove the genre parameter for now
  // const params = new URLSearchParams();
  // const genre = extractGenre(query);
  // if (genre) {
  //   params.append("genre", genre);
  // }
  // if (params.toString()) {
  //   url += `?${params.toString()}`;
  // }

  console.log("Final URL:", url);

  const discoveryNodes = await getDiscoveryNodes();
  if (discoveryNodes.length === 0) {
    throw new Error("No discovery nodes available");
  }

  try {
    const response = await retryFetchWithNodes(url, {
      method: bestApi.method,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "App-Name": APP_NAME,
        "User-Agent": "Atris/1.0"
      },
    }, discoveryNodes);

    const data = await response.json();
    console.log("Response data:", JSON.stringify(data, null, 2));
    return { response: data };
  } catch (error) {
    console.error("Error fetching API:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      if ('cause' in error) {
        console.error("Error cause:", error.cause);
      }
    }
    return { response: null };
  }
}
