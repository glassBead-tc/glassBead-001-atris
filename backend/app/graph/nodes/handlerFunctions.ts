import { logger } from "../../logger.js";
import { globalAudiusApi } from "../../services/audiusApi.js";
import { GraphState, TrackEntity, GroupedGenres } from "../../types.js";
import { extractTrendingTracksParameters,
  extractTrackParameters,
  extractUserParameters,
  extractPlaylistParameters,
  extractGenreParameters,
  extractPlaylistId,
  extractSearchTracksParameters,
  getUserTracks,
  getUserFollowers,
  getUserFollowing,
  extractTime,
  extractSearchQuery,
  extractWebSearchQuery,
  extractTrackId,
  extractLimit,
  extractTrackIds,
  extractUserId,
  extractWalletAddress,
  extractOffset,
  extractGenre } from "../../tools/utils/extractionUtils/index.js";
// Import format functions
import { formatGenrePopularity, formatTrendingTracks, formatUserInfo, formatPlaylistInfo, formatDetailedTrackInfo, formatMultipleTracks, formatPlaylistResults, formatUserResults, formatTrendingResults, formatDuration } from '../../tools/utils/formatResults.js';
import { calculateGenrePopularity } from '../../tools/utils/calculateGenrePopularity.js';

// Import other utility functions as needed
import { handleApiError } from '../../tools/utils/errorHandler.js';

/**
 * Handles genre search queries.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with the search results or an error message.
 */

export const handle_search_genres = async (state: GraphState): Promise<GraphState> => {
  logger.info(`Handling search_genres query`);

  try {
    // Extract parameters using the tool function
    const params = extractGenreParameters(state.query, state.entityType);
    const genreName = params.genreName || state.entityName;
    const limit = params.limit || 5;

    if (!genreName) {
      logger.warn("No genre provided in search_genres query.");
      return { 
        ...state,
        error: true,
        message: "No genre provided for search." 
      };
    }

    // Use the globalAudiusApi to search genres
    const searchResponse = await globalAudiusApi.searchGenres(genreName, limit);
    logger.debug(`Search genres response: ${JSON.stringify(searchResponse.data)}`);

    if (!searchResponse.data || searchResponse.data.length === 0) {
      logger.warn(`No genres found matching "${genreName}".`);
      return { 
        ...state,
        error: true,
        message: `No genres found matching "${genreName}".` 
      };
    }

    // Calculate genre popularity using the tool function
    const genrePopularity: Record<string, number> = calculateGenrePopularity(searchResponse.data, 10000);

    // Format the response using the tool function
    const formattedResponse = formatGenrePopularity(genrePopularity, limit);

    return {
      ...state,
      response: searchResponse.data,
      formattedResponse,
      message: "Genre search processed successfully."
    };
  } catch (error: unknown) {
    logger.error("Failed to handle search_genres query:", error);
    return { 
      ...state,
      error: true,
      message: error instanceof Error ? error.message : 'Failed to search genres.' 
    };
  }
};
/**
 * Handles general entity queries.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with either updated parameters or an error message.
 */
export const handle_entity_query = async (state: GraphState): Promise<GraphState> => {
    logger.debug(`Entering handle_entity_query with state: ${JSON.stringify(state)}`);

    // Check if the entity is defined
    if (!state.entity) {
        logger.warn("No entity name provided in entity query.");
        return {
            ...state,
            error: true,
            message: "No entity name provided."
        };
    }

    try {
        // Check if the query is for the most popular song
        if (state.query.toLowerCase().includes("most popular song")) {
            const trendingTracksResponse = await globalAudiusApi.getTrendingTracks(1); // Fetch the top trending track
            logger.debug(`Trending tracks response: ${JSON.stringify(trendingTracksResponse)}`);

            if (!trendingTracksResponse || !trendingTracksResponse.data || trendingTracksResponse.data.length === 0) {
                logger.warn("No trending tracks found.");
                return {
                    ...state,
                    error: true,
                    message: "No trending tracks found."
                };
            }

            const mostPopularTrack = trendingTracksResponse.data[0]; // Get the first track
            const formattedResponse = `The most popular song on Audius right now is "${mostPopularTrack.data?.title}" by ${mostPopularTrack.data?.user.name}.`;

            return {
                ...state,
                response: mostPopularTrack,
                formattedResponse,
                message: "Most popular track retrieved successfully."
            };
        }

        // Fetch track information
        const trackInfoResponse = await globalAudiusApi.getUserTracks(state.entity.name, 1); // Assume this function fetches track info
        logger.debug(`Track info response: ${JSON.stringify(trackInfoResponse)}`);

        // Check if the response contains data
        if (!trackInfoResponse || !trackInfoResponse.data || trackInfoResponse.data.length === 0) {
            logger.warn(`No track information found for entity: ${state.entity}`);
            return {
                ...state,
                error: true,
                message: "Track information not found."
            };
        }

        // Access the first track response
        const trackInfo = trackInfoResponse.data[0];
        console.log(trackInfo);

        // Ensure play_count exists
        if (typeof trackInfo.data?.playCount !== 'number') {
            logger.warn(`Play count is not a number for track ID "${trackInfo.data?.id}".`);
            return {
                ...state,
                error: true,
                message: `Unable to retrieve play count for track "${trackInfo.data?.title}".`
            };
        }

        const playCount = trackInfo.data?.playCount;
        console.log(playCount);

        logger.info(`Found play count for track ${trackInfo.data?.title}: ${playCount}`);

        return {
            ...state,
            response: playCount,
            formattedResponse: `The track "${trackInfo.data?.title}" by ${trackInfo.data?.user.name} has been played ${playCount} times on Audius.`,
            message: "Track play count retrieved successfully."
        };
    } catch (error: unknown) {
        logger.error(`Failed to handle entity query:`, error instanceof Error ? error.message : 'Unknown error');
        return { 
            ...state,
            error: true,
            message: error instanceof Error ? error.message : 'Failed to retrieve track information.' 
        };
    }
};

export const handle_search_tracks = async (state: GraphState): Promise<GraphState> => {
    logger.info(`Handling search_tracks query for: ${state.entity?.name ?? 'null'}`);

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
            ...state,
            response: playCount,
            formattedResponse,
            message: "Track play count retrieved successfully."
        };
    } catch (error: unknown) {
        logger.error(`Failed to handle search_tracks query:`, error instanceof Error ? error.message : 'Unknown error');
        return { 
            ...state,
            error: true,
            message: error instanceof Error ? error.message : 'Failed to retrieve track play count.' 
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
        return { 
            error: true,
            message: "No playlist name provided for search." 
        };
    }

    try {
        const playlistResponse = await globalAudiusApi.searchPlaylists(state.query, state.params.limit || 5);
        logger.debug(`Search playlists response: ${JSON.stringify(playlistResponse.data)}`);

        if (!playlistResponse.data || playlistResponse.data.length === 0) {
            logger.warn(`No playlists found matching "${state.query}".`);
            return { 
                error: true,
                message: `No playlists found matching "${state.query}".` 
            };
        }

        return {
            response: playlistResponse.data,
            params: { limit: state.params.limit || 5 },
            message: "Playlist information retrieved successfully."
        };
    } catch (error: unknown) {
        logger.error(`Failed to handle playlist_info query:`, error);
        return { 
            error: true,
            message: error instanceof Error ? error.message : 'Failed to retrieve playlist information.' 
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
      error: true,
      message: "No user name provided for search." 
    };
  }

  try {
    const searchResponse = await globalAudiusApi.searchUsers(state.query, state.params.limit || 5);
    logger.debug(`Search users response: ${JSON.stringify(searchResponse.data)}`);

    if (!searchResponse.data || searchResponse.data.length === 0) {
      logger.warn(`No users found matching "${state.query}".`);
      return { 
        error: true,
        message: `No users found matching "${state.query}".` 
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
      error: true,
      message: error instanceof Error ? error.message : 'Failed to search users.' 
    };
  }
};

export const handle_search_playlists = async (state: GraphState): Promise<Partial<GraphState>> => {
  logger.info(`Handling search_playlists query for: ${state.query}`);

  if (!state.query) {
    logger.warn("No playlist name provided in search_playlists query.");
    return { 
      error: true,
      message: "No playlist name provided for search." 
    };
    }

  try {
    const searchResponse = await globalAudiusApi.searchPlaylists(state.query, state.params.limit || 5);
    logger.debug(`Search playlists response: ${JSON.stringify(searchResponse.data)}`);

    if (!searchResponse.data || searchResponse.data.length === 0) {
      logger.warn(`No playlists found matching "${state.query}".`);
      return { 
        error: true,
        message: `No playlists found matching "${state.query}".` 
      };
    }

    return {
      response: searchResponse.data,
      params: { limit: state.params.limit || 5 },
      message: "Playlist search processed successfully."
    };
  } catch (error: unknown) {
    logger.error(`Failed to handle search_playlists query:`, error);
    return { 
      error: true,
      message: error instanceof Error ? error.message : 'Failed to search playlists.' 
    };
  }
};

/**
 * Handles trending tracks queries.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with the trending tracks data or an error message.
 */
export const handle_trending_tracks = async (state: GraphState): Promise<GraphState> => {
  logger.info(`Handling trending_tracks query`);

  try {
    // Extract parameters using utility function
    const params = extractTrendingTracksParameters(state.query, state.entityType);
    const limit = params.limit || 5;
    const timeframe = params.timeframe || 'week';

    // Fetch trending tracks from Audius API
    const trendingTracksResponse = await globalAudiusApi.getTrendingTracks(limit);
    
    if (!trendingTracksResponse || !trendingTracksResponse.data) {
      throw new Error("Failed to retrieve trending tracks data");
    }

    // Format response using utility function
    const formattedResponse = formatTrendingTracks(trendingTracksResponse.data);

    return {
      ...state,
      response: trendingTracksResponse.data,
      formattedResponse,
      message: "Trending tracks processed successfully."
    };
  } catch (error: unknown) {
    logger.error(`Failed to handle trending_tracks query:`, error);
    return { 
      ...state,
      error: true,
      message: error instanceof Error ? error.message : 'Failed to retrieve trending tracks.' 
    };
  }
};

/**
 * Extracts category information from the state.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with the extracted category or an error message.
 */
export const extract_category = async (state: GraphState): Promise<GraphState> => {
  try {
    // Example extraction logic
    const categories = state.query.split(' ').filter(word => {
      const key = word.toUpperCase() as keyof typeof GroupedGenres.ELECTRONIC;
      return GroupedGenres.ELECTRONIC[key] !== undefined;
    });
    if (categories.length === 0) {
      return { 
        ...state,
        error: true,
        message: "No valid categories found in the query."
      };
    }
    return { 
      ...state,
      categories, 
      message: "Categories extracted successfully."
    };
  } catch (error: unknown) {
    logger.error("Failed to extract categories:", error);
    return { 
      ...state,
      error: true,
      message: error instanceof Error ? error.message : 'Failed to extract categories.' 
    };
  }
};

/**
 * Creates a fetch request based on the state.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with the fetch request or an error message.
 */
export const create_fetch_request = async (state: GraphState): Promise<GraphState> => {
  try {
    // Example fetch request creation logic
    const apiUrl = state.bestApi?.api_url;
    if (!apiUrl) {
      return { 
        ...state,
        error: true,
        message: "No API URL found for fetching data."
      };
    }
    // Assume we store the API URL in params for later use
    return { 
      ...state,
      params: { ...state.params, apiUrl },
      message: "Fetch request created successfully."
    };
  } catch (error: unknown) {
    logger.error("Failed to create fetch request:", error);
    return { 
      ...state,
      error: true,
      message: error instanceof Error ? error.message : 'Failed to create fetch request.' 
    };
  }
};

/**
 * Processes the API response based on the state.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with the processed response or an error message.
 */
export const process_api_response = async (state: GraphState): Promise<GraphState> => {
  try {
    const apiUrl = state.params.apiUrl;
    if (!apiUrl) {
      return { 
        ...state,
        error: true,
        message: "API URL not found in parameters."
      };
    }

    const response = await fetch(apiUrl);
    const data = await response.json();

    return { 
      ...state,
      response: data,
      message: "API response processed successfully."
    };
  } catch (error: unknown) {
    logger.error("Failed to process API response:", error);
    return { 
      ...state,
      error: true,
      message: error instanceof Error ? error.message : 'Failed to process API response.' 
    };
  }
};
/**
 * Verifies the parameters in the state.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with verification results or an error message.
 */
export const verify_params = async (state: GraphState): Promise<GraphState> => {
  try {
    // Example parameter verification logic
    if (!state.params.limit || state.params.limit <= 0) {
      return { 
        ...state,
        error: true,
        message: "Invalid limit parameter."
      };
    }
    return { 
      ...state,
      message: "Parameters verified successfully."
    };
  } catch (error: unknown) {
    logger.error("Failed to verify parameters:", error);
    return { 
      ...state,
      error: true,
      message: error instanceof Error ? error.message : 'Failed to verify parameters.' 
    };
  }
};

/**
 * Processes entity queries based on the state.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with processed entity queries or an error message.
 */
export const processEntityQueries = async (state: GraphState): Promise<GraphState> => {
  try {
    // Example processing logic
    if (!state.entity) {
      return { 
        ...state,
        error: true,
        message: "No entity to process."
      };
    }
    // Implement specific entity processing here
    return { 
      ...state,
      message: "Entity queries processed successfully."
    };
  } catch (error: unknown) {
    logger.error("Failed to process entity queries:", error);
    return { 
      ...state,
      error: true,
      message: error instanceof Error ? error.message : 'Failed to process entity queries.' 
    };
  }
};

/**
 * Extracts parameters from the state.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with extracted parameters or an error message.
 */
export const extract_parameters = async (state: GraphState): Promise<GraphState> => {
  try {
    // Example parameter extraction logic
    const extractedParams = {
      ...state.params,
      extracted: true // Placeholder
    };
    return { 
      ...state,
      params: extractedParams,
      message: "Parameters extracted successfully."
    };
  } catch (error: unknown) {
    logger.error("Failed to extract parameters:", error);
    return { 
      ...state,
      error: true,
      message: error instanceof Error ? error.message : 'Failed to extract parameters.' 
    };
  }
};

/**
 * Extracts high-level categories from the state.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with extracted high-level categories or an error message.
 */
export const extract_high_level_categories = async (state: GraphState): Promise<GraphState> => {
  try {
    // Example high-level category extraction logic
    const highLevelCategories = state.categories.map(cat => cat.toUpperCase());
    return { 
      ...state,
      categories: highLevelCategories,
      message: "High-level categories extracted successfully."
    };
  } catch (error: unknown) {
    logger.error("Failed to extract high-level categories:", error);
    return { 
      ...state,
      error: true,
      message: error instanceof Error ? error.message : 'Failed to extract high-level categories.' 
    };
  }
};

/**
 * Handles error by updating the state message.
 * @param state - The current state of the GraphState.
 * @returns A partial GraphState with the updated message.
 */
export const handle_error = async (state: GraphState): Promise<GraphState> => {
  if (!state.error) {
    // If there's no error, we shouldn't be in this function
    logger.warn("handle_error called without an error in the state");
    return state;
  }

  const errorMessage = state.message ?? 'An unknown error occurred.';
  logger.error(`Handling error for state: ${errorMessage}`);

  let userFriendlyMessage = 'I apologize, but I encountered an issue while processing your request.';

  if (state.queryType === 'trending_tracks' && errorMessage.includes('Failed to retrieve trending tracks')) {
    userFriendlyMessage = "I'm sorry, but I couldn't fetch the trending tracks at the moment. This might be due to a temporary issue with the Audius API. Please try again later.";
  } else if (state.queryType === 'search_tracks' && errorMessage.includes('No track provided')) {
    userFriendlyMessage = "I'm sorry, but I need a specific track name to search for. Could you please provide the name of the track you're looking for?";
  } else if (state.queryType === 'general') {
    userFriendlyMessage = "I apologize, but I couldn't understand your query. Could you please rephrase it or provide more specific information about what you're looking for on Audius?";
  }
  // Add more specific error handling cases as needed

  return {
    ...state,
    formattedResponse: userFriendlyMessage,
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






