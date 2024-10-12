import { GraphState } from "../types.js";
import { logger } from '../logger.js';

export async function extractCategory(state: GraphState): Promise<GraphState> {
  try {
    if (!state.query) {
      throw new Error('Query is undefined or empty');
    }

    const query = state.query.toLowerCase();
    const categories = [];

    if (query.includes('track') || query.includes('song') || query.includes('genre') || query.includes('trending')) {
      categories.push('Tracks');
    }
    if (query.includes('artist') || query.includes('follower') || query.includes('user')) {
      categories.push('Users');
    }
    if (query.includes('playlist')) {
      categories.push('Playlists');
    }
    if (query.includes('tip') || query.includes('donate')) {
      categories.push('Tips');
    }
    if (categories.length === 0) {
      categories.push('General');
    }

    logger.debug(`Extracted categories: ${categories}`);
    return { ...state, categories };
  } catch (error) {
    logger.error(`Error in extractCategory: ${error instanceof Error ? error.message : String(error)}`);
    throw error; // Re-throw the error to be caught by the graph
  }
}
