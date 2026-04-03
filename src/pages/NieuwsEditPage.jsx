import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchNewsItemById, createNewsItem, updateNewsItem } from '../services/news'
import { uploadPageImage, deletePageImage } from '../services/pages'
import TipTapEditor from '../components/TipTapEditor'

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function NieuwsEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'nieuw'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [slugManual, setSlugManual] = useState(false)
  const uploadedPathsRef = useRef([])
  const savedRef = useRef(false)

  const [form, setForm] = useState({
    title: '',
    slug: '',
    intro: '',
    content: '',
    published_at: new Date().toISOString().slice(0, 10),
    expires_at: '',
    image_url: '',
    image_path: '',
  })

  useEffect(() => {
    if (!isNew) {
      loadItem()
    }
    return () => {
      if (!savedRef.current && uploadedPathsRef.current.length > 0) {
        uploadedPathsRef.current.forEach(path => deletePageImage(path))
      }
    }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadItem() {
    setLoading(true)
    const { data, error } = await fetchNewsItemById(id)
    if (error) {
      setError(error.message)
    } else if (data) {
      setForm({
        title: data.title || '',
        slug: data.slug || '',
        intro: data.intro || '',
        content: data.content || '',
        published_at: data.published_at ? data.published_at.slice(0, 10) : '',
        expires_at: data.expires_at ? data.expires_at.slice(0, 10) : '',
        image_url: data.image_url || '',
        image_path: data.image_path || '',
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

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const { data, error: uploadError } = await uploadPageImage(file)
    if (uploadError) {
      setError('Afbeelding uploaden mislukt: ' + uploadError.message)
      return
    }

    uploadedPathsRef.current = [...uploadedPathsRef.current, data.path]
    setForm(f => ({ ...f, image_url: data.url, image_path: data.path }))
    e.target.value = ''
  }

  async function handleRemoveImage() {
    if (form.image_path && !isNew) {
      await deletePageImage(form.image_path)
    }
    setForm(f => ({ ...f, image_url: '', image_path: '' }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    const payload = {
      title: form.title,
      slug: form.slug,
      intro: form.intro || null,
      content: form.content,
      published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      image_url: form.image_url || null,
      image_path: form.image_path || null,
    }

    let result
    if (isNew) {
      result = await createNewsItem(payload)
    } else {
      result = await updateNewsItem(id, payload)
    }

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    savedRef.current = true
    navigate('/beheer/nieuws', { state: { success: 'Nieuwsbericht opgeslagen' } })
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
        <Link to="/beheer/nieuws" className="text-sm text-vvz-green hover:underline">&larr; Terug naar Nieuws</Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {isNew ? 'Nieuw nieuwsbericht' : 'Nieuwsbericht bewerken'}
      </h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg mb-4">{error}</div>
      )}

      <div className="space-y-5">
        {/* Titel */}
        <div>
          <label htmlFor="news-title" className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
          <input
            id="news-title"
            type="text"
            value={form.title}
            onChange={e => handleTitleChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
            placeholder="Titel van het nieuwsbericht"
          />
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="news-slug" className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">/nieuws/</span>
            <input
              id="news-slug"
              type="text"
              value={form.slug}
              onChange={e => handleSlugChange(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
              placeholder="nieuwsbericht-slug"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Wordt automatisch gegenereerd op basis van de titel. Pas het veld hierboven aan om de slug handmatig te wijzigen.</p>
        </div>

        {/* Datums */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="news-published" className="block text-sm font-medium text-gray-700 mb-1">Publicatiedatum</label>
            <input
              id="news-published"
              type="date"
              value={form.published_at}
              onChange={e => setForm(f => ({ ...f, published_at: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
            />
          </div>
          <div>
            <label htmlFor="news-expires" className="block text-sm font-medium text-gray-700 mb-1">Vervaldatum (optioneel)</label>
            <input
              id="news-expires"
              type="date"
              value={form.expires_at}
              onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
            />
          </div>
        </div>

        {/* Introductietekst */}
        <div>
          <label htmlFor="news-intro" className="block text-sm font-medium text-gray-700 mb-1">Introductietekst</label>
          <textarea
            id="news-intro"
            value={form.intro}
            onChange={e => setForm(f => ({ ...f, intro: e.target.value.slice(0, 300) }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
            rows={3}
            placeholder="Korte introductie (max 300 tekens)"
          />
          <p className="text-xs text-gray-400 mt-1">{form.intro.length} / 300 tekens</p>
        </div>

        {/* Nieuwsafbeelding */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nieuwsafbeelding</label>
          {form.image_url ? (
            <div className="relative inline-block">
              <img src={form.image_url} alt="Nieuwsafbeelding" className="max-w-xs max-h-48 rounded-lg border border-gray-200" />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                title="Afbeelding verwijderen"
              >
                &times;
              </button>
            </div>
          ) : (
            <label className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Afbeelding uploaden
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </label>
          )}
        </div>

        {/* Content editor */}
        <div>
          <label id="news-content-label" className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
          <TipTapEditor
            content={form.content}
            onChange={content => setForm(f => ({ ...f, content }))}
            onImageUpload={path => { uploadedPathsRef.current = [...uploadedPathsRef.current, path] }}
          />
        </div>

        {/* Acties */}
        <div className="flex gap-3 pt-2">
          <Link
            to="/beheer/nieuws"
            className="flex-1 text-center border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annuleren
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim() || !form.slug.trim() || !form.intro.trim()}
            className="flex-1 bg-vvz-green text-white text-sm font-medium py-2 rounded-lg hover:bg-vvz-green/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  )
}
