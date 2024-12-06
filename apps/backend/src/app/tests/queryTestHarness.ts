import { main } from '../index.js';
import { GraphState } from '../types.js';

interface TestCase {
  query: string;
  expectedType: string;
  expectedApi?: string;
  validation: (state: GraphState) => boolean;
}

const testCases: TestCase[] = [
  {
    query: "What are the top trending tracks on Audius?",
    expectedType: "trending_tracks",
    expectedApi: "Get Trending Tracks",
    validation: (state) => {
      // Safe null checks
      if (!state.response?.data) return false;
      if (!state.bestApi?.api_name) return false;
      
      return (
        Array.isArray(state.response.data) && 
        state.response.data.length > 0 &&
        state.bestApi.api_name === "Get Trending Tracks"
      );
    }
  },
  {
    query: "How many plays does RAC have?",
    expectedType: "user_stats",
    expectedApi: "Get User",
    validation: (state) => {
      // Safe null checks
      if (!state.response?.data) return false;
      if (!state.entityType) return false;
      if (!state.entityName) return false;
      
      return (
        state.entityType === 'user' &&
        state.entityName.toLowerCase() === 'rac'
      );
    }
  }
];

async function runTestSuite() {
  console.log("Starting test suite...");
  const results = {
    passed: 0,
    failed: 0,
    errors: [] as Array<{
      query: string;
      error: string;
      state?: Partial<GraphState>;
    }>
  };

  for (const [index, test] of testCases.entries()) {
    try {
      console.log(`\nTest ${index + 1}/${testCases.length}: "${test.query}"`);
      console.time('Query processing');
      
      const states = await main([test.query]);
      if (!Array.isArray(states)) {
        throw new Error('Expected array of states from main()');
      }
      
      const finalState = states[0];
      if (!finalState) {
        throw new Error('No state returned for query');
      }
      
      console.timeEnd('Query processing');

      if (test.validation(finalState)) {
        results.passed++;
        console.log('✅ Test passed');
      } else {
        results.failed++;
        console.log('❌ Test failed');
        results.errors.push({
          query: test.query,
          error: 'Validation failed',
          state: finalState
        });
      }
      
    } catch (err) {
      const error = err as Error;
      results.failed++;
      results.errors.push({
        query: test.query,
        error: error.message
      });
      console.log('❌ Test error:', error.message);
    }
  }

  return results;
}

export { runTestSuite, testCases };