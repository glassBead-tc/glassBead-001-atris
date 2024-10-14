import { UserData, TrackData, PlaylistData, Entity } from '../../types.js';
  
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
  
export type AudiusData = TrackData | UserData | PlaylistData | PopularTrackData | NoMatchData | null;
  
export function isEntity(data: any): data is Entity {
  return data !== null;
}
  
export function isPopularTrackData(data: any): data is PopularTrackData {
    return data?.type === 'popularTrack';
}
  
export function isNoMatchData(data: any): data is NoMatchData {
    return data?.type === 'noMatch';
}

/**
   * Type guard to check if an object is of type UserData.
   * @param entity - The entity to check.
   * @returns True if entity is UserData, else false.
   */
  export function isUserData(entity: any): entity is UserData {
    return entity && typeof entity === 'object' && 'name' in entity;
  }

  /**
   * Type guard to check if an object is of type TrackData.
   * @param entity - The entity to check.
   * @returns True if entity is TrackData, else false.
   */
  export function isTrackData(entity: any): entity is TrackData {
    return entity && typeof entity === 'object' && 'title' in entity;
  }

  /**
   * Type guard to check if an object is of type PlaylistData.
   * @param entity - The entity to check.
   * @returns True if entity is PlaylistData, else false.
   */
  export function isPlaylistData(entity: any): entity is PlaylistData {
    return entity && typeof entity === 'object' && 'title' in entity;
  }