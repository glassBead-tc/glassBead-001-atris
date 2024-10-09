import { ChatOpenAI } from "@langchain/openai";
import { createGraph } from "./graph/createGraph.js";
import { globalAudiusApi } from "./tools/create_fetch_request.js";
import { GraphState } from "./types.js";
import { selectApi } from "./tools/select_api.js";
import { CompiledStateGraph } from "@langchain/langgraph";

// Define interfaces for the API response structures
interface Track {
  title: string;
  user: {
    name: string;
  };
}

interface Playlist {
  playlist_name: string;
  user: {
    name: string;
  };
}

// Function to extract user handle from the query
function extractUserHandle(query: string): string | null {
    const match = query.match(/(?:how many followers does )(\w+)(?: have on audius\?)/i);
    return match ? match[1] : null; // Return the user handle if found
}

const userHandle = "deadmau5"; // Ensure this is defined correctly

async function setupTestCases() {
  let trendingTracksAnswer = "Unable to fetch trending tracks";
  let trendingPlaylistsAnswer = "No playlist information available";
  let followersAnswer = "Unable to fetch follower count";

  try {
    const trendingTracks = await globalAudiusApi.getTrendingTracks(3);
    if (trendingTracks.data && Array.isArray(trendingTracks.data)) {
      trendingTracksAnswer = trendingTracks.data.map((track: Track, index: number) => 
        `${index + 1}. "${track.title}" by ${track.user.name}`
      ).join('\n');
    }

    const trendingPlaylists = await globalAudiusApi.getTopTrendingPlaylistTracks(3);
    if (trendingPlaylists && trendingPlaylists.playlist && trendingPlaylists.tracks) {
      const trackList = trendingPlaylists.tracks.map((track: Track) => 
        `${track.title} by ${track.user.name}`
      ).join(', ');
      trendingPlaylistsAnswer = `"${trendingPlaylists.playlist.playlist_name}" by ${trendingPlaylists.playlist.user.name}. Tracks: ${trackList}`;
    }

    // When making the API call, ensure the userHandle is included in the endpoint
    const targetFollowersByHandle = await globalAudiusApi.getUserByHandle(userHandle);
    if (targetFollowersByHandle.data && targetFollowersByHandle.data.follower_count) {
      followersAnswer = targetFollowersByHandle.data.follower_count.toString();
    }
  } catch (error) {
    console.error("Error setting up test cases:", error);
  }

  return [
    {
      query: "What are the top 3 trending tracks on Audius right now?",
      expectedAnswer: `The top 3 trending tracks on Audius right now are:\n${trendingTracksAnswer}`,
      expectedEndpoint: "/tracks/trending"
    },
    {
      query: "How many followers does Deadmau5 have on Audius?",
      expectedAnswer: `Deadmau5 has ${followersAnswer} followers on Audius.`,
      expectedEndpoint: `/users/handle/${userHandle}` // Now this works
    },
    {
      query: "What's the top trending playlist on Audius this week?",
      expectedAnswer: trendingPlaylistsAnswer,
      expectedEndpoint: "/playlists/trending"
    }
  ];
}

async function main() {
  const llm = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    temperature: 0,
  });

  const graph: CompiledStateGraph<GraphState, Partial<GraphState>, "__start__"> = createGraph(llm);

  try {
    const isConnected = await globalAudiusApi.testConnection();
    if (isConnected) {
      console.log('API connection successful. Proceeding with the application.');
    } else {
      console.error('Failed to connect to the Audius API. Please check your API key and network connection.');
      return;
    }
  } catch (error) {
    console.error('Error while testing API connection:', error);
    console.error('Please check your API key and network connection.');
    return;
  }

  let testCases;
  try {
    testCases = await setupTestCases();
  } catch (error) {
    console.error("Error setting up test cases:", error);
    return;
  }

  for (const testCase of testCases) {
    console.log(`Query: ${testCase.query}`);
    const answer = await generateAnswer(graph, testCase.query);
    console.log(`Generated answer for query: "${testCase.query}"`);
    console.log(`Expected Answer: ${testCase.expectedAnswer}`);
    console.log(`Expected Endpoint: ${testCase.expectedEndpoint}`);
    console.log("---");
  }
}

async function generateAnswer(app: CompiledStateGraph<GraphState, Partial<GraphState>, "__start__">, query: string): Promise<string> {
    try {
        // Create a GraphState object
        const state: GraphState = {
            query,
            apis: [], // We'll populate this later
            llm: getLlmValue(app), // Use a helper function to safely get 'llm'
            categories: [],
            params: {},
            response: undefined,
            error: undefined
        };

        // Populate the APIs
        const apisChannel = getApisValue(app); // Use a helper function to safely get 'apis' channel
        console.log("APIs Channel:", apisChannel); // Debugging output
        if (apisChannel && 'value' in apisChannel) {
            state.apis = apisChannel.value;
        } else {
            console.error("Unable to find APIs in the graph structure");
            return `Unable to process the query: "${query}". APIs not found.`;
        }

        // Call selectApi with the GraphState
        const result = await selectApi(state);

        console.log("Raw API selection result:", JSON.stringify(result));

        if (result.error) {
            console.error("Error selecting API:", result.error);
            return `Unable to process the query: "${query}". ${result.error}`;
        }

        if (!result.bestApi) {
            console.log("No suitable API found");
            return `Unable to process the query: "${query}". No suitable API found.`;
        }

        const selectedApi = result.bestApi;
        console.log("Selected API:", selectedApi.api_name);

        // Here you would typically call the selected API with the provided parameters
        // and then format the response into a human-readable answer
        // For now, we'll just return a placeholder response
        return `Processed query: "${query}" using API: "${selectedApi.api_name}". ${selectedApi.api_description}`;

    } catch (error) {
        console.error("Error in generateAnswer:", error);
        return `An error occurred while processing your query: "${query}". Please try again.`;
    }
}

// Helper function to safely get the 'llm' value
function getLlmValue(graph: CompiledStateGraph<GraphState, Partial<GraphState>, "__start__">): any {
    if (graph.builder && graph.builder.channels && 'llm' in graph.builder.channels) {
        return graph.builder.channels.llm;
    }
    throw new Error("Llm channel not found in the graph structure");
}

// Helper function to safely get the 'apis' channel
function getApisValue(graph: CompiledStateGraph<GraphState, Partial<GraphState>, "__start__">): any {
    if (graph.builder && graph.builder.channels && 'apis' in graph.builder.channels) {
        return graph.builder.channels.apis;
    }
    throw new Error("Apis channel not found in the graph structure");

}

// Example validation function
function isValidApiOutput(output: any): boolean {
    return (
        output &&
        typeof output.api === 'string' &&
        typeof output.parameters === 'object' &&
        typeof output.description === 'string'
    );
}

main().catch(console.error);
