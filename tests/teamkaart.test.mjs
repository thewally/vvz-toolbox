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
  render = (team, prioriteit) => renderToStaticMarkup(h(MemoryRouter, null, h(kaart.default, { team, prioriteit })))
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

test('kaart: prioriteit hoog = eager + fetchpriority high, normaal = eager, laag = lazy; foto begint onzichtbaar (fade-in)', () => {
  const team = { teamcode: 275713, teamnaam: "VVZ '49 O13-1" }
  const hoog = render(team, 'hoog')
  assert.match(hoog, /loading="eager"/)
  assert.match(hoog, /fetchpriority="high"/)
  const normaal = render(team, 'normaal')
  assert.match(normaal, /loading="eager"/)
  assert.doesNotMatch(normaal, /fetchpriority/)
  const laag = render(team, 'laag')
  assert.match(laag, /loading="lazy"/)
  assert.match(laag, /opacity-0/)
  assert.match(laag, /aspect-\[4\/3\]/)
})

test('raster: eerste 3 hoog, tot 6 eager, rest lazy', async () => {
  const React = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { MemoryRouter } = await import('react-router-dom')
  const grid = await server.ssrLoadModule('/src/components/TeamGrid.jsx')
  const h = (React.default || React).createElement
  const teams = Array.from({ length: 8 }, (_, i) => ({ teamcode: 100 + i, teamnaam: `Team ${i}` }))
  const html = renderToStaticMarkup(h(MemoryRouter, null, h(grid.default, { teams })))
  const imgs = html.match(/<img[^>]*>/g)
  assert.equal(imgs.length, 8)
  assert.equal(imgs.filter((i) => /fetchpriority="high"/.test(i)).length, 3)
  assert.equal(imgs.filter((i) => /loading="eager"/.test(i)).length, 6)
  assert.equal(imgs.filter((i) => /loading="lazy"/.test(i)).length, 2)
})

test('skeleton: 4:3-vlak en naamregel', async () => {
  const React = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const sk = await server.ssrLoadModule('/src/components/TeamKaartSkeleton.jsx')
  const h = (React.default || React).createElement
  const html = renderToStaticMarkup(h(sk.TeamsSkeleton, { titel: 'Senioren' }))
  assert.match(html, />Senioren</)
  assert.equal((html.match(/aspect-\[4\/3\]/g) || []).length, 6)
})
