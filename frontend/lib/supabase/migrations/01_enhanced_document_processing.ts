import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  console.log('Starting enhanced document processing migration...');

  try {
    // Read and execute schema SQL
    const schemaSQL = readFileSync(
      join(__dirname, '..', 'schema.sql'),
      'utf8'
    );

    // Split SQL into individual statements
    const statements = schemaSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Execute each statement
    for (const statement of statements) {
      const { error } = await supabase.rpc('exec', {
        query: statement
      });

      if (error) {
        throw new Error(`Failed to execute statement: ${error.message}\nStatement: ${statement}`);
      }
    }

    // Migrate existing documents to new schema
    const { data: documents, error: fetchError } = await supabase
      .from('documents')
      .select('*');

    if (fetchError) {
      throw new Error(`Failed to fetch existing documents: ${fetchError.message}`);
    }

    // Update each document with new fields
    for (const doc of documents || []) {
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          validation_status: {
            isValid: true,
            validatedAt: new Date().toISOString(),
            validatedBy: 'system',
            validationMethod: 'AUTOMATED'
          },
          version: {
            major: 1,
            minor: 0,
            patch: 0
          },
          usage_stats: {
            views: 0,
            uniqueUsers: 0,
            averageRating: 0,
            helpfulCount: 0,
            lastAccessed: new Date().toISOString(),
            searchImpressions: 0,
            searchClicks: 0,
            codeImplementations: 0
          }
        })
        .match({ id: doc.id });

      if (updateError) {
        console.error(`Failed to update document ${doc.id}: ${updateError.message}`);
      }
    }

    console.log('Migration completed successfully');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if executed directly
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { runMigration };
