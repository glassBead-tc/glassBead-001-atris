// backend/src/app/services/entity_methods/tracks/trackSDKMethods.ts

import axios from 'axios';
import {
  TracksResponse,
  TrackCommentsResponse,
  StemsResponse,
  FavoritesResponse,
  SearchFullResponse,
  RemixablesResponse,
  RemixingResponse,
  GetTrackRemixesRequest,
  RemixesResponse,
  GetFeelingLuckyTracksRequest,
  GetMostLovedTracksRequest,
  GetNFTGatedTrackSignaturesRequest,
  GetTrendingUSDCPurchaseTracksTimeEnum,
  GetTrendingTracksRequest,
} from '../../../types.js';

export class TrackSDKMethods {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  // Get Track by ID
  public async getTrack(trackId: string): Promise<TracksResponse> {
    const url = `${this.baseUrl}/tracks/${trackId}`;

    try {
      const response = await axios.get<TracksResponse>(url, {
        params: {
          app_name: 'Atris',
        },
        headers: {
          Accept: 'application/json',
          'X-API-KEY': this.apiKey,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching track:', error);
      throw error;
    }
  }

  // Get Track Comments
  public async getTrackComments(trackId: string): Promise<TrackCommentsResponse> {
    const url = `${this.baseUrl}/tracks/${trackId}/comments`;

    try {
      const response = await axios.get<TrackCommentsResponse>(url, {
        params: {
          app_name: 'Atris',
        },
        headers: {
          Accept: 'application/json',
          'X-API-KEY': this.apiKey,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching track comments:', error);
      throw error;
    }
  }

  // Get Track Stems
  public async getTrackStems(trackId: string): Promise<StemsResponse> {
    const url = `${this.baseUrl}/tracks/${trackId}/stems`;

    try {
      const response = await axios.get<StemsResponse>(url, {
        params: {
          app_name: 'Atris',
        },
        headers: {
          Accept: 'application/json',
          'X-API-KEY': this.apiKey,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching track stems:', error);
      throw error;
    }
  }

  // Get Favorite Users of a Track
  public async getTrackFavorites(trackId: string): Promise<FavoritesResponse> {
    const url = `${this.baseUrl}/tracks/${trackId}/favorites`;

    try {
      const response = await axios.get<FavoritesResponse>(url, {
        params: {
          app_name: 'Atris',
        },
        headers: {
          Accept: 'application/json',
          'X-API-KEY': this.apiKey,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching track favorites:', error);
      throw error;
    }
  }

  public async getRemixes(trackId: string): Promise<RemixesResponse> {
    const url = `${this.baseUrl}/tracks/${trackId}/remixes`;

    try {
      const response = await axios.get<RemixesResponse>(url, {
        params: {
          app_name: 'Atris',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching track remixes:', error);
      throw error;
    }
  }

  public async getRemixables(trackId: string): Promise<RemixablesResponse> {
    const url = `${this.baseUrl}/tracks/${trackId}/remixables`;

    try {
      const response = await axios.get<RemixablesResponse>(url, {
        params: {
          app_name: 'Atris',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching track remixables:', error);
      throw error;
    }
  }

  public async searchTracks(query: string): Promise<SearchFullResponse> {
    const url = `${this.baseUrl}/search/tracks`;

    try {
      const response = await axios.get<SearchFullResponse>(url, {
        params: {
          query,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error searching tracks:', error);
      throw error;
    }
  }

  public async getTrendingTracks(request: GetTrendingTracksRequest): Promise<TracksResponse> {
    const url = `${this.baseUrl}/tracks/trending`;

    try {
      const response = await axios.get<TracksResponse>(url, {
        params: request,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching trending tracks:', error);
      throw error;
    }
  }

  public async getRemixesOfTrack(trackId: string): Promise<RemixesResponse> {
    const url = `${this.baseUrl}/tracks/${trackId}/remixing`;

    try {
      const response = await axios.get<RemixesResponse>(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching remixes of track:', error);
      throw error;
    }
  }

  // Additional methods as needed...
}