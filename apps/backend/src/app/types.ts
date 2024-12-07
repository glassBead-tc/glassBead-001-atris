import { ChatOpenAI } from '@langchain/openai';
import { 
  User, 
  Playlist, 
  Track, 
  TracksResponse,
  TrackCommentsResponse,
  UsersResponse,
  PlaylistResponse,
  StemsResponse,
  Reposts,
  FavoritesResponse,
  FollowersResponse,
  FollowingResponse,
  RemixersResponse,
  GetSupporters,
  GetTrendingPlaylistsRequest,
  TrendingPlaylistsResponse,
  GetTrendingPlaylistsTimeEnum,
} from "@audius/sdk";
import { SearchFullResponse, 
  RemixablesResponse, 
  RemixingResponse, 
  SearchModel, 
  RemixNotification, 
  FullRemix, 
  UserFull, 
  PlaylistFull, 
  TrackFull,
  RemixesResponse,
  PlaylistAddedTimestamp,
  PlaylistArtwork,
  PlaylistLibrary,
  FullPlaylistResponse,
  FullGetSupporters,
} from "@audius/sdk/dist/sdk/api/generated/full/models";
import { SearchKindEnum, SearchAutocompleteKindEnum, SearchSortMethodEnum, SearchRequest, SearchAutocompleteRequest, SearchAutocompleteSortMethodEnum } from '@audius/sdk/dist/sdk/api/generated/full/apis/SearchApi.js';
import { GetTrendingTracksTimeEnum,
  GetBulkTracksRequest,
  GetFeelingLuckyTracksRequest,
  GetMostLovedTracksRequest,
  GetNFTGatedTrackSignaturesRequest,
  GetTrendingUSDCPurchaseTracksTimeEnum,
  GetTrackRemixesRequest,
 } from '@audius/sdk/dist/sdk/api/generated/full/apis/TracksApi.js';
import { GetTrendingTracksRequest, GetFavoritesRequest } from '@audius/sdk/dist/sdk/api/generated/full/apis';
import { Messages, END } from '@langchain/langgraph'
import { MinimalAudiusSDK } from './services/sdkClient.js';

export type {
  SearchFullResponse, 
  RemixablesResponse, 
  RemixingResponse, 
  SearchModel, 
  RemixNotification, 
  FullRemix, 
  UserFull, 
  PlaylistFull, 
  TrackFull,
  RemixesResponse,
  PlaylistAddedTimestamp,
  PlaylistArtwork,
  PlaylistLibrary,
  PlaylistResponse,
  FullPlaylistResponse,
  FullGetSupporters,
  SearchKindEnum, 
  SearchAutocompleteKindEnum, 
  SearchSortMethodEnum, 
  SearchRequest, 
  SearchAutocompleteRequest, 
  SearchAutocompleteSortMethodEnum,
  GetTrendingTracksTimeEnum,
  GetBulkTracksRequest,
  GetFeelingLuckyTracksRequest,
  GetMostLovedTracksRequest,
  GetNFTGatedTrackSignaturesRequest,
  GetTrendingUSDCPurchaseTracksTimeEnum,
  GetTrackRemixesRequest,
  GetTrendingTracksRequest,
  GetFavoritesRequest,
  FollowersResponse,
  FollowingResponse,
  RemixersResponse,
  GetSupporters,
  GetTrendingPlaylistsRequest,
  TrendingPlaylistsResponse,
  GetTrendingPlaylistsTimeEnum,
  User, 
  Playlist, 
  Track, 
  FavoritesResponse,
  UsersResponse,
  TracksResponse,
  TrackCommentsResponse,
  StemsResponse,
  Reposts,
}

// Define property types first
export type TrackProperty = 'playCount' | 'repostCount' | 'favoriteCount' | 'genre';
export type UserProperty = 'followerCount' | 'trackCount' | 'playlistCount';
export type PlaylistProperty = 'trackCount' | 'repostCount' | 'favoriteCount';

export type ApiResponse = 
  | TracksResponse 
  | UsersResponse 
  | PlaylistResponse
  | TrackCommentsResponse
  | StemsResponse
  | Reposts
  | FavoritesResponse;

export type ComplexityLevel = 
  | 'simple'
  | 'moderate'
  | 'complex';

export type QueryCategorization = {
  queryType: QueryType;
  isEntityQuery: boolean;
  entityType: EntityType;
  complexity: ComplexityLevel;
  entityName: string | null;
}

// Base interface for API endpoints
export interface ApiEndpoint {
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
    data: any;
  };
  api_url: string;
}

export interface AudiusCorpus {
  endpoints: ApiEndpoint[];
}

export type ErrorState = {
  code: string;
  message: string;
  suggestion?: string;
  timestamp: number;
  node: string;
}

export interface GraphState {
  llm: ChatOpenAI | null;
  query: string | null;
  queryType: QueryType | null;
  categories: string[] | null;
  apis: ApiEndpoint[] | null;
  bestApi: ApiEndpoint | null;
  parameters: Record<string, any> | null;
  response: ApiResponse | null;
  formattedResponse: string | null;
  complexity: ComplexityLevel | null;
  isEntityQuery: boolean | null;
  entityName: string | null;
  entityType: EntityType | null;
  error: ErrorState | null;
  errorHistory: ErrorState[];
  messages: Messages | null;
  messageHistory: Messages[];
  secondaryApi: ApiEndpoint | null;
  secondaryResponse: string | null;
  sdk: MinimalAudiusSDK | null;
  initialized: boolean | null;
  sdkInitialized: boolean | null;
  sdkConfig: {
    apiKey: string | null;
    baseUrl: string | null;
    initialized: boolean | null;
  };
}

export type QueryType =
  | 'general'
  | 'trending_tracks'
  | 'trending_playlists'
  | 'tracks'
  | 'users'
  | 'playlists'
  | 'genre_info';

export type EntityType = 'track' | 'user' | 'playlist' | null;

// Type guard functions
export function isTrackProperty(prop: string): prop is TrackProperty {
  return ['playCount', 'repostCount', 'favoriteCount', 'genre'].includes(prop);
}

export function isUserProperty(prop: string): prop is UserProperty {
  return ['followerCount', 'trackCount', 'playlistCount'].includes(prop);
}

export function isPlaylistProperty(prop: string): prop is PlaylistProperty {
  return ['trackCount', 'repostCount', 'favoriteCount'].includes(prop);
}

// Update entity type mapping
export const wordToPropertyMap: Record<string, TrackProperty | UserProperty | PlaylistProperty> = {
  'play': 'playCount',
  'plays': 'playCount',
  'follower': 'followerCount',
  'followers': 'followerCount',
  'song': 'trackCount',
  'songs': 'trackCount',
  'track': 'trackCount',
  'tracks': 'trackCount',
  'genre': 'genre',
  'repost': 'repostCount',
  'reposts': 'repostCount',
  'favorite': 'favoriteCount',
  'favorites': 'favoriteCount'
} as const;

export interface AudiusCorpus {
  endpoints: ApiEndpoint[];
}

export const initialGraphState: GraphState = {
  llm: null,
  query: null,
  queryType: null,
  categories: null,
  apis: null,
  bestApi: null,
  secondaryApi: null,
  response: null,
  secondaryResponse: null,  
  error: null as ErrorState | null,
  errorHistory: [],
  formattedResponse: null,
  messages: null,
  messageHistory: [],
  isEntityQuery: false,
  entityName: null,
  parameters: null,
  complexity: null,
  initialized: null,
  sdkInitialized: null,
  sdkConfig: {
    apiKey: null,
    baseUrl: null,
    initialized: null
  },
  sdk: null,
  entityType: null,
};

export type NodeNames =
  | '__start__'
  | '__end__'
  | 'extract_category_node' 
  | 'get_apis_node' 
  | 'select_api_node' 
  | 'extract_params_node'
  | 'execute_request_node'
  | 'reset_state_node';

export type StateDefinition = {
  [key in NodeNames]: GraphState;
};

export interface SelectAPIResponse {
  api: ApiEndpoint;
  parameters: Record<string, any>;
  error: boolean | null;
}

// This extends ApiEndpoint but adds fields that conflict with SDK types
export interface DatasetSchema extends ApiEndpoint {
  description: string;
  parameters: {
    required: string[];
    optional: string[];
  };
  endpoint: string;
}
