import { logger } from '../../../logger.js';

/**
 * Extracts parameters for genre queries.
 * @param query - The user's query string.
 * @param entityType - The type of entity, if any.
 * @returns A record of parameters for the API request.
 */
export function extractGenreParameters(query: string, entityType: string | null): Record<string, any> {
    let params: Record<string, any> = {};

    // Extract 'limit' from query
    const limitMatch = query.match(/top\s+(\d+)/i);
    params.limit = limitMatch ? parseInt(limitMatch[1], 10) : 5; // Default to top 5 genres

    // Extract 'timeframe' from query
    const timeframeMatch = query.match(/(this\s+\w+|last\s+\w+)/i);
    if (timeframeMatch) {
        const timeframeText = timeframeMatch[1].toLowerCase();
        if (timeframeText.includes('week')) {
            params.timeframe = 'week';
        } else if (timeframeText.includes('month')) {
            params.timeframe = 'month';
        } else {
            params.timeframe = 'week'; // Changed from 'all_time' to 'week' as default
        }
    } else {
        params.timeframe = 'week'; // Default timeframe changed to 'week'
    }

    // Set calculation method
    params.calculationMethod = 'pareto';

    // Set number of tracks to fetch
    const tracksMatch = query.match(/(\d+)\s+tracks/i);
    params.numberOfTracks = tracksMatch ? parseInt(tracksMatch[1], 10) : 100; // Default to 100 tracks

    // Set points pool
    params.pointsPool = 10000; // Fixed value as per your approach

    logger.info(`Extracted genre parameters: ${JSON.stringify(params)}`);
    return params;
}