import { GraphState } from "../types.js";
import { logger } from '../logger.js';
import { globalAudiusApi } from "../services/audiusApi.js";

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
    const tracks = await globalAudiusApi.getTrendingTracks(100, timeframe);

    if (!tracks || !Array.isArray(tracks)) {
      throw new Error("No data received from trending tracks endpoint.");
    }

    logger.debug(`Fetched trending tracks: ${JSON.stringify(tracks)}`);

    const genres = extractGenres(tracks);
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
  } catch (error) {
    logger.error(`Error in handleMultiStepQuery: ${error instanceof Error ? error.message : String(error)}`);
    return { 
      error: error instanceof Error ? error.message : "An error occurred in handleMultiStepQuery." 
    };
  }
}

export function extractGenres(tracks: any[]): string[] {
  return tracks
    .map(track => track.genre ? track.genre.toLowerCase() : 'unknown')
    .filter(genre => genre !== 'unknown');
}

export function scoreAndRankGenres(genres: string[]): { genre: string; score: number }[] {
  const totalPoints = 10000;
  // Generate Pareto distribution weights
  const paretoWeights = generateParetoWeights(genres.length);

  // Map genres to their accumulated scores
  const genreScores: { [key: string]: number } = {};

  for (let i = 0; i < genres.length; i++) {
    const genre = genres[i];
    const points = paretoWeights[i] * totalPoints;
    genreScores[genre] = (genreScores[genre] || 0) + points;
  }

  const genreScoresArray = Object.entries(genreScores).map(([genre, score]) => ({
    genre,
    score: score
  }));

  // Sort genres by score in descending order
  return genreScoresArray.sort((a, b) => b.score - a.score);
}

export function generateParetoWeights(n: number, alpha: number = 1.16): number[] {
  // Generate ranks from 1 to n
  const ranks = Array.from({ length: n }, (_, i) => i + 1);

  // Calculate weights using the Pareto distribution formula
  const weights = ranks.map(rank => 1 / Math.pow(rank, alpha));

  // Normalize weights so that they sum to 1
  const sumWeights = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map(weight => weight / sumWeights);
}

export function formatGenresResponse(topGenres: { genre: string; score: number }[], limit: number): string {
  const formatted = topGenres.slice(0, limit).map((item, index) =>
    `${index + 1}. ${capitalizeFirstLetter(item.genre)}`
  ).join('\n');

  return `Here are the top ${limit} genres on Audius based on trending tracks:\n\n${formatted}`;
}

function capitalizeFirstLetter(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}