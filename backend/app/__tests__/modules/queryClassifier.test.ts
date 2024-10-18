import { classifyQuery } from '../../tools/node_tools/query_classifier.js';
import { ComplexityLevel } from '../../types.js';

describe('queryClassifier', () => {
  test('classifies trending tracks query', () => {
    const result = classifyQuery('What are the trending tracks?');
    expect(result).toEqual({
      isEntityQuery: false,
      type: 'trending_tracks',
      message: '',
      entity: null,
      complexity: 'simple' as ComplexityLevel,
    });
  });

  test('classifies user search query', () => {
    const result = classifyQuery('Find user John Doe');
    expect(result).toEqual({
      isEntityQuery: true,
      type: 'user_info',
      entity: 'John Doe',
      entityType: 'user',
      message: '',
      complexity: 'simple' as ComplexityLevel,
    });
  });

  test('classifies track search query', () => {
    const result = classifyQuery('Search for the song "Happy" by Pharrell Williams');
    expect(result).toEqual({
      isEntityQuery: true,
      type: 'track_info',
      entity: 'Happy',
      entityType: 'track',
      message: '',
      complexity: 'simple' as ComplexityLevel,
    });
  });

  // Add more test cases for other query types
});
