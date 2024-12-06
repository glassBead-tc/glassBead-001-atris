import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// @ts-ignore
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_RETRIEVAL_KEY = process.env.SUPABASE_RETRIEVAL_KEY;

if (!SUPABASE_URL || !SUPABASE_RETRIEVAL_KEY) {
    console.error('Missing required environment variables:');
    if (!SUPABASE_URL) console.error('- SUPABASE_URL');
    if (!SUPABASE_RETRIEVAL_KEY) console.error('- SUPABASE_RETRIEVAL_KEY');
    throw new Error('Missing required environment variables');
}

async function initializeDatabase() {
    console.log('Initializing Supabase database...');
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_RETRIEVAL_KEY!);
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../../supabase/migrations/00001_create_documentation_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    
    // Execute each statement
    for (const statement of statements) {
        try {
            console.log(`Executing statement: ${statement.substring(0, 50)}...`);
            const { error } = await supabase.rpc('exec', { sql: statement });
            
            if (error) {
                console.error('Error executing statement:', error);
                throw error;
            }
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }
    
    console.log('Database initialization completed successfully!');
}

// Test the storage adapter
async function testStorageAdapter() {
    console.log('Testing Supabase storage adapter...');
    
    const { SupabaseStorageAdapter } = await import('../storage/supabase-adapter.js');
    
    const adapter = new SupabaseStorageAdapter({
        supabaseUrl: SUPABASE_URL!,
        supabaseKey: SUPABASE_RETRIEVAL_KEY!
    });
    
    // Test adding a source
    try {
        const source = await adapter.addSource({
            name: 'Audius Documentation',
            type: 'web',
            config: {
                baseUrl: 'https://docs.audius.org',
                crawlRules: [
                    { pattern: '/sdk/**', depth: 2 }
                ]
            },
            status: 'active',
            lastUpdated: new Date()
        });
        
        console.log('Successfully added test source:', source);
        
        // Test storing a chunk
        const chunk = await adapter.storeChunks([{
            sourceId: source.id,
            content: 'Test documentation chunk',
            embedding: Array(1536).fill(0), // Placeholder embedding
            metadata: {
                section: 'test',
                path: '/test'
            }
        }]);
        
        console.log('Successfully stored test chunk:', chunk);
        
        // Clean up test data
        await adapter.deleteSource(source.id);
        console.log('Successfully cleaned up test data');
        
    } catch (error) {
        console.error('Error testing storage adapter:', error);
        throw error;
    }
}

// Run initialization and tests
async function main() {
    try {
        await initializeDatabase();
        await testStorageAdapter();
        console.log('All initialization and tests completed successfully!');
    } catch (error) {
        console.error('Error in initialization process:', error);
        process.exit(1);
    }
}

main();
