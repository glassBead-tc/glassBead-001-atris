import { GraphState } from "../../types.js";
import { logger } from "../../logger.js";
import { globalAudiusApi } from "../../services/audiusApi.js";

/**
 * Handles playlist search queries.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with the search results or an error message.
 */
export const handle_search_playlists = async (state: GraphState): Promise<Partial<GraphState>> => {
  logger.info(`Handling search_playlists query for: ${state.entity}`);

  if (!state.entity) {
    logger.warn("No playlist name provided in search_playlists query.");
    return { 
      error: "No playlist name provided for search." 
    };
  }

  try {
    const searchResponse = await globalAudiusApi.searchPlaylists(state.entity, state.params.limit || 5);
    logger.debug(`Search playlists response: ${JSON.stringify(searchResponse.data)}`);

    if (!searchResponse.data || searchResponse.data.length === 0) {
      logger.warn(`No playlists found matching "${state.entity}".`);
      return { 
        error: `No playlists found matching "${state.entity}".` 
      };
    }

    return {
      response: searchResponse.data,
      params: { limit: state.params.limit || 5 },
    };
  } catch (error: unknown) {
    logger.error("Failed to handle search_playlists query:", error);
    return { 
      error: error instanceof Error ? error.message : 'Failed to search playlists.' 
    };
  }
};

/**
 * Handles genre search queries.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with the search results or an error message.
 */
export const handle_search_genres = async (state: GraphState): Promise<Partial<GraphState>> => {
  logger.info(`Handling search_genres query for: ${state.entity}`);

  if (!state.entity) {
    logger.warn("No genre provided in search_genres query.");
    return { 
      error: "No genre provided for search." 
    };
  }

  try {
    // Assuming there's a searchGenres method in AudiusApi
    const searchResponse = await globalAudiusApi.searchGenres(state.entity, state.params.limit || 5);
    logger.debug(`Search genres response: ${JSON.stringify(searchResponse.data)}`);

    if (!searchResponse.data || searchResponse.data.length === 0) {
      logger.warn(`No genres found matching "${state.entity}".`);
      return { 
        error: `No genres found matching "${state.entity}".` 
      };
    }

    // Format the genres response if needed
    const formattedResponse = format_genres_response(searchResponse.data, state.params.limit || 5);

    return {
      response: searchResponse.data,
      formattedResponse,
      message: "Genre search processed successfully."
    };
  } catch (error: unknown) {
    logger.error("Failed to handle search_genres query:", error);
    return { 
      error: error instanceof Error ? error.message : 'Failed to search genres.' 
    };
  }
};

/**
 * Handles general entity queries.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with either updated parameters or an error message.
 */
export const handle_entity_query = async (state: GraphState): Promise<GraphState> => {
    logger.info(`Handling entity query: ${state.query}`);

    if (!state.isEntityQuery) {
        logger.warn("handle_entity_query called for a non-entity query");
        return { 
            ...state, 
            error: "Invalid call to handle_entity_query for a non-entity query." 
        };
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

    // If we have an entityType but no specific entity, handle accordingly
    if (!entity) {
        logger.info(`No specific entity extracted, but entityType is ${entityType}`);
      
        // For types that don't require a specific entity
        if (state.queryType === 'trending_tracks' || state.queryType === 'genre_info') {
            return {
                ...state,
                params: { limit: 5 }, // Default limit
                complexity: 'moderate'
            };
        }

        // For other entity types that require an entity, return an error
        return {
            ...state,
            error: `No specific ${entityType} provided in the query.`
        };
    }

    // Additional handling based on entityType can be added here

    return state;
};

/**
 * Handles playlist information queries.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with either the playlist data or an error message.
 */
export const handle_playlist_info = async (state: GraphState): Promise<Partial<GraphState>> => {
    logger.info(`Handling playlist_info query for: ${state.entity}`);

    if (!state.entity) {
        logger.warn("No playlist name provided in playlist_info query.");
        throw new Error("No playlist name provided.");
    }

    try {
        const playlistResponse = await globalAudiusApi.searchPlaylists(state.entity, state.params.limit || 5);
        logger.debug(`Search playlists response: ${JSON.stringify(playlistResponse.data)}`);

        if (!playlistResponse.data || playlistResponse.data.length === 0) {
            logger.warn(`No playlists found matching "${state.entity}".`);
            throw new Error(`No playlists found matching "${state.entity}".`);
        }

        return {
            response: playlistResponse.data,
            params: { limit: state.params.limit || 5 },
        };
    } catch (error: unknown) {
        logger.error(`Failed to handle playlist_info query:`, error);
        return { 
            error: error instanceof Error ? error.message : 'Failed to retrieve playlist information.' 
        };
    }
};

/**
 * Handles queries related to searching tracks on Audius.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with either the response data or an error message.
 */
export const handle_search_tracks = async (state: GraphState): Promise<Partial<GraphState>> => {
    logger.info(`Handling search_tracks query for: ${state.entity}`);

    try {
        if (!state.entity) {
            logger.warn("No track name provided in search_tracks query.");
            throw new Error("No track name provided.");
        }

        const searchResponse = await globalAudiusApi.searchTracks(state.entity, state.params.limit || 5);
        logger.debug(`Search tracks response: ${JSON.stringify(searchResponse.data)}`);

        if (!searchResponse.data || searchResponse.data.length === 0) {
            logger.warn(`No tracks found matching "${state.entity}".`);
            throw new Error(`No tracks found matching "${state.entity}".`);
        }

        return {
            response: searchResponse.data,
            params: { limit: state.params.limit || 5 },
        };
    } catch (error: unknown) {
        logger.error(`Failed to handle search_tracks query:`, error);
        return { 
            error: error instanceof Error ? error.message : 'Failed to search tracks.' 
        };
    }
};

/**
 * Handles search users queries.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with the search results or an error message.
 */
export const handle_search_users = async (state: GraphState): Promise<Partial<GraphState>> => {
  logger.info(`Handling search_users query for: ${state.entity}`);

  if (!state.entity) {
    logger.warn("No user name provided in search_users query.");
    return { 
      error: "No user name provided for search." 
    };
  }

  try {
    const searchResponse = await globalAudiusApi.searchUsers(state.entity, state.params.limit || 5);
    logger.debug(`Search users response: ${JSON.stringify(searchResponse.data)}`);

    if (!searchResponse.data || searchResponse.data.length === 0) {
      logger.warn(`No users found matching "${state.entity}".`);
      return { 
        error: `No users found matching "${state.entity}".` 
      };
    }

    const formattedResponse = format_users_response(searchResponse.data, state.params.limit || 5);

    return {
      response: searchResponse.data,
      formattedResponse,
      message: "User search processed successfully."
    };
  } catch (error: unknown) {
    logger.error(`Failed to handle search_users query:`, error);
    return { 
      error: error instanceof Error ? error.message : 'Failed to search users.' 
    };
  }
};

/**
 * Handles trending tracks queries.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with the trending tracks data or an error message.
 */
export const handle_trending_tracks = async (state: GraphState): Promise<Partial<GraphState>> => {
  logger.info(`Handling trending_tracks query`);

  try {
    const trendingTracks = await globalAudiusApi.getTrendingTracks(state.params.limit || 5, state.params.timeframe || 'week');
    logger.debug(`Fetched trending tracks: ${JSON.stringify(trendingTracks)}`);

    if (!trendingTracks || trendingTracks.length === 0) {
      logger.warn("No trending tracks found.");
      return { 
        error: "No trending tracks found." 
      };
    }

    const formattedResponse = format_trending_tracks(trendingTracks, state.params.limit || 5);

    return {
      response: trendingTracks,
      formattedResponse,
      message: "Trending tracks processed successfully."
    };
  } catch (error: unknown) {
    logger.error(`Failed to handle trending_tracks query:`, error);
    return { 
      error: error instanceof Error ? error.message : 'Failed to retrieve trending tracks.' 
    };
  }
};

/**
 * Handles errors within the GraphState.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with a formatted error message.
 */
export const handle_error = async (state: GraphState): Promise<Partial<GraphState>> => {
  logger.error(`Handling error for state: ${state.error}`);

  return {
    formattedResponse: `An error occurred: ${state.error}`,
    message: "Error handled successfully."
  };
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

/**
 * Formats the genres search response.
 * @param genres - Array of genre data.
 * @param limit - Number of genres to include.
 * @returns A formatted string of genres.
 */
function format_genres_response(genres: any[], limit: number): string {
  if (!Array.isArray(genres) || genres.length === 0) {
    throw new Error("No genres found or invalid data format.");
  }

  const formatted = genres.slice(0, limit).map((genre: any, index: number) => 
    `${index + 1}. ${genre.name} - ${genre.popularity} popularity score`
  ).join('\n');

  return `Here are the top ${limit} trending genres on Audius:\n${formatted}`;
}
