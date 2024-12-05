import { AudiusCrawler } from '../crawlers/audius/audiusCrawler.js';
import { AudiusCrawlerOrchestrator } from '../crawlers/audius/audiusCrawlerOrchestrator.js';
import path from 'path';

async function main() {
  const dbPath = path.join(process.cwd(), 'data', 'audius_docs.db');
  console.log(`Initializing crawler with database at: ${dbPath}`);
  
  const crawler = new AudiusCrawler();
  const orchestrator = new AudiusCrawlerOrchestrator(crawler, dbPath);
  
  try {
    console.log('Initializing storage...');
    await orchestrator.initialize();
    
    console.log('Starting crawl process...');
    await orchestrator.crawlAndProcess();
    
    console.log('Crawl completed successfully');
  } catch (error) {
    console.error('Crawl failed:', error);
    process.exit(1);
  }
}

main().catch(console.error); 