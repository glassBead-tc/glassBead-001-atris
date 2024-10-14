import { GraphState, TrackEntity } from "../../types.js";
import { logger } from "../../logger.js";
import { globalAudiusApi } from "../../services/audiusApi.js";

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
    // Assuming there's a searchGenres method in Audius
    const searchResponse = await globalAudiusApi.searchGenres(state.query, state.params.limit || 5);
    logger.debug(`Search genres response: ${JSON.stringify(searchResponse.data)}`);

    if (!searchResponse.data || searchResponse.data.length === 0) {
      logger.warn(`No genres found matching "${state.query}".`);
      return { 
        error: `No genres found matching "${state.query}".` 
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
    const entityName = state.entityName;

    if (!entityType) {
        logger.warn("No entity type extracted from the query");
        return {
            ...state,
            error: "Unable to determine the type of information you're looking for. Please be more specific."
        };
    }

    if (!entityName) {
        logger.warn(`No entity name provided for entityType ${entityType}`);
        return {
            ...state,
            error: `No entity name provided for ${entityType}.`
        };
    }

    try {
        let entityData: any = null;
        switch(entityType) {
            case 'track':
                const trackResponse = await globalAudiusApi.searchTracks(entityName, 1);
                if (trackResponse.data && trackResponse.data.length > 0) {
                    entityData = trackResponse.data[0];
                }
                break;
            case 'user':
                const userResponse = await globalAudiusApi.searchUsers(entityName, 1);
                if (userResponse.data && userResponse.data.length > 0) {
                    entityData = userResponse.data[0];
                }
                break;
            case 'playlist':
                const playlistResponse = await globalAudiusApi.searchPlaylists(entityName, 1);
                if (playlistResponse.data && playlistResponse.data.length > 0) {
                    entityData = playlistResponse.data[0];
                }
                break;
            // Add more cases as necessary
            default:
                logger.warn(`Unhandled entity type: ${entityType}`);
                return {
                    ...state,
                    error: `Unhandled entity type: ${entityType}.`
                };
        }

        if (entityData) {
            return {
                ...state,
                entity: entityData,
                message: `${entityType} data retrieved successfully.`,
            };
        } else {
            return {
                ...state,
                error: `No ${entityType} found matching "${entityName}".`,
            };
        }
    } catch (error: any) {
        logger.error(`Failed to fetch entity data for ${entityType}:`, error);
        return { 
            ...state, 
            error: error instanceof Error ? error.message : 'Failed to fetch entity data.' 
        };
    }
};

/**
 * Handles playlist information queries.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with either the playlist data or an error message.
 */
export const handle_playlist_info = async (state: GraphState): Promise<Partial<GraphState>> => {
    logger.info(`Handling playlist_info query for: ${state.query}`);

    if (!state.query) {
        logger.warn("No playlist name provided in playlist_info query.");
        throw new Error("No playlist name provided.");
    }

    try {
        const playlistResponse = await globalAudiusApi.searchPlaylists(state.query, state.params.limit || 5);
        logger.debug(`Search playlists response: ${JSON.stringify(playlistResponse.data)}`);

        if (!playlistResponse.data || playlistResponse.data.length === 0) {
            logger.warn(`No playlists found matching "${state.query}".`);
            throw new Error(`No playlists found matching "${state.query}".`);
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
    logger.info(`Handling search_tracks query for: ${state.entity ? state.entity.name : 'null'}`);

    try {
        if (!state.entity) {
            logger.warn("No entity provided in search_tracks query.");
            throw new Error("No entity provided.");
        }

        if (state.entity.entityType !== 'track') {
            logger.warn(`Invalid entity type for search_tracks: ${state.entity.entityType}`);
            throw new Error(`Expected a track entity, but got ${state.entity.entityType}.`);
        }

        const track = state.entity as TrackEntity;

        const playCountResponse = await globalAudiusApi.getTrackPlayCount(track.id);

        if (!playCountResponse || typeof playCountResponse.play_count !== 'number') {
            logger.warn(`Unable to retrieve play count for track ID "${track.id}".`);
            throw new Error(`Unable to retrieve play count for track "${track.title}".`);
        }

        const playCount = playCountResponse.play_count;

        const formattedResponse = `The track "${track.title}" by ${track.user.name} has been played ${playCount} times on Audius.`;

        return {
            response: playCount,
            formattedResponse,
            message: "Track play count retrieved successfully."
        };
    } catch (error: unknown) {
        logger.error(`Failed to handle search_tracks query:`, error instanceof Error ? error.message : 'Unknown error');
        return { 
            error: error instanceof Error ? error.message : 'Failed to retrieve track play count.' 
        };
    }
};

/**
 * Handles search users queries.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with the search results or an error message.
 */
export const handle_search_users = async (state: GraphState): Promise<Partial<GraphState>> => {
  logger.info(`Handling search_users query for: ${state.query}`);

  if (!state.query) {
    logger.warn("No user name provided in search_users query.");
    return { 
      error: "No user name provided for search." 
    };
  }

  try {
    const searchResponse = await globalAudiusApi.searchUsers(state.query, state.params.limit || 5);
    logger.debug(`Search users response: ${JSON.stringify(searchResponse.data)}`);

    if (!searchResponse.data || searchResponse.data.length === 0) {
      logger.warn(`No users found matching "${state.query}".`);
      return { 
        error: `No users found matching "${state.query}".` 
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

export const handle_search_playlists = async (state: GraphState): Promise<Partial<GraphState>> => {
  logger.info(`Handling search_playlists query for: ${state.query}`);

  if (!state.query) {
    logger.warn("No playlist name provided in search_playlists query.");
    return { 
      error: "No playlist name provided for search." 
    };
    }

  try {
    const searchResponse = await globalAudiusApi.searchPlaylists(state.query, state.params.limit || 5);
    logger.debug(`Search playlists response: ${JSON.stringify(searchResponse.data)}`);

    if (!searchResponse.data || searchResponse.data.length === 0) {
      logger.warn(`No playlists found matching "${state.query}".`);
      return { 
        error: `No playlists found matching "${state.query}".` 
      };
    }

    return {
      response: searchResponse.data,
      params: { limit: state.params.limit || 5 },
    };
  } catch (error: unknown) {
    logger.error(`Failed to handle search_playlists query:`, error);
    return { 
      error: error instanceof Error ? error.message : 'Failed to search playlists.' 
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
    const trendingTracksResponse = await globalAudiusApi.getTrendingTracks(state.params.timeframe || 'week');
    
    if (!trendingTracksResponse || !trendingTracksResponse.data) {
      throw new Error("Failed to retrieve trending tracks data");
    }

    const formattedResponse = format_trending_tracks(trendingTracksResponse.data, state.params.limit || 5);

    return {
      response: trendingTracksResponse.data,
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
export const handle_error = (state: GraphState): Partial<GraphState> => {
  const errorMessage = state.error || 'An unknown error occurred.';
  logger.error(`Handling error for state: ${errorMessage}`);

  let userFriendlyMessage = 'I apologize, but I encountered an issue while processing your request.';

  if (state.queryType === 'trending_tracks' && errorMessage.includes('Failed to retrieve trending tracks')) {
    userFriendlyMessage = "I'm sorry, but I couldn't fetch the trending tracks at the moment. This might be due to a temporary issue with the Audius API. Please try again later.";
  } else if (state.queryType === 'search_tracks' && errorMessage.includes('No track name provided')) {
    userFriendlyMessage = "I'm sorry, but I need a specific track name to search for. Could you please provide the name of the track you're looking for?";
  }
  // Add more specific error handling cases as needed

  return {
    formattedResponse: userFriendlyMessage,
    error: errorMessage,
    message: 'Error handled with user-friendly message.',
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