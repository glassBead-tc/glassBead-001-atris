import { z } from 'zod';
import { SemanticVersion } from './documents';

/**
 * Represents the source and authority level of a document
 */
export enum DocumentSource {
  OFFICIAL_API_DOCS = 'OFFICIAL_API_DOCS',
  COMMUNITY_CONTENT = 'COMMUNITY_CONTENT',
  GOVERNANCE_PROPOSAL = 'GOVERNANCE_PROPOSAL',
  TECHNICAL_GUIDE = 'TECHNICAL_GUIDE',
  GENERATED_CONTENT = 'GENERATED_CONTENT'
}

/**
 * Represents the validation method used to verify document accuracy
 */
export enum ValidationMethod {
  API_SPEC_VALIDATION = 'API_SPEC_VALIDATION',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  COMMUNITY_VERIFIED = 'COMMUNITY_VERIFIED',
  AUTOMATED_TEST = 'AUTOMATED_TEST',
  GOVERNANCE_APPROVED = 'GOVERNANCE_APPROVED'
}

/**
 * Represents a validation event for a document
 */
export interface ValidationEvent {
  timestamp: Date;
  method: ValidationMethod;
  validator: string; // Could be system ID or user ID
  confidence_score: number; // 0-1
  validation_notes?: string;
  issues_found?: Array<{
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    resolution?: string;
  }>;
}

/**
 * Tracks changes to a document
 */
export interface DocumentChange {
  timestamp: Date;
  author: string;
  change_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'VALIDATE';
  previous_version?: string;
  change_description: string;
  affected_sections?: string[];
}

/**
 * Protocol version compatibility information
 */
export interface ProtocolCompatibility {
  min_version: SemanticVersion;
  max_version?: SemanticVersion;
  breaking_changes?: Array<{
    version: SemanticVersion;
    description: string;
    migration_guide?: string;
  }>;
  deprecation_notice?: {
    deprecated_since: SemanticVersion;
    removal_version?: SemanticVersion;
    alternative?: string;
  };
}

/**
 * Enhanced validation metadata for documents
 */
export interface DocumentValidation {
  source: DocumentSource;
  current_version: string;
  last_validated: Date;
  validation_history: ValidationEvent[];
  change_history: DocumentChange[];
  confidence_score: number; // Aggregate score based on validation history
  protocol_compatibility: ProtocolCompatibility;
  governance_references?: Array<{
    proposal_id: string;
    status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'IMPLEMENTED';
    url: string;
  }>;
}

// Zod schema for runtime validation
export const ValidationEventSchema = z.object({
  timestamp: z.date(),
  method: z.nativeEnum(ValidationMethod),
  validator: z.string(),
  confidence_score: z.number().min(0).max(1),
  validation_notes: z.string().optional(),
  issues_found: z.array(z.object({
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    description: z.string(),
    resolution: z.string().optional()
  })).optional()
});

export const DocumentChangeSchema = z.object({
  timestamp: z.date(),
  author: z.string(),
  change_type: z.enum(['CREATE', 'UPDATE', 'DELETE', 'VALIDATE']),
  previous_version: z.string().optional(),
  change_description: z.string(),
  affected_sections: z.array(z.string()).optional()
});

export const ProtocolCompatibilitySchema = z.object({
  min_version: z.string(), // TODO: Use SemanticVersion validation
  max_version: z.string().optional(),
  breaking_changes: z.array(z.object({
    version: z.string(),
    description: z.string(),
    migration_guide: z.string().optional()
  })).optional(),
  deprecation_notice: z.object({
    deprecated_since: z.string(),
    removal_version: z.string().optional(),
    alternative: z.string().optional()
  }).optional()
});

export const DocumentValidationSchema = z.object({
  source: z.nativeEnum(DocumentSource),
  current_version: z.string(),
  last_validated: z.date(),
  validation_history: z.array(ValidationEventSchema),
  change_history: z.array(DocumentChangeSchema),
  confidence_score: z.number().min(0).max(1),
  protocol_compatibility: ProtocolCompatibilitySchema,
  governance_references: z.array(z.object({
    proposal_id: z.string(),
    status: z.enum(['PROPOSED', 'ACCEPTED', 'REJECTED', 'IMPLEMENTED']),
    url: z.string().url()
  })).optional()
});
