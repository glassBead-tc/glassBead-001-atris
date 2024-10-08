import { ChatOpenAI } from "@langchain/openai";
import { createGraph } from "./graph/createGraph.js";
import { formatSearchTracks, formatUserInfo, formatPlaylistInfo, formatTrendingTracks, formatTrackResults } from "./utils/formatResults.js";
import { searchTracks } from "./utils/searchUtils.js";
import { extractSearchQuery } from "./extractionUtils.js";
import { audiusApi } from "./tools/create_fetch_request.js";
async function main() {
  const app = createGraph();
  const llm = new ChatOpenAI({
    modelName: "gpt-4-turbo-preview",
    temperature: 0,
  });

  const testCase = {
    query: "What is the genre of What You Want (instrumental) by TRICK CHENEY?",
    expectedEndpoint: "/v1/tracks/search"
  };

  console.log(`Query: ${testCase.query}`);
  const answer = await generateAnswer(app, llm, testCase.query);
  console.log(`Answer: ${answer}\n`);
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

    // Even if result.response is null, we'll try to search for tracks
    if (apiName === 'Search Tracks' || apiName === 'Get Track') {
      const { track, artist } = extractSearchQuery(query);
      console.log(`Extracted track: "${track}", artist: "${artist}"`);
      
      let tracks = await searchTracks(`${track} ${artist}`.trim());
      
      if (tracks.length === 0) {
        const possibleUrl = `https://audius.co/${artist.toLowerCase().replace(/\s+/g, '')}/${track.toLowerCase().replace(/\s+/g, '-')}`;
        console.log(`Checking direct URL: ${possibleUrl}`);
        
        const directTrack = await audiusApi.getTrackByPermalink(possibleUrl);
        if (directTrack) {
          tracks = [directTrack];
        } else {
          return `I couldn't find the track "${track}" by ${artist} through the API search or direct URL. It's possible the track doesn't exist on Audius or there might be an issue with the search.`;
        }
      }
      
      return formatSearchTracks(tracks, `${track} by ${artist}`);
    }

    // Handle other API cases here...

    return `Unable to process the response for your query: "${query}"`;
  } catch (error) {
    console.error("Error in generateAnswer:", error);
    return `An error occurred while processing your query: "${query}". Please try again or rephrase your question. Error details: ${error instanceof Error ? error.message : String(error)}`;
  }
}

main().catch(console.error);