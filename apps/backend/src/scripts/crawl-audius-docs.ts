import { AudiusCrawler } from '../utils/retrieval/crawlers/audius/audiusCrawler.js';
import { SupabaseDocsAdapter } from '../db/supabase/docs-adapter';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the backend directory
dotenv.config({ path: resolve(__dirname, '../../.env') });

async function main() {
  try {
    const crawler = new AudiusCrawler();
    const docsAdapter = new SupabaseDocsAdapter();
    
    // Clear existing documents
    console.log('Clearing existing documents...');
    await docsAdapter.clearDocuments();
    
    const urls = await crawler.getSitemapUrls();
    console.log(`Found ${urls.length} URLs to process`);
    
    for (const url of urls) {
      try {
        const page = await crawler.processPage(url);
        await docsAdapter.upsertDocument(page);
        console.log(`Processed and stored ${url}`);
      } catch (error) {
        console.error(`Failed to process ${url}:`, error);
      }
    }
    
    console.log('Documentation crawling and storage completed successfully');
  } catch (error) {
    console.error('Failed to crawl documentation:', error);
    process.exit(1);
  }
}

main();
