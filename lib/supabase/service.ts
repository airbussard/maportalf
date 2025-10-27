/**
 * Supabase Service Role Client
 *
 * Admin client for background operations (bypasses RLS)
 * Used by: Cron jobs, system operations, background syncs
 *
 * WARNING: Never expose this client to the frontend!
 */

import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL')
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY')
}

/**
 * Supabase Admin Client
 *
 * Features:
 * - Bypasses Row Level Security (RLS)
 * - No user authentication required
 * - For server-side/background operations only
 *
 * Use cases:
 * - Cron jobs (calendar sync)
 * - System-level operations
 * - Data migrations
 * - Background processing
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
