#!/usr/bin/env node

/**
 * Generate iCal (.ics) bestanden per team op basis van Sportlink programma data.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { dirname } from 'path'

const CLIENT_ID = process.env.SPORTLINK_CLIENT_ID
const BASE_URL = 'https://data.sportlink.com'

const TEAM_CONFIG = [
  { slug: 'selectie',    sportlinkNaam: 'VVZ 1' },
  { slug: 'veteranen',   sportlinkNaam: 'VVZ 2' },
  { slug: 'derde',       sportlinkNaam: 'VVZ 3' },
  { slug: 'zesde',       sportlinkNaam: 'VVZ 6' },
  { slug: '30-vrouwen',  sportlinkNaam: 'VVZ VR30+1' },
  { slug: '35-mannen',   sportlinkNaam: 'VVZ 35+1' },
  { slug: '45-mannen',   sportlinkNaam: 'VVZ 45+1' },
  { slug: 'jo19-1',      sportlinkNaam: 'VVZ JO19-1' },
  { slug: 'jo17-1',      sportlinkNaam: 'VVZ JO17-1' },
  { slug: 'jo15-1',      sportlinkNaam: 'VVZ JO15-1' },
  { slug: 'jo14-1',      sportlinkNaam: 'VVZ JO14-1' },
  { slug: 'jo13-1',      sportlinkNaam: 'VVZ JO13-1' },
  { slug: 'jo12-1',      sportlinkNaam: 'VVZ JO12-1' },
  { slug: 'jo11-1',      sportlinkNaam: 'VVZ JO11-1' },
  { slug: 'jo10-1',      sportlinkNaam: 'VVZ JO10-1' },
  { slug: 'jo9-1',       sportlinkNaam: 'VVZ JO9-1' },
]

if (!CLIENT_ID) {
  console.error('SPORTLINK_CLIENT_ID moet als env var gezet zijn')
  process.exit(1)
}

async function sportlinkFetch(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}/${endpoint}`)
  url.searchParams.set('client_id', CLIENT_ID)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const response = await fetch(url.toString())
  if (!response.ok) throw new Error(`Sportlink API error: ${response.status}`)
  return response.json()
}

function ensureDir(filePath) {
  const dir = dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function formatICalDate(dateStr, timeStr) {
  // dateStr = "YYYY-MM-DD" of iets parsebaars, timeStr = "HH:MM"
  const d = new Date(dateStr)
  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number)
    d.setHours(h, m, 0, 0)
  }
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
}

function escapeIcal(str) {
  return (str || '').replace(/[\\;,]/g, c => `\\${c}`).replace(/\n/g, '\\n')
}

function generateIcal(wedstrijden, teamNaam) {
  const events = wedstrijden.map(w => {
    const dtstart = formatICalDate(w.wedstrijddatum, w.aanvangstijd)

    // Eind = aanvang + 90 minuten
    const startDate = new Date(w.wedstrijddatum)
    if (w.aanvangstijd) {
      const [h, m] = w.aanvangstijd.split(':').map(Number)
      startDate.setHours(h, m + 90, 0, 0)
    } else {
      startDate.setHours(startDate.getHours() + 2)
    }
    const pad = n => String(n).padStart(2, '0')
    const dtend = `${startDate.getFullYear()}${pad(startDate.getMonth() + 1)}${pad(startDate.getDate())}T${pad(startDate.getHours())}${pad(startDate.getMinutes())}00`

    // Aanwezigheidstijd (45 min voor aanvang)
    let aanwezigheid = ''
    if (w.aanvangstijd) {
      const [h, m] = w.aanvangstijd.split(':').map(Number)
      const aanwezigDate = new Date(w.wedstrijddatum)
      aanwezigDate.setHours(h, m - 45, 0, 0)
      aanwezigheid = `Aanwezig: ${pad(aanwezigDate.getHours())}:${pad(aanwezigDate.getMinutes())}`
    }

    const location = [w.accommodatie, w.plaats].filter(Boolean).join(', ')
    const uid = `${w.wedstrijdcode || dtstart}-${teamNaam.replace(/\s/g, '')}@vvz49`

    return [
      'BEGIN:VEVENT',
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${escapeIcal(`${w.thuisteam} - ${w.uitteam}`)}`,
      location ? `LOCATION:${escapeIcal(location)}` : '',
      aanwezigheid ? `DESCRIPTION:${escapeIcal(aanwezigheid)}` : '',
      `UID:${uid}`,
      `DTSTAMP:${formatICalDate(new Date().toISOString().slice(0, 10), '00:00')}`,
      'END:VEVENT',
    ].filter(Boolean).join('\r\n')
  })

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//VVZ49 Toolbox//${teamNaam}//NL`,
    `X-WR-CALNAME:${teamNaam} Wedstrijden`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n'
}

async function main() {
  // Haal eerst teams op om teamcodes te koppelen
  const teams = await sportlinkFetch('teams', { gebruiklokaleteamgegevens: 'NEE' })

  for (const config of TEAM_CONFIG) {
    const team = teams.find(t => t.teamnaam === config.sportlinkNaam)
    if (!team) {
      console.log(`Team ${config.sportlinkNaam} niet gevonden, skip iCal`)
      continue
    }

    try {
      console.log(`Programma ophalen voor ${config.sportlinkNaam}...`)
      const programma = await sportlinkFetch('programma', { teamcode: team.teamcode })

      const ical = generateIcal(programma || [], config.sportlinkNaam)
      const filePath = `public/wedstrijden/ical/${config.slug}.ics`
      ensureDir(filePath)
      writeFileSync(filePath, ical)
      console.log(`Geschreven: ${filePath}`)
    } catch (err) {
      console.error(`Fout bij iCal voor ${config.sportlinkNaam}: ${err.message}`)
    }
  }

  console.log('Klaar!')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
