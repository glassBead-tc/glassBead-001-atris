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
