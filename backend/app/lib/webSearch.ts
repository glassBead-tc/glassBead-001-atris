import axios from 'axios';
import { logger } from '../logger.js';

export async function performWebSearch(query: string): Promise<string> {
  if (!process.env.NEXT_TAVILY_API_KEY) {
    throw new Error("Tavily API key is not defined in the environment variables.");
  }

  try {
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: process.env.NEXT_TAVILY_API_KEY,
      query: query,
      search_depth: "basic",
      max_results: 3
    });

    const results = response.data.results;
    let formattedResults = '';

    results.forEach((result: any, index: number) => {
      formattedResults += `${index + 1}. ${result.title}\n${result.content}\n\n`;
    });

    return formattedResults.trim() || `No relevant web search results found for "${query}".`;
  } catch (error) {
    logger.error('Error performing web search:', error);
    return `Error performing web search for "${query}".`;
  }
}
