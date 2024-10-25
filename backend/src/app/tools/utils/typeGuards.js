export function isEntity(data) {
    return data !== null;
}
export function isPopularTrackData(data) {
    return data?.type === 'popularTrack';
}
export function isNoMatchData(data) {
    return data?.type === 'noMatch';
}
/**
   * Type guard to check if an object is of type UserData.
   * @param entity - The entity to check.
   * @returns True if entity is UserData, else false.
   */
export function isUserData(entity) {
    return entity && typeof entity === 'object' && 'name' in entity;
}
/**
 * Type guard to check if an object is of type TrackData.
 * @param entity - The entity to check.
 * @returns True if entity is TrackData, else false.
 */
export function isTrackData(entity) {
    return entity && typeof entity === 'object' && 'title' in entity;
}
/**
 * Type guard to check if an object is of type PlaylistData.
 * @param entity - The entity to check.
 * @returns True if entity is PlaylistData, else false.
 */
export function isPlaylistData(entity) {
    return entity && typeof entity === 'object' && 'title' in entity;
}
