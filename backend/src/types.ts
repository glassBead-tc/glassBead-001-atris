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

export interface GraphState {
  llm: ChatOpenAI | null;
  query: string | null;
  categories: string[] | null;
  apis: any[] | null;
  bestApi: any | null;
  params: any | null;
  response: any | null;
  error?: string; // Added error property
}

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
