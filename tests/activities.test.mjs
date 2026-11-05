// Tests voor src/services/activities.js (kaart ontwikkelstraat#19).
// Draaien met: node --test tests/activities.test.mjs
// Vite laadt de module zodat extensieloze imports en import.meta.env werken.
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
  m = await server.ssrLoadModule('/src/services/activities.js')
})

after(async () => {
  await server.close()
})

const rec = (o = {}) => ({
  activiteit: 'Testactiviteit',
  datumvan: '2026-12-02T15:30:00+0100',
  datumtm: '2026-12-02T18:00:00+0100',
  heledag: 'false',
  opmerkingen: 'Opm',
  url: null,
  ...o,
})

test('parseDagenVooruit: standaard en terugval op 100', () => {
  for (const v of [undefined, null, '', '  ', 'abc', '99', '0', '-5', '100.5', 'NaN']) {
    assert.equal(m.parseDagenVooruit(v), 100, `waarde ${JSON.stringify(v)}`)
  }
  assert.equal(m.parseDagenVooruit('100'), 100)
  assert.equal(m.parseDagenVooruit('180'), 180)
  assert.equal(m.parseDagenVooruit(365), 365)
})

test('veiligeUrl: alleen http(s) of intern pad', () => {
  assert.equal(m.veiligeUrl('https://www.vvz49.nl/x'), 'https://www.vvz49.nl/x')
  assert.equal(m.veiligeUrl('http://a.nl'), 'http://a.nl')
  assert.equal(m.veiligeUrl('/nieuws'), '/nieuws')
  for (const v of ['javascript:alert(1)', 'data:text/html,x', '//evil.nl', 'ftp://a', '', null, undefined, 5, 'vvz49.nl']) {
    assert.equal(m.veiligeUrl(v), null, String(v))
  }
})

test('mapActiviteit: velden, hele dag, meerdaags, ontbrekende velden', () => {
  const a = m.mapActiviteit(rec())
  assert.equal(a.title, 'Testactiviteit')
  assert.equal(a.startDate, '2026-12-02')
  assert.equal(a.endDate, null)
  assert.equal(a.timeStart, '15:30')
  assert.equal(a.timeEnd, '18:00')
  assert.equal(a.url, null)

  const dag = m.mapActiviteit(rec({ heledag: 'true' }))
  assert.equal(dag.timeStart, null)
  assert.equal(dag.timeEnd, null)

  const meer = m.mapActiviteit(rec({ datumtm: '2026-12-04T10:00:00+0100' }))
  assert.equal(meer.endDate, '2026-12-04')

  const kaal = m.mapActiviteit({ activiteit: 'X', datumvan: '2026-12-02T09:00:00+0100' })
  assert.equal(kaal.timeEnd, null)
  assert.equal(kaal.description, '')
  assert.equal(kaal.endDate, null)

  assert.equal(m.mapActiviteit({ datumvan: '2026-12-02T09:00:00+0100' }), null)
  assert.equal(m.mapActiviteit({ activiteit: 'X' }), null)
  assert.equal(m.mapActiviteit(null), null)
  assert.equal(m.mapActiviteit(rec({ url: 'javascript:alert(1)' })).url, null)
})

test('verwerkActiviteiten: grenzen, lopende meerdaagse, sortering, rommel', () => {
  const vandaag = new Date(2026, 10, 5, 12, 0) // 5 nov 2026
  // 100 dagen later = 13 feb 2027
  const records = [
    rec({ activiteit: 'Gisteren', datumvan: '2026-11-04T10:00:00+0100', datumtm: '2026-11-04T12:00:00+0100' }),
    rec({ activiteit: 'Vandaag laat', datumvan: '2026-11-05T22:00:00+0100', datumtm: '2026-11-05T23:00:00+0100' }),
    rec({ activiteit: 'Lopend', datumvan: '2026-11-03T10:00:00+0100', datumtm: '2026-11-06T12:00:00+0100' }),
    rec({ activiteit: 'Dag 100', datumvan: '2027-02-13T10:00:00+0100', datumtm: '2027-02-13T12:00:00+0100' }),
    rec({ activiteit: 'Dag 101', datumvan: '2027-02-14T10:00:00+0100', datumtm: '2027-02-14T12:00:00+0100' }),
    rec({ activiteit: 'Vandaag vroeg', datumvan: '2026-11-05T08:00:00+0100', datumtm: '2026-11-05T09:00:00+0100' }),
    null,
    {},
  ]
  const r = m.verwerkActiviteiten(records, { vandaag, dagen: 100 })
  const titels = r.map(x => x.title)
  assert.ok(!titels.includes('Gisteren'))
  assert.ok(!titels.includes('Dag 101'))
  assert.ok(titels.includes('Dag 100'))
  assert.ok(titels.includes('Lopend'))
  assert.deepEqual(titels, ['Lopend', 'Vandaag vroeg', 'Vandaag laat', 'Dag 100'])

  assert.deepEqual(m.verwerkActiviteiten(undefined, { vandaag }), [])
  assert.deepEqual(m.verwerkActiviteiten({}, { vandaag }), [])

  const r180 = m.verwerkActiviteiten(records, { vandaag, dagen: 180 })
  assert.ok(r180.map(x => x.title).includes('Dag 101'))
})
