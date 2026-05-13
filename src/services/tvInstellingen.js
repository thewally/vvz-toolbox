import { supabase } from '../lib/supabaseClient'

export const DEFAULT_INSTELLINGEN = {
  interval_seconden: 10,
  slides: {
    nieuws: true,
    activiteiten: true,
    huidige_wedstrijden: true,
    uitslagen_vandaag: true,
    nog_te_spelen: true,
    programma_week: true,
    uitslagen_week: true,
  },
}

export async function fetchTvInstellingen() {
  const { data, error } = await supabase
    .from('tv_instellingen')
    .select('interval_seconden, slides')
    .eq('id', 1)
    .single()
  if (error || !data) return DEFAULT_INSTELLINGEN
  return {
    interval_seconden: data.interval_seconden ?? DEFAULT_INSTELLINGEN.interval_seconden,
    slides: { ...DEFAULT_INSTELLINGEN.slides, ...data.slides },
  }
}

export async function saveTvInstellingen(instellingen) {
  const { error } = await supabase
    .from('tv_instellingen')
    .update({
      interval_seconden: instellingen.interval_seconden,
      slides: instellingen.slides,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
  if (error) throw error
}
