// Tester kaart thewally/ontwikkelstraat#73: eerste render van de overzichten toont koptekst + skeleton, geen spinner.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

let server
let render
let CatPage
let ZaalPage

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
  const h = (React.default || React).createElement
  CatPage = (await server.ssrLoadModule('/src/pages/WedstrijdenTeamsCatPage.jsx')).default
  ZaalPage = (await server.ssrLoadModule('/src/pages/WedstrijdenTeamsZaalPage.jsx')).default
  render = (comp, pad) => renderToStaticMarkup(h(MemoryRouter, { initialEntries: [pad] }, h(comp)))
})
after(async () => { await server.close() })

test('categoriepagina zonder cache: koptekst en skeleton-raster, geen spinner', () => {
  const html = render(CatPage, '/teams/veteranen')
  assert.match(html, />Veteranen</)
  assert.equal((html.match(/aspect-\[4\/3\]/g) || []).length, 6)
  assert.doesNotMatch(html, /animate-spin/)
})

test('zaalpagina zonder cache: koptekst en skeleton-raster, geen spinner', () => {
  const html = render(ZaalPage, '/teams/zaalvoetbal')
  assert.match(html, />Zaalvoetbal</)
  assert.equal((html.match(/aspect-\[4\/3\]/g) || []).length, 6)
  assert.doesNotMatch(html, /animate-spin/)
})
