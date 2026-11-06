import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Laadt bronbestanden (jsx) via Vite zonder browser of extra dependencies.
async function laad(pad) {
  const server = await createServer({
    configFile: false,
    logLevel: 'silent',
    appType: 'custom',
    server: { middlewareMode: true },
    esbuild: { jsx: 'automatic' },
  })
  try {
    return await server.ssrLoadModule(pad)
  } finally {
    await server.close()
  }
}

test('supabaseClient: ontbrekende configuratie gooit niet bij import, geeft melding en console.error', async () => {
  const fouten = []
  const orig = console.error
  console.error = (...a) => fouten.push(a.join(' '))
  let mod
  try {
    mod = await laad('/src/lib/supabaseClient.js')
  } finally {
    console.error = orig
  }
  assert.match(mod.supabaseConfigError, /VITE_SUPABASE_URL/)
  assert.ok(mod.supabase)
  assert.ok(fouten.some((f) => f.includes('VITE_SUPABASE_URL')))
})

test('ErrorBoundary: bij een fout een foutscherm met herlaadknop, anders de kinderen', async () => {
  const { default: ErrorBoundary } = await laad('/src/components/ErrorBoundary.jsx')

  const ok = new ErrorBoundary({ children: createElement('p', null, 'inhoud') })
  assert.equal(renderToStaticMarkup(ok.render()), '<p>inhoud</p>')

  const kapot = new ErrorBoundary({ children: null })
  kapot.state = ErrorBoundary.getDerivedStateFromError(new Error('boem'))
  const html = renderToStaticMarkup(kapot.render())
  assert.match(html, /Er ging iets mis/)
  assert.match(html, /Pagina herladen/)

  const cfg = new ErrorBoundary({ children: null })
  const e = new Error('Configuratie ontbreekt (test)')
  e.isConfigError = true
  cfg.state = ErrorBoundary.getDerivedStateFromError(e)
  assert.match(renderToStaticMarkup(cfg.render()), /Configuratie ontbreekt \(test\)/)
})
