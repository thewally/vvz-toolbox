import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getAllSponsors, createSponsor, updateSponsor, deleteSponsor, generateSlug,
  getSponsorGroepen, createSponsorGroep, updateSponsorGroep, deleteSponsorGroep,
} from '../services/sponsors'
import RichTextEditor from '../components/RichTextEditor'

const LEEG_SPONSOR = {
  naam: '', groep_id: '', logo_url: '', website_url: '',
  beschrijving: '', volgorde: 0, actief: true, logo_achtergrond: '#ffffff',
}

const LEEG_GROEP = {
  naam: '', slug: '', kleur: '#6b7280', volgorde: 0,
  slider_weergave: 'geen', pagina_weergave: 'klein',
}

const WEERGAVE_OPTIES = [
  { value: 'geen',  label: 'Niet tonen' },
  { value: 'groot', label: 'Groot' },
  { value: 'klein', label: 'Klein' },
]

export default function SponsoringBeheerPage() {
  const [tab, setTab] = useState('sponsors')
  const [groepen, setGroepen] = useState([])
  const [sponsors, setSponsors] = useState([])
  const [loading, setLoading] = useState(true)

  // Sponsor modal
  const [sponsorModal, setSponsorModal] = useState(null)
  const [sponsorForm, setSponsorForm] = useState(LEEG_SPONSOR)
  const [sponsorOpslaan, setSponsorOpslaan] = useState(false)
  const [sponsorFout, setSponsorFout] = useState(null)

  // Groep modal
  const [groepModal, setGroepModal] = useState(null)
  const [groepForm, setGroepForm] = useState(LEEG_GROEP)
  const [groepOpslaan, setGroepOpslaan] = useState(false)
  const [groepFout, setGroepFout] = useState(null)

  // Drag state
  const [dragInfo, setDragInfo] = useState(null)
  const [dropIndex, setDropIndex] = useState(null)
  const [groepDragInfo, setGroepDragInfo] = useState(null)
  const [groepDropIndex, setGroepDropIndex] = useState(null)

  async function laad() {
    const [{ data: g }, { data: s }] = await Promise.all([getSponsorGroepen(), getAllSponsors()])
    setGroepen(g ?? [])
    setSponsors(s ?? [])
    setLoading(false)
  }

  useEffect(() => { laad() }, [])

  // ── Sponsors ────────────────────────────────────────────────────────────────

  function openNieuwSponsor(groepId) {
    const id = groepId ?? groepen[0]?.id ?? ''
    setSponsorForm({ ...LEEG_SPONSOR, groep_id: id })
    setSponsorFout(null)
    setSponsorModal({ mode: 'nieuw' })
  }

  function openBewerkenSponsor(s) {
    setSponsorForm({ ...s, groep_id: s.groep_id ?? s.groep?.id ?? '' })
    setSponsorFout(null)
    setSponsorModal({ mode: 'bewerken', id: s.id })
  }

  async function handleSponsorOpslaan(e) {
    e.preventDefault()
    setSponsorOpslaan(true)
    setSponsorFout(null)
    const baseSlug = sponsorForm.slug || generateSlug(sponsorForm.naam)
    const bestaandeSlugs = new Set(sponsors.filter(s => s.id !== sponsorModal?.id).map(s => s.slug))
    let slug = baseSlug
    let teller = 2
    while (bestaandeSlugs.has(slug)) slug = `${baseSlug}-${teller++}`
    // eslint-disable-next-line no-unused-vars
    const { id: _id, created_at: _cat, groep: _groep, ...rest } = sponsorForm
    const data = { ...rest, slug }

    if (sponsorModal.mode === 'bewerken') {
      const origineel = sponsors.find(s => s.id === sponsorModal.id)
      if (origineel && origineel.groep_id !== data.groep_id) {
        const maxVolgorde = sponsors
          .filter(s => s.groep_id === data.groep_id)
          .reduce((max, s) => Math.max(max, s.volgorde), -1)
        data.volgorde = maxVolgorde + 1
      }
    }

    const { error } = sponsorModal.mode === 'nieuw'
      ? await createSponsor(data)
      : await updateSponsor(sponsorModal.id, data)

    if (error) { setSponsorFout(error.message); setSponsorOpslaan(false); return }
    setSponsorModal(null)
    setSponsorOpslaan(false)
    laad()
  }

  async function handleSponsorVerwijderen(id) {
    if (!confirm('Sponsor verwijderen?')) return
    await deleteSponsor(id)
    laad()
  }

  async function handleToggleActief(s) {
    await updateSponsor(s.id, { actief: !s.actief })
    laad()
  }

  async function handleSponsorDrop(groepId, toIndex) {
    if (!dragInfo || dragInfo.fromIndex === toIndex) {
      setDragInfo(null); setDropIndex(null); return
    }
    const inGroep = sponsors
      .filter(s => s.groep_id === groepId)
      .sort((a, b) => a.volgorde - b.volgorde)
    const reordered = [...inGroep]
    const [moved] = reordered.splice(dragInfo.fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    setDragInfo(null)
    setDropIndex(null)
    await Promise.all(reordered.map((s, i) => updateSponsor(s.id, { volgorde: i })))
    laad()
  }

  // ── Groepen ─────────────────────────────────────────────────────────────────

  function openNieuwGroep() {
    const maxVolgorde = groepen.reduce((max, g) => Math.max(max, g.volgorde), -1)
    setGroepForm({ ...LEEG_GROEP, volgorde: maxVolgorde + 1 })
    setGroepFout(null)
    setGroepModal({ mode: 'nieuw' })
  }

  function openBewerkenGroep(g) {
    setGroepForm({ ...g })
    setGroepFout(null)
    setGroepModal({ mode: 'bewerken', id: g.id })
  }

  async function handleGroepOpslaan(e) {
    e.preventDefault()
    setGroepOpslaan(true)
    setGroepFout(null)
    // eslint-disable-next-line no-unused-vars
    const { id: _id, created_at: _cat, ...rest } = groepForm
    const data = { ...rest, slug: groepForm.slug || generateSlug(groepForm.naam) }

    const { error } = groepModal.mode === 'nieuw'
      ? await createSponsorGroep(data)
      : await updateSponsorGroep(groepModal.id, data)

    if (error) { setGroepFout(error.message); setGroepOpslaan(false); return }
    setGroepModal(null)
    setGroepOpslaan(false)
    laad()
  }

  async function handleGroepVerwijderen(g) {
    const inGebruik = sponsors.filter(s => s.groep_id === g.id).length
    if (inGebruik > 0) {
      alert(`Kan groep "${g.naam}" niet verwijderen: er zijn nog ${inGebruik} sponsor(s) in deze groep.`)
      return
    }
    if (!confirm(`Groep "${g.naam}" verwijderen?`)) return
    await deleteSponsorGroep(g.id)
    laad()
  }

  async function handleGroepDrop(toIndex) {
    if (groepDragInfo === null || groepDragInfo === toIndex) {
      setGroepDragInfo(null); setGroepDropIndex(null); return
    }
    const reordered = [...groepen]
    const [moved] = reordered.splice(groepDragInfo, 1)
    reordered.splice(toIndex, 0, moved)
    setGroepDragInfo(null)
    setGroepDropIndex(null)
    await Promise.all(reordered.map((g, i) => updateSponsorGroep(g.id, { volgorde: i })))
    laad()
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/beheer" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
        &#8249; Terug naar Beheer
      </Link>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Sponsoring</h2>
        {tab === 'groepen' && (
          <button
            onClick={openNieuwGroep}
            className="bg-vvz-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-vvz-green-dark transition-colors"
          >
            + Groep toevoegen
          </button>
        )}
      </div>

      {/* Tab navigatie */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[{ key: 'sponsors', label: 'Sponsors' }, { key: 'groepen', label: 'Groepen' }].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-vvz-green text-vvz-green'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Laden...</p>
      ) : tab === 'sponsors' ? (
        // ── Sponsors tab ──────────────────────────────────────────────────────
        <div className="space-y-8">
          {groepen.map(groep => {
            const lijst = sponsors
              .filter(s => s.groep_id === groep.id)
              .sort((a, b) => a.volgorde - b.volgorde)
            return (
              <div key={groep.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: groep.kleur }}
                  >
                    {groep.naam}
                  </span>
                  <span className="text-xs text-gray-400">{lijst.length} sponsor{lijst.length !== 1 ? 's' : ''}</span>
                  <button
                    onClick={() => openNieuwSponsor(groep.id)}
                    title={`Sponsor toevoegen aan ${groep.naam}`}
                    className="ml-auto text-xs font-medium text-vvz-green hover:text-vvz-green-dark flex items-center gap-0.5 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Toevoegen
                  </button>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {lijst.length === 0 ? (
                    <p className="text-center py-5 text-sm text-gray-400">Geen sponsors in deze groep.</p>
                  ) : (
                    lijst.map((s, i) => (
                      <div
                        key={s.id}
                        draggable
                        onDragStart={() => setDragInfo({ groepId: groep.id, fromIndex: i })}
                        onDragOver={e => { e.preventDefault(); setDropIndex(`${groep.id}-${i}`) }}
                        onDragLeave={() => setDropIndex(null)}
                        onDrop={() => handleSponsorDrop(groep.id, i)}
                        onDragEnd={() => { setDragInfo(null); setDropIndex(null) }}
                        className={`flex items-center gap-3 px-4 py-3 text-sm border-b border-gray-50 last:border-0 cursor-grab active:cursor-grabbing transition-all
                          ${dropIndex === `${groep.id}-${i}` && dragInfo?.fromIndex !== i ? 'border-t-2 border-vvz-green' : ''}
                          ${dragInfo?.fromIndex === i && dragInfo?.groepId === groep.id ? 'opacity-40' : 'hover:bg-gray-50'}
                        `}
                      >
                        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                        </svg>

                        {s.logo_url && (
                          <div className="w-10 h-8 flex items-center justify-center rounded shrink-0"
                            style={{ backgroundColor: s.logo_achtergrond || '#ffffff' }}>
                            <img src={s.logo_url} alt={s.naam} className="max-h-7 max-w-[36px] object-contain" />
                          </div>
                        )}

                        <span className="font-medium text-gray-800 flex-1">{s.naam}</span>

                        <button
                          onClick={() => handleToggleActief(s)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none shrink-0 ${s.actief ? 'bg-vvz-green' : 'bg-gray-300'}`}
                          aria-label={s.actief ? `${s.naam} deactiveren` : `${s.naam} activeren`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${s.actief ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                        </button>

                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => openBewerkenSponsor(s)} title="Bewerken"
                            className="p-1.5 text-gray-400 hover:text-vvz-green hover:bg-vvz-green/10 rounded-lg transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button onClick={() => handleSponsorVerwijderen(s.id)} title="Verwijderen"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
          {groepen.length === 0 && (
            <p className="text-gray-400 text-center py-8">Maak eerst een groep aan via het tabblad "Groepen".</p>
          )}
        </div>
      ) : (
        // ── Groepen tab ───────────────────────────────────────────────────────
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {groepen.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-400">Nog geen groepen aangemaakt.</p>
          ) : (
            groepen.map((g, i) => (
              <div
                key={g.id}
                draggable
                onDragStart={() => setGroepDragInfo(i)}
                onDragOver={e => { e.preventDefault(); setGroepDropIndex(i) }}
                onDragLeave={() => setGroepDropIndex(null)}
                onDrop={() => handleGroepDrop(i)}
                onDragEnd={() => { setGroepDragInfo(null); setGroepDropIndex(null) }}
                className={`flex items-center gap-3 px-4 py-3 text-sm border-b border-gray-50 last:border-0 cursor-grab active:cursor-grabbing transition-all
                  ${groepDropIndex === i && groepDragInfo !== i ? 'border-t-2 border-vvz-green' : ''}
                  ${groepDragInfo === i ? 'opacity-40' : 'hover:bg-gray-50'}
                `}
              >
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                </svg>

                {/* Kleur swatch */}
                <div className="w-5 h-5 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: g.kleur }} />

                <span className="font-medium text-gray-800 flex-1">{g.naam}</span>

                {/* Weergave badges */}
                <div className="hidden sm:flex gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="text-gray-400">Slider:</span>
                    <span className={`font-medium ${g.slider_weergave === 'geen' ? 'text-gray-400' : 'text-vvz-green'}`}>
                      {WEERGAVE_OPTIES.find(o => o.value === g.slider_weergave)?.label}
                    </span>
                  </span>
                  <span className="text-gray-200">|</span>
                  <span className="flex items-center gap-1">
                    <span className="text-gray-400">Pagina:</span>
                    <span className={`font-medium ${g.pagina_weergave === 'geen' ? 'text-gray-400' : 'text-vvz-green'}`}>
                      {WEERGAVE_OPTIES.find(o => o.value === g.pagina_weergave)?.label}
                    </span>
                  </span>
                </div>

                <span className="text-xs text-gray-400 shrink-0">
                  {sponsors.filter(s => s.groep_id === g.id).length} sponsor(s)
                </span>

                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openBewerkenGroep(g)} title="Bewerken"
                    className="p-1.5 text-gray-400 hover:text-vvz-green hover:bg-vvz-green/10 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button onClick={() => handleGroepVerwijderen(g)} title="Verwijderen"
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Sponsor modal ───────────────────────────────────────────────────── */}
      {sponsorModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">
                {sponsorModal.mode === 'nieuw' ? 'Sponsor toevoegen' : 'Sponsor bewerken'}
              </h3>
              <button onClick={() => setSponsorModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSponsorOpslaan} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
                <input required value={sponsorForm.naam}
                  onChange={e => setSponsorForm(f => ({ ...f, naam: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Groep *</label>
                <select value={sponsorForm.groep_id}
                  onChange={e => setSponsorForm(f => ({ ...f, groep_id: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green">
                  <option value="">Kies een groep...</option>
                  {groepen.map(g => (
                    <option key={g.id} value={g.id}>{g.naam}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                <input type="url" value={sponsorForm.logo_url}
                  onChange={e => setSponsorForm(f => ({ ...f, logo_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green" />
              </div>

              {sponsorForm.logo_url && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo achtergrondkleur</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={sponsorForm.logo_achtergrond || '#ffffff'}
                      onChange={e => setSponsorForm(f => ({ ...f, logo_achtergrond: e.target.value }))}
                      className="h-9 w-14 rounded border border-gray-300 cursor-pointer p-0.5" />
                    <button type="button" onClick={() => setSponsorForm(f => ({ ...f, logo_achtergrond: '#ffffff' }))}
                      className="text-xs text-gray-400 hover:text-vvz-green transition-colors">Reset naar wit</button>
                  </div>
                  <div className="mt-2 flex items-center justify-center rounded-lg p-4 border border-gray-200 h-20 w-[200px]"
                    style={{ backgroundColor: sponsorForm.logo_achtergrond || '#ffffff' }}>
                    <img src={sponsorForm.logo_url} alt="preview" className="max-h-12 max-w-[160px] w-auto object-contain" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                <input type="url" value={sponsorForm.website_url}
                  onChange={e => setSponsorForm(f => ({ ...f, website_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
                <RichTextEditor value={sponsorForm.beschrijving}
                  onChange={val => setSponsorForm(f => ({ ...f, beschrijving: val }))} />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="actief" checked={sponsorForm.actief}
                  onChange={e => setSponsorForm(f => ({ ...f, actief: e.target.checked }))}
                  className="accent-vvz-green" />
                <label htmlFor="actief" className="text-sm text-gray-700">Actief</label>
              </div>

              {sponsorFout && <p className="text-sm text-red-500">{sponsorFout}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={sponsorOpslaan}
                  className="flex-1 bg-vvz-green text-white py-2 rounded-lg text-sm font-medium hover:bg-vvz-green-dark transition-colors disabled:opacity-50">
                  {sponsorOpslaan ? 'Opslaan...' : 'Opslaan'}
                </button>
                <button type="button" onClick={() => setSponsorModal(null)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                  Annuleren
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Groep modal ─────────────────────────────────────────────────────── */}
      {groepModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">
                {groepModal.mode === 'nieuw' ? 'Groep toevoegen' : 'Groep bewerken'}
              </h3>
              <button onClick={() => setGroepModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleGroepOpslaan} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
                <input required value={groepForm.naam}
                  onChange={e => setGroepForm(f => ({ ...f, naam: e.target.value }))}
                  placeholder="bijv. Goud, Zilver, Hoofdsponsor..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kleur</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={groepForm.kleur}
                    onChange={e => setGroepForm(f => ({ ...f, kleur: e.target.value }))}
                    className="h-9 w-14 rounded border border-gray-300 cursor-pointer p-0.5" />
                  <span className="text-sm text-gray-500">{groepForm.kleur}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weergave in sponsorslider</label>
                <select value={groepForm.slider_weergave}
                  onChange={e => setGroepForm(f => ({ ...f, slider_weergave: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green">
                  {WEERGAVE_OPTIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">Groot = individueel groot logo · Klein = kleine logo's per twee</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weergave op sponsorpagina</label>
                <select value={groepForm.pagina_weergave}
                  onChange={e => setGroepForm(f => ({ ...f, pagina_weergave: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green">
                  {WEERGAVE_OPTIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">Groot = grote logokaart · Klein = kleine logokaart · Niet tonen = alleen naam</p>
              </div>

              {groepFout && <p className="text-sm text-red-500">{groepFout}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={groepOpslaan}
                  className="flex-1 bg-vvz-green text-white py-2 rounded-lg text-sm font-medium hover:bg-vvz-green-dark transition-colors disabled:opacity-50">
                  {groepOpslaan ? 'Opslaan...' : 'Opslaan'}
                </button>
                <button type="button" onClick={() => setGroepModal(null)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                  Annuleren
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
