import { apiLogger } from '../../logger.js';
import type { Track } from '../../types.js';

interface ArtistScore {
  name: string;
  id: string;
  points: number;
  trackCount: number;
  topTrack: {
    title: string;
    plays: number;
    favorites: number;
  };
}

/**
 * Calculates artist popularity using a Pareto distribution of trending tracks
 * @param tracks - Array of trending tracks
 * @param totalPoints - Total points to distribute (default 10000)
 * @returns Array of artist scores sorted by points
 */
export const calculateArtistPopularity = (
  tracks: Track[], 
  totalPoints: number = 10000
): ArtistScore[] => {
  // First distribute points among tracks using Pareto
  const alpha = 1.16; // Same skew as genre distribution
  const trackPoints = tracks.map((_, index) => {
    return totalPoints * (1 / Math.pow(index + 1, alpha));
  });

  // Normalize track points to sum to totalPoints
  const totalTrackPoints = trackPoints.reduce((sum, points) => sum + points, 0);
  const normalizedTrackPoints = trackPoints.map(points => 
    (points / totalTrackPoints) * totalPoints
  );

  // Group by artist and sum their track points
  const artistScores = new Map<string, ArtistScore>();
  
  tracks.forEach((track, index) => {
    const artistId = track.user.id;
    const points = normalizedTrackPoints[index];
    
    if (!artistScores.has(artistId)) {
      artistScores.set(artistId, {
        name: track.user.name,
        id: artistId,
        points: 0,
        trackCount: 0,
        topTrack: {
          title: track.title,
          plays: track.playCount,
          favorites: track.favoriteCount
        }
      });
    }

    const score = artistScores.get(artistId)!;
    score.points += points;
    score.trackCount += 1;
    
    // Update top track if this one has more plays
    if (track.playCount > score.topTrack.plays) {
      score.topTrack = {
        title: track.title,
        plays: track.playCount,
        favorites: track.favoriteCount
      };
    }
  });

  // Convert to array and sort by points
  const sortedArtists = Array.from(artistScores.values())
    .sort((a, b) => b.points - a.points);

  apiLogger.info(
    `Calculated artist popularity using Pareto distribution across ${tracks.length} tracks`
  );

  return sortedArtists;
}; 