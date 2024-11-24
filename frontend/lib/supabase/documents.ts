/**
 * Audius Documentation Operations
 * 
 * This module provides high-level operations for interacting with the Audius
 * documentation system. It includes:
 * 1. Semantic search with filtering
 * 2. Real-time document subscriptions
 * 3. Type-specific document retrieval
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import { AudiusDocument, AudiusMetadata } from '../../types/documents.js';
import { supabase } from './client.js';
import { Json } from './types.js';

// Initialize OpenAI embeddings for semantic search
const embeddings = new OpenAIEmbeddings();

/**
 * Performs semantic search over Audius documentation with optional filters.
 * 
 * @param query - The search query to embed and match against documents
 * @param filters - Optional filters to narrow search results
 * @param limit - Maximum number of documents to return (default: 6)
 * @returns Promise<AudiusDocument[]> - Matched documents with similarity scores
 * 
 * Example:
 * ```typescript
 * const docs = await searchDocuments("How to stake AUDIO tokens?", {
 *   type: ['TOKEN_ECONOMICS'],
 *   networkEnv: 'mainnet'
 * });
 * ```
 */
export async function searchDocuments(
  query: string,
  filters?: {
    type?: string[];           // Filter by document type
    version?: string;          // Filter by protocol version
    category?: string[];       // Filter by document category
    networkEnv?: 'mainnet' | 'testnet' | 'dev';  // Filter by network
  },
  limit: number = 6
): Promise<AudiusDocument[]> {
  // Generate embedding for the search query
  const queryEmbedding = await embeddings.embedQuery(query);

  // Construct metadata filter for Supabase RPC call
  const filterMetadata: Record<string, any> = {};
  if (filters?.type) {
    filterMetadata.type = filters.type;
  }
  if (filters?.version) {
    filterMetadata.version = filters.version;
  }
  if (filters?.category) {
    filterMetadata.category = filters.category;
  }
  if (filters?.networkEnv) {
    filterMetadata.networkEnv = filters.networkEnv;
  }

  // Execute similarity search with filters
  const { data: matches, error } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: limit,
    filter: Object.keys(filterMetadata).length > 0 ? filterMetadata as Json : null
  });

  if (error) {
    console.error('Error searching documents:', error);
    throw error;
  }

  // Transform and return matched documents
  return matches.map(match => ({
    id: match.id,
    content: match.content,
    metadata: match.metadata,
    relevanceScore: match.similarity
  }));
}

/**
 * Subscribes to real-time document updates.
 * Useful for:
 * - Keeping documentation displays current
 * - Updating node status information
 * - Reflecting governance changes
 * 
 * @param callback - Function to handle document updates
 * @returns Cleanup function to unsubscribe
 * 
 * Example:
 * ```typescript
 * const cleanup = await subscribeToDocumentUpdates((doc) => {
 *   console.log('Document updated:', doc.metadata.title);
 * });
 * // Later: cleanup();
 * ```
 */
export async function subscribeToDocumentUpdates(
  callback: (document: AudiusDocument) => void
) {
  const subscription = supabase
    .channel('document_updates')
    .on(
      'postgres_changes',
      {
        event: '*',           // Listen for all changes (insert, update, delete)
        schema: 'public',
        table: 'documents'
      },
      (payload) => {
        const document = payload.new as AudiusDocument;
        callback(document);
      }
    )
    .subscribe();

  // Return cleanup function
  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Retrieves documents of a specific type.
 * Useful for:
 * - Loading documentation sections
 * - Populating type-specific views
 * - Initial content loading
 * 
 * @param type - The type of documents to retrieve
 * @param limit - Maximum number of documents to return
 * @returns Promise<AudiusDocument[]>
 * 
 * Example:
 * ```typescript
 * const apiDocs = await getDocumentsByType('API_REFERENCE');
 * ```
 */
export async function getDocumentsByType(
  type: AudiusMetadata['type'],
  limit: number = 10
): Promise<AudiusDocument[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('metadata->>type', type)
    .limit(limit);

  if (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }

  return data as AudiusDocument[];
}
