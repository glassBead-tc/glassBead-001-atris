import { WebSearchResult } from "../../types.js";

/**
 * Extracts the search query and artist from a query string.
 * @param query - The user query string.
 * @returns An object containing the track and artist names.
 */
export function extractSearchQuery(query: string): { track: string; artist: string } {
    const matches = query.match(/search\s+for\s+"(.*?)"\s+by\s+"(.*?)"/i);
    return matches ? { track: matches[1], artist: matches[2] } : { track: "", artist: "" };
}

/**
 * Extracts the web search query from a query string.
 * @param query - The user query string.
 * @returns A WebSearchResult object containing the title and content.
 */
export function extractWebSearchQuery(query: string): WebSearchResult {
  const matches = query.match(/web\s+search\s+"(.*?)"/i);
  return matches ? { title: matches[1], content: "" } : { title: "", content: "" };
}

export function extractLimit(query: string): string {
  const matches = query.match(/limit\s+(\d+)/i);
  return matches ? matches[1] : "";
}

export function extractOffset(query: string): string {
  const matches = query.match(/offset\s+(\d+)/i);
  return matches ? matches[1] : "";
}

// Add other search-related extraction functions...
