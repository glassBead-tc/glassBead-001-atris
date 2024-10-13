import { extractParameters } from '../../tools/extract_parameters.js';
import { GraphState, QueryType, DatasetSchema, ComplexityLevel } from '../../types.js';
import { createDefaultGraphState } from '../helpers/createDefaultGraphState.js'; // Assuming you created this helper

describe('extractParameters', () => {
  const mockState: GraphState = createDefaultGraphState({
    query: '',
    queryType: 'UNKNOWN',
    entityType: null,
    categories: [],
    isEntityQuery: false,
    response: null,
    formattedResponse: '',
    error: null,
    llm: {} as any, // Mock LLM object
    bestApi: null,
    params: {},
  });

  test('extracts user name from query', async () => {
    const state: GraphState = createDefaultGraphState({
      ...mockState,
      query: 'Find user John Doe',
      queryType: 'user_info' as QueryType,
      bestApi: { 
        api_name: 'search_users',
        required_parameters: [{ name: 'query', type: 'string', description: '', default: '' }]
      } as DatasetSchema,
      message: '',
      entity: 'John Doe',
      complexity: 'low' as ComplexityLevel,
    });
    const result = await extractParameters(state);
    expect(result.params).toEqual({ query: 'John Doe', limit: 1 });
  });

  test('extracts track name and artist from query', async () => {
    const state: GraphState = createDefaultGraphState({
      ...mockState,
      query: 'Search for the song "Happy" by Pharrell Williams',
      queryType: 'track_info' as QueryType,
      bestApi: { 
        api_name: 'search_tracks',
        required_parameters: [{ name: 'query', type: 'string', description: '', default: '' }]
      } as DatasetSchema,
      message: '',
      entity: 'Happy',
      complexity: 'simple' as ComplexityLevel,
    });
    const result = await extractParameters(state);
    expect(result.params).toEqual({ query: '"Happy" "Pharrell Williams"', limit: 10 });
  });

  // Add more test cases for other parameter extractions
});