import { supabase } from '../lib/supabaseClient'

/**
 * Haal het profiel op van de ingelogde gebruiker.
 * @param {string} userId
 * @returns {{ data: object | null, error: Error | null }}
 */
export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, password_set')
    .eq('id', userId)
    .single()
  return { data, error }
}

/**
 * Markeer dat de gebruiker een wachtwoord heeft ingesteld.
 * @param {string} userId
 * @returns {{ data, error }}
 */
export async function markPasswordSet(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ password_set: true })
    .eq('id', userId)
  return { data, error }
}

/**
 * Werk het profiel bij.
 * @param {string} userId
 * @param {object} updates - { display_name? }
 * @returns {{ data, error }}
 */
export async function updateProfile(userId, updates) {
  const { display_name } = updates
  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name })
    .eq('id', userId)
    .select('id, display_name')
    .single()
  return { data, error }
}
