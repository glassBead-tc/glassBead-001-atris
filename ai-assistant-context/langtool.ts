// Example from Brace Sproul's "Langtool" LangGraph.js demo
// Link to lecture: https://www.youtube.com/watch?v=xbZzJjBm6t4

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
  