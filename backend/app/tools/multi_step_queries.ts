import { GraphState } from "../types.js";
import { logger } from '../logger.js';
import { globalAudiusApi } from "../services/audiusApi.js";
import { TrackResponse } from '@audius/sdk';

/**
 * Handles multi-step queries based on the query type.
 * @param state - The current state of the graph.
 * @returns A partial update to the graph state.
 */
export async function handleMultiStepQuery(state: GraphState): Promise<Partial<GraphState>> {
  const { queryType, params } = state;

  if (queryType !== 'genre_info') {
    logger.warn(`handleMultiStepQuery called with unsupported queryType: ${queryType}`);
    return { error: "Unsupported query type for multi-step processing." };
  }

  try {
    logger.info("Handling multi-step query for trending genres");

    // Set default limit to 5 and default timeframe to 'week' if not specified
    const limit = params.limit || 5;
    const timeframe = params.timeframe || 'week';

    // Fetch trending tracks directly using globalAudiusApi
    const tracksData = await globalAudiusApi.getTrendingTracks(limit);

    if (!tracksData || !Array.isArray(tracksData.data)) {
      throw new Error("No data received from trending tracks endpoint.");
    }

    logger.debug(`Fetched trending tracks: ${JSON.stringify(tracksData.data)}`);

    const genres = extractGenres(tracksData.data);
    const topGenres = scoreAndRankGenres(genres);
    const formattedResponse = formatGenresResponse(topGenres, limit);

    logger.debug(`Processed top genres: ${JSON.stringify(topGenres)}`);
    logger.debug(`Formatted response: ${formattedResponse}`);

    return {
      ...state,
      multiStepHandled: true,
      response: topGenres, 
      formattedResponse,
      message: "Trending genres processed successfully."
    };
  } catch (error: any) {
    logger.error(`Error handling multi-step query:`, error);
    return { error: error.message || "An error occurred during multi-step query processing." };
  }
}

/**
 * Extracts genres from a list of tracks.
 * @param tracks - An array of track data.
 * @returns An array of genres.
 */
function extractGenres(tracks: TrackResponse[]): string[] {
  // Implement genre extraction logic based on track data
  const genres: string[] = [];
  tracks.forEach(track => {
    if (track.data?.genre) {
      genres.push(track.data.genre.toLowerCase());
    }
  });
  return genres;
}

/**
 * Scores and ranks genres based on their frequency.
 * @param genres - An array of genres.
 * @returns An array of genres with scores.
 */
function scoreAndRankGenres(genres: string[]): { genre: string; score: number }[] {
  const genreCount: { [key: string]: number } = {};
  genres.forEach(genre => {
    genreCount[genre] = (genreCount[genre] || 0) + 1;
  });

  const genreScores = Object.entries(genreCount).map(([genre, count]) => ({
    genre,
    score: count,
  }));

  // Sort genres by score in descending order
  return genreScores.sort((a, b) => b.score - a.score);
}

/**
 * Formats the top genres into a readable string.
 * @param topGenres - An array of genres with scores.
 * @param limit - The number of top genres to include.
 * @returns A formatted string listing the top genres.
 */
export function formatGenresResponse(topGenres: { genre: string; score: number }[], limit: number): string {
  const formatted = topGenres.slice(0, limit).map((item, index) =>
    `${index + 1}. ${capitalizeFirstLetter(item.genre)}`
  ).join('\n');

  return `Here are the top ${limit} genres on Audius based on trending tracks:\n\n${formatted}`;
}

/**
 * Capitalizes the first letter of a given string.
 * @param text - The string to capitalize.
 * @returns The capitalized string.
 */
function capitalizeFirstLetter(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}