import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Check if environment variables are set and not placeholders
export const isSupabaseConfigured = !!(
  supabaseUrl &&
  supabaseUrl !== "https://your-project-id.supabase.co" &&
  supabaseAnonKey &&
  supabaseAnonKey !== "your-anon-public-key"
)

// Safe initialization that avoids crashing during build execution
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : "https://placeholder-url.supabase.co",
  isSupabaseConfigured ? supabaseAnonKey : "placeholder-key"
)
