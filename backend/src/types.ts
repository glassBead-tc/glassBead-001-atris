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
  llm: ChatOpenAI; 
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
  error?: string;
};

export type FetchResult = {
  response?: any;
  error?: string;
};
