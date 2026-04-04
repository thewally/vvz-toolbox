import { supabase } from '../lib/supabaseClient'

/**
 * Stuur een wachtwoord-reset e-mail.
 * @param {string} email
 * @returns {{ data, error }}
 */
export async function sendPasswordReset(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://thewally.github.io/vvz-toolbox/auth/callback?type=recovery&next=/wachtwoord-resetten',
  })
  return { data, error }
}

/**
 * Wijzig het wachtwoord van de huidige ingelogde gebruiker.
 * @param {string} newPassword
 * @returns {{ data, error }}
 */
export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  return { data, error }
}

/**
 * Controleer of de huidige gebruiker een e-mail/wachtwoord-account heeft.
 * @param {object} user - Supabase user object
 * @returns {boolean}
 */
export function hasEmailProvider(user) {
  if (!user?.identities) return false
  return user.identities.some((id) => id.provider === 'email')
}

/**
 * Verwijder het account van de ingelogde gebruiker via de Supabase Edge Function.
 * @returns {{ data: { success: boolean } | null, error: Error | null }}
 */
export async function deleteAccount() {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData?.session?.access_token
  if (!accessToken) {
    return { data: null, error: new Error('Geen actieve sessie gevonden.') }
  }

  try {
    const { data, error } = await supabase.functions.invoke('delete-account', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (error) return { data: null, error }
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}
