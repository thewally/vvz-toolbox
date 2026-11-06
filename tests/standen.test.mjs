// Tests voor getTeamCategorie en kiesPouleMetStand in src/services/wedstrijdenHelpers.js
// (kaart thewally/ontwikkelstraat#35). Draaien met: node --test tests/standen.test.mjs
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

let server
let m

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

test('getTeamCategorie: jeugd via "Onder N"', () => {
  assert.equal(m.getTeamCategorie({ teamnaam: "VVZ '49 O13-1", leeftijdscategorie: 'Onder 13' }), 'junioren')
  assert.equal(m.getTeamCategorie({ teamnaam: "VVZ '49 O12-1", leeftijdscategorie: 'Onder 12' }), 'pupillen')
  assert.equal(m.getTeamCategorie({ teamnaam: "VVZ '49 O9-2", leeftijdscategorie: 'Onder 9' }), 'pupillen')
})

test('getTeamCategorie: O8-1 zonder leeftijdscategorie is pupillen', () => {
  assert.equal(m.getTeamCategorie({ teamnaam: "VVZ '49 O8-1" }), 'pupillen')
})

test('getTeamCategorie: O23 blijft senioren', () => {
  assert.equal(m.getTeamCategorie({ teamnaam: "VVZ '49 O23-1", leeftijdscategorie: 'Onder 23', speeldag: 'Zaterdag' }), 'senioren')
  assert.equal(m.getTeamCategorie({ teamnaam: "VVZ '49 O23-1" }), 'senioren')
})

test('getTeamCategorie: veteranen', () => {
  assert.equal(m.getTeamCategorie({ teamnaam: "VVZ '49 35+1" }), 'veteranen')
  assert.equal(m.getTeamCategorie({ teamnaam: "VVZ '49 45+1" }), 'veteranen')
})

test('getTeamCategorie: zaal en senioren via speeldag', () => {
  assert.equal(m.getTeamCategorie({ teamnaam: "VVZ '49 1" }), 'zaal')
  assert.equal(m.getTeamCategorie({ teamnaam: "VVZ '49 1", speeldag: 'Zaterdag' }), 'senioren')
  assert.equal(m.getTeamCategorie({ teamnaam: "VVZ '49 2", speeldag: 'Zondag' }), 'senioren')
})

test('getTeamCategorie: JO13/MO13 zonder leeftijdscategorie', () => {
  assert.equal(m.getTeamCategorie({ teamnaam: 'JO13-1' }), 'junioren')
  assert.equal(m.getTeamCategorie({ teamnaam: 'MO13-1' }), 'junioren')
  assert.equal(m.getTeamCategorie({ teamnaam: 'JO11-1' }), 'pupillen')
})

const poules = [{ poulecode: 1 }, { poulecode: 2 }]
const rij = [{ positie: 1 }]

test('kiesPouleMetStand: lege gekozen poule, andere heeft rijen', () => {
  const standen = { 1: { data: [], error: null }, 2: { data: rij, error: null } }
  assert.equal(m.kiesPouleMetStand(poules, 1, standen), 2)
})

test('kiesPouleMetStand: alle leeg blijft de gekozen poule', () => {
  const standen = { 1: { data: [], error: null }, 2: { data: [], error: null } }
  assert.equal(m.kiesPouleMetStand(poules, 1, standen), 1)
})

test('kiesPouleMetStand: gekozen poule met rijen blijft staan', () => {
  const standen = { 1: { data: rij, error: null }, 2: { data: rij, error: null } }
  assert.equal(m.kiesPouleMetStand(poules, 1, standen), 1)
})

test('kiesPouleMetStand: bij een fout blijft de gekozen poule', () => {
  const standen = { 1: { data: [], error: 'fout' }, 2: { data: rij, error: null } }
  assert.equal(m.kiesPouleMetStand(poules, 1, standen), 1)
})
