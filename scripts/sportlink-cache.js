#!/usr/bin/env node

/**
 * Sportlink Data Cache Script
 * Haalt teams en staf op van de Sportlink API en schrijft naar statische JSON bestanden.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { dirname } from 'path'

const CLIENT_ID = process.env.SPORTLINK_CLIENT_ID
const CLUB_RELATIECODE = process.env.SPORTLINK_CLUB_RELATIECODE
const BASE_URL = 'https://data.sportlink.com'

const TEAM_CONFIG = [
  { slug: 'selectie',    sportlinkNaam: "VVZ '49 1" },
  { slug: 'veteranen',   sportlinkNaam: "VVZ '49 2" },
  { slug: 'derde',       sportlinkNaam: "VVZ '49 3" },
  { slug: '35-mannen',   sportlinkNaam: "VVZ '49 35+1" },
  { slug: '45-mannen',   sportlinkNaam: "VVZ '49 45+1" },
  { slug: 'jo19-1',      sportlinkNaam: "VVZ '49 JO19-1" },
  { slug: 'jo16-1',      sportlinkNaam: "VVZ '49 JO16-1" },
  { slug: 'jo15-1',      sportlinkNaam: "VVZ '49 JO15-1" },
  { slug: 'jo14-1',      sportlinkNaam: "VVZ '49 JO14-1" },
  { slug: 'jo13-1',      sportlinkNaam: "VVZ '49 JO13-1" },
  { slug: 'jo12-1',      sportlinkNaam: "VVZ '49 JO12-1" },
  { slug: 'jo11-1',      sportlinkNaam: "VVZ '49 JO11-1" },
  { slug: 'jo10-1',      sportlinkNaam: "VVZ '49 JO10-1" },
  { slug: 'jo9-1',       sportlinkNaam: "VVZ '49 JO9-1" },
]

if (!CLIENT_ID || !CLUB_RELATIECODE) {
  console.error('SPORTLINK_CLIENT_ID en SPORTLINK_CLUB_RELATIECODE moeten als env vars gezet zijn')
  process.exit(1)
}

async function sportlinkFetch(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}/${endpoint}`)
  url.searchParams.set('client_id', CLIENT_ID)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const response = await fetch(url.toString())
  if (!response.ok) throw new Error(`Sportlink API error: ${response.status} voor ${endpoint}`)
  return response.json()
}

function ensureDir(filePath) {
  const dir = dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function writeJSON(filePath, data) {
  ensureDir(filePath)
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n')
  console.log(`Geschreven: ${filePath}`)
}

async function main() {
  console.log('Teams ophalen...')
  const teams = await sportlinkFetch('teams', { gebruiklokaleteamgegevens: 'NEE' })

  // Dedupliceer op teamcode, filter op regulier
  const gezien = new Set()
  const uniek = teams.filter(t => {
    if (gezien.has(t.teamcode)) return false
    gezien.add(t.teamcode)
    return t.competitiesoort === 'regulier'
  })

  writeJSON('public/data/teams.json', uniek)

  // Staf per team
  for (const config of TEAM_CONFIG) {
    const team = uniek.find(t => t.teamnaam === config.sportlinkNaam)
    if (!team) {
      console.log(`Team ${config.sportlinkNaam} niet gevonden, skip staf`)
      continue
    }

    try {
      console.log(`Staf ophalen voor ${config.sportlinkNaam}...`)
      const indeling = await sportlinkFetch('team-indeling', {
        teamcode: team.teamcode,
        lokaleteamcode: '-1',
        gebruiklokaleteamgegevens: 'NEE',
      })

      const staf = (indeling || []).filter(
        p => p.rol !== 'Teamspeler' && p.naam !== 'Afgeschermd'
      )

      writeJSON(`public/data/staf/${config.slug}.json`, staf)
    } catch (err) {
      console.error(`Fout bij staf voor ${config.sportlinkNaam}: ${err.message}`)
    }
  }

  console.log('Klaar!')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
