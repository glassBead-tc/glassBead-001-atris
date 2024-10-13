import { GraphState } from "../../types.js";
import { logger } from "../../logger.js";

export const handleEntityQuery = async (state: GraphState): Promise<GraphState> => {
    logger.info(`Handling entity query: ${state.query}`);

    if (!state.isEntityQuery) {
        logger.warn("handleEntityQuery called for a non-entity query");
        return { ...state, error: "Invalid call to handleEntityQuery for a non-entity query." };
    }

    const entityType = state.entityType;
    const entity = state.entity;

    if (!entityType) {
        logger.warn("No entity type extracted from the query");
        return {
            ...state,
            error: "Unable to determine the type of information you're looking for. Please be more specific."
        };
    }

    // If we have an entityType but no specific entity, we can still proceed
    if (!entity) {
        logger.info(`No specific entity extracted, but entityType is ${entityType}`);
  
        // For types that don't require a specific entity
        if (state.queryType === 'trending_tracks' || state.queryType === 'genre_info') {
          return {
            ...state,
            params: { limit: 5 }, // Default limit
            categories: ['Tracks', 'Discovery'], // Relevant categories
          };
        }
    }

    // Handle 'genre' entityType
    if (entityType === 'genre') {
        logger.info(`Processing genre entity query: ${state.query}`);

        // If no specific genre is provided, proceed accordingly
        if (!entity) {
            return {
                ...state,
                params: { limit: 5 }, // Default limit
                categories: ['Genres', 'Trending'], // Relevant categories
            };
        } else {
            // Handle queries about a specific genre
            return {
                ...state,
                params: { genre: entity, limit: 5 },
                categories: ['Genres'],
            };
        }
    }

    // If we reach here, we either have both entityType and entity, or we need a specific entity
    if (!entity) {
        logger.warn(`Entity type ${entityType} requires a specific entity, which was not provided`);
        return {
            ...state,
            error: `Please provide a specific ${entityType} to search for.`
        };
    }

    state.params = { query: entity, limit: 1 };

    // Set categories based on entityType
    switch (entityType) {
        case 'track':
            state.categories = ['Tracks'];
            break;
        case 'user':
            state.categories = ['Users'];
            break;
        case 'playlist':
            state.categories = ['Playlists'];
            break;
        default:
            state.categories = [];
    }

    logger.debug(`State after handleEntityQuery: ${JSON.stringify(state)}`);
    return state;
};

export const handleError = async (state: GraphState): Promise<GraphState> => {
    logger.debug("Entering handleError function");
    state.formattedResponse = `I apologize, but an error occurred: ${state.error}. Please try rephrasing your question or providing more specific information.`;
    return state;
};