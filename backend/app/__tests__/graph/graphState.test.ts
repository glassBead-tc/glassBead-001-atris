import { createGraph } from '../../graph/createAtris.js';
import { GraphState, QueryType } from '../../types.js';
import { createDefaultGraphState } from '../helpers/createDefaultGraphState.js'; // Assuming you created this helper

describe('createGraph', () => {
  test('creates a valid graph', () => {
    const graph = createGraph();
    expect(graph).toBeDefined();
    expect(typeof graph.invoke).toBe('function');
  });

  test('graph processes a simple query', async () => {
    const graph = createGraph();
    const initialState: GraphState = createDefaultGraphState({
      query: 'What are the trending tracks?',
      queryType: 'trending_tracks',
      formattedResponse: '',
      // Add or override other properties if needed
    });

    const result = await graph.invoke(initialState);
    expect(result.bestApi?.api_name).toBe('trending_tracks');
    expect(result.formattedResponse).toBeTruthy();
    expect(result.error).toBeNull();
  });

  // Add more test cases for different query types and error scenarios
});