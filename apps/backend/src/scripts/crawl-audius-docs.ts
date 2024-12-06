import { AudiusCrawler } from '../utils/retrieval/crawlers/audius/audiusCrawler.js';

async function main() {
  try {
    const crawler = new AudiusCrawler();
    const urls = await crawler.getSitemapUrls();
    console.log(`Found ${urls.length} URLs to process`);
    
    for (const url of urls) {
      try {
        const page = await crawler.processPage(url);
        console.log(`Processed ${url}`);
        // TODO: Store the processed page data
      } catch (error) {
        console.error(`Failed to process ${url}:`, error);
      }
    }
    
    console.log('Documentation crawling completed successfully');
  } catch (error) {
    console.error('Failed to crawl documentation:', error);
    process.exit(1);
  }
}

main();
