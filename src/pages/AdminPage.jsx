import { useEffect, useState } from 'react'
import { fetchTeams, createTeam, updateTeam, deleteTeam } from '../services/teams'
import { fetchFields, createField, updateField, deleteField } from '../services/fields'
import { fetchSchedules, createSchedule, updateSchedule, deleteSchedule, setActiveSchedule } from '../services/schedules'
import { supabase } from '../lib/supabaseClient'

export default function AdminPage() {
  const [teams, setTeams] = useState([])
  const [fields, setFields] = useState([])
  const [schedules, setSchedules] = useState([])
  const [usedTeamIds, setUsedTeamIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('teams')

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const [t, f, u, s] = await Promise.all([
      fetchTeams(),
      fetchFields(),
      supabase.from('training_slot_teams').select('team_id'),
      fetchSchedules(),
    ])
    if (t.data) setTeams(t.data)
    if (f.data) setFields(f.data)
    if (u.data) setUsedTeamIds(new Set(u.data.map(r => r.team_id)))
    if (s.data) setSchedules(s.data)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green"></div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'teams'
              ? 'bg-vvz-green text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Teams
        </button>
        <button
          onClick={() => setActiveTab('fields')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'fields'
              ? 'bg-vvz-green text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Velden
        </button>
        <button
          onClick={() => setActiveTab('schedules')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'schedules'
              ? 'bg-vvz-green text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Schema's
        </button>
      </div>

      {activeTab === 'teams' && <TeamsManager teams={teams} usedTeamIds={usedTeamIds} onReload={loadAll} />}
      {activeTab === 'fields' && <FieldsManager fields={fields} onReload={loadAll} />}
      {activeTab === 'schedules' && <SchedulesManager schedules={schedules} onReload={loadAll} />}
    </div>
  )
}

/* ─── FieldsManager ────────────────────────────────────────────────── */

function FieldsManager({ fields, onReload }) {
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '' })
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState({ name: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [dragIndex, setDragIndex] = useState(null)
  const [dropIndex, setDropIndex] = useState(null)

  function startEdit(field) {
    setAdding(false)
    setDeleteConfirmId(null)
    setEditId(field.id)
    setEditForm({ name: field.name })
    setError(null)
  }

  function cancelEdit() {
    setEditId(null)
    setEditForm({ name: '' })
    setError(null)
  }

  function startAdd() {
    setEditId(null)
    setDeleteConfirmId(null)
    setAdding(true)
    setAddForm({ name: '' })
    setError(null)
  }

  function cancelAdd() {
    setAdding(false)
    setAddForm({ name: '' })
    setError(null)
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!editForm.name.trim()) return
    setSaving(true)
    setError(null)
    const { error } = await updateField(editId, { name: editForm.name })
    setSaving(false)
    if (error) { setError(error.message) } else { cancelEdit(); onReload() }
  }

  async function handleToggleActive(field) {
    setSaving(true)
    setError(null)
    const { error } = await updateField(field.id, { active: !field.active })
    setSaving(false)
    if (error) setError(error.message)
    else onReload()
  }

  async function handleSaveAdd(e) {
    e.preventDefault()
    if (!addForm.name.trim()) return
    setSaving(true)
    setError(null)
    const nextOrder = fields.length > 0 ? Math.max(...fields.map(f => f.display_order ?? 0)) + 1 : 0
    const { error } = await createField({ name: addForm.name, display_order: nextOrder, active: true })
    setSaving(false)
    if (error) { setError(error.message) } else { cancelAdd(); onReload() }
  }

  async function handleDelete(id) {
    setSaving(true)
    setError(null)
    const { error } = await deleteField(id)
    setSaving(false)
    if (error) { setError(error.message) } else { setDeleteConfirmId(null); onReload() }
  }

  async function handleDrop(toIndex) {
    if (dragIndex === null || dragIndex === toIndex) { setDragIndex(null); setDropIndex(null); return }
    const reordered = [...fields]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(toIndex, 0, moved)
    setDragIndex(null)
    setDropIndex(null)
    setSaving(true)
    setError(null)
    await Promise.all(reordered.map((f, i) => updateField(f.id, { display_order: i })))
    setSaving(false)
    onReload()
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-3 gap-4">
        <p className="text-sm text-gray-500">
          Sleep een veld aan het ⠿-icoontje om de volgorde aan te passen. De volgorde bepaalt de kolommen in het trainingsschema van links naar rechts.
        </p>
        {!adding && (
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 text-sm bg-vvz-green text-white px-3 py-1.5 rounded-lg font-medium hover:bg-vvz-green-dark transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Veld toevoegen
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-8"></th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Naam</th>
              <th className="text-center px-4 py-2.5 w-24 font-medium text-gray-600">Actief</th>
              <th className="text-right px-4 py-2.5 w-32"></th>
            </tr>
          </thead>
          <tbody>
            {adding && (
              <tr>
                <td></td>
                <td colSpan={3} className="px-4 py-2 bg-vvz-green/5">
                  <form onSubmit={handleSaveAdd} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={addForm.name}
                      onChange={e => setAddForm({ name: e.target.value })}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none"
                      placeholder="Veldnaam, bijv. Veld 1A"
                      autoFocus
                      aria-label="Veldnaam"
                    />
                    <div className="flex gap-2 shrink-0">
                      <button type="submit" disabled={saving || !addForm.name.trim()} className="bg-vvz-green text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-vvz-green-dark transition-colors disabled:opacity-50">Toevoegen</button>
                      <button type="button" onClick={cancelAdd} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-300 transition-colors">Annuleer</button>
                    </div>
                  </form>
                </td>
              </tr>
            )}

            {fields.map((field, i) => (
              <tr
                key={field.id}
                draggable={editId !== field.id && deleteConfirmId !== field.id}
                onDragStart={() => setDragIndex(i)}
                onDragOver={e => { e.preventDefault(); setDropIndex(i) }}
                onDragLeave={() => setDropIndex(null)}
                onDrop={() => handleDrop(i)}
                onDragEnd={() => { setDragIndex(null); setDropIndex(null) }}
                className={`group transition-colors ${
                  dropIndex === i && dragIndex !== i ? 'border-t-2 border-vvz-green' :
                  dragIndex === i ? 'opacity-40' :
                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }`}
              >
                {editId === field.id ? (
                  <>
                    <td></td>
                    <td colSpan={3} className="px-4 py-2 bg-vvz-green/5">
                      <form onSubmit={handleSaveEdit} className="flex items-center gap-3">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={e => setEditForm({ name: e.target.value })}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none"
                          placeholder="Veldnaam"
                          autoFocus
                          aria-label="Veldnaam"
                        />
                        <div className="flex gap-2 shrink-0">
                          <button type="submit" disabled={saving || !editForm.name.trim()} className="bg-vvz-green text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-vvz-green-dark transition-colors disabled:opacity-50">Opslaan</button>
                          <button type="button" onClick={cancelEdit} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-300 transition-colors">Annuleer</button>
                        </div>
                      </form>
                    </td>
                  </>
                ) : deleteConfirmId === field.id ? (
                  <>
                    <td></td>
                    <td colSpan={3} className="px-4 py-2 bg-red-50">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 flex-1"><strong>{field.name}</strong> verwijderen? Dit kan niet ongedaan worden.</span>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleDelete(field.id)} disabled={saving} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50">Ja, verwijder</button>
                          <button onClick={() => setDeleteConfirmId(null)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-300 transition-colors">Annuleer</button>
                        </div>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="pl-3 text-gray-400 cursor-grab active:cursor-grabbing">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm8-12a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/>
                      </svg>
                    </td>
                    <td className={`px-4 py-2.5 font-medium text-gray-800 ${field.active === false ? 'opacity-40' : ''}`}>{field.name}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => handleToggleActive(field)}
                        disabled={saving}
                        aria-label={field.active === false ? `${field.name} activeren` : `${field.name} deactiveren`}
                        title={field.active === false ? 'Activeren' : 'Deactiveren'}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${field.active === false ? 'bg-gray-400' : 'bg-vvz-green'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${field.active === false ? 'translate-x-1' : 'translate-x-4'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => startEdit(field)} className="p-1.5 text-gray-400 hover:text-vvz-green hover:bg-vvz-green/10 rounded-lg transition-colors" aria-label={`${field.name} bewerken`} title="Bewerken">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => { setDeleteConfirmId(field.id); setEditId(null) }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" aria-label={`${field.name} verwijderen`} title="Verwijderen">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── TeamsManager ─────────────────────────────────────────────────── */

function TeamsManager({ teams, usedTeamIds, onReload }) {
  const CATEGORIES = ['Pupillen', 'Junioren', 'Senioren', 'Veteranen']

  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', category: '' })
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', category: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function startEdit(team) {
    setAdding(false)
    setDeleteConfirmId(null)
    setEditId(team.id)
    setEditForm({ name: team.name, category: team.category || '' })
    setError(null)
  }

  function cancelEdit() {
    setEditId(null)
    setEditForm({ name: '', category: '' })
    setError(null)
  }

  function startAdd() {
    setEditId(null)
    setDeleteConfirmId(null)
    setAdding(true)
    setAddForm({ name: '', category: '' })
    setError(null)
  }

  function cancelAdd() {
    setAdding(false)
    setAddForm({ name: '', category: '' })
    setError(null)
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!editForm.name.trim()) return
    setSaving(true)
    setError(null)
    const payload = { name: editForm.name, category: editForm.category || null }
    const { error } = await updateTeam(editId, payload)
    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      cancelEdit()
      onReload()
    }
  }

  async function handleSaveAdd(e) {
    e.preventDefault()
    if (!addForm.name.trim()) return
    setSaving(true)
    setError(null)
    const payload = { name: addForm.name, category: addForm.category || null }
    const { error } = await createTeam(payload)
    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      cancelAdd()
      onReload()
    }
  }

  async function handleDelete(id) {
    setSaving(true)
    setError(null)
    const { error } = await deleteTeam(id)
    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setDeleteConfirmId(null)
      onReload()
    }
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        {!adding && (
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 text-sm bg-vvz-green text-white px-3 py-1.5 rounded-lg font-medium hover:bg-vvz-green-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Team toevoegen
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600"></th>
              <th className="text-right px-4 py-2.5 w-40"></th>
            </tr>
          </thead>
          <tbody>
            {/* --- Add new team row --- */}
            {adding && (
              <tr>
                <td colSpan={2} className="px-4 py-2 bg-vvz-green/5">
                  <form onSubmit={handleSaveAdd} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={addForm.name}
                      onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none"
                      placeholder="Nieuwe teamnaam, bijv. JO13-1"
                      autoFocus
                      aria-label="Teamnaam"
                    />
                    <select
                      value={addForm.category}
                      onChange={e => setAddForm({ ...addForm, category: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none"
                      aria-label="Categorie"
                    >
                      <option value="">Geen categorie</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="submit"
                        disabled={saving || !addForm.name.trim()}
                        className="bg-vvz-green text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-vvz-green-dark transition-colors disabled:opacity-50"
                      >
                        Toevoegen
                      </button>
                      <button
                        type="button"
                        onClick={cancelAdd}
                        className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                      >
                        Annuleer
                      </button>
                    </div>
                  </form>
                </td>
              </tr>
            )}
            {(() => {
              const ORDER = ['Pupillen', 'Junioren', 'Senioren', 'Veteranen']
              const grouped = {}
              teams.forEach(t => {
                const cat = t.category || 'Overig'
                if (!grouped[cat]) grouped[cat] = []
                grouped[cat].push(t)
              })
              const cats = [...ORDER.filter(c => grouped[c]), ...Object.keys(grouped).filter(c => !ORDER.includes(c))]
              let rowIndex = 0
              return cats.flatMap(cat => [
                <tr key={`header-${cat}`}>
                  <td colSpan={2} className="px-4 py-2 bg-vvz-green text-xs font-bold text-white uppercase tracking-wider border-t-8 border-t-white border-b border-vvz-green-dark">
                    {cat}
                  </td>
                </tr>,
                ...grouped[cat].sort((a, b) => a.name.localeCompare(b.name)).map(team => {
                  const i = rowIndex++
                  return (
              <tr key={team.id} className={`group ${i % 2 === 0 ? 'bg-white' : 'bg-gray-300'}`}>
                {editId === team.id ? (
                  /* --- Inline edit mode --- */
                  <td colSpan={2} className="px-4 py-2 bg-vvz-green/5">
                    <form onSubmit={handleSaveEdit} className="flex items-center gap-3">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none"
                        placeholder="Teamnaam"
                        autoFocus
                        aria-label="Teamnaam"
                      />
                      <select
                        value={editForm.category}
                        onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none"
                        aria-label="Categorie"
                      >
                        <option value="">Geen categorie</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="submit"
                          disabled={saving || !editForm.name.trim()}
                          className="bg-vvz-green text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-vvz-green-dark transition-colors disabled:opacity-50"
                        >
                          Opslaan
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                        >
                          Annuleer
                        </button>
                      </div>
                    </form>
                  </td>
                ) : deleteConfirmId === team.id ? (
                  /* --- Inline delete confirmation --- */
                  <td colSpan={2} className="px-4 py-2 bg-red-50">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 flex-1">
                        <strong>{team.name}</strong> verwijderen? Dit kan niet ongedaan worden.
                      </span>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleDelete(team.id)}
                          disabled={saving}
                          className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          Ja, verwijder
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                        >
                          Annuleer
                        </button>
                      </div>
                    </div>
                  </td>
                ) : (
                  /* --- Display mode --- */
                  <>
                    <td className="px-4 py-2.5 font-medium text-gray-800">
                      <span className="flex items-center gap-2">
                        {team.name}
                        {!usedTeamIds.has(team.id) && (
                          <span className="text-xs font-normal text-orange-400">Niet ingepland in een training</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => startEdit(team)}
                          className="p-1.5 text-gray-400 hover:text-vvz-green hover:bg-vvz-green/10 rounded-lg transition-colors"
                          aria-label={`${team.name} bewerken`}
                          title="Bewerken"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => { setDeleteConfirmId(team.id); setEditId(null) }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label={`${team.name} verwijderen`}
                          title="Verwijderen"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </>
                )}
                  </tr>
                  )
                })
              ])
            })()}

          </tbody>
        </table>

      </div>
    </div>
  )
}

/* ─── SchedulesManager ────────────────────────────────────────────── */

function SchedulesManager({ schedules, onReload }) {
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', valid_from: '', valid_until: '' })
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [activateConfirmId, setActivateConfirmId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', valid_from: '', valid_until: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function startEdit(schedule) {
    setAdding(false)
    setDeleteConfirmId(null)
    setActivateConfirmId(null)
    setEditId(schedule.id)
    setEditForm({
      name: schedule.name,
      valid_from: schedule.valid_from || '',
      valid_until: schedule.valid_until || '',
    })
    setError(null)
  }

  function cancelEdit() {
    setEditId(null)
    setEditForm({ name: '', valid_from: '', valid_until: '' })
    setError(null)
  }

  function startAdd() {
    setEditId(null)
    setDeleteConfirmId(null)
    setActivateConfirmId(null)
    setAdding(true)
    setAddForm({ name: '', valid_from: '', valid_until: '' })
    setError(null)
  }

  function cancelAdd() {
    setAdding(false)
    setAddForm({ name: '', valid_from: '', valid_until: '' })
    setError(null)
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!editForm.name.trim()) return
    setSaving(true)
    setError(null)
    const payload = {
      name: editForm.name,
      valid_from: editForm.valid_from || null,
      valid_until: editForm.valid_until || null,
    }
    const { error } = await updateSchedule(editId, payload)
    setSaving(false)
    if (error) { setError(error.message) } else { cancelEdit(); onReload() }
  }

  async function handleSaveAdd(e) {
    e.preventDefault()
    if (!addForm.name.trim()) return
    setSaving(true)
    setError(null)
    const payload = {
      name: addForm.name,
      valid_from: addForm.valid_from || null,
      valid_until: addForm.valid_until || null,
      active: false,
    }
    const { error } = await createSchedule(payload)
    setSaving(false)
    if (error) { setError(error.message) } else { cancelAdd(); onReload() }
  }

  async function handleDelete(id) {
    setSaving(true)
    setError(null)
    const { error } = await deleteSchedule(id)
    setSaving(false)
    if (error) { setError(error.message) } else { setDeleteConfirmId(null); onReload() }
  }

  async function handleActivate(id) {
    setSaving(true)
    setError(null)
    const { error } = await setActiveSchedule(id)
    setSaving(false)
    if (error) { setError(error.message) } else { setActivateConfirmId(null); onReload() }
  }

  function formatDate(d) {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        {!adding && (
          <button
            onClick={startAdd}
            className="flex items-center gap-1.5 text-sm bg-vvz-green text-white px-3 py-1.5 rounded-lg font-medium hover:bg-vvz-green-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nieuw schema
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Naam</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Geldig van</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">Geldig tot</th>
              <th className="text-center px-4 py-2.5 w-24 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-2.5 w-40"></th>
            </tr>
          </thead>
          <tbody>
            {adding && (
              <tr>
                <td colSpan={5} className="px-4 py-2 bg-vvz-green/5">
                  <form onSubmit={handleSaveAdd} className="flex items-center gap-3">
                    <input
                      type="text"
                      value={addForm.name}
                      onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none"
                      placeholder="Naam, bijv. 2026/2027"
                      autoFocus
                      aria-label="Schema naam"
                    />
                    <input
                      type="date"
                      value={addForm.valid_from}
                      onChange={e => setAddForm({ ...addForm, valid_from: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none"
                      aria-label="Geldig van"
                    />
                    <input
                      type="date"
                      value={addForm.valid_until}
                      onChange={e => setAddForm({ ...addForm, valid_until: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none"
                      aria-label="Geldig tot"
                    />
                    <div className="flex gap-2 shrink-0">
                      <button type="submit" disabled={saving || !addForm.name.trim()} className="bg-vvz-green text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-vvz-green-dark transition-colors disabled:opacity-50">Toevoegen</button>
                      <button type="button" onClick={cancelAdd} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-300 transition-colors">Annuleer</button>
                    </div>
                  </form>
                </td>
              </tr>
            )}

            {schedules.map((schedule, i) => (
              <tr key={schedule.id} className={`group ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                {editId === schedule.id ? (
                  <td colSpan={5} className="px-4 py-2 bg-vvz-green/5">
                    <form onSubmit={handleSaveEdit} className="flex items-center gap-3">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none"
                        placeholder="Schema naam"
                        autoFocus
                        aria-label="Schema naam"
                      />
                      <input
                        type="date"
                        value={editForm.valid_from}
                        onChange={e => setEditForm({ ...editForm, valid_from: e.target.value })}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none"
                        aria-label="Geldig van"
                      />
                      <input
                        type="date"
                        value={editForm.valid_until}
                        onChange={e => setEditForm({ ...editForm, valid_until: e.target.value })}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-vvz-green focus:border-vvz-green outline-none"
                        aria-label="Geldig tot"
                      />
                      <div className="flex gap-2 shrink-0">
                        <button type="submit" disabled={saving || !editForm.name.trim()} className="bg-vvz-green text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-vvz-green-dark transition-colors disabled:opacity-50">Opslaan</button>
                        <button type="button" onClick={cancelEdit} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-300 transition-colors">Annuleer</button>
                      </div>
                    </form>
                  </td>
                ) : deleteConfirmId === schedule.id ? (
                  <td colSpan={5} className="px-4 py-2 bg-red-50">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 flex-1">
                        <strong>{schedule.name}</strong> verwijderen? Alle bijbehorende trainingen worden ook verwijderd. Dit kan niet ongedaan worden.
                      </span>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleDelete(schedule.id)} disabled={saving} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50">Ja, verwijder</button>
                        <button onClick={() => setDeleteConfirmId(null)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-300 transition-colors">Annuleer</button>
                      </div>
                    </div>
                  </td>
                ) : activateConfirmId === schedule.id ? (
                  <td colSpan={5} className="px-4 py-2 bg-blue-50">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 flex-1">
                        <strong>{schedule.name}</strong> activeren? Het huidige actieve schema wordt op inactief gezet.
                      </span>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleActivate(schedule.id)} disabled={saving} className="bg-vvz-green text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-vvz-green-dark transition-colors disabled:opacity-50">Ja, activeren</button>
                        <button onClick={() => setActivateConfirmId(null)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-300 transition-colors">Annuleer</button>
                      </div>
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{schedule.name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{formatDate(schedule.valid_from)}</td>
                    <td className="px-4 py-2.5 text-gray-600">{formatDate(schedule.valid_until)}</td>
                    <td className="px-4 py-2.5 text-center">
                      {schedule.active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          Actief
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          Concept
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex gap-1 justify-end">
                        {!schedule.active && (
                          <button
                            onClick={() => { setActivateConfirmId(schedule.id); setEditId(null); setDeleteConfirmId(null) }}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            aria-label={`${schedule.name} activeren`}
                            title="Activeren"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(schedule)}
                          className="p-1.5 text-gray-400 hover:text-vvz-green hover:bg-vvz-green/10 rounded-lg transition-colors"
                          aria-label={`${schedule.name} bewerken`}
                          title="Bewerken"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => { setDeleteConfirmId(schedule.id); setEditId(null); setActivateConfirmId(null) }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label={`${schedule.name} verwijderen`}
                          title="Verwijderen"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}

            {schedules.length === 0 && !adding && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">
                  Nog geen schema's aangemaakt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
