// Cache voor de teamlijst (/teams), gedeeld door alle teamoverzichten.
// Verse cache -> direct; oudere cache -> direct en op de achtergrond verversen (stale-while-revalidate);
// geen cache -> ophalen. Gelijktijdige aanroepen delen een belofte. Fouten worden nooit gecachet.
import { fetchTeams } from './sportlink'

export const TEAMLIJST_TTL_MS = 5 * 60 * 1000
export const TEAMLIJST_STORAGE_KEY = 'vvz-teamlijst-v1'

function leesOpslag(storage, sleutel) {
  try {
    const ruw = storage?.getItem(sleutel)
    if (!ruw) return null
    const { data, tijd } = JSON.parse(ruw)
    if (!Array.isArray(data) || typeof tijd !== 'number') return null
    return { data, tijd }
  } catch {
    return null
  }
}

function schrijfOpslag(storage, sleutel, waarde) {
  try {
    storage?.setItem(sleutel, JSON.stringify(waarde))
  } catch {
    // opslag mag falen
  }
}

function standaardStorage() {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

/**
 * Maakt een teamlijst-cache. Alles is injecteerbaar voor tests.
 * `haal(opties)` geeft `{ data, error, stale }`; `onVerversd(data)` in opties wordt aangeroepen
 * wanneer een achtergrondverversing nieuwe data heeft opgeleverd.
 */
export function maakTeamlijstCache({
  fetcher = fetchTeams,
  now = () => Date.now(),
  storage = standaardStorage(),
  ttl = TEAMLIJST_TTL_MS,
  sleutel = TEAMLIJST_STORAGE_KEY,
} = {}) {
  let cache = null
  let inFlight = null
  const luisteraars = new Set()

  function geheugen() {
    if (!cache) cache = leesOpslag(storage, sleutel)
    return cache
  }

  function ophalen() {
    if (inFlight) return inFlight
    inFlight = (async () => {
      try {
        const res = await fetcher()
        if (res?.error || !Array.isArray(res?.data)) {
          return { data: null, error: res?.error ?? new Error('Geen teams ontvangen') }
        }
        cache = { data: res.data, tijd: now() }
        schrijfOpslag(storage, sleutel, cache)
        for (const l of luisteraars) l(res.data)
        return { data: res.data, error: null }
      } catch (error) {
        return { data: null, error }
      } finally {
        inFlight = null
      }
    })()
    return inFlight
  }

  return {
    /** Huidige gecachete lijst (ook verouderd) of null, zonder netwerk. */
    peek() {
      return geheugen()?.data ?? null
    },
    /** Abonneer op nieuwe data na een (achtergrond)verversing. Geeft een afmeldfunctie terug. */
    abonneer(fn) {
      luisteraars.add(fn)
      return () => luisteraars.delete(fn)
    },
    async haal() {
      const c = geheugen()
      if (c) {
        if (now() - c.tijd < ttl) return { data: c.data, error: null, stale: false }
        ophalen() // achtergrond; fout negeren, oude data blijft staan
        return { data: c.data, error: null, stale: true }
      }
      const res = await ophalen()
      return { ...res, stale: false }
    },
    wis() {
      cache = null
      inFlight = null
    },
  }
}

const gedeeld = maakTeamlijstCache()

export const getTeamsGecachet = () => gedeeld.haal()
export const peekTeams = () => gedeeld.peek()
export const abonneerOpTeams = (fn) => gedeeld.abonneer(fn)
