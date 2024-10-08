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
  
  // Add this new function to format API results
  export function formatApiResults(response: any, originalQuery: string, apiName: string): string {
    if (!response || !response.data) {
      return "Unable to find the requested information.";
    }
  
    const ensureArray = (data: any) => Array.isArray(data) ? data : [data];
  
    try {
      switch (apiName) {
        case "Get Trending Tracks":
        case "Search Tracks":
          return formatTrackResults(response, originalQuery);
  
        case "Get Track":
          const trackData = ensureArray(response.data);
          if (trackData.length === 0) {
            return "No track information found.";
          }
          const track = trackData[0];
          return `Track Information:
            Title: ${track.title || 'Unknown'}
            Artist: ${track.user?.name || 'Unknown'}
            Genre: ${track.genre || 'Unknown'}
            Plays: ${track.play_count || 'Unknown'}`;
  
        case "Get User":
        case "Search Users":
          const users = ensureArray(response.data);
          if (users.length === 0) {
            return "No users found.";
          }
          return users.length === 1 ? formatUserInfo([users[0]], originalQuery) :
            `Found ${users.length} users:\n${users.slice(0, 5).map((u: any) => `- ${u.name || u.handle || 'Unknown'} (@${u.handle || 'Unknown'})`).join('\n')}`;
  
        case "Search Playlists":
        case "Get Playlist":
          const playlists = ensureArray(response.data.data || response.data);
          return formatPlaylistInfo(playlists, originalQuery, response.fullPlaylistDetails);
  
        default:
          return "Unsupported API response format.";
      }
    } catch (error) {
      console.error("Error in formatApiResults:", error);
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
  export function formatTrendingTracks(data: any[]): string {
    const tracks = data.slice(0, 5);
    const trackList = tracks.map((track: any) => `"${track.title}" by ${track.user.name}`).join(', ');
    return `The top trending tracks on Audius right now are: ${trackList}`;
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