import nlp from 'compromise';
import { QueryClassification } from '../types.js';
import { logger } from '../logger.js';

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
  // Add more contractions as needed
};

/**
 * Normalize entity names by removing parenthetical expressions and trimming whitespace.
 * @param name - The entity name to normalize.
 * @returns The normalized entity name.
 */
function normalizeName(name: string): string {
  return name.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
}

export async function classifyQuery(query: string): Promise<QueryClassification> {
  let classification: QueryClassification = {
    type: 'general',
    isEntityQuery: false,
    entityType: null,
    entity: null,
    complexity: 'simple',
  };

  const lowerQuery = query.toLowerCase();

  // Expand contractions
  Object.keys(contractions).forEach((contraction: string) => {
    const regex = new RegExp(`\\b${contraction}\\b`, 'gi');
    query = query.replace(regex, contractions[contraction]);
  });

  const doc = nlp(query);

  logger.debug(`Processing query: "${query}"`);

  // Enhanced entity extraction using NLP
  const people: string[] = doc.people().out('array');
  const places: string[] = doc.places().out('array');
  const organizations: string[] = doc.organizations().out('array');
  const topics: string[] = doc.topics().out('array');

  const allEntities: string[] = [...people, ...places, ...organizations, ...topics];
  logger.debug(`Detected entities: ${JSON.stringify(allEntities)}`);

  // Attempt to detect entity type based on detected entities
  if (allEntities.length > 0) {
    const entity: string = allEntities[0]; // Taking the first detected entity
    let detectedEntityType: 'user' | 'track' | 'playlist' | 'genre' | null = null;

    // Simplified entity type detection based on query content
    if (/artist|user|profile/i.test(lowerQuery)) {
      detectedEntityType = 'user';
    } else if (/track|song/i.test(lowerQuery)) {
      detectedEntityType = 'track';
    } else if (/playlist/i.test(lowerQuery)) {
      detectedEntityType = 'playlist';
    } else if (/genre/i.test(lowerQuery)) {
      detectedEntityType = 'genre';
    }

    if (detectedEntityType) {
      classification = {
        type: `search_${detectedEntityType}s`,
        isEntityQuery: true,
        entityType: detectedEntityType,
        entity: entity.trim(),
        complexity: 'simple',
      };
      logger.debug(`Entity identified: ${classification.type}`);
      return classification;
    }
  }

  // Specific pattern checks for test queries
  // Example: "What are the top 5 trending tracks on Audius right now?"
  if (/\b(trending|most followed|popular)\b.*\b(tracks|artists|playlists|genres)\b/i.test(lowerQuery)) {
    const match = query.match(/(?:trending|most followed|popular).*?\b(tracks|artists|playlists|genres)\b(?:.*?by\s["']?([\w\s.]+)["']?)?/i);
    if (match) {
      const detectedPluralEntityType = match[1].toLowerCase();
      const entity = match[2] ? match[2].trim() : null;

      let mappedEntityType: 'user' | 'track' | 'playlist' | 'genre' | null = null;
      switch (detectedPluralEntityType) {
        case 'tracks':
        case 'track':
          mappedEntityType = 'track';
          break;
        case 'artists':
        case 'artist':
          mappedEntityType = 'user';
          break;
        case 'playlists':
        case 'playlist':
          mappedEntityType = 'playlist';
          break;
        case 'genres':
        case 'genre':
          mappedEntityType = 'genre';
          break;
        default:
          break;
      }

      if (mappedEntityType) {
        classification = {
          type: `search_${mappedEntityType}s`,
          isEntityQuery: true, // Ensure isEntityQuery is true for search types
          entityType: mappedEntityType,
          entity: entity,
          complexity: 'simple',
        };
        logger.debug(`Pattern-based classification: ${classification.type}, isEntityQuery: ${classification.isEntityQuery}`);
        return classification;
      }
    }
  }

  if (/trending|popular|top tracks/i.test(lowerQuery)) {
    classification = {
      type: 'trending_tracks',
      isEntityQuery: false,
      entityType: null,
      entity: null,
      complexity: 'simple',
    };
    logger.debug(`Trending tracks query classification: ${classification.type}`);
    return classification;
  }

  // Line 144
  // Specific pattern checks for test queries
  // Example: "What are the top 5 trending tracks on Audius right now?"
  if (/\b(trending|most followed|popular)\b.*\b(tracks|artists|playlists|genres)\b/i.test(lowerQuery)) {
    const match = query.match(/(?:trending|most followed|popular).*?\b(tracks|artists|playlists|genres)\b(?:.*?by\s["']?([\w\s.]+)["']?)?/i);
    if (match) {
      const detectedPluralEntityType = match[1].toLowerCase();
      const entity = match[2] ? match[2].trim() : null;

      let mappedEntityType: 'user' | 'track' | 'playlist' | 'genre' | null = null;
      switch (detectedPluralEntityType) {
        case 'tracks':
        case 'track':
          mappedEntityType = 'track';
          break;
        case 'artists':
        case 'artist':
          mappedEntityType = 'user';
          break;
        case 'playlists':
        case 'playlist':
          mappedEntityType = 'playlist';
          break;
        case 'genres':
        case 'genre':
          mappedEntityType = 'genre';
          break;
        default:
          break;
      }

      if (mappedEntityType) {
        classification = {
          type: `search_${mappedEntityType}s`,
          isEntityQuery: true, // Ensure isEntityQuery is true for search types
          entityType: mappedEntityType,
          entity: entity,
          complexity: 'simple',
        };
        logger.debug(`Pattern-based classification: ${classification.type}, isEntityQuery: ${classification.isEntityQuery}`);
        return classification;
      }
    }
  }

  // Line 190 (approximate)
  // Default return at the end of the function
  logger.debug(`Default classification: ${classification.type}`);
  return classification;
}
