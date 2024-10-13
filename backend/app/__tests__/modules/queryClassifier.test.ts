import { classifyQuery } from '../../modules/queryClassifier.js';
import { GraphState, DatasetSchema, QueryType } from '../../types.js';
import { selectApi } from '../../tools/select_api.js';

describe('queryClassifier', () => {
  test('classifies trending tracks query', () => {
    const result = classifyQuery('What are the trending tracks?');
    expect(result).toEqual({
      isEntityQuery: false,
      type: 'trending_tracks'
    });
  });

  test('classifies user search query', () => {
    const result = classifyQuery('Find user John Doe');
    expect(result).toEqual({
      isEntityQuery: true,
      type: 'user_info',
      entity: 'John Doe',
      entityType: 'user'
    });
  });

  test('classifies track search query', () => {
    const result = classifyQuery('Search for the song "Happy" by Pharrell Williams');
    expect(result).toEqual({
      isEntityQuery: true,
      type: 'track_info',
      entity: 'Happy',
      entityType: 'track'
    });
  });

  // Add more test cases for other query types
});

