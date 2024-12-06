export interface QueryParameters {
  type: string;
  title: string | null;
  artist: string | null;
  limit: number | null;
  timeframe?: string;
}

export interface QueryIntent {
  category: 'discovery' | 'analysis' | 'research';
  subCategory: string;
  primaryEntity: 'track' | 'playlist' | 'artist' | 'genre';
  parameters: QueryParameters;
  requiredMethods: string[];
}

export interface QueryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    processingTime?: number;
    source?: string;
    confidence?: number;
  };
} 