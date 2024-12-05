export interface DocumentationSource {
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

export interface DocumentationChunk {
  id: string;
  sourceId: string;
  content: string;
  metadata: {
    title: string;
    headingPath: string[];
    section: string;
    hierarchy: string[];
    startIndex: number;
    endIndex: number;
  };
} 