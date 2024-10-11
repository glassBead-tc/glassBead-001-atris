interface TrackData {
    type: 'track';
    data: {
      title: string;
      artist: string;
      handle: string;
      playCount: number;
      duration: number;
      genre: string;
      mood?: string;
      releaseDate?: string;
      isExactMatch?: boolean;
    };
  }
  
  interface ArtistData {
    type: 'artist';
    data: {
      name: string;
      handle: string;
      followerCount: number;
      trackCount: number;
    };
  }
  
  interface PlaylistData {
    type: 'playlist';
    data: {
      name: string;
      creator: string;
      trackCount: number;
    };
  }
  
  interface PopularTrackData {
    type: 'popularTrack';
    data: {
      rank: number;
      title: string;
      artist: string;
      playCount: number;
      duration: number;
      genre: string;
      mood?: string;
      releaseDate?: string;
    };
  }
  
  interface NoMatchData {
    type: 'noMatch';
    data: {
      searchedTrack: string;
      searchedArtist: string;
      availableTracks: { title: string; artist: string; playCount: number }[];
    };
  }
  
  export type AudiusData = TrackData | ArtistData | PlaylistData | PopularTrackData | NoMatchData | null;
  
  export function isTrackData(data: AudiusData): data is TrackData {
    return data?.type === 'track';
  }
  
  export function isArtistData(data: AudiusData): data is ArtistData {
    return data?.type === 'artist';
  }
  
  export function isPlaylistData(data: AudiusData): data is PlaylistData {
    return data?.type === 'playlist';
  }
  
  export function isPopularTrackData(data: AudiusData): data is PopularTrackData {
    return data?.type === 'popularTrack';
  }
  
  export function isNoMatchData(data: AudiusData): data is NoMatchData {
    return data?.type === 'noMatch';
  }