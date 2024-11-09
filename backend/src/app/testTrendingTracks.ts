// import { getAudiusSdk } from './sdkClient.js';
// import { apiLogger } from './logger.js';

// async function testGetTrendingTracks() {
//   try {
//     const response = await getAudiusSdk().then(sdk => sdk.tracks.getTrendingTracks());
//     apiLogger.debug("Test Get Trending Tracks Response:", JSON.stringify(response, null, 2));
    
//     if (response.data && response.data.length > 0) {
//       console.log("Top Trending Tracks:");
//       response.data.slice(0, 10).forEach((track: any, index: number) => {
//         console.log(`${index + 1}. "${track.title}" by ${track.user?.name || track.user?.handle || "Unknown Artist"}`);
//       });
//     } else {
//       console.log("No trending tracks found.");
//     }
//   } catch (error) {
//     apiLogger.error("Error in testGetTrendingTracks:", error);
//   }
// }

// testGetTrendingTracks();
