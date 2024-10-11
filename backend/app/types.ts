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
  categories: string[];
  apis: DatasetSchema[];
  bestApi: DatasetSchema | null;
  params: Record<string, any>;
  response: any;
  error?: string; // Add this line
  formattedResponse?: string;
}

