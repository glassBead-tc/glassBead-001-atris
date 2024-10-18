import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { GraphState, QueryCategorization, QueryType } from "../types.js";
import { logger } from '../logger.js';
import { normalizeName } from "./node_tools/query_classifier.js";
import { HIGH_LEVEL_CATEGORY_MAPPING } from "../constants.js";
import { ChatPromptTemplate } from "@langchain/core/prompts";

export class ExtractCategoryTool extends StructuredTool {
  name = "extract_category";
  description = "Extracts categories and entities from the user's query.";

  schema = z.object({
    state: z.object({
      query: z.string().describe("The user's query string"),
      categories: z.array(z.string()).optional().describe("The high-level categories that the user's query falls into"),
      entityName: z.string().optional().describe("The name of the entity that the user is asking about"),
      isEntityQuery: z.boolean().optional().describe("Can this query be answered with only the Audius API and Atris's onboard tools?"),
      queryType: z.string().optional().describe("In what general category does this query fall into?"),
      entityType: z.string().optional().describe("Is the user asking about a user, a track, or a playlist?"),
      error: z.boolean().optional().describe("Was there an error in the ExtractCategory tool?"),
      // ... include other necessary fields from GraphState
    }),
  });

  async _call({ state }: z.infer<typeof this.schema>): Promise<Partial<GraphState>> {
    interface CategoryKeywords {
      [key: string]: string[];
    }
    
    // Utilize HIGH_LEVEL_CATEGORY_MAPPING for keyword associations
    const categoryKeywords: CategoryKeywords = HIGH_LEVEL_CATEGORY_MAPPING;
    
    if (!state.query) {
      return { 
        error: true,
        message: 'No query recognized.',
        // Only include properties that this tool modifies
      };
    }
    
    const query = state.query.toLowerCase();
    logger.debug(`Processing query: "${query}"`);
    const categories: string[] = [];
    let entityType: "playlist" | "track" | "user" | undefined = undefined;
    let entity: string | undefined = undefined;
    
    // Extract categories using HIGH_LEVEL_CATEGORY_MAPPING
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => query.includes(keyword.toLowerCase()))) {
        categories.push(category);
      }
    }
    
    // Extract entities
    const artistMatch = query.match(/(?:by|from|of|artist|user)\s+['"]?([a-z0-9\s.]+)['"]?(?:\s|$)/i);
    const trackMatch = query.match(/(?:track|song)\s+['"]?([a-z0-9\s]+)['"]?/i);
    const playlistMatch = query.match(/playlist\s+['"]?([a-z0-9\s]+)['"]?/i);
    
    if (artistMatch) {
      entityType = "user";
      entity = normalizeName(artistMatch[1].trim());
    } else if (trackMatch) {
      entityType = "track";
      entity = normalizeName(trackMatch[1].trim());
    } else if (playlistMatch) {
      entityType = "playlist";
      entity = normalizeName(playlistMatch[1].trim());
    }
    
    // Handle specific query types
    if (query.includes('trending') || query.includes('popular') || query.includes('top')) {
      categories.push('Trending');
    }
    
    if (query.includes('follower') || query.includes('following')) {
      categories.push('Users');
      entityType = 'user';
    }
    
    if (query.includes('play count') || query.includes('most played')) {
      categories.push('Tracks');
    }
    
    if (query.includes('profile') || query.includes('about user')) {
      categories.push('Users');
      entityType = 'user';
    }
    
    // If no specific entity is found, try to extract any quoted text as an entity
    if (!entity) {
      const quotedMatch = query.match(/['"]([^'"]+)['"]/);
      if (quotedMatch) {
        entity = normalizeName(quotedMatch[1]);
        if (categories.includes('Tracks')) {
          entityType = "track";
        } else if (categories.includes('Users')) {
          entityType = "user";
        } else if (categories.includes('Playlists')) {
          entityType = "playlist";
        } 
      }
    }
    
    if (categories.length === 0) {
      categories.push('General');
    }
    
    let queryType: QueryType = 'general';
    
    if (categories.includes('Trending') && categories.includes('Tracks')) {
      queryType = 'trending_tracks';
    } else if (categories.includes('Tracks')) {
      queryType = 'search_tracks';
    } else if (categories.includes('Users')) {
      queryType = 'search_users';
    } else if (categories.includes('Playlists')) {
      queryType = 'search_playlists';
    } else if (categories.includes('Genres')) {
      queryType = 'search_genres';
    }
    
    logger.debug(`extractCategory result - categories: ${categories.join(', ')}, queryType: ${queryType}, entityType: ${entityType}, entityName: ${entity}`);
    
    return {
      categories,
      queryType,
      entityType,
      entityName: entity || null,
      isEntityQuery: !!entityType,
      error: false
    };
  } catch (error: typeof Error, state: GraphState) { 
    logger.error(`Error in ExtractCategory: ${error instanceof Error ? error.message : String(error)}`);
    return {
      ...state,
      categories: ['General'],
      isEntityQuery: false,
      error: true,
      message: 'Error in ExtractCategory',
      bestApi: null,
      params: {},
      response: null,
      apis: [],
      entityType: null,
      complexity: 'simple',
      entityName: null,
      query: '',
      queryType: 'general'
    };
  }
}

export async function extractCategory(state: GraphState): Promise<Partial<GraphState>> {
    const { llm, query } = state;
  
    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are an expert agent that extracts category and entity information from a user query and returns a JSON object with the following structure:
        {
          "categories": ["category1", "category2", ...],
          "isEntityQuery": true or false,
          "entityType": "playlist" | "track" | "user" | null,
          "entityName": "entity name" | null,
          "queryType": "general" | "trending_tracks" | "search_tracks" | "search_users" | "search_playlists" | "search_genres" | null,
          "complexity": "simple" | "complex" | null,
        }
  
  Currently, you are helping a user with a query. Your job is to extract the category and entity information from the query.
  Here are all the high level categories, and every tool name that falls under them:
  {categoriesAndTools}`,
      ],
      ["human", `Query: {query}`],
    ]); 
  
    const tool = new ExtractCategoryTool();
    const modelWithTools = llm!.withStructuredOutput(tool);
    const chain = prompt.pipe(modelWithTools).pipe(tool);
    const response = await chain.invoke({ query });
    const categoryExtraction: QueryCategorization = JSON.parse(response);
    return categoryExtraction as Partial<GraphState>;
  }