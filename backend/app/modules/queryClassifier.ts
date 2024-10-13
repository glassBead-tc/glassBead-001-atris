import nlp from 'compromise';
import { ComplexityLevel } from '../types.js';
import { logger } from '../logger.js';

export interface QueryClassification {
  type: string;
  isEntityQuery: boolean;
  entityType: 'user' | 'track' | 'playlist' | 'genre' | null;
  entity: string | null;
  complexity: ComplexityLevel;
}

const contractions: { [key: string]: string } = {
  "what's": "what is",
  "where's": "where is",
  "when's": "when is",
  "who's": "who is",
  "how's": "how is",
  "that's": "that is",
  "there's": "there is",
  "here's": "here is",
  "it's": "it is",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "weren't": "were not",
  "haven't": "have not",
  "hasn't": "has not",
  "hadn't": "had not",
  "won't": "will not",
  "wouldn't": "would not",
  "don't": "do not",
  "doesn't": "does not",
  "didn't": "did not",
  "can't": "cannot",
  "couldn't": "could not",
  "shouldn't": "should not",
  "mightn't": "might not",
  "mustn't": "must not"
};

function expandContractions(text: string): string {
  const contractionPattern = new RegExp(Object.keys(contractions).join("|"), "gi");
  return text.replace(contractionPattern, match => contractions[match.toLowerCase()] || match);
}

export function classifyQuery(query: string): QueryClassification {
  logger.debug(`Classifying query: ${query}`);
  const expandedQuery = expandContractions(query);
  const lowercaseQuery = expandedQuery.toLowerCase();
  const doc = nlp(expandedQuery);

  let classification: QueryClassification = {
    type: 'search_tracks',
    isEntityQuery: true,
    entityType: 'track',
    entity: null,
    complexity: 'simple', // Default complexity
  };

  try {
    // Enhanced patterns to match genre queries
    if (/what (genres|music styles) are trending/i.test(lowercaseQuery) ||
        /genres.*trending/i.test(lowercaseQuery) ||
        /trending.*genres/i.test(lowercaseQuery)) {
      return {
        type: 'genre_info',
        isEntityQuery: true, // Set to true
        entityType: 'genre', // Set to 'genre'
        entity: null,        // No specific genre mentioned
        complexity: 'moderate',
      };
    }

    // Check for non-entity queries first
    if (lowercaseQuery.includes('what is audius') || 
        lowercaseQuery.includes('when was audius founded') ||
        lowercaseQuery.includes('who is audius ceo')) {
      classification.type = 'company_info';
      return classification;
    }

    // Query type detection
    if (lowercaseQuery.includes('trending') || lowercaseQuery.includes('popular')) {
      if (lowercaseQuery.includes('genre') || lowercaseQuery.includes('style')) {
        classification.type = 'genre_info';
      } else {
        classification.type = 'trending_tracks';
      }
      classification.isEntityQuery = true;
      classification.entityType = 'track';
    } else if (lowercaseQuery.includes('playlist')) {
      classification.type = 'playlist_info';
      classification.isEntityQuery = true;
      classification.entityType = 'playlist';
    } else if (lowercaseQuery.includes('track') || lowercaseQuery.includes('song')) {
      if (lowercaseQuery.includes('list') || lowercaseQuery.includes('top')) {
        classification.type = 'search_tracks';
      } else {
        classification.type = 'track_info';
      }
      classification.isEntityQuery = true;
      classification.entityType = 'track';
    } else if (lowercaseQuery.includes('user') || lowercaseQuery.includes('artist') || lowercaseQuery.includes('follower')) {
      if (lowercaseQuery.includes('most followed') || lowercaseQuery.includes('top artists')) {
        classification.type = 'user_social';
      } else {
        classification.type = 'user_info';
      }
      classification.isEntityQuery = true;
      classification.entityType = 'user';
    } else if (lowercaseQuery.includes('latest release') || lowercaseQuery.includes('new release')) {
      classification.type = 'user_tracks';
      classification.isEntityQuery = true;
      classification.entityType = 'user';
    } else if (lowercaseQuery.includes('list') || lowercaseQuery.includes('top') || lowercaseQuery.includes('search')) {
      classification.type = 'search_tracks';
      classification.isEntityQuery = true;
      classification.entityType = 'track';
    }

    // Identify trending genres queries
    if (/most popular genres|trending genres/i.test(query)) {
      classification.type = 'trendingGenres';
      classification.isEntityQuery = false;
      classification.entityType = null;
      classification.entity = null;
      classification.complexity = 'moderate';
    }

    // Enhanced regex patterns to match queries like "What genres are trending on Audius this week?"
    if (/what (genres|music styles) are trending/i.test(lowercaseQuery) || /genres.*trending/i.test(lowercaseQuery) || /trending.*genres/i.test(lowercaseQuery)) {
      return {
        type: 'genre_info',
        isEntityQuery: true,
        entityType: 'genre',
        entity: null, // No specific genre mentioned
        complexity: 'moderate',
      };
    }

    // Example: Future complex query
    if (/comprehensive analysis of genre popularity/i.test(query)) {
      classification.type = 'genreAnalysis';
      classification.complexity = 'complex';
    }

    // Adjust complexity based on query type
    switch (classification.type) {
      case 'trendingGenres':
        classification.complexity = 'moderate';
        break;
      case 'genreAnalysis':
        classification.complexity = 'complex';
        break;
      // Add more cases as needed
      default:
        classification.complexity = 'simple';
    }

    // Entity detection
    const quotedEntity = expandedQuery.match(/'([^']+)'/);
    if (quotedEntity && quotedEntity[1]) {
      classification.entity = quotedEntity[1];
    } else {
      const properNouns = doc.match('#ProperNoun+').out('array');
      if (properNouns.length > 0 && !['audius', 'platform'].includes(properNouns[0].toLowerCase())) {
        classification.entity = properNouns.join(' ');
      } else {
        const byIndex = lowercaseQuery.indexOf(' by ');
        if (byIndex !== -1) {
          classification.entity = expandedQuery.slice(byIndex + 3).split(' ').filter(word => word.length > 1).join(' ').trim();
        }
      }
    }

    // Remove question marks and extra words from entity names
    if (classification.entity) {
      classification.entity = classification.entity.replace(/\?$/, '').replace(/^(the|user|artist|track|song|playlist)\s+/i, '').trim();
    }

    // Fallback for unclassified queries
    if (classification.type === 'general') {
      classification.type = 'search_tracks';
      classification.isEntityQuery = true;
      classification.entityType = 'track';
    }

    // Additional specific cases
    if (/most followed artists/i.test(lowercaseQuery)) {
      return {
        type: 'user_social',
        isEntityQuery: false,
        entityType: null,
        entity: null,
        complexity: 'moderate',
      };
    }

  } catch (error) {
    logger.error(`Error in query classification: ${error}`);
    classification = {
      type: 'search_tracks',
      isEntityQuery: true,
      entityType: 'track',
      entity: null,
      complexity: 'simple',
    };
  }

  logger.debug(`Query classification result: ${JSON.stringify(classification)}`);
  return classification;
}
