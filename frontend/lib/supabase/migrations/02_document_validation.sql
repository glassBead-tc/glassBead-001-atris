-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create enum types for document validation
DO $$ BEGIN
    CREATE TYPE document_source AS ENUM (
        'OFFICIAL_API_DOCS',
        'COMMUNITY_CONTENT',
        'GOVERNANCE_PROPOSAL',
        'TECHNICAL_GUIDE',
        'GENERATED_CONTENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE validation_method AS ENUM (
        'API_SPEC_VALIDATION',
        'MANUAL_REVIEW',
        'COMMUNITY_VERIFIED',
        'AUTOMATED_TEST',
        'GOVERNANCE_APPROVED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add validation-related columns to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS source document_source NOT NULL DEFAULT 'GENERATED_CONTENT',
ADD COLUMN IF NOT EXISTS current_version text NOT NULL DEFAULT '1.0.0',
ADD COLUMN IF NOT EXISTS last_validated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS confidence_score float NOT NULL DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
ADD COLUMN IF NOT EXISTS protocol_compatibility jsonb NOT NULL DEFAULT '{
    "min_version": "1.0.0",
    "breaking_changes": [],
    "deprecation_notice": null
}',
ADD COLUMN IF NOT EXISTS governance_references jsonb NOT NULL DEFAULT '[]';

-- Create table for validation events with proper constraints
CREATE TABLE IF NOT EXISTS document_validations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
    validation_event jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_validation_event CHECK (
        validation_event ? 'timestamp' AND
        validation_event ? 'method' AND
        validation_event ? 'validator' AND
        validation_event ? 'confidence_score' AND
        (validation_event->>'confidence_score')::float BETWEEN 0.0 AND 1.0
    )
);

-- Create table for document changes with proper constraints
CREATE TABLE IF NOT EXISTS document_changes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
    change_event jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_change_event CHECK (
        change_event ? 'timestamp' AND
        change_event ? 'author' AND
        change_event ? 'change_type' AND
        change_event ? 'change_description' AND
        change_event->>'change_type' IN ('CREATE', 'UPDATE', 'DELETE', 'VALIDATE')
    )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_document_validations_document_id 
ON document_validations(document_id);

CREATE INDEX IF NOT EXISTS idx_document_validations_created_at 
ON document_validations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_changes_document_id 
ON document_changes(document_id);

CREATE INDEX IF NOT EXISTS idx_document_changes_created_at 
ON document_changes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_confidence_score 
ON documents(confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_documents_last_validated 
ON documents(last_validated DESC);

-- Create function to update last_validated timestamp
CREATE OR REPLACE FUNCTION update_document_last_validated()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE documents
    SET last_validated = NEW.created_at
    WHERE id = NEW.document_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_validated
DROP TRIGGER IF EXISTS trigger_update_document_last_validated ON document_validations;
CREATE TRIGGER trigger_update_document_last_validated
    AFTER INSERT ON document_validations
    FOR EACH ROW
    EXECUTE FUNCTION update_document_last_validated();

-- Create function to calculate confidence score with exponential decay
CREATE OR REPLACE FUNCTION calculate_document_confidence_score(doc_id uuid)
RETURNS float AS $$
DECLARE
    confidence float;
BEGIN
    WITH weighted_scores AS (
        SELECT 
            (validation_event->>'confidence_score')::float as score,
            extract(epoch from (CURRENT_TIMESTAMP - (validation_event->>'timestamp')::timestamp)) / (24 * 60 * 60) as age_days
        FROM document_validations
        WHERE document_id = doc_id
        ORDER BY (validation_event->>'timestamp')::timestamp DESC
        LIMIT 10  -- Consider only the 10 most recent validations
    )
    SELECT COALESCE(
        SUM(score * exp(-age_days / 30.0)) / NULLIF(SUM(exp(-age_days / 30.0)), 0),
        0.0
    ) INTO confidence
    FROM weighted_scores;
    
    RETURN GREATEST(LEAST(confidence, 1.0), 0.0);  -- Ensure result is between 0 and 1
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically update confidence score
CREATE OR REPLACE FUNCTION update_document_confidence_score()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE documents
    SET confidence_score = calculate_document_confidence_score(NEW.document_id)
    WHERE id = NEW.document_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update confidence score
DROP TRIGGER IF EXISTS trigger_update_confidence_score ON document_validations;
CREATE TRIGGER trigger_update_confidence_score
    AFTER INSERT OR UPDATE ON document_validations
    FOR EACH ROW
    EXECUTE FUNCTION update_document_confidence_score();

-- Create function to check protocol compatibility
CREATE OR REPLACE FUNCTION is_protocol_compatible(doc_compatibility jsonb, version text)
RETURNS TABLE (
    is_compatible boolean,
    message text
) AS $$
BEGIN
    -- Check minimum version
    IF version < (doc_compatibility->>'min_version')::text THEN
        RETURN QUERY SELECT false, 'Version ' || version || ' is below minimum required version ' || (doc_compatibility->>'min_version')::text;
        RETURN;
    END IF;

    -- Check maximum version if specified
    IF doc_compatibility ? 'max_version' AND version > (doc_compatibility->>'max_version')::text THEN
        RETURN QUERY SELECT false, 'Version ' || version || ' is above maximum supported version ' || (doc_compatibility->>'max_version')::text;
        RETURN;
    END IF;

    -- Check deprecation
    IF doc_compatibility ? 'deprecation_notice' AND doc_compatibility->'deprecation_notice' IS NOT NULL THEN
        RETURN QUERY SELECT true, 'Warning: Deprecated since version ' || (doc_compatibility->'deprecation_notice'->>'deprecated_since')::text;
        RETURN;
    END IF;

    RETURN QUERY SELECT true, 'Compatible with version ' || version;
END;
$$ LANGUAGE plpgsql;
