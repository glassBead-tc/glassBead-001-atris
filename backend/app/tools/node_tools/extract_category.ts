import { GraphState, PlaylistData, TrackData, UserData } from "../../types.js";
import { logger } from '../../logger.js';
import { normalizeName } from './query_classifier.js';
import { z } from 'zod';
import { StructuredTool } from '@langchain/core/tools';
import { query } from "winston";

interface CategoryKeywords {
  [key: string]: string[];
}

const categoryKeywords: CategoryKeywords = {
  'Tracks': ['track', 'song', 'audio', 'music', 'genre', 'trending', 'popular', 'play', 'listen', 'release', 'upload', 'remix', 'single', 'album track'],
  'Users': ['artist', 'follower', 'user', 'profile', 'account', 'musician', 'dj', 'following', 'creator', 'producer'],
  'Playlists': ['playlist', 'collection', 'album', 'mixtape', 'compilation', 'set', 'tracklist'],
  'Tips': ['tip', 'donate', 'support', 'contribution', 'fund', 'gift'],
  'Search': ['find', 'search', 'look for', 'discover', 'explore', 'query'],
  'Trending': ['trending', 'popular', 'hot', 'top', 'chart', 'viral', 'most followed', 'most played', 'rising'],
  'Favorites': ['favorite', 'like', 'loved', 'saved', 'bookmark', 'hearted'],
  'Upload': ['upload', 'post', 'share', 'publish', 'release', 'distribute'],
  'Genres': ['genre', 'style', 'category', 'type of music', 'classification'],
  'Recommendations': ['recommend', 'suggest', 'similar to', 'if you like', 'for fans of']
};

/**
 * Function to extract category from the query.
 * @param state - The current GraphState.
 * @returns A new GraphState with updated categories and related fields.
 */
export class ExtractCategory extends StructuredTool {
  name = "extract_category";
  description = "Extract category and entity information from a user query";

  schema = z.object({
    state: z.object({
      query: z.string().optional(),
      // ... include other relevant fields from GraphState
    }).required().partial()
  });

  async _call({ state }: z.infer<typeof this.schema>): Promise<GraphState> {
    try {
      if (!state.query) {
        return { 
          ...state, 
          categories: ['General'], 
          isEntityQuery: false,
          entityType: null,
          queryType: 'general',
          query: '',
          apis: [],
          params: {},
          response: null,
          error: false,
          message: '',
          bestApi: null,
          entityName: null,
          complexity: 'simple',
          entity: null
        };
      }

      const query = state.query.toLowerCase();
      logger.debug(`Processing query: "${query}"`);
      const categories: string[] = [];
      let entityType: "playlist" | "track" | "user" | undefined = undefined;
      let entity: string | undefined = undefined;

      // Extract categories
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => query.includes(keyword))) {
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
      }

      if (query.includes('play count') || query.includes('most played')) {
        categories.push('Tracks');
      }

      if (query.includes('profile') || query.includes('about user')) {
        categories.push('Users');
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

      let queryType: string = 'general';

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

      logger.debug(`extractCategory result - categories: ${categories.join(', ')}, queryType: ${queryType}, entityType: ${entityType}, entity: ${entity}`);

      return {
        ...state,
        categories,
        entityName: entity || null,
        entity: null,
        isEntityQuery: !!entityType,
        queryType,
        entityType: entityType || null,
        complexity: 'simple',
        apis: [],
        params: {},
        response: null,
        error: false,
        message: '',
        bestApi: null,
        query: query
      };
    } catch (error) { 
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
        entity: null,
        query: '',
        queryType: 'general'
      };
    }
  }
}
