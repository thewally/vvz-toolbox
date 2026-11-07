import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

let server
let teamFotoUrl

before(async () => {
  server = await createServer({
    root: new URL('..', import.meta.url).pathname,
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  })
  const m = await server.ssrLoadModule('/src/services/sportlink.js')
  teamFotoUrl = m.teamFotoUrl
})
after(async () => { await server.close() })

test('teamFotoUrl bouwt het team-foto-pad met teamcode', () => {
  const url = teamFotoUrl(275713)
  assert.ok(url.endsWith('/team-foto?teamcode=275713'))
})

test('teamFotoUrl encodeert speciale tekens', () => {
  const url = teamFotoUrl('a&b=c d')
  assert.ok(url.endsWith('/team-foto?teamcode=a%26b%3Dc%20d'))
})
