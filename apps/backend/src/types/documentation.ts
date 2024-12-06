import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseStorageAdapter } from '../storage/supabase-adapter.js';  // You'll need to generate this using Supabase CLI

export type DocumentSourceType = 'web' | 'github' | 'local' | 'api';
export type DocumentSourceStatus = 'active' | 'archived' | 'processing';
export type VersionStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type IngestionStatus = 'started' | 'processing' | 'completed' | 'failed';

export interface BaseSourceConfig {
    baseUrl?: string;
    rateLimit?: number;
    headers?: Record<string, string>;
    auth?: {
        type: string;
        credentials: Record<string, string>;
    };
}

export interface WebSourceConfig extends BaseSourceConfig {
    crawlRules: {
        pattern: string;
        depth: number;
        selector?: string;
    }[];
    excludePatterns?: string[];
}

export interface GithubSourceConfig extends BaseSourceConfig {
    owner: string;
    repo: string;
    branch?: string;
    paths?: string[];
}

export interface LocalSourceConfig extends BaseSourceConfig {
    path: string;
    patterns: string[];
    exclude?: string[];
}

export interface ApiSourceConfig extends BaseSourceConfig {
    endpoints: {
        url: string;
        method: string;
        params?: Record<string, string>;
    }[];
}

export interface DocumentationSource {
    id: string;
    name: string;
    type: DocumentSourceType;
    config: WebSourceConfig | GithubSourceConfig | LocalSourceConfig | ApiSourceConfig;
    lastUpdated: Date;
    version?: string;
    status: DocumentSourceStatus;
    createdAt: Date;
}

export interface DocumentationChunk {
    id: string;
    sourceId: string;
    content: string;
    embedding: number[];
    metadata: Record<string, any>;
    url?: string;
    chunkIndex?: number;
    parentChunkId?: string;
    createdAt: Date;
    updatedAt: Date;
    hash: string;
}

export interface DocumentationVersion {
    id: string;
    sourceId: string;
    version: string;
    timestamp: Date;
    changesSummary?: Record<string, any>;
    status: VersionStatus;
}

export interface IngestionLog {
    id: string;
    sourceId: string;
    versionId?: string;
    status: IngestionStatus;
    details?: Record<string, any>;
    error?: string;
    startedAt: Date;
    completedAt?: Date;
    duration?: string;
}

export interface SearchParams {
    query: string;
    threshold?: number;
    limit?: number;
    sourceIds?: string[];
    metadata?: Record<string, any>;
}

export interface SearchResult {
    id: string;
    content: string;
    metadata: Record<string, any>;
    url?: string;
    similarity: number;
}

export interface StorageConfig {
    supabaseUrl: string;
    supabaseKey: string;
    documentsTable?: string;
    sourcesTable?: string;
    versionsTable?: string;
    logsTable?: string;
}
