import { QueryClassification } from '../types.js';
import { classifyQuery } from '../tools/node_tools/query_classifier.js';

console.log('Test file execution started');

async function runTests() {
  console.log('runTests function called');
  const testCases = [
    { query: "What are the trending tracks on Audius?", expected: { type: 'trending_tracks', isEntityQuery: false } },
    { query: "Tell me about the user RAC", expected: { type: 'user_info', isEntityQuery: true, entityType: 'user', entity: 'RAC' } },
    { query: "What's in the playlist 'Summer Hits 2023'?", expected: { type: 'playlist_info', isEntityQuery: true, entityType: 'playlist', entity: 'Summer Hits 2023' } },
    { query: "What genres are popular on Audius?", expected: { type: 'genre_info', isEntityQuery: false } },
    { query: "Who are the most followed artists?", expected: { type: 'user_social', isEntityQuery: false } },
    { query: "How many followers does Deadmau5 have?", expected: { type: 'user_info', isEntityQuery: true, entityType: 'user', entity: 'Deadmau5' } },
    { query: "What's the latest release from RAC?", expected: { type: 'user_tracks', isEntityQuery: true, entityType: 'user', entity: 'RAC' } },
    { query: "List the top 5 Electronic tracks", expected: { type: 'search_tracks', isEntityQuery: false } },
    { query: "Tell me about the Audius platform", expected: { type: 'general', isEntityQuery: false } },
  ];

  for (const testCase of testCases) {
    try {
      console.log(`Testing query: "${testCase.query}"`);
      const result: QueryClassification = await classifyQuery(testCase.query);
      console.log(`Result: ${JSON.stringify(result)}`);
      console.log(`Expected: ${JSON.stringify(testCase.expected)}`);
      console.log(`Test ${JSON.stringify(result) === JSON.stringify(testCase.expected) ? 'PASSED' : 'FAILED'}`);
      console.log('---');
    } catch (error) {
      console.error(`Error testing query "${testCase.query}":`, error);
    }
  }
}

console.log('Starting tests...');
runTests().then(() => {
  console.log('All tests completed.');
}).catch(error => {
  console.error('Error running tests:', error);
});

console.log('Test file execution completed');
