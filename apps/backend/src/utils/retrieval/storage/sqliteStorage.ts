import Database, { Database as DatabaseType } from 'better-sqlite3';
import { DocumentationSource, DocumentationChunk } from './types';

interface SourceRow {
  id: string;
  section: string;
  parent_path: string;
  original_url: string;
  content: string;
  metadata: string;
}

interface ChunkRow {
  id: string;
  source_id: string;
  content: string;
  metadata: string;
}

export class SQLiteStorage {
  private db: DatabaseType | null = null;
  
  async initialize(dbPath: string = ':memory:'): Promise<void> {
    this.db = new Database(dbPath);
    await this.createTables();
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sources (
        id TEXT PRIMARY KEY,
        section TEXT NOT NULL,
        parent_path TEXT,
        original_url TEXT,
        content TEXT NOT NULL,
        metadata JSON
      );

      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata JSON,
        FOREIGN KEY (source_id) REFERENCES sources(id)
      );

      CREATE INDEX IF NOT EXISTS idx_chunks_source_id ON chunks(source_id);
      CREATE INDEX IF NOT EXISTS idx_sources_section ON sources(section);
    `);
  }

  async storeSource(source: DocumentationSource): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.prepare(`
      INSERT INTO sources (id, section, parent_path, original_url, content, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      source.id,
      source.section,
      source.metadata.parentPath,
      source.metadata.originalUrl,
      source.content,
      JSON.stringify(source.metadata)
    );
  }

  async storeChunk(chunk: DocumentationChunk): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.prepare(`
      INSERT INTO chunks (id, source_id, content, metadata)
      VALUES (?, ?, ?, ?)
    `).run(
      chunk.id,
      chunk.sourceId,
      chunk.content,
      JSON.stringify(chunk.metadata)
    );
  }

  async getSourcesBySection(section: string): Promise<DocumentationSource[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = this.db.prepare(`
      SELECT * FROM sources WHERE section = ?
    `).all(section) as SourceRow[];

    return rows.map(row => ({
      id: row.id,
      section: row.section,
      content: row.content,
      metadata: JSON.parse(row.metadata)
    }));
  }

  async getChunksBySourceId(sourceId: string): Promise<DocumentationChunk[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = this.db.prepare(`
      SELECT * FROM chunks WHERE source_id = ?
    `).all(sourceId) as ChunkRow[];

    return rows.map(row => ({
      id: row.id,
      sourceId: row.source_id,
      content: row.content,
      metadata: JSON.parse(row.metadata)
    }));
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
} 