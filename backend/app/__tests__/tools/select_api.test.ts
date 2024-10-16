import { GraphState, DatasetSchema, QueryType, ComplexityLevel } from '../../types.js';
import { selectApi } from '../../tools/node_tools/select_api.js';

describe('selectApi', () => {
  const mockApis: DatasetSchema[] = [
    {
      id: '1',
      api_name: 'trending_tracks',
      api_description: 'Get trending tracks',
      category_name: 'Tracks',
      tool_name: 'Audius API',
      required_parameters: [],
      optional_parameters: [],
      method: 'GET',
      api_url: '/v1/tracks/trending',
    },
    {
      id: '2',
      api_name: 'search_users',
      api_description: 'Search for users',
      category_name: 'Users',
      tool_name: 'Audius API',
      required_parameters: [
        {
          name: 'query',
          type: 'string',
          description: 'The search query',
          default: ''
        }
      ],
      optional_parameters: [],
      method: 'GET',
      api_url: '/v1/users/search',
    },
    // Add more mock APIs as needed
  ];

  const createMockState = (overrides: Partial<GraphState> = {}): GraphState => ({
    query: '',
    apis: mockApis,
    queryType: 'unknown' as QueryType,
    entityType: null,
    entity: null,
    categories: [],
    isEntityQuery: false,
    response: null,
    formattedResponse: '',
    error: false,
    message: null,
    complexity: 'simple' as ComplexityLevel,
    llm: {} as any,
    bestApi: null,
    params: {},
    ...overrides
  });

  test('selects trending tracks API', () => {
    const state = createMockState({ 
      query: 'What are the trending tracks?',
      queryType: 'trending_tracks' as QueryType,
      categories: ['Tracks']
    });
    const result = selectApi(state);
    expect(result.bestApi?.api_name).toBe('trending_tracks');
  });

  test('selects user search API', () => {
    const state = createMockState({ 
      query: 'Find user John Doe',
      queryType: 'user_info' as QueryType,
      categories: ['Users']
    });
    const result = selectApi(state);
    expect(result.bestApi?.api_name).toBe('search_users');
  });

  test('returns error when no suitable API found', () => {
    const state = createMockState({ 
      query: 'What is the meaning of life?',
      queryType: 'unknown' as QueryType,
      categories: []
    });
    const result = selectApi(state);
    expect(result.error).toBe(true);
  });

  // Add more test cases for other API selections
});
