export function extractTrackId(query: string): string {
  const matches = query.match(/track(?:\s+id)?\s+(\w+)/i);
  return matches ? matches[1] : "";
}

export function extractTrackIds(query: string): string {
  const matches = query.match(/track(?:\s+ids?)?\s+([\w,]+)/i);
  return matches ? matches[1] : "";
}

export function extractGenre(query: string): string {
  const matches = query.match(/genre\s+(\w+)/i);
  return matches ? matches[1] : "";
}

// Add other track-related extraction functions...
