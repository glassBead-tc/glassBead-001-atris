import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { QueryType, EntityType, ComplexityLevel } from "../../types.js";

export class CategorizeQueryTool extends StructuredTool {
  name = "categorize_query";
  description = "Analyzes a query to determine its type, entity focus, and complexity";
  schema = z.object({
    query: z.string()
  });

  async _call({ query }: { query: string }) {
    const normalizedQuery = query.toLowerCase();

    // Entity detection
    const entityType = this.detectEntityType(normalizedQuery);
    
    // Query type detection
    const queryType = normalizedQuery.includes('trending') ? 
      'trending_tracks' as QueryType : 
      'general' as QueryType;

    // Complexity analysis
    const complexity = this.analyzeComplexity(normalizedQuery);

    return {
      queryType,
      entityType,
      isEntityQuery: entityType !== null,
      complexity
    };
  }

  private detectEntityType(query: string): EntityType | null {
    const trackWords = ['track', 'song', 'play', 'plays', 'genre'];
    const userWords = ['user', 'artist', 'follower', 'followers'];
    const playlistWords = ['playlist', 'album'];

    if (trackWords.some(word => query.includes(word))) return 'track';
    if (userWords.some(word => query.includes(word))) return 'user';
    if (playlistWords.some(word => query.includes(word))) return 'playlist';
    return null;
  }

  private analyzeComplexity(query: string): ComplexityLevel {
    const words = query.split(' ').length;
    const conditions = query.split('and').length + query.split('or').length - 1;
    
    if (words > 10 || conditions > 2) return 'complex';
    if (words > 5 || conditions > 1) return 'moderate';
    return 'simple';
  }
} 