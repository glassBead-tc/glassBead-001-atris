import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
    DocumentationSource,
    DocumentationChunk,
    DocumentationVersion,
    IngestionLog,
    SearchParams,
    SearchResult,
    StorageConfig
} from '../types/documentation.js';
import crypto from 'crypto';

export class SupabaseStorageAdapter {
    private client: SupabaseClient; 
    private config: StorageConfig;

    constructor(config: StorageConfig) {
        this.config = {
            documentsTable: 'documentation_chunks',
            sourcesTable: 'documentation_sources',
            versionsTable: 'documentation_versions',
            logsTable: 'ingestion_logs',
            ...config
        };
        this.client = createClient(config.supabaseUrl, config.supabaseKey);
    }

    private generateHash(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    async addSource(source: Omit<DocumentationSource, 'id' | 'createdAt'>): Promise<DocumentationSource> {
        const { data, error } = await this.client
            .from(this.config.sourcesTable!)
            .insert([source])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateSource(id: string, updates: Partial<DocumentationSource>): Promise<DocumentationSource> {
        const { data, error } = await this.client
            .from(this.config.sourcesTable!)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async storeChunks(chunks: Omit<DocumentationChunk, 'id' | 'createdAt' | 'updatedAt' | 'hash'>[]): Promise<DocumentationChunk[]> {
        const chunksWithHash = chunks.map(chunk => ({
            ...chunk,
            hash: this.generateHash(chunk.content)
        }));

        const { data, error } = await this.client
            .from(this.config.documentsTable!)
            .upsert(chunksWithHash, {
                onConflict: 'source_id,hash',
                ignoreDuplicates: false
            })
            .select();

        if (error) throw error;
        return data;
    }

    async search({ query, threshold = 0.7, limit = 10, sourceIds, metadata }: SearchParams): Promise<SearchResult[]> {
        // Assuming the query is already an embedding
        const queryEmbedding = Array.isArray(query) ? query : [];
        
        let rpcQuery = this.client
            .rpc('match_documents', {
                query_embedding: queryEmbedding,
                match_threshold: threshold,
                match_count: limit,
                source_filter: sourceIds
            });

        if (metadata) {
            // Add metadata filters if provided
            Object.entries(metadata).forEach(([key, value]) => {
                rpcQuery = rpcQuery.contains(`metadata->${key}`, value);
            });
        }

        const { data, error } = await rpcQuery;

        if (error) throw error;
        return data;
    }

    async createVersion(version: Omit<DocumentationVersion, 'id' | 'timestamp'>): Promise<DocumentationVersion> {
        const { data, error } = await this.client
            .from(this.config.versionsTable!)
            .insert([version])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async logIngestion(log: Omit<IngestionLog, 'id' | 'startedAt' | 'duration'>): Promise<IngestionLog> {
        const { data, error } = await this.client
            .from(this.config.logsTable!)
            .insert([log])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateIngestionLog(id: string, updates: Partial<IngestionLog>): Promise<IngestionLog> {
        const { data, error } = await this.client
            .from(this.config.logsTable!)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getSourceById(id: string): Promise<DocumentationSource | null> {
        const { data, error } = await this.client
            .from(this.config.sourcesTable!)
            .select()
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    async getChunksBySourceId(sourceId: string): Promise<DocumentationChunk[]> {
        const { data, error } = await this.client
            .from(this.config.documentsTable!)
            .select()
            .eq('source_id', sourceId);

        if (error) throw error;
        return data;
    }

    async deleteSource(id: string): Promise<void> {
        const { error } = await this.client
            .from(this.config.sourcesTable!)
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async getIngestionLogs(sourceId: string): Promise<IngestionLog[]> {
        const { data, error } = await this.client
            .from(this.config.logsTable!)
            .select()
            .eq('source_id', sourceId)
            .order('started_at', { ascending: false });

        if (error) throw error;
        return data;
    }
}
