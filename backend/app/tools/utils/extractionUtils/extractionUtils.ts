import {
  extractTrackId,
  extractTrackIds,
  extractGenre,
} from '../../extraction/trackExtraction.js';
import {
  extractUserId,
  extractWalletAddress,
} from '../../extraction/userExtraction.js';
import {
  extractSearchQuery,
  extractWebSearchQuery, // Ensure this is correctly imported
  extractLimit,
  extractOffset,
} from '../../extraction/searchExtraction.js'; // Updated import path
import { extractTime } from './extractTime.js';
import { extractPlaylistId } from './extractPlaylistId.js';
import { WebSearchResult } from '../../../types.js';

export {
  extractSearchQuery,
  extractWebSearchQuery, // Make sure this is included
  extractTrackId,
  extractLimit,
  extractTrackIds,
  extractUserId,
  extractWalletAddress,
  extractOffset,
  extractGenre,
}; // Ensure 'types.js' correctly exports WebSearchResult
/**
 * Delegates parameter extraction based on the parameter name.
 * @param param - The name of the parameter to extract.
 * @param query - The user query string.
 * @returns The extracted parameter value.
 */
export function extractParam(param: string, query: string): string | { track: string; artist: string } | WebSearchResult {
  switch (param) {
    case "track_id":
      return extractTrackId(query);
    case "query":
      return extractSearchQuery(query);
    case "track_ids":
      return extractTrackIds(query);
    case "user_id":
      return extractUserId(query);
    case "associated_wallet":
      return extractWalletAddress(query);
    case "playlist_id":
      return extractPlaylistId(query); // Ensure this is properly imported
    case "web-search":
      return extractWebSearchQuery(query);
    case "limit":
      return extractLimit(query);
    case "offset":
      return extractOffset(query);
    case "genre":
      return extractGenre(query);
    case "time":
      return extractTime(query); // Ensure this is properly imported
    default:
      return "";
  }
}