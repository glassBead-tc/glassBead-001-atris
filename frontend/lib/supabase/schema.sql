-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Update documents table with new columns
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS validation_status jsonb,
ADD COLUMN IF NOT EXISTS version jsonb,
ADD COLUMN IF NOT EXISTS usage_stats jsonb,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Create document relationships table
CREATE TABLE IF NOT EXISTS document_relationships (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    source_id uuid REFERENCES documents(id) ON DELETE CASCADE,
    target_id uuid REFERENCES documents(id) ON DELETE CASCADE,
    relationship_type text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(source_id, target_id, relationship_type)
);

-- Create document changes table
CREATE TABLE IF NOT EXISTS document_changes (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
    change_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create version compatibility table
CREATE TABLE IF NOT EXISTS version_compatibility (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
    compatibility_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(document_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_document_relationships_source ON document_relationships(source_id);
CREATE INDEX IF NOT EXISTS idx_document_relationships_target ON document_relationships(target_id);
CREATE INDEX IF NOT EXISTS idx_document_changes_document ON document_changes(document_id);
CREATE INDEX IF NOT EXISTS idx_version_compatibility_document ON version_compatibility(document_id);

-- Update match_documents function with enhanced filtering
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    id uuid,
    content text,
    metadata jsonb,
    similarity float,
    validation_status jsonb,
    version jsonb,
    usage_stats jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.content,
        d.metadata,
        1 - (d.embedding <=> query_embedding) as similarity,
        d.validation_status,
        d.version,
        d.usage_stats
    FROM documents d
    WHERE 
        CASE 
            WHEN filter IS NOT NULL AND filter != '{}'::jsonb THEN
                d.metadata @> filter
            ELSE true
        END
        AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
