import { createClient } from '@supabase/supabase-js'
import { env } from './env'

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    // Passkey methods (signInWithPasskey / registerPasskey / auth.passkey.*)
    // throw at call time unless this flag is on.
    experimental: { passkey: true },
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})
