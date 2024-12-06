// backend/src/app/services/entity_methods/users/userSDKMethods.ts

import axios from 'axios';
import {
  UsersResponse,
  FollowersResponse,
  FollowingResponse,
  GetSupporters,
  SearchKindEnum,
  SearchSortMethodEnum,
  SearchAutocompleteKindEnum,
  SearchAutocompleteSortMethodEnum,
  FullGetSupporters,
  SearchFullResponse,
  GetFavoritesRequest,
} from '../../../types.js';

export class UserSDKMethods {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  // Existing methods...

  // Get User by ID
  async getUser(userId: string): Promise<UsersResponse> {
    const url = `${this.baseUrl}/users/${userId}`;

    try {
      const response = await axios.get<UsersResponse>(url, {
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
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  // Get Followers of a User
  async getUserFollowers(userId: string): Promise<FollowersResponse> {
    const url = `${this.baseUrl}/users/${userId}/followers`;

    try {
      const response = await axios.get<FollowersResponse>(url, {
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
      console.error('Error fetching user followers:', error);
      throw error;
    }
  }

  // Get Users Followed by a User
  async getUserFollowings(userId: string): Promise<FollowingResponse> {
    const url = `${this.baseUrl}/users/${userId}/following`;

    try {
      const response = await axios.get<FollowingResponse>(url, {
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
      console.error('Error fetching user followings:', error);
      throw error;
    }
  }

  async getUserSupporters(userId: string): Promise<FullGetSupporters> {
    const url = `${this.baseUrl}/users/${userId}/supporters`;

    try {
      const response = await axios.get<FullGetSupporters>(url, {
        params: {
          app_name: 'Atris',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user supporters:', error);
      throw error;
    }
  }

  async searchUsers(query: string): Promise<SearchFullResponse> {
    const url = `${this.baseUrl}/search/users`;

    try {
      const response = await axios.get<SearchFullResponse>(url, {
        params: {
          query,
          app_name: 'Atris',
        },
        headers: {
          Accept: 'application/json',
          'X-API-KEY': this.apiKey,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  async getFavoritesRequest(userId: string): Promise<GetFavoritesRequest> {
    const url = `${this.baseUrl}/users/${userId}/favorites`;

    try {
      const response = await axios.get<GetFavoritesRequest>(url, {
        params: {
          app_name: 'Atris',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user favorites:', error);
      throw error;
    }
  }

  // Additional methods as needed...
}