/**
 * Calculates genre popularity using a Pareto distribution.
 * @param tracks - Array of trending tracks.
 * @param totalPoints - Total points to distribute among genres.
 * @returns A record mapping genres to their assigned points.
 */
export declare const calculateGenrePopularity: (genres: string[], baseValue: number) => Record<string, number>;
