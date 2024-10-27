import { globalAudiusApi } from "./app/services/audiusApi.js";

const testQueries = [
    "Find me some electronic music playlists with over 10000 plays.",
    "What are the most popular tracks right now?",
    "Show me users who create hip-hop music.",
    "List all rock music playlists.",
    "Who are the top artists in electronic music?"
];

async function testAudiusApi() {
    for (const query of testQueries) {
        try {
            console.log(`Testing query: "${query}"`);

            // Test search users
            const userResponse = await globalAudiusApi.searchUsers(query, 3);
            console.log("User Response:", userResponse);

            // Test search tracks
            const trackResponse = await globalAudiusApi.searchTracks(query, 3);
            console.log("Track Response:", trackResponse);

            // Test search playlists
            const playlistResponse = await globalAudiusApi.searchPlaylists(query, 3);
            console.log("Playlist Response:", playlistResponse);

        } catch (error) {
            console.error(`Error testing query "${query}":`, error);
        }
    }
}

// Run the tests
testAudiusApi();