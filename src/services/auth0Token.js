// Brug naar de Auth0-client voor code buiten React (bijv. de schrijf-API-services van #60 en #62).
let getter = null

export function setTokenGetter(fn) {
  getter = fn
}

/**
 * Accesstoken voor de audience van de Quarkus-API (VITE_AUTH0_AUDIENCE), voor `Authorization: Bearer`.
 * Geeft null als niemand is ingelogd (of in Supabase-modus).
 */
export async function getAccessToken() {
  if (!getter) return null
  try {
    return await getter()
  } catch {
    return null
  }
}
