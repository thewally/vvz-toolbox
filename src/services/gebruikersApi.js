import { getAccessToken } from './auth0Token'
import { deriveApiBase, maakGebruikersApi } from '../lib/gebruikersHelpers'

// API van het gebruikersbeheer (Quarkus, /api/gebruikers). Alleen gebruikt in Auth0-modus.
// Basis-url: VITE_API_BASE_URL, anders afgeleid uit VITE_SPORTLINK_PROXY_URL (zelfde Render-service).
const baseUrl = deriveApiBase(
  import.meta.env.VITE_SPORTLINK_PROXY_URL,
  import.meta.env.VITE_API_BASE_URL,
)

export const {
  lijstGebruikers, maakGebruiker, zetRollen, verwijderGebruiker, stuurUitnodiging,
} = maakGebruikersApi({ baseUrl, getToken: getAccessToken })
