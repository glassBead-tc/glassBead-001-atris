interface ContentNode {
  type: 'heading' | 'text' | 'code';
  content: string;
  level?: number; // For headings
  language?: string; // For code blocks
}

interface ContentChunk {
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

export class ContentChunker {
  private readonly MAX_CHUNK_SIZE = 1500; // Characters
  private readonly MIN_CHUNK_SIZE = 500;  // Characters

  parseContent(markdown: string): ContentNode[] {
    const nodes: ContentNode[] = [];
    const lines = markdown.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Handle headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        nodes.push({
          type: 'heading',
          content: headingMatch[2],
          level: headingMatch[1].length
        });
        continue;
      }
      
      // Handle code blocks
      if (line.startsWith('```')) {
        const language = line.slice(3).trim();
        let codeContent = '';
        i++;
        
        while (i < lines.length && !lines[i].startsWith('```')) {
          codeContent += lines[i] + '\n';
          i++;
        }
        
        nodes.push({
          type: 'code',
          content: codeContent,
          language
        });
        continue;
      }
      
      // Handle regular text
      if (line.trim()) {
        nodes.push({
          type: 'text',
          content: line
        });
      }
    }
    
    return nodes;
  }

  createChunks(
    sourceId: string,
    nodes: ContentNode[],
    metadata: { section: string; hierarchy: string[] }
  ): ContentChunk[] {
    const chunks: ContentChunk[] = [];
    let currentChunk: ContentNode[] = [];
    let currentSize = 0;
    let headingPath: string[] = [];
    let lastHeadingLevel = 1;
    
    const finalizeChunk = (forcedBreak = false) => {
      if (currentChunk.length === 0) return;
      
      // Find the most relevant title for this chunk
      const title = headingPath[headingPath.length - 1] || 'Untitled Section';
      
      const content = currentChunk
        .map(node => {
          switch (node.type) {
            case 'heading':
              return `${'#'.repeat(node.level!)} ${node.content}`;
            case 'code':
              return `\`\`\`${node.language || ''}\n${node.content}\`\`\``;
            default:
              return node.content;
          }
        })
        .join('\n');
      
      chunks.push({
        id: `${sourceId}-${chunks.length}`,
        sourceId,
        content,
        metadata: {
          title,
          headingPath: [...headingPath],
          section: metadata.section,
          hierarchy: metadata.hierarchy,
          startIndex: chunks.length,
          endIndex: chunks.length
        }
      });
      
      currentChunk = [];
      currentSize = 0;
    };

    for (const node of nodes) {
      if (node.type === 'heading') {
        // Finalize current chunk if it's not empty
        if (currentSize > this.MIN_CHUNK_SIZE) {
          finalizeChunk();
        }
        
        // Update heading path
        const level = node.level!;
        while (headingPath.length >= level) {
          headingPath.pop();
        }
        headingPath.push(node.content);
        lastHeadingLevel = level;
        
        currentChunk.push(node);
        currentSize += node.content.length;
      } else {
        // For code blocks and text, check if adding would exceed max size
        const nodeSize = node.content.length;
        
        if (currentSize + nodeSize > this.MAX_CHUNK_SIZE && currentSize > this.MIN_CHUNK_SIZE) {
          finalizeChunk();
        }
        
        currentChunk.push(node);
        currentSize += nodeSize;
      }
    }
    
    // Finalize last chunk
    if (currentChunk.length > 0) {
      finalizeChunk();
    }
    
    return chunks;
  }
} 