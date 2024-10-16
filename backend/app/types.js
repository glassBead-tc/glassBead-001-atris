"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPlaylistEntity = exports.setUserEntity = exports.setTrackEntity = exports.GroupedGenres = void 0;
exports.isUserData = isUserData;
exports.isTrackData = isTrackData;
exports.isPlaylistData = isPlaylistData;
/**
 * Type guard to check if an object is of type UserData.
 * @param entity - The entity to check.
 * @returns True if entity is UserData, else false.
 */
function isUserData(entity) {
    return entity && typeof entity === 'object' && 'name' in entity;
}
/**
 * Type guard to check if an object is of type TrackData.
 * @param entity - The entity to check.
 * @returns True if entity is TrackData, else false.
 */
function isTrackData(entity) {
    return entity && typeof entity === 'object' && 'title' in entity;
}
/**
 * Type guard to check if an object is of type PlaylistData.
 * @param entity - The entity to check.
 * @returns True if entity is PlaylistData, else false.
 */
function isPlaylistData(entity) {
    return entity && typeof entity === 'object' && 'title' in entity;
}
// Electronic subgenres are grouped under the parent genre "Electronic"
// This gives context to the LLM that "Trance" and "Jungle" are their own genres, but both
// are part of the "Electronic" genre overall.
exports.GroupedGenres = {
    ALL: "All Genres",
    ROCK: "Rock",
    METAL: "Metal",
    ALTERNATIVE: "Alternative",
    HIP_HOP_RAP: "Hip-Hop/Rap",
    EXPERIMENTAL: "Experimental",
    PUNK: "Punk",
    FOLK: "Folk",
    POP: "Pop",
    AMBIENT: "Ambient",
    SOUNDTRACK: "Soundtrack",
    WORLD: "World",
    JAZZ: "Jazz",
    ACOUSTIC: "Acoustic",
    FUNK: "Funk",
    R_AND_B_SOUL: "R&B/Soul",
    DEVOTIONAL: "Devotional",
    CLASSICAL: "Classical",
    REGGAE: "Reggae",
    PODCASTS: "Podcasts",
    COUNTRY: "Country",
    SPOKEN_WORK: "Spoken Word",
    COMEDY: "Comedy",
    BLUES: "Blues",
    KIDS: "Kids",
    AUDIOBOOKS: "Audiobooks",
    LATIN: "Latin",
    LOFI: "Lo-Fi",
    HYPERPOP: "Hyperpop",
    DANCEHALL: "Dancehall",
    ELECTRONIC: {
        ELECTRONIC: "Electronic",
        TECHNO: "Techno",
        TRAP: "Trap",
        HOUSE: "House",
        TECH_HOUSE: "Tech House",
        DEEP_HOUSE: "Deep House",
        DISCO: "Disco",
        ELECTRO: "Electro",
        JUNGLE: "Jungle",
        PROGRESSIVE_HOUSE: "Progressive House",
        HARDSTYLE: "Hardstyle",
        GLITCH_HOP: "Glitch Hop",
        TRANCE: "Trance",
        FUTURE_BASS: "Future Bass",
        FUTURE_HOUSE: "Future House",
        TROPICAL_HOUSE: "Tropical House",
        DOWNTEMPO: "Downtempo",
        DRUM_AND_BASS: "Drum & Bass",
        DUBSTEP: "Dubstep",
        JERSEY_CLUB: "Jersey Club",
        VAPORWAVE: "Vaporwave",
        MOOMBAHTON: "Moombahton",
    },
};
// When setting a track entity
var setTrackEntity = function (trackData) { return ({
    id: trackData.id,
    entityType: 'track',
    name: trackData.title, // Use title as the name for tracks
    title: trackData.title,
    user: trackData.user,
    play_count: trackData.playCount
}); };
exports.setTrackEntity = setTrackEntity;
// When setting a user entity
var setUserEntity = function (userData) { return ({
    id: userData.id,
    entityType: 'user',
    name: userData.handle, // Use handle as the name for users
    handle: userData.handle,
    follower_count: userData.followerCount
}); };
exports.setUserEntity = setUserEntity;
// When setting a playlist entity
var setPlaylistEntity = function (playlistData) { return ({
    id: playlistData.id,
    entityType: 'playlist',
    name: playlistData.playlistName,
    tracks: playlistData.tracks.map(exports.setTrackEntity)
}); };
exports.setPlaylistEntity = setPlaylistEntity;
