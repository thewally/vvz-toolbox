import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

let server
let render

before(async () => {
  server = await createServer({
    root: new URL('..', import.meta.url).pathname,
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
  })
  const React = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { MemoryRouter } = await import('react-router-dom')
  const kaart = await server.ssrLoadModule('/src/components/TeamKaart.jsx')
  const h = (React.default || React).createElement
  render = (team) => renderToStaticMarkup(h(MemoryRouter, null, h(kaart.default, { team })))
})
after(async () => { await server.close() })

test('kaart: link, nette naam, lazy foto over grijs silhouet, 4:3', () => {
  const html = render({ teamcode: 275713, teamnaam: "VVZ '49 O13-1", geslacht: 'Man' })
  assert.match(html, /href="\/teams\/275713"/)
  assert.match(html, />JO13-1</)
  assert.match(html, /<svg/)
  assert.match(html, /aspect-\[4\/3\]/)
  assert.match(html, /<img[^>]*alt=""[^>]*loading="lazy"/)
  assert.match(html, /object-cover/)
  assert.match(html, /team-foto\?teamcode=275713/)
})

test('kaart: zaalteam krijgt nette naam VVZ 1', () => {
  const html = render({ teamcode: 107265, teamnaam: "VVZ '49 1" })
  assert.match(html, />VVZ 1</)
})

test('kaart: onbekende naam valt terug op ruwe naam, nooit leeg', () => {
  const html = render({ teamcode: 1, teamnaam: 'Raar team' })
  assert.match(html, />Raar team</)
})
