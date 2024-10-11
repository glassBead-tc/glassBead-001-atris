import { globalAudiusApi } from '../tools/create_fetch_request.js';
import { TrackData, UserData } from '../lib/audiusData.js'; // Adjust this import based on your actual types file location
import { formatTrendingTracks, formatPlaylistResults, formatUserResults, formatDetailedTrackInfo } from './formatResults.js';

export function parseQuery(query: string): { type: string, title: string | null, artist: string | null } {
  console.log(`Parsing query: "${query}"`);
  const patterns = {
    genre: /What genre is ['"]?(.*?)['"]? by (.*?)\??$/i,
    genreAlt: /(?:genre|style) of ['"]?(.*?)['"]? by (.*?)/i,
    performer: /Who performed ['"]?(.*?)['"]?\??$/i,
    plays: /How many plays does ['"]?(.*?)['"]? by (.*?) have\??$/i,
    trending: /What( are the top| is trending)?\s*(tracks|playlists)/i,
    search: /(?:search for|find)(?: a)? (track|playlist|user)(?: called| named)? ['"]?(.*?)['"]?/i,
    mostFollowers: /Who is the artist with the most followers/i
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    const match = query.match(pattern);
    if (match) {
      switch (type) {
        case 'genre':
        case 'genreAlt':
          return { type: 'genre', title: match[1], artist: match[2] };
        case 'plays':
          return { type, title: match[1], artist: match[2] };
        case 'performer':
          return { type, title: match[1], artist: null };
        case 'trending':
          return { type: 'trending', title: match[2], artist: null };
        case 'search':
          return { type: `search_${match[1]}`, title: match[2], artist: null };
        case 'mostFollowers':
          return { type: 'mostFollowers', title: null, artist: null };
      }
    }
  }

  // If no pattern matches, try to extract a category
  const categoryMatch = query.match(/what.*?(tracks?|playlists?|users?|artists?)/i);
  if (categoryMatch) {
    return { type: categoryMatch[1].toLowerCase(), title: null, artist: null };
  }

  return { type: 'unknown', title: null, artist: null };
}

export async function searchTracks(query: string) {
  console.log(`Searching for tracks with query: "${query}"`);

  try {
    const searchResults = await globalAudiusApi.searchTracks(query);
    console.log(`Raw API response:`, JSON.stringify(searchResults, null, 2));

    if (searchResults && Array.isArray(searchResults.data) && searchResults.data.length > 0) {
      return searchResults.data;
    }

    console.log(`No results found for query`);
    return [];
  } catch (error) {
    console.error(`Error searching for tracks:`, error);
    throw error;
  }
}

export function scoreTrackMatch(track: TrackData, title: string, artist: string | null): number {
  let score = 0;
  if (track.title.toLowerCase() === title.toLowerCase()) score += 10;
    if (artist && track.user.name.toLowerCase() === artist.toLowerCase()) score += 10;
    return score;
  }

export async function searchUsers(query: string): Promise<UserData[]> {
    const response = await globalAudiusApi.searchUsers(query);
    return response.data.sort((a: UserData, b: UserData) => {
      const aScore = scoreUserMatch(a, query);
      const bScore = scoreUserMatch(b, query);
      return bScore - aScore;
    });
  }
  
  export function scoreUserMatch(user: UserData, query: string): number {
    let score = 0;
    const lowerQuery = query.toLowerCase();
    if (user.name.toLowerCase().includes(lowerQuery)) score += 10;
    if (user.handle.toLowerCase().includes(lowerQuery)) score += 5;
    return score;
  }

export async function handleTrendingQuery(parsedQuery: any) {
  try {
    const limit = parsedQuery.title === 'tracks' ? 5 : 3; // Default limits
    if (parsedQuery.title === 'tracks') {
      const response = await globalAudiusApi.getTrendingTracks(limit);
      return formatTrendingTracks(response.data);
    } else if (parsedQuery.title === 'playlists') {
      const response = await globalAudiusApi.getTopTrendingPlaylist(limit);
      return formatPlaylistResults(response.data);
    }
    throw new Error('Invalid trending query type');
  } catch (error) {
    console.error('Error handling trending query:', error);
    throw error;
  }
}

export async function handleSearchQuery(parsedQuery: any) {
  try {
    const limit = 10; // Default limit
    switch (parsedQuery.type) {
      case 'search_track':
        const trackResponse = await globalAudiusApi.searchTracks(parsedQuery.title, limit);
        return formatDetailedTrackInfo(trackResponse.data);
      case 'search_playlist':
        const playlistResponse = await globalAudiusApi.searchPlaylists(parsedQuery.title, limit);
        return formatPlaylistResults(playlistResponse.data);
      case 'search_user':
        const userResponse = await globalAudiusApi.searchUsers(parsedQuery.title, limit);
        return formatUserResults(userResponse.data);
      default:
        throw new Error('Invalid search query type');
    }
  } catch (error) {
    console.error('Error handling search query:', error);
    throw error;
  }
}

export async function handleGenreQuery(parsedQuery: any) {
  try {
    const trackResponse = await globalAudiusApi.searchTracks(`${parsedQuery.title} ${parsedQuery.artist}`);
    if (trackResponse.data && trackResponse.data.length > 0) {
      const track = trackResponse.data[0];
      return `The genre of "${parsedQuery.title}" by ${parsedQuery.artist} is ${track.genre || 'Unknown'}.`;
    }
    return `Could not find the track "${parsedQuery.title}" by ${parsedQuery.artist} on Audius.`;
  } catch (error) {
    console.error('Error handling genre query:', error);
    throw error;
  }
}

export async function handlePlaysQuery(parsedQuery: any) {
  try {
    const trackResponse = await globalAudiusApi.searchTracks(parsedQuery.title);
    const track = trackResponse.data.find((t: any) => 
      t.title.toLowerCase() === parsedQuery.title.toLowerCase() && 
      t.user.name.toLowerCase() === parsedQuery.artist.toLowerCase()
    );
    if (track) {
      return `"${parsedQuery.title}" by ${parsedQuery.artist} has ${track.play_count} plays.`;
    }
    return `Could not find play count for "${parsedQuery.title}" by ${parsedQuery.artist}.`;
  } catch (error) {
    console.error('Error handling plays query:', error);
    throw error;
  }
}

export async function routeQuery(query: string) {
  const parsedQuery = parseQuery(query);
  
  switch (parsedQuery.type) {
    case 'genre':
      return handleGenreQuery(parsedQuery);
    case 'performer':
      return handleSearchQuery({ ...parsedQuery, type: 'search_user' });
    case 'plays':
      return handlePlaysQuery(parsedQuery);
    case 'trending':
      return handleTrendingQuery(parsedQuery);
    case 'search_track':
    case 'search_playlist':
    case 'search_user':
      return handleSearchQuery(parsedQuery);
    case 'mostFollowers':
      return handleMostFollowersQuery();
    default:
      return `I'm sorry, I couldn't understand your query. Could you please rephrase it?`;
  }
}

async function handleMostFollowersQuery() {
  try {
    const response = await globalAudiusApi.searchUsers('', 1, 'follower_count', 'desc');
    if (response.data && response.data.length > 0) {
      const topArtist = response.data[0];
      return `The artist with the most followers on Audius is ${topArtist.name} (@${topArtist.handle}) with ${topArtist.follower_count} followers.`;
    }
    return "Unable to determine the artist with the most followers at this time.";
  } catch (error) {
    console.error('Error handling most followers query:', error);
    throw error;
  }
}