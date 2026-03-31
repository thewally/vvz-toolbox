import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchCommittees,
  createCommittee,
  updateCommittee,
  deleteCommittee,
  createCommitteeMember,
  updateCommitteeMember,
  deleteCommitteeMember,
} from '../services/committees'

const LEEG_COMMISSIE = { name: '', sort_order: 0 }
const LEEG_LID = { name: '', phone: '', email: '', functie: '', taken: '', sort_order: 0 }

export default function WieDoetWatBeheerPage() {
  const [committees, setCommittees] = useState([])
  const [loading, setLoading] = useState(true)
  const [fout, setFout] = useState(null)

  // Commissie modal
  const [commissieModal, setCommissieModal] = useState(null) // { mode: 'nieuw'|'bewerken', id? }
  const [commissieForm, setCommissieForm] = useState(LEEG_COMMISSIE)
  const [commissieOpslaan, setCommissieOpslaan] = useState(false)

  // Lid modal
  const [lidModal, setLidModal] = useState(null) // { mode, committee_id, id? }
  const [lidForm, setLidForm] = useState(LEEG_LID)
  const [lidOpslaan, setLidOpslaan] = useState(false)

  async function laadData() {
    const { data, error } = await fetchCommittees()
    if (error) {
      setFout(error.message)
    } else {
      setCommittees(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { laadData() }, [])

  // --- Commissie CRUD ---
  function openNieuweCommissie() {
    setCommissieForm(LEEG_COMMISSIE)
    setFout(null)
    setCommissieModal({ mode: 'nieuw' })
  }

  function openBewerkCommissie(c) {
    setCommissieForm({ name: c.naam, sort_order: c.sort_order })
    setFout(null)
    setCommissieModal({ mode: 'bewerken', id: c.id })
  }

  async function handleCommissieOpslaan(e) {
    e.preventDefault()
    setCommissieOpslaan(true)
    setFout(null)
    const payload = { name: commissieForm.name, sort_order: Number(commissieForm.sort_order) || 0 }
    const { error } = commissieModal.mode === 'nieuw'
      ? await createCommittee(payload)
      : await updateCommittee(commissieModal.id, payload)
    setCommissieOpslaan(false)
    if (error) { setFout(error.message); return }
    setCommissieModal(null)
    laadData()
  }

  async function handleCommissieVerwijderen(id) {
    if (!confirm('Commissie verwijderen? Alle leden worden ook verwijderd.')) return
    const { error } = await deleteCommittee(id)
    if (error) { setFout(error.message); return }
    laadData()
  }

  // --- Lid CRUD ---
  function openNieuwLid(committeeId) {
    setLidForm(LEEG_LID)
    setFout(null)
    setLidModal({ mode: 'nieuw', committee_id: committeeId })
  }

  function openBewerkLid(member, committeeId) {
    setLidForm({ name: member.naam, phone: member.telefoonnummer || '', email: member.emailadres || '', functie: member.functie || '', taken: member.taken || '', sort_order: member.sort_order })
    setFout(null)
    setLidModal({ mode: 'bewerken', committee_id: committeeId, id: member.id })
  }

  async function handleLidOpslaan(e) {
    e.preventDefault()
    setLidOpslaan(true)
    setFout(null)
    const payload = {
      name: lidForm.name,
      phone: lidForm.phone || null,
      email: lidForm.email || null,
      functie: lidForm.functie || null,
      taken: lidForm.taken || null,
      sort_order: Number(lidForm.sort_order) || 0,
    }
    const { error } = lidModal.mode === 'nieuw'
      ? await createCommitteeMember({ ...payload, committee_id: lidModal.committee_id })
      : await updateCommitteeMember(lidModal.id, payload)
    setLidOpslaan(false)
    if (error) { setFout(error.message); return }
    setLidModal(null)
    laadData()
  }

  async function handleLidVerwijderen(id) {
    if (!confirm('Lid verwijderen?')) return
    const { error } = await deleteCommitteeMember(id)
    if (error) { setFout(error.message); return }
    laadData()
  }

  // Sluit modals met Escape-toets
  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape') {
      if (lidModal) setLidModal(null)
      else if (commissieModal) setCommissieModal(null)
    }
  }, [lidModal, commissieModal])

  useEffect(() => {
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [handleEscape])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
      <Link to="/beheer" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">&#8249; Terug naar Beheer</Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Wie doet wat? beheren</h1>
        <button
          onClick={openNieuweCommissie}
          className="bg-vvz-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-vvz-green/90 transition-colors"
        >
          + Commissie
        </button>
      </div>

      {fout && (
        <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">
          {fout}
        </div>
      )}

      {committees.length === 0 && (
        <p className="text-sm text-gray-500">Nog geen commissies aangemaakt.</p>
      )}

      <div className="space-y-4">
        {committees.map(c => (
          <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-gray-800">{c.naam}</h2>
                <span className="text-xs text-gray-400">Volgorde: {c.sort_order}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openBewerkCommissie(c)} className="text-xs text-vvz-green hover:underline">Bewerken</button>
                <button onClick={() => handleCommissieVerwijderen(c.id)} className="text-xs text-red-600 hover:underline">Verwijderen</button>
              </div>
            </div>

            {/* Leden */}
            <div className="border-t border-gray-100 pt-3 space-y-2">
              {(c.committee_members || []).map(m => (
                <div key={m.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-gray-800">{m.naam}</span>
                    {m.telefoonnummer && <span className="ml-3 text-gray-500">{m.telefoonnummer}</span>}
                    {m.emailadres && <span className="ml-3 text-gray-500 break-all">{m.emailadres}</span>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => openBewerkLid(m, c.id)} className="text-xs text-vvz-green hover:underline">Bewerken</button>
                    <button onClick={() => handleLidVerwijderen(m.id)} className="text-xs text-red-600 hover:underline">Verwijderen</button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => openNieuwLid(c.id)}
                className="text-xs text-vvz-green hover:underline mt-1"
              >
                + Lid toevoegen
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Commissie Modal */}
      {commissieModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" onClick={() => setCommissieModal(null)}>
          <form onSubmit={handleCommissieOpslaan} onClick={e => e.stopPropagation()} className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-4 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">
              {commissieModal.mode === 'nieuw' ? 'Nieuwe commissie' : 'Commissie bewerken'}
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
              <input
                type="text"
                required
                value={commissieForm.name}
                onChange={e => setCommissieForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green/50 focus:border-vvz-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sorteervolgorde</label>
              <input
                type="number"
                value={commissieForm.sort_order}
                onChange={e => setCommissieForm(f => ({ ...f, sort_order: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green/50 focus:border-vvz-green"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setCommissieModal(null)} className="text-sm text-gray-600 hover:text-gray-800">Annuleren</button>
              <button type="submit" disabled={commissieOpslaan} className="bg-vvz-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-vvz-green/90 disabled:opacity-50">
                {commissieOpslaan ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lid Modal */}
      {lidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" onClick={() => setLidModal(null)}>
          <form onSubmit={handleLidOpslaan} onClick={e => e.stopPropagation()} className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-4 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">
              {lidModal.mode === 'nieuw' ? 'Nieuw lid' : 'Lid bewerken'}
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
              <input
                type="text"
                required
                value={lidForm.name}
                onChange={e => setLidForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green/50 focus:border-vvz-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefoonnummer</label>
              <input
                type="tel"
                value={lidForm.phone}
                onChange={e => setLidForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green/50 focus:border-vvz-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mailadres</label>
              <input
                type="email"
                value={lidForm.email}
                onChange={e => setLidForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green/50 focus:border-vvz-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Functie</label>
              <input
                type="text"
                value={lidForm.functie}
                onChange={e => setLidForm(f => ({ ...f, functie: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green/50 focus:border-vvz-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Taken</label>
              <textarea
                rows={3}
                value={lidForm.taken}
                onChange={e => setLidForm(f => ({ ...f, taken: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green/50 focus:border-vvz-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sorteervolgorde</label>
              <input
                type="number"
                value={lidForm.sort_order}
                onChange={e => setLidForm(f => ({ ...f, sort_order: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green/50 focus:border-vvz-green"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setLidModal(null)} className="text-sm text-gray-600 hover:text-gray-800">Annuleren</button>
              <button type="submit" disabled={lidOpslaan} className="bg-vvz-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-vvz-green/90 disabled:opacity-50">
                {lidOpslaan ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
