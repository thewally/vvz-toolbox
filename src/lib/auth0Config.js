import { DEFAULT_CONNECTION } from './auth0Helpers'

// Keuze van de loginprovider: leeg of 'supabase' = huidige Supabase-login, 'auth0' = Auth0.
export const isAuth0Mode = import.meta.env.VITE_AUTH_PROVIDER === 'auth0'

export const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  audience: import.meta.env.VITE_AUTH0_AUDIENCE,
  connection: import.meta.env.VITE_AUTH0_CONNECTION || DEFAULT_CONNECTION,
}

export const auth0ConfigError =
  isAuth0Mode && (!auth0Config.domain || !auth0Config.clientId)
    ? 'De configuratie van de site ontbreekt (VITE_AUTH0_DOMAIN of VITE_AUTH0_CLIENT_ID is niet gezet tijdens de build).'
    : null

if (auth0ConfigError) {
  console.error(`[VVZ Toolbox] ${auth0ConfigError}`)
}
