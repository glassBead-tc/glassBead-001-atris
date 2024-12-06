// backend/app/tools/utils/calculateGenrePopularity.ts
import { apiLogger } from '../../logger.js';

// Define interface matching actual API response shape
interface ApiTrack {
  title: string;
  genre: string;
  play_count: number;
  favorite_count: number;
  user: {
    name: string;
  };
}

interface GenreScore {
  name: string;
  points: number;
  trackCount: number;
  totalPlays: number;
  totalFavorites: number;
  topTrack: {
    title: string;
    plays: number;
    favorites: number;
  };
}

/**
 * Calculates genre popularity using Pareto distribution
 */
export const calculateGenrePopularity = (
  tracks: any[], 
  totalPoints: number = 10000
): GenreScore[] => {
  // First, assign Pareto-distributed points to tracks
  const paretoPoints = tracks.map((_, index) => {
    const position = index + 1;
    const subdivision = Math.ceil(position / 20);
    const basePoints = totalPoints / Math.pow(5, subdivision - 1);
    return basePoints / 20;
  });

  // Group tracks by genre
  const genreTracks = new Map<string, {
    tracks: ApiTrack[];
    points: number;
  }>();

  tracks.forEach((track, index) => {
    const genre = track.genre || 'Unknown';
    if (!genreTracks.has(genre)) {
      genreTracks.set(genre, {
        tracks: [],
        points: 0
      });
    }
    const genreGroup = genreTracks.get(genre)!;
    genreGroup.tracks.push(track);
    genreGroup.points += paretoPoints[index];
  });

  // Calculate metrics for each genre
  const genreScores: GenreScore[] = Array.from(genreTracks.entries())
    .map(([genre, data]) => {
      const totalPlays = data.tracks.reduce((sum, track) => 
        sum + (track.play_count || 0), 0);
      const totalFavorites = data.tracks.reduce((sum, track) => 
        sum + (track.favorite_count || 0), 0);

      // Find top track for this genre
      const topTrack = data.tracks.reduce((best, track) => {
        const trackScore = (track.play_count || 0) + ((track.favorite_count || 0) * 2);
        const bestScore = (best.play_count || 0) + ((best.favorite_count || 0) * 2);
        return trackScore > bestScore ? track : best;
      }, data.tracks[0]);

      return {
        name: genre,
        points: data.points,
        trackCount: data.tracks.length,
        totalPlays,
        totalFavorites,
        topTrack: {
          title: topTrack.title,
          plays: topTrack.play_count || 0,
          favorites: topTrack.favorite_count || 0
        }
      };
    });

  // Sort by points
  const sortedGenres = genreScores.sort((a, b) => b.points - a.points);

  // Log distribution analysis
  const totalGenres = sortedGenres.length;
  const top20Percent = Math.ceil(totalGenres * 0.2);
  const top20Points = sortedGenres
    .slice(0, top20Percent)
    .reduce((sum, genre) => sum + genre.points, 0);
  
  apiLogger.info(
    `Calculated genre popularity across ${tracks.length} tracks:\n` +
    `- ${totalGenres} total genres\n` +
    `- Top ${top20Percent} genres (${Math.round(top20Points / 100)}% of points)\n` +
    `- Distribution: ${sortedGenres.map(g => `${g.name}: ${Math.round(g.points)}`).join(', ')}`
  );

  return sortedGenres;
};
