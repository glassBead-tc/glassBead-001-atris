import { createGraph } from '../../graph/createGraph.js';
import { GraphState, QueryType } from '../../types.js';

describe('createGraph', () => {
  test('creates a valid graph', () => {
    const graph = createGraph();
    expect(graph).toBeDefined();
    expect(typeof graph.invoke).toBe('function');
  });

  test('graph processes a simple query', async () => {
    const graph = createGraph();
    const initialState: GraphState = {
      query: 'What are the trending tracks?',
      apis: [],
      queryType: 'trending_tracks' as QueryType,
      entityType: undefined,
      categories: [],
      isEntityQuery: false,
      response: null,
      formattedResponse: '',
      error: null,
      llm: {} as any, // Mock LLM object
      bestApi: null,
      params: {},
    };

    const result = await graph.invoke(initialState);
    expect(result.bestApi?.api_name).toBe('trending_tracks');
    expect(result.formattedResponse).toBeTruthy();
    expect(result.error).toBeNull();
  });

  // Add more test cases for different query types and error scenarios
});
