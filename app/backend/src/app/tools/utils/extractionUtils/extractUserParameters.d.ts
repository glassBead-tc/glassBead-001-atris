/**
 * Extracts parameters for user queries.
 * @param query - The user's query string.
 * @param entityType - The type of entity, if any.
 * @returns A record of parameters for the API request.
 */
export declare function extractUserParameters(query: string, entityType: string | null): Record<string, any>;
