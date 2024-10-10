function extractSearchQuery(query: string): { track: string; artist: string } {
  // Remove any trailing question marks from the query
  query = query.trim().replace(/\?+$/, '');

  const genrePattern = /What (?:is the )?genre (?:of|is) "(.*?)" by (.*?)$/i;
  const match = query.match(genrePattern);

  if (match) {
    return { track: match[1].trim(), artist: match[2].trim() };
  }

  // If no specific pattern matches, try a more general approach
  const parts = query.split(' by ');
  if (parts.length === 2) {
    return { track: parts[0].replace(/^What (?:is the )?genre (?:of|is) /i, '').trim(), artist: parts[1].trim() };
  }

  // If all else fails, return the whole query as the track name
  return { track: query.trim(), artist: '' };
}
  
  function extractTrackId(query: string): string {
    const matches = query.match(/track(?:\s+id)?\s+(\w+)/i);
    return matches ? matches[1] : "";
  }
  
  function extractLimit(query: string): string {
    const match = query.match(/limit\s+(\d+)/i);
    return match ? match[1] : "10"; // Default to 10 if not specified
  }
  
  function extractTrackIds(query: string): string {
    const matches = query.match(/track(?:\s+ids?)?\s+([\w,]+)/i);
    return matches ? matches[1] : "";
  }
  
  function extractUserId(query: string): string {
    const matches = query.match(/user(?:\s+id)?\s+(\w+)/i);
    return matches ? matches[1] : "";
  }
  
  function extractWalletAddress(query: string): string {
    const matches = query.match(/wallet(?:\s+address)?\s+(0x[\da-f]+)/i);
    return matches ? matches[1] : "";
  }
  
  function extractPlaylistId(query: string): string {
    const matches = query.match(/playlist(?:\s+id)?\s+(\w+)/i);
    return matches ? matches[1] : "";
  }
  
  function extractWebSearchQuery(query: string): string {
    // For web search, we might want to use the entire query
    return query.trim();
  }
  
  function extractOffset(query: string): string {
    const match = query.match(/offset\s+(\d+)/i);
    return match ? match[1] : "0"; // Default to 0 if not specified
  }
  
  function extractGenre(query: string): string {
    const match = query.match(/genre\s+(\w+)/i);
    return match ? match[1] : "all"; // Default to 'all' if not specified
  }
  
  function extractTime(query: string): string {
    const match = query.match(/time\s+(\w+)/i);
    return match ? match[1] : "week"; // Default to 'week' if not specified
  }

  function extractParam(param: string, query: string): string | { track: string; artist: string } {
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
        return extractPlaylistId(query);
      case "web-search":
        return extractWebSearchQuery(query);
      case "limit":
        return extractLimit(query);
      case "offset":
        return extractOffset(query);
      case "genre":
        return extractGenre(query);
      case "time":
        return extractTime(query);
      default:
        return "";
    }
  }


export {
    extractSearchQuery,
    extractTrackId,
    extractLimit,
    extractTrackIds,
    extractUserId,
    extractWalletAddress,
    extractPlaylistId,
    extractWebSearchQuery,
    extractOffset,
    extractGenre,
    extractTime,
    extractParam
}