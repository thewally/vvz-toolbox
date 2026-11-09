// Tests voor src/services/teamlijstcache.js (kaart thewally/ontwikkelstraat#73).
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

let server
let maakTeamlijstCache

before(async () => {
  server = await createServer({
    root: new URL('..', import.meta.url).pathname,
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  })
  ;({ maakTeamlijstCache } = await server.ssrLoadModule('/src/services/teamlijstcache.js'))
})
after(async () => { await server.close() })

function opslag(start = {}) {
  const m = new Map(Object.entries(start))
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), m }
}
function opstelling({ storage = opslag(), antwoorden } = {}) {
  let t = 1000
  let calls = 0
  const fetcher = async () => {
    const a = antwoorden[Math.min(calls, antwoorden.length - 1)]
    calls++
    if (a instanceof Error) throw a
    return a
  }
  const cache = maakTeamlijstCache({ fetcher, now: () => t, storage, ttl: 300000, sleutel: 'k' })
  return { cache, tijd: (ms) => { t += ms }, calls: () => calls, storage }
}
const ok = (data) => ({ data, error: null })

test('verse cache doet geen tweede fetch', async () => {
  const o = opstelling({ antwoorden: [ok([{ teamcode: 1 }])] })
  await o.cache.haal()
  o.tijd(1000)
  const r = await o.cache.haal()
  assert.equal(o.calls(), 1)
  assert.deepEqual(r.data, [{ teamcode: 1 }])
  assert.equal(r.stale, false)
})

test('gelijktijdige aanroepen delen een verzoek', async () => {
  const o = opstelling({ antwoorden: [ok([{ teamcode: 1 }])] })
  const [a, b] = await Promise.all([o.cache.haal(), o.cache.haal()])
  assert.equal(o.calls(), 1)
  assert.deepEqual(a.data, b.data)
})

test('verlopen cache geeft oude data en ververst op de achtergrond', async () => {
  const o = opstelling({ antwoorden: [ok([{ teamcode: 1 }]), ok([{ teamcode: 2 }])] })
  let nieuw = null
  o.cache.abonneer((d) => { nieuw = d })
  await o.cache.haal()
  o.tijd(300001)
  const r = await o.cache.haal()
  assert.equal(r.stale, true)
  assert.deepEqual(r.data, [{ teamcode: 1 }])
  await new Promise((res) => setImmediate(res))
  assert.equal(o.calls(), 2)
  assert.deepEqual(nieuw, [{ teamcode: 2 }])
  assert.deepEqual(o.cache.peek(), [{ teamcode: 2 }])
})

test('fout wordt niet gecachet', async () => {
  const o = opstelling({ antwoorden: [{ data: null, error: new Error('stuk') }, ok([{ teamcode: 1 }])] })
  const r1 = await o.cache.haal()
  assert.ok(r1.error)
  assert.equal(o.cache.peek(), null)
  assert.equal(o.storage.m.size, 0)
  const r2 = await o.cache.haal()
  assert.equal(r2.error, null)
  assert.equal(o.calls(), 2)
})

test('gegooide fout wordt een fout en niet gecachet', async () => {
  const o = opstelling({ antwoorden: [new Error('netwerk')] })
  const r = await o.cache.haal()
  assert.equal(r.error.message, 'netwerk')
  assert.equal(o.cache.peek(), null)
})

test('fout met oude cache geeft de oude data', async () => {
  const o = opstelling({ antwoorden: [ok([{ teamcode: 1 }]), { data: null, error: new Error('stuk') }] })
  await o.cache.haal()
  o.tijd(400000)
  const r = await o.cache.haal()
  await new Promise((res) => setImmediate(res))
  assert.equal(r.error, null)
  assert.deepEqual(r.data, [{ teamcode: 1 }])
  assert.deepEqual(o.cache.peek(), [{ teamcode: 1 }])
})

test('sessionStorage wordt gebruikt bij een nieuwe start', async () => {
  const s = opslag({ k: JSON.stringify({ data: [{ teamcode: 9 }], tijd: 1000 }) })
  const o = opstelling({ storage: s, antwoorden: [ok([])] })
  const r = await o.cache.haal()
  assert.deepEqual(r.data, [{ teamcode: 9 }])
  assert.equal(o.calls(), 0)
})

test('kapotte of ontbrekende opslag valt netjes terug', async () => {
  const kapot = opstelling({ storage: opslag({ k: '{geen json' }), antwoorden: [ok([{ teamcode: 1 }])] })
  assert.deepEqual((await kapot.cache.haal()).data, [{ teamcode: 1 }])
  const gooit = { getItem() { throw new Error('x') }, setItem() { throw new Error('x') } }
  const o2 = opstelling({ storage: gooit, antwoorden: [ok([{ teamcode: 2 }])] })
  assert.deepEqual((await o2.cache.haal()).data, [{ teamcode: 2 }])
  const o3 = opstelling({ storage: null, antwoorden: [ok([{ teamcode: 3 }])] })
  assert.deepEqual((await o3.cache.haal()).data, [{ teamcode: 3 }])
})
