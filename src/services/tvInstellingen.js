import { supabase } from '../lib/supabaseClient'

export const DEFAULT_INSTELLINGEN = {
  interval_seconden: 10,
  slides: {
    vvz_nieuws: true,
    knvb_nieuws: true,
    activiteiten: true,
    huidige_wedstrijden: true,
    afgelastingen: true,
    uitslagen_vandaag: true,
    nog_te_spelen: true,
    programma_week: true,
    uitslagen_week: true,
  },
  nieuws_aantal: {
    vvz: 3,
    knvb: 3,
  },
}

export async function fetchTvInstellingen() {
  const { data, error } = await supabase
    .from('tv_instellingen')
    .select('interval_seconden, slides')
    .eq('id', 1)
    .single()
  if (error || !data) return DEFAULT_INSTELLINGEN
  const slides = { ...DEFAULT_INSTELLINGEN.slides, ...data.slides }
  // nieuws_aantal zit opgeslagen in slides JSONB om extra kolom te vermijden
  const nieuws_aantal = {
    vvz: slides.vvz_nieuws_aantal ?? DEFAULT_INSTELLINGEN.nieuws_aantal.vvz,
    knvb: slides.knvb_nieuws_aantal ?? DEFAULT_INSTELLINGEN.nieuws_aantal.knvb,
  }
  return {
    interval_seconden: data.interval_seconden ?? DEFAULT_INSTELLINGEN.interval_seconden,
    slides,
    nieuws_aantal,
  }
}

export async function saveTvInstellingen(instellingen) {
  // Sla nieuws_aantal op als velden in slides JSONB
  const slides = {
    ...instellingen.slides,
    vvz_nieuws_aantal: instellingen.nieuws_aantal.vvz,
    knvb_nieuws_aantal: instellingen.nieuws_aantal.knvb,
  }
  const { error } = await supabase
    .from('tv_instellingen')
    .update({
      interval_seconden: instellingen.interval_seconden,
      slides,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
  if (error) throw error
}
