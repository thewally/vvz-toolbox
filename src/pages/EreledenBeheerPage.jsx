import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchEreleden, createErelid, updateErelid, deleteErelid } from '../services/ereleden'

const CATEGORIE_LABELS = {
  erevoorzitter: 'Erevoorzitters',
  erelid: 'Ereleden',
  lid_van_verdienste: 'Leden van verdienste',
}

const CATEGORIE_ORDER = ['erevoorzitter', 'erelid', 'lid_van_verdienste']

const EMPTY_FORM = { categorie: 'erelid', jaar: new Date().getFullYear(), naam: '', overleden: false }

export default function EreledenBeheerPage() {
  const [ereleden, setEreleden] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await fetchEreleden()
    if (error) setError(error.message)
    else setEreleden(data ?? [])
    setLoading(false)
  }

  function openAdd(cat) {
    setEditing(null)
    setForm({ ...EMPTY_FORM, categorie: cat ?? EMPTY_FORM.categorie })
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setForm({ categorie: item.categorie, jaar: item.jaar, naam: item.naam, overleden: item.overleden })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    if (editing) {
      await updateErelid(editing.id, form)
    } else {
      await createErelid(form)
    }
    setSaving(false)
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

      <h1 className="text-2xl font-bold text-gray-800 mb-6">Ereleden</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg mb-4">{error}</div>
      )}

      <div className="space-y-6">
        {CATEGORIE_ORDER.map(cat => {
          const items = ereleden.filter(e => e.categorie === cat)
          return (
            <div key={cat} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-gray-800">{CATEGORIE_LABELS[cat]}</h2>
                  <span className="text-xs text-gray-400">{items.length}</span>
                </div>
                <button
                  onClick={() => openAdd(cat)}
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
                      {/* Overleden toggle */}
                      <button
                        onClick={() => handleToggleOverleden(item)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none shrink-0 ${item.overleden ? 'bg-gray-400' : 'bg-gray-200'}`}
                        title={item.overleden ? 'Markeer als levend' : 'Markeer als overleden'}
                        aria-label={item.overleden ? 'Overleden uitzetten' : 'Overleden aanzetten'}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${item.overleden ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                      </button>
                      <span className="text-xs text-gray-400 w-14 shrink-0">{item.overleden ? 'Overleden' : ''}</span>
                      {/* Bewerken */}
                      <button
                        onClick={() => openEdit(item)}
                        className="text-gray-400 hover:text-vvz-green transition-colors"
                        title="Bewerken"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      {/* Verwijderen */}
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

      {/* Modal toevoegen/bewerken */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-5">{editing ? 'Bewerken' : 'Toevoegen'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
                <select
                  value={form.categorie}
                  onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green"
                >
                  <option value="erevoorzitter">Erevoorzitter</option>
                  <option value="erelid">Erelid</option>
                  <option value="lid_van_verdienste">Lid van verdienste</option>
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
                disabled={saving || !form.naam.trim() || !form.jaar}
                className="flex-1 bg-vvz-green text-white text-sm font-medium py-2 rounded-lg hover:bg-vvz-green/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verwijder bevestiging */}
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
    </div>
  )
}
