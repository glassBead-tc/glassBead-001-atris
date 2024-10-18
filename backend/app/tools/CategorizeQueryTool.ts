import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { ComplexityLevel, EntityType, QueryCategorization, QueryType, initialGraphState } from "../types.js";
import { logger } from '../logger.js';
import { normalizeName } from "./node_tools/query_classifier.js";
import nlp from "compromise";
import { GraphState } from "../types.js";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";

// Import any other necessary modules

// const contractions: { [key: string]: string } = {
//     "what's": "what is",
//     "where's": "where is",
//     "when's": "when is",
//     "who's": "who is",
//     "how's": "how is",
//     "that's": "that is",
//     "there's": "there is",
//     "here's": "here is",
//     "it's": "it is",
//     "isn't": "is not",
//     "aren't": "are not",
//     "wasn't": "was not",
//     "weren't": "were not",
//     "haven't": "have not",
//     "hasn't": "has not",
//     "hadn't": "had not",
//     // Add more contractions as needed
//   };

export class CategorizeQueryTool extends StructuredTool {
  name = "categorize_query";
  description = "Categorizes the user's query to determine its type and complexity.";

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

  constructor(query: string) {
    super();
    this.description = CategorizeQueryTool.createCategorization(query, initialGraphState);
    this.schema = z.object({
        state: z.object({
          query: z.string().describe("The user's query to be classified."),
        }),
      });
  }

  static createCategorization(query: string, initialGraphState: GraphState): string {
    const { isEntityQuery, entityType, complexity } = initialGraphState;
    const queryType = isEntityQuery ? `search_${entityType}s` : 'general';
    const categorization = `Given the following query by a user,
    categorize the query by query type, entity query status, entity type and complexity.

    Query: ${query}
    
    Query Type:
    ${Object.values(queryType)
      .map(
        (queryType) => `Query Type: ${queryType}
    Entity Query Status: ${isEntityQuery}
    Entity Type: ${entityType}
    Complexity: ${complexity}`
      )
      .join("\n---\n")}`;
    
        return categorization;
  }

  async _call({ state }: z.infer<typeof this.schema>): Promise<QueryCategorization> {
    // Implementation of the categorization logic
    // You can reuse the logic from the original classifyQuery function
    try {
        let normalizedQuery = state.query.toLowerCase().trim();
  
        // Check for track play count queries
        const trackPlayCountRegex = /how many plays does (the track )?(.*?) have\??/i;
        const trackPlayCountMatch = normalizedQuery.match(trackPlayCountRegex);
        
        if (trackPlayCountMatch) {
          const trackName = trackPlayCountMatch[2].trim();
          return {
            queryType: 'search_tracks',
            entityType: 'track',
            entity: trackName,
            isEntityQuery: true,
            complexity: 'simple'
          } as QueryCategorization;
        }
      
        let categorization: QueryCategorization = {
          queryType: 'general',
          isEntityQuery: false,
          entityType: null,
          entity: null,
          complexity: 'simple',
        } as QueryCategorization;
      
        // Expand contractions
        Object.keys(this.contractions).forEach((contraction: string) => {
            const regex = new RegExp(`\\b${contraction}\\b`, 'gi');
            normalizedQuery = normalizedQuery.replace(regex, this.contractions[contraction]);
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
          let detectedEntityType: EntityType = null;
      
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
            categorization = {
              queryType: `search_${detectedEntityType}s` as QueryType,
              isEntityQuery: true,
              entityType: detectedEntityType as EntityType,
              entity: entity,
              complexity: 'simple',
            } as QueryCategorization;
            logger.debug(`Entity identified: ${categorization.queryType}`);
            return categorization;
          }
        }
      
        // Specific pattern checks for complex queries
        if (/\b(trending|most followed|popular)\b.*\b(tracks|artists|playlists|genres)\b/i.test(normalizedQuery)) {
          const match = normalizedQuery.match(/(?:trending|most followed|popular).*?\b(tracks|artists|playlists|genres)\b(?:.*?by\s["']?([\w\s.]+)["']?)?/i);
          if (match) {
            const detectedPluralEntityType = match[1].toLowerCase();
            const rawEntity = match[2] ? match[2].trim() : null;
            const entity = rawEntity ? normalizeName(rawEntity) : null;
      
            let mappedEntityType: EntityType | null = null;
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
      
            categorization = {
              queryType: mappedEntityType ? `search_${mappedEntityType}s` as QueryType : 'trending_tracks' as QueryType,
              isEntityQuery: !!mappedEntityType,
              entityType: mappedEntityType as EntityType,
              complexity: mappedEntityType ? 'moderate' : 'simple', // Adjust complexity based on entity type
            } as QueryCategorization;
            logger.debug(`Pattern-based categorization: ${categorization.queryType}, isEntityQuery: ${categorization.isEntityQuery}`);
            return categorization;
          }
        }
      
        // Default categorization for trending tracks
        if (/trending|popular|top tracks/i.test(normalizedQuery)) {
          categorization = {
            queryType: 'trending_tracks',
            isEntityQuery: false,
            entityType: null,
            complexity: 'simple',
          } as QueryCategorization;
          logger.debug(`Trending tracks query categorization: ${categorization.queryType}`);
          return categorization;
        }
      
        // Final default return
        logger.debug(`Default categorization: general`);
        return {
          queryType: 'general',
          entityType: null,
          isEntityQuery: false,
          complexity: 'simple'
        } as QueryCategorization;
    } catch (error) {
      logger.error(`Error in CategorizeQueryTool: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to categorize the query.");
    }
  }
}

export async function categorizeQuery(query: string): Promise<Partial<GraphState>> {
  const state = { llm: new ChatOpenAI({ modelName: "gpt-4o", temperature: 0 }), query };

  if (!state.query) {
    throw new Error("Query is required.");
  }

  const prompt = ChatPromptTemplate.fromMessages([
    [
        "system",
        `You are an expert GenAI engineer who specializes in natural language processing 
        and regular expressions. Given a user's query, use the CategorizeQueryTool to categorize it.`
    ],
    ["user", `User's query: {query}`]
  ]);

  const tool = new CategorizeQueryTool(query);
  const modelWithTools = state.llm.withStructuredOutput(tool);

  const chain = prompt.pipe(modelWithTools).pipe(tool);
  const response = await chain.invoke({ query });
  const queryCategorization: QueryCategorization = JSON.parse(response);
  return queryCategorization as Partial<GraphState>;
}
