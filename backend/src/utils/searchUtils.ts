import { audiusApi, AudiusApi } from '../tools/create_fetch_request.js';
import { Track, User } from '../types.js'; // Adjust this import based on your actual types file location
import stringSimilarity from 'string-similarity';

export function parseQuery(query: string): { title: string | null, artist: string | null } {
  const genrePattern = /What genre is "(.*?)" by (.*?)\?/i;
  const performerPattern = /Who performed "(.*?)"\?/i;
  const playsPattern = /How many plays does "(.*?)" by (.*?) have\?/i;

  let match;
  if (match = query.match(genrePattern)) {
    return { title: match[1], artist: match[2] };
  } else if (match = query.match(performerPattern)) {
    return { title: match[1], artist: null };
  } else if (match = query.match(playsPattern)) {
    return { title: match[1], artist: match[2] };
  }

  return { title: null, artist: null };
}

export async function searchTracks(query: string) {
  const audiusApi = new AudiusApi();
  console.log(`Searching for tracks with query: "${query}"`);

  try {
    const searchResults = await audiusApi.searchTracks(query);
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

export function scoreTrackMatch(track: Track, title: string, artist: string | null): number {
  let score = 0;
  if (track.title.toLowerCase() === title.toLowerCase()) score += 10;
    if (artist && track.user.name.toLowerCase() === artist.toLowerCase()) score += 10;
    return score;
  }

export async function searchUsers(query: string): Promise<User[]> {
    const response = await audiusApi.searchUsers({ query });
    return response.data.sort((a: User, b: User) => {
      const aScore = scoreUserMatch(a, query);
      const bScore = scoreUserMatch(b, query);
      return bScore - aScore;
    });
  }
  
  export function scoreUserMatch(user: User, query: string): number {
    let score = 0;
    const lowerQuery = query.toLowerCase();
    if (user.name.toLowerCase().includes(lowerQuery)) score += 10;
    if (user.handle.toLowerCase().includes(lowerQuery)) score += 5;
    return score;
  }