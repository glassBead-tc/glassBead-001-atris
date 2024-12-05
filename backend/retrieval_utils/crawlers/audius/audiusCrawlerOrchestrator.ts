import { AudiusCrawler, CrawlerError } from './audiusCrawler';
import { SQLiteStorage } from '../../storage/sqliteStorage';
import { v4 as uuidv4 } from 'uuid';
import { ContentChunker } from './contentChunker';

export class AudiusCrawlerOrchestrator {
  private chunker: ContentChunker;
  private storage: SQLiteStorage;

  constructor(
    private crawler: AudiusCrawler,
    dbPath: string = 'audius_docs.db'
  ) {
    this.chunker = new ContentChunker();
    this.storage = new SQLiteStorage();
  }

  async initialize(): Promise<void> {
    await this.storage.initialize();
  }

  async crawlAndProcess(): Promise<void> {
    const errors: CrawlerError[] = [];
    let urls: string[] = [];
    
    try {
      urls = await this.crawler.getSitemapUrls();
    } catch (error) {
      console.error('Failed to fetch sitemap:', error);
      throw error; // Fatal error - can't proceed without URLs
    }
    
    for (const url of urls) {
      try {
        const processed = await this.crawler.processPage(url);
        
        // Create and store documentation source
        const source = {
          id: uuidv4(),
          section: processed.section,
          metadata: {
            parentPath: processed.parentPath,
            hierarchy: processed.metadata.hierarchy,
            originalUrl: processed.url,
          },
          content: processed.content
        };
        
        await this.storage.storeSource(source);
        
        // Parse content into nodes and create chunks
        const nodes = this.chunker.parseContent(processed.content);
        const chunks = this.chunker.createChunks(source.id, nodes, {
          section: processed.section,
          hierarchy: processed.metadata.hierarchy
        });
        
        // Store all chunks
        for (const chunk of chunks) {
          await this.storage.storeChunk(chunk);
        }
        
      } catch (error) {
        const crawlerError = error instanceof CrawlerError 
          ? error 
          : new CrawlerError('Unknown error during processing', url, undefined, error);
        
        errors.push(crawlerError);
        console.error(`Failed to process ${url}:`, error);
        // Continue with next URL
      }
    }
    
    // Report summary of errors if any occurred
    if (errors.length > 0) {
      console.error(`Crawling completed with ${errors.length} errors:`);
      errors.forEach(error => {
        console.error(`- ${error.url}: ${error.message}`);
      });
    }

    await this.storage.close();
  }
} 