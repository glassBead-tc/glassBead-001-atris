import dotenv from 'dotenv';
import axios from 'axios';
import { ApiResponse, Track, TracksResponse } from './types.js';

dotenv.config();

class TracksApi {
  private sdk: MinimalAudiusSDK;

  constructor(sdk: MinimalAudiusSDK) {
    this.sdk = sdk;
  }

  async getTrendingTracks(params: { time?: string; limit?: number } = {}): Promise<TracksResponse> {
    return this.sdk.getTrendingTracks(params);
  }

  async getTrack(trackId: string): Promise<ApiResponse> {
    // Implement the actual API call here
    throw new Error('Not implemented');
  }

  async searchTracks(params: any): Promise<ApiResponse> {
    // Implement the actual API call here
    throw new Error('Not implemented');
  }

  async trackComments(trackId: string): Promise<ApiResponse> {
    // Implement the actual API call here
    throw new Error('Not implemented');
  }

  async getTrackStems(trackId: string): Promise<ApiResponse> {
    // Implement the actual API call here
    throw new Error('Not implemented');
  }
}

class PlaylistsApi {
  async getTrendingPlaylists(params: any): Promise<ApiResponse> {
    // Implement the actual API call here
    throw new Error('Not implemented');
  }

  async getPlaylist(playlistId: string): Promise<ApiResponse> {
    // Implement the actual API call here
    throw new Error('Not implemented');
  }

  async searchPlaylists(params: any): Promise<ApiResponse> {
    // Implement the actual API call here
    throw new Error('Not implemented');
  }
}

class UsersApi {
  async getUser(userId: string): Promise<ApiResponse> {
    // Implement the actual API call here
    throw new Error('Not implemented');
  }

  async searchUsers(params: any): Promise<ApiResponse> {
    // Implement the actual API call here
    throw new Error('Not implemented');
  }

  async getReposts(userId: string): Promise<ApiResponse> {
    // Implement the actual API call here
    throw new Error('Not implemented');
  }

  async getFavorites(userId: string): Promise<ApiResponse> {
    // Implement the actual API call here
    throw new Error('Not implemented');
  }

  async getFollowers(userId: string): Promise<ApiResponse> {
    // Implement the actual API call here
    throw new Error('Not implemented');
  }

  async getFollowing(userId: string): Promise<ApiResponse> {
    // Implement the actual API call here
    throw new Error('Not implemented');
  }
}

class MinimalAudiusSDK {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string = 'https://discovery-us-01.audius.openplayer.org/v1';

  public tracks: TracksApi;
  public playlists: PlaylistsApi;
  public users: UsersApi;

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.tracks = new TracksApi(this);
    this.playlists = new PlaylistsApi();
    this.users = new UsersApi();
  }

  async getTrendingTracks(params: { time?: string; limit?: number } = {}): Promise<TracksResponse> {
    const { time = 'week', limit = 10 } = params;
    const url = `${this.baseUrl}/tracks/trending`;
    
    try {
      const response = await axios.get<TracksResponse>(url, {
        params: {
          time,
          limit,
          app_name: 'Atris',
        },
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': this.apiKey,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching trending tracks:', error);
      throw error;
    }
  }
}

let audiusSdk: MinimalAudiusSDK | null = null;

export async function getAudiusSdk() {
  if (!audiusSdk) {
    console.log("Initializing SDK for the first time");
    const apiKey = process.env.AUDIUS_API_KEY;
    const apiSecret = process.env.AUDIUS_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error('Missing Audius API credentials');
    }

    audiusSdk = new MinimalAudiusSDK(apiKey, apiSecret);
  }
  return audiusSdk;
}
