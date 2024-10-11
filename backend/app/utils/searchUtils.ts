import { globalAudiusApi } from '../tools/create_fetch_request.js';
import { TrackData, UserData } from '../lib/audiusData.js'; // Adjust this import based on your actual types file location


export function parseQuery(query: string): { type: string, title: string | null, artist: string | null } {
  const patterns = {
    genre: /What genre is "(.*?)" by (.*?)\?/i,
    performer: /Who performed "(.*?)"\?/i,
    plays: /How many plays does "(.*?)" by (.*?) have\?/i,
    trending: /What( are the top| is trending)?\s*(tracks|playlists)/i,
    search: /(?:search for|find)(?: a)? (track|playlist|user)(?: called| named)? "(.*?)"/i
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    const match = query.match(pattern);
    if (match) {
      switch (type) {
        case 'genre':
        case 'plays':
          return { type, title: match[1], artist: match[2] };
        case 'performer':
          return { type, title: match[1], artist: null };
        case 'trending':
          return { type: 'trending', title: match[2], artist: null };
        case 'search':
          return { type: `search_${match[1]}`, title: match[2], artist: null };
      }
    }
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

export function routeQuery(query: string) {
  const parsedQuery = parseQuery(query);
  
  switch (parsedQuery.type) {
    case 'genre':
      return handleGenreQuery(parsedQuery);
    case 'performer':
      return handlePerformerQuery(parsedQuery);
    case 'plays':
      return handlePlaysQuery(parsedQuery);
    case 'trending':
      return handleTrendingQuery(parsedQuery);
    case 'search_track':
    case 'search_playlist':
    case 'search_user':
      return handleSearchQuery(parsedQuery);
    default:
      return handleUnknownQuery(parsedQuery);
  }
}

// Implement these functions based on the specific requirements
function handleGenreQuery(parsedQuery: any) {
  // Implementation
}

function handlePerformerQuery(parsedQuery: any) {
  // Implementation
}

function handlePlaysQuery(parsedQuery: any) {
  // Implementation
}

function handleTrendingQuery(parsedQuery: any) {
  // Implementation
}

function handleSearchQuery(parsedQuery: any) {
  // Implementation
}

function handleUnknownQuery(parsedQuery: any) {
  // Implementation
}