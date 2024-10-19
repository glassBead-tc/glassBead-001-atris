import { UserData, TrackData, PlaylistData } from '../../types.js';
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
        availableTracks: {
            title: string;
            artist: string;
            playCount: number;
        }[];
    };
}
export type AudiusData = TrackData | UserData | PlaylistData | PopularTrackData | NoMatchData | null;
export declare function isEntity(data: any): boolean;
export declare function isPopularTrackData(data: any): data is PopularTrackData;
export declare function isNoMatchData(data: any): data is NoMatchData;
/**
   * Type guard to check if an object is of type UserData.
   * @param entity - The entity to check.
   * @returns True if entity is UserData, else false.
   */
export declare function isUserData(entity: any): entity is UserData;
/**
 * Type guard to check if an object is of type TrackData.
 * @param entity - The entity to check.
 * @returns True if entity is TrackData, else false.
 */
export declare function isTrackData(entity: any): entity is TrackData;
/**
 * Type guard to check if an object is of type PlaylistData.
 * @param entity - The entity to check.
 * @returns True if entity is PlaylistData, else false.
 */
export declare function isPlaylistData(entity: any): entity is PlaylistData;
export {};
