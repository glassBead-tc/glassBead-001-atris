// import { sdk, DiscoveryNodeSelector, StorageNodeSelectorConfig, StorageNodeSelector } from '@audius/sdk';
// import { ServicesContainer } from '@audius/sdk/dist/sdk/types.js';
// import { getAudiusApiKey, getAudiusApiSecret } from './config.js';


// const testQueries = [
//     "Find me some electronic music playlists with over 10000 plays.",
//     "What are the most popular tracks right now?",
//     "Show me users who create hip-hop music.",
//     "List all rock music playlists.",
//     "Who are the top artists in electronic music?"
// ];


// async function testAudiusApi() {
//     for (const query of testQueries) {
//         try {
//             console.log(`Testing query: "${query}"`);

//             // Test search users
//             const userResponse = await audiusSdkInstance.users.search(query, 3);
//             console.log("User Response:", userResponse);
        
//             // Test search tracks
//             const trackResponse = await audiusSdkInstance.tracks.search(query, 3);
//             console.log("Track Response:", trackResponse);

//             // Test search playlists
//             const playlistResponse = await audiusSdkInstance.playlists.search(query, 3);
//             console.log("Playlist Response:", playlistResponse);

//         } catch (error) {
//             console.error(`Error testing query "${query}":`, error);
//         }
//     }
// }

// // Initialize the Audius SDK instance with proper configuration
// const audiusSdkInstance = sdk({
//     apiKey: getAudiusApiKey(),
//     apiSecret: getAudiusApiSecret(),
//     appName: 'Atris',
//     services: {
//       discoveryNodeSelector: new DiscoveryNodeSelector(),
//       storageNodeSelector: new StorageNodeSelector(discoveryNodeSelector),
//     },
//     environment: 'development',
//   });

// // Run the tests
// testAudiusApi();