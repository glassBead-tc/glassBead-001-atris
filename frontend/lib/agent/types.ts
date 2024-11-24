/**
 * Audius Agent Types
 * 
 * Core type definitions for the Audius documentation agent system.
 * Combines LangChain's research-driven approach with Audius-specific
 * protocol awareness.
 */

import { BaseMessage } from '@langchain/core/messages';
import { AudiusDocument, AudiusMetadata } from '../../types/documents.js';

/**
 * Classification of user queries to determine the appropriate
 * research and response strategy.
 */
export type QueryType = 
  | 'PROTOCOL'     // Core protocol mechanics
  | 'API'          // API usage and integration
  | 'NODE'         // Node operation and maintenance
  | 'GOVERNANCE'   // DAO and governance
  | 'NEED_INFO';   // Insufficient context

/**
 * Protocol context for query understanding and document retrieval.
 */
export interface ProtocolContext {
  version?: string;          // Protocol version context
  network?: string;          // Network environment
  environment?: string;      // Runtime environment (e.g. production, staging)
  nodeId?: string;          // Specific node context
  governance?: {            // Governance context
    proposalId?: string;
    stage?: 'active' | 'executed' | 'cancelled';
  };
}

/**
 * Router classification result with reasoning.
 */
export interface RouterResult {
  type: QueryType;
  context: ProtocolContext;
  reasoning: string;        // Explanation of classification
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Document reference with usage tracking.
 */
export interface DocumentReference {
  document: AudiusDocument;
  relevance: number;       // Similarity score
  used: boolean;          // Whether used in response
  reasoning: string;      // Why this document is relevant
}

/**
 * Research step with context and results.
 */
export interface ResearchStep {
  instruction: string;    // What to research
  context: string;       // Why this step is needed
  completed: boolean;
  results?: {
    documents: DocumentReference[];
    insights: string[];
  };
}

/**
 * Complete agent state tracking research progress
 * and document usage.
 */
// Removed AudiusAgentState interface

/**
 * Agent configuration for runtime behavior.
 */
export interface AgentConfig {
  maxSteps: number;
  minConfidence: number;
  defaultVersion?: string;
  defaultNetwork?: string;
  debug: boolean;
}
