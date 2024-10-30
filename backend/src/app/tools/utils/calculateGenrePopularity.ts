// backend/app/tools/utils/calculateGenrePopularity.ts
import { apiLogger } from '../../logger.js';
import { TrackData } from '../../types.js';

/**
 * Calculates genre popularity using a Pareto distribution.
 * @param tracks - Array of trending tracks.
 * @param totalPoints - Total points to distribute among genres.
 * @returns A record mapping genres to their assigned points.
 */
export const calculateGenrePopularity = (genres: string[], baseValue: number): Record<string, number> =>  {
  const genreCounts: Record<string, number> = {};

  // Count occurrences of each genre
  genres.forEach((genre) => {
    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
  });

  // Sort genres by count in descending order
  const sortedGenres = Object.entries(genreCounts).sort(
    ([_, countA], [__, countB]) => countB - countA
  );

  // Define Pareto exponent (alpha). Commonly between 1 and 3.
  const alpha = 1.16; // Adjust based on desired distribution skew

  // Calculate Pareto distribution factors
  const paretoFactors = sortedGenres.map(([, _], index) => {
    return 1 / Math.pow(index + 1, alpha);
  });

  // Calculate total Pareto factor
  const totalParetoFactor = paretoFactors.reduce((sum, factor) => sum + factor, 0);

  // Assign points based on Pareto factors
  const genrePopularity: Record<string, number> = {};
  sortedGenres.forEach(([genre, _], index) => {
    const normalizedFactor = paretoFactors[index] / totalParetoFactor;
    genrePopularity[genre] = parseFloat((normalizedFactor * baseValue).toFixed(2));
  });

  apiLogger.info(
    `Calculated genre popularity using Pareto distribution: ${JSON.stringify(
      genrePopularity
    )}`
  );
  return genrePopularity;
}