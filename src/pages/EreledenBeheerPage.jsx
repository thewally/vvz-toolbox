import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchEreleden, createErelid, updateErelid, deleteErelid } from '../services/ereleden'
import { fetchEredelenGroepen, createEredelenGroep, updateEredelenGroep, deleteEredelenGroep } from '../services/eredelenGroepen'

const EMPTY_FORM = { groep_id: '', jaar: new Date().getFullYear(), naam: '', overleden: false }
const EMPTY_GROEP_FORM = { naam: '', slug: '', volgorde: 0, kolom: 1 }

function slugify(naam) {
  return naam.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export default function EreledenBeheerPage() {
  const [ereleden, setEreleden] = useState([])
  const [groepen, setGroepen] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const [groepenOpen, setGroepenOpen] = useState(false)
  const [groepModalOpen, setGroepModalOpen] = useState(false)
  const [editingGroep, setEditingGroep] = useState(null)
  const [groepForm, setGroepForm] = useState(EMPTY_GROEP_FORM)
  const [savingGroep, setSavingGroep] = useState(false)
  const [groepError, setGroepError] = useState(null)
  const [deleteGroepConfirm, setDeleteGroepConfirm] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: elData, error: elErr }, { data: grData, error: grErr }] = await Promise.all([
      fetchEreleden(),
      fetchEredelenGroepen(),
    ])
    if (elErr) setError(elErr.message)
    else setEreleden(elData ?? [])
    if (grErr) setError(grErr.message)
    else setGroepen(grData ?? [])
    setLoading(false)
  }

  function openAdd(groepId) {
    setEditing(null)
    setSaveError(null)
    setForm({ ...EMPTY_FORM, groep_id: groepId ?? (groepen[0]?.id ?? '') })
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setSaveError(null)
    setForm({ groep_id: item.groep_id, jaar: item.jaar, naam: item.naam, overleden: item.overleden })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const selectedGroep = groepen.find(g => g.id === form.groep_id)
    const payload = { ...form, categorie: selectedGroep?.slug ?? form.categorie }
    let error
    if (editing) {
      ;({ error } = await updateErelid(editing.id, payload))
    } else {
      ;({ error } = await createErelid(payload))
    }
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setModalOpen(false)
    load()
  }

  async function handleDelete(id) {
    await deleteErelid(id)
    setDeleteConfirm(null)
    load()
  }

  async function handleToggleOverleden(item) {
    await updateErelid(item.id, { overleden: !item.overleden })
    setEreleden(prev => prev.map(e => e.id === item.id ? { ...e, overleden: !e.overleden } : e))
  }

  function openAddGroep() {
    setEditingGroep(null)
    const volgorde = groepen.length > 0 ? Math.max(...groepen.map(g => g.volgorde)) + 1 : 0
    setGroepForm({ ...EMPTY_GROEP_FORM, volgorde })
    setGroepError(null)
    setGroepModalOpen(true)
  }

  function openEditGroep(groep) {
    setEditingGroep(groep)
    setGroepForm({ naam: groep.naam, slug: groep.slug, volgorde: groep.volgorde, kolom: groep.kolom })
    setGroepError(null)
    setGroepModalOpen(true)
  }

  async function handleSaveGroep() {
    setSavingGroep(true)
    setGroepError(null)
    const payload = { ...groepForm, slug: groepForm.slug || slugify(groepForm.naam) }
    if (editingGroep) {
      const { error } = await updateEredelenGroep(editingGroep.id, payload)
      if (error) { setGroepError(error.message); setSavingGroep(false); return }
    } else {
      const { error } = await createEredelenGroep(payload)
      if (error) { setGroepError(error.message); setSavingGroep(false); return }
    }
    setSavingGroep(false)
    setGroepModalOpen(false)
    load()
  }

  async function handleDeleteGroep(groep) {
    const heeftLeden = ereleden.some(e => e.groep_id === groep.id)
    if (heeftLeden) {
      setGroepError(`Kan groep "${groep.naam}" niet verwijderen: er zijn nog ereleden in deze groep.`)
      setDeleteGroepConfirm(null)
      return
    }
    const { error } = await deleteEredelenGroep(groep.id)
    if (error) { setGroepError(error.message); return }
    setDeleteGroepConfirm(null)
    load()
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
        <Link to="/beheer" className="text-sm text-vvz-green hover:underline">&larr; Terug naar Beheer</Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Ereleden</h1>
        <button
          onClick={() => setGroepenOpen(v => !v)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-vvz-green border border-gray-200 rounded-lg px-3 py-1.5 hover:border-vvz-green transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.28c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Groepen
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg mb-4">{error}</div>
      )}

      {/* Groepenbeheer sectie */}
      {groepenOpen && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <h2 className="font-semibold text-gray-700 text-sm">Groepen beheren</h2>
            <button
              onClick={openAddGroep}
              className="inline-flex items-center gap-1 text-xs font-medium text-vvz-green hover:text-vvz-green/80 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Toevoegen
            </button>
          </div>
          {groepError && (
            <div className="mx-4 mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{groepError}</div>
          )}
          {groepen.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">Geen groepen</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {groepen.map(groep => {
                const aantalLeden = ereleden.filter(e => e.groep_id === groep.id).length
                return (
                  <div key={groep.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex-1 text-sm text-gray-800">{groep.naam}</span>
                    <span className="text-xs text-gray-400">kolom {groep.kolom}</span>
                    <span className="text-xs text-gray-400 tabular-nums">{aantalLeden} {aantalLeden === 1 ? 'lid' : 'leden'}</span>
                    <button
                      onClick={() => openEditGroep(groep)}
                      className="text-gray-400 hover:text-vvz-green transition-colors"
                      title="Bewerken"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button
                      onClick={() => { setGroepError(null); setDeleteGroepConfirm(groep) }}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Verwijderen"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Ereleden per groep */}
      <div className="space-y-6">
        {groepen.map(groep => {
          const items = ereleden.filter(e => e.groep_id === groep.id)
          return (
            <div key={groep.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-gray-800">{groep.naam}</h2>
                  <span className="text-xs text-gray-400">{items.length}</span>
                </div>
                <button
                  onClick={() => openAdd(groep.id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-vvz-green hover:text-vvz-green/80 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Toevoegen
                </button>
              </div>
              {items.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400">Geen items</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="text-sm text-gray-400 tabular-nums w-12 shrink-0">{item.jaar}</span>
                      <span className="flex-1 text-sm text-gray-800">
                        {item.naam}
                        {item.overleden && <span className="ml-1.5 text-gray-400">†</span>}
                      </span>
                      <button
                        onClick={() => handleToggleOverleden(item)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none shrink-0 ${item.overleden ? 'bg-gray-400' : 'bg-gray-200'}`}
                        title={item.overleden ? 'Markeer als levend' : 'Markeer als overleden'}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${item.overleden ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                      </button>
                      <span className="text-xs text-gray-400 w-14 shrink-0">{item.overleden ? 'Overleden' : ''}</span>
                      <button
                        onClick={() => openEdit(item)}
                        className="text-gray-400 hover:text-vvz-green transition-colors"
                        title="Bewerken"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(item)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Verwijderen"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal erelid toevoegen/bewerken */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-5">{editing ? 'Bewerken' : 'Toevoegen'}</h2>
            {saveError && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Groep</label>
                <select
                  value={form.groep_id}
                  onChange={e => setForm(f => ({ ...f, groep_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
                >
                  {groepen.map(g => (
                    <option key={g.id} value={g.id}>{g.naam}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jaar</label>
                <input
                  type="number"
                  value={form.jaar}
                  onChange={e => setForm(f => ({ ...f, jaar: parseInt(e.target.value) || '' }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
                  min="1900"
                  max="2100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
                <input
                  type="text"
                  value={form.naam}
                  onChange={e => setForm(f => ({ ...f, naam: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
                  placeholder="Voor- en achternaam"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Overleden (†)</span>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, overleden: !f.overleden }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${form.overleden ? 'bg-gray-400' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.overleden ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.naam.trim() || !form.jaar || !form.groep_id}
                className="flex-1 bg-vvz-green text-white text-sm font-medium py-2 rounded-lg hover:bg-vvz-green/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal groep toevoegen/bewerken */}
      {groepModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-5">{editingGroep ? 'Groep bewerken' : 'Groep toevoegen'}</h2>
            {groepError && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{groepError}</div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
                <input
                  type="text"
                  value={groepForm.naam}
                  onChange={e => setGroepForm(f => ({ ...f, naam: e.target.value, slug: f.slug || slugify(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
                  placeholder="Groepsnaam"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kolom (publieke pagina)</label>
                <div className="flex gap-3">
                  {[1, 2].map(k => (
                    <label key={k} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="kolom"
                        value={k}
                        checked={groepForm.kolom === k}
                        onChange={() => setGroepForm(f => ({ ...f, kolom: k }))}
                        className="text-vvz-green focus:ring-vvz-green"
                      />
                      <span className="text-sm text-gray-700">Kolom {k}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Volgorde</label>
                <input
                  type="number"
                  value={groepForm.volgorde}
                  onChange={e => setGroepForm(f => ({ ...f, volgorde: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
                  min="0"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setGroepModalOpen(false)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleSaveGroep}
                disabled={savingGroep || !groepForm.naam.trim()}
                className="flex-1 bg-vvz-green text-white text-sm font-medium py-2 rounded-lg hover:bg-vvz-green/90 transition-colors disabled:opacity-50"
              >
                {savingGroep ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verwijder erelid bevestiging */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Verwijderen?</h2>
            <p className="text-sm text-gray-600 mb-5">
              Weet je zeker dat je <strong>{deleteConfirm.naam}</strong> wilt verwijderen?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 bg-red-500 text-white text-sm font-medium py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verwijder groep bevestiging */}
      {deleteGroepConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Groep verwijderen?</h2>
            <p className="text-sm text-gray-600 mb-5">
              Weet je zeker dat je groep <strong>{deleteGroepConfirm.naam}</strong> wilt verwijderen?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteGroepConfirm(null)}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={() => handleDeleteGroep(deleteGroepConfirm)}
                className="flex-1 bg-red-500 text-white text-sm font-medium py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
