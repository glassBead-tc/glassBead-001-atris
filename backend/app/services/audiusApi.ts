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
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

if (!API_KEY) {
  throw new Error('AUDIUS_API_KEY is not defined in the environment variables.');
}

interface ApiResponse<T> {
  data: T;
}

export class AudiusApi {
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
      logger.error(`Unexpected error on ${config.method} ${config.url}:`, error);
      throw error;
    }
  }

  // **Test Connection Method**
  async testConnection(): Promise<boolean> {
    try {
      // Using a lightweight endpoint for connection testing
      const response = await this.getTrendingTracks(1);
      if (response && response.length > 0) {
        logger.info(`Connection test successful: Retrieved ${response.length} track(s).`);
        return true;
      } else {
        logger.warn("Connection test failed: No data retrieved.");
        return false;
      }
    } catch (error: unknown) {
      logger.error(`Connection test failed:`, error);
      return false;
    }
  }

  // **Search Users by Handle**
  async searchUsers(handle: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    return this.request<ApiResponse<any[]>>({
      method: 'GET',
      url: '/users/search',
      params: { handle, limit }
    });
  }

  // **Search Playlists by Title**
  async searchPlaylists(title: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    return this.request<ApiResponse<any[]>>({
      method: 'GET',
      url: '/playlists/search',
      params: { title, limit }
    });
  }

  // **Search Tracks by Title**
  async searchTracks(title: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    return this.request<ApiResponse<any[]>>({
      method: 'GET',
      url: '/tracks/search',
      params: { title, limit }
    });
  }

  // **Get Trending Tracks**
  async getTrendingTracks(limit: number = 5, timeframe: string = 'week'): Promise<TrackData[]> {
    try {
      const response = await this.request<{ data: TrackData[] }>({
        method: 'GET',
        url: '/tracks/trending',
        params: { limit, timeframe },
      });

      // Log the full response for inspection
      logger.debug(`getTrendingTracks response: ${JSON.stringify(response)}`);

      if (!response || !response.data || !Array.isArray(response.data)) {
        throw new Error("Invalid response format for trending tracks.");
      }

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
      url: `/users/${userId}/tracks`,
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
      url: `/users/${userId}/followers`,
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
      url: `/users/${userId}/following`,
      params: { limit }
    });
  }

  // **Get Trending Genres**
  async getTrendingGenres(limit: number = 5, timeframe: string = 'week'): Promise<{ genre: string; score: number }[]> {
    try {
      const trendingTracks = await this.getTrendingTracks(100, timeframe); // Fetch more tracks for better genre analysis
      const genres = extractGenres(trendingTracks);
      const topGenres = scoreAndRankGenres(genres);
      logger.debug(`getTrendingGenres processed genres: ${JSON.stringify(topGenres)}`);
      return topGenres;
    } catch (error: unknown) {
      logger.error(`Failed to get trending genres:`, error);
      throw new Error('Failed to retrieve trending genres.');
    }
  }
}

export const globalAudiusApi = new AudiusApi();