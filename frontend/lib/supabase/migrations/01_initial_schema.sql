-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create the documents table with vector support
CREATE TABLE IF NOT EXISTS documents (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    content text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}',
    embedding vector(1536), -- OpenAI embedding dimension
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Create table for document relationships
CREATE TABLE IF NOT EXISTS document_relationships (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id uuid REFERENCES documents(id) ON DELETE CASCADE,
    target_id uuid REFERENCES documents(id) ON DELETE CASCADE,
    relationship_type text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_id, target_id, relationship_type)
);

-- Add document versioning and validation fields
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS validation_status jsonb NOT NULL DEFAULT '{
    "isValid": true,
    "validatedAt": CURRENT_TIMESTAMP,
    "validatedBy": "system",
    "validationMethod": "AUTOMATED"
}',
ADD COLUMN IF NOT EXISTS version jsonb NOT NULL DEFAULT '{
    "major": 1,
    "minor": 0,
    "patch": 0
}',
ADD COLUMN IF NOT EXISTS usage_stats jsonb NOT NULL DEFAULT '{
    "views": 0,
    "uniqueUsers": 0,
    "averageRating": 0,
    "helpfulCount": 0,
    "lastAccessed": CURRENT_TIMESTAMP,
    "searchImpressions": 0,
    "searchClicks": 0,
    "codeImplementations": 0
}';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_document_relationships_source 
ON document_relationships(source_id);

CREATE INDEX IF NOT EXISTS idx_document_relationships_target 
ON document_relationships(target_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update usage stats
CREATE OR REPLACE FUNCTION update_document_usage_stats(
    doc_id uuid,
    stat_type text,
    increment integer DEFAULT 1
)
RETURNS void AS $$
BEGIN
    UPDATE documents
    SET usage_stats = jsonb_set(
        usage_stats,
        ARRAY[stat_type],
        to_jsonb(COALESCE((usage_stats->>stat_type)::integer, 0) + increment)
    )
    WHERE id = doc_id;
END;
$$ LANGUAGE plpgsql;
