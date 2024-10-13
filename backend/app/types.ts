import { ChatOpenAI, ChatOpenAICallOptions } from "@langchain/openai";

export type ComplexityLevel = 'simple' | 'moderate' | 'complex' | string;
export interface QueryClassification {
  type: string;
  isEntityQuery: boolean;
  entityType: string | null;
  entity: string | null;
  complexity: ComplexityLevel; // New property
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
  default_parameters?: { [key: string]: any }; // Made optional
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
  queryType: QueryType | string;
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
  entityType: 'user' | 'track' | 'playlist' | 'genre' | null;
  entity: string | null;
  parameters?: { [key: string]: any }; // Added 'parameters'
  complexity: ComplexityLevel | string;
  multiStepHandled?: boolean;
  initialState?: GraphState;
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


  export type NodeNames = 
  | "extract_category"
  | "get_apis"
  | "select_api"
  | "handle_multi_step_query"
  | "handle_entity_query"
  | "extract_parameters"
  | "verify_params"
  | "create_fetch_request"
  | "process_api_response"
  | "handle_error"
  | "log_final_result"
  | "classify_query";
