import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchPageById, createPage, updatePage, deletePageImage } from '../services/pages'
import TipTapEditor from '../components/TipTapEditor'

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function ContentEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'nieuw'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [slugManual, setSlugManual] = useState(false)
  const [ogOpen, setOgOpen] = useState(false)
  const uploadedPathsRef = useRef([])
  const savedRef = useRef(false)

  const [form, setForm] = useState({
    title: '',
    slug: '',
    content: '',
    published_at: new Date().toISOString().slice(0, 10),
    expires_at: '',
    og_title: '',
    og_description: '',
    og_image_url: '',
  })

  useEffect(() => {
    if (!isNew) {
      loadPage()
    }
    return () => {
      if (!savedRef.current && uploadedPathsRef.current.length > 0) {
        uploadedPathsRef.current.forEach(path => deletePageImage(path))
      }
    }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPage() {
    setLoading(true)
    const { data, error } = await fetchPageById(id)
    if (error) {
      setError(error.message)
    } else if (data) {
      setForm({
        title: data.title || '',
        slug: data.slug || '',
        content: data.content || '',
        published_at: data.published_at ? data.published_at.slice(0, 10) : '',
        expires_at: data.expires_at ? data.expires_at.slice(0, 10) : '',
        og_title: data.og_title || '',
        og_description: data.og_description || '',
        og_image_url: data.og_image_url || '',
      })
      setSlugManual(true)
    }
    setLoading(false)
  }

  function handleTitleChange(title) {
    setForm(f => ({
      ...f,
      title,
      slug: slugManual ? f.slug : slugify(title),
    }))
  }

  function handleSlugChange(slug) {
    setSlugManual(true)
    setForm(f => ({ ...f, slug: slugify(slug) }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    const payload = {
      title: form.title,
      slug: form.slug,
      content: form.content,
      published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      og_title: form.og_title || null,
      og_description: form.og_description || null,
      og_image_url: form.og_image_url || null,
    }

    let result
    if (isNew) {
      result = await createPage(payload)
    } else {
      result = await updatePage(id, payload)
    }

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    savedRef.current = true
    navigate('/beheer/content', { state: { success: 'Pagina opgeslagen' } })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
      <div className="mb-4">
        <Link to="/beheer/content" className="text-sm text-vvz-green hover:underline">&larr; Terug naar Pagina&apos;s</Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {isNew ? 'Nieuwe pagina' : 'Pagina bewerken'}
      </h1>

      {/* Informatie over bereikbaarheid */}
      {!isNew && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm p-4 rounded-lg mb-6 flex items-start gap-2">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <span>Deze pagina is bereikbaar via de directe URL: <code className="bg-blue-100 px-1 rounded text-xs">/pagina/{form.slug || '...'}</code></span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg mb-4">{error}</div>
      )}

      <div className="space-y-5">
        {/* Titel */}
        <div>
          <label htmlFor="page-title" className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
          <input
            id="page-title"
            type="text"
            value={form.title}
            onChange={e => handleTitleChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
            placeholder="Paginatitel"
          />
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="page-slug" className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">/pagina/</span>
            <input
              id="page-slug"
              type="text"
              value={form.slug}
              onChange={e => handleSlugChange(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
              placeholder="pagina-slug"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Wordt automatisch gegenereerd op basis van de titel. Pas het veld hierboven aan om de slug handmatig te wijzigen.</p>
        </div>

        {/* Datums */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="page-published" className="block text-sm font-medium text-gray-700 mb-1">Publicatiedatum</label>
            <input
              id="page-published"
              type="date"
              value={form.published_at}
              onChange={e => setForm(f => ({ ...f, published_at: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
            />
          </div>
          <div>
            <label htmlFor="page-expires" className="block text-sm font-medium text-gray-700 mb-1">Vervaldatum (optioneel)</label>
            <input
              id="page-expires"
              type="date"
              value={form.expires_at}
              onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
            />
          </div>
        </div>

        {/* Content editor */}
        <div>
          <label id="page-content-label" className="block text-sm font-medium text-gray-700 mb-1">Inhoud</label>
          <TipTapEditor
            content={form.content}
            onChange={content => setForm(f => ({ ...f, content }))}
            onImageUpload={path => { uploadedPathsRef.current = [...uploadedPathsRef.current, path] }}
          />
        </div>

        {/* OG velden (inklapbaar) */}
        <div className="border border-gray-200 rounded-lg">
          <button
            type="button"
            onClick={() => setOgOpen(!ogOpen)}
            aria-expanded={ogOpen}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span>Open Graph / SEO instellingen</span>
            <svg
              className={`w-4 h-4 transition-transform ${ogOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {ogOpen && (
            <div className="px-4 pb-4 space-y-4 border-t border-gray-200 pt-4">
              <div>
                <label htmlFor="page-og-title" className="block text-sm font-medium text-gray-700 mb-1">OG Titel</label>
                <input
                  id="page-og-title"
                  type="text"
                  value={form.og_title}
                  onChange={e => setForm(f => ({ ...f, og_title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
                  placeholder="Titel voor social media"
                />
              </div>
              <div>
                <label htmlFor="page-og-desc" className="block text-sm font-medium text-gray-700 mb-1">OG Beschrijving</label>
                <textarea
                  id="page-og-desc"
                  value={form.og_description}
                  onChange={e => setForm(f => ({ ...f, og_description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
                  rows={3}
                  placeholder="Beschrijving voor social media"
                />
              </div>
              <div>
                <label htmlFor="page-og-image" className="block text-sm font-medium text-gray-700 mb-1">OG Afbeelding URL</label>
                <input
                  id="page-og-image"
                  type="url"
                  value={form.og_image_url}
                  onChange={e => setForm(f => ({ ...f, og_image_url: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
                  placeholder="https://..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Acties */}
        <div className="flex gap-3 pt-2">
          <Link
            to="/beheer/content"
            className="flex-1 text-center border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annuleren
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim() || !form.slug.trim()}
            className="flex-1 bg-vvz-green text-white text-sm font-medium py-2 rounded-lg hover:bg-vvz-green/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  )
}
