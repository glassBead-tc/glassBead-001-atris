import { logger } from '../logger.js';

export function formatTrackResults(response: any, originalQuery: string): string {
    if (!response || !response.data || !response.data.data || !Array.isArray(response.data.data)) {
      return "Unable to find information about the requested track.";
    }
  
    const trackNameMatch = originalQuery.match(/'([^']+)'/);
    const searchedTrackName = trackNameMatch ? trackNameMatch[1].toLowerCase() : '';
  
    const exactMatch = response.data.data.find((track: any) => 
      track.title.toLowerCase() === searchedTrackName
    );
  
    if (exactMatch) {
      const artist = exactMatch.user.name || exactMatch.user.handle || "Unknown Artist";
      if (originalQuery.toLowerCase().includes("who is the artist") || originalQuery.toLowerCase().includes("who performed")) {
        return `The artist who performed the track '${searchedTrackName}' is ${artist}.`;
      } else {
        return `Track: '${exactMatch.title}' by ${artist}. Plays: ${exactMatch.play_count || 'Unknown'}`;
      }
    } else {
      // If no exact match, return information about the top result
      const topResult = response.data.data[0];
      if (topResult) {
        const artist = topResult.user.name || topResult.user.handle || "Unknown Artist";
        return `I couldn't find an exact match for '${searchedTrackName}', but the top result is "${topResult.title}" by ${artist}.`;
      } else {
        return `Unable to find any tracks matching '${searchedTrackName}'.`;
      }
    }
  } 
  
export function formatApiResults(response: any, apiName: string): string {
    if (!response || !response.data) {
      return "Unable to find the requested information.";
    }
  
    try {
      switch (apiName) {
        case "Get Trending Tracks":
          return formatTrendingResults(response.data, 'tracks');
        case "Get Trending Playlists":
          return formatTrendingResults(response.data, 'playlists');
        case "Search Tracks":
          return formatMultipleTracks(response.data);
        case "Get Track":
          return formatDetailedTrackInfo(response.data);
        case "Get User":
        case "Search Users":
          return formatUserResults(response.data);
        case "Get Playlist":
        case "Search Playlists":
          return formatPlaylistResults(response.data);
        default:
          return "Unsupported API response format.";
      }
    } catch (error) {
      logger.error("Error in formatApiResults:", error);
      return "An error occurred while processing the API response.";
    }
}

export function formatSearchTracks(tracks: any[], query: string): string {
  const [trackName, artistName] = query.split(' by ').map(s => s.trim());

  const filteredTracks = tracks.filter(track => {
    const titleMatch = track.title.toLowerCase().includes(trackName.toLowerCase());
    const artistMatch = artistName ? track.user.name.toLowerCase().includes(artistName.toLowerCase()) : true;
    return titleMatch && artistMatch;
  });

  if (filteredTracks.length === 0) {
    return `No tracks found matching "${query}".`;
  }

  const trackInfo = filteredTracks.map(track => 
    `"${track.title}" by ${track.user.name} (Genre: ${track.genre || 'Unknown'}, ${track.play_count} plays)`
  ).join(', ');

  return `Here are the tracks matching "${query}": ${trackInfo}`;
}
  
export function formatUserInfo(data: any, query: string): string {
    // Ensure data is always an array
    const users = Array.isArray(data) ? data : [data];
  
    if (!users || users.length === 0) {
      return `No users found matching "${query}"`;
    }
  
    const formatUser = (user: any) => `
      User Information:
      Name: ${user.name || 'Unknown'}
      Handle: @${user.handle || 'Unknown'}
      Followers: ${user.follower_count || 'Unknown'}
      Following: ${user.followee_count || 'Unknown'}
      Tracks: ${user.track_count || 'Unknown'}
      ${user.bio ? `Bio: ${user.bio}` : ''}
    `;
  
    // If there's only one user, return detailed information
    if (users.length === 1) {
      return formatUser(users[0]);
    }
  
    // If there are multiple users, return a summary
    return `Found ${users.length} users:\n${users.slice(0, 5).map(user => 
      `- ${user.name || user.handle || 'Unknown'} (@${user.handle || 'Unknown'})`
    ).join('\n')}`;
} 
  
export function formatPlaylistInfo(data: any[], query: string, fullPlaylistDetails?: any): string {
    if (!data || data.length === 0) {
      return `No playlists found matching "${query}"`;
    }
  
    const playlist = fullPlaylistDetails || data[0];
    let topTracks = 'No tracks available';
  
    if (playlist.tracks && Array.isArray(playlist.tracks)) {
      topTracks = playlist.tracks.slice(0, 5).map((track: any) => 
        `"${track.title}" by ${track.user?.name || 'Unknown Artist'}`
      ).join(', ');
    }
  
    return `
      Playlist Information:
      Name: ${playlist.playlist_name || 'Unknown'}
      Created by: ${playlist.user?.name || 'Unknown'}
      Tracks: ${playlist.track_count || 'Unknown'}
      Followers: ${playlist.follower_count || 'Unknown'}
      Description: ${playlist.description || 'No description available'}
      Top 5 Tracks: ${topTracks}
    `;
}
  
export function formatTrendingTracks(tracks: any[]): string {
    return tracks.map((track, index) => 
      `${index + 1}. "${track.title}" by ${track.user.name}`
    ).join('\n');
}

export function formatTrendingPlaylists(data: any[]): string {
    const playlists = data.slice(0, 5);
    const playlistList = playlists.map((playlist: any) => `"${playlist.playlist_name}" by ${playlist.user.name}`).join(', ');
    const playlistTracklist = playlists.map((playlist: any) => {
      const trackCount = Math.min(playlist.track_count, 3);
      return `"${playlist.playlist_name}" by ${playlist.user.name} with ${trackCount} tracks`;
    }).join(', ');
    return `The top trending playlists on Audius right now are: ${playlistList}. Here are the tracks on each: ${playlistTracklist}`;
}

export function formatDetailedTrackInfo(tracks: any[]): string {
  return tracks.map((track, index) => 
    `${index + 1}. "${track.title}" by ${track.user.name}\n` +
    `   Genre: ${track.genre || 'Unknown'}\n` +
    `   Plays: ${track.play_count}\n` +
    `   Duration: ${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}`
  ).join('\n\n');
}

export function formatMultipleTracks(tracks: any[]): string {
  return tracks.map((track, index) => 
    `${index + 1}. "${track.title}" by ${track.user.name} (${track.play_count || 'Unknown'} plays)`
  ).join('\n');
}

export function formatPlaylistResults(playlists: any[]): string {
  return playlists.map((playlist, index) => 
    `${index + 1}. "${playlist.playlist_name}" by ${playlist.user.name} (${playlist.total_play_count} plays)`
  ).join('\n');
}

export function formatUserResults(users: any[]): string {
  return users.map((user, index) => 
    `${index + 1}. ${user.name} (@${user.handle}) - ${user.follower_count} followers, ${user.track_count} tracks`
  ).join('\n');
}

export function formatTrendingResults(trending: any[], type: 'tracks' | 'playlists'): string {
  const formattedList = trending.slice(0, 5).map((item, index) => {
    if (type === 'tracks') {
      return `${index + 1}. "${item.title}" by ${item.user.name} (${item.play_count} plays)`;
    } else {
      return `${index + 1}. "${item.playlist_name}" by ${item.user.name} (${item.favorite_count} favorites)`;
    }
  }).join('\n');

  return `Top 5 Trending ${type.charAt(0).toUpperCase() + type.slice(1)}:\n${formattedList}`;
}

function formatDuration(durationInSeconds: number): string {
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = durationInSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
