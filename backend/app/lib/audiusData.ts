import { TrackArtwork, ProfilePicture, CoverPhoto, Track, Playlist, User } from '@audius/sdk';

// Export the AudiusData type
export type TrackData = {
  id: string;
  title: string;
  artwork: TrackArtwork;
  description: string | null;
  genre: string;
  mood: string | null;
  releaseDate: string | null;
  remixOf: TrackData | null;
  repostCount: number;
  favoriteCount: number;
  commentCount: number;
  tags: string[] | null;
  user: User;
  duration: number;
  isDownloadable: boolean;
  playCount: number;
  permalink: string;
  isStreamable: boolean;
};

export type UserData = {
  id: string;
  name: string;
  handle: string;
  bio: string | null;
  followerCount: number;
  followeeCount: number;
  trackCount: number;
  playlistCount: number;
  albumCount: number;
  isVerified: boolean;
  profilePicture: ProfilePicture;
  coverPhoto: CoverPhoto;
  twitterHandle: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  website: string | null;
  location: string | null;
  isDeactivated: boolean;
  isAvailable: boolean;
  supporterCount: number;
  supportingCount: number;
  totalAudioBalance: number;
};

export type PlaylistData = {
  id: string;
  playlistName: string;
  creator: string;
  trackCount: number;
  totalPlayCount: number;
  repostCount: number;
  favoriteCount: number;
  isAlbum: boolean;
  description: string | null;
};

export type PopularTrackData = {
  rank: number;
  title: string;
  artist: string;
  playCount: number;
  genre: string;
  mood?: string;
  releaseDate?: string;
};

export type NoMatchData = {
  searchedTrack: string;
  searchedArtist: string;
  availableTracks: Array<{
    title: string;
    artist: string;
    playCount: number;
  }>;
};

export type RemixData = {
  id: string;
  title: string;
  artist: string;
  remixOf: TrackData;
};

export type GenreData = {
  genre: string;
  tracks: Array<{
    id: string;
    title: string;
    artist: string;
    artwork: TrackArtwork;
    duration: number;
    playCount: number;
    favoriteCount: number;
    repostCount: number;
    releaseDate: string | null;
    permalink: string;
  }>;
};

export type AudiusData = 
  | { type: 'track'; data: Track }
  | { type: 'artist'; data: User }
  | { type: 'playlist'; data: Playlist }
  | { type: 'popularTrack'; data: PopularTrackData }
  | { type: 'noMatch'; data: NoMatchData }
  | { type: 'remix'; data: RemixData }
  | { type: 'genre'; data: GenreData };

// Define each of these types (TrackData, ArtistData, etc.) with their specific properties

if (!process.env.AUDIUS_API_KEY || !process.env.AUDIUS_API_SECRET) {
  throw new Error('Audius API key or secret is not defined in the environment variables.');
}

const apiKey = process.env.AUDIUS_API_KEY!;
const apiSecret = process.env.AUDIUS_API_SECRET!;

// Remove the SDK initialization
// const audiusSdk = sdk({
//   appName: 'audius-ai-sdk', // Replace with your actual app name
//   apiKey: apiKey,
//   apiSecret: apiSecret,
// });

export async function fetchAudiusData(query: string): Promise<AudiusData | null> {
  try {
    const response = await fetch('/api/audius', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'searchTracks', params: { query } }),
    });
    const data = await response.json();

    if (data.data && data.data.length > 0) {
      const track = data.data[0];
      return {
        type: 'track',
        data: track
      };
    }

    // If no track is found, you might want to search for artists or playlists
    // You can add additional API calls here if needed

    return null;
  } catch (error) {
    console.error("Error fetching Audius data:", error);
    return null;
  }
}

async function searchRemixes(query: string): Promise<AudiusData | null> {
  try {
    const response = await fetch('/api/audius', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'searchTracks', params: { query } }),
    });
    const data = await response.json();
    
    // Filter for tracks that are remixes
    const remixes = data.data?.filter((track: Track) => track.remixOf !== null);
    
    if (remixes && remixes.length > 0) {
      const remix = remixes[0];
      
      // Fetch original track details
      const originalTrackId = remix.remix_of!.tracks![0].parent_track_id;
      const originalTrackResponse = await fetch('/api/audius', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getTrack', params: { trackId: originalTrackId } }),
      });
      const originalTrack = await originalTrackResponse.json();
      
      return {
        type: 'remix',
        data: {
          id: remix.id,
          title: remix.title,
          artist: remix.user.name,
          remixOf: {
            id: originalTrack.data.id,
            title: originalTrack.data.title,
            artwork: originalTrack.data.artwork,
            description: originalTrack.data.description || null,
            genre: originalTrack.data.genre,
            mood: originalTrack.data.mood || null,
            releaseDate: originalTrack.data.release_date || null,
            remixOf: null,
            repostCount: originalTrack.data.repost_count,
            favoriteCount: originalTrack.data.favorite_count,
            commentCount: originalTrack.data.comment_count,
            tags: Array.isArray(originalTrack.data.tags) ? originalTrack.data.tags : null,
            user: originalTrack.data.user,
            duration: originalTrack.data.duration,
            isDownloadable: originalTrack.data.downloadable,
            playCount: originalTrack.data.play_count,
            permalink: originalTrack.data.permalink,
            isStreamable: originalTrack.data.is_streamable || false
          }
        }
      };
    }
    return null;
  } catch (error) {
    console.error("Error searching for remixes:", error);
    return null;
  }
}

// Export the searchRemixes function if you need to use it elsewhere
export { searchRemixes };