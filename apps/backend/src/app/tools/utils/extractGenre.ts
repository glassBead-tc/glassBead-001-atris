import { GENRE_MAPPINGS, type AudiusGenre } from '../../constants.js';

interface GenreMatch {
  genre: AudiusGenre;
  confidence: number;
}

export function extractGenreFromQuery(query: string, confidenceThreshold = 0.7): AudiusGenre | null {
  const normalizedQuery = query.toLowerCase();

  // First try exact matches
  const exactMatch = Object.entries(GENRE_MAPPINGS).find(([_, triggers]) =>
    triggers.some(trigger => normalizedQuery.includes(trigger))
  );
  
  if (exactMatch) {
    return exactMatch[0] as AudiusGenre;
  }

  // If no exact match, we could add fuzzy matching:
  // 1. Handle compound genres: "electronic hip hop" -> which is more prominent?
  // 2. Handle subgenres: "deep tech" -> should map to "Tech House"?
  // 3. Handle misspellings: "hip hopp" -> "Hip-Hop/Rap"
  // 4. Handle contextual clues: "beats like Drake" -> probably "Hip-Hop/Rap"
  
  return null;
} 