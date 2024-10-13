import { GraphState } from "../../types.js";
import { logger } from "../../logger.js";
import { classifyQuery } from "../../modules/queryClassifier.js";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const TIMEOUT = 30000; // 30 seconds

/**
 * Wraps the classifyQuery function to update the GraphState.
 */
export const classifyQueryWrapper = async (state: GraphState): Promise<Partial<GraphState>> => {
    const classification = await classifyQuery(state.query);
    const entityType = classification.entityType as 'user' | 'track' | 'playlist' | 'genre' | null;
    return {
        queryType: classification.type,
        isEntityQuery: classification.isEntityQuery,
        entityType: entityType,
        entity: classification.entity,
        complexity: classification.complexity,
    };
};

/**
 * Wraps node logic with retry and timeout mechanisms.
 */
export const wrapNodeLogic = (
    nodeName: string, 
    logic: (state: GraphState) => Promise<Partial<GraphState>> | Partial<GraphState>
) => {
    return async (state: GraphState): Promise<GraphState> => {
        logger.debug(`Entering ${nodeName} node`);
        try {
            const result = await withTimeout(
                withRetry(async () => {
                    const logicResult = logic(state);
                    return logicResult instanceof Promise ? await logicResult : logicResult;
                }, MAX_RETRIES, RETRY_DELAY), 
                TIMEOUT
            );
            
            const newState = { ...state, ...result };
            logger.debug(`State after ${nodeName}: ${JSON.stringify(newState)}`);
            return newState;
        } catch (error) {
            logger.error(`Error in ${nodeName}: ${error instanceof Error ? error.message : String(error)}`);
            return { 
                ...state, 
                error: error instanceof Error ? error.message : `Unknown error in ${nodeName}`
            };
        }
    };
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    let timeoutHandle: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
    }
};

const withRetry = async <T>(fn: () => Promise<T>, maxRetries: number, delay: number): Promise<T> => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            logger.warn(`Retry ${i + 1}/${maxRetries} failed. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('Max retries reached');
};

/**
 * Handles the final logging of results.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with the final result.
 */
export const log_final_result = async (state: GraphState): Promise<Partial<GraphState>> => {
    logger.info(`Final result: ${state.formattedResponse}`);
    return state;
};

/**
 * Formats the user search response.
 * @param users - Array of user data.
 * @param limit - Number of users to include.
 * @returns A formatted string of users.
 */
function format_users_response(users: any[], limit: number): string {
    if (!Array.isArray(users) || users.length === 0) {
        throw new Error("No users found or invalid data format.");
    }

    const formatted = users.slice(0, limit).map((user, index) => 
        `${index + 1}. ${user.name} (@${user.handle}) - ${user.follower_count} followers`
    ).join('\n');

    return `Here are the top ${limit} users on Audius matching your search:\n${formatted}`;
}

/**
 * Formats the trending tracks response.
 * @param tracks - Array of track data.
 * @param limit - Number of tracks to include.
 * @returns A formatted string of trending tracks.
 */
function format_trending_tracks(tracks: any[], limit: number): string {
    if (!Array.isArray(tracks) || tracks.length === 0) {
        throw new Error("No trending tracks found or invalid data format.");
    }

    const formatted = tracks.slice(0, limit).map((track: any, index: number) => 
        `${index + 1}. "${track.title}" by ${track.user.name} - ${track.play_count} plays`
    ).join('\n');

    return `Here are the top ${limit} trending tracks on Audius:\n${formatted}`;
}
