import { ChatOpenAI } from '@langchain/openai';
import { extractParameters } from '../../tools/node_tools/extract_parameters.js';
import { ComplexityLevel, Entity, GraphState } from '../../types.js';

const llm = {
  call: jest.fn(),
  invoke: jest.fn(),
  predict: jest.fn(),
  predictMessages: jest.fn(),
  getNumTokens: jest.fn(),
} as unknown as ChatOpenAI;

describe('extractParameters', () => {
  it('should handle genre_info queries correctly', async () => {
    const state: GraphState = {
      query: 'What are the most popular genres on Audius?',
      queryType: 'genre_info',
      entityType: null,
      entity: null,
      params: {},
      error: undefined,
      message: null,
      llm: llm,
      categories: [],
      apis: [],
      bestApi: null,
      response: [],
      complexity: 'simple' as ComplexityLevel,
      formattedResponse: 'test',
    };

    const updatedState = await extractParameters(state);
    expect(updatedState.params.timeframe).toBe('week');
    expect(updatedState.params.limit).toBe(5);
  });

  it('should handle search_tracks queries with entity', async () => {
    const state: GraphState = {
      query: 'What is the genre of "Blinding Lights" by "The Weeknd"?',
      queryType: 'search_tracks',
      entityType: 'track',
      entity: { title: 'Blinding Lights', genre: 'Pop' } as unknown as Entity,
      params: {},
      error: undefined,
      message: null,
      llm: llm,
      categories: [],
      apis: [],
      bestApi: null,
      response: [],
      complexity: 'simple' as ComplexityLevel,
      formattedResponse: 'test',
    };

    const updatedState = await extractParameters(state);
    expect(updatedState.params.track).toBe('Blinding Lights');
    expect(updatedState.params.user).toBe('The Weeknd');
  });

  it('should handle search_tracks queries without valid entity', async () => {
    const state: GraphState = {
      query: 'What is the genre of "Blinding Lights"?',
      queryType: 'search_tracks',
      entityType: null,
      entity: null,
      params: {},
      error: undefined,
      message: null,
      llm: llm,
      categories: [],
      apis: [],
      bestApi: null,
      response: [],
      complexity: 'simple' as ComplexityLevel,
      formattedResponse: 'test',
    };

    const updatedState = await extractParameters(state);
    expect(updatedState.params.track).toBe('Blinding Lights');
    expect(updatedState.params.artist).toBe('');
  });

  // Add more test cases as needed
});
