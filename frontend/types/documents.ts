import {
  DocumentValidation,
  SemanticVersion,
  DocumentUsageStats
} from './document-relationships.js';

/**
 * Represents the different types of technical documentation in the Audius ecosystem.
 * This type system is designed to categorize documents based on their role in the
 * protocol's technical architecture and governance.
 */
export type AudiusDocumentType = 
  // Core Protocol Documentation
  | 'PROTOCOL_SPEC'      // Foundational protocol architecture and specifications
  | 'GOVERNANCE'         // DAO mechanisms, proposals, and voting systems
  | 'TOKEN_ECONOMICS'    // $AUDIO tokenomics, staking, and rewards
  
  // Developer Integration Documentation
  | 'API_REFERENCE'      // REST API endpoints, parameters, and responses
  | 'SDK_EXAMPLE'        // Implementation examples and integration patterns
  | 'NODE_OPERATION'     // Node deployment, maintenance, and monitoring
  
  // Network Status Documentation
  | 'NODE_STATUS'        // Individual node health and performance metrics
  | 'NETWORK_METRICS';   // Protocol-wide statistics and network health

/**
 * Comprehensive metadata structure for Audius technical documentation.
 * Designed to support:
 * 1. Version-aware documentation retrieval
 * 2. Network context awareness
 * 3. Source tracking and verification
 * 4. Relevance scoring for search results
 */
export interface AudiusMetadata {
  // Essential Document Information
  type: AudiusDocumentType;    // Document category in the Audius ecosystem
  title: string;               // Human-readable document title
  version: string;             // Semantic version (e.g., "1.2.3")
  lastUpdated: string;         // ISO 8601 timestamp
  
  // Document Classification
  category: string[];          // Hierarchical categorization
  tags: string[];              // Flexible tagging system
  
  // Network Context
  nodeId?: string;             // Specific node identifier (if applicable)
  networkEnv?: 'mainnet' | 'testnet' | 'dev';  // Network context
  
  // Document Source Information
  source: {
    url: string;              // Canonical document location
    repository?: string;      // GitHub repository URL
    commit?: string;          // Git commit hash for version tracking
  };
  
  // Search and Retrieval Metrics
  relevance?: {
    score?: number;           // Search relevance score
    context?: string;         // Search context that led to this document
  };
}

/**
 * Complete document structure combining content, metadata, and enhanced features.
 * This interface represents a document as stored in the vector database and
 * as used by the RAG system. It includes support for:
 * 1. Semantic versioning and validation
 * 2. Usage tracking and analytics
 * 3. Vector embeddings for similarity search
 */
export interface AudiusDocument {
  id: string;
  content: string;
  metadata: AudiusMetadata;
  embedding?: number[];
  validation_status?: DocumentValidation;
  version?: SemanticVersion;
  usage_stats?: DocumentUsageStats;
  created_at?: string;
  updated_at?: string;
}
