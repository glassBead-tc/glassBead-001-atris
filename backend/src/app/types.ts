import { TrackArtwork, User, ProfilePicture, CoverPhoto, Playlist, PlaylistAddedTimestamp, PlaylistArtwork, Access } from "@audius/sdk";
import { ChatOpenAI, ChatOpenAICallOptions } from "@langchain/openai";

export type ComplexityLevel = 'simple' | 'moderate' | 'complex';
export type AudiusData = TrackData | UserData | PlaylistData | PopularTrackData | NoMatchData | null;

export type QueryCategorization = {
  queryType: QueryType;
  isEntityQuery: boolean;
  entityType: EntityType;
  complexity: ComplexityLevel;
  entityName: string | null;
}

export interface DatasetSchema {
  id: string;
  category_name: string;
  tool_name: string;
  api_name: string;
  api_description: string;
  required_parameters: DatasetParameters[];
  optional_parameters: DatasetParameters[];
  method: string;
  template_response?: Record<string, any>;
  api_url: string;
  parameters?: Record<string, any>;
  default_parameters?: { [key: string]: any };
}

export interface DatasetParameters {
  name: string;
  type: string;
  description: string;
  default: string;
}

export interface GraphState {
  llm: ChatOpenAI | null;
  query: string | null;
  queryType: string | null;
  categories: string[] | null;
  apis: DatasetSchema[] | null;
  bestApi: DatasetSchema | null;
  params: Record<string, string> | null;
  response: any | null;
  complexity: string | null;
  isEntityQuery: boolean;
  entityName: string | null;
  entityType: EntityType | null;
  parameters: Record<string, any> | null;
  error: boolean;
  selectedHost: string | null;
  entity: AudiusData | null;
  secondaryApi: DatasetSchema | null;
  secondaryResponse: any | null;
  multiStepHandled: boolean;
  initialState: GraphState | null;
  formattedResponse: string | null;
  message: string | null;
  trackData: any | null;
}

export type QueryType =
  | 'trending_tracks'
  | 'search_tracks'
  | 'search_users'
  | 'search_playlists'
  | 'search_genres'
  | 'genre_info'
  | 'entity_query'
  | 'playlist_info'
  | 'general';

export type EntityType = 'track' | 'user' | 'playlist' | null;

export type TrackData = {
  id: string;
  type: 'track';
  title: string;
  artwork: TrackArtwork;  
  description: string | null;
  genre: string;
  mood: string | null;
  releaseDate: string | null;
  remixOf: TrackData | null;
  repostCount: number;
  favoriteCount: number;
  commentCount: number;
  tags: string[] | null;
  user: User;
  duration: number;
  isDownloadable: boolean;
  playCount: number;
  permalink: string;
  isStreamable: boolean;
};

export type UserData = {
  id: string;
  type: 'user';
  name: string;
  handle: string;
  bio: string | null;
  followerCount: number;
  followeeCount: number;
  trackCount: number;
  playlistCount: number;
  albumCount: number;
  isVerified: boolean;
  profilePicture: ProfilePicture;
  coverPhoto: CoverPhoto;
  twitterHandle: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  website: string | null;
  location: string | null;
  isDeactivated: boolean;
  isAvailable: boolean;
  supporterCount: number;
  supportingCount: number;
  totalAudioBalance: number;
};

export interface PlaylistData {
  id: string;
  playlistName: string;
  description?: string;
  isAlbum: boolean;
  trackCount: number;
  totalPlayCount: number;
  repostCount: number;
  favoriteCount: number;
  user: User;
  playlistContents: Array<PlaylistAddedTimestamp>;
  artwork?: PlaylistArtwork;
  permalink: string;
  isImageAutogenerated: boolean;
  access: Access;
  ddexApp?: string;
  upc?: string;
  tracks: TrackData[];
}
  
export interface PopularTrackData {
    type: 'popularTrack';
    data: {
      rank: number;
      title: string;
      artist: string;
      playCount: number;
      duration: number;
      genre: string;
      mood?: string;
      releaseDate?: string;
  };
}
  
export interface NoMatchData {
    type: 'noMatch';
    data: {
      searchedTrack: string;
      searchedArtist: string;
    availableTracks: { title: string; artist: string; playCount: number }[];
  };
}
/**
 * Type guard to check if an object is of type UserData.
 * @param entity - The entity to check.
 * @returns True if entity is UserData, else false.
 */
export function isUserData(entity: any): entity is UserData {
  return entity && typeof entity === 'object' && 'name' in entity;
}

/**
 * Type guard to check if an object is of type TrackData.
 * @param entity - The entity to check.
 * @returns True if entity is TrackData, else false.
 */
export function isTrackData(entity: any): entity is TrackData {
  return entity && typeof entity === 'object' && 'title' in entity;
}

/**
 * Type guard to check if an object is of type PlaylistData.
 * @param entity - The entity to check.
 * @returns True if entity is PlaylistData, else false.
 */
export function isPlaylistData(entity: any): entity is PlaylistData {
  return entity && typeof entity === 'object' && 'playlistName' in entity;
}

// Additional helper functions and type definitions...

export const initialGraphState: GraphState = {
  llm: null,
  query: null,
  queryType: null,
  categories: null,
  apis: null,
  bestApi: null,
  secondaryApi: null,
  params: null,
  response: null,
  secondaryResponse: null,  
  error: false,
  formattedResponse: null,
  message: null,
  isEntityQuery: false,
  entityName: null,
  entity: null,
  parameters: null,
  complexity: null,
  multiStepHandled: false, 
  initialState: null,
  entityType: null,
  selectedHost: null,
  trackData: null
};

export type NodeNames =
  | '__start__'
  | '__end__'
  | 'categorize_query'
  | 'extract_category'
  | 'get_apis'
  | 'select_api'
  | 'extract_parameters'
  | 'verify_params'
  | 'request_params'
  | 'create_fetch_request'
  | 'process_api_response'
  | 'format_results'
  | 'error_handler'
  | 'multi_step_query';

export type StateDefinition = {
  [key in NodeNames]: GraphState;
};

export interface SelectAPIResponse {
  api: DatasetSchema;
  parameters: Record<string, any>;
  error: boolean | null;
}

interface ApiEndpoint {
  id: string;
  category_name: string;
  tool_name: string;
  api_name: string;
  api_description: string;
  required_parameters: Array<{
    name: string;
    type: string;
    description: string;
    default: string;
  }>;
  optional_parameters: Array<{
    name: string;
    type: string;
    description: string;
    default: string;
  }>;
  method: string;
  template_response: {
    data: any; // Adjust this type based on your actual data structure
  };
  api_url: string;
}

export interface AudiusCorpus {
  endpoints: ApiEndpoint[];
}
