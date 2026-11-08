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

test('kaart: placeholder is een decoratieve groep van minimaal 6 poppetjes in 2 rijen, 4:3', () => {
  const html = render({ teamcode: 275713, teamnaam: "VVZ '49 O13-1" })
  const svg = html.match(/<svg[^>]*>[\s\S]*?<\/svg>/)[0]
  assert.match(svg, /viewBox="0 0 120 90"/)
  assert.match(svg, /aria-hidden="true"/)
  assert.ok((svg.match(/<circle/g) || []).length >= 6)
  // achterste rij hoger (kleinere bodem-y) dan de voorste: twee verschillende translate-y waarden
  const ys = new Set([...svg.matchAll(/translate\([\d.]+ (-?[\d.]+)\)/g)].map((m) => m[1]))
  assert.ok(ys.size >= 2)
  assert.match(html, /group-hover:text-vvz-green\/40/)
})

test('kaart: zaalteam krijgt nette naam VVZ 1', () => {
  const html = render({ teamcode: 107265, teamnaam: "VVZ '49 1" })
  assert.match(html, />VVZ 1</)
})

test('kaart: onbekende naam valt terug op ruwe naam, nooit leeg', () => {
  const html = render({ teamcode: 1, teamnaam: 'Raar team' })
  assert.match(html, />Raar team</)
})
