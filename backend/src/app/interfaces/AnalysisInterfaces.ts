export interface PopularityScore {
  id: string;
  name: string;
  points: number;
  rank: number;
  metrics: {
    [key: string]: number;
  };
}

export interface ArtistScore extends PopularityScore {
  trackCount: number;
  topTrack: {
    title: string;
    plays: number;
    favorites: number;
  };
}

export interface GenreScore extends PopularityScore {
  trackCount: number;
  topArtists: string[];
  averageEngagement: number;
}

export interface TrendingMetrics {
  id: string;
  title: string;
  artist: string;
  plays: number;
  favorites: number;
  reposts: number;
  releaseDate: Date;
  rank: number;
  daysOld: number;
  velocityMetrics: {
    playsPerDay: number;
    favoritesPerDay: number;
    repostsPerDay: number;
    recentPlaysVelocity: number;
    recentFavoritesVelocity: number;
    recentRepostsVelocity: number;
  };
  decayMetrics: {
    timeDecayFactor: number;
    decayedScore: number;
  };
} 