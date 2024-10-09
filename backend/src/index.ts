import { ChatOpenAI } from "@langchain/openai";
import { createGraph } from "./graph/createGraph.js";
import { globalAudiusApi } from "./tools/create_fetch_request.js";

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

    const targetFollowersByHandle = await globalAudiusApi.getUserByHandle("deadmau5");
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
      expectedEndpoint: "/users/handle"
    },
    {
      query: "What's the top trending playlist on Audius this week?",
      expectedAnswer: trendingPlaylistsAnswer,
      expectedEndpoint: "/playlists/trending"
    }
  ];
}

export async function main() {
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

  const app = createGraph();
  const llm = new ChatOpenAI({
    modelName: "gpt-4-turbo-preview",
    temperature: 0,
  });

  let testCases;
  try {
    testCases = await setupTestCases();
  } catch (error) {
    console.error("Error setting up test cases:", error);
    return;
  }

  for (const testCase of testCases) {
    console.log(`Query: ${testCase.query}`);
    const answer = await generateAnswer(app, llm, testCase.query);
    console.log(`Answer: ${answer}`);
    console.log(`Expected Answer: ${testCase.expectedAnswer}`);
    console.log(`Expected Endpoint: ${testCase.expectedEndpoint}`);
    console.log("---");
  }
}

async function generateAnswer(app: any, llm: any, query: string): Promise<string> {
  try {
    console.log("Generating answer for query:", query);
    const result = await app.invoke({ query });
    console.log("App invoke result:", JSON.stringify(result, null, 2));

    if (!result) {
      console.log("No result returned from app.invoke");
      return `Unable to process the query: "${query}". No result returned.`;
    }

    if (!result.apis || result.apis.length === 0) {
      console.log("No APIs found. Categories:", result.categories);
      return `Unable to process the query: "${query}". No suitable APIs found. Categories: ${result.categories?.join(', ') || 'None'}`;
    }

    console.log("Selected API:", result.bestApi?.api_name);

    // Here you would typically call createFetchRequest with the result
    // and then format the response into a human-readable answer
    // For now, we'll return a placeholder
    return `Processed query: "${query}" using API: ${result.bestApi?.api_name}. (Implement actual answer generation here)`;

  } catch (error) {
    console.error("Error in generateAnswer:", error);
    return `An error occurred while processing your query: "${query}". Please try again or rephrase your question. Error details: ${error instanceof Error ? error.message : String(error)}`;
  }
}

main().catch(console.error);