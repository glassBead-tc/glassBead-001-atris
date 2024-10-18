import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import { createGraph } from '../../graph/createAtris.js';
import { GraphState, ComplexityLevel } from '../../types.js';
import * as queryClassifier from '../../tools/node_tools/query_classifier.js';
import * as extractCategory from '../../tools/node_tools/extract_category.js';
import * as getApis from '../../tools/node_tools/get_apis.js';
import { createDefaultGraphState } from '../helpers/createDefaultGraphState.js';

jest.mock('../../modules/queryClassifier.js');
jest.mock('../../tools/extract_category.js');
jest.mock('../../tools/get_apis.js');
jest.mock('../../tools/select_api.js');
jest.mock('../../tools/extract_parameters.js');
jest.mock('../../tools/create_fetch_request.js');
jest.mock('../../tools/process_api_response.js');

describe('createGraph', () => {
  let graph: ReturnType<typeof createGraph>;

  beforeEach(() => {
    graph = createGraph();
    jest.clearAllMocks();
  });

  test('should handle timeout in classify_query node', async () => {
    const mockClassifyQuery = jest.fn().mockImplementation(() => {
      return new Promise((resolve) => setTimeout(() => resolve({}), 31000));
    }) as jest.MockedFunction<typeof queryClassifier.classifyQuery>;
    jest.spyOn(queryClassifier, 'classifyQuery').mockImplementation(mockClassifyQuery);

    const initialState: GraphState = createDefaultGraphState({
      query: 'test query',
      message: '',
      entity: null,
      complexity: 'simple' as ComplexityLevel,
    });

    const result = await graph.invoke(initialState);

    expect(mockClassifyQuery).toHaveBeenCalled();
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Operation timed out');
  });

  test('should handle errors gracefully', async () => {
    const mockedExtractCategory = jest.mocked(extractCategory.extractCategory);
    mockedExtractCategory.mockImplementation(async (state: GraphState): Promise<GraphState> => ({
      ...state,
      error: true,
      categories: ['General'],
      isEntityQuery: false
    }));

    const initialState: GraphState = createDefaultGraphState({
      query: 'test query',
      message: '',
      entity: null,
      complexity: 'simple' as ComplexityLevel,
    });

    const result = await graph.invoke(initialState);

    expect(mockedExtractCategory).toHaveBeenCalled();
    expect(result.error).toBe(true);
    expect(result.formattedResponse).toContain('an error occurred');
  });
});
