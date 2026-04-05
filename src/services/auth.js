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
 * Nodig een gebruiker uit via e-mail (via Edge Function met service role key).
 * @param {string} email
 * @returns {{ data: object | null, error: object | null }}
 */
export async function inviteUser(email, displayName) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return { data: null, error: { message: 'Geen actieve sessie gevonden.' } }
  }
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email, display_name: displayName }),
      }
    )
    const result = await response.json()
    if (!response.ok) return { data: null, error: result }
    return { data: result, error: null }
  } catch (err) {
    return { data: null, error: { message: err.message } }
  }
}

/**
 * Haal alle gebruikers op via Edge Function (vereist admin).
 * @returns {{ data: Array | null, error: object | null }}
 */
export async function fetchUsers() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return { data: null, error: { message: 'Geen actieve sessie gevonden.' } }
  }
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    )
    const result = await response.json()
    if (!response.ok) return { data: null, error: result }
    return { data: result, error: null }
  } catch (err) {
    return { data: null, error: { message: err.message } }
  }
}

/**
 * Verwijder een gebruiker via Edge Function (vereist admin).
 * @param {string} userId
 * @returns {{ data: object | null, error: object | null }}
 */
export async function deleteUser(userId) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return { data: null, error: { message: 'Geen actieve sessie gevonden.' } }
  }
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      }
    )
    const result = await response.json()
    if (!response.ok) return { data: null, error: result }
    return { data: result, error: null }
  } catch (err) {
    return { data: null, error: { message: err.message } }
  }
}

/**
 * Wijzig de rol van een gebruiker via Edge Function (vereist admin).
 * @param {string} userId
 * @param {string|null} role - 'admin' of null om de rol te verwijderen
 * @returns {{ data: object | null, error: object | null }}
 */
export async function setUserRole(userId, role) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return { data: null, error: { message: 'Geen actieve sessie gevonden.' } }
  }
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/set-user-role`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ user_id: userId, role }),
      }
    )
    const result = await response.json()
    if (!response.ok) return { data: null, error: result }
    return { data: result, error: null }
  } catch (err) {
    return { data: null, error: { message: err.message } }
  }
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
