import { isAuth0Mode } from '../lib/auth0Config'
import GebruikersBeheerSupabase from './GebruikersBeheerSupabase'
import GebruikersBeheerAuth0 from './GebruikersBeheerAuth0'

// Kiest op de build-vlag VITE_AUTH_PROVIDER: Auth0 gebruikt de Quarkus-API /api/gebruikers,
// anders blijft de Supabase-variant (edge functions en user_roles) actief.
export default function GebruikersBeheerPage() {
  return isAuth0Mode ? <GebruikersBeheerAuth0 /> : <GebruikersBeheerSupabase />
}
