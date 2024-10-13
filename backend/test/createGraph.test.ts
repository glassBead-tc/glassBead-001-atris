import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import { createGraph } from '../app/graph/createGraph.js';
import { GraphState, DatasetSchema } from '../app/types.js';
import * as queryClassifier from '../app/modules/queryClassifier.js';
import * as extractCategory from '../app/tools/extract_category.js';
import * as getApis from '../app/tools/get_apis.js';

jest.mock('../app/modules/queryClassifier.js');
jest.mock('../app/tools/extract_category.js');
jest.mock('../app/tools/get_apis.js');
jest.mock('../app/tools/select_api.js');
jest.mock('../app/tools/extract_parameters.js');
jest.mock('../app/tools/create_fetch_request.js');
jest.mock('../app/tools/process_api_response.js');

describe('createGraph', () => {
  let graph: ReturnType<typeof createGraph>;

  beforeEach(() => {
    graph = createGraph();
    jest.clearAllMocks();
  });

  test('should handle timeout in classify_query node', async () => {
    const mockClassifyQuery = jest.fn().mockImplementation(() => {
      return new Promise((resolve) => setTimeout(() => resolve({}), 31000));
    });
    jest.spyOn(queryClassifier, 'classifyQuery').mockImplementation(mockClassifyQuery as any);

    const initialState: Partial<GraphState> = {
      query: 'test query',
    };

    const result = await graph.invoke(initialState);

    expect(result.error).toBeDefined();
    expect(result.error).toContain('Operation timed out');
  });

  test('should retry failed API calls', async () => {
    const mockGetApis = jest.fn<Promise<Partial<GraphState>>, [GraphState]>()
      .mockRejectedValueOnce(new Error('API Error'))
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce({ apis: [] as DatasetSchema[] });

    (getApis.getApis as jest.MockedFunction<typeof getApis.getApis>).mockImplementation(mockGetApis);

    const initialState: Partial<GraphState> = {
      query: 'test query',
    };

    const result = await graph.invoke(initialState);

    expect(mockGetApis).toHaveBeenCalledTimes(3);
    expect(result.error).toBeUndefined();
  });

  test('should handle errors gracefully', async () => {
    const mockExtractCategory = jest.fn<Promise<Partial<GraphState>>, [GraphState]>()
      .mockRejectedValue(new Error('Test Error'));

    (extractCategory.extractCategory as jest.MockedFunction<typeof extractCategory.extractCategory>).mockImplementation(mockExtractCategory);

    const initialState: Partial<GraphState> = {
      query: 'test query',
    };

    const result = await graph.invoke(initialState);

    expect(result.error).toBeDefined();
    expect(result.error).toContain('Test Error');
    expect(result.formattedResponse).toContain('an error occurred');
  });
});
