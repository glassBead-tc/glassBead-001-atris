import { ChatOpenAI } from 'langchain/chat_models/openai';

export interface StateGraph {
  llm: ChatOpenAI;
  query: string | null;
  queryType: string | null;
  categories: string[] | null;
  apis: any[] | null;
  bestApi: any | null;
  parameters: any | null;
  response: any | null;
  complexity: string | null;
  isEntityQuery: boolean | null;
  entityName: string | null;
  entityType: string | null;
  error: string | null;
  formattedResponse: FormattedResponse | null;
  // ... other state properties
}

export interface FormattedResponse {
  natural: string;
  structured: string;
} 