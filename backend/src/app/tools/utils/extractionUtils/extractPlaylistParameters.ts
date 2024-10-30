import { apiLogger } from "../../../logger.js";

/**
 * Extracts parameters for playlist queries.
 * @param query - The user's query string.
 * @param entityType - The type of entity, if any.
 * @returns A record of parameters for the API request.
 */
export function extractPlaylistParameters(query: string, entityType: string | null): Record<string, any> {
    let params: Record<string, any> = { limit: 1 };

    if (entityType === 'playlist') {
        const limitMatch = query.match(/top\s+(\d+)/i);
        if (limitMatch) {
            params.limit = parseInt(limitMatch[1], 10);
        }
    }

    apiLogger.info(`Extracted playlist parameters: ${JSON.stringify(params)}`);
    return params;
}
