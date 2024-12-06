import path from "path";
import { Genre, Mood, StemCategory } from '@audius/sdk';

export const TRIMMED_CORPUS_PATH = path.join(process.cwd(), 'src/app/data/audius_corpus.json');

export const EXTRACT_HIGH_LEVEL_CATEGORIES = {
  // Content Discovery
  'trending': 'Trending Content',      // For trending tracks, playlists, derived trending queries (i.e. genre, artist, etc.)
  'search': 'Search',                  // For direct searches across all entity types
  'genre': 'Genre-Based',             // For genre-specific queries
  'favorites': 'User Favorites',       // For favorite/liked content
  
  // User & Social
  'artist': 'Artist Information',      // For artist/user specific queries
  'followers': 'Social Graph',         // For follower/following relationships
  'playlists': 'Playlist Management',  // For playlist-specific queries
  
  // Platform & Support
  'technical': 'Technical Info',       // For API, SDK, development queries
  'platform': 'Platform Info',         // For Audius platform/company queries
  'help': 'Help & Support'            // For support and how-to queries
} as const;

export const BASE_URL = 'https://discovery-us-01.audius.openplayer.org/v1';

// If the SDK provides these, we can import directly.
export { Genre, Mood, StemCategory };

// High-level categories with their associated endpoints and NLP triggers
export const HIGH_LEVEL_CATEGORIES = {
  // Content Discovery
  'TRENDING': {
    description: 'Trending and popular content discovery',
    endpoints: [
      'Get Trending Tracks',
      'Get Trending Playlists',
      'Get Top Artists'
    ] as const,
    triggers: [
      'trending', 'popular', 'hot', 'top', 'best',
      'whats hot', 'most played', 'viral', 'rising'
    ] as readonly string[]
  },

  'SEARCH': {
    description: 'Direct content search across entity types',
    endpoints: [
      'Search Tracks',
      'Search Artists',
      'Search Playlists'
    ] as const,
    triggers: [
      'search', 'find', 'look for', 'where', 
      'show me', 'can you find', 'looking for'
    ] as readonly string[]
  },

  'GENRE': {
    description: 'Genre-specific content and analytics',
    endpoints: [
      'Get Tracks by Genre',
      'Get Artists by Genre',
      'Get Genre Stats'
    ] as const,
    triggers: [
      'genre', 'style', 'type of music',
      'category', 'kind of music'
    ] as readonly string[]
  },

  // User & Social
  'USER': {
    description: 'User profiles and social interactions',
    endpoints: [
      'Get User Info',
      'Get User Tracks',
      'Get User Playlists',
      'Get User Favorites',
      'Get User Followers',
      'Get User Following'
    ] as const,
    triggers: [
      'user', 'artist', 'profile', 'account',
      'who', 'follower', 'following', 'favorites'
    ] as readonly string[]
  },

  'PLAYLIST': {
    description: 'Playlist-specific operations',
    endpoints: [
      'Get Playlist',
      'Get Playlist Tracks',
      'Get User Playlists'
    ] as const,
    triggers: [
      'playlist', 'collection', 'set', 'mix',
      'compilation', 'album'
    ] as readonly string[]
  },

  // General & Platform
  'GENERAL': {
    description: 'General Audius platform, business, and technical information',
    endpoints: [
      'Tavily Search API'
    ] as const,
    triggers: [
      'how does', 'what is', 'tell me about',
      'explain', 'help', 'documentation',
      'company', 'platform', 'protocol'
    ] as readonly string[]
  }
} as const;

// Helper type for high-level categories
export type HighLevelCategory = keyof typeof HIGH_LEVEL_CATEGORIES;

// Update the type for triggers
export type CategoryTrigger = typeof HIGH_LEVEL_CATEGORIES[keyof typeof HIGH_LEVEL_CATEGORIES]['triggers'][number];

// Audius-specific keywords to determine if a query is about Audius
export const AUDIUS_KEYWORDS = [
  'audius',
  'platform',
  'streaming',
  'music',
  'track',
  'artist',
  'playlist',
  'song',
  'play',
  'listen'
] as const;

// Function to check if a query is about Audius
export function isAudiusQuery(query: string): boolean {
  const normalizedQuery = query.toLowerCase();
  return AUDIUS_KEYWORDS.some(keyword => normalizedQuery.includes(keyword));
}

// Function to get the best high-level category for a query
export function getHighLevelCategory(query: string): HighLevelCategory | null {
  if (!isAudiusQuery(query)) {
    return null;
  }

  const normalizedQuery = query.toLowerCase();
  
  // Update the filter function to use proper typing
  const categoryMatches = Object.entries(HIGH_LEVEL_CATEGORIES)
    .map(([category, info]) => ({
      category: category as HighLevelCategory,
      matches: (info.triggers as readonly string[]).filter(trigger => 
        normalizedQuery.includes(trigger.toLowerCase())
      ).length
    }));

  const bestMatch = categoryMatches.reduce((best, current) => 
    current.matches > best.matches ? current : best
  );

  return bestMatch.matches > 0 ? bestMatch.category : 'GENERAL';
}

// Add to existing constants
export const GENRE_MAPPINGS = {
  'Hip-Hop/Rap': ['hip hop', 'hip-hop', 'rap', 'hiphop'],
  'Electronic': ['electronic', 'edm', 'electronica'],
  'Rock': ['rock', 'alternative rock', 'indie rock'],
  'Pop': ['pop', 'popular'],
  'R&B/Soul': ['r&b', 'rnb', 'soul', 'rhythm and blues'],
  'Jazz': ['jazz', 'jazzy'],
  'Drum & Bass': ['drum and bass', 'drum & bass', 'dnb', 'd&b', 'jungle'],
  'House': ['house'],
  'Deep House': ['deep house'],
  'Tech House': ['tech house'],
  'Techno': ['techno'],
  'Trap': ['trap'],
  'Dubstep': ['dubstep'],
  'Alternative': ['alternative', 'alt', 'indie'],
  'Classical': ['classical', 'orchestra', 'orchestral'],
  'Ambient': ['ambient', 'atmospheric'],
  'World': ['world music', 'world', 'international'],
} as const;

export type AudiusGenre = keyof typeof GENRE_MAPPINGS;
