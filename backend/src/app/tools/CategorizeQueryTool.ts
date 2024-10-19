// import { ToolNode } from "@langchain/langgraph/prebuilt";
// import { z } from "zod";
// import nlp from "compromise";
// import { GraphState, QueryCategorization, QueryType, EntityType, ComplexityLevel } from "../types.js";
// import { logger } from '../logger.js';

// // Define the categorization function
// async function categorizeQueryFunction(state: GraphState): Promise<QueryCategorization> {
//   try {
//     let normalizedQuery = state.query!.toLowerCase().trim();

//     // Check for track play count queries
//     const trackPlayCountRegex = /how many plays does (the track )?(.*?) have\??/i;
//     const trackPlayCountMatch = normalizedQuery.match(trackPlayCountRegex);
    
//     if (trackPlayCountMatch) {
//       const trackName = trackPlayCountMatch[2].trim();
//       return {
//         queryType: 'search_tracks' as QueryType,
//         entityType: 'track' as EntityType,
//         entityName: trackName,
//         isEntityQuery: true,
//         complexity: 'simple' as ComplexityLevel
//       };
//     }
  
//     let categorization: QueryCategorization = {
//       queryType: 'general' as QueryType,
//       isEntityQuery: false,
//       entityType: null,
//       entityName: null,
//       complexity: 'simple' as ComplexityLevel,
//     };
  
//     // Expand contractions
//     const contractions: Record<string, string> = {
//       "what's": "what is",
//       "where's": "where is",
//       "when's": "when is",
//       "who's": "who is",
//       "how's": "how is",
//       "that's": "that is",
//       "there's": "there is",
//       "here's": "here is",
//       "it's": "it is",
//       "isn't": "is not",
//       "aren't": "are not",
//       "wasn't": "was not",
//       "weren't": "were not",
//       "haven't": "have not",
//       "hasn't": "has not",
//       "hadn't": "had not",
//       // Add more contractions as needed
//     };

//     Object.keys(contractions).forEach((contraction) => {
//       const regex = new RegExp(`\\b${contraction}\\b`, 'gi');
//       normalizedQuery = normalizedQuery.replace(regex, contractions[contraction]);
//     });
  
//     const doc = nlp(normalizedQuery);
//     logger.debug(`Processing query: "${normalizedQuery}"`);
  
//     // Enhanced entity extraction using NLP
//     const entities = doc.entities().out('array');
//     let mappedEntityType: EntityType | null = null;
  
//     if (entities.length > 0) {
//       const entity = entities[0].toLowerCase();
//       switch (entity) {
//         case 'tracks':
//         case 'track':
//           mappedEntityType = 'track';
//           break;
//         case 'users':
//         case 'user':
//           mappedEntityType = 'user';
//           break;
//         case 'playlists':
//         case 'playlist':
//           mappedEntityType = 'playlist';
//           break;
//         case 'genres':
//         case 'genre':
//           mappedEntityType = null; // Genres are not entities in our current system
//           break;
//       }
  
//       categorization = {
//         queryType: mappedEntityType ? `search_${mappedEntityType}s` as QueryType : 'trending_tracks' as QueryType,
//         isEntityQuery: !!mappedEntityType,
//         entityType: mappedEntityType,
//         complexity: mappedEntityType ? 'moderate' as ComplexityLevel : 'simple' as ComplexityLevel,
//         entityName: mappedEntityType ? entity : null,
//       };
//       logger.debug(`Pattern-based categorization: ${categorization.queryType}, isEntityQuery: ${categorization.isEntityQuery}`);
//       return categorization;
//     }
  
//     // Default categorization for trending tracks
//     if (/trending|popular|top tracks/i.test(normalizedQuery)) {
//       categorization = {
//         queryType: 'trending_tracks' as QueryType,
//         isEntityQuery: false,
//         entityType: null,
//         entityName: null,
//         complexity: 'simple' as ComplexityLevel,
//       };
//       logger.debug(`Trending tracks query categorization: ${categorization.queryType}`);
//       return categorization;
//     }
  
//     // Final default return
//     logger.debug(`Default categorization: general`);
//     return {
//       queryType: 'general' as QueryType,
//       entityType: null,
//       isEntityQuery: false,
//       complexity: 'simple' as ComplexityLevel,
//       entityName: null,
//     };
//   } catch (error) {
//     logger.error(`Error in CategorizeQueryTool: ${error instanceof Error ? error.message : String(error)}`);
//     throw new Error("Failed to categorize the query.");
//   }
// }

// // Create a ToolNode instance
// export const CategorizeQueryToolNode = new ToolNode(categorizeQueryFunction, {
//   name: "categorize_query",
//   description: "Categorizes the user's query to determine its type and complexity.",
//   schema: z.object({
//     state: z.object({
//       query: z.string().describe("The user's query string to classify"),
//     }),
//   }),
// });
