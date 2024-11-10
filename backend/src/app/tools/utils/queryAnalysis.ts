import { HIGH_LEVEL_CATEGORIES, HighLevelCategory, isAudiusQuery, CategoryTrigger } from '../../constants.js';
import { entityPropertyMap } from '../propertyMap.js';
import type { EntityType } from '../../types.js';


interface QueryAnalysis {
  highLevelCategory: HighLevelCategory | null;
  entityType: EntityType | null;
  properties: string[];
  isAudiusRelated: boolean;
  confidence: number;
  isTrendingQuery: boolean;
  isGenreQuery: boolean;
}

export function analyzeQuery(query: string): QueryAnalysis {
  const normalizedQuery = query.toLowerCase();
  const isAudiusRelated = isAudiusQuery(query);

  // If not Audius-related, return early
  if (!isAudiusRelated) {
    return {
      highLevelCategory: null,
      entityType: null,
      properties: [],
      isAudiusRelated: false,
      confidence: 1.0,
      isTrendingQuery: false,
      isGenreQuery: false
    };
  }

  // Detect entity type from query
  const entityType = detectEntityType(normalizedQuery);
  
  // Get relevant properties based on entity type
  const properties = entityType ? 
    entityPropertyMap[entityType].filter(prop => 
      normalizedQuery.includes(prop.toLowerCase())
    ) : [];

  // Calculate category match scores
  const categoryScores = Object.entries(HIGH_LEVEL_CATEGORIES)
    .map(([category, info]) => {
      const triggerMatches = (info.triggers as readonly string[]).filter(trigger => 
        normalizedQuery.includes(trigger.toLowerCase())
      ).length;

      // Weight based on:
      // 1. Number of trigger matches
      // 2. Entity type alignment with category
      // 3. Property relevance to category
      let score = triggerMatches;
      
      // Add entity type weighting
      if (entityType) {
        switch (category) {
          case 'TRENDING':
            score += ['track', 'playlist'].includes(entityType) ? 0.5 : 0;
            break;
          case 'USER':
            score += entityType === 'user' ? 0.5 : 0;
            break;
          case 'PLAYLIST':
            score += entityType === 'playlist' ? 0.5 : 0;
            break;
          // Add other category-specific weightings
        }
      }

      return {
        category: category as HighLevelCategory,
        score
      };
    });

  // Get highest scoring category
  const bestCategory = categoryScores.reduce((best, current) => 
    current.score > best.score ? current : best
  );

  // Determine if this is a custom calculation case
  const needsCustomCalculation = 
    (entityType === 'user' && normalizedQuery.includes('trending')) ||
    (entityType === 'user' && normalizedQuery.includes('popular')) ||
    normalizedQuery.includes('genre') ||
    normalizedQuery.includes('most played');

  // Calculate confidence based on score differential
  const nextBestScore = categoryScores
    .filter(c => c.category !== bestCategory.category)
    .reduce((max, current) => current.score > max ? current.score : max, 0);
  
  const confidence = bestCategory.score > 0 ? 
    (bestCategory.score - nextBestScore) / bestCategory.score : 
    0;

  // Adjust complexity based on custom calculations
  const complexity = needsCustomCalculation ? 0.6 : confidence;

  // Detect if this is a trending query
  const trendingTriggers = ['trending', 'popular', 'hot', 'top', 'best'];
  const isTrendingQuery = trendingTriggers.some(trigger => 
    normalizedQuery.includes(trigger)
  );

  // Detect if this is a genre-related query
  const genreTriggers = ['genre', 'style', 'type of music'];
  const isGenreQuery = genreTriggers.some(trigger => 
    normalizedQuery.includes(trigger)
  );

  return {
    highLevelCategory: bestCategory.score > 0 ? bestCategory.category : 'GENERAL',
    entityType,
    properties,
    isAudiusRelated: true,
    confidence: complexity,
    isTrendingQuery,
    isGenreQuery
  };
}

// Helper function to detect entity type
function detectEntityType(query: string): EntityType | null {
  if (query.includes('playlist') || query.includes('album') || query.includes('collection')) {
    return 'playlist';
  }
  if (query.includes('artist') || query.includes('user') || query.includes('profile')) {
    return 'user';
  }
  if (query.includes('track') || query.includes('song') || query.includes('music')) {
    return 'track';
  }
  return null;
} 