import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Missing required environment variables:');
    if (!SUPABASE_URL) console.error('- SUPABASE_URL');
    if (!NEXT_PUBLIC_SUPABASE_ANON_KEY) console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
    throw new Error('Missing required environment variables');
}

async function testConnection() {
    console.log('Testing Supabase connection...');
    const supabase = createClient(SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    try {
        const { data, error } = await supabase.from('documentation_sources').select('count').single();
        if (error) throw error;
        console.log('Successfully connected to Supabase!');
        return true;
    } catch (error) {
        console.error('Error connecting to Supabase:', error);
        return false;
    }
}

async function testStorageAdapter() {
    console.log('Testing Supabase storage adapter...');
    
    const supabase = createClient(SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // Test adding a source
    try {
        console.log('Testing source creation...');
        const { data: source, error: sourceError } = await supabase
            .from('documentation_sources')
            .insert([{
                name: 'Audius Documentation',
                type: 'web',
                config: {
                    baseUrl: 'https://docs.audius.org',
                    crawlRules: [
                        { pattern: '/sdk/**', depth: 2 }
                    ]
                },
                status: 'active'
            }])
            .select()
            .single();
            
        if (sourceError) {
            console.error('Error adding source:', sourceError);
            throw sourceError;
        }
        console.log('Successfully added test source:', source);
        
        console.log('Testing chunk creation...');
        // Test storing a chunk
        const { data: chunk, error: chunkError } = await supabase
            .from('documentation_chunks')
            .insert([{
                source_id: source.id,
                content: 'Test documentation chunk',
                embedding: Array(1536).fill(0), // Placeholder embedding
                metadata: {
                    section: 'test',
                    path: '/test'
                },
                hash: 'test-hash'
            }])
            .select()
            .single();
            
        if (chunkError) {
            console.error('Error adding chunk:', chunkError);
            throw chunkError;
        }
        console.log('Successfully stored test chunk:', chunk);
        
        console.log('Cleaning up test data...');
        // Clean up test data
        const { error: deleteError } = await supabase
            .from('documentation_sources')
            .delete()
            .eq('id', source.id);
            
        if (deleteError) {
            console.error('Error deleting test data:', deleteError);
            throw deleteError;
        }
        console.log('Successfully cleaned up test data');
        
    } catch (error) {
        console.error('Error testing storage:', error);
        throw error;
    }
}

// Run tests
async function main() {
    try {
        console.log('Starting Supabase connection and storage tests...');
        
        // First test the connection
        const connected = await testConnection();
        if (!connected) {
            console.error('Failed to connect to Supabase. Please check your credentials and try again.');
            process.exit(1);
        }
        
        // Then test the storage operations
        await testStorageAdapter();
        console.log('All tests completed successfully!');
    } catch (error) {
        console.error('Error in test process:', error);
        process.exit(1);
    }
}

main();
