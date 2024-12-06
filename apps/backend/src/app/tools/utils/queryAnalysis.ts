import { HIGH_LEVEL_CATEGORIES, HighLevelCategory, isAudiusQuery, CategoryTrigger } from '../../constants.js';
import { entityPropertyMap } from '../propertyMap.js';
import type { EntityType } from '../../types.js';

// Technical keywords that indicate a non-entity query
const TECHNICAL_KEYWORDS = [
  // API-related
  'endpoint', 'api', 'request', 'response', 'authentication',
  // SDK-related
  'sdk', 'implementation', 'integration', 'initialize',
  // Protocol-related
  'node', 'architecture', 'protocol', 'network',
  // Development-related
  'implement', 'develop', 'build', 'create',
  // Documentation-related
  'documentation', 'docs', 'guide', 'tutorial',
  // Technical concepts
  'function', 'method', 'parameter', 'return', 'value'
] as const;

interface QueryAnalysis {
  highLevelCategory: HighLevelCategory | null;
  entityType: EntityType | null;
  properties: string[];
  isAudiusRelated: boolean;
  confidence: number;
  isTrendingQuery: boolean;
  isGenreQuery: boolean;
  isTechnicalQuery: boolean;  // New field
}

export function analyzeQuery(query: string): QueryAnalysis {
  const normalizedQuery = query.toLowerCase();
  const isAudiusRelated = isAudiusQuery(query);

  // Check for technical keywords
  const technicalMatches = TECHNICAL_KEYWORDS.filter(keyword => 
    normalizedQuery.includes(keyword.toLowerCase())
  );
  const isTechnicalQuery = technicalMatches.length > 0;

  // If not Audius-related, return early
  if (!isAudiusRelated) {
    return {
      highLevelCategory: null,
      entityType: null,
      properties: [],
      isAudiusRelated: false,
      confidence: 1.0,
      isTrendingQuery: false,
      isGenreQuery: false,
      isTechnicalQuery: true
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
    isGenreQuery,
    isTechnicalQuery
  };
}

// Helper function to detect entity type with improved accuracy
function detectEntityType(query: string): EntityType | null {
  // First check if it's a technical query
  const isTechnicalQuery = TECHNICAL_KEYWORDS.some(keyword => 
    query.includes(keyword.toLowerCase())
  );
  
  // If it's a technical query, it's less likely to be about a specific entity
  if (isTechnicalQuery) {
    return null;
  }

  // Enhanced entity detection with more context-aware checks
  const words = query.split(' ');
  
  // Check for playlist/album indicators
  if (
    query.includes('playlist') || 
    query.includes('album') || 
    (query.includes('collection') && !query.includes('collection of'))
  ) {
    return 'playlist';
  }
  
  // Check for user/artist indicators
  if (
    query.includes('artist') || 
    query.includes('user') || 
    query.includes('profile') ||
    query.includes('creator')
  ) {
    return 'user';
  }
  
  // Check for track/song indicators with better context
  if (
    query.includes('track') || 
    query.includes('song') || 
    (query.includes('music') && !query.includes('music platform'))
  ) {
    return 'track';
  }
  
  return null;
}