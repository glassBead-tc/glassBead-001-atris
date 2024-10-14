// backend/app/tools/utils/formatGenrePopularity.ts
/**
 * Formats genre popularity data into a readable string.
 * @param genrePopularity - Record mapping genres to points.
 * @param limit - Number of top genres to include.
 * @returns A formatted string listing the top genres.
 */
export function formatGenrePopularity(genrePopularity: Record<string, number>, limit: number): string {
    const sortedGenres = Object.entries(genrePopularity).sort((a, b) => b[1] - a[1]).slice(0, limit);
    let response = `**Top ${limit} Genres on Audius:**\n\n`;

    sortedGenres.forEach(([genre, points], index) => {
        response += `${index + 1}. **${genre}** - ${points} points\n`;
    });

    return response;
}