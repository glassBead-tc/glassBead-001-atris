import { ChatOpenAI } from "@langchain/openai";
import { createGraph } from "./graph/createGraph.js";
import { formatSearchTracks, formatUserInfo, formatPlaylistInfo } from "./utils/formatResults.js";

async function main() {
  const app = createGraph();
  const llm = new ChatOpenAI({
    modelName: "gpt-4-turbo-preview",
    temperature: 0,
  });

  const testCases = [
    {
      query: "I'm looking into what music is popular on Audius right now. Can you find the top trending tracks?",
      expectedEndpoint: "/v1/tracks/trending"
    },
    {
      query: "What genre is REFLECTIONS by ENOCH?",
      expectedEndpoint: "/v1/tracks/search"
    },
    {
      query: "How many plays does 'Craig Connelly & Lasada - Found You' have?",
      expectedEndpoint: "/v1/tracks/search"
    },
    {
      query: "Who is the artist that performed the track 'Pokemon & Chill'?",
      expectedEndpoint: "/v1/tracks/search"
    },
    {
      query: "I want to know more about the user 'Skrillex'. Can you fetch their profile information?",
      expectedEndpoint: "/v1/users/{user_id}"
    },
    {
      query: "Find users whose names contain 'John'",
      expectedEndpoint: "/v1/users/search"
    },
    {
      query: "Can you find the playlist 'Summer Vibes 2023' by DJ Sunshine?",
      expectedEndpoint: "/v1/playlists/search"
    },
    {
      query: "What are the top 5 tracks in the playlist 'TRICK CHENEY.'s Hackathon Trackathon' by TRICK CHENEY.?",
      expectedEndpoint: "/v1/playlists/search"
    },
    {
      query: "How many followers does the playlist 'TRICK CHENEY.'s Hackathon Trackathon' have?",
      expectedEndpoint: "/v1/playlists/search"
    },
    {
      query: "Find me some popular playlists with 'lofi' in the title",
      expectedEndpoint: "/v1/playlists/search"
    }
  ];

  for (const testCase of testCases) {
    console.log(`Query: ${testCase.query}`);
    const answer = await generateAnswer(app, llm, testCase.query);
    console.log(`Answer: ${answer}\n`);
  }
}

async function generateAnswer(app: any, llm: ChatOpenAI, query: string): Promise<string> {
  try {
    const result = await app.invoke({
      llm,
      query: query,
    });

    if (!result || !result.response) {
      return `No data found for the query: "${query}"`;
    }

    const apiResponse = result.response;
    const apiName = result.bestApi?.api_name;

    switch (apiName) {
      case 'Get Trending Tracks':
        return formatTrendingTracks(apiResponse.data);
      case 'Search Tracks':
        return formatSearchTracks(apiResponse.data, query);
      case 'Get User':
      case 'Search Users':
        return formatUserInfo(apiResponse.data, query);
      case 'Get Playlist':
      case 'Search Playlists':
        return formatPlaylistInfo(apiResponse.data, query);
      default:
        return `Unable to process the response for your query: "${query}"`;
    }
  } catch (error) {
    return `An error occurred while processing your query: "${query}"`;
  }
}

function formatTrendingTracks(data: any): string {
  const tracks = data.slice(0, 5);
  const trackList = tracks.map((track: any) => `"${track.title}" by ${track.user.name}`).join(', ');
  return `The top trending tracks on Audius right now are: ${trackList}`;
}

main().catch(console.error);