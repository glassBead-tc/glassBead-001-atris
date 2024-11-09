import type { EntityMetrics } from './EntityInterfaces.js';

export interface FormattedResponse {
  text: string;
  data?: any;
  suggestions?: string[];
  relatedQueries?: string[];
}

export interface AnalysisResponse extends FormattedResponse {
  metrics: {
    [key: string]: number;
  };
  insights: string[];
  confidence: number;
}

export interface EntityResponse extends FormattedResponse {
  entity: {
    type: 'track' | 'playlist' | 'artist' | 'genre';
    id: string;
    name: string;
  };
  metrics: EntityMetrics;
} 