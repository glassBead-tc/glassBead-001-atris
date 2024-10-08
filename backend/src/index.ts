import { ChatOpenAI } from "@langchain/openai";
import { createGraph } from "./graph/createGraph.js";
import { formatSearchTracks, formatUserInfo, formatPlaylistInfo, formatTrendingTracks, formatTrackResults, formatTrendingPlaylists } from "./utils/formatResults.js";
import { searchTracks } from "./utils/searchUtils.js";
import { extractSearchQuery } from "./extractionUtils.js";
import { audiusApi } from "./tools/create_fetch_request.js";
import { Track } from "./types.js"

async function setupTestCases() {
  interface TrendingTrack {
    title: string;
    artist: string;
  }

  const trendingTracks = await audiusApi.getTopTrendingTracks(3);
  const trendingTracksAnswer = trendingTracks.map((track: TrendingTrack, index: number) => 
    `${index + 1}. "${track.title}" by ${track.artist}`
  ).join('\n');

  const trendingPlaylists = await audiusApi.getTopTrendingPlaylistTracks(1, 3);
  let trendingPlaylistsAnswer = "No playlist information available";

  if (trendingPlaylists && trendingPlaylists.playlist && trendingPlaylists.tracks) {
    const trackList = trendingPlaylists.tracks.map((track: { title: string; artist: string }) => 
      `${track.title} by ${track.artist}`
    ).join(', ');
    trendingPlaylistsAnswer = `"${trendingPlaylists.playlist.name}" by ${trendingPlaylists.playlist.user}. Tracks: ${trackList}`;
  }

  return [
    {
      query: "What is the genre of What You Want (instrumental) by TRICK CHENEY?",
      expectedEndpoint: "/v1/tracks/search",
      expectedAnswer: "The genre of 'What You Want (instrumental)' by TRICK CHENEY is Downtempo."
    },
    {
      query: "Who are the top 3 trending tracks this week?",
      expectedEndpoint: "/v1/tracks/trending",
      expectedAnswer: `The top 3 trending tracks this week are:\n${trendingTracksAnswer}`
    },
    {
      query: "What's the most played track by Skrillex?",
      expectedEndpoint: "/v1/tracks/search",
      expectedAnswer: "The most-played track by Skrillex is Kliptown Empyrean."
    },
    {
      query: "What is the top trending playlist this week?",
      expectedEndpoint: "/v1/playlists/trending",
      expectedAnswer: `The top trending playlist on Audius this week is:
1. "${trendingPlaylists!.playlist.name}" by ${trendingPlaylists!.playlist.user}. Here are some tracks on it:
   ${trendingPlaylists!.tracks.map((track: { title: string; artist: string }) => `${track.title} by ${track.artist}`).join(', ')}`
    }
  ];
}

async function main() {
  const app = createGraph();
  const llm = new ChatOpenAI({
    modelName: "gpt-4-turbo-preview",
    temperature: 0,
  });

  const testQueries = await setupTestCases();

  for (const testCase of testQueries) {
    console.log(`Query: ${testCase.query}`);
    const answer = await generateAnswer(app, llm, testCase.query);
    console.log(`Answer: ${answer}`);
    console.log(`Expected Answer: ${testCase.expectedAnswer}`);
    console.log(`Expected Endpoint: ${testCase.expectedEndpoint}`);
    console.log("---");
  }
}

async function generateAnswer(app: any, llm: ChatOpenAI, query: string): Promise<string> {
  try {
    const result = await app.invoke({
      llm,
      query: query,
    });

    console.log("API Response:", JSON.stringify(result, null, 2));

    const apiName = result.bestApi?.api_name;
    console.log("Selected API:", apiName);

    if (apiName === 'Search Tracks' || apiName === 'Get Track') {
      const { track, artist } = extractSearchQuery(query);
      console.log(`Extracted track: "${track}", artist: "${artist}"`);
      
      let tracks = await searchTracks(artist);
      
      if (tracks.length === 0) {
        return `I couldn't find any tracks by ${artist} on Audius.`;
      }

      // Sort tracks by play count in descending order
      tracks.sort((a: Track, b: Track) => (b.play_count || 0) - (a.play_count || 0));

      if (query.toLowerCase().includes("most played")) {
        const mostPlayedTrack = tracks[0];
        return `The most-played track by ${artist} is "${mostPlayedTrack.title}" with ${mostPlayedTrack.play_count} plays.`;
      }
      
      return formatSearchTracks(tracks, `${track} by ${artist}`);
    }

    if (apiName === 'Get Trending Tracks') {
      const trendingTracks = await audiusApi.getTrendingTracks({ limit: 3 });
      return formatTrendingTracks(trendingTracks.data);
    }

    if (apiName === 'Get Trending Playlists' || apiName === 'Get Trending Playlist Tracks') {
      if (result.response && result.response.name) {
        return `The top trending playlist on Audius this week is:
1. "${result.response.name}" by ${result.response.user}. Here are some tracks on it:
   ${result.response.tracks}`;
      } else {
        return "Unable to fetch trending playlists at the moment.";
      }
    }

    // Handle other API cases here...

    return `Unable to process the response for your query: "${query}"`;
  } catch (error) {
    console.error("Error in generateAnswer:", error);
    return `An error occurred while processing your query: "${query}". Please try again or rephrase your question. Error details: ${error instanceof Error ? error.message : String(error)}`;
  }
}

main().catch(console.error);