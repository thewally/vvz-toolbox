import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchVolunteerGroups,
  createVolunteerGroup,
  updateVolunteerGroup,
  deleteVolunteerGroup,
  createVolunteerVacancy,
  updateVolunteerVacancy,
  deleteVolunteerVacancy,
  fetchCommitteeMembersFlat,
} from '../services/volunteers'
import RichTextEditor from '../components/RichTextEditor'

const LEEG_GROEP = { naam: '' }
const LEEG_VACATURE = {
  titel: '',
  beschrijving: '',
  contactType: 'geen', // 'member' | 'vrij' | 'geen'
  contact_member_id: '',
  contact_naam: '',
  contact_email: '',
  actief: true,
}

export default function VrijwilligersBeheerPage() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [fout, setFout] = useState(null)
  const [committeeMembers, setCommitteeMembers] = useState([])

  // Group modal
  const [groepModal, setGroepModal] = useState(null)
  const [groepForm, setGroepForm] = useState(LEEG_GROEP)
  const [groepOpslaan, setGroepOpslaan] = useState(false)

  // Vacancy modal
  const [vacatureModal, setVacatureModal] = useState(null)
  const [vacatureForm, setVacatureForm] = useState(LEEG_VACATURE)
  const [vacatureOpslaan, setVacatureOpslaan] = useState(false)

  // Drag state voor groepen
  const [dragGroup, setDragGroup] = useState(null)
  const [dropGroupTarget, setDropGroupTarget] = useState(null)

  // Drag state voor vacatures
  const [dragVacancy, setDragVacancy] = useState(null)
  const [dropVacancyTarget, setDropVacancyTarget] = useState(null)

  async function laadData() {
    const { data, error } = await fetchVolunteerGroups()
    if (error) {
      setFout(error.message)
    } else {
      setGroups(data ?? [])
    }
    setLoading(false)
  }

  async function laadCommitteeMembers() {
    const { data } = await fetchCommitteeMembersFlat()
    setCommitteeMembers(data ?? [])
  }

  useEffect(() => { laadData(); laadCommitteeMembers() }, [])

  // --- Groep CRUD ---
  function openNieuweGroep() {
    setGroepForm(LEEG_GROEP)
    setFout(null)
    setGroepModal({ mode: 'nieuw' })
  }

  function openBewerkGroep(g) {
    setGroepForm({ naam: g.naam })
    setFout(null)
    setGroepModal({ mode: 'bewerken', id: g.id })
  }

  async function handleGroepOpslaan(e) {
    e.preventDefault()
    setGroepOpslaan(true)
    setFout(null)
    const payload = { naam: groepForm.naam, sort_order: groepModal.mode === 'nieuw' ? groups.length : undefined }
    const { error } = groepModal.mode === 'nieuw'
      ? await createVolunteerGroup(payload)
      : await updateVolunteerGroup(groepModal.id, { naam: payload.naam })
    setGroepOpslaan(false)
    if (error) { setFout(error.message); return }
    setGroepModal(null)
    laadData()
  }

  async function handleGroepVerwijderen(id) {
    if (!confirm('Groep verwijderen? Alle vacatures in deze groep worden ook verwijderd.')) return
    const { error } = await deleteVolunteerGroup(id)
    if (error) { setFout(error.message); return }
    laadData()
  }

  // --- Vacature CRUD ---
  function openNieuweVacature(groupId) {
    setVacatureForm(LEEG_VACATURE)
    setFout(null)
    setVacatureModal({ mode: 'nieuw', group_id: groupId })
  }

  function openBewerkVacature(v, groupId) {
    let contactType = 'geen'
    if (v.contact_member_id) contactType = 'member'
    else if (v.contact_naam) contactType = 'vrij'
    setVacatureForm({
      titel: v.titel,
      beschrijving: v.beschrijving || '',
      contactType,
      contact_member_id: v.contact_member_id || '',
      contact_naam: v.contact_naam || '',
      contact_email: v.contact_email || '',
      actief: v.actief,
    })
    setFout(null)
    setVacatureModal({ mode: 'bewerken', group_id: groupId, id: v.id })
  }

  async function handleVacatureOpslaan(e) {
    e.preventDefault()
    setVacatureOpslaan(true)
    setFout(null)
    const group = groups.find(g => g.id === vacatureModal.group_id)
    const vacancies = group?.volunteer_vacancies || []
    const payload = {
      titel: vacatureForm.titel,
      beschrijving: vacatureForm.beschrijving || null,
      contact_member_id: vacatureForm.contactType === 'member' ? vacatureForm.contact_member_id || null : null,
      contact_naam: vacatureForm.contactType === 'vrij' ? vacatureForm.contact_naam || null : null,
      contact_email: vacatureForm.contactType === 'vrij' ? vacatureForm.contact_email || null : null,
      actief: vacatureForm.actief,
    }
    const { error } = vacatureModal.mode === 'nieuw'
      ? await createVolunteerVacancy({ ...payload, group_id: vacatureModal.group_id, sort_order: vacancies.length })
      : await updateVolunteerVacancy(vacatureModal.id, payload)
    setVacatureOpslaan(false)
    if (error) { setFout(error.message); return }
    setVacatureModal(null)
    laadData()
  }

  async function handleVacatureVerwijderen(id) {
    if (!confirm('Vacature verwijderen?')) return
    const { error } = await deleteVolunteerVacancy(id)
    if (error) { setFout(error.message); return }
    laadData()
  }

  async function handleToggleActief(v) {
    const { error } = await updateVolunteerVacancy(v.id, { actief: !v.actief })
    if (error) { setFout(error.message); return }
    laadData()
  }

  // Escape to close modals
  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape') {
      if (vacatureModal) setVacatureModal(null)
      else if (groepModal) setGroepModal(null)
    }
  }, [vacatureModal, groepModal])

  useEffect(() => {
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [handleEscape])

  // --- Drag & drop groepen ---
  function onGroupDragStart(e, index) {
    setDragGroup(index)
    e.dataTransfer.effectAllowed = 'move'
  }
  function onGroupDragOver(e, index) {
    e.preventDefault()
    setDropGroupTarget(index)
  }
  function onGroupDragLeave() {
    setDropGroupTarget(null)
  }
  async function onGroupDrop(e, toIndex) {
    e.preventDefault()
    setDropGroupTarget(null)
    if (dragGroup === null || dragGroup === toIndex) return
    const reordered = [...groups]
    const [moved] = reordered.splice(dragGroup, 1)
    reordered.splice(toIndex, 0, moved)
    setGroups(reordered)
    for (let i = 0; i < reordered.length; i++) {
      await updateVolunteerGroup(reordered[i].id, { sort_order: i })
    }
    setDragGroup(null)
  }
  function onGroupDragEnd() {
    setDragGroup(null)
    setDropGroupTarget(null)
  }

  // --- Drag & drop vacatures ---
  function onVacancyDragStart(e, groupId, index) {
    setDragVacancy({ groupId, index })
    e.dataTransfer.effectAllowed = 'move'
  }
  function onVacancyDragOver(e, groupId, index) {
    e.preventDefault()
    if (dragVacancy && dragVacancy.groupId === groupId) {
      setDropVacancyTarget(`${groupId}-${index}`)
    }
  }
  function onVacancyDragLeave() {
    setDropVacancyTarget(null)
  }
  async function onVacancyDrop(e, groupId, toIndex) {
    e.preventDefault()
    setDropVacancyTarget(null)
    if (!dragVacancy || dragVacancy.groupId !== groupId || dragVacancy.index === toIndex) return
    const group = groups.find(g => g.id === groupId)
    const vacancies = [...(group.volunteer_vacancies || [])]
    const [moved] = vacancies.splice(dragVacancy.index, 1)
    vacancies.splice(toIndex, 0, moved)
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, volunteer_vacancies: vacancies } : g))
    for (let i = 0; i < vacancies.length; i++) {
      await updateVolunteerVacancy(vacancies[i].id, { sort_order: i })
    }
    setDragVacancy(null)
  }
  function onVacancyDragEnd() {
    setDragVacancy(null)
    setDropVacancyTarget(null)
  }

  const DragHandle = () => (
    <svg className="w-4 h-4 text-gray-300 cursor-grab" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" /></svg>
  )

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
        <h1 className="text-xl font-bold text-gray-800">Vrijwilligersvacatures beheren</h1>
        <button
          onClick={openNieuweGroep}
          className="bg-vvz-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-vvz-green/90 transition-colors"
        >
          + Groep toevoegen
        </button>
      </div>

      {fout && (
        <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">
          {fout}
        </div>
      )}

      {groups.length === 0 && (
        <p className="text-sm text-gray-500">Nog geen groepen aangemaakt.</p>
      )}

      <div className="space-y-4">
        {groups.map((g, gi) => (
          <div
            key={g.id}
            draggable
            onDragStart={e => onGroupDragStart(e, gi)}
            onDragOver={e => onGroupDragOver(e, gi)}
            onDragLeave={onGroupDragLeave}
            onDrop={e => onGroupDrop(e, gi)}
            onDragEnd={onGroupDragEnd}
            className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 transition-all ${
              dropGroupTarget === gi && dragGroup !== gi ? 'border-t-2 border-vvz-green' : ''
            } ${dragGroup === gi ? 'opacity-40' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <DragHandle />
                <h2 className="text-base font-semibold text-gray-800">{g.naam}</h2>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openBewerkGroep(g)} className="p-1.5 text-gray-400 hover:text-vvz-green hover:bg-vvz-green/10 rounded-lg transition-colors" title="Bewerken" aria-label={`${g.naam} bewerken`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button onClick={() => handleGroepVerwijderen(g.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Verwijderen" aria-label={`${g.naam} verwijderen`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>

            {/* Vacatures */}
            <div className="border-t border-gray-100 pt-3 space-y-1">
              {(g.volunteer_vacancies || []).map((v, vi) => (
                <div
                  key={v.id}
                  draggable
                  onDragStart={e => { e.stopPropagation(); onVacancyDragStart(e, g.id, vi) }}
                  onDragOver={e => { e.stopPropagation(); onVacancyDragOver(e, g.id, vi) }}
                  onDragLeave={onVacancyDragLeave}
                  onDrop={e => { e.stopPropagation(); onVacancyDrop(e, g.id, vi) }}
                  onDragEnd={onVacancyDragEnd}
                  className={`flex items-center justify-between gap-2 py-1.5 text-sm rounded transition-all ${
                    dropVacancyTarget === `${g.id}-${vi}` && dragVacancy?.index !== vi ? 'border-t-2 border-vvz-green' : ''
                  } ${dragVacancy?.groupId === g.id && dragVacancy?.index === vi ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <DragHandle />
                    <span className="font-semibold text-gray-800 truncate">{v.titel}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${v.actief ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.actief ? 'Actief' : 'Inactief'}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleToggleActief(v)} className="p-1.5 text-gray-400 hover:text-vvz-green hover:bg-vvz-green/10 rounded-lg transition-colors" title={v.actief ? 'Deactiveren' : 'Activeren'}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {v.actief
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          : <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        }
                      </svg>
                    </button>
                    <button onClick={() => openBewerkVacature(v, g.id)} className="p-1.5 text-gray-400 hover:text-vvz-green hover:bg-vvz-green/10 rounded-lg transition-colors" title="Bewerken">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => handleVacatureVerwijderen(v.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Verwijderen">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => openNieuweVacature(g.id)} className="text-xs text-vvz-green hover:underline mt-1">
                + Vacature toevoegen
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Groep Modal */}
      {groepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" onClick={() => setGroepModal(null)}>
          <form onSubmit={handleGroepOpslaan} onClick={e => e.stopPropagation()} className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-4 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">
              {groepModal.mode === 'nieuw' ? 'Nieuwe groep' : 'Groep bewerken'}
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
              <input
                type="text"
                required
                value={groepForm.naam}
                onChange={e => setGroepForm(f => ({ ...f, naam: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green/50 focus:border-vvz-green"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setGroepModal(null)} className="text-sm text-gray-600 hover:text-gray-800">Annuleren</button>
              <button type="submit" disabled={groepOpslaan} className="bg-vvz-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-vvz-green/90 disabled:opacity-50">
                {groepOpslaan ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vacature Modal */}
      {vacatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" onClick={() => setVacatureModal(null)}>
          <form onSubmit={handleVacatureOpslaan} onClick={e => e.stopPropagation()} className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800">
              {vacatureModal.mode === 'nieuw' ? 'Nieuwe vacature' : 'Vacature bewerken'}
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
              <input
                type="text"
                required
                value={vacatureForm.titel}
                onChange={e => setVacatureForm(f => ({ ...f, titel: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green/50 focus:border-vvz-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
              <RichTextEditor value={vacatureForm.beschrijving} onChange={val => setVacatureForm(f => ({ ...f, beschrijving: val }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contactpersoon</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="contactType" value="member" checked={vacatureForm.contactType === 'member'} onChange={() => setVacatureForm(f => ({ ...f, contactType: 'member' }))} />
                  Uit Wie doet wat
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="contactType" value="vrij" checked={vacatureForm.contactType === 'vrij'} onChange={() => setVacatureForm(f => ({ ...f, contactType: 'vrij' }))} />
                  Vrij invoeren
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="contactType" value="geen" checked={vacatureForm.contactType === 'geen'} onChange={() => setVacatureForm(f => ({ ...f, contactType: 'geen' }))} />
                  Geen
                </label>
              </div>
              {vacatureForm.contactType === 'member' && (
                <select
                  value={vacatureForm.contact_member_id}
                  onChange={e => setVacatureForm(f => ({ ...f, contact_member_id: e.target.value }))}
                  className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green/50 focus:border-vvz-green"
                >
                  <option value="">-- Selecteer --</option>
                  {committeeMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.naam}{m.emailadres ? ` (${m.emailadres})` : ''}</option>
                  ))}
                </select>
              )}
              {vacatureForm.contactType === 'vrij' && (
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    placeholder="Naam"
                    value={vacatureForm.contact_naam}
                    onChange={e => setVacatureForm(f => ({ ...f, contact_naam: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green/50 focus:border-vvz-green"
                  />
                  <input
                    type="email"
                    placeholder="E-mailadres"
                    value={vacatureForm.contact_email}
                    onChange={e => setVacatureForm(f => ({ ...f, contact_email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green/50 focus:border-vvz-green"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="actief"
                checked={vacatureForm.actief}
                onChange={e => setVacatureForm(f => ({ ...f, actief: e.target.checked }))}
                className="rounded border-gray-300 text-vvz-green focus:ring-vvz-green"
              />
              <label htmlFor="actief" className="text-sm text-gray-700">Actief (zichtbaar op publieke pagina)</label>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setVacatureModal(null)} className="text-sm text-gray-600 hover:text-gray-800">Annuleren</button>
              <button type="submit" disabled={vacatureOpslaan} className="bg-vvz-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-vvz-green/90 disabled:opacity-50">
                {vacatureOpslaan ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
