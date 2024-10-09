import { ChatOpenAI } from "@langchain/openai";

export type DatasetParameters = {
  name: string;
  type: string;
  description: string;
  default: string;
};

export interface DatasetSchema {
  id: string;
  category_name: string;
  tool_name: string;
  api_name: string;
  api_description: string;
  required_parameters: DatasetParameters[];
  optional_parameters: DatasetParameters[];
  method: string;
  template_response: Record<string, any>;
  api_url: string;
}

export interface ApiEndpoint {
  id: string;
  category_name: string;
  tool_name: string;
  api_name: string;
  api_description: string;
  required_parameters: string[];
  optional_parameters: string[];
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  template_response: any; // This could be more specific if we know the exact structure
  api_url: string;
}

export type GraphState = {
  /**
   * The LLM to use for the graph
   */
  llm: ChatOpenAI | null; 
  /**
   * The query to extract an API for
   */
  query: string;
  /**
   * The relevant API categories for the query
   */
  categories: string[] | null;
  /**
   * The relevant APIs from the categories
   */
  apis: DatasetSchema[] | null;
  /**
   * The most relevant API for the query
   */
  bestApi: DatasetSchema | null;
  /**
   * The params for the API call
   */
  params: Record<string, string>;
  /**
   * The API response
   */
  response: Record<string, any> | null;
  /**
   * Full playlist details when fetching a specific playlist
   */
  fullPlaylistDetails?: any; // Add this line
  fullUserDetails?: any; // Add this line
  fullTrackDetails?: any; // Add this line
  error?: string;
};

export type FetchResult = {
  response?: any;
  error?: string;
};

export interface TracksResponse {
  data: Track[];
}

export interface Track {
  artwork: {
    '150x150': string;
    '480x480': string;
    '1000x1000': string;
  };
  description: string;
  genre: string;
  id: string;
  track_cid: string;
  preview_cid: string | null;
  orig_file_cid: string;
  orig_filename: string;
  is_original_available: boolean;
  mood: string | null;
  release_date: string;
  remix_of: {
    tracks: { parent_track_id: string }[] | null;
  };
  repost_count: number;
  favorite_count: number;
  tags: string;
  title: string;
  user: User;
  duration: number;
  is_downloadable: boolean;
  play_count: number;
  permalink: string;
  is_streamable: boolean;
  ddex_app: string | null;
  playlists_containing_track: number[];
}

export interface User {
  album_count: number;
  artist_pick_track_id: string | null;
  bio: string;
  cover_photo: {
    '640x': string;
    '2000x': string;
  };
  followee_count: number;
  follower_count: number;
  handle: string;
  id: string;
  is_verified: boolean;
  location: string;
  name: string;
  playlist_count: number;
  profile_picture: {
    '150x150': string;
    '480x480': string;
    '1000x1000': string;
  };
  repost_count: number;
  track_count: number;
  is_deactivated: boolean;
  is_available: boolean;
  wallet: string;
}

// Add any other necessary interfaces
