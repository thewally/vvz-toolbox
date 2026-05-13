/**
 * Toernooi-schema algoritme: pure functions, geen Supabase. Worden zowel
 * in de simulator als in de generator gebruikt.
 *
 *  - timeToMinutes / minutesToTime: tijdconversie
 *  - calculateSlots: lijst van beschikbare starttijden binnen het tijdsvenster
 *  - calculateCapacity: aantal slots × velden, los van poule-indeling
 *  - totalMatchesNeeded: optelsom van n*(n-1)/2 per poule
 *  - generateRoundRobinPairings: circle method, BYE-wedstrijden uitgefilterd
 *  - generateSchedule: greedy scheduler over velden en tijdslots met rust
 *    tussen wedstrijden van hetzelfde team.
 */

// ---------- Time helpers ----------

/**
 * Zet een tijdstring 'HH:MM' (of 'HH:MM:SS') om naar minuten sinds middernacht.
 */
export function timeToMinutes(t) {
  if (!t) return 0
  const parts = String(t).split(':')
  const h = parseInt(parts[0], 10) || 0
  const m = parseInt(parts[1], 10) || 0
  return h * 60 + m
}

/**
 * Zet minuten sinds middernacht om naar 'HH:MM' tijdstring.
 */
export function minutesToTime(m) {
  const total = Math.max(0, Math.floor(m))
  const h = Math.floor(total / 60)
  const min = total % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

// ---------- Capaciteit ----------

/**
 * Bereken alle beschikbare starttijden binnen het toernooi-venster. Slots
 * die geheel of gedeeltelijk overlappen met de optionele lunchpauze worden
 * eruit gefilterd.
 *
 * @param {{
 *   startTime: string,
 *   endTime: string,
 *   matchDurationMinutes: number,
 *   breakStartTime?: string|null,
 *   breakDurationMinutes?: number,
 * }} cfg
 * @returns {string[]} starttijden als 'HH:MM'
 */
export function calculateSlots({
  startTime,
  endTime,
  matchDurationMinutes,
  slotGapMinutes = 0,
  breakStartTime,
  breakDurationMinutes = 0,
}) {
  const startM = timeToMinutes(startTime)
  const endM = timeToMinutes(endTime)
  const duration = Number(matchDurationMinutes) || 0
  const gap = Math.max(0, Number(slotGapMinutes) || 0)
  if (duration <= 0 || endM <= startM) return []

  const hasBreak = !!breakStartTime && breakDurationMinutes > 0
  const breakStart = hasBreak ? timeToMinutes(breakStartTime) : null
  const breakEnd = hasBreak ? breakStart + breakDurationMinutes : null

  const slots = []
  for (let t = startM; t + duration <= endM; t += duration + gap) {
    const slotEnd = t + duration
    // Overlap met pauze? (slot [t, slotEnd) versus [breakStart, breakEnd))
    if (hasBreak && t < breakEnd && slotEnd > breakStart) continue
    slots.push(minutesToTime(t))
  }
  return slots
}

/**
 * @returns {{ totalSlots: number, slotsPerField: number }}
 */
export function calculateCapacity({
  startTime,
  endTime,
  matchDurationMinutes,
  slotGapMinutes = 0,
  breakStartTime,
  breakDurationMinutes = 0,
  fields = [],
}) {
  const slots = calculateSlots({
    startTime,
    endTime,
    matchDurationMinutes,
    slotGapMinutes,
    breakStartTime,
    breakDurationMinutes,
  })
  const slotsPerField = slots.length
  const fieldCount = Array.isArray(fields) ? fields.length : 0
  return {
    totalSlots: slotsPerField * fieldCount,
    slotsPerField,
  }
}

/**
 * Som van n*(n-1)/2 per poule × roundsPerPairing.
 * @param {Array<{ teamIds: string[] }>} pools
 * @param {number} roundsPerPairing
 */
export function totalMatchesNeeded(pools, roundsPerPairing = 1) {
  if (!Array.isArray(pools)) return 0
  const rpp = Math.max(1, Number(roundsPerPairing) || 1)
  return pools.reduce((sum, p) => {
    const n = Array.isArray(p?.teamIds) ? p.teamIds.length : 0
    return sum + (n * (n - 1)) / 2 * rpp
  }, 0)
}

// ---------- Round-robin ----------

/**
 * Genereer round-robin parings via de circle method (Berger-tabel).
 *
 * Bij oneven aantal teams wordt een dummy 'BYE' toegevoegd; wedstrijden
 * tegen BYE worden weggelaten uit het resultaat (dat team rust die ronde).
 * Home/away worden per ronde gewisseld voor wat balans.
 *
 * @param {string[]} teamIds
 * @returns {Array<{ round: number, homeTeamId: string, awayTeamId: string }>}
 */
export function generateRoundRobinPairings(teamIds) {
  if (!Array.isArray(teamIds) || teamIds.length < 2) return []

  const teams = [...teamIds]
  const hadBye = teams.length % 2 === 1
  if (hadBye) teams.push('BYE')

  const n = teams.length
  const rounds = n - 1
  const half = n / 2
  const result = []

  // Lokale kopie die we roteren
  const arr = [...teams]

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i]
      const b = arr[n - 1 - i]
      if (a === 'BYE' || b === 'BYE') continue
      // Wissel home/away per ronde voor balans
      if (round % 2 === 0) {
        result.push({ round, homeTeamId: a, awayTeamId: b })
      } else {
        result.push({ round, homeTeamId: b, awayTeamId: a })
      }
    }
    // Roteer: behoud positie 0, schuif rest met de klok mee
    // (laatste element van arr verhuist naar positie 1)
    arr.splice(1, 0, arr.pop())
  }

  return result
}

// ---------- Greedy scheduler ----------

/**
 * Plan alle wedstrijden in over velden en tijdslots.
 *
 * Strategie:
 *  1. Bouw lijst van slots uit toernooi-config (lunchpauze eruit gefilterd).
 *  2. Genereer round-robin parings per poule. Behoud volgorde van ronde
 *     binnen poule (ronde 1 eerst). Interleave per ronde over poules zodat
 *     wedstrijden van verschillende poules door elkaar lopen, wat de kans
 *     vergroot dat een team rust krijgt tussen z'n eigen wedstrijden.
 *  3. Greedy: probeer elke wedstrijd op het eerst beschikbare slot waar:
 *      - het veld nog vrij is,
 *      - beide teams op dat moment geen andere wedstrijd hebben,
 *      - beide teams >= restSlots slots rust hebben t.o.v. hun vorige slot.
 *
 * @param {{
 *   tournament: {
 *     startTime: string,
 *     endTime: string,
 *     matchDurationMinutes: number,
 *     roundsPerPairing?: number,
 *     slotGapMinutes?: number,
 *     breakStartTime?: string|null,
 *     breakDurationMinutes?: number,
 *   },
 *   fields: Array<{ id: string, name?: string, sort_order?: number }>,
 *   pools: Array<{ id: string, categoryId?: string, teamIds: string[] }>,
 * }} args
 * @returns {{
 *   matches: Array<{ poolId: string, fieldId: string, homeTeamId: string, awayTeamId: string, startTime: string, endTime: string }>,
 *   warnings: string[],
 *   isFeasible: boolean,
 * }}
 */
export function generateSchedule({ tournament, fields, pools, categories = [] }) {
  const warnings = []

  const duration = Number(tournament?.matchDurationMinutes) || 0
  const roundsPerPairing = Math.max(1, Number(tournament?.roundsPerPairing ?? 1))

  const slotTimes = calculateSlots({
    startTime: tournament?.startTime,
    endTime: tournament?.endTime,
    matchDurationMinutes: duration,
    slotGapMinutes: tournament?.slotGapMinutes ?? 0,
    breakStartTime: tournament?.breakStartTime,
    breakDurationMinutes: tournament?.breakDurationMinutes,
  })

  const safeFields = Array.isArray(fields)
    ? [...fields].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : []

  if (slotTimes.length === 0) {
    warnings.push('Geen beschikbare tijdslots — controleer start/eindtijd en wedstrijdduur.')
  }
  if (safeFields.length === 0) {
    warnings.push('Geen velden gedefinieerd.')
  }

  // Per categorie: welke slotindexen zijn geldig (binnen het tijdvenster van de categorie)?
  const categoryMap = {}
  for (const c of categories) categoryMap[c.id] = c

  const validSlotsByCategory = {}
  for (const c of categories) {
    if (!c.start_time && !c.end_time) continue // geen beperking → alle slots geldig
    const catStart = timeToMinutes((c.start_time || tournament?.startTime || '00:00').slice(0, 5))
    const catEnd   = timeToMinutes((c.end_time   || tournament?.endTime   || '23:59').slice(0, 5))
    validSlotsByCategory[c.id] = new Set(
      slotTimes.reduce((acc, t, i) => {
        const m = timeToMinutes(t)
        if (m >= catStart && m + duration <= catEnd) acc.push(i)
        return acc
      }, [])
    )
  }

  // Map poolId → categoryId
  const poolCategoryMap = {}
  for (const p of Array.isArray(pools) ? pools : []) {
    if (p.categoryId) poolCategoryMap[p.id] = p.categoryId
  }

  function slotValidForMatch(slotIdx, poolId) {
    const catId = poolCategoryMap[poolId]
    if (!catId || !validSlotsByCategory[catId]) return true // geen tijdbeperking
    return validSlotsByCategory[catId].has(slotIdx)
  }

  const matchesToSchedule = []
  const validPools = Array.isArray(pools) ? pools : []

  // Genereer parings per poule (herhaald roundsPerPairing keer)
  const poolPairings = validPools.map(p => {
    const base = generateRoundRobinPairings(p.teamIds ?? [])
    const pairings = []
    for (let rep = 0; rep < roundsPerPairing; rep++) {
      const roundOffset = base.length > 0
        ? rep * (base[base.length - 1].round + 1)
        : 0
      for (const m of base) {
        // Bij even herhalingen home/away wisselen voor balans
        if (rep % 2 === 0) {
          pairings.push({ ...m, round: m.round + roundOffset })
        } else {
          pairings.push({ ...m, round: m.round + roundOffset, homeTeamId: m.awayTeamId, awayTeamId: m.homeTeamId })
        }
      }
    }
    return { poolId: p.id, pairings }
  })

  // Interleave: ronde 1 van alle poules, dan ronde 2, etc.
  const maxRound = poolPairings.reduce((max, pp) => {
    const m = pp.pairings.reduce((mm, x) => Math.max(mm, x.round), -1)
    return Math.max(max, m)
  }, -1)

  for (let r = 0; r <= maxRound; r++) {
    for (const pp of poolPairings) {
      for (const m of pp.pairings) {
        if (m.round === r) {
          matchesToSchedule.push({
            poolId: pp.poolId,
            round: m.round,
            homeTeamId: m.homeTeamId,
            awayTeamId: m.awayTeamId,
          })
        }
      }
    }
  }

  // assignment[slotIndex] = Map<fieldId, match>
  const assignment = slotTimes.map(() => new Map())
  // teamSlots: voor elk team de set van slotIndexen waarin ze spelen
  const teamSlots = new Map()

  function recordTeamSlot(teamId, slotIndex) {
    if (!teamSlots.has(teamId)) teamSlots.set(teamId, new Set())
    teamSlots.get(teamId).add(slotIndex)
  }

  function teamHasSlot(teamId, slotIndex) {
    const s = teamSlots.get(teamId)
    return !!(s && s.has(slotIndex))
  }

  const placedMatches = []
  const unscheduled = [...matchesToSchedule]

  for (let slotIdx = 0; slotIdx < slotTimes.length && unscheduled.length > 0; slotIdx++) {
    for (const f of safeFields) {
      if (assignment[slotIdx].has(f.id)) continue

      // Zoek de eerste wedstrijd waarbij beide teams vrij zijn én het slot
      // binnen het tijdvenster van de categorie valt.
      const idx = unscheduled.findIndex(m =>
        slotValidForMatch(slotIdx, m.poolId) &&
        !teamHasSlot(m.homeTeamId, slotIdx) &&
        !teamHasSlot(m.awayTeamId, slotIdx)
      )
      if (idx === -1) continue

      const m = unscheduled.splice(idx, 1)[0]
      const startTime = slotTimes[slotIdx]
      const endTime = minutesToTime(timeToMinutes(startTime) + duration)
      const placedMatch = {
        poolId: m.poolId,
        fieldId: f.id,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        startTime,
        endTime,
      }
      assignment[slotIdx].set(f.id, placedMatch)
      recordTeamSlot(m.homeTeamId, slotIdx)
      recordTeamSlot(m.awayTeamId, slotIdx)
      placedMatches.push(placedMatch)
    }
  }

  for (const m of unscheduled) {
    const catId = poolCategoryMap[m.poolId]
    const catName = catId && categoryMap[catId]?.name ? ` (${categoryMap[catId].name})` : ''
    warnings.push(`Wedstrijd kon niet worden ingepland (poule ${m.poolId}${catName}, ronde ${m.round + 1}). Onvoldoende capaciteit of tijdvenster te klein.`)
  }

  // Sorteer op starttijd zodat het schema chronologisch is en het toernooi
  // zo vroeg mogelijk eindigt — overtollige tijd aan het einde blijft leeg.
  placedMatches.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))

  return {
    matches: placedMatches,
    warnings,
    isFeasible: warnings.length === 0,
  }
}
