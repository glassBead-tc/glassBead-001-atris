#!/usr/bin/env node

import { getAudiusSdk } from '../services/sdkClient.js';
import fs from 'fs/promises';

interface TrendingMetrics {
    id: string;
    title: string;
    artist: string;
    plays: number;
    favorites: number;
    reposts: number;
    releaseDate: Date;
    rank: number;
    daysOld: number;
    // Raw velocity metrics
    playsPerDay: number;
    favoritesPerDay: number;
    repostsPerDay: number;
    // Recent velocity (last 7 days estimated)
    recentPlaysVelocity: number;
    recentFavoritesVelocity: number;
    recentRepostsVelocity: number;
    playlistCount: number;
    engagementIndex: number;
    decayedScore: number;
    timeDecayFactor: number;
    focusedScore: number;
  }

interface VelocityMetrics {
  // Basic velocity metrics
  playsPerDay: number;
  favoritesPerDay: number;
  repostsPerDay: number;
  recentPlaysVelocity: number;
  recentFavoritesVelocity: number;
  recentRepostsVelocity: number;
  
  // Playlist metrics
  playlistsPerDay: number;
  recentPlaylistVelocity: number;
  
  // Cross-engagement metrics
  crossEngagementPerDay: number;
  recentCrossEngagement: number;
  
  // Relative performance metrics
  relativeVelocity: number;
  recentRelativeVelocity: number;
  
  // Time decay
  timeDecayFactor: number;
  
  // Final score
  velocityScore: number;
}

interface ExtendedTrendingMetrics extends TrendingMetrics {
  // Add new velocity metrics
  playlistsPerDay: number;
  recentPlaylistVelocity: number;
  crossEngagementPerDay: number;
  recentCrossEngagement: number;
  relativeVelocity: number;
  recentRelativeVelocity: number;
  pureVelocityScore: number;  // New combined score
  minimalVelocityScore: number;  // Add this
  aggressiveVelocityScore: number;
  aggressiveDecayFactor: number;
}

// Add this interface near the top with the other interfaces
interface MinimalVelocityMetrics {
  playsPerDay: number;
  pureVelocityScore: number;
  minimalVelocityScore: number;
  timeDecayFactor: number;
}

interface AggressiveVelocityMetrics {
  velocityScore: number;
  decayFactor: number;
  rawScore: number;  // Score before decay
  components: {
    playsPerDay: number;
    relativeVelocity: number;
    pureVelocityScore: number;
  };
}

function calculateVelocityMetrics(track: any): {
  daysOld: number;
  playsPerDay: number;
  favoritesPerDay: number;
  repostsPerDay: number;
  recentPlaysVelocity: number;
  recentFavoritesVelocity: number;
  recentRepostsVelocity: number;
  playlistCount: number;
  engagementIndex: number;
  decayedScore: number;
  timeDecayFactor: number;
} {
  const releaseDate = new Date(track.release_date + 'Z');
  const now = new Date();
  const utcNow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds()
  ));
  
  const daysOld = Math.max(
    0.001,
    (utcNow.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Overall velocity metrics
  const playsPerDay = track.play_count / daysOld;
  const favoritesPerDay = track.favorite_count / daysOld;
  const repostsPerDay = track.repost_count / daysOld;
  
  // Estimate recent velocity (assuming higher rate for newer tracks)
  const recentDays = Math.min(7, daysOld);
  const recentWeight = 1.5; // Assume recent engagement is 1.5x the average rate
  const recentPlaysVelocity = (track.play_count * recentWeight) / recentDays;
  const recentFavoritesVelocity = (track.favorite_count * recentWeight) / recentDays;
  const recentRepostsVelocity = (track.repost_count * recentWeight) / recentDays;
  
  const playlistCount = track.playlists_containing_track?.length || 0;
  
  // Calculate engagement index
  const engagementIndex = track.play_count * (100 / (Math.max(1, track.favorite_count * track.repost_count)));
  
  // Binary time decay (1.0 for ≤7 days, 0.7 for >7 days)
  const DECAY_WINDOW = 7;
  const timeDecayFactor = daysOld <= DECAY_WINDOW ? 1.0 : 0.7;
  
  // Calculate decayed score with emphasis on velocity
  const decayedScore = (
    (recentPlaysVelocity * 1.0) +
    (recentFavoritesVelocity * 10.0) +
    (recentRepostsVelocity * 10.0) +
    (playlistCount * 5.0) +
    (engagementIndex * 0.1)
  ) * timeDecayFactor;
  
  return {
    daysOld,
    playsPerDay,
    favoritesPerDay,
    repostsPerDay,
    recentPlaysVelocity,
    recentFavoritesVelocity,
    recentRepostsVelocity,
    playlistCount,
    engagementIndex,
    decayedScore,
    timeDecayFactor
  };
}

function calculateFocusedScore(track: any): {
  daysOld: number;
  playsPerDay: number;
  recentPlaysVelocity: number;
  focusedScore: number;
  timeDecayFactor: number;
} {
  const releaseDate = new Date(track.release_date + 'Z');
  const now = new Date();
  const utcNow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds()
  ));
  
  const daysOld = Math.max(
    0.001,
    (utcNow.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Focus on most predictive metrics
  const playsPerDay = track.play_count / daysOld;
  
  const recentDays = Math.min(7, daysOld);
  const recentWeight = 1.5;
  const recentPlaysVelocity = (track.play_count * recentWeight) / recentDays;
  
  // Binary time decay
  const timeDecayFactor = daysOld <= 7 ? 1.0 : 0.7;
  
  // Weighted combination of most predictive metrics
  const focusedScore = (
    (playsPerDay * 0.663) +          // Weight by correlation strength
    (recentPlaysVelocity * 0.586)    // Weight by correlation strength
  ) * timeDecayFactor;
  
  return {
    daysOld,
    playsPerDay,
    recentPlaysVelocity,
    focusedScore,
    timeDecayFactor
  };
}

export async function collectTrendingMetrics(limit: number = 100): Promise<ExtendedTrendingMetrics[]> {
  const sdk = await getAudiusSdk();
  
  try {
    const response = await sdk.tracks.getTrendingTracks({ 
      time: 'week',
      limit 
    });

    if (!response?.data) {
      throw new Error('No data returned from trending tracks endpoint');
    }

    const metrics: ExtendedTrendingMetrics[] = response.data.map((track: any, index: number) => {
      const basicMetrics = calculateVelocityMetrics(track);
      const focusedMetrics = calculateFocusedScore(track);
      const pureVelocityMetrics = calculatePureVelocityMetrics(track);
      const minimalVelocityMetrics = calculateMinimalVelocityMetrics(track);
      const aggressiveMetrics = calculateAggressiveVelocityScore(track);
      
      return {
        id: track.id,
        title: track.title,
        artist: track.user.name,
        plays: track.play_count,
        favorites: track.favorite_count,
        reposts: track.repost_count,
        releaseDate: new Date(track.release_date),
        rank: index + 1,
        ...basicMetrics,
        focusedScore: focusedMetrics.focusedScore,
        ...pureVelocityMetrics,
        pureVelocityScore: pureVelocityMetrics.velocityScore,
        minimalVelocityScore: minimalVelocityMetrics.minimalVelocityScore,
        aggressiveVelocityScore: aggressiveMetrics.velocityScore,
        aggressiveDecayFactor: aggressiveMetrics.decayFactor
      };
    });

    // Update logging to include new metrics
    console.log('\nExtended Metrics Analysis:');
    metrics.slice(0, 10).forEach((track, i) => {
      console.log(`\n${i + 1}. "${track.title}" by ${track.artist}`);
      console.log(`   Age: ${track.daysOld.toFixed(1)} days`);
      console.log(`   Release Date: ${track.releaseDate.toUTCString()}`);
      console.log(`   Overall Velocity: ${track.playsPerDay.toFixed(1)} plays/day, ${track.favoritesPerDay.toFixed(1)} favs/day, ${track.repostsPerDay.toFixed(1)} reposts/day`);
      console.log(`   Recent Velocity: ${track.recentPlaysVelocity.toFixed(1)} plays/day, ${track.recentFavoritesVelocity.toFixed(1)} favs/day, ${track.recentRepostsVelocity.toFixed(1)} reposts/day`);
      console.log(`   Playlists: ${track.playlistCount} playlists`);
      console.log(`   Engagement Index: ${track.engagementIndex.toFixed(1)}`);
      console.log(`   Time Decay Factor: ${track.timeDecayFactor.toFixed(3)}`);
      console.log(`   Decayed Score: ${track.decayedScore.toFixed(1)}`);
      console.log(`   Focused Score: ${track.focusedScore.toFixed(1)}`);
      console.log(`   Playlist Velocity: ${track.playlistsPerDay.toFixed(1)} adds/day (Recent: ${track.recentPlaylistVelocity.toFixed(1)})`);
      console.log(`   Cross-Engagement: ${track.crossEngagementPerDay.toFixed(3)} per follower/day (Recent: ${track.recentCrossEngagement.toFixed(3)})`);
      console.log(`   Relative Performance: ${track.relativeVelocity.toFixed(2)}x artist average (Recent: ${track.recentRelativeVelocity.toFixed(2)}x)`);
      console.log(`   Pure Velocity Score: ${track.pureVelocityScore.toFixed(1)}`);
      console.log(`   Minimal Velocity Score: ${track.minimalVelocityScore.toFixed(1)}`);
      console.log(`   Aggressive Decay Factor: ${track.aggressiveDecayFactor.toFixed(4)}`);
      console.log(`   Aggressive Score: ${track.aggressiveVelocityScore.toFixed(1)}`);
      
      // Calculate and show ranks from all three models
      const ranks = {
        full: metrics.sort((a, b) => b.decayedScore - a.decayedScore)
          .findIndex(m => m.id === track.id) + 1,
        focused: metrics.sort((a, b) => b.focusedScore - a.focusedScore)
          .findIndex(m => m.id === track.id) + 1,
        velocity: metrics.sort((a, b) => b.pureVelocityScore - a.pureVelocityScore)
          .findIndex(m => m.id === track.id) + 1,
        minimal: metrics.sort((a, b) => b.minimalVelocityScore - a.minimalVelocityScore)
          .findIndex(m => m.id === track.id) + 1,
        aggressive: metrics.sort((a, b) => b.aggressiveVelocityScore - a.aggressiveVelocityScore)
          .findIndex(m => m.id === track.id) + 1
      };
      
      console.log(`   Model Ranks: Full(${ranks.full}) | Focused(${ranks.focused}) | Velocity(${ranks.velocity}) | Minimal(${ranks.minimal}) | Aggressive(${ranks.aggressive}) | Actual(${track.rank})`);
    });

    return metrics;
  } catch (error) {
    console.error('Error collecting metrics:', error);
    throw error;
  }
}

// Update correlation analysis to include new metrics
function analyzeTrendingCorrelation(metrics: ExtendedTrendingMetrics[]) {
  const correlations = {
    // Raw Metrics
    plays: calculateCorrelation(metrics.map(m => m.rank), metrics.map(m => m.plays)),
    favorites: calculateCorrelation(metrics.map(m => m.rank), metrics.map(m => m.favorites)),
    reposts: calculateCorrelation(metrics.map(m => m.rank), metrics.map(m => m.reposts)),
    
    // Overall Velocity
    playsPerDay: calculateCorrelation(metrics.map(m => m.rank), metrics.map(m => m.playsPerDay)),
    favoritesPerDay: calculateCorrelation(metrics.map(m => m.rank), metrics.map(m => m.favoritesPerDay)),
    repostsPerDay: calculateCorrelation(metrics.map(m => m.rank), metrics.map(m => m.repostsPerDay)),
    
    // Recent Velocity
    recentPlaysVelocity: calculateCorrelation(metrics.map(m => m.rank), metrics.map(m => m.recentPlaysVelocity)),
    recentFavoritesVelocity: calculateCorrelation(metrics.map(m => m.rank), metrics.map(m => m.recentFavoritesVelocity)),
    recentRepostsVelocity: calculateCorrelation(metrics.map(m => m.rank), metrics.map(m => m.recentRepostsVelocity)),
    
    // Other Metrics
    engagementIndex: calculateCorrelation(metrics.map(m => m.rank), metrics.map(m => m.engagementIndex)),
    decayedScore: calculateCorrelation(metrics.map(m => m.rank), metrics.map(m => m.decayedScore)),
    timeDecayFactor: calculateCorrelation(metrics.map(m => m.rank), metrics.map(m => m.timeDecayFactor)),
    playlistCount: calculateCorrelation(metrics.map(m => m.rank), metrics.map(m => m.playlistCount)),
    
    // New velocity metrics
    playlistsPerDay: calculateCorrelation(metrics.map(m => m.rank), metrics.map(m => m.playlistsPerDay)),
    recentPlaylistVelocity: calculateCorrelation(metrics.map(m => m.rank), metrics.map(m => m.recentPlaylistVelocity)),
    crossEngagementPerDay: calculateCorrelation(metrics.map(m => m.rank), metrics.map(m => m.crossEngagementPerDay)),
    recentCrossEngagement: calculateCorrelation(metrics.map(m => m.rank), metrics.map(m => m.recentCrossEngagement)),
    relativeVelocity: calculateCorrelation(metrics.map(m => m.rank), metrics.map(m => m.relativeVelocity)),
    recentRelativeVelocity: calculateCorrelation(metrics.map(m => m.rank), metrics.map(m => m.recentRelativeVelocity)),
    pureVelocityScore: calculateCorrelation(metrics.map(m => m.rank), metrics.map(m => m.pureVelocityScore))
  };

  // Print correlation analysis
  console.log('\nCorrelation Analysis with Trending Rank:');
  
  console.log('\nRaw Metrics:');
  ['plays', 'favorites', 'reposts'].forEach(metric => {
    const correlation = correlations[metric as keyof typeof correlations];
    const influence = -correlation;
    const strength = Math.abs(influence);
    const direction = influence > 0 ? 'positive' : 'negative';
    console.log(`${metric.padEnd(15)} | correlation: ${correlation.toFixed(4)} | ${direction} influence | strength: ${(strength * 100).toFixed(1)}%`);
  });

  console.log('\nOverall Velocity:');
  ['playsPerDay', 'favoritesPerDay', 'repostsPerDay'].forEach(metric => {
    const correlation = correlations[metric as keyof typeof correlations];
    const influence = -correlation;
    const strength = Math.abs(influence);
    const direction = influence > 0 ? 'positive' : 'negative';
    console.log(`${metric.padEnd(15)} | correlation: ${correlation.toFixed(4)} | ${direction} influence | strength: ${(strength * 100).toFixed(1)}%`);
  });

  console.log('\nRecent Velocity:');
  ['recentPlaysVelocity', 'recentFavoritesVelocity', 'recentRepostsVelocity'].forEach(metric => {
    const correlation = correlations[metric as keyof typeof correlations];
    const influence = -correlation;
    const strength = Math.abs(influence);
    const direction = influence > 0 ? 'positive' : 'negative';
    console.log(`${metric.padEnd(20)} | correlation: ${correlation.toFixed(4)} | ${direction} influence | strength: ${(strength * 100).toFixed(1)}%`);
  });

  console.log('\nOther Metrics:');
  ['engagementIndex', 'decayedScore', 'timeDecayFactor', 'playlistCount'].forEach(metric => {
    const correlation = correlations[metric as keyof typeof correlations];
    const influence = -correlation;
    const strength = Math.abs(influence);
    const direction = influence > 0 ? 'positive' : 'negative';
    console.log(`${metric.padEnd(15)} | correlation: ${correlation.toFixed(4)} | ${direction} influence | strength: ${(strength * 100).toFixed(1)}%`);
  });

  console.log('\nNew Velocity Metrics:');
  [
    'playlistsPerDay',
    'recentPlaylistVelocity',
    'crossEngagementPerDay',
    'recentCrossEngagement',
    'relativeVelocity',
    'recentRelativeVelocity',
    'pureVelocityScore'
  ].forEach(metric => {
    const correlation = correlations[metric as keyof typeof correlations];
    const influence = -correlation;
    const strength = Math.abs(influence);
    const direction = influence > 0 ? 'positive' : 'negative';
    console.log(`${metric.padEnd(20)} | correlation: ${correlation.toFixed(4)} | ${direction} influence | strength: ${(strength * 100).toFixed(1)}%`);
  });

  return correlations;
}

function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const sum1 = sum(x);
  const sum2 = sum(y);
  const sum1Sq = sum(x.map(x => x * x));
  const sum2Sq = sum(y.map(y => y * y));
  const pSum = sum(x.map((x, i) => x * y[i]));
  const num = pSum - (sum1 * sum2 / n);
  const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));
  return num / den;
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

// Update performMultipleRegression function signature
function performMultipleRegression(metrics: ExtendedTrendingMetrics[]) {
  // Prepare matrices
  const X = metrics.map(m => [m.plays, m.favorites, m.reposts]); // Features
  const y = metrics.map(m => m.rank);                            // Target (rank)
  
  // Add intercept term
  const X_b = X.map(row => [1, ...row]);
  
  // Calculate weights using Normal Equation: w = (X^T * X)^(-1) * X^T * y
  const X_t = transpose(X_b);
  const X_t_X = matrixMultiply(X_t, X_b);
  const X_t_X_inv = inverse(X_t_X);
  const X_t_y = matrixMultiply(X_t, y.map(val => [val]));
  const weights = matrixMultiply(X_t_X_inv, X_t_y);

  return {
    intercept: weights[0][0],
    playWeight: weights[1][0],
    favoriteWeight: weights[2][0],
    repostWeight: weights[3][0]
  };
}

// Matrix operations
function transpose(matrix: number[][]): number[][] {
  return matrix[0].map((_, i) => matrix.map(row => row[i]));
}

function matrixMultiply(a: number[][], b: number[][]): number[][] {
  return a.map(row => 
    transpose(b).map(col => 
      row.reduce((sum, val, i) => sum + val * col[i], 0)
    )
  );
}

function inverse(matrix: number[][]): number[][] {
  // Implement matrix inversion (e.g., using Gaussian elimination)
  // For now, use a numerical library or implement a basic version
  return matrix; // Placeholder
}

// Update calculateRSquared function signature if it's used with our metrics
function calculateRSquared(actual: number[], predicted: number[]): number {
  const mean = actual.reduce((a, b) => a + b) / actual.length;
  const totalSS = actual.reduce((ss, val) => ss + Math.pow(val - mean, 2), 0);
  const residualSS = actual.reduce((ss, val, i) => ss + Math.pow(val - predicted[i], 2), 0);
  return 1 - (residualSS / totalSS);
}

interface ModelComparison {
  title: string;
  actualRank: number;
  ranks: {
    full: number;
    focused: number;
    minimal: number;
    aggressive: number;
  };
  differences: {
    fullVsFocused: number;
    fullVsMinimal: number;
    focusedVsMinimal: number;
    fullVsAggressive: number;
    focusedVsAggressive: number;
    minimalVsAggressive: number;
    actualVsFull: number;
    actualVsFocused: number;
    actualVsMinimal: number;
    actualVsAggressive: number;
  };
}

function compareModels(metrics: ExtendedTrendingMetrics[]) {
  // Calculate rank differences for all models
  const modelComparison = metrics.map(track => {
    const ranks = {
      full: metrics.sort((a, b) => b.decayedScore - a.decayedScore)
        .findIndex(m => m.id === track.id) + 1,
      focused: metrics.sort((a, b) => b.focusedScore - a.focusedScore)
        .findIndex(m => m.id === track.id) + 1,
      minimal: metrics.sort((a, b) => b.minimalVelocityScore - a.minimalVelocityScore)
        .findIndex(m => m.id === track.id) + 1,
      aggressive: metrics.sort((a, b) => b.aggressiveVelocityScore - a.aggressiveVelocityScore)
        .findIndex(m => m.id === track.id) + 1
    };

    const differences = {
      fullVsFocused: Math.abs(ranks.full - ranks.focused),
      fullVsMinimal: Math.abs(ranks.full - ranks.minimal),
      focusedVsMinimal: Math.abs(ranks.focused - ranks.minimal),
      fullVsAggressive: Math.abs(ranks.full - ranks.aggressive),
      focusedVsAggressive: Math.abs(ranks.focused - ranks.aggressive),
      minimalVsAggressive: Math.abs(ranks.minimal - ranks.aggressive),
      actualVsFull: Math.abs(track.rank - ranks.full),
      actualVsFocused: Math.abs(track.rank - ranks.focused),
      actualVsMinimal: Math.abs(track.rank - ranks.minimal),
      actualVsAggressive: Math.abs(track.rank - ranks.aggressive)
    };

    return {
      title: track.title,
      actualRank: track.rank,
      ranks,
      differences
    } as ModelComparison;
  });

  // Calculate average differences between models
  const avgDifferences = {
    fullVsFocused: average(modelComparison.map(m => m.differences.fullVsFocused)),
    fullVsMinimal: average(modelComparison.map(m => m.differences.fullVsMinimal)),
    focusedVsMinimal: average(modelComparison.map(m => m.differences.focusedVsMinimal)),
    fullVsAggressive: average(modelComparison.map(m => m.differences.fullVsAggressive)),
    focusedVsAggressive: average(modelComparison.map(m => m.differences.focusedVsAggressive)),
    minimalVsAggressive: average(modelComparison.map(m => m.differences.minimalVsAggressive)),
    actualVsFull: average(modelComparison.map(m => m.differences.actualVsFull)),
    actualVsFocused: average(modelComparison.map(m => m.differences.actualVsFocused)),
    actualVsMinimal: average(modelComparison.map(m => m.differences.actualVsMinimal)),
    actualVsAggressive: average(modelComparison.map(m => m.differences.actualVsAggressive))
  };

  // Print model stats and differences
  console.log('\nModel-to-Model Comparison:');
  console.log('\nAverage Rank Differences Between Models:');
  Object.entries(avgDifferences).forEach(([key, value]) => {
    console.log(`   ${key}: ${value.toFixed(1)} ranks`);
  });

  // Find tracks where models disagree most
  console.log('\nLargest Model Disagreements:');
  const largestDisagreements = modelComparison
    .sort((a, b) => {
      const maxDiffA = Math.max(
        ...Object.values(a.differences)
      );
      const maxDiffB = Math.max(
        ...Object.values(b.differences)
      );
      return maxDiffB - maxDiffA;
    })
    .slice(0, 5);

  largestDisagreements.forEach(track => {
    console.log(`\n"${track.title}"`);
    console.log(`   Actual Rank: ${track.actualRank}`);
    console.log(`   Full Model: ${track.ranks.full}`);
    console.log(`   Focused Model: ${track.ranks.focused}`);
    console.log(`   Minimal Model: ${track.ranks.minimal}`);
    console.log(`   Aggressive Model: ${track.ranks.aggressive}`);
    console.log(`   Largest Disagreement: ${Math.max(...Object.values(track.differences))} ranks`);
  });

  // Calculate model accuracy metrics
  const fullModelStats = {
    avgDiff: average(modelComparison.map(m => m.differences.fullVsFocused)),
    maxDiff: Math.max(...modelComparison.map(m => m.differences.fullVsFocused)),
    exactMatches: modelComparison.filter(m => m.differences.fullVsFocused === 0).length,
    within5: modelComparison.filter(m => m.differences.fullVsFocused <= 5).length,
    within10: modelComparison.filter(m => m.differences.fullVsFocused <= 10).length
  };

  const focusedModelStats = {
    avgDiff: average(modelComparison.map(m => m.differences.focusedVsMinimal)),
    maxDiff: Math.max(...modelComparison.map(m => m.differences.focusedVsMinimal)),
    exactMatches: modelComparison.filter(m => m.differences.focusedVsMinimal === 0).length,
    within5: modelComparison.filter(m => m.differences.focusedVsMinimal <= 5).length,
    within10: modelComparison.filter(m => m.differences.focusedVsMinimal <= 10).length
  };

  // Print comparison
  console.log('\nModel Comparison (All 100 Tracks):');
  console.log('\nFull Model Stats:');
  console.log(`   Average Rank Difference: ${fullModelStats.avgDiff.toFixed(1)}`);
  console.log(`   Maximum Rank Difference: ${fullModelStats.maxDiff}`);
  console.log(`   Exact Rank Matches: ${fullModelStats.exactMatches}`);
  console.log(`   Predictions Within 5 Ranks: ${fullModelStats.within5}`);
  console.log(`   Predictions Within 10 Ranks: ${fullModelStats.within10}`);

  console.log('\nFocused Model Stats:');
  console.log(`   Average Rank Difference: ${focusedModelStats.avgDiff.toFixed(1)}`);
  console.log(`   Maximum Rank Difference: ${focusedModelStats.maxDiff}`);
  console.log(`   Exact Rank Matches: ${focusedModelStats.exactMatches}`);
  console.log(`   Predictions Within 5 Ranks: ${focusedModelStats.within5}`);
  console.log(`   Predictions Within 10 Ranks: ${focusedModelStats.within10}`);

  // Add minimal model stats
  const minimalModelStats = {
    avgDiff: average(modelComparison.map(m => m.differences.minimalVsAggressive)),
    maxDiff: Math.max(...modelComparison.map(m => m.differences.minimalVsAggressive)),
    exactMatches: modelComparison.filter(m => m.differences.minimalVsAggressive === 0).length,
    within5: modelComparison.filter(m => m.differences.minimalVsAggressive <= 5).length,
    within10: modelComparison.filter(m => m.differences.minimalVsAggressive <= 10).length
  };

  // Update comparison output
  console.log('\nMinimal Model Stats:');
  console.log(`   Average Rank Difference: ${minimalModelStats.avgDiff.toFixed(1)}`);
  console.log(`   Maximum Rank Difference: ${minimalModelStats.maxDiff}`);
  console.log(`   Exact Rank Matches: ${minimalModelStats.exactMatches}`);
  console.log(`   Predictions Within 5 Ranks: ${minimalModelStats.within5}`);
  console.log(`   Predictions Within 10 Ranks: ${minimalModelStats.within10}`);

  // Add aggressive model stats
  const aggressiveModelStats = {
    avgDiff: average(modelComparison.map(m => m.differences.actualVsAggressive)),
    maxDiff: Math.max(...modelComparison.map(m => m.differences.actualVsAggressive)),
    exactMatches: modelComparison.filter(m => m.differences.actualVsAggressive === 0).length,
    within5: modelComparison.filter(m => m.differences.actualVsAggressive <= 5).length,
    within10: modelComparison.filter(m => m.differences.actualVsAggressive <= 10).length
  };

  // Print aggressive model stats
  console.log('\nAggressive Model Stats:');
  console.log(`   Average Rank Difference: ${aggressiveModelStats.avgDiff.toFixed(1)}`);
  console.log(`   Maximum Rank Difference: ${aggressiveModelStats.maxDiff}`);
  console.log(`   Exact Rank Matches: ${aggressiveModelStats.exactMatches}`);
  console.log(`   Predictions Within 5 Ranks: ${aggressiveModelStats.within5}`);
  console.log(`   Predictions Within 10 Ranks: ${aggressiveModelStats.within10}`);

  return {
    fullModelStats,
    focusedModelStats,
    minimalModelStats,
    aggressiveModelStats,
    modelComparison,
    avgDifferences
  };
}

function average(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calculatePureVelocityMetrics(track: any): VelocityMetrics {
  const releaseDate = new Date(track.release_date + 'Z');
  const now = new Date(Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
    new Date().getUTCHours(),
    new Date().getUTCMinutes(),
    new Date().getUTCSeconds()
  ));
  
  const daysOld = Math.max(0.001, (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24));
  const recentDays = Math.min(7, daysOld);
  const recentWeight = 1.5;
  
  // Basic velocity metrics
  const playsPerDay = track.play_count / daysOld;
  const favoritesPerDay = track.favorite_count / daysOld;
  const repostsPerDay = track.repost_count / daysOld;
  
  const recentPlaysVelocity = (track.play_count * recentWeight) / recentDays;
  const recentFavoritesVelocity = (track.favorite_count * recentWeight) / recentDays;
  const recentRepostsVelocity = (track.repost_count * recentWeight) / recentDays;
  
  // Playlist velocity
  const playlistCount = track.playlists_containing_track?.length || 0;
  const playlistsPerDay = playlistCount / daysOld;
  const recentPlaylistVelocity = (playlistCount * recentWeight) / recentDays;
  
  // Cross-engagement velocity
  const artistFollowers = track.user.follower_count || 1;
  const totalEngagements = track.favorite_count + track.repost_count;
  const crossEngagementRate = totalEngagements / artistFollowers;
  const crossEngagementPerDay = crossEngagementRate / daysOld;
  const recentCrossEngagement = (crossEngagementRate * recentWeight) / recentDays;
  
  // Relative velocity (compared to artist's average)
  const artistTrackCount = track.user.track_count || 1;
  const artistTotalPlays = track.user.total_play_count || 0;
  const artistAveragePlays = artistTotalPlays / artistTrackCount;
  const relativePerformance = track.play_count / Math.max(1, artistAveragePlays);
  const relativeVelocity = relativePerformance / daysOld;
  const recentRelativeVelocity = (relativePerformance * recentWeight) / recentDays;
  
  // Time decay (binary: 1.0 for ≤7 days, 0.7 for >7 days)
  const timeDecayFactor = daysOld <= 7 ? 1.0 : 0.7;
  
  // Calculate pure velocity score
  const velocityScore = (
    // Basic velocity (weighted by correlation strengths)
    (playsPerDay * 0.66) +
    (favoritesPerDay * 0.44) +
    (repostsPerDay * 0.41) +
    
    // Recent velocity (weighted by correlation strengths)
    (recentPlaysVelocity * 0.59) +
    (recentFavoritesVelocity * 0.42) +
    (recentRepostsVelocity * 0.40) +
    
    // Playlist velocity
    (playlistsPerDay * 0.35) +
    (recentPlaylistVelocity * 0.40) +
    
    // Cross-engagement velocity
    (crossEngagementPerDay * 0.30) +
    (recentCrossEngagement * 0.35) +
    
    // Relative velocity
    (relativeVelocity * 0.25) +
    (recentRelativeVelocity * 0.30)
  ) * timeDecayFactor;
  
  return {
    playsPerDay,
    favoritesPerDay,
    repostsPerDay,
    recentPlaysVelocity,
    recentFavoritesVelocity,
    recentRepostsVelocity,
    playlistsPerDay,
    recentPlaylistVelocity,
    crossEngagementPerDay,
    recentCrossEngagement,
    relativeVelocity,
    recentRelativeVelocity,
    timeDecayFactor,
    velocityScore
  };
}

function calculateMinimalVelocityMetrics(track: any): MinimalVelocityMetrics {
  const releaseDate = new Date(track.release_date + 'Z');
  const now = new Date(Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
    new Date().getUTCHours(),
    new Date().getUTCMinutes(),
    new Date().getUTCSeconds()
  ));
  
  const daysOld = Math.max(0.001, (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate basic metrics
  const playsPerDay = track.play_count / daysOld;
  
  // Get pure velocity score from existing calculation
  const pureVelocityMetrics = calculatePureVelocityMetrics(track);
  
  const timeDecayFactor = calculateTimeDecayFactor(daysOld);
  
  // Increase weight of time decay in the score
  const minimalVelocityScore = (
    (playsPerDay * 0.66) + 
    (pureVelocityMetrics.velocityScore * 0.68)
  ) * Math.pow(timeDecayFactor, 1.5); // Amplify decay effect
  
  return {
    playsPerDay,
    pureVelocityScore: pureVelocityMetrics.velocityScore,
    minimalVelocityScore,
    timeDecayFactor
  };
}

function calculateTimeDecayFactor(daysOld: number): number {
  const INITIAL_WINDOW = 7;  // Initial fresh period
  const BASE_DECAY = 0.7;    // Initial decay at 7 days
  const DAILY_DECAY = 0.98;  // Additional 2% decay per day after 7 days
  
  if (daysOld <= INITIAL_WINDOW) {
    return 1.0;
  }
  
  // Calculate additional decay for each day past the initial window
  const extraDays = daysOld - INITIAL_WINDOW;
  const additionalDecay = Math.pow(DAILY_DECAY, extraDays);
  
  return BASE_DECAY * additionalDecay;
}

interface CompositeScore {
  score: number;
  correlation: number;
  components: string[];
  weights: number[];
}

function testCompositeMetrics(metrics: ExtendedTrendingMetrics[]): CompositeScore[] {
  // Define our candidate metrics
  const candidates = [
    { name: 'playsPerDay', value: (m: ExtendedTrendingMetrics) => m.playsPerDay, weight: 0.664 },
    { name: 'pureVelocityScore', value: (m: ExtendedTrendingMetrics) => m.pureVelocityScore, weight: 0.679 },
    { name: 'relativeVelocity', value: (m: ExtendedTrendingMetrics) => m.relativeVelocity, weight: 0.664 },
    { name: 'recentPlaysVelocity', value: (m: ExtendedTrendingMetrics) => m.recentPlaysVelocity, weight: 0.587 },
    { name: 'decayedScore', value: (m: ExtendedTrendingMetrics) => m.decayedScore, weight: 0.514 }
  ];

  const compositeScores: CompositeScore[] = [];

  // Test all 2 and 3 metric combinations
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      // Test pair combination
      const pairScore = calculateCompositeScore(metrics, [candidates[i], candidates[j]]);
      compositeScores.push(pairScore);

      // Test triple combinations
      for (let k = j + 1; k < candidates.length; k++) {
        const tripleScore = calculateCompositeScore(metrics, [candidates[i], candidates[j], candidates[k]]);
        compositeScores.push(tripleScore);
      }
    }
  }

  // Sort by correlation strength
  return compositeScores.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

function calculateCompositeScore(
  metrics: ExtendedTrendingMetrics[], 
  components: Array<{name: string, value: (m: ExtendedTrendingMetrics) => number, weight: number}>
): CompositeScore {
  // Calculate normalized weights
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const normalizedWeights = components.map(c => c.weight / totalWeight);

  // Calculate composite scores for each track
  const scores = metrics.map(metric => {
    return components.reduce((score, component, idx) => {
      const value = component.value(metric);
      // Normalize the value relative to the maximum for this component
      const maxValue = Math.max(...metrics.map(m => component.value(m)));
      const normalizedValue = value / maxValue;
      return score + (normalizedValue * normalizedWeights[idx]);
    }, 0);
  });

  // Calculate correlation with rank
  const correlation = calculateCorrelation(
    metrics.map(m => m.rank),
    scores
  );

  return {
    score: Math.abs(correlation),
    correlation,
    components: components.map(c => c.name),
    weights: normalizedWeights
  };
}

function calculateAggressiveDecay(daysOld: number): number {
  const INITIAL_WINDOW = 7;     // Fresh period
  const BASE_DECAY = 0.7;       // Initial 30% decay at 7 days
  const DAILY_DECAY = 0.75;     // Aggressive 25% compound daily decay
  const DECAY_POWER = 3.0;      // More aggressive exponential scaling
  const TERMINAL_THRESHOLD = 14; // Effective death point
  
  if (daysOld <= INITIAL_WINDOW) {
    return 1.0;  // Fresh tracks get full weight
  }
  
  if (daysOld >= TERMINAL_THRESHOLD) {
    return 0.0001;  // Effectively zero after 14 days
  }
  
  // Calculate aggressive compound decay between 7-14 days
  const extraDays = daysOld - INITIAL_WINDOW;
  const compoundDecay = Math.pow(DAILY_DECAY, extraDays);
  const scaledDecay = Math.pow(BASE_DECAY * compoundDecay, DECAY_POWER);
  
  // Add terminal approach factor
  const terminalFactor = Math.pow(
    (TERMINAL_THRESHOLD - daysOld) / (TERMINAL_THRESHOLD - INITIAL_WINDOW),
    3  // Cubic scaling for sharper terminal approach
  );
  
  return Math.max(0.0001, scaledDecay * terminalFactor);
}

function calculateAggressiveVelocityScore(track: any): AggressiveVelocityMetrics {
  const releaseDate = new Date(track.release_date + 'Z');
  const now = new Date(Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
    new Date().getUTCHours(),
    new Date().getUTCMinutes(),
    new Date().getUTCSeconds()
  ));
  
  const daysOld = Math.max(0.001, (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate core metrics
  const playsPerDay = track.play_count / daysOld;
  const artistAvgPlays = (track.user.total_play_count || 1) / Math.max(1, track.user.track_count);
  const relativeVelocity = playsPerDay / Math.max(1, artistAvgPlays);
  
  // Get pure velocity score
  const pureVelocityMetrics = calculatePureVelocityMetrics(track);
  
  // Calculate aggressive decay
  const decayFactor = calculateAggressiveDecay(daysOld);
  
  // Normalize metrics to similar scales
  const normalizedComponents = {
    playsPerDay: playsPerDay / 1000,          // Assuming most tracks get < 1000 plays/day
    relativeVelocity: relativeVelocity / 10,   // Normalize relative performance
    pureVelocityScore: pureVelocityMetrics.velocityScore / 1000
  };
  
  // Calculate raw score (before decay)
  const rawScore = (
    (normalizedComponents.playsPerDay * 0.664) +     // Weight by correlation
    (normalizedComponents.relativeVelocity * 0.664) + // Equal weight for relative velocity
    (normalizedComponents.pureVelocityScore * 0.679)  // Slightly higher weight for pure velocity
  );
  
  // Apply aggressive decay
  const velocityScore = rawScore * decayFactor;
  
  return {
    velocityScore,
    decayFactor,
    rawScore,
    components: {
      playsPerDay,
      relativeVelocity,
      pureVelocityScore: pureVelocityMetrics.velocityScore
    }
  };
}

// Direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      console.log('\n=== Audius Trending Analysis ===\n');
      console.log('Collecting metrics for top 100 trending tracks...\n');
      
      const metrics = await collectTrendingMetrics(100);
      
      // Make sure we call analyzeTrendingCorrelation and print its results
      const correlations = analyzeTrendingCorrelation(metrics);
      
      const comparison = compareModels(metrics);
      
      // Save all analysis results
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `trending_metrics_${timestamp}.json`;
      
      await fs.writeFile(
        filename, 
        JSON.stringify({ 
          metrics, 
          correlations, 
          modelComparison: comparison 
        }, null, 2)
      );
      
      console.log(`\nRaw data saved to ${filename}`);
      
      console.log('\nTesting Composite Metrics:');
      const compositeScores = testCompositeMetrics(metrics);
      
      console.log('\nTop 5 Composite Metrics:');
      compositeScores.slice(0, 5).forEach((score, idx) => {
        console.log(`\n${idx + 1}. Correlation: ${Math.abs(score.correlation).toFixed(4)} (${score.correlation < 0 ? 'positive' : 'negative'} influence)`);
        console.log('Components:');
        score.components.forEach((component, i) => {
          console.log(`   ${component}: ${(score.weights[i] * 100).toFixed(1)}%`);
        });
      });
    } catch (error) {
      console.error('\nAnalysis failed:', error);
      process.exit(1);
    }
  })();
} 