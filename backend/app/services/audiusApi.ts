import axios, { AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';
import { logger } from '../logger.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractGenres, scoreAndRankGenres } from '../tools/multi_step_queries.js';
import { TrackData } from '../lib/audiusData.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const API_KEY = process.env.AUDIUS_API_KEY;
const BASE_URL = 'https://discoveryprovider.audius.co/v1';
const DISCOVERY_PROVIDER_ENDPOINT = process.env.discoveryProviderEndpoint || 'https://discoveryprovider.audius.co';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

if (!API_KEY) {
  throw new Error('AUDIUS_API_KEY is not defined in the environment variables.');
}

interface ApiResponse<T> {
  data: T;
  nextCursor?: string;
}

export class AudiusApi {
  private axiosInstance = axios.create({
    baseURL: DISCOVERY_PROVIDER_ENDPOINT,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 5000, // 5 seconds timeout
  });

  /**
   * Tests the connection to the Audius API by hitting the /health_check endpoint.
   * @returns A promise that resolves to true if the connection is successful.
   */
  public async testConnection(): Promise<boolean> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response: AxiosResponse<any> = await this.axiosInstance.get('/health_check');
        if (response.status === 200) {
          logger.info('✓ Successfully connected to Audius API.');
          return true;
        } else {
          logger.error(`Unexpected response status: ${response.status}`);
          throw new Error(`Unexpected response status: ${response.status}`);
        }
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          logger.error(`Error testing connection to Audius API (Attempt ${attempt}): ${error.message}`);
        } else {
          logger.error(`Unexpected error testing connection to Audius API (Attempt ${attempt}):`, error);
        }

        if (attempt < MAX_RETRIES) {
          logger.info(`Retrying connection in ${RETRY_DELAY / 1000} seconds...`);
          await this.delay(RETRY_DELAY);
        } else {
          logger.error('🔴 Max connection attempts reached. Failed to connect to Audius API.');
          throw new Error('Failed to connect to Audius API after multiple attempts.');
        }
      }
    }

    return false; // Should never reach here
  }

  /**
   * Delays execution for a specified amount of time.
   * @param ms - Milliseconds to delay.
   * @returns A promise that resolves after the delay.
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async request<T>(config: AxiosRequestConfig, retries = 0): Promise<T> {
    try {
      const url = `${BASE_URL}${config.url}`;
      logger.debug(`Request URL: ${url}`);

      const fullConfig: AxiosRequestConfig = {
        ...config,
        url,
        headers: {
          ...config.headers,
          Accept: 'application/json',
          'X-API-KEY': API_KEY,
          'User-Agent': 'Atris'
        }
      };

      const response: AxiosResponse<T> = await axios(fullConfig);
      logger.debug(`Response from ${config.url}: ${JSON.stringify(response.data)}`);

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        logger.error(`Axios error on ${config.method} ${config.url}:`, error.message);
        if (
          error.response &&
          [500, 502, 503, 504].includes(error.response.status) &&
          retries < MAX_RETRIES
        ) {
          logger.warn(`Retrying request (${retries + 1}/${MAX_RETRIES}) after error: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return this.request<T>(config, retries + 1);
        }
      }
      logger.error(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  // **Search Tracks**
  async searchTracks(query: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    return this.request<ApiResponse<any[]>>({
      method: 'GET',
      url: '/v1/search/tracks',
      params: { query, limit }
    });
  }

  // **Search Playlists**
  async searchPlaylists(query: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    return this.request<ApiResponse<any[]>>({
      method: 'GET',
      url: '/v1/search/playlists',
      params: { query, limit }
    });
  }

  // **Search Genres**
  async searchGenres(query: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    return this.request<ApiResponse<any[]>>({
      method: 'GET',
      url: '/v1/search/genres',
      params: { query, limit }
    });
  }

  // **Search Users**
  async searchUsers(query: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    return this.request<ApiResponse<any[]>>({
      method: 'GET',
      url: '/v1/search/users',
      params: { query, limit }
    });
  }

  // **Get Trending Tracks**
  async getTrendingTracks(limit: number = 100, timeframe: string = 'week'): Promise<TrackData[]> {
    try {
      const response = await this.request<ApiResponse<TrackData[]>>({
        method: 'GET',
        url: '/v1/tracks/trending',
        params: { limit, timeframe }
      });
      return response.data;
    } catch (error: unknown) {
      logger.error(`Failed to fetch trending tracks:`, error);
      throw new Error('Failed to retrieve trending tracks.');
    }
  }

  // **Get User Tracks**
  async getUserTracks(userId: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    return this.request<ApiResponse<any[]>>({
      method: 'GET',
      url: `/v1/users/${userId}/tracks`,
      params: { limit }
    });
  }

  // **Get User Followers**
  async getUserFollowers(userHandle: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    // First, fetch user details to get the user ID from the handle
    const usersResponse = await this.searchUsers(userHandle, 1);
    if (usersResponse.data.length === 0) {
      throw new Error(`User with handle "${userHandle}" not found.`);
    }
    const userId = usersResponse.data[0].id;
    return this.request<ApiResponse<any[]>>({
      method: 'GET',
      url: `/v1/users/${userId}/followers`,
      params: { limit }
    });
  }

  // **Get User Following**
  async getUserFollowing(userHandle: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    // First, fetch user details to get the user ID from the handle
    const usersResponse = await this.searchUsers(userHandle, 1);
    if (usersResponse.data.length === 0) {
      throw new Error(`User with handle "${userHandle}" not found.`);
    }
    const userId = usersResponse.data[0].id;
    return this.request<ApiResponse<any[]>>({
      method: 'GET',
      url: `/v1/users/${userId}/following`,
      params: { limit }
    });
  }
}

export const globalAudiusApi = new AudiusApi();
