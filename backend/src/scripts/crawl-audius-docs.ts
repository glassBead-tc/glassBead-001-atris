import { AudiusDocsCrawler } from '../crawlers/audius-docs-crawler.js';

async function main() {
  try {
    const crawler = new AudiusDocsCrawler();
    await crawler.crawlApiDocs();
    console.log('Documentation crawling completed successfully');
  } catch (error) {
    console.error('Error during documentation crawling:', error);
    process.exit(1);
  }
}

main();
