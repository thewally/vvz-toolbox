// Tests voor eigen-team-herkenning in src/services/wedstrijdenHelpers.js (kaart thewally/ontwikkelstraat#33).
// Draaien met: node --test tests/eigenTeam.test.mjs
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

let server
let m
const CLUB = 'BBCC89Q'
const ANDER = 'XXXX123'

before(async () => {
  server = await createServer({
    root: new URL('..', import.meta.url).pathname,
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  })
  m = await server.ssrLoadModule('/src/services/wedstrijdenHelpers.js')
})
after(async () => { await server.close() })

const w = (o) => ({
  thuisteam: 'A', uitteam: 'B', thuisteamid: 1, uitteamid: 2,
  thuisteamclubrelatiecode: ANDER, uitteamclubrelatiecode: ANDER, ...o,
})

test('gewoon VVZ-team thuis', () => {
  const x = w({ thuisteam: "VVZ '49 2", thuisteamclubrelatiecode: CLUB })
  assert.equal(m.eigenKant(x, CLUB), 'thuis')
  assert.equal(m.eigenTeamnaam(x, CLUB), "VVZ '49 2")
  assert.equal(m.eigenTeamid(x, CLUB), 1)
})

test('gewoon VVZ-team uit', () => {
  const x = w({ uitteam: "VVZ '49 3", uitteamclubrelatiecode: CLUB })
  assert.equal(m.eigenKant(x, CLUB), 'uit')
  assert.equal(m.eigenTeamid(x, CLUB), 2)
})

test('samenwerkingsteam thuis met afwijkende relatiecode en teamnaam gevuld', () => {
  const naam = "ST SO Soest/VVZ'49 JO14-6"
  const x = w({ thuisteam: naam, teamnaam: naam })
  assert.equal(m.eigenKant(x, CLUB), 'thuis')
  assert.equal(m.eigenTeamnaam(x, CLUB), naam)
})

test('samenwerkingsteam uit zonder teamnaam (uitslagen): herkend op naam', () => {
  const naam = "ST SO Soest/VVZ'49 JO14-6"
  const x = w({ uitteam: naam })
  assert.equal(m.eigenKant(x, CLUB), 'uit')
  assert.equal(m.eigenTeamnaam(x, CLUB), naam)
  assert.equal(m.eigenTeamid(x, CLUB), 2)
})

test('geen VVZ-team: null en geen crash', () => {
  const x = w({})
  assert.equal(m.eigenKant(x, CLUB), null)
  assert.equal(m.eigenTeamnaam(x, CLUB), null)
  assert.equal(m.eigenTeamid(x, CLUB), null)
  assert.equal(m.eigenKant(undefined, CLUB), null)
  assert.equal(m.eigenKant({}, CLUB), null)
})

test('beide teams VVZ: thuis wint', () => {
  const x = w({
    thuisteam: "VVZ '49 1", uitteam: "VVZ '49 2",
    thuisteamclubrelatiecode: CLUB, uitteamclubrelatiecode: CLUB,
  })
  assert.equal(m.eigenKant(x, CLUB), 'thuis')
})

test('beide teams VVZ op naam: thuis wint', () => {
  const x = w({ thuisteam: "VVZ '49 1", uitteam: "ST SO Soest/VVZ'49 JO14-6" })
  assert.equal(m.eigenKant(x, CLUB), 'thuis')
})

test('teamid -1 wordt genegeerd', () => {
  const x = w({ thuisteam: "VVZ '49 9", thuisteamid: -1, thuisteamclubrelatiecode: CLUB })
  assert.equal(m.eigenKant(x, CLUB), 'thuis')
  assert.equal(m.eigenTeamid(x, CLUB), null)
})

test('teamnaam gaat voor relatiecode', () => {
  const x = w({
    thuisteam: 'Tegenstander', uitteam: "ST SO Soest/VVZ'49 JO14-6",
    thuisteamclubrelatiecode: CLUB, teamnaam: "ST SO Soest/VVZ'49 JO14-6",
  })
  assert.equal(m.eigenKant(x, CLUB), 'uit')
})

test('isEigenNaam varianten', () => {
  assert.ok(m.isEigenNaam("VVZ '49 1"))
  assert.ok(m.isEigenNaam("VVZ'49 JO14-6"))
  assert.ok(m.isEigenNaam('VVZ’49 1'))
  assert.ok(!m.isEigenNaam('All Stars Baarn 3'))
  assert.ok(!m.isEigenNaam(undefined))
})

test('getVvzTeamcode en groepeerPerDag werken met samenwerkingsteam', () => {
  const naam = "ST SO Soest/VVZ'49 JO14-6"
  const x = w({ uitteam: naam, wedstrijddatum: '2026-11-07T10:00:00+0100', aanvangstijd: '10:00' })
  const lookup = m.buildTeamcodeLookup([{ teamnaam: naam, teamcode: 77 }])
  assert.equal(m.getVvzTeamcode(x, lookup), 77)
  assert.equal(m.groepeerPerDag([x]).size, 1)
})
