interface DocumentationSource {
  id: string;
  section: string;
  metadata: {
    parentPath: string;
    hierarchy: string[];
    originalUrl: string;
    lastModified?: string;
  };
  content: string;
}

interface DocumentationChunk {
  id: string;
  sourceId: string;
  content: string;
  metadata: {
    section: string;
    hierarchy: string[];
    title?: string;
  };
}

export class DocumentationStorage {
  private sources: Map<string, DocumentationSource> = new Map();
  private chunks: Map<string, DocumentationChunk> = new Map();

  async storeSource(source: DocumentationSource): Promise<void> {
    this.sources.set(source.id, source);
  }

  async storeChunk(chunk: DocumentationChunk): Promise<void> {
    this.chunks.set(chunk.id, chunk);
  }

  async getSourcesBySection(section: string): Promise<DocumentationSource[]> {
    return Array.from(this.sources.values())
      .filter(source => source.section === section);
  }

  async getChunksBySourceId(sourceId: string): Promise<DocumentationChunk[]> {
    return Array.from(this.chunks.values())
      .filter(chunk => chunk.sourceId === sourceId);
  }
} 