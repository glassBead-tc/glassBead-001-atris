import { Track, User, Playlist } from '@audius/sdk';
  
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
  
export type AudiusData = Track | User | Playlist | PopularTrackData | NoMatchData | null;
  
export function isEntity(data: any): boolean {
  return data !== null;
}
  
export function isPopularTrackData(data: any): data is PopularTrackData {
    return data?.type === 'popularTrack';
}
  
export function isNoMatchData(data: any): data is NoMatchData {
    return data?.type === 'noMatch';
}

/**
 * Type guard to check if an object is of type User.
 * @param entity - The entity to check.
 * @returns True if entity is User, else false.
 */
export function isUserData(entity: any): entity is User {
  return entity && typeof entity === 'object' && 'name' in entity;
}

/**
 * Type guard to check if an object is of type Track.
 * @param entity - The entity to check.
 * @returns True if entity is Track, else false.
 */
export function isTrackData(entity: any): entity is Track {
  return entity && typeof entity === 'object' && 'title' in entity;
}

/**
 * Type guard to check if an object is of type Playlist.
 * @param entity - The entity to check.
 * @returns True if entity is Playlist, else false.
 */
export function isPlaylistData(entity: any): entity is Playlist {
  return entity && typeof entity === 'object' && 'playlist_name' in entity;
}
