/**
 * Represents the different types of technical documentation in the Audius ecosystem.
 * This type system is designed to categorize documents based on their role in the
 * protocol's technical architecture and governance.
 */
export type AudiusDocumentType = 'PROTOCOL_SPEC' | 'GOVERNANCE' | 'TOKEN_ECONOMICS' | 'API_REFERENCE' | 'SDK_EXAMPLE' | 'NODE_OPERATION' | 'NODE_STATUS' | 'NETWORK_METRICS';
/**
 * Comprehensive metadata structure for Audius technical documentation.
 * Designed to support:
 * 1. Version-aware documentation retrieval
 * 2. Network context awareness
 * 3. Source tracking and verification
 * 4. Relevance scoring for search results
 */
export interface AudiusMetadata {
    type: AudiusDocumentType;
    title: string;
    version: string;
    lastUpdated: string;
    category: string[];
    tags: string[];
    nodeId?: string;
    networkEnv?: 'mainnet' | 'testnet' | 'dev';
    source: {
        url: string;
        repository?: string;
        commit?: string;
    };
    relevanceScore?: number;
    confidenceScore?: number;
}
/**
 * Complete document structure combining content, metadata, and vector representation.
 * This interface represents a document as stored in the vector database and
 * as used by the RAG system.
 */
export interface AudiusDocument {
    id: string;
    content: string;
    metadata: AudiusMetadata;
    embedding?: number[];
}
