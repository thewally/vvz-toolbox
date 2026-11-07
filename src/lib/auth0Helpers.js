// Pure hulpfuncties voor de Auth0-login (geen React, geen import.meta), zodat ze met node --test te testen zijn.

export const ROLES_CLAIM = 'https://vvz49.nl/roles'
export const DEFAULT_CONNECTION = 'Username-Password-Authentication'

const AUTH_PAGES = ['/login', '/wachtwoord-vergeten', '/wachtwoord-resetten', '/wachtwoord-instellen', '/email-bevestigd']

/**
 * Haal de rollen uit een claims-object (ID- of access-token payload).
 * Ontbrekende claim, geen array of lege lijst geeft []. Alleen niet-lege strings blijven over.
 */
export function rolesFromClaims(claims) {
  const value = claims?.[ROLES_CLAIM]
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((r) => typeof r === 'string' && r.trim() !== '').map((r) => r.trim()))]
}

/** Decodeer de payload van een JWT zonder verificatie (alleen om claims te lezen; de server verifieert). */
export function decodeJwtPayload(token) {
  if (typeof token !== 'string') return null
  const part = token.split('.')[1]
  if (!part) return null
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}

/** Rollen uit het access token; valt terug op de claim in het ID-token (user-object). */
export function resolveRoles(accessToken, idClaims) {
  const fromAccess = rolesFromClaims(decodeJwtPayload(accessToken))
  if (fromAccess.length > 0) return fromAccess
  return rolesFromClaims(idClaims)
}

export function isAdminRole(roles) {
  return roles.includes('admin')
}

/** Alleen interne paden zijn toegestaan als terugkeerpagina (geen open redirect). */
export function safeReturnTo(raw) {
  if (typeof raw !== 'string') return '/'
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/'
  const pad = raw.split(/[?#]/)[0]
  if (AUTH_PAGES.includes(pad)) return '/'
  return raw
}

/** Vertaal een Auth0-foutcode bij terugkeer naar een Nederlandse melding. */
export function mapAuth0Error(error) {
  const code = error?.error
  if (code === 'access_denied') return 'Inloggen is geweigerd of geannuleerd. Probeer het opnieuw.'
  if (code === 'login_required' || code === 'consent_required' || code === 'missing_refresh_token') {
    return 'Je sessie is verlopen. Log opnieuw in.'
  }
  return 'Er ging iets mis bij het inloggen. Probeer het opnieuw.'
}

/**
 * Vraag een Auth0-wachtwoordresetmail aan. Auth0 antwoordt met tekst en geeft geen fout bij een
 * onbekend adres; elke HTTP-respons geeft dus een neutraal succes. Alleen een netwerkfout is een fout.
 */
export async function requestAuth0PasswordReset(email, { domain, clientId, connection }, fetchImpl = fetch) {
  try {
    await fetchImpl(`https://${domain}/dbconnections/change_password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        email,
        connection: connection || DEFAULT_CONNECTION,
      }),
    })
    return { data: { success: true }, error: null }
  } catch {
    return { data: null, error: { message: 'Het versturen is mislukt. Controleer je internetverbinding en probeer het opnieuw.' } }
  }
}

/** Alleen een echte UUID mag als author_id naar de kolom die naar auth.users verwijst. */
export function uuidOrNull(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null
}
