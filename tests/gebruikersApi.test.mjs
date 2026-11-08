import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BACKEND_ROLLEN, VINKBARE_ROLLEN, deriveApiBase, mapApiError, maakGebruikersApi,
  bouwRollenlijst, formatLaatsteLogin, MSG_GEEN_TOEGANG,
} from '../src/lib/gebruikersHelpers.js'

const BASE = 'https://api.example.onrender.com'

function nepFetch(antwoorden) {
  const calls = []
  const fn = async (url, opts) => {
    calls.push({ url, opts })
    const a = antwoorden[Math.min(calls.length - 1, antwoorden.length - 1)]
    if (a instanceof Error) throw a
    return a
  }
  fn.calls = calls
  return fn
}
const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status })

function client(fetchFn, extra = {}) {
  return maakGebruikersApi({ baseUrl: BASE, getToken: async () => 'tok', fetchFn, delayMs: 1, ...extra })
}

test('rollenlijst gelijk aan de backend-whitelist', () => {
  assert.deepEqual([...BACKEND_ROLLEN].sort(), [
    'activiteiten', 'admin', 'contact', 'ereleden', 'lid-worden', 'nieuws',
    'paginas', 'reglementen', 'sponsoring', 'trainingsschema', 'verslagen', 'vrijwilligers',
  ])
  assert.ok(!BACKEND_ROLLEN.includes('gebruikers'))
  assert.ok(!VINKBARE_ROLLEN.includes('admin'))
  assert.ok(!VINKBARE_ROLLEN.includes('activiteiten'))
})

test('basis-url afleiden uit proxy-url of override', () => {
  assert.equal(deriveApiBase(`${BASE}/api/sportlink`), BASE)
  assert.equal(deriveApiBase(`${BASE}/api/sportlink/`), BASE)
  assert.equal(deriveApiBase(`${BASE}/api/sportlink`, 'https://x.nl/'), 'https://x.nl')
  assert.equal(deriveApiBase(undefined, undefined), null)
  assert.equal(deriveApiBase('', ''), null)
  assert.equal(deriveApiBase('geen-url'), null)
})

test('foutmapping per statuscode', () => {
  assert.equal(mapApiError(401, 'lijst'), MSG_GEEN_TOEGANG)
  assert.equal(mapApiError(403, 'rollen'), MSG_GEEN_TOEGANG)
  assert.equal(mapApiError(409, 'uitnodigen'), 'Dit e-mailadres bestaat al.')
  assert.match(mapApiError(400, 'uitnodigen', 'engels'), /Controleer/)
  assert.equal(mapApiError(400, 'rollen', 'Je kunt je eigen beheerderrol niet verwijderen.'), 'Je kunt je eigen beheerderrol niet verwijderen.')
  assert.match(mapApiError(404, 'verwijderen'), /bestaat niet/)
  assert.match(mapApiError(502, 'lijst'), /niet bereikbaar/)
  assert.match(mapApiError(0, 'lijst'), /Geen verbinding/)
  assert.match(mapApiError(500, 'lijst'), /misgegaan|mis/)
})

test('lijst: GET met Bearer-token', async () => {
  const f = nepFetch([json(200, [{ id: 'a', email: 'a@b.nl', rollen: [] }])])
  const { data, error } = await client(f).lijstGebruikers()
  assert.equal(error, null)
  assert.equal(data.length, 1)
  assert.equal(f.calls[0].url, `${BASE}/api/gebruikers`)
  assert.equal(f.calls[0].opts.method, 'GET')
  assert.equal(f.calls[0].opts.headers.Authorization, 'Bearer tok')
  assert.equal(f.calls[0].opts.body, undefined)
})

test('uitnodigen: POST met body, 409 en 400', async () => {
  const f = nepFetch([json(201, { id: 'x' })])
  const r = await client(f).maakGebruiker({ email: 'n@v.nl', display_name: 'Nel', rollen: ['nieuws'] })
  assert.equal(r.error, null)
  assert.equal(f.calls[0].opts.method, 'POST')
  assert.deepEqual(JSON.parse(f.calls[0].opts.body), { email: 'n@v.nl', display_name: 'Nel', rollen: ['nieuws'] })
  assert.equal(f.calls[0].opts.headers['Content-Type'], 'application/json')

  const f409 = nepFetch([json(409, { message: 'exists' })])
  const r409 = await client(f409).maakGebruiker({ email: 'n@v.nl', rollen: [] })
  assert.equal(r409.error.status, 409)
  assert.equal(r409.error.message, 'Dit e-mailadres bestaat al.')
  assert.equal(JSON.parse(f409.calls[0].opts.body).display_name, undefined)

  const r400 = await client(nepFetch([json(400, { message: 'bad' })])).maakGebruiker({ email: 'x', rollen: [] })
  assert.equal(r400.error.status, 400)
  assert.match(r400.error.message, /Controleer/)
})

test('rollen: PUT met volledige lijst; 400 toont servermelding', async () => {
  const f = nepFetch([json(200, {})])
  await client(f).zetRollen('auth0|123', ['admin', 'nieuws'])
  assert.equal(f.calls[0].url, `${BASE}/api/gebruikers/auth0%7C123/rollen`)
  assert.equal(f.calls[0].opts.method, 'PUT')
  assert.deepEqual(JSON.parse(f.calls[0].opts.body), { rollen: ['admin', 'nieuws'] })

  const r = await client(nepFetch([json(400, { message: 'Je kunt je eigen beheerderrol niet verwijderen.' })])).zetRollen('a', [])
  assert.equal(r.error.message, 'Je kunt je eigen beheerderrol niet verwijderen.')
})

test('verwijderen en opnieuw uitnodigen', async () => {
  const f = nepFetch([new Response(null, { status: 204 })])
  const r = await client(f).verwijderGebruiker('u1')
  assert.equal(r.error, null)
  assert.equal(f.calls[0].opts.method, 'DELETE')
  assert.equal(f.calls[0].url, `${BASE}/api/gebruikers/u1`)

  const f404 = nepFetch([json(404, {})])
  assert.equal((await client(f404).verwijderGebruiker('u1')).error.status, 404)

  const f2 = nepFetch([new Response(null, { status: 202 })])
  const r2 = await client(f2).stuurUitnodiging('u1')
  assert.equal(r2.error, null)
  assert.equal(f2.calls[0].url, `${BASE}/api/gebruikers/u1/uitnodiging`)
  assert.equal(f2.calls[0].opts.method, 'POST')
})

test('geen token of geen basis-url: geen verzoek', async () => {
  const f = nepFetch([json(200, [])])
  const r = await maakGebruikersApi({ baseUrl: BASE, getToken: async () => null, fetchFn: f }).lijstGebruikers()
  assert.equal(r.error.message, MSG_GEEN_TOEGANG)
  const r2 = await maakGebruikersApi({ baseUrl: null, getToken: async () => 'tok', fetchFn: f }).lijstGebruikers()
  assert.match(r2.error.message, /API-url/)
  assert.equal(f.calls.length, 0)
})

test('lijst herhaalt bij 502 en netwerkfout, acties niet', async () => {
  const f = nepFetch([json(502, {}), new TypeError('failed'), json(200, [])])
  const r = await client(f).lijstGebruikers()
  assert.equal(r.error, null)
  assert.equal(f.calls.length, 3)

  const fAlles = nepFetch([json(502, {})])
  const r2 = await client(fAlles, { retries: 3 }).lijstGebruikers()
  assert.equal(r2.error.status, 502)
  assert.equal(fAlles.calls.length, 3)

  const f403 = nepFetch([json(403, {})])
  await client(f403).lijstGebruikers()
  assert.equal(f403.calls.length, 1)

  const fPost = nepFetch([json(502, {})])
  await client(fPost).maakGebruiker({ email: 'a@b.nl', rollen: [] })
  assert.equal(fPost.calls.length, 1)
  const fDel = nepFetch([new TypeError('failed')])
  const rd = await client(fDel).verwijderGebruiker('u')
  assert.equal(fDel.calls.length, 1)
  assert.equal(rd.error.status, 0)
})

test('rollenlijst bouwen: verborgen rollen blijven behouden', () => {
  assert.deepEqual(bouwRollenlijst({ huidig: ['activiteiten', 'nieuws'], aangevinkt: ['contact'], admin: false }), ['activiteiten', 'contact'])
  assert.deepEqual(bouwRollenlijst({ huidig: [], aangevinkt: ['nieuws', 'nieuws', 'onbekend'], admin: true }), ['admin', 'nieuws'])
  assert.deepEqual(bouwRollenlijst({ huidig: ['admin'], aangevinkt: [], admin: false }), [])
})

test('laatste login', () => {
  assert.equal(formatLaatsteLogin(null), 'Nog nooit')
  assert.equal(formatLaatsteLogin(''), 'Nog nooit')
  assert.equal(formatLaatsteLogin('rommel'), 'Nog nooit')
  assert.notEqual(formatLaatsteLogin('2026-11-01T10:00:00Z'), 'Nog nooit')
})
