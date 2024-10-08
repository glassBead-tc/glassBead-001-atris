import { ApiEndpoint } from '../types.js';
import { logger } from '../logger.js';

interface KeywordPattern {
  pattern: RegExp;
  apis: string[];
  weight: number;
}

export class KeywordAwareness {
  private apis: ApiEndpoint[];

  constructor(apis: ApiEndpoint[]) {
    this.apis = apis;
  }

  private keywordApiMapping: Record<string, string[]> = {
    'trending': ['Get Trending Tracks', 'Get Trending Playlists'],
    'popular': ['Get Trending Tracks', 'Get Trending Playlists'],
    'search': ['Search Tracks', 'Search Users', 'Search Playlists'],
    'find': ['Search Tracks', 'Search Users', 'Search Playlists'],
    'user': ['Get User', 'Search Users'],
    'playlist': ['Get Playlist', 'Search Playlists'],
    'track': ['Get Track', 'Search Tracks'],
  };

  private keywordWeights: Record<string, number> = {
    'trending': 15,
    'popular': 12,
    'search': 10,
    'find': 8,
    'user': 5,
    'playlist': 5,
    'track': 5,
  };

  private keywordPatterns: KeywordPattern[] = [
    { pattern: /trend(ing)?|popular/, apis: ['Get Trending Tracks', 'Get Trending Playlists'], weight: 15 },
    { pattern: /search|find/, apis: ['Search Tracks', 'Search Users', 'Search Playlists'], weight: 10 },
    { pattern: /user/, apis: ['Get User', 'Search Users'], weight: 5 },
    { pattern: /playlist/, apis: ['Get Playlist', 'Search Playlists'], weight: 5 },
    { pattern: /track/, apis: ['Get Track', 'Search Tracks'], weight: 5 },
  ];

  calculateApiRelevance(api: ApiEndpoint, query: string): number {
    let relevance = 0;
    const lowercaseQuery = query.toLowerCase();
    const queryWords = lowercaseQuery.split(' ');

    // Keyword mapping
    for (const word of queryWords) {
      if (word in this.keywordApiMapping && this.keywordApiMapping[word].includes(api.api_name)) {
        relevance += 5;
      }
    }

    // Weighted scoring
    for (const word of queryWords) {
      if (word in this.keywordWeights && api.api_name.toLowerCase().includes(word)) {
        relevance += this.keywordWeights[word];
      }
    }

    // Regular expression matching
    for (const { pattern, apis, weight } of this.keywordPatterns) {
      if (pattern.test(lowercaseQuery) && apis.includes(api.api_name)) {
        relevance += weight;
      }
    }

    logger.debug(`Relevance score for ${api.api_name}: ${relevance}`);
    return relevance;
  }

  // Methods for updating weights and patterns (to be used with RAG in the future)
  updateKeywordWeight(keyword: string, weight: number): void {
    this.keywordWeights[keyword] = weight;
  }

  addKeywordPattern(pattern: RegExp, apis: string[], weight: number): void {
    this.keywordPatterns.push({ pattern, apis, weight });
  }
}

// Usage in selectApi function
export function selectApi(apis: ApiEndpoint[], query: string): ApiEndpoint | null {
  const keywordAwareness = new KeywordAwareness(apis);
  
  const scoredApis = apis.map(api => ({
    api,
    score: keywordAwareness.calculateApiRelevance(api, query)
  }));

  scoredApis.sort((a, b) => b.score - a.score);

  return scoredApis[0]?.api || null;
}
