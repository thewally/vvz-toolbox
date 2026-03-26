/**
 * Parse "dd-mm-yyyy" naar Date object.
 */
export function parseDutchDate(dateStr) {
  const [d, m, y] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Groepeer wedstrijden per dag (datum string).
 * Retourneert een Map gesorteerd op datum.
 */
export function groepeerPerDag(wedstrijden) {
  const map = new Map()
  for (const w of wedstrijden) {
    const datum = w.wedstrijddatum
    if (!datum) continue
    if (!map.has(datum)) map.set(datum, [])
    map.get(datum).push(w)
  }

  const sorted = new Map(
    [...map.entries()].sort((a, b) => parseDutchDate(a[0]) - parseDutchDate(b[0]))
  )
  return sorted
}

/**
 * Filter wedstrijden van de dichtstbijzijnde speelronde.
 * Groepeer op datum, pak alles van de eerste datum >= vandaag.
 * Als niets in de toekomst: pak de meest recente groep.
 */
export function filterHuidigeSpeelweek(wedstrijden) {
  const perDag = groepeerPerDag(wedstrijden)
  if (perDag.size === 0) return []

  const vandaag = new Date()
  vandaag.setHours(0, 0, 0, 0)

  const entries = [...perDag.entries()]

  // Zoek eerste datum >= vandaag
  for (const [datum, items] of entries) {
    if (parseDutchDate(datum) >= vandaag) {
      return verzamelSpeelweekend(entries, datum)
    }
  }

  // Niets in de toekomst: pak de meest recente groep
  const laatste = entries[entries.length - 1]
  return verzamelSpeelweekend(entries, laatste[0])
}

/**
 * Verzamel alle wedstrijden binnen 1 dag van de ankerdatum (zat+zon).
 */
function verzamelSpeelweekend(entries, ankerDatum) {
  const anker = parseDutchDate(ankerDatum)
  const result = []

  for (const [datum, items] of entries) {
    const d = parseDutchDate(datum)
    const verschilDagen = Math.abs(d - anker) / (1000 * 60 * 60 * 24)
    if (verschilDagen <= 1) {
      result.push(...items)
    }
  }

  return result
}
