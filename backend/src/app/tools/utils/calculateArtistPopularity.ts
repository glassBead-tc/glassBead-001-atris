import { apiLogger } from '../../logger.js';

// Use a more permissive type that matches actual API response
interface ApiTrack {
  title: string;
  play_count: number;
  favorite_count: number;
  user: {
    id: string;
    name: string;
  };
}

interface ArtistScore {
  name: string;
  id: string;
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

interface ParetoMetrics {
  totalEngagement: number;
  top20Percentage: number;
  paretoRatio: number;
  dominantArtists: string[];
}

/**
 * Calculates artist popularity using Pareto distribution
 */
export const calculateArtistPopularity = (tracks: any[]): ArtistScore[] => {
  // Group tracks by artist first
  const artistTracks = new Map<string, any[]>();
  tracks.forEach(track => {
    const artistId = track.user.id;
    if (!artistTracks.has(artistId)) {
      artistTracks.set(artistId, []);
    }
    artistTracks.get(artistId)!.push(track);
  });

  // Calculate raw engagement metrics
  const artistEngagements = new Map<string, {
    totalPlays: number;
    totalFavorites: number;
    trackCount: number;
    topTrack: ApiTrack;
    rawEngagement: number;
  }>();

  let totalSystemEngagement = 0;

  // Calculate per-artist metrics
  artistTracks.forEach((tracks, artistId) => {
    // Sum up all plays and favorites across all tracks
    const totalPlays = tracks.reduce((sum, track) => sum + (track.play_count || 0), 0);
    const totalFavorites = tracks.reduce((sum, track) => sum + (track.favorite_count || 0), 0);
    
    // Calculate raw engagement score
    // Weighted formula: plays + (favorites * 2) + (track_count bonus)
    const trackCountBonus = Math.log(tracks.length + 1) * 1000; // Logarithmic bonus for multiple tracks
    const rawEngagement = totalPlays + (totalFavorites * 2) + trackCountBonus;
    
    totalSystemEngagement += rawEngagement;

    // Find the artist's best performing track
    const topTrack = tracks.reduce((best, track) => {
      const trackScore = (track.play_count || 0) + ((track.favorite_count || 0) * 2);
      const bestScore = (best.play_count || 0) + ((best.favorite_count || 0) * 2);
      return trackScore > bestScore ? track : best;
    }, tracks[0]);

    artistEngagements.set(artistId, {
      totalPlays,
      totalFavorites,
      trackCount: tracks.length,
      topTrack,
      rawEngagement
    });

    // Debug logging with more detail
    console.log(`Artist ${tracks[0].user.name} metrics:`, {
      totalPlays,
      totalFavorites,
      trackCount: tracks.length,
      rawEngagement,
      trackCountBonus,
      averagePlayPerTrack: totalPlays / tracks.length,
      averageFavoritesPerTrack: totalFavorites / tracks.length
    });
  });

  // Calculate Pareto metrics
  const sortedByEngagement = Array.from(artistEngagements.entries())
    .sort((a, b) => b[1].rawEngagement - a[1].rawEngagement);

  const top20Count = Math.ceil(sortedByEngagement.length * 0.2);
  const top20Engagement = sortedByEngagement
    .slice(0, top20Count)
    .reduce((sum, [_, metrics]) => sum + metrics.rawEngagement, 0);

  const paretoMetrics: ParetoMetrics = {
    totalEngagement: totalSystemEngagement,
    top20Percentage: (top20Engagement / totalSystemEngagement) * 100,
    paretoRatio: top20Engagement / totalSystemEngagement,
    dominantArtists: sortedByEngagement.slice(0, top20Count).map(([id, _]) => id)
  };

  // Calculate final scores
  const artistScores = Array.from(artistTracks.entries()).map(([artistId, tracks]) => {
    const metrics = artistEngagements.get(artistId)!;
    const artist = tracks[0].user;

    // Apply Pareto-based scoring
    const isParetoLeader = paretoMetrics.dominantArtists.includes(artistId);
    const paretoMultiplier = isParetoLeader ? 1.25 : 0.75;
    
    // Calculate final score using total engagement metrics
    const engagementScore = metrics.rawEngagement / paretoMetrics.totalEngagement;
    const finalScore = engagementScore * paretoMultiplier * 10000;

    return {
      name: artist.name,
      id: artistId,
      points: finalScore,
      trackCount: metrics.trackCount,
      totalPlays: metrics.totalPlays,
      totalFavorites: metrics.totalFavorites,
      topTrack: {
        title: metrics.topTrack.title,
        plays: metrics.topTrack.play_count,
        favorites: metrics.topTrack.favorite_count
      }
    };
  });

  const sortedArtists = artistScores.sort((a, b) => b.points - a.points);

  // Enhanced logging
  apiLogger.info(
    `Calculated Pareto-based artist popularity:\n` +
    `- ${sortedArtists.length} total artists\n` +
    `- Top 20% (${top20Count} artists) control ${paretoMetrics.top20Percentage.toFixed(2)}% of engagement\n` +
    `- Pareto ratio: ${paretoMetrics.paretoRatio.toFixed(2)}\n` +
    `- Total system engagement: ${totalSystemEngagement.toLocaleString()}\n` +
    `- Average engagement per artist: ${(totalSystemEngagement / artistTracks.size).toLocaleString()}`
  );

  return sortedArtists;
}; 