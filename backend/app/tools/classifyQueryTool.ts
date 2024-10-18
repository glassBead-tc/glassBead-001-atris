import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { QueryClassification } from "../types.js";
import { logger } from '../logger.js';
import { normalizeName } from "./node_tools/query_classifier.js";
import nlp from "compromise";

// Import any other necessary modules

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

export class ClassifyQueryTool extends StructuredTool {
  name = "classify_query";
  description = "Classifies the user's query to determine its type and complexity.";

  contractions: { [key: string]: string } = {
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

  schema = z.object({
    state: z.object({
      query: z.string().describe("The user's query string to classify"),
    }),
  });

  async _call({ state }: z.infer<typeof this.schema>): Promise<QueryClassification> {
    // Implementation of the classification logic
    // You can reuse the logic from the original classifyQuery function
    try {
        let normalizedQuery = state.query.toLowerCase().trim();
  
        // Check for track play count queries
        const trackPlayCountRegex = /how many plays does (the track )?(.*?) have\??/i;
        const trackPlayCountMatch = normalizedQuery.match(trackPlayCountRegex);
        
        if (trackPlayCountMatch) {
          const trackName = trackPlayCountMatch[2].trim();
          return {
            type: 'entity_query',
            entityType: 'track',
            entity: trackName,
            isEntityQuery: true,
            complexity: 'simple'
          };
        }
      
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
          normalizedQuery = normalizedQuery.replace(regex, contractions[contraction]);
        });
      
        const doc = nlp(normalizedQuery);
      
        logger.debug(`Processing query: "${normalizedQuery}"`);
      
        // Enhanced entity extraction using NLP
        const people: string[] = doc.people().out('array');
        const places: string[] = doc.places().out('array');
        const organizations: string[] = doc.organizations().out('array');
        const topics: string[] = doc.topics().out('array');
      
        const allEntities: string[] = [...people, ...places, ...organizations, ...topics];
        logger.debug(`Detected entities: ${JSON.stringify(allEntities)}`);
      
        // Attempt to detect entity type based on detected entities
        if (allEntities.length > 0) {
          const rawEntity: string = allEntities[0]; // Taking the first detected entity
          const entity = normalizeName(rawEntity); // Normalize the entity name
          let detectedEntityType: 'user' | 'track' | 'playlist' | null = null;
      
          // Simplified entity type detection based on query content
          if (/artist|user|profile/i.test(normalizedQuery)) {
            detectedEntityType = 'user';
          } else if (/track|song/i.test(normalizedQuery)) {
            detectedEntityType = 'track';
          } else if (/playlist/i.test(normalizedQuery)) {
            detectedEntityType = 'playlist';
          }
      
          // Only classify if entity type was detected
          if (detectedEntityType) {
            classification = {
              type: `search_${detectedEntityType}s`,
              isEntityQuery: true,
              entityType: detectedEntityType,
              entity: entity,
              complexity: 'simple',
            };
            logger.debug(`Entity identified: ${classification.type}`);
            return classification;
          }
        }
      
        // Specific pattern checks for complex queries
        if (/\b(trending|most followed|popular)\b.*\b(tracks|artists|playlists|genres)\b/i.test(normalizedQuery)) {
          const match = normalizedQuery.match(/(?:trending|most followed|popular).*?\b(tracks|artists|playlists|genres)\b(?:.*?by\s["']?([\w\s.]+)["']?)?/i);
          if (match) {
            const detectedPluralEntityType = match[1].toLowerCase();
            const rawEntity = match[2] ? match[2].trim() : null;
            const entity = rawEntity ? normalizeName(rawEntity) : null;
      
            let mappedEntityType: 'user' | 'track' | 'playlist' | null = null;
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
                mappedEntityType = null; // Genres are not entities in our current system
                break;
            }
      
            classification = {
              type: mappedEntityType ? `search_${mappedEntityType}s` : 'trending_tracks',
              isEntityQuery: !!mappedEntityType,
              entityType: mappedEntityType || null,
              entity: entity,
              complexity: mappedEntityType ? 'moderate' : 'simple', // Adjust complexity based on entity type
            };
            logger.debug(`Pattern-based classification: ${classification.type}, isEntityQuery: ${classification.isEntityQuery}`);
            return classification;
          }
        }
      
        // Default classification for trending tracks
        if (/trending|popular|top tracks/i.test(normalizedQuery)) {
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
      
        // Final default return
        logger.debug(`Default classification: general`);
        return {
          type: 'general',
          entityType: null,
          entity: null,
          isEntityQuery: false,
          complexity: 'simple'
        };
    } catch (error) {
      logger.error(`Error in ClassifyQueryTool: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to classify the query.");
    }
  }
}
