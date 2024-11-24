/**
 * Audius Documentation Operations
 * 
 * This module provides high-level operations for interacting with the Audius
 * documentation system. It includes:
 * 1. Document management with versioning and validation
 * 2. Semantic search with advanced filtering
 * 3. Document relationships and change tracking
 * 4. Usage statistics and analytics
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import { AudiusDocument, AudiusMetadata } from '../../types/documents.js';
import { supabase } from './client.js';
import { Json } from './types.js';
import {
  DocumentRelationship,
  DocumentValidation,
  DocumentChange,
  VersionCompatibility,
  DocumentUsageStats,
  SemanticVersion
} from '../../types/document-relationships.js';

// Initialize OpenAI embeddings for semantic search
const embeddings = new OpenAIEmbeddings();

/**
 * Stores a document with validation and versioning.
 */
export async function storeDocument(
  doc: AudiusDocument,
  validation?: DocumentValidation,
  version?: SemanticVersion
): Promise<string> {
  const embedding = await embeddings.embedQuery(doc.content);
  
  const { data, error } = await supabase
    .from('documents')
    .insert({
      content: doc.content,
      metadata: doc.metadata,
      embedding,
      validation_status: validation,
      version: version || {
        major: 1,
        minor: 0,
        patch: 0
      },
      usage_stats: {
        views: 0,
        uniqueUsers: 0,
        averageRating: 0,
        helpfulCount: 0,
        lastAccessed: new Date().toISOString(),
        searchImpressions: 0,
        searchClicks: 0,
        codeImplementations: 0,
        metadata: {
          userSegments: {},
          referrers: {},
          timeOnPage: 0,
          bounceRate: 0
        }
      }
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Creates a relationship between two documents.
 */
export async function createDocumentRelationship(
  relationship: DocumentRelationship
): Promise<void> {
  const { error } = await supabase
    .from('document_relationships')
    .insert({
      source_id: relationship.sourceId,
      target_id: relationship.targetId,
      relationship_type: relationship.type,
      metadata: relationship.metadata
    });

  if (error) throw error;
}

/**
 * Records a change to a document.
 */
export async function recordDocumentChange(change: DocumentChange): Promise<void> {
  const { error } = await supabase
    .from('document_changes')
    .insert({
      document_id: change.documentId,
      change_data: change
    });

  if (error) throw error;
}

/**
 * Updates version compatibility information.
 */
export async function updateVersionCompatibility(
  documentId: string,
  compatibility: VersionCompatibility
): Promise<void> {
  const { error } = await supabase
    .from('version_compatibility')
    .upsert({
      document_id: documentId,
      compatibility_data: compatibility,
      updated_at: new Date().toISOString()
    });

  if (error) throw error;
}

/**
 * Updates document usage statistics.
 */
export async function updateDocumentStats(
  documentId: string,
  stats: Partial<DocumentUsageStats>
): Promise<void> {
  // First get the current stats
  const { data: currentDoc, error: fetchError } = await supabase
    .from('documents')
    .select('usage_stats')
    .eq('id', documentId)
    .single();

  if (fetchError) throw fetchError;

  // Merge the current stats with the updates
  const updatedStats = {
    ...currentDoc.usage_stats,
    ...stats,
    lastAccessed: new Date().toISOString() // Always update last accessed
  } as DocumentUsageStats;

  const { error } = await supabase
    .from('documents')
    .update({
      usage_stats: updatedStats,
      updated_at: new Date().toISOString()
    })
    .match({ id: documentId });

  if (error) throw error;
}

/**
 * Performs semantic search over Audius documentation with enhanced filtering.
 */
export async function searchDocuments(
  query: string,
  filters?: {
    type?: string[];
    version?: SemanticVersion;
    category?: string[];
    networkEnv?: 'mainnet' | 'testnet' | 'dev';
    minSimilarity?: number;
    includeValidation?: boolean;
    includeStats?: boolean;
  },
  limit: number = 6
): Promise<(AudiusDocument & {
  similarity: number;
  validation_status?: DocumentValidation;
  usage_stats?: DocumentUsageStats;
})[]> {
  const queryEmbedding = await embeddings.embedQuery(query);
  
  let rpcQuery = supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: filters?.minSimilarity || 0.5,
    match_count: limit
  });

  if (filters?.type?.length) {
    rpcQuery = rpcQuery.in('metadata->type', filters.type);
  }

  if (filters?.category?.length) {
    rpcQuery = rpcQuery.containedBy('metadata->category', filters.category);
  }

  if (filters?.networkEnv) {
    rpcQuery = rpcQuery.eq('metadata->networkEnv', filters.networkEnv);
  }

  if (filters?.version) {
    rpcQuery = rpcQuery.eq('version', filters.version);
  }

  const { data, error } = await rpcQuery;

  if (error) throw error;

  return data.map(doc => ({
    id: doc.id,
    content: doc.content,
    metadata: doc.metadata,
    similarity: doc.similarity,
    ...(filters?.includeValidation && { validation_status: doc.validation_status }),
    ...(filters?.includeStats && { usage_stats: doc.usage_stats })
  }));
}

/**
 * Gets all related documents for a given document.
 */
export async function getRelatedDocuments(
  documentId: string,
  relationshipTypes?: DocumentRelationship['type'][]
): Promise<{
  document: AudiusDocument;
  relationship: DocumentRelationship;
}[]> {
  const query = supabase
    .from('document_relationships')
    .select(`
      source_id,
      target_id,
      relationship_type,
      metadata,
      documents!target_id (
        id,
        content,
        metadata,
        validation_status,
        version,
        usage_stats
      )
    `)
    .or(`source_id.eq.${documentId},target_id.eq.${documentId}`);

  if (relationshipTypes?.length) {
    query.in('relationship_type', relationshipTypes);
  }

  const { data, error } = await query;

  if (error) throw error;

  // First cast to unknown to avoid direct type conversion error
  const typedData = (data as unknown) as Array<{
    source_id: string;
    target_id: string;
    relationship_type: DocumentRelationship['type'];
    metadata: DocumentRelationship['metadata'];
    documents: {
      id: string;
      content: string;
      metadata: AudiusMetadata;
      validation_status: DocumentValidation;
      version: SemanticVersion;
      usage_stats: DocumentUsageStats;
    } | Array<{
      id: string;
      content: string;
      metadata: AudiusMetadata;
      validation_status: DocumentValidation;
      version: SemanticVersion;
      usage_stats: DocumentUsageStats;
    }>;
  }>;

  return typedData.map(row => {
    // Handle both array and single object cases
    const docData = Array.isArray(row.documents) 
      ? row.documents[0] 
      : row.documents;

    if (!docData) {
      throw new Error(`No document found for relationship with source ${row.source_id} and target ${row.target_id}`);
    }

    return {
      document: {
        id: docData.id,
        content: docData.content,
        metadata: docData.metadata,
        validation_status: docData.validation_status,
        version: docData.version,
        usage_stats: docData.usage_stats
      } as AudiusDocument,
      relationship: {
        sourceId: row.source_id,
        targetId: row.target_id,
        type: row.relationship_type,
        metadata: row.metadata
      }
    };
  });
}

/**
 * Subscribes to real-time document updates.
 */
export function subscribeToDocumentUpdates(
  callback: (document: AudiusDocument) => void
) {
  return supabase
    .channel('document_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'documents'
      },
      payload => {
        callback(payload.new as AudiusDocument);
      }
    )
    .subscribe();
}
