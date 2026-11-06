// Tests voor apiFetch in src/services/sportlink.js (kaart thewally/ontwikkelstraat#23).
// Draaien met: node --test tests/sportlink.test.mjs
import { test, before, after, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

let server
let m
const origFetch = globalThis.fetch

before(async () => {
  server = await createServer({
    root: new URL('..', import.meta.url).pathname,
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  })
  m = await server.ssrLoadModule('/src/services/sportlink.js')
})
after(async () => { await server.close() })
afterEach(() => { globalThis.fetch = origFetch })

const ok = body => ({ ok: true, status: 200, json: async () => body })
const fail = status => ({ ok: false, status, json: async () => ({}) })

test('geeft data terug bij succes in een keer', async () => {
  let calls = 0
  globalThis.fetch = async () => { calls++; return ok([1]) }
  const r = await m.apiFetch('/teams', { delayMs: 1 })
  assert.deepEqual(r, { data: [1], error: null })
  assert.equal(calls, 1)
})

test('slapende service: 503 en netwerkfout, daarna data', async () => {
  const antwoorden = [() => fail(503), () => { throw new Error('Failed to fetch') }, () => ok({ a: 1 })]
  let i = 0
  globalThis.fetch = async () => antwoorden[i++]()
  const r = await m.apiFetch('/programma', { delayMs: 1 })
  assert.deepEqual(r.data, { a: 1 })
  assert.equal(r.error, null)
  assert.equal(i, 3)
})

test('standaard 4 pogingen; daarna een foutmelding, geen exception', async () => {
  let calls = 0
  globalThis.fetch = async () => { calls++; return fail(502) }
  const r = await m.apiFetch('/teams', { delayMs: 1 })
  assert.equal(r.data, null)
  assert.match(r.error.message, /HTTP 502/)
  assert.equal(calls, 4)
})
