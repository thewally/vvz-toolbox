import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Ontbreekt de configuratie in de build, dan gooit createClient bij het laden van de
// module en blijft het scherm wit. We maken dan een client met een placeholder
// (alle calls falen netjes met { data: null, error }) en main.jsx toont een
// duidelijke foutmelding.
export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey
    ? 'De configuratie van de site ontbreekt (VITE_SUPABASE_URL of VITE_SUPABASE_ANON_KEY is niet gezet tijdens de build).'
    : null

if (supabaseConfigError) {
  console.error(`[VVZ Toolbox] ${supabaseConfigError}`)
}

export const supabase = createClient(
  supabaseUrl || 'http://supabase-niet-geconfigureerd.invalid',
  supabaseAnonKey || 'niet-geconfigureerd',
)
