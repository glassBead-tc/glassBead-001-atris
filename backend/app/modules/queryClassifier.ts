import nlp from 'compromise';
import { QueryClassification } from '../types.js';
import { logger } from '../logger.js';
import { globalAudiusApi } from '../services/audiusApi.js';

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

  // Expand contractions
  Object.keys(contractions).forEach((contraction: string) => {
    const regex = new RegExp(`\\b${contraction}\\b`, 'gi');
    query = query.replace(regex, contractions[contraction]);
  });

  const lowerQuery = query.toLowerCase();
  const doc = nlp(query); // Initialize 'doc'

  logger.debug(`Processing query: "${query}"`);

  // Enhanced entity extraction using NLP
  const people: string[] = doc.people().out('array');
  const places: string[] = doc.places().out('array');
  const organizations: string[] = doc.organizations().out('array');
  const topics: string[] = doc.topics().out('array');

  const allEntities: string[] = [...people, ...places, ...organizations, ...topics];
  logger.debug(`Detected entities: ${JSON.stringify(allEntities)}`);

  // Fetch dynamic data from Audius API
  let dynamicUsers: string[] = [];
  let dynamicTracks: string[] = [];
  let dynamicGenres: string[] = [];

  try {
    const trendingTracks = await globalAudiusApi.getTrendingTracks(100, 'week');
    dynamicTracks = trendingTracks.map(track => track.title);
    
    const usersResponse = await globalAudiusApi.searchUsers('', 100);
    dynamicUsers = usersResponse.data.map(user => user.handle);
    
    // Assuming there's an endpoint to fetch genres
    // If not, handle genres appropriately without static arrays
    // Example:
    // const genresResponse = await globalAudiusApi.getGenres();
    // dynamicGenres = genresResponse.data.map(genre => genre.name);
  } catch (error: unknown) {
    logger.error(`Error fetching dynamic data for classification:`, error);
    // Proceed with available data or set defaults
  }

  // Attempt to detect entity type based on detected entities
  if (allEntities.length > 0) {
    const entity: string = allEntities[0]; // Taking the first detected entity
    let detectedEntityType: 'user' | 'track' | 'playlist' | 'genre' | null = null;

    if (dynamicUsers.map(u => u.toLowerCase()).includes(entity.toLowerCase())) {
      detectedEntityType = 'user';
    } else if (dynamicTracks.map(t => normalizeName(t)).includes(normalizeName(entity))) {
      detectedEntityType = 'track';
    } else if (dynamicGenres.map(g => g.toLowerCase()).includes(entity.toLowerCase())) {
      detectedEntityType = 'genre';
    } else if (organizations.map((o: string) => o.toLowerCase()).includes(entity.toLowerCase())) {
      detectedEntityType = 'playlist'; // Assuming playlists are treated as organizations
    }

    if (detectedEntityType) {
      switch (detectedEntityType) {
        case 'user':
          classification = {
            type: 'search_users',
            isEntityQuery: true,
            entityType: 'user',
            entity: entity.trim(),
            complexity: 'simple',
          };
          break;
        case 'track':
          classification = {
            type: 'search_tracks',
            isEntityQuery: true,
            entityType: 'track',
            entity: entity.trim(),
            complexity: 'simple',
          };
          break;
        case 'genre':
          classification = {
            type: 'search_genres',
            isEntityQuery: true,
            entityType: 'genre',
            entity: entity.trim(),
            complexity: 'simple',
          };
          break;
        case 'playlist':
          classification = {
            type: 'search_playlists',
            isEntityQuery: true,
            entityType: 'playlist',
            entity: entity.trim(),
            complexity: 'simple',
          };
          break;
        default:
          break;
      }
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

  // Specific check for "How many plays does [Track] have?"
  const playsMatch = query.match(/how many plays does\s["']?([\w\s.]+)["']?\shave/i);
  if (playsMatch && playsMatch[1]) {
    const trackName = normalizeName(playsMatch[1]);
    const normalizedTracks = dynamicTracks.map(t => normalizeName(t));
    const trackIndex = normalizedTracks.indexOf(trackName);
    if (trackIndex !== -1) {
      classification = {
        type: 'track_plays',
        isEntityQuery: true,
        entityType: 'track',
        entity: dynamicTracks[trackIndex],
        complexity: 'simple',
      };
      logger.debug(`Plays query classification: ${classification.type}`);
      return classification;
    } else {
      logger.warn(`Track "${playsMatch[1]}" not found in dynamic tracks list.`);
    }
  }

  // Specific check for "Does [User] follow the official Audius account?"
  const followMatch = query.match(/does\s["']?([\w\s.]+)["']?\sfollow\s.*audius account/i);
  if (followMatch && followMatch[1]) {
    classification = {
      type: 'user_follow_status',
      isEntityQuery: true,
      entityType: 'user',
      entity: followMatch[1].trim(),
      complexity: 'simple',
    };
    logger.debug(`Follow status query classification: ${classification.type}`);
    return classification;
  }

  // Check for genre information queries
  if (/\bgenre information\b/.test(lowerQuery) || /\bpopular genres\b/.test(lowerQuery)) {
    classification = {
      type: 'genre_info',
      isEntityQuery: false,
      entityType: null,
      entity: null,
      complexity: 'moderate',
    };
    logger.debug(`Genre information query classification: ${classification.type}`);
    return classification;
  }

  // Additional fallback rules can be added here

  // Ensure that if it's an entity query but no entity was extracted, classify as general
  if (classification.isEntityQuery && !classification.entity) {
    logger.warn(`Entity extraction failed for query: "${query}"`);
    classification = {
      type: 'general',
      isEntityQuery: false,
      entityType: null,
      entity: null,
      complexity: 'simple',
    };
  }

  logger.debug(`Final query classification result: ${JSON.stringify(classification)}`);
  return classification;
}
