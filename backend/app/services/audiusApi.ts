import axios, { AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';
import { logger } from '../logger.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 429 && retries < MAX_RETRIES) {
        logger.warn(`Rate limit hit, retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return this.request(config, retries + 1);
      }
      if (axios.isAxiosError(error)) {
        logger.error(`API Error occurred: ${error.response?.status} ${error.response?.statusText}`);
        const errorMessage = this.extractErrorMessage(error);
        throw new Error(`API Error: ${errorMessage}`);
      }
      throw error;
    }
  }

  private extractErrorMessage(error: AxiosError): string {
    if (error.response?.data && typeof error.response.data === 'object') {
      const data = error.response.data as Record<string, unknown>;
      if ('message' in data && typeof data.message === 'string') {
        return data.message;
      }
    }
    return error.message || 'Unknown error';
  }

  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testing API connection...');
      const response = await this.request<ApiResponse<any[]>>({
        method: 'GET',
        url: '/tracks/trending',
        params: { limit: 1 }
      });
      logger.info('API request successful.');
      return response && response.data && response.data.length > 0;
    } catch (error: unknown) {
      logger.error('Error testing API connection:', error);
      return false;
    }
  }

  async searchUsers(query: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    return this.request<ApiResponse<any[]>>({
      method: 'GET',
      url: '/users/search',
      params: { query, limit }
    });
  }

  async getUserById(userId: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>({
      method: 'GET',
      url: `/users/${userId}`,
    });
  }

  async searchTracks(query: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    return this.request<ApiResponse<any[]>>({
      method: 'GET',
      url: '/tracks/search',
      params: { query, limit }
    });
  }

  async getTrackById(trackId: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>({
      method: 'GET',
      url: `/tracks/${trackId}`,
    });
  }

  async searchPlaylists(query: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    return this.request<ApiResponse<any[]>>({
      method: 'GET',
      url: '/playlists/search',
      params: { query, limit }
    });
  }

  async getPlaylistById(playlistId: string): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>({
      method: 'GET',
      url: `/playlists/${playlistId}`,
    });
  }

  async getTrendingTracks(limit: number = 3): Promise<ApiResponse<any[]>> {
    return this.request<ApiResponse<any[]>>({
      method: 'GET',
      url: '/tracks/trending',
      params: { limit }
    });
  }

  async getUserTracks(userId: string, limit: number = 10): Promise<ApiResponse<any[]>> {
    return this.request<ApiResponse<any[]>>({
      method: 'GET',
      url: `/users/${userId}/tracks`,
      params: { limit }
    });
  }

  async getUserFollowing(userId: string, limit: number): Promise<any> {
    return this.request<ApiResponse<any[]>>({
      method: 'GET',
      url: `/users/${userId}/following`,
      params: { limit }
    });
  }

  async getUserFollowers(userId: string, limit: number): Promise<any> {
    return this.request<ApiResponse<any[]>>({
      method: 'GET',
      url: `/users/${userId}/followers`,
      params: { limit }
    });
  }
}

export const globalAudiusApi = new AudiusApi();
