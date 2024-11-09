export interface EntityBase {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface TrackMetrics {
  plays: number;
  favorites: number;
  reposts: number;
  playlists: number;
}

export interface ArtistMetrics {
  followers: number;
  following: number;
  tracks: number;
  playlists: number;
}

export interface PlaylistMetrics {
  favorites: number;
  reposts: number;
  tracks: number;
  totalPlays: number;
}

export interface EntityMetrics {
  track: TrackMetrics;
  artist: ArtistMetrics;
  playlist: PlaylistMetrics;
} 