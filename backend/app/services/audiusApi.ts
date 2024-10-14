import { 
  GetUserRequest,
  TrackResponse, 
  UserResponse,
  PlaylistResponse,
  sdk, // Factory function
  SearchUsersRequest,
  SearchTracksRequest,
  SearchPlaylistsRequest,
  GetTrendingTracksRequest,
  GetFollowersRequest,
  GetFollowingRequest,
  Track,
  User,
  Playlist,
  DiscoveryNodeSelectorService,
  StorageNodeSelectorService,
  Genre,
  DiscoveryNodeSelector,
  StorageNodeSelector,
  AuthService,
  StorageNode,
  TransactionData,
} from '@audius/sdk'; // Named imports
import { GroupedGenres } from '../types.js';
import axios, { AxiosInstance } from 'axios';
import { logger } from '../logger.js'; // Correct import without '.js'
import { ApiResponse as CustomApiResponse } from '../types.js'; // Correct import

import { z } from 'zod';
import dotenv from 'dotenv';
import { getAudiusApiKey, getAudiusApiSecret } from '../config.js';

// Load environment variables
dotenv.config({ path: '.env' });

// Define a schema for environment variables using Zod
const envSchema = z.object({
  AUDIUS_API_KEY: z.string().nonempty(),
  AUDIUS_APP_NAME: z.string().nonempty(),
  AUDIUS_DISCOVERY_PROVIDER: z.string().nonempty(),
  AUDIUS_CREATOR_NODE_ENDPOINT: z.string().nonempty(),
  AUDIUS_ENVIRONMENT: z.enum(['development', 'staging', 'production']),
});

// Validate environment variables
const env = envSchema.safeParse(process.env);

if (!env.success) {
  logger.error('❌ Invalid environment variables:', env.error.format());
  process.exit(1); // Exit the application if validation fails
}

const { AUDIUS_API_KEY, AUDIUS_APP_NAME, AUDIUS_DISCOVERY_PROVIDER, AUDIUS_CREATOR_NODE_ENDPOINT, AUDIUS_ENVIRONMENT } = env.data;

interface SearchTracksRequestLimited extends SearchTracksRequest {
  limit?: number;
}

interface SearchUsersRequestLimited extends SearchUsersRequest {
  limit?: number;
}

interface SearchPlaylistsRequestLimited extends SearchPlaylistsRequest {
  limit?: number;
}

interface GetTrendingTracksRequestLimited extends GetTrendingTracksRequest {
  limit?: number;
}

interface GetFollowersRequestLimited extends GetFollowersRequest {
  limit?: number;
}

interface GetFollowingRequestLimited extends GetFollowingRequest {
  limit?: number;
}

interface SearchGenresRequest {
  genre: Genre;
  query: string;
  limit?: number;

}

// Create the discoveryNodeSelector
const discoveryNodeSelector = new DiscoveryNodeSelector({
  initialSelectedNode: AUDIUS_DISCOVERY_PROVIDER,
});

// Create an object that implements the AuthService interface
const authService: AuthService = {
  getSharedSecret: async (publicKey: string | Uint8Array) => new Uint8Array(),
  sign: async (data: string | Uint8Array) => [new Uint8Array(), 0],
  hashAndSign: async (data: string) => '',
  signTransaction: async (data: TransactionData) => '',
  getAddress: async () => '',
};

// Create the storageNodeSelector
const storageNodeSelector = new StorageNodeSelector({
  auth: authService,
  discoveryNodeSelector,
});

export class AudiusApiService {
  private audiusSdk: ReturnType<typeof sdk>;

  constructor(audiusSdk: ReturnType<typeof sdk>) { // Appropriate type
    this.audiusSdk = audiusSdk;
  }

  /**
   * Tests the connection to the Audius API.
   * @returns A boolean indicating the success of the connection.
   */
  async testConnection(): Promise<boolean> {
    try {
      logger.debug('Starting API connection test');
      logger.debug('Preparing request to getTrack');
      
      const trackId = 'gWgbP1d'; // Example track ID, replace with a known valid ID
      logger.debug(`Request parameters: trackId=${trackId}`);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API request timed out')), 5000)
      );
      
      logger.debug('Sending request to getTrack');
      const responsePromise = this.audiusSdk.tracks.getTrack({ trackId });
      
      const response: any = await Promise.race([responsePromise, timeoutPromise]);
      
      logger.debug(`API response received`);
      if (response && response.data) {
        logger.info('Audius SDK connection successful.');
        return true;
      } else {
        logger.warn('API connection test returned unexpected response');
        return false;
      }
    } catch (error) {
      logger.error('Failed to test Audius SDK connection:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
 * Retrieves a user's tracks.
 * @param userId - The ID of the user.
 * @param limit - The number of tracks to retrieve.
 * @returns An ApiResponse containing an array of tracks.
 */
  // Example correction if 'getTrack' is the correct method
  async getUserTracks(userId: string, limit: number): Promise<CustomApiResponse<TrackResponse[]>> {
    try {
      const request: SearchTracksRequestLimited = { query: userId, limit: 5 };
      const response = await this.audiusSdk.tracks.searchTracks(request);
      logger.debug('getUserTracks response:', response);
      const tracks = response.data?.map((track: Track) => track.title) || [];
      const trackResponse = tracks.map((track: string) => ({ title: track })) as TrackResponse[];
      return { data: trackResponse };
    } catch (error: any) {
      logger.error('Failed to get user tracks:', error);
      throw new Error('Failed to get user tracks.');
    }
  }

  /**
   * Searches for genres based on the provided query and limit.
   * @param query - The search query string.
   * @param limit - The number of genres to retrieve.
   * @returns An ApiResponse containing an array of genre names.
   */
  async searchGenres(query: string, limit: number): Promise<CustomApiResponse<string[]>> {
    try {
      const allGenres = Object.entries(GroupedGenres).flatMap(([key, value]) => {
        if (typeof value === 'string') {
          return value;
        } else if (typeof value === 'object') {
          return Object.values(value);
        }
        return [];
      });

      const matchedGenres = allGenres.filter(genre =>
        genre.toLowerCase().includes(query.toLowerCase())
      );

      const limitedGenres = matchedGenres.slice(0, limit);

      logger.debug('searchGenres response:', limitedGenres);

      return { data: limitedGenres };
    } catch (error: any) {
      logger.error('Failed to search genres:', error);
      throw new Error('Failed to search genres.');
    }
  }

  /**
   * Retrieves tracks matching the search criteria.
   * @param query - The search query string.
   * @param limit - The number of tracks to retrieve.
   * @returns An ApiResponse containing an array of tracks.
   */
  async searchTracks(query: string, limit: number): Promise<CustomApiResponse<TrackResponse[]>> {
    try {
      const request: SearchTracksRequestLimited = { query, limit: 5 };
      const response = await this.audiusSdk.tracks.searchTracks(request);
      logger.debug('searchTracks response:', response);
      const tracks = response.data?.map((track: Track) => track.title) || [];
      const trackResponse = tracks.map((track: string) => ({ title: track })) as TrackResponse[];
      return { data: trackResponse };
    } catch (error: any) {
      logger.error('Failed to search tracks:', error);
      throw new Error('Failed to search tracks.');
    }
  }

  /**
   * Retrieves users matching the search criteria.
   * @param query - The search query string.
   * @param limit - The number of users to retrieve.
   * @returns An ApiResponse containing an array of users.
   */
  /**
   * Retrieves users matching the search criteria.
   * @param query - The search query string.
   * @param limit - The number of users to retrieve.
   * @returns An ApiResponse containing an array of users.
   */
  async searchUsers(query: string, limit: number): Promise<CustomApiResponse<UserResponse[]>> {
    try {
      const request: SearchUsersRequestLimited = { query, limit };
      const response = await this.audiusSdk.users.searchUsers(request);
      logger.debug('searchUsers response:', response);
      const users = response.data?.map((user: User) => user.name) || [];
      const userResponse = users.map((user: string) => ({ name: user })) as UserResponse[];
      return { data: userResponse };
    } catch (error: any) {
      logger.error('Failed to search users:', error);
      throw new Error('Failed to search users.');
    }
  }

    /**
   * Retrieves playlists matching the search criteria.
   * @param query - The search query string.
   * @param limit - The number of playlists to retrieve.
   * @returns An ApiResponse containing an array of playlists.
   */
    async searchPlaylists(query: string, limit: number): Promise<CustomApiResponse<PlaylistResponse[]>> {
      try {
        const request: SearchPlaylistsRequestLimited = { query, limit };
        const response = await this.audiusSdk.playlists.searchPlaylists(request);
        logger.debug('searchPlaylists response:', response);
        const playlists = response.data?.map((playlist: Playlist) => playlist.playlistName) || [];
        const playlistResponse = playlists.map((playlist: string) => ({ playlistName: playlist })) as PlaylistResponse[];
        return { data: playlistResponse };
      } catch (error: any) {
        logger.error('Failed to search playlists:', error);
        throw new Error('Failed to search playlists.');
      }
    }

  /**
   * Retrieves trending tracks.
   * @param limit - The number of trending tracks to retrieve.
   * @returns An ApiResponse containing an array of trending tracks.
   */
  async getTrendingTracks(limit: number): Promise<CustomApiResponse<TrackResponse[]>> {
    try {
      const response = await this.audiusSdk.tracks.getTrendingTracks();
      logger.debug('getTrendingTracks response:', response);
      const tracks = response.data?.slice(0, limit).map((track: Track) => track.title) || [];
      const trackResponse = tracks.map((track: string) => ({ title: track })) as TrackResponse[];
      return { data: trackResponse };
    } catch (error: any) {
      logger.error('Failed to get trending tracks:', error);
      throw new Error('Failed to get trending tracks.');
    }
  }

  /**
   * Retrieves followers of a user.
   * @param userId - The ID of the user.
   * @param limit - The number of followers to retrieve.
   * @returns An ApiResponse containing an array of followers.
   */
  async getUserFollowers(userId: string, limit: number): Promise<CustomApiResponse<UserResponse[]>> {
    try {
      const request: GetFollowersRequestLimited = { id: userId, limit };
      const response = await this.audiusSdk.users.getFollowers(request);
      logger.debug('getUserFollowers response:', response);
      const followers = response.data?.map((user: User) => user.name) || [];
      const followerResponse = followers.map((user: string) => ({ name: user })) as UserResponse[];
      return { data: followerResponse };
    } catch (error: any) {
      logger.error('Failed to get user followers:', error);
      throw new Error('Failed to get user followers.');
    }
  }

  /**
   * Retrieves users that a specific user is following.
   * @param userId - The ID of the user.
   * @param limit - The number of following users to retrieve.
   * @returns An ApiResponse containing an array of users.
   */
  async getUserFollowing(userId: string, limit: number): Promise<CustomApiResponse<UserResponse[]>> {
    try {
      const request: GetFollowingRequest = { id: userId, limit };
      const response = await this.audiusSdk.users.getFollowing(request);
      logger.debug('getUserFollowing response:', response);
      const following = response.data?.map((user: User) => user.name) || [];
      const followingResponse = following.map((user: string) => ({ name: user })) as UserResponse[];
      return { data: followingResponse };
    } catch (error: any) {
      logger.error('Failed to get user following:', error);
      throw new Error('Failed to get user following.');
    }
  }

  /**
   * Retrieves the play count for a specific track.
   * @param trackId - The ID of the track.
   * @returns The play count of the track.
   */
  async getTrackPlayCount(trackId: string): Promise<{ play_count: number }> {
    try {
      logger.info(`Fetching play count for track ID: ${trackId}`);
      const track = await this.audiusSdk.tracks.getTrack({ trackId });

      if (track && track.data && typeof track.data.playCount === 'number') {
        logger.debug(`Play count for track ID ${trackId}: ${track.data.playCount}`);
        return { play_count: track.data.playCount };
      } else {
        logger.warn(`Play count not found for track ID: ${trackId}`);
        throw new Error("Play count data is unavailable.");
      }
    } catch (error: unknown) {
      logger.error(`Error fetching play count for track ID ${trackId}:`, error);
      throw new Error("Failed to retrieve play count from Audius API.");
    }
  }
}


// Initialize the Audius SDK instance with proper configuration
const audiusSdkInstance = sdk({
  apiKey: getAudiusApiKey(),
  apiSecret: getAudiusApiSecret(),
  appName: AUDIUS_APP_NAME,
  services: {
    discoveryNodeSelector,
    storageNodeSelector,
  },
  environment: AUDIUS_ENVIRONMENT as "development" | "staging" | "production",
});

// Export the singleton instance
export const globalAudiusApi = new AudiusApiService(audiusSdkInstance);