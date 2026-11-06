import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

let server
let formatTeamnaam
let teamVolgnummer

before(async () => {
  server = await createServer({
    root: new URL('..', import.meta.url).pathname,
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  })
  const m = await server.ssrLoadModule('/src/services/wedstrijdenHelpers.js')
  formatTeamnaam = m.formatTeamnaam
  teamVolgnummer = m.teamVolgnummer
})
after(async () => { await server.close() })

test('jeugdteams worden JO', () => {
  assert.equal(formatTeamnaam("VVZ '49 O13-1", 'man'), 'JO13-1')
  assert.equal(formatTeamnaam("VVZ '49 O8-1", 'man'), 'JO8-1')
  assert.equal(formatTeamnaam("VVZ '49 O19-2", 'man'), 'JO19-2')
})

test('geslacht vrouw geeft MO, bestaand JO/MO blijft', () => {
  assert.equal(formatTeamnaam("VVZ '49 O13-1", 'vrouw'), 'MO13-1')
  assert.equal(formatTeamnaam("VVZ '49 JO13-1", 'vrouw'), 'JO13-1')
  assert.equal(formatTeamnaam("VVZ '49 MO13-1", 'man'), 'MO13-1')
})

test('samenwerkingsteams O14-1, O14-2 en O14-6', () => {
  assert.equal(formatTeamnaam("ST SO Soest/VVZ'49 O14-1", 'man'), 'JO14-1')
  assert.equal(formatTeamnaam("ST SO Soest/VVZ'49 O14-2", 'man'), 'JO14-2')
  assert.equal(formatTeamnaam("ST SO Soest/VVZ'49 O14-6", 'man'), 'JO14-6')
})

test('curly apostrof en teamobject', () => {
  assert.equal(formatTeamnaam('VVZ ’49 O14-1'), 'JO14-1')
  assert.equal(formatTeamnaam({ teamnaam: "VVZ '49 O14-1", geslacht: 'vrouw' }), 'MO14-1')
})

test('senioren en veteranen', () => {
  assert.equal(formatTeamnaam("VVZ '49 3"), 'VVZ 3')
  assert.equal(formatTeamnaam("VVZ '49 1"), 'VVZ 1')
  assert.equal(formatTeamnaam("VVZ '49 35+1"), '35+ 1')
  assert.equal(formatTeamnaam("VVZ '49 45+1"), '45+ 1')
})

test('O23 blijft O23', () => {
  assert.equal(formatTeamnaam("VVZ '49 O23-1", 'man'), 'O23-1')
})

test('onbekend patroon, leeg en ontbrekend', () => {
  assert.equal(formatTeamnaam("VVZ '49 Champions League"), 'Champions League')
  assert.equal(formatTeamnaam('Iets anders'), 'Iets anders')
  assert.equal(formatTeamnaam("VVZ '49"), "VVZ '49")
  assert.equal(formatTeamnaam(''), '')
  assert.equal(formatTeamnaam(undefined), '')
  assert.equal(formatTeamnaam(null), '')
})

test('volgnummer sorteert numeriek', () => {
  const namen = ["VVZ '49 O14-10", "VVZ '49 O14-2", "VVZ '49 O14-9"]
  const gesorteerd = [...namen].sort((a, b) => teamVolgnummer(a) - teamVolgnummer(b))
  assert.deepEqual(gesorteerd, ["VVZ '49 O14-2", "VVZ '49 O14-9", "VVZ '49 O14-10"])
})
