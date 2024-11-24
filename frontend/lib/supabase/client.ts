/**
 * Supabase Client Configuration
 * 
 * This module initializes and exports a type-safe Supabase client configured for
 * the Audius documentation system. The client is set up with:
 * 1. Environment-based configuration
 * 2. Automatic session management
 * 3. Type safety through generated types
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from './types.js';

// Validate required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Type-safe Supabase client instance.
 * Configured with:
 * - Persistent sessions for maintaining user state
 * - Automatic token refresh for uninterrupted access
 * - Database type definitions for type-safe queries
 */
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,    // Maintain session across page reloads
      autoRefreshToken: true,  // Automatically refresh auth tokens
    },
  }
);
