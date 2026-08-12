import { supabase } from './supabase'
import type { Theme } from './theme'

export type AccountType = 'personal' | 'business'

export type Profile = {
  id: string
  account_type: AccountType | null
  display_name: string | null
  /** Server-assigned public identifier used to sign in. Null until allocated. */
  user_id: string | null
  /** Light/dark appearance preference. Null until the user picks one. */
  theme: Theme | null
  created_at: string
  updated_at: string
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data as Profile | null
}

/**
 * Upsert rather than update: the auth.users trigger normally creates the row,
 * but a user created before the migration ran would have none.
 */
export async function setAccountType(userId: string, accountType: AccountType) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { id: userId, account_type: accountType, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    )
    .select()
    .single()

  if (error) throw error
  return data as Profile
}

export async function setProfileTheme(userId: string, theme: Theme) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { id: userId, theme, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    )
    .select()
    .single()

  if (error) throw error
  return data as Profile
}
