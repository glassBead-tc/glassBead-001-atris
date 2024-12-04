-- Enable the necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Documentation sources table
CREATE TABLE documentation_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('web', 'github', 'local', 'api')),
    config JSONB NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'processing')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, type)
);

-- Create index on documentation_sources
CREATE INDEX idx_documentation_sources_status ON documentation_sources(status);
CREATE INDEX idx_documentation_sources_type ON documentation_sources(type);

-- Document chunks table with embeddings
CREATE TABLE documentation_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES documentation_sources(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536), -- Using OpenAI's embedding dimension
    metadata JSONB NOT NULL,
    url TEXT,
    chunk_index INTEGER,
    parent_chunk_id UUID REFERENCES documentation_chunks(id), -- For hierarchical relationships
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hash TEXT NOT NULL, -- For deduplication and updates
    UNIQUE(source_id, hash)
);

-- Create indices for documentation_chunks
CREATE INDEX idx_documentation_chunks_source ON documentation_chunks(source_id);
CREATE INDEX idx_documentation_chunks_url ON documentation_chunks(url);
CREATE INDEX idx_documentation_chunks_parent ON documentation_chunks(parent_chunk_id);
CREATE INDEX idx_documentation_chunks_hash ON documentation_chunks(hash);

-- Create a GiST index for the embedding vector
CREATE INDEX idx_documentation_chunks_embedding ON documentation_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100); -- Number of lists can be tuned based on data size

-- Version history table
CREATE TABLE documentation_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES documentation_sources(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changes_summary JSONB,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    UNIQUE(source_id, version)
);

-- Create index on documentation_versions
CREATE INDEX idx_documentation_versions_source ON documentation_versions(source_id);
CREATE INDEX idx_documentation_versions_status ON documentation_versions(status);

-- Ingestion logs table
CREATE TABLE ingestion_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES documentation_sources(id) ON DELETE CASCADE,
    version_id UUID REFERENCES documentation_versions(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('started', 'processing', 'completed', 'failed')),
    details JSONB,
    error TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration INTERVAL GENERATED ALWAYS AS (completed_at - started_at) STORED
);

-- Create indices for ingestion_logs
CREATE INDEX idx_ingestion_logs_source ON ingestion_logs(source_id);
CREATE INDEX idx_ingestion_logs_status ON ingestion_logs(status);
CREATE INDEX idx_ingestion_logs_version ON ingestion_logs(version_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for documentation_chunks
CREATE TRIGGER update_documentation_chunks_updated_at
    BEFORE UPDATE ON documentation_chunks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to perform similarity search
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1536),
    match_threshold float,
    match_count int,
    source_filter uuid[] DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    content text,
    metadata jsonb,
    url text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.content,
        dc.metadata,
        dc.url,
        1 - (dc.embedding <=> query_embedding) as similarity
    FROM documentation_chunks dc
    WHERE
        CASE
            WHEN source_filter IS NULL THEN true
            ELSE dc.source_id = ANY(source_filter)
        END
        AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
