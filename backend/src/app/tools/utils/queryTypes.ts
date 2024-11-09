/**
 * High-level query categories with their associated endpoints and entities
 */
export const QUERY_CATEGORIES = {
  discovery: {
    trending: {
      endpoints: ['tracks/trending', 'playlists/trending'],
      entities: ['track', 'playlist', 'artist'], // artist derived from tracks
      examples: [
        "What's trending right now?",
        "Show me popular playlists",
        "Who are the trending artists?"
      ]
    },
    search: {
      endpoints: ['tracks/search', 'playlists/search', 'users/search'],
      entities: ['track', 'playlist', 'user'],
      examples: [
        "Find tracks like...",
        "Search for playlists with...",
        "Find artists who..."
      ]
    },
    recommendations: {
      endpoints: ['tracks/recommended'],
      entities: ['track'],
      examples: [
        "Recommend tracks similar to...",
        "What should I listen to if I like..."
      ]
    }
  },
  
  analysis: {
    popularity: {
      methods: ['calculateGenrePopularity', 'calculateArtistPopularity'],
      entities: ['genre', 'artist'],
      examples: [
        "What genres are most popular?",
        "Which artists are gaining traction?"
      ]
    },
    metrics: {
      methods: ['trendingAnalysis'],
      entities: ['track', 'artist'],
      examples: [
        "How are tracks performing?",
        "What makes tracks trend?"
      ]
    }
  },
  
  research: {
    aggregation: {
      methods: ['getTracksByGenre', 'getTracksByArtist'],
      entities: ['track', 'playlist', 'artist'],
      examples: [
        "Show me all electronic tracks",
        "What playlists feature this artist?"
      ]
    },
    insights: {
      methods: ['analyzeEngagement', 'analyzeGrowth'],
      entities: ['track', 'artist', 'genre'],
      examples: [
        "How is this genre growing?",
        "What engagement patterns exist?"
      ]
    }
  }
}; 