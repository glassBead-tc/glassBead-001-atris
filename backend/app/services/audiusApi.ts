import { sdk, AudiusSdk } from '@audius/sdk';
import { logger } from '../logger.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  GetTrendingTracksRequest,
  SearchTracksRequest,
  SearchPlaylistsRequest,
  SearchUsersRequest,
} from '@audius/sdk';
import { GetTrendingTracksTimeEnum } from '@audius/sdk';

// Define the acceptable timeframes based on the SDK's expectations
type TrendingTimeframe = 'week' | 'month' | 'allTime';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_KEY = process.env.AUDIUS_API_KEY!;
const API_SECRET = process.env.AUDIUS_API_SECRET!;

if (!API_KEY) {
  throw new Error('AUDIUS_API_KEY is not defined in the environment variables.');
}

if (!API_SECRET) {
  throw new Error('AUDIUS_API_SECRET is not defined in the environment variables.');
}

interface ApiResponse<T> {
  data: T;
  nextCursor?: string;
}

class AudiusSdkWrapper {
  private audiusSdk: AudiusSdk;

  constructor(apiKey: string, apiSecret: string) {
    this.audiusSdk = sdk({
      apiKey,
      apiSecret
    });
  }

  async getTrendingTracks(timeframe: TrendingTimeframe = 'week'): Promise<any> {
    try {
      const params: GetTrendingTracksRequest = { time: timeframe };
      const response = await this.audiusSdk.tracks.getTrendingTracks(params);
      logger.debug(`Trending tracks response: ${JSON.stringify(response)}`);
      return response;
    } catch (error) {
      logger.error('Failed to retrieve trending tracks:', error);
      throw new Error('Failed to retrieve trending tracks.');
    }
  }

  async searchTracks(query: string): Promise<ApiResponse<any[]>> {
    try {
      const params: SearchTracksRequest = { query };
      const response = await this.audiusSdk.tracks.searchTracks(params);
      return { data: response.data || [] };
    } catch (error) {
      logger.error('Failed to search tracks:', error);
      throw new Error('Failed to search tracks.');
    }
  }

  async searchPlaylists(query: string): Promise<ApiResponse<any[]>> {
    try {
      const params: SearchPlaylistsRequest = { query };
      const response = await this.audiusSdk.playlists.searchPlaylists(params);
      return { data: response.data || [] };
    } catch (error) {
      logger.error('Failed to search playlists:', error);
      throw new Error('Failed to search playlists.');
    }
  }

  async searchUsers(query: string): Promise<ApiResponse<any[]>> {
    try {
      const params: SearchUsersRequest = { query };
      const response = await this.audiusSdk.users.searchUsers(params);
      return { data: response.data || [] };
    } catch (error) {
      logger.error('Failed to search users:', error);
      throw new Error('Failed to search users.');
    }
  }

  /**
   * Aggregates genres from a set of tracks.
   * @param limit - The number of tracks to fetch for aggregation.
   * @returns An array of genres with their popularity scores.
   */
  async getGenres(limit: number = 100): Promise<ApiResponse<{ name: string; popularity: number }[]>> {
    try {
      // Fetch a set of tracks without a specific query to get a broad sample
      const params: SearchTracksRequest = { query: '' };
      const response = await this.audiusSdk.tracks.searchTracks(params);

      if (!response.data) {
        throw new Error('No data returned from searchTracks.');
      }

      const genresMap: { [genre: string]: number } = {};

      // Limit the number of tracks to process
      const limitedTracks = response.data.slice(0, limit);

      limitedTracks.forEach((track: any) => {
        const genre = track.genre;
        if (genre) {
          genresMap[genre] = (genresMap[genre] || 0) + 1;
        }
      });

      const aggregatedGenres = Object.entries(genresMap)
        .map(([name, popularity]) => ({ name, popularity }))
        .sort((a, b) => b.popularity - a.popularity);

      return { data: aggregatedGenres };
    } catch (error) {
      logger.error('Failed to retrieve genres:', error);
      throw new Error('Failed to retrieve genres.');
    }
  }

  // Additional SDK methods can be added here as needed
}

export class AudiusApi {
  private sdkWrapper: AudiusSdkWrapper;
  timeframe: TrendingTimeframe = 'week';

  constructor() {
    this.sdkWrapper = new AudiusSdkWrapper(API_KEY, API_SECRET);
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.sdkWrapper.getTrendingTracks(this.timeframe);
      logger.info('✓ Successfully connected to Audius API.');
      return true;
    } catch (error) {
      logger.error('🔴 Failed to connect to Audius API:', error);
      throw new Error('Failed to connect to Audius API.');
    }
  }

  public async searchTracks(query: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    const response = await this.sdkWrapper.searchTracks(query);
    return { data: response.data.slice(0, limit) };
  }

  public async searchPlaylists(query: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    const response = await this.sdkWrapper.searchPlaylists(query);
    return { data: response.data.slice(0, limit) };
  }

  public async searchUsers(query: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    const response = await this.sdkWrapper.searchUsers(query);
    return { data: response.data.slice(0, limit) };
  }

  /**
   * Retrieves trending tracks based on the specified timeframe.
   * @param timeframe - The timeframe for trending tracks.
   * @returns The trending tracks data.
   */
  public async getTrendingTracks(timeframe: TrendingTimeframe = 'week'): Promise<any> {
    return this.sdkWrapper.getTrendingTracks(timeframe);
  }

  /**
   * Retrieves aggregated genres based on a sample of tracks.
   * @param limit - The number of tracks to sample for genre aggregation.
   * @returns An array of genres with their popularity scores.
   */
  public async getGenres(limit: number = 100): Promise<ApiResponse<{ name: string; popularity: number }[]>> {
    return this.sdkWrapper.getGenres(limit);
  }

  // Additional SDK methods can be exposed here as needed
}

export const globalAudiusApi = new AudiusApi();