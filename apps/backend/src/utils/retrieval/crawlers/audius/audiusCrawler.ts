import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import { delay } from '../../utils/delay';

interface SitemapURL {
  loc: string[];
  lastmod?: string[];
}

interface ProcessedPage {
  url: string;
  section: string;
  parentPath: string;
  content: string;
  title: string;
  metadata: {
    lastModified?: string;
    hierarchy: string[];
  }
}

export class CrawlerError extends Error {
  constructor(
    message: string,
    public readonly url?: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'CrawlerError';
  }
}

export class AudiusCrawler {
  private baseUrl: string = 'https://docs.audius.org';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  private async fetchWithRetry(url: string): Promise<string> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await axios.get(url);
        return response.data;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt} failed for ${url}: ${(error as Error).message}`);
        
        if ((error as any).response?.status === 404) {
          throw new CrawlerError('Page not found', url, 404, error as Error);
        }
        
        if (attempt < this.MAX_RETRIES) {
          await delay(this.RETRY_DELAY * attempt);
        }
      }
    }
    
    throw new CrawlerError(
      `Failed to fetch after ${this.MAX_RETRIES} attempts`,
      url,
      undefined,
      lastError
    );
  }

  async getSitemapUrls(): Promise<string[]> {
    try {
      const data = await this.fetchWithRetry(`${this.baseUrl}/sitemap.xml`);
      const parsed = await parseStringPromise(data);
      
      const urls = parsed.urlset.url
        .map((entry: { loc: string[] }) => entry.loc[0])
        .filter((url: string) => url.startsWith(this.baseUrl));
      
      return urls;
    } catch (error) {
      if (error instanceof CrawlerError) throw error;
      throw new CrawlerError('Failed to parse sitemap', undefined, undefined, error as Error);
    }
  }

  private getUrlHierarchy(url: string): string[] {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname.split('/').filter(Boolean);
  }

  private getSection(hierarchy: string[]): string {
    return hierarchy[0] || 'root';
  }

  async processPage(url: string): Promise<ProcessedPage> {
    try {
      const data = await this.fetchWithRetry(url);
      const $ = cheerio.load(data);
      
      // Remove navigation, footer, and other non-content elements
      $('.navbar, .footer, .sidebar, .pagination, .edit-link, .last-updated').remove();
      
      // Get the main content container
      const mainContent = $('.theme-default-content');
      
      // Process code blocks first - replace them with placeholders
      const codeBlocks: string[] = [];
      mainContent.find('pre code').each((i, el) => {
        const $code = $(el);
        const language = $code.attr('class')?.replace('language-', '') || 'text';
        const content = $code.text();
        
        // Store code block
        codeBlocks.push(`\`\`\`${language}\n${content}\n\`\`\``);
        
        // Replace with placeholder
        $code.parent().replaceWith(`[CODE_BLOCK_${codeBlocks.length - 1}]`);
      });

      // Process headings while maintaining hierarchy
      const structuredContent: string[] = [];
      let currentHeadingLevel = 1;
      
      mainContent.children().each((_, el) => {
        const $el = $(el);
        
        if ($el.is('h1, h2, h3, h4, h5, h6')) {
          const tagName = $el.prop('tagName');
          if (tagName) {
            const level = parseInt(tagName.slice(1));
            const text = $el.text().trim();
            
            // Add proper markdown heading
            currentHeadingLevel = level;
            structuredContent.push(`${'#'.repeat(level)} ${text}\n`);
          }
        } else {
          let text = $el.text().trim();
          
          // Replace code block placeholders
          if (text.startsWith('[CODE_BLOCK_')) {
            const index = parseInt(text.match(/\d+/)![0]);
            text = codeBlocks[index];
          }
          
          if (text) {
            structuredContent.push(text + '\n');
          }
        }
      });

      const title = $('h1').first().text().trim();
      const hierarchy = this.getUrlHierarchy(url);
      
      return {
        url,
        section: this.getSection(hierarchy),
        parentPath: hierarchy.slice(0, -1).join('/'),
        content: structuredContent.join('\n'),
        title,
        metadata: {
          hierarchy,
        }
      };
    } catch (error) {
      throw new CrawlerError('Failed to process page', url, undefined, error as Error);
    }
  }
} 