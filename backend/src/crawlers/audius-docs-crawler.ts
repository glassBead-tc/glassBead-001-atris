import { JSDOM } from 'jsdom';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const AUDIUS_DOCS_BASE = 'https://docs.audius.org';
const API_SECTIONS = [
  '/api',
  '/developers/api/get-user',
  '/developers/api/get-track',
  '/developers/api/get-playlist',
  '/developers/api/track-comments',
  '/developers/api/get-tips',
  '/developers/api/get-developer-app',
  '/developers/api/resolve'
];

interface DocPage {
  url: string;
  title: string;
  content: string;
  section: string;
  parentUrl?: string;
}

export class AudiusDocsCrawler {
  private supabase;
  private sourceId: string | null = null;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_RETRIEVAL_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  private async initializeSource() {
    const { data, error } = await this.supabase
      .from('documentation_sources')
      .upsert({
        name: 'Audius API Documentation',
        base_url: AUDIUS_DOCS_BASE,
        type: 'api',
        metadata: {
          version: '1.0',
          framework: 'docusaurus'
        }
      }, {
        onConflict: 'base_url'
      })
      .select('id')
      .single();

    if (error) throw error;
    this.sourceId = data.id;
  }

  private async cleanContent(element: Element): Promise<string> {
    // Remove navigation, header, footer elements
    const elementsToRemove = [
      '.navbar',
      '.pagination-nav',
      '.theme-doc-sidebar-container',
      '.theme-doc-breadcrumbs'
    ];

    elementsToRemove.forEach(selector => {
      element.querySelectorAll(selector).forEach(el => el.remove());
    });

    // Get clean text content
    return element.textContent?.trim() || '';
  }

  private async processPage(url: string, parentUrl?: string): Promise<DocPage> {
    const fullUrl = `${AUDIUS_DOCS_BASE}${url}`;
    const response = await axios.get(fullUrl);
    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    const title = document.querySelector('h1')?.textContent || url;
    const mainContent = document.querySelector('.theme-doc-markdown');
    const content = mainContent ? await this.cleanContent(mainContent) : '';
    const section = url.split('/')[1];

    return {
      url,
      title,
      content,
      section,
      parentUrl
    };
  }

  private async storePage(page: DocPage) {
    if (!this.sourceId) throw new Error('Source not initialized');

    const { error } = await this.supabase
      .from('documentation_chunks')
      .insert({
        source_id: this.sourceId,
        url: page.url,
        content: page.content,
        metadata: {
          title: page.title,
          section: page.section,
          parentUrl: page.parentUrl
        }
      });

    if (error) throw error;
  }

  public async crawlApiDocs() {
    await this.initializeSource();
    
    for (const url of API_SECTIONS) {
      try {
        console.log(`Crawling ${url}...`);
        const page = await this.processPage(url);
        await this.storePage(page);
        
        // Log success
        await this.supabase
          .from('ingestion_logs')
          .insert({
            source_id: this.sourceId,
            status: 'success',
            url: url,
            metadata: { section: page.section }
          });
      } catch (error) {
        console.error(`Error crawling ${url}:`, error);
        
        // Log error
        await this.supabase
          .from('ingestion_logs')
          .insert({
            source_id: this.sourceId,
            status: 'error',
            url: url,
            error_message: error instanceof Error ? error.message : 'Unknown error'
          });
      }
    }
  }
}
