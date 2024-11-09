// import { main } from './index.js';

// async function runInteractiveTest() {
//   const testQueries = [
//     "What are the top 10 trending tracks on Audius?",
//     "How many plays does the track '115 SECONDS OF CLAMS' have?",
//     "Who has the most followers on Audius?"
//   ];

//   try {
//     const results = await main(testQueries);
//     console.log("\n=== Test Results ===");
//     console.log(`Processed ${results.length} queries`);
//     results.forEach((result, index) => {
//       console.log(`\nQuery ${index + 1} Result:`, result.response);
//     });
//   } catch (error) {
//     console.error("Test failed:", error);
//   }
// }

// if (require.main === module) {
//   runInteractiveTest().catch(console.error);
// }