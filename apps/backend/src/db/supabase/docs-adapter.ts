import { supabase } from './client';
import { ProcessedPage } from '../../utils/retrieval/crawlers/audius/audiusCrawler';

export class SupabaseDocsAdapter {
  async upsertDocument(doc: ProcessedPage) {
    const { data, error } = await supabase
      .from('documentation')
      .upsert({
        url: doc.url,
        section: doc.section,
        parent_path: doc.parentPath,
        content: doc.content,
        title: doc.title,
        hierarchy: doc.metadata.hierarchy,
        last_modified: doc.metadata.lastModified,
      }, {
        onConflict: 'url'
      });

    if (error) {
      throw new Error(`Failed to upsert document: ${error.message}`);
    }

    return data;
  }

  async clearDocuments() {
    const { error } = await supabase
      .from('documentation')
      .delete()
      .neq('url', ''); // Delete all rows

    if (error) {
      throw new Error(`Failed to clear documents: ${error.message}`);
    }
  }
}
