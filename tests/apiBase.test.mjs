// Tests voor src/lib/apiBase.js en fetchKnvbNieuws (kaart thewally/ontwikkelstraat#64).
import { test, before, after, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

let server
let b
let nieuws
const origFetch = globalThis.fetch
const origError = console.error

before(async () => {
  server = await createServer({
    root: new URL('..', import.meta.url).pathname,
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  })
  b = await server.ssrLoadModule('/src/lib/apiBase.js')
  nieuws = await server.ssrLoadModule('/src/services/knvbNieuws.js')
})
after(async () => { await server.close() })
afterEach(() => { globalThis.fetch = origFetch; console.error = origError })

test('bepaalApiBase: VITE_API_URL gaat voor, zonder slash aan het eind', () => {
  assert.equal(b.bepaalApiBase({ apiUrl: 'https://x.onrender.com/', sportlinkProxyUrl: 'https://y.com/api/sportlink' }), 'https://x.onrender.com')
})

test('bepaalApiBase: terugval op proxy-url zonder /api/sportlink', () => {
  assert.equal(b.bepaalApiBase({ sportlinkProxyUrl: 'https://y.onrender.com/api/sportlink/' }), 'https://y.onrender.com')
})

test('bepaalApiBase: geen bruikbare url geeft lege string', () => {
  assert.equal(b.bepaalApiBase({ sportlinkProxyUrl: 'https://worker.workers.dev' }), '')
  assert.equal(b.bepaalApiBase({}), '')
  assert.equal(b.bepaalApiBase(), '')
})

test('imageProxyUrl codeert de url', () => {
  assert.equal(
    b.imageProxyUrl('https://x.com', 'https://a.nl/f.png?a=1&b=2'),
    'https://x.com/api/image-proxy?url=https%3A%2F%2Fa.nl%2Ff.png%3Fa%3D1%26b%3D2',
  )
})

test('teamIcalUrl bouwt het pad met teamcode', () => {
  assert.equal(b.teamIcalUrl('https://x.com', 'JO11-1'), 'https://x.com/api/team-ical?teamcode=JO11-1')
})

test('webcalUrl: https, hoofdletters en http', () => {
  assert.equal(b.webcalUrl('https://x.com/a'), 'webcal://x.com/a')
  assert.equal(b.webcalUrl('HTTPS://x.com/a'), 'webcal://x.com/a')
  assert.equal(b.webcalUrl('http://localhost:8080/a'), 'http://localhost:8080/a')
  assert.equal(b.webcalUrl('https://x.com/a?u=https://y'), 'webcal://x.com/a?u=https://y')
})

const ok = body => ({ ok: true, status: 200, json: async () => body })
const opt = { base: 'https://x.com', delayMs: 1 }

test('fetchKnvbNieuws: 200 met array, op het juiste pad', async () => {
  let url
  globalThis.fetch = async u => { url = u; return ok([{ a: 1 }]) }
  assert.deepEqual(await nieuws.fetchKnvbNieuws(opt), [{ a: 1 }])
  assert.equal(url, 'https://x.com/api/knvb-nieuws')
})

test('fetchKnvbNieuws: niet-array geeft []', async () => {
  globalThis.fetch = async () => ok({ x: 1 })
  assert.deepEqual(await nieuws.fetchKnvbNieuws(opt), [])
})

test('fetchKnvbNieuws: 500 wordt opnieuw geprobeerd (4x) en geeft []', async () => {
  let calls = 0
  globalThis.fetch = async () => { calls++; return { ok: false, status: 500, json: async () => ({}) } }
  assert.deepEqual(await nieuws.fetchKnvbNieuws(opt), [])
  assert.equal(calls, 4)
})

test('fetchKnvbNieuws: netwerkfout daarna succes', async () => {
  let calls = 0
  globalThis.fetch = async () => { calls++; if (calls < 3) throw new Error('netwerk'); return ok([1]) }
  assert.deepEqual(await nieuws.fetchKnvbNieuws(opt), [1])
})

test('fetchKnvbNieuws: netwerkfout altijd geeft []', async () => {
  globalThis.fetch = async () => { throw new Error('netwerk') }
  assert.deepEqual(await nieuws.fetchKnvbNieuws(opt), [])
})

test('fetchKnvbNieuws zonder base geeft [] zonder fetch', async () => {
  globalThis.fetch = async () => { throw new Error('mag niet aangeroepen worden') }
  assert.deepEqual(await nieuws.fetchKnvbNieuws({ base: '' }), [])
})
