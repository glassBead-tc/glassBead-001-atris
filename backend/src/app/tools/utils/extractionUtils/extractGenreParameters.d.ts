/**
 * Extracts parameters for genre queries.
 * @param query - The user's query string.
 * @param entityType - The type of entity, if any.
 * @returns A record of parameters for the API request.
 */
export declare function extractGenreParameters(query: string, entityType: string | null): Record<string, any>;
