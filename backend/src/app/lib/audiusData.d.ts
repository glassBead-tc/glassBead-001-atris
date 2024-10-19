import { TrackArtwork, Track, Playlist, User } from '@audius/sdk';
import { TrackData } from '../types.js';
export type PopularTrackData = {
    rank: number;
    title: string;
    artist: string;
    playCount: number;
    genre: string;
    mood?: string;
    releaseDate?: string;
};
export type NoMatchData = {
    searchedTrack: string;
    searchedArtist: string;
    availableTracks: Array<{
        title: string;
        artist: string;
        playCount: number;
    }>;
};
export type RemixData = {
    id: string;
    title: string;
    artist: string;
    remixOf: TrackData;
};
export type GenreData = {
    genre: string;
    tracks: Array<{
        id: string;
        title: string;
        artist: string;
        artwork: TrackArtwork;
        duration: number;
        playCount: number;
        favoriteCount: number;
        repostCount: number;
        releaseDate: string | null;
        permalink: string;
    }>;
};
export type AudiusData = {
    type: 'track';
    data: Track;
} | {
    type: 'artist';
    data: User;
} | {
    type: 'playlist';
    data: Playlist;
} | {
    type: 'popularTrack';
    data: PopularTrackData;
} | {
    type: 'noMatch';
    data: NoMatchData;
} | {
    type: 'remix';
    data: RemixData;
} | {
    type: 'genre';
    data: GenreData;
};
export declare function fetchAudiusData(query: string): Promise<AudiusData | null>;
declare function searchRemixes(query: string): Promise<AudiusData | null>;
export { searchRemixes };
