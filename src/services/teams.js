import { supabase } from '../lib/supabaseClient'
import { fetchTeams as fetchSportlinkTeams } from './sportlink'
import { bepaalSync } from './teamImport'

let syncBelofte = null

/**
 * Laat de tabel `teams` meelopen met SportLink (kaart thewally/ontwikkelstraat#37).
 * Draait per paginasessie eenmaal (een tweede aanroep geeft de eerdere belofte terug),
 * tenzij `force` is gezet of de vorige poging een fout gaf.
 * Geeft `{ toegevoegd, gekoppeld, verdwenen, fout }` terug en gooit nooit.
 */
export function syncSportlinkTeams(bestaandeTeams, { force = false } = {}) {
  if (syncBelofte && !force) return syncBelofte
  const belofte = voerSyncUit(bestaandeTeams).then(r => {
    if (r.fout && syncBelofte === belofte) syncBelofte = null
    return r
  })
  syncBelofte = belofte
  return belofte
}

async function voerSyncUit(bestaandeTeams) {
  const resultaat = { toegevoegd: 0, gekoppeld: 0, verdwenen: [], fout: null }
  try {
    const { data, error } = await fetchSportlinkTeams()
    if (error || !Array.isArray(data) || data.length === 0) {
      resultaat.fout = error?.message || 'SportLink gaf geen teams terug'
      return resultaat
    }
    const { toevoegen, koppelen, verdwenen } = bepaalSync(data, bestaandeTeams)
    resultaat.verdwenen = verdwenen
    const fouten = []

    if (toevoegen.length > 0) {
      const rijen = toevoegen.map(t => ({
        name: t.name, category: t.category || null, bron: 'sportlink', sportlink_teamcode: t.teamcode,
      }))
      const { error: e } = await supabase
        .from('teams')
        .upsert(rijen, { onConflict: 'sportlink_teamcode', ignoreDuplicates: true })
      if (e) fouten.push(e.message)
      else resultaat.toegevoegd = rijen.length
    }
    for (const k of koppelen) {
      const { error: e } = await supabase
        .from('teams')
        .update({ bron: 'sportlink', sportlink_teamcode: k.teamcode })
        .eq('id', k.id)
      if (e) fouten.push(e.message)
      else resultaat.gekoppeld++
    }
    if (fouten.length > 0) resultaat.fout = fouten[0]
  } catch (e) {
    resultaat.fout = e?.message || 'Synchroniseren is niet gelukt'
  }
  return resultaat
}

export async function fetchTeams() {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name')
  return { data, error }
}

export async function createTeam(team) {
  const { data, error } = await supabase
    .from('teams')
    .insert(team)
    .select()
    .single()
  return { data, error }
}

export async function updateTeam(id, updates) {
  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deleteTeam(id) {
  const { data, error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id)
  return { data, error }
}
