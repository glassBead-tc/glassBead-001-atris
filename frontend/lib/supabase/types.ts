import { AudiusDocument, AudiusMetadata } from '../../types/documents.js';
import {
  DocumentRelationship,
  DocumentValidation,
  DocumentChange,
  VersionCompatibility,
  DocumentUsageStats,
  SemanticVersion
} from '../../types/document-relationships.js';

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
          validation_status: DocumentValidation;
          version: SemanticVersion;
          usage_stats: DocumentUsageStats;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          content: string;
          metadata: AudiusMetadata;
          embedding: number[];
          validation_status?: DocumentValidation;
          version?: SemanticVersion;
          usage_stats?: DocumentUsageStats;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          content?: string;
          metadata?: AudiusMetadata;
          embedding?: number[];
          validation_status?: DocumentValidation;
          version?: SemanticVersion;
          usage_stats?: DocumentUsageStats;
          created_at?: string;
          updated_at?: string;
        };
      };
      document_relationships: {
        Row: {
          id: string;
          source_id: string;
          target_id: string;
          relationship_type: DocumentRelationship['type'];
          metadata: DocumentRelationship['metadata'];
          created_at: string;
        };
        Insert: {
          id?: string;
          source_id: string;
          target_id: string;
          relationship_type: DocumentRelationship['type'];
          metadata?: DocumentRelationship['metadata'];
          created_at?: string;
        };
        Update: {
          id?: string;
          source_id?: string;
          target_id?: string;
          relationship_type?: DocumentRelationship['type'];
          metadata?: DocumentRelationship['metadata'];
          created_at?: string;
        };
      };
      document_changes: {
        Row: {
          id: string;
          document_id: string;
          change_data: DocumentChange;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          change_data: DocumentChange;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          change_data?: DocumentChange;
          created_at?: string;
        };
      };
      version_compatibility: {
        Row: {
          id: string;
          document_id: string;
          compatibility_data: VersionCompatibility;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          compatibility_data: VersionCompatibility;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          compatibility_data?: VersionCompatibility;
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
        Returns: Array<{
          id: string;
          content: string;
          metadata: AudiusMetadata;
          similarity: number;
          validation_status: DocumentValidation;
          version: SemanticVersion;
          usage_stats: DocumentUsageStats;
        }>;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
