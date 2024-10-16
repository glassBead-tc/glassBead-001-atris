// backend/app/__tests__/helpers/createDefaultGraphState.ts
import { GraphState, QueryType, ComplexityLevel } from '../../types.js';
import { ChatOpenAI } from "@langchain/openai";

export const createDefaultGraphState = (overrides: Partial<GraphState> = {}): GraphState => ({
  llm: {} as ChatOpenAI,
  query: '',
  queryType: 'general' as QueryType,
  categories: [],
  apis: [],
  bestApi: null,
  secondaryApi: null,
  params: {},
  response: null,
  secondaryResponse: null,
  error: false,
  formattedResponse: '',
  message: '',
  isEntityQuery: false,
  entityType: null,
  entity: null,
  parameters: {},
  complexity: 'simple' as ComplexityLevel,
  multiStepHandled: false,
  initialState: undefined,
  ...overrides,
});
