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
    return entity && typeof entity === 'object' && 'playlistName' in entity;
}
// Additional helper functions and type definitions...
export const initialGraphState = {
    llm: null,
    query: null,
    queryType: null,
    categories: null,
    apis: null,
    bestApi: null,
    secondaryApi: null,
    params: null,
    response: null,
    secondaryResponse: null,
    error: false,
    formattedResponse: null,
    message: null,
    isEntityQuery: false,
    entityName: null,
    entity: null,
    parameters: null,
    complexity: null,
    multiStepHandled: false,
    initialState: null,
    entityType: null,
};
