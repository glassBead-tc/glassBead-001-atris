import { ChatOpenAI, ChatOpenAICallOptions } from "@langchain/openai";

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
}

export interface DatasetParameters {
  name: string;
  type: string;
  description: string;
  default: string;
}

export interface GraphState {
  llm: ChatOpenAI<ChatOpenAICallOptions>;
  query: string;
  queryType: QueryType;
  categories: string[];
  apis: DatasetSchema[];
  bestApi: DatasetSchema | null;
  secondaryApi?: DatasetSchema | null;
  params: Record<string, any>;
  response: any;
  secondaryResponse?: any;  // Add only this line
  error?: string | null;
  formattedResponse?: string;
  message: string | null;
  isEntityQuery?: boolean;
  entityType: 'user' | 'track' | 'playlist' | null;
  entity: string | null;
}

export type QueryType =
  | 'trending_tracks'
  | 'search_tracks'
  | 'user_social'
  | 'user_info'
  | 'user_tracks'
  | 'user_playlists'
  | 'playlist_info'
  | 'track_info'
  | 'genre_info'
  | 'playback'
  | 'company_info'  // New type for queries about Audius as a company
  | 'general';
