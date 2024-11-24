/**
 * Types for managing document relationships, versioning, and validation.
 */

export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
}

export type DocumentRelationType = 
  | 'DEPENDS_ON'        // Document B is required for Document A
  | 'REFERENCES'        // Document A references Document B
  | 'SUPERSEDES'        // Document A replaces Document B
  | 'IMPLEMENTS'        // Document A implements concepts from Document B
  | 'EXTENDS'          // Document A builds upon Document B
  | 'RELATED'          // General relationship between documents
  | 'CONTRADICTS'      // Document A contradicts Document B
  | 'DEPRECATES';      // Document A deprecates Document B

export interface DocumentRelationship {
  sourceId: string;
  targetId: string;
  type: DocumentRelationType;
  metadata?: {
    description?: string;
    createdAt: string;
    createdBy: string;
    strength?: number;  // 0-1 indicating relationship strength
    bidirectional?: boolean;
    tags?: string[];
  };
}

export interface DocumentValidation {
  isValid: boolean;
  validatedAt: string;
  validatedBy: string;
  validationMethod: 'AUTOMATED' | 'MANUAL' | 'PEER_REVIEW';
  errors?: Array<{
    type: string;
    message: string;
    location?: string;
  }>;
  metadata?: {
    reviewers?: string[];
    testResults?: any;
    validationRules?: string[];
  };
}

export interface VersionCompatibility {
  documentId: string;
  compatibleVersions: {
    min?: SemanticVersion;
    max?: SemanticVersion;
    excluded?: SemanticVersion[];
  };
  platformRequirements?: {
    os?: string[];
    runtime?: string[];
    dependencies?: Record<string, string>;
  };
  metadata?: {
    testedVersions?: SemanticVersion[];
    knownIssues?: string[];
    upgradeNotes?: string;
  };
}

export interface DocumentChange {
  documentId: string;
  changeType: 'CREATE' | 'UPDATE' | 'DELETE' | 'MERGE';
  timestamp: string;
  author: string;
  description: string;
  version?: SemanticVersion;
  metadata?: {
    relatedChanges?: string[];
    reviewStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewers?: string[];
    commitHash?: string;
    pullRequestId?: string;
  };
}

export interface DocumentUsageStats {
  views: number;
  uniqueUsers: number;
  averageRating: number;
  helpfulCount: number;
  lastAccessed: string;
  searchImpressions: number;
  searchClicks: number;
  codeImplementations: number;
  metadata?: {
    userSegments?: Record<string, number>;
    referrers?: Record<string, number>;
    timeOnPage?: number;
    bounceRate?: number;
  };
}
