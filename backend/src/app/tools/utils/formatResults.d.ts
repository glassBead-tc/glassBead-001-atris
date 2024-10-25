declare function formatTrackResults(response: any, originalQuery: string): string;
declare function formatApiResults(response: any, apiName: string): string;
declare function formatSearchTracks(tracks: any[], query: string): string;
declare function formatUserInfo(data: any, query: string): string;
declare function formatPlaylistInfo(data: any[], query: string, fullPlaylistDetails?: any): string;
declare function formatTrendingTracks(tracks: any[]): string;
declare function formatTrendingPlaylists(data: any[]): string;
declare function formatDetailedTrackInfo(tracks: any[]): string;
declare function formatMultipleTracks(tracks: any[]): string;
declare function formatPlaylistResults(playlists: any[]): string;
declare function formatUserResults(users: any[]): string;
declare function formatTrendingResults(trending: any[], type: 'tracks' | 'playlists'): string;
declare function formatDuration(durationInSeconds: number): string;
/**
 * Formats genre popularity data into a readable string.
 * @param genrePopularity - Record mapping genres to points.
 * @param limit - Number of top genres to include.
 * @returns A formatted string listing the top genres.
 */
declare function formatGenrePopularity(genrePopularity: Record<string, number>, limit: number): string;
export { formatTrackResults, formatApiResults, formatSearchTracks, formatUserInfo, formatPlaylistInfo, formatTrendingTracks, formatTrendingPlaylists, formatDetailedTrackInfo, formatMultipleTracks, formatPlaylistResults, formatUserResults, formatTrendingResults, formatDuration, formatGenrePopularity };
