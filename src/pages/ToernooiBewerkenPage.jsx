import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  fetchTournamentById,
  createTournament,
  updateTournament,
  publishTournament,
  generateSlug,
} from '../services/tournaments'
import {
  fetchFields,
  createField,
  updateField,
  deleteField,
  reorderFields,
} from '../services/tournamentFields'
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/tournamentCategories'
import {
  fetchTeams,
  createTeam,
  updateTeam,
  deleteTeam,
} from '../services/tournamentTeams'
import {
  fetchPools,
  createPool,
  updatePool,
  deletePool,
  setPoolTeams,
} from '../services/tournamentPools'
import {
  fetchMatches,
  updateMatch,
  deleteAllMatches,
  bulkInsertMatches,
} from '../services/tournamentMatches'
import {
  calculateCapacity,
  totalMatchesNeeded,
  generateSchedule,
  calculateSlots,
} from '../services/tournamentSchedule'

const TABS = [
  { key: 'algemeen', label: 'Algemeen' },
  { key: 'velden', label: 'Velden' },
  { key: 'categorieen', label: 'Categorieën' },
  { key: 'teams', label: 'Teams' },
  { key: 'poules', label: 'Poules' },
  { key: 'simulatie', label: 'Simulatie' },
  { key: 'schema', label: 'Schema' },
]

const EMPTY_TOURNAMENT = {
  name: '',
  description: '',
  date: '',
  start_time: '09:00',
  end_time: '17:00',
  match_duration_minutes: 15,
  slot_gap_minutes: 0,
  rounds_per_pairing: 1,
  break_start_time: '',
  break_duration_minutes: 0,
  is_published: false,
}

export default function ToernooiBewerkenPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id

  const [activeTab, setActiveTab] = useState('algemeen')
  const [loading, setLoading] = useState(!isNew)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [tournament, setTournament] = useState(isNew ? EMPTY_TOURNAMENT : null)
  const [fields, setFields] = useState([])
  const [categories, setCategories] = useState([])
  const [teams, setTeams] = useState([])
  const [pools, setPools] = useState([])
  const [matches, setMatches] = useState([])

  useEffect(() => {
    if (isNew) return
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadAll() {
    setLoading(true)
    setError(null)
    const { data: t, error: tErr } = await fetchTournamentById(id)
    if (tErr) {
      setError(tErr.message)
      setLoading(false)
      return
    }
    if (!t) {
      setError('Toernooi niet gevonden.')
      setLoading(false)
      return
    }
    setTournament({
      ...t,
      break_start_time: t.break_start_time ?? '',
      start_time: (t.start_time || '09:00').slice(0, 5),
      end_time: (t.end_time || '17:00').slice(0, 5),
    })

    const [
      { data: fData },
      { data: cData },
      { data: teamData },
      { data: poolData },
      { data: matchData },
    ] = await Promise.all([
      fetchFields(id),
      fetchCategories(id),
      fetchTeams(id),
      fetchPools(id),
      fetchMatches(id),
    ])

    setFields(fData ?? [])
    setCategories(cData ?? [])
    setTeams(teamData ?? [])
    setPools(poolData ?? [])
    setMatches(matchData ?? [])
    setLoading(false)
  }

  function flashSuccess(msg) {
    setSuccess(msg)
    setError(null)
    setTimeout(() => setSuccess(null), 3000)
  }

  function flashError(msg) {
    setError(msg)
    setSuccess(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="max-w-3xl mx-auto p-4 pt-6">
        <Link to="/beheer/toernooien" className="text-sm text-vvz-green hover:underline">
          &#8249; Terug naar toernooien
        </Link>
        <p className="mt-4 text-red-700">{error || 'Toernooi niet gevonden.'}</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 pt-6">
      <Link to="/beheer/toernooien" className="text-sm text-vvz-green hover:underline">
        &#8249; Terug naar toernooien
      </Link>

      <div className="flex items-center justify-between mt-2 mb-6 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800">
          {isNew ? 'Nieuw toernooi' : tournament.name}
        </h1>
        {!isNew && (
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tournament.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {tournament.is_published ? 'Gepubliceerd' : 'Concept'}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-4 rounded-lg mb-4">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto border-b border-gray-200">
        {TABS.map(tab => {
          const disabled = isNew && tab.key !== 'algemeen'
          return (
            <button
              key={tab.key}
              onClick={() => !disabled && setActiveTab(tab.key)}
              disabled={disabled}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? 'border-vvz-green text-vvz-green'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'algemeen' && (
        <AlgemeenTab
          tournament={tournament}
          setTournament={setTournament}
          isNew={isNew}
          onSaved={(savedId) => {
            if (isNew) {
              navigate(`/beheer/toernooien/${savedId}`, { replace: true })
            } else {
              flashSuccess('Toernooi opgeslagen.')
            }
          }}
          onError={flashError}
        />
      )}

      {!isNew && activeTab === 'velden' && (
        <VeldenTab
          tournamentId={tournament.id}
          fields={fields}
          onChange={async () => {
            const { data } = await fetchFields(tournament.id)
            setFields(data ?? [])
          }}
          onError={flashError}
          onSuccess={flashSuccess}
        />
      )}

      {!isNew && activeTab === 'categorieen' && (
        <CategorieenTab
          tournamentId={tournament.id}
          categories={categories}
          teams={teams}
          pools={pools}
          fields={fields}
          onChange={async () => {
            const { data } = await fetchCategories(tournament.id)
            setCategories(data ?? [])
          }}
          onError={flashError}
          onSuccess={flashSuccess}
        />
      )}

      {!isNew && activeTab === 'teams' && (
        <TeamsTab
          tournamentId={tournament.id}
          teams={teams}
          categories={categories}
          onChange={async () => {
            const { data } = await fetchTeams(tournament.id)
            setTeams(data ?? [])
          }}
          onError={flashError}
          onSuccess={flashSuccess}
        />
      )}

      {!isNew && activeTab === 'poules' && (
        <PoulesTab
          tournamentId={tournament.id}
          categories={categories}
          teams={teams}
          pools={pools}
          onChange={async () => {
            const { data } = await fetchPools(tournament.id)
            setPools(data ?? [])
          }}
          onError={flashError}
          onSuccess={flashSuccess}
        />
      )}

      {!isNew && activeTab === 'simulatie' && (
        <SimulatieTab
          tournament={tournament}
          fields={fields}
          pools={pools}
          categories={categories}
          teams={teams}
          matches={matches}
          onGenerated={async () => {
            const { data: matchData } = await fetchMatches(tournament.id)
            setMatches(matchData ?? [])
            const { data: t } = await fetchTournamentById(tournament.id)
            if (t) {
              setTournament(prev => ({ ...prev, generated_at: t.generated_at }))
            }
            setActiveTab('schema')
          }}
          onError={flashError}
          onSuccess={flashSuccess}
        />
      )}

      {!isNew && activeTab === 'schema' && (
        <SchemaTab
          tournament={tournament}
          fields={fields}
          teams={teams}
          matches={matches}
          onChange={async () => {
            const { data: matchData } = await fetchMatches(tournament.id)
            setMatches(matchData ?? [])
          }}
          onPublishToggle={async () => {
            const { data, error: err } = await publishTournament(tournament.id, !tournament.is_published)
            if (err) {
              flashError(err.message)
              return
            }
            setTournament(prev => ({ ...prev, is_published: data.is_published }))
            flashSuccess(data.is_published ? 'Toernooi gepubliceerd.' : 'Publicatie ongedaan gemaakt.')
          }}
          onError={flashError}
          onSuccess={flashSuccess}
        />
      )}
    </div>
  )
}

// ============================================================================
// TAB: Algemeen
// ============================================================================

function AlgemeenTab({ tournament, setTournament, isNew, onSaved, onError }) {
  const [saving, setSaving] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)

  const slug = useMemo(() => {
    if (slugTouched && tournament.slug) return tournament.slug
    return generateSlug(tournament.name || '', tournament.date || '')
  }, [tournament.name, tournament.date, tournament.slug, slugTouched])

  function update(field, value) {
    setTournament(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!tournament.name?.trim()) {
      onError('Naam is verplicht.')
      return
    }
    if (!tournament.date) {
      onError('Datum is verplicht.')
      return
    }
    if (Number(tournament.match_duration_minutes) % 5 !== 0 || Number(tournament.match_duration_minutes) < 5) {
      onError('Wedstrijdduur moet minimaal 5 minuten zijn en deelbaar door 5.')
      return
    }

    setSaving(true)

    const payload = {
      slug,
      name: tournament.name.trim(),
      description: tournament.description?.trim() || null,
      date: tournament.date,
      start_time: tournament.start_time,
      end_time: tournament.end_time,
      match_duration_minutes: Number(tournament.match_duration_minutes),
      slot_gap_minutes: Number(tournament.slot_gap_minutes) || 0,
      rest_slots: 0,
      rounds_per_pairing: Number(tournament.rounds_per_pairing) || 1,
      break_start_time: tournament.break_start_time || null,
      break_duration_minutes: Number(tournament.break_duration_minutes) || 0,
    }

    try {
      if (isNew) {
        const { data, error: err } = await createTournament(payload)
        if (err) throw err
        onSaved(data.id)
      } else {
        const { data, error: err } = await updateTournament(tournament.id, payload)
        if (err) throw err
        setTournament(prev => ({ ...prev, ...data, start_time: (data.start_time || '09:00').slice(0, 5), end_time: (data.end_time || '17:00').slice(0, 5), break_start_time: data.break_start_time ?? '' }))
        onSaved(data.id)
      }
    } catch (err) {
      onError(`Opslaan mislukt: ${err.message || err}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
          <input
            type="text"
            value={tournament.name || ''}
            onChange={e => update('name', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
            placeholder="Jeugdtoernooi 2026"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
            <input
              type="date"
              value={tournament.date || ''}
              onChange={e => update('date', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={e => {
                setSlugTouched(true)
                update('slug', e.target.value)
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
              placeholder="auto-gegenereerd"
            />
            <p className="text-xs text-gray-500 mt-1">Wordt gebruikt in de publieke URL.</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
          <textarea
            value={tournament.description || ''}
            onChange={e => update('description', e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
            placeholder="Korte beschrijving van het toernooi"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Tijdsplanning</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Starttijd</label>
            <input
              type="time"
              value={tournament.start_time || ''}
              onChange={e => update('start_time', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Eindtijd</label>
            <input
              type="time"
              value={tournament.end_time || ''}
              onChange={e => update('end_time', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wedstrijdduur (minuten)</label>
            <input
              type="number"
              min={5}
              step={5}
              value={tournament.match_duration_minutes ?? 15}
              onChange={e => update('match_duration_minutes', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
            />
            <p className="text-xs text-gray-500 mt-1">Minimaal 5, deelbaar door 5.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wisseltijd tussen ronden (minuten)</label>
            <input
              type="number"
              min={0}
              step={1}
              value={tournament.slot_gap_minutes ?? 0}
              onChange={e => update('slot_gap_minutes', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
            />
            <p className="text-xs text-gray-500 mt-1">
              {(() => {
                const duration = Number(tournament.match_duration_minutes) || 15
                const gap = Number(tournament.slot_gap_minutes) || 0
                return gap === 0
                  ? 'Rondes volgen direct op elkaar.'
                  : `Rondes starten elke ${duration + gap} minuten (${duration} min wedstrijd + ${gap} min wisseltijd).`
              })()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keer per tegenstander</label>
            <select
              value={tournament.rounds_per_pairing ?? 1}
              onChange={e => update('rounds_per_pairing', Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
            >
              <option value={1}>1× (enkelvoudig)</option>
              <option value={2}>2× (heen &amp; terug)</option>
              <option value={3}>3×</option>
              <option value={4}>4×</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Hoe vaak elk team-duo tegen elkaar speelt.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lunchpauze (start)</label>
            <input
              type="time"
              value={tournament.break_start_time || ''}
              onChange={e => update('break_start_time', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
            />
            <p className="text-xs text-gray-500 mt-1">Optioneel.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pauzeduur (minuten)</label>
            <input
              type="number"
              min={0}
              value={tournament.break_duration_minutes ?? 0}
              onChange={e => update('break_duration_minutes', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="bg-vvz-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-vvz-green/90 disabled:opacity-50"
        >
          {saving ? 'Opslaan...' : isNew ? 'Toernooi aanmaken' : 'Opslaan'}
        </button>
      </div>
    </form>
  )
}

// ============================================================================
// TAB: Velden
// ============================================================================

function VeldenTab({ tournamentId, fields, onChange, onError, onSuccess }) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [working, setWorking] = useState(false)

  async function handleAdd(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setWorking(true)
    const { error: err } = await createField(tournamentId, newName.trim())
    setWorking(false)
    if (err) {
      onError(err.message)
      return
    }
    setNewName('')
    await onChange()
    onSuccess('Veld toegevoegd.')
  }

  async function handleSaveEdit(id) {
    if (!editingName.trim()) return
    setWorking(true)
    const { error: err } = await updateField(id, { name: editingName.trim() })
    setWorking(false)
    if (err) {
      onError(err.message)
      return
    }
    setEditingId(null)
    setEditingName('')
    await onChange()
  }

  async function handleDelete(id) {
    if (!confirm('Veld verwijderen? Eventuele wedstrijden op dit veld worden geblokkeerd door de database.')) return
    setWorking(true)
    const { error: err } = await deleteField(id)
    setWorking(false)
    if (err) {
      onError(err.message)
      return
    }
    await onChange()
    onSuccess('Veld verwijderd.')
  }

  async function move(index, delta) {
    const newOrder = [...fields]
    const target = index + delta
    if (target < 0 || target >= newOrder.length) return
    ;[newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]]
    setWorking(true)
    const { error: err } = await reorderFields(tournamentId, newOrder.map(f => f.id))
    setWorking(false)
    if (err) {
      onError(err.message)
      return
    }
    await onChange()
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Veldnaam (bv. Hoofdveld)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
          />
          <button
            type="submit"
            disabled={working || !newName.trim()}
            className="bg-vvz-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-vvz-green/90 disabled:opacity-50"
          >
            Toevoegen
          </button>
        </form>
      </div>

      {fields.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500 text-sm">
          Nog geen velden. Voeg minimaal één veld toe voor je het schema kunt genereren.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {fields.map((f, idx) => (
            <div key={f.id} className="flex items-center p-3 gap-2">
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0 || working}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  aria-label="Omhoog"
                >
                  &#9650;
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === fields.length - 1 || working}
                  className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  aria-label="Omlaag"
                >
                  &#9660;
                </button>
              </div>
              {editingId === f.id ? (
                <input
                  type="text"
                  autoFocus
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveEdit(f.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
                />
              ) : (
                <span className="flex-1 text-sm text-gray-800">{f.name}</span>
              )}
              <div className="flex gap-1">
                {editingId === f.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(f.id)}
                      className="text-xs bg-vvz-green text-white font-medium px-3 py-1.5 rounded-lg hover:bg-vvz-green/90"
                    >
                      Opslaan
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-xs border border-gray-300 text-gray-700 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50"
                    >
                      Annuleer
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(f.id)
                        setEditingName(f.name)
                      }}
                      className="text-xs border border-gray-300 text-gray-700 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50"
                    >
                      Bewerken
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(f.id)}
                      className="text-xs border border-red-300 text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50"
                    >
                      Verwijderen
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// TAB: Categorieën
// ============================================================================

function CategorieenTab({ tournamentId, categories, teams, pools, fields, onChange, onError, onSuccess }) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [working, setWorking] = useState(false)
  const [expandedFields, setExpandedFields] = useState({})

  const teamCountByCategory = useMemo(() => {
    const map = {}
    for (const t of teams) {
      map[t.category_id] = (map[t.category_id] ?? 0) + 1
    }
    return map
  }, [teams])

  const poolCountByCategory = useMemo(() => {
    const map = {}
    for (const p of pools) {
      map[p.category_id] = (map[p.category_id] ?? 0) + 1
    }
    return map
  }, [pools])

  async function handleAdd(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setWorking(true)
    const { error: err } = await createCategory(tournamentId, newName.trim())
    setWorking(false)
    if (err) {
      onError(err.message)
      return
    }
    setNewName('')
    await onChange()
    onSuccess('Categorie toegevoegd.')
  }

  async function handleSaveEdit(id) {
    if (!editingName.trim()) return
    setWorking(true)
    const { error: err } = await updateCategory(id, { name: editingName.trim() })
    setWorking(false)
    if (err) {
      onError(err.message)
      return
    }
    setEditingId(null)
    setEditingName('')
    await onChange()
  }

  async function handleDelete(c) {
    const teamCount = teamCountByCategory[c.id] ?? 0
    if (teamCount > 0) {
      onError(`Categorie "${c.name}" heeft nog ${teamCount} team${teamCount !== 1 ? 's' : ''}. Verwijder die eerst.`)
      return
    }
    if (!confirm(`Categorie "${c.name}" verwijderen?`)) return
    setWorking(true)
    const { error: err } = await deleteCategory(c.id)
    setWorking(false)
    if (err) {
      onError(err.message)
      return
    }
    await onChange()
    onSuccess('Categorie verwijderd.')
  }

  async function handleTogglePreferredField(category, fieldId, checked) {
    const current = category.preferred_field_ids ?? []
    const next = checked ? [...current, fieldId] : current.filter(id => id !== fieldId)
    setWorking(true)
    const { error: err } = await updateCategory(category.id, { preferred_field_ids: next })
    setWorking(false)
    if (err) { onError(err.message); return }
    await onChange()
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Categorienaam (bv. Jeugd, Senioren)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
          />
          <button
            type="submit"
            disabled={working || !newName.trim()}
            className="bg-vvz-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-vvz-green/90 disabled:opacity-50"
          >
            Toevoegen
          </button>
        </form>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500 text-sm">
          Nog geen categorieën. Maak minimaal één categorie aan om teams en poules te kunnen indelen.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
          {categories.map(c => {
            const preferredIds = new Set(c.preferred_field_ids ?? [])
            const isExpanded = expandedFields[c.id] ?? false
            return (
              <div key={c.id}>
                <div className="flex items-center p-3 gap-2">
                  {editingId === c.id ? (
                    <input
                      type="text"
                      autoFocus
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveEdit(c.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
                    />
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-gray-800">{c.name}</span>
                      <span className="text-xs text-gray-500">
                        {teamCountByCategory[c.id] ?? 0} team{(teamCountByCategory[c.id] ?? 0) !== 1 ? 's' : ''} · {poolCountByCategory[c.id] ?? 0} poule{(poolCountByCategory[c.id] ?? 0) !== 1 ? 's' : ''}
                        {(c.start_time || c.end_time) && (
                          <> · <span className="text-vvz-green">{(c.start_time || '').slice(0, 5) || '?'}–{(c.end_time || '').slice(0, 5) || '?'}</span></>
                        )}
                        {preferredIds.size > 0 && (
                          <> · <span className="text-vvz-green">{preferredIds.size} veld{preferredIds.size !== 1 ? 'en' : ''}</span></>
                        )}
                      </span>
                    </>
                  )}
                  <div className="flex gap-1">
                    {editingId === c.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(c.id)}
                          className="text-xs bg-vvz-green text-white font-medium px-3 py-1.5 rounded-lg hover:bg-vvz-green/90"
                        >
                          Opslaan
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="text-xs border border-gray-300 text-gray-700 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50"
                        >
                          Annuleer
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setExpandedFields(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${isExpanded ? 'bg-vvz-green text-white border-vvz-green' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                        >
                          Instellingen
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(c.id)
                            setEditingName(c.name)
                          }}
                          className="text-xs border border-gray-300 text-gray-700 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50"
                        >
                          Bewerken
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="text-xs border border-red-300 text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50"
                        >
                          Verwijderen
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100 space-y-4 pt-3">

                    {/* Tijdvenster */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Tijdvenster</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="time"
                          defaultValue={(c.start_time || '').slice(0, 5)}
                          onBlur={e => updateCategory(c.id, { start_time: e.target.value || null }).then(onChange)}
                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green bg-white"
                        />
                        <span className="text-sm text-gray-400">tot</span>
                        <input
                          type="time"
                          defaultValue={(c.end_time || '').slice(0, 5)}
                          onBlur={e => updateCategory(c.id, { end_time: e.target.value || null }).then(onChange)}
                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green bg-white"
                        />
                        <span className="text-xs text-gray-400">Leeg = tijdvenster van het toernooi</span>
                      </div>
                    </div>

                    {/* Voorkeursvelden */}
                    {fields.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Voorkeursvelden</p>
                        <p className="text-xs text-gray-400 mb-2">
                          Selecteer de velden die bij voorkeur aan deze categorie worden toegewezen bij het genereren van het schema.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {fields.map(f => (
                            <label key={f.id} className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm cursor-pointer hover:border-vvz-green has-[:checked]:border-vvz-green has-[:checked]:bg-green-50">
                              <input
                                type="checkbox"
                                checked={preferredIds.has(f.id)}
                                disabled={working}
                                onChange={e => handleTogglePreferredField(c, f.id, e.target.checked)}
                                className="rounded text-vvz-green focus:ring-vvz-green"
                              />
                              <span className="text-gray-800">{f.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// TAB: Teams
// ============================================================================

function TeamsTab({ tournamentId, teams, categories, onChange, onError, onSuccess }) {
  const [filter, setFilter] = useState('all')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', category_id: '', contact_name: '', notes: '' })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', category_id: '', contact_name: '', notes: '' })
  const [working, setWorking] = useState(false)

  const filteredTeams = useMemo(() => {
    if (filter === 'all') return teams
    return teams.filter(t => t.category_id === filter)
  }, [teams, filter])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.category_id) {
      onError('Naam en categorie zijn verplicht.')
      return
    }
    setWorking(true)
    const { error: err } = await createTeam(tournamentId, {
      name: form.name.trim(),
      category_id: form.category_id,
      contact_name: form.contact_name.trim() || null,
      notes: form.notes.trim() || null,
    })
    setWorking(false)
    if (err) {
      onError(err.message)
      return
    }
    setForm({ name: '', category_id: '', contact_name: '', notes: '' })
    setAdding(false)
    await onChange()
    onSuccess('Team toegevoegd.')
  }

  async function handleSaveEdit(id) {
    if (!editForm.name.trim() || !editForm.category_id) {
      onError('Naam en categorie zijn verplicht.')
      return
    }
    setWorking(true)
    const { error: err } = await updateTeam(id, {
      name: editForm.name.trim(),
      category_id: editForm.category_id,
      contact_name: editForm.contact_name.trim() || null,
      notes: editForm.notes.trim() || null,
    })
    setWorking(false)
    if (err) {
      onError(err.message)
      return
    }
    setEditingId(null)
    await onChange()
  }

  async function handleDelete(t) {
    if (!confirm(`Team "${t.name}" verwijderen? Eventuele wedstrijden van dit team worden ook verwijderd.`)) return
    setWorking(true)
    const { error: err } = await deleteTeam(t.id)
    setWorking(false)
    if (err) {
      onError(err.message)
      return
    }
    await onChange()
    onSuccess('Team verwijderd.')
  }

  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-sm text-gray-600">
        Maak eerst een categorie aan voordat je teams kunt toevoegen.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-gray-700">Filter:</label>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
        >
          <option value="all">Alle categorieën</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="flex-1" />
        {!adding && (
          <button
            type="button"
            onClick={() => {
              setAdding(true)
              setForm({ name: '', category_id: filter !== 'all' ? filter : (categories[0]?.id ?? ''), contact_name: '', notes: '' })
            }}
            className="bg-vvz-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-vvz-green/90"
          >
            Team toevoegen
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm border-2 border-vvz-green p-6 space-y-3">
          <h3 className="font-semibold text-gray-800">Nieuw team</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categorie *</label>
              <select
                value={form.category_id}
                onChange={e => setForm({ ...form, category_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
              >
                <option value="">— selecteer —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contactpersoon</label>
              <input
                type="text"
                value={form.contact_name}
                onChange={e => setForm({ ...form, contact_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notitie</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={working}
              className="bg-vvz-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-vvz-green/90 disabled:opacity-50"
            >
              Opslaan
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              Annuleren
            </button>
          </div>
        </form>
      )}

      {filteredTeams.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-sm text-gray-500">
          Geen teams in deze selectie.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Naam</th>
                <th className="px-4 py-3">Categorie</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Notitie</th>
                <th className="px-4 py-3 text-right">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTeams.map(t => editingId === t.id ? (
                <tr key={t.id}>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={editForm.category_id}
                      onChange={e => setEditForm({ ...editForm, category_id: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={editForm.contact_name}
                      onChange={e => setEditForm({ ...editForm, contact_name: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={editForm.notes}
                      onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleSaveEdit(t.id)}
                        className="text-xs bg-vvz-green text-white font-medium px-3 py-1.5 rounded-lg hover:bg-vvz-green/90"
                      >
                        Opslaan
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs border border-gray-300 text-gray-700 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50"
                      >
                        Annuleer
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                  <td className="px-4 py-3 text-gray-600">{t.category?.name ?? ''}</td>
                  <td className="px-4 py-3 text-gray-600">{t.contact_name || ''}</td>
                  <td className="px-4 py-3 text-gray-600">{t.notes || ''}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => {
                          setEditingId(t.id)
                          setEditForm({
                            name: t.name,
                            category_id: t.category_id,
                            contact_name: t.contact_name || '',
                            notes: t.notes || '',
                          })
                        }}
                        className="text-xs border border-gray-300 text-gray-700 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50"
                      >
                        Bewerken
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="text-xs border border-red-300 text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50"
                      >
                        Verwijderen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// TAB: Poules
// ============================================================================

function PoulesTab({ tournamentId, categories, teams, pools, onChange, onError, onSuccess }) {
  const [newPoolByCat, setNewPoolByCat] = useState({})
  const [assignTarget, setAssignTarget] = useState({}) // teamId -> poolId (selected in dropdown)
  const [working, setWorking] = useState(false)

  const teamsByCategory = useMemo(() => {
    const map = {}
    for (const c of categories) map[c.id] = []
    for (const t of teams) {
      if (!map[t.category_id]) map[t.category_id] = []
      map[t.category_id].push(t)
    }
    return map
  }, [teams, categories])

  const poolsByCategory = useMemo(() => {
    const map = {}
    for (const c of categories) map[c.id] = []
    for (const p of pools) {
      if (!map[p.category_id]) map[p.category_id] = []
      map[p.category_id].push(p)
    }
    return map
  }, [pools, categories])

  // Map team -> pool id
  const poolByTeam = useMemo(() => {
    const map = {}
    for (const p of pools) {
      for (const pt of p.tournament_pool_teams ?? []) {
        map[pt.team_id] = p.id
      }
    }
    return map
  }, [pools])

  // Map pool id -> pool object for easy lookup
  const poolById = useMemo(() => {
    const map = {}
    for (const p of pools) map[p.id] = p
    return map
  }, [pools])

  async function handleAddPool(categoryId) {
    const name = (newPoolByCat[categoryId] || '').trim()
    if (!name) return
    setWorking(true)
    const { error: err } = await createPool(tournamentId, categoryId, name)
    setWorking(false)
    if (err) { onError(err.message); return }
    setNewPoolByCat({ ...newPoolByCat, [categoryId]: '' })
    await onChange()
    onSuccess('Poule toegevoegd.')
  }

  async function handleDeletePool(p) {
    if (!confirm(`Poule "${p.name}" verwijderen? Team-koppelingen vervallen.`)) return
    setWorking(true)
    const { error: err } = await deletePool(p.id)
    setWorking(false)
    if (err) { onError(err.message); return }
    await onChange()
    onSuccess('Poule verwijderd.')
  }

  async function handleRenamePool(p, newName) {
    if (!newName.trim() || newName === p.name) return
    setWorking(true)
    const { error: err } = await updatePool(p.id, { name: newName.trim() })
    setWorking(false)
    if (err) { onError(err.message); return }
    await onChange()
  }

  async function handleAssignTeam(teamId, poolId) {
    if (!poolId) return
    const pool = poolById[poolId]
    if (!pool) return
    const current = (pool.tournament_pool_teams ?? []).map(pt => pt.team_id)
    if (current.includes(teamId)) return
    setWorking(true)
    const { error: err } = await setPoolTeams(poolId, [...current, teamId])
    setWorking(false)
    if (err) { onError(err.message); return }
    setAssignTarget(prev => { const n = { ...prev }; delete n[teamId]; return n })
    await onChange()
  }

  async function handleRemoveTeamFromPool(pool, teamId) {
    const current = (pool.tournament_pool_teams ?? []).map(pt => pt.team_id)
    setWorking(true)
    const { error: err } = await setPoolTeams(pool.id, current.filter(id => id !== teamId))
    setWorking(false)
    if (err) { onError(err.message); return }
    await onChange()
  }

  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-sm text-gray-600">
        Maak eerst categorieën aan voordat je poules kunt inrichten.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {categories.map(category => {
        const catTeams = teamsByCategory[category.id] ?? []
        const catPools = poolsByCategory[category.id] ?? []
        const unassigned = catTeams.filter(t => !poolByTeam[t.id])

        return (
          <div key={category.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-semibold text-gray-800">{category.name}</h2>
              <span className="text-xs text-gray-500">{catTeams.length} team{catTeams.length !== 1 ? 's' : ''} · {catPools.length} poule{catPools.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Niet ingedeelde teams */}
            {catTeams.length > 0 && (
              <div className={`rounded-lg border p-4 space-y-3 ${unassigned.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Niet ingedeeld
                  {unassigned.length > 0 && (
                    <span className="ml-2 bg-amber-200 text-amber-800 rounded-full px-2 py-0.5 normal-case font-medium">{unassigned.length}</span>
                  )}
                </p>
                {unassigned.length === 0 ? (
                  <p className="text-xs text-gray-400">Alle teams zijn ingedeeld in een poule.</p>
                ) : (
                  <div className="space-y-2">
                    {unassigned.map(team => (
                      <div key={team.id} className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-800 min-w-0 flex-shrink-0">{team.name}</span>
                        {catPools.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">Maak eerst een poule aan</span>
                        ) : (
                          <>
                            <select
                              value={assignTarget[team.id] ?? ''}
                              onChange={e => setAssignTarget(prev => ({ ...prev, [team.id]: e.target.value }))}
                              className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-vvz-green bg-white"
                            >
                              <option value="">Kies poule…</option>
                              {catPools.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={working || !assignTarget[team.id]}
                              onClick={() => handleAssignTeam(team.id, assignTarget[team.id])}
                              className="text-sm bg-vvz-green text-white font-medium px-3 py-1 rounded-lg hover:bg-vvz-green/90 disabled:opacity-40"
                            >
                              Toevoegen
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Poule-kaarten */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {catPools.map(pool => {
                const members = catTeams.filter(t =>
                  (pool.tournament_pool_teams ?? []).some(pt => pt.team_id === t.id)
                )
                return (
                  <div key={pool.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        defaultValue={pool.name}
                        onBlur={e => handleRenamePool(pool, e.target.value)}
                        className="font-medium text-gray-800 bg-transparent border-b border-transparent focus:border-vvz-green focus:outline-none flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeletePool(pool)}
                        className="text-xs border border-red-300 text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-50"
                      >
                        Verwijderen
                      </button>
                    </div>

                    {members.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Nog geen teams toegevoegd.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {members.map(team => (
                          <span key={team.id} className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 text-sm rounded-full px-3 py-1">
                            {team.name}
                            <button
                              type="button"
                              disabled={working}
                              onClick={() => handleRemoveTeamFromPool(pool, team.id)}
                              className="text-gray-400 hover:text-red-600 leading-none ml-0.5 disabled:opacity-40"
                              title="Verwijderen uit poule"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Nieuwe poule aanmaken */}
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={newPoolByCat[category.id] ?? ''}
                onChange={e => setNewPoolByCat({ ...newPoolByCat, [category.id]: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleAddPool(category.id)}
                placeholder={`Poulenaam (bv. Poule ${String.fromCharCode(65 + catPools.length)})`}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
              />
              <button
                type="button"
                onClick={() => handleAddPool(category.id)}
                disabled={working || !(newPoolByCat[category.id] || '').trim()}
                className="bg-vvz-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-vvz-green/90 disabled:opacity-50"
              >
                Poule toevoegen
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// TAB: Simulatie
// ============================================================================

function SimulatieTab({ tournament, fields, pools, categories, teams, matches, onGenerated, onError, onSuccess }) {
  const [generating, setGenerating] = useState(false)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)

  const poolsForCalc = useMemo(() => pools.map(p => ({
    id: p.id,
    categoryId: p.category_id,
    teamIds: (p.tournament_pool_teams ?? []).map(pt => pt.team_id),
  })), [pools])

  const capacity = useMemo(() => calculateCapacity({
    startTime: tournament.start_time,
    endTime: tournament.end_time,
    matchDurationMinutes: tournament.match_duration_minutes,
    slotGapMinutes: tournament.slot_gap_minutes || 0,
    breakStartTime: tournament.break_start_time || null,
    breakDurationMinutes: tournament.break_duration_minutes || 0,
    fields,
  }), [tournament, fields])

  const needed = useMemo(() => totalMatchesNeeded(poolsForCalc, tournament.rounds_per_pairing ?? 1), [poolsForCalc, tournament.rounds_per_pairing])

  const ratio = capacity.totalSlots > 0 ? needed / capacity.totalSlots : Infinity
  const ratioColor = ratio > 1 ? 'red' : ratio > 0.8 ? 'amber' : 'green'

  const validations = []
  if (fields.length === 0) validations.push('Voeg minimaal één veld toe.')
  if (poolsForCalc.length === 0) validations.push('Maak minimaal één poule met teams aan.')
  const tooSmallPools = poolsForCalc.filter(p => p.teamIds.length < 2)
  if (tooSmallPools.length > 0) {
    validations.push(`Er zijn ${tooSmallPools.length} poule${tooSmallPools.length !== 1 ? 's' : ''} met minder dan 2 teams.`)
  }
  if (capacity.slotsPerField === 0) validations.push('Geen tijdslots beschikbaar — controleer start/eindtijd en wedstrijdduur.')
  if (ratio > 1) validations.push(`Onvoldoende capaciteit (${needed} wedstrijden nodig, ${capacity.totalSlots} slots beschikbaar).`)

  const canGenerate = validations.length === 0

  async function doGenerate() {
    setGenerating(true)
    onError(null)
    try {
      const fieldsForCalc = fields.map(f => ({ id: f.id, name: f.name, sort_order: f.sort_order }))

      const result = generateSchedule({
        tournament: {
          startTime: tournament.start_time,
          endTime: tournament.end_time,
          matchDurationMinutes: tournament.match_duration_minutes,
          slotGapMinutes: tournament.slot_gap_minutes || 0,
          roundsPerPairing: tournament.rounds_per_pairing ?? 1,
          breakStartTime: tournament.break_start_time || null,
          breakDurationMinutes: tournament.break_duration_minutes || 0,
        },
        fields: fieldsForCalc,
        pools: poolsForCalc,
        categories,
      })

      if (result.matches.length === 0) {
        onError('Er konden geen wedstrijden worden ingepland. Controleer poules en capaciteit.')
        setGenerating(false)
        return
      }

      // Verwijder bestaande niet-handmatige wedstrijden
      const { error: delErr } = await deleteAllMatches(tournament.id)
      if (delErr) throw delErr

      // Insert nieuwe wedstrijden
      const rows = result.matches.map(m => ({
        tournament_id: tournament.id,
        pool_id: m.poolId,
        field_id: m.fieldId,
        home_team_id: m.homeTeamId,
        away_team_id: m.awayTeamId,
        start_time: m.startTime,
        end_time: m.endTime,
        manual_override: false,
      }))

      const { error: insErr } = await bulkInsertMatches(rows)
      if (insErr) throw insErr

      // Update generated_at
      await updateTournament(tournament.id, { generated_at: new Date().toISOString() })

      onSuccess(
        result.warnings.length > 0
          ? `Schema gegenereerd met ${result.warnings.length} waarschuwing${result.warnings.length !== 1 ? 'en' : ''}.`
          : `Schema gegenereerd: ${result.matches.length} wedstrijden.`
      )

      await onGenerated()
    } catch (err) {
      onError(`Genereren mislukt: ${err.message || err}`)
    } finally {
      setGenerating(false)
      setConfirmRegenerate(false)
    }
  }

  async function handleGenerate() {
    if (matches.length > 0 && !confirmRegenerate) {
      setConfirmRegenerate(true)
      return
    }
    await doGenerate()
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Capaciteit</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Slots per veld" value={capacity.slotsPerField} />
          <StatCard label="Totaal slots" value={capacity.totalSlots} sublabel={`${fields.length} veld${fields.length !== 1 ? 'en' : ''}`} />
          <StatCard label="Benodigde wedstrijden" value={needed} sublabel={`${poolsForCalc.length} poule${poolsForCalc.length !== 1 ? 's' : ''}`} />
        </div>

        <div className={`rounded-lg p-4 text-sm border ${
          ratioColor === 'red' ? 'bg-red-50 border-red-200 text-red-700' :
          ratioColor === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-700' :
          'bg-green-50 border-green-200 text-green-700'
        }`}>
          {capacity.totalSlots > 0
            ? `Bezetting: ${needed} / ${capacity.totalSlots} slots (${Math.round(ratio * 100)}%)`
            : 'Geen slots beschikbaar.'}
        </div>
      </div>

      {validations.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4 rounded-lg">
          <p className="font-medium mb-1">Aandachtspunten:</p>
          <ul className="list-disc list-inside space-y-1">
            {validations.map((v, i) => <li key={i}>{v}</li>)}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-2">Schema genereren</h2>
        {matches.length > 0 && (
          <p className="text-sm text-gray-600 mb-3">
            Er staat al een schema klaar met {matches.length} wedstrijd{matches.length !== 1 ? 'en' : ''}. Hergeneratie overschrijft niet-handmatige wedstrijden.
          </p>
        )}

        {confirmRegenerate ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
            <p className="text-sm text-red-800">
              Weet je zeker dat je het schema opnieuw wilt genereren? Bestaande automatisch gegenereerde wedstrijden worden vervangen.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={doGenerate}
                disabled={generating}
                className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {generating ? 'Bezig...' : 'Ja, opnieuw genereren'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmRegenerate(false)}
                className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Annuleren
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="bg-vvz-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-vvz-green/90 disabled:opacity-50"
          >
            {generating ? 'Schema wordt berekend...' : 'Genereer toernooischema'}
          </button>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sublabel }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      {sublabel && <div className="text-xs text-gray-500 mt-1">{sublabel}</div>}
    </div>
  )
}

// ============================================================================
// TAB: Schema
// ============================================================================

function ResultModal({ match, onClose, onSaved, onError }) {
  const [homeScore, setHomeScore] = useState(match.result?.home_score ?? '')
  const [awayScore, setAwayScore] = useState(match.result?.away_score ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const hs = homeScore === '' ? null : Number(homeScore)
    const as = awayScore === '' ? null : Number(awayScore)
    if (hs !== null && (isNaN(hs) || hs < 0)) return
    if (as !== null && (isNaN(as) || as < 0)) return
    const result = (hs === null && as === null) ? null : { home_score: hs, away_score: as }
    setSaving(true)
    const { error: err } = await updateMatch(match.id, { result })
    setSaving(false)
    if (err) { onError(err.message); return }
    onSaved()
  }

  async function handleClear() {
    setSaving(true)
    const { error: err } = await updateMatch(match.id, { result: null })
    setSaving(false)
    if (err) { onError(err.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-gray-800 mb-1">Uitslag invoeren</h2>
        <p className="text-xs text-gray-500 mb-4">{match.pool?.name} · {(match.start_time || '').slice(0, 5)}</p>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 text-right">
            <div className="text-sm font-medium text-gray-700 mb-1 truncate">{match.home_team?.name}</div>
            <input
              type="number"
              min={0}
              value={homeScore}
              onChange={e => setHomeScore(e.target.value)}
              className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-vvz-green"
              placeholder="—"
              autoFocus
            />
          </div>
          <span className="text-gray-400 font-bold text-lg">–</span>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium text-gray-700 mb-1 truncate">{match.away_team?.name}</div>
            <input
              type="number"
              min={0}
              value={awayScore}
              onChange={e => setAwayScore(e.target.value)}
              className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-vvz-green"
              placeholder="—"
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          {match.result && (
            <button type="button" onClick={handleClear} disabled={saving} className="text-sm text-red-600 hover:underline mr-auto disabled:opacity-50">
              Wissen
            </button>
          )}
          <button type="button" onClick={onClose} className="text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            Annuleren
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="text-sm px-4 py-2 bg-vvz-green text-white rounded-lg hover:bg-vvz-green/90 disabled:opacity-50">
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SchemaTab({ tournament, fields, teams, matches, onChange, onPublishToggle, onError }) {
  const [viewMode, setViewMode] = useState('table')
  const [working, setWorking] = useState(false)
  const [resultMatch, setResultMatch] = useState(null)

  const slotTimes = useMemo(() => calculateSlots({
    startTime: tournament.start_time,
    endTime: tournament.end_time,
    matchDurationMinutes: tournament.match_duration_minutes,
    slotGapMinutes: tournament.slot_gap_minutes || 0,
    breakStartTime: tournament.break_start_time || null,
    breakDurationMinutes: tournament.break_duration_minutes || 0,
  }), [tournament])

  // Detecteer conflicten: per slot waar een team in meer dan 1 wedstrijd zit
  const conflictMatchIds = useMemo(() => {
    const bySlot = {}
    for (const m of matches) {
      const key = (m.start_time || '').slice(0, 5)
      if (!bySlot[key]) bySlot[key] = []
      bySlot[key].push(m)
    }
    const conflicts = new Set()
    for (const slot of Object.values(bySlot)) {
      const seen = {}
      for (const m of slot) {
        for (const tid of [m.home_team_id, m.away_team_id]) {
          if (seen[tid]) {
            conflicts.add(m.id)
            conflicts.add(seen[tid])
          } else {
            seen[tid] = m.id
          }
        }
      }
    }
    return conflicts
  }, [matches])

  async function handleFieldChange(match, newFieldId) {
    setWorking(true)
    const { error: err } = await updateMatch(match.id, { field_id: newFieldId })
    setWorking(false)
    if (err) {
      onError(err.message)
      return
    }
    await onChange()
  }

  async function handleStartChange(match, newStart) {
    if (!newStart) return
    const duration = tournament.match_duration_minutes
    const [h, m] = newStart.split(':').map(Number)
    const startMin = h * 60 + m
    const endMin = startMin + duration
    const newEnd = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`
    setWorking(true)
    const { error: err } = await updateMatch(match.id, { start_time: newStart, end_time: newEnd })
    setWorking(false)
    if (err) {
      onError(err.message)
      return
    }
    await onChange()
  }

  if (matches.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-sm text-gray-600">
        Nog geen schema gegenereerd. Ga naar het tabblad <strong>Simulatie</strong> om het schema te genereren.
      </div>
    )
  }

  // Bouw grid: rij per slot, kolom per veld
  const matchByCell = {}
  for (const m of matches) {
    const slotKey = (m.start_time || '').slice(0, 5)
    matchByCell[`${slotKey}|${m.field_id}`] = m
  }

  const sortedFields = [...fields].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 text-sm rounded-lg ${viewMode === 'table' ? 'bg-vvz-green text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            Tabel
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm rounded-lg ${viewMode === 'list' ? 'bg-vvz-green text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            Lijst
          </button>
        </div>
        <div className="flex-1" />
        <span className="text-sm text-gray-500">{matches.length} wedstrijd{matches.length !== 1 ? 'en' : ''}</span>
        <button
          type="button"
          onClick={onPublishToggle}
          className={`text-sm font-medium px-4 py-2 rounded-lg ${
            tournament.is_published
              ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              : 'bg-vvz-green text-white hover:bg-vvz-green/90'
          }`}
        >
          {tournament.is_published ? 'Depubliceren' : 'Publiceren'}
        </button>
      </div>

      {conflictMatchIds.size > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
          Er zijn {conflictMatchIds.size} wedstrijd-conflicten gedetecteerd (team in twee wedstrijden tegelijk). Pas tijden of velden aan.
        </div>
      )}

      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left sticky left-0 bg-gray-50">Tijd</th>
                {sortedFields.map(f => (
                  <th key={f.id} className="px-3 py-2 text-left">{f.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {slotTimes.map(slot => (
                <tr key={slot}>
                  <td className="px-3 py-2 font-medium text-gray-700 sticky left-0 bg-white">{slot}</td>
                  {sortedFields.map(f => {
                    const m = matchByCell[`${slot}|${f.id}`]
                    if (!m) return <td key={f.id} className="px-3 py-2 text-gray-300">—</td>
                    const isConflict = conflictMatchIds.has(m.id)
                    const hasResult = m.result?.home_score != null && m.result?.away_score != null
                    return (
                      <td key={f.id} className={`px-3 py-2 ${isConflict ? 'bg-red-50' : ''}`}>
                        <div className="text-xs text-gray-500">{m.pool?.name}</div>
                        <div className="font-medium text-sm">
                          {m.home_team?.name} <span className="text-gray-400">vs</span> {m.away_team?.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {hasResult ? (
                            <span className="text-sm font-bold text-vvz-green">
                              {m.result.home_score} – {m.result.away_score}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">geen uitslag</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setResultMatch(m)}
                            className="text-xs text-vvz-green hover:underline"
                          >
                            {hasResult ? 'Wijzigen' : 'Invoeren'}
                          </button>
                        </div>
                        {m.manual_override && (
                          <div className="text-[10px] text-amber-700 mt-0.5">handmatig</div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Tijd</th>
                <th className="px-3 py-2 text-left">Veld</th>
                <th className="px-3 py-2 text-left">Poule</th>
                <th className="px-3 py-2 text-left">Wedstrijd</th>
                <th className="px-3 py-2 text-left">Uitslag</th>
                <th className="px-3 py-2 text-left"></th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {matches.map(m => {
                const isConflict = conflictMatchIds.has(m.id)
                return (
                  <tr key={m.id} className={isConflict ? 'bg-red-50' : 'hover:bg-gray-50'}>
                    <td className="px-3 py-2">
                      <select
                        value={(m.start_time || '').slice(0, 5)}
                        onChange={e => handleStartChange(m, e.target.value)}
                        disabled={working}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        {slotTimes.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={m.field_id}
                        onChange={e => handleFieldChange(m, e.target.value)}
                        disabled={working}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        {sortedFields.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{m.pool?.name}</td>
                    <td className="px-3 py-2">
                      <strong>{m.home_team?.name}</strong> <span className="text-gray-400">vs</span> <strong>{m.away_team?.name}</strong>
                    </td>
                    <td className="px-3 py-2">
                      {m.result?.home_score != null ? (
                        <span className="font-bold text-vvz-green">{m.result.home_score} – {m.result.away_score}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => setResultMatch(m)} className="text-xs text-vvz-green hover:underline">
                        {m.result?.home_score != null ? 'Wijzigen' : 'Invoeren'}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {isConflict && <span className="text-red-700 font-medium">conflict</span>}
                      {!isConflict && m.manual_override && <span className="text-amber-700">handmatig</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {resultMatch && (
        <ResultModal
          match={resultMatch}
          onClose={() => setResultMatch(null)}
          onSaved={async () => { setResultMatch(null); await onChange() }}
          onError={onError}
        />
      )}
    </div>
  )
}
