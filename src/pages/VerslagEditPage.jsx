import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchMatchReportById, createMatchReport, updateMatchReport } from '../services/matchReports'
import { deletePageImage } from '../services/pages'
import { getTeams } from '../services/wedstrijden'
import { useAuth } from '../context/AuthContext'
import TipTapEditor from '../components/TipTapEditor'

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/['`]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Dedupliceer teams op teamcode (Sportlink teruggeeft regels per poule).
 */
const SPEELDAG_VELD = ['Zaterdag', 'Zondag']

function uniqueTeams(teams) {
  const map = new Map()
  for (const t of teams) {
    const code = String(t.teamcode || '')
    if (!code || map.has(code)) continue
    const naam = t.teamnaam || ''
    const isZaal = !naam.toLowerCase().includes('o23') && !SPEELDAG_VELD.includes(t.speeldag || '')
    map.set(code, { teamcode: code, teamnaam: naam, isZaal })
  }
  return [...map.values()].sort((a, b) =>
    (a.teamnaam || '').localeCompare(b.teamnaam || '', 'nl')
  )
}

export default function VerslagEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isNew = !id || id === 'nieuw'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [slugManual, setSlugManual] = useState(false)
  const [teams, setTeams] = useState([])
  const [teamsLoading, setTeamsLoading] = useState(true)
  const uploadedPathsRef = useRef([])
  const savedRef = useRef(false)

  const [form, setForm] = useState({
    team_id: '',
    team_name: '',
    title: '',
    slug: '',
    content: '',
    published_at: new Date().toISOString().slice(0, 10),
  })

  useEffect(() => {
    loadTeams()
    if (!isNew) {
      loadItem()
    }
    return () => {
      // Opruimen van geüploade afbeeldingen als de gebruiker niet opslaat
      if (!savedRef.current && uploadedPathsRef.current.length > 0) {
        uploadedPathsRef.current.forEach(path => deletePageImage(path))
      }
    }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadTeams() {
    setTeamsLoading(true)
    const { data, error } = await getTeams()
    if (!error && data) {
      setTeams(uniqueTeams(data))
    }
    setTeamsLoading(false)
  }

  async function loadItem() {
    setLoading(true)
    const { data, error } = await fetchMatchReportById(id)
    if (error) {
      setError(error.message)
    } else if (data) {
      setForm({
        team_id: data.team_id || '',
        team_name: data.team_name || '',
        title: data.title || '',
        slug: data.slug || '',
        content: data.content || '',
        published_at: data.published_at ? data.published_at.slice(0, 10) : '',
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

  function handleTeamChange(teamcode) {
    const team = teams.find(t => String(t.teamcode) === String(teamcode))
    setForm(f => ({
      ...f,
      team_id: teamcode,
      team_name: team?.teamnaam || f.team_name,
    }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    if (!form.team_id) {
      setError('Kies een team voor dit verslag.')
      setSaving(false)
      return
    }

    const payload = {
      team_id: form.team_id,
      team_name: form.team_name,
      title: form.title,
      slug: form.slug,
      content: form.content,
      published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
    }

    // author_id wordt alleen meegestuurd bij aanmaken (niet overschrijven bij edit)
    let result
    if (isNew) {
      result = await createMatchReport({ ...payload, author_id: user?.id ?? null })
    } else {
      result = await updateMatchReport(id, payload)
    }

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    savedRef.current = true
    navigate('/beheer/verslagen', { state: { success: 'Wedstrijdverslag opgeslagen' } })
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
        <Link to="/beheer/verslagen" className="text-sm text-vvz-green hover:underline">
          &larr; Terug naar Wedstrijdverslagen
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {isNew ? 'Nieuw wedstrijdverslag' : 'Wedstrijdverslag bewerken'}
      </h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg mb-4">{error}</div>
      )}

      <div className="space-y-5">
        {/* Team */}
        <div>
          <label htmlFor="mr-team" className="block text-sm font-medium text-gray-700 mb-1">Team</label>
          <select
            id="mr-team"
            value={form.team_id}
            onChange={e => handleTeamChange(e.target.value)}
            disabled={teamsLoading}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-vvz-green disabled:opacity-50"
          >
            <option value="">{teamsLoading ? 'Teams laden…' : 'Kies een team'}</option>
            {teams.map(t => (
              <option key={t.teamcode} value={t.teamcode}>
                {t.teamnaam} ({t.isZaal ? 'Zaal' : 'Veld'})
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">De teamnaam wordt opgeslagen bij het verslag en blijft leesbaar ook als de Sportlink-indeling later wijzigt.</p>
        </div>

        {/* Titel */}
        <div>
          <label htmlFor="mr-title" className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
          <input
            id="mr-title"
            type="text"
            value={form.title}
            onChange={e => handleTitleChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
            placeholder="Bijv. VVZ'49 1 - Spakenburg 2: monsterzege in de laatste minuut"
          />
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="mr-slug" className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">/wedstrijden/verslagen/</span>
            <input
              id="mr-slug"
              type="text"
              value={form.slug}
              onChange={e => handleSlugChange(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
              placeholder="verslag-slug"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Wordt automatisch gegenereerd op basis van de titel. Pas het veld hierboven aan om de slug handmatig te wijzigen.</p>
        </div>

        {/* Publicatiedatum */}
        <div>
          <label htmlFor="mr-published" className="block text-sm font-medium text-gray-700 mb-1">Publicatiedatum</label>
          <input
            id="mr-published"
            type="date"
            value={form.published_at}
            onChange={e => setForm(f => ({ ...f, published_at: e.target.value }))}
            className="w-full sm:w-64 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
          />
          <p className="text-xs text-gray-400 mt-1">Laat leeg om het verslag als concept op te slaan.</p>
        </div>

        {/* Content editor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Verslag</label>
          <TipTapEditor
            content={form.content}
            onChange={content => setForm(f => ({ ...f, content }))}
            onImageUpload={path => { uploadedPathsRef.current = [...uploadedPathsRef.current, path] }}
          />
        </div>

        {/* Acties */}
        <div className="flex gap-3 pt-2">
          <Link
            to="/beheer/verslagen"
            className="flex-1 text-center border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annuleren
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim() || !form.slug.trim() || !form.team_id}
            className="flex-1 bg-vvz-green text-white text-sm font-medium py-2 rounded-lg hover:bg-vvz-green/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Opslaan…' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  )
}
