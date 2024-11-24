import { AudiusDocument, AudiusMetadata } from '../../types/documents.js';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string;
          content: string;
          metadata: AudiusMetadata;
          embedding: number[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          content: string;
          metadata: AudiusMetadata;
          embedding: number[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          content?: string;
          metadata?: AudiusMetadata;
          embedding?: number[];
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      match_documents: {
        Args: {
          query_embedding: number[];
          match_threshold: number;
          match_count: number;
          filter?: Json;
        };
        Returns: {
          id: string;
          content: string;
          metadata: AudiusMetadata;
          similarity: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
