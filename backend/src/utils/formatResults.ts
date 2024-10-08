
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
      return `The artist who performed the track '${searchedTrackName}' is ${artist}.`;
    } else {
      return `Unable to find an exact match for the track '${searchedTrackName}'.`;
    }
  }
  
  // Add this new function to format API results
export function formatApiResults(response: any, originalQuery: string, apiName: string): string {
    if (!response || !response.data) {
      return "Unable to find the requested information.";
    }
  
    switch (apiName) {
      case "Get Trending Tracks":
      case "Search Tracks":
        return formatTrackResults(response, originalQuery);
  
      case "Get Track":
        const track = response.data;
        return `Track Information:
          Title: ${track.title}
          Artist: ${track.user.name}
          Genre: ${track.genre}
          Plays: ${track.play_count}`;
  
      case "Get User":
        const user = response.data;
        return `User Information:
          Name: ${user.name}
          Handle: ${user.handle}
          Follower Count: ${user.follower_count}
          Track Count: ${user.track_count}`;
  
      case "Search Users":
        const users = response.data;
        return `Found ${users.length} users:
          ${users.slice(0, 5).map((u: any) => `- ${u.name} (@${u.handle})`).join('\n')}`;
  
      case "Search Playlists":
        const playlists = response.data.data;
        if (playlists.length === 0) {
          return "No playlists found matching your query.";
        }
        
        // If the query is about a specific playlist
        if (originalQuery.toLowerCase().includes("playlist")) {
          const bestMatch = playlists[0]; // Assume the first result is the best match
          return `Found playlist: "${bestMatch.playlist_name}" by ${bestMatch.user.name}
            Tracks: ${bestMatch.track_count}
            Favorites: ${bestMatch.favorite_count}
            ${bestMatch.description ? `Description: ${bestMatch.description}` : ''}`;
        }
        
        // If it's a general search
        return `Found ${playlists.length} playlists:
          ${playlists.slice(0, 5).map((p: any, index: number) => 
            `${index + 1}. "${p.playlist_name}" by ${p.user.name} (${p.track_count} tracks)`
          ).join('\n')}`;
  
      default:
        return "Unsupported API response format.";
    }
  }

  export function formatSearchTracks(data: any, query: string): string {
    if (!data || data.length === 0) {
      return `I couldn't find any tracks matching your query: "${query}"`;
    }
  
    const tracks = data.slice(0, 5); // Limit to top 5 results
    const trackList = tracks.map((track: any) => {
      return `"${track.title}" by ${track.user.name} (${track.play_count} plays)`;
    }).join(', ');
  
    if (query.toLowerCase().includes("genre")) {
      const genres = [...new Set(tracks.map((track: any) => track.genre))];
      return `The genre(s) for the tracks matching "${query}" are: ${genres.join(', ')}. Here are some matching tracks: ${trackList}`;
    }
  
    if (query.toLowerCase().includes("plays") || query.toLowerCase().includes("popular")) {
      return `Here are the top tracks matching your query "${query}": ${trackList}`;
    }
  
    return `Here are some tracks matching your query "${query}": ${trackList}`;
  }
  
  export function formatUserInfo(data: any, query: string): string {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return `I couldn't find any user information matching your query: "${query}"`;
    }
  
    // If it's an array (search result), take the first user
    const user = Array.isArray(data) ? data[0] : data;
  
    return `
      User Information:
      Name: ${user.name}
      Handle: @${user.handle}
      Followers: ${user.follower_count}
      Following: ${user.following_count}
      Tracks: ${user.track_count}
      ${user.bio ? `Bio: ${user.bio}` : ''}
    `.trim();
  }
  
  export function formatPlaylistInfo(data: any, query: string): string {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return `I couldn't find any playlist information matching your query: "${query}"`;
    }
  
    // If it's an array (search result), take the first playlist or limit to top 5
    const playlists = Array.isArray(data) ? data.slice(0, 5) : [data];
  
    if (playlists.length === 1) {
      const playlist = playlists[0];
      return `
        Playlist Information:
        Name: ${playlist.playlist_name}
        Created by: ${playlist.user.name}
        Tracks: ${playlist.track_count}
        ${playlist.description ? `Description: ${playlist.description}` : ''}
      `.trim();
    } else {
      const playlistList = playlists.map((playlist: any) => {
        return `"${playlist.playlist_name}" by ${playlist.user.name} (${playlist.track_count} tracks)`;
      }).join(', ');
      return `Here are some playlists matching your query "${query}": ${playlistList}`;
    }
  }