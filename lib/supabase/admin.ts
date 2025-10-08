import { createClient } from '@supabase/supabase-js'

/**
 * Admin client with Service Role Key
 * BYPASSES Row Level Security (RLS)
 *
 * IMPORTANT: Only use this for:
 * - Admin operations that need to access all data
 * - Server-side code only (NEVER expose to client)
 *
 * Use cases:
 * - Fetching all managers/admins for dropdowns
 * - Fetching all tags
 * - Admin reports and analytics
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase admin credentials')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
