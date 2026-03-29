import { useEffect, useState } from 'react'
import { getAllSponsors, createSponsor, updateSponsor, deleteSponsor, generateSlug } from '../services/sponsors'
import RichTextEditor from '../components/RichTextEditor'

const LEEG = {
  naam: '', categorie: 'goud', logo_url: '', website_url: '',
  beschrijving: '', volgorde: 0, actief: true, logo_achtergrond: '#ffffff',
}

const CATEGORIEEN = ['goud', 'zilver', 'brons', 'jeugdplan']
const BADGE = {
  goud: 'bg-yellow-100 text-yellow-800',
  zilver: 'bg-gray-100 text-gray-700',
  brons: 'bg-orange-100 text-orange-800',
  jeugdplan: 'bg-green-100 text-green-800',
}
const LABEL = { goud: 'Goud', zilver: 'Zilver', brons: 'Brons', jeugdplan: 'Jeugdplan' }

export default function SponsoringBeheerPage() {
  const [sponsors, setSponsors] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(LEEG)
  const [opslaan, setOpslaan] = useState(false)
  const [fout, setFout] = useState(null)
  const [dragInfo, setDragInfo] = useState(null) // { categorie, fromIndex }
  const [dropIndex, setDropIndex] = useState(null)

  async function laadSponsors() {
    const { data } = await getAllSponsors()
    setSponsors(data ?? [])
    setLoading(false)
  }

  useEffect(() => { laadSponsors() }, [])

  function openNieuw() {
    setForm(LEEG)
    setFout(null)
    setModal({ mode: 'nieuw' })
  }

  function openBewerken(s) {
    setForm({ ...s })
    setFout(null)
    setModal({ mode: 'bewerken', id: s.id })
  }

  async function handleOpslaan(e) {
    e.preventDefault()
    setOpslaan(true)
    setFout(null)
    const slug = form.slug || generateSlug(form.naam)
    // eslint-disable-next-line no-unused-vars
    const { id: _id, created_at: _cat, ...rest } = form
    const data = { ...rest, slug }
    if (['brons', 'jeugdplan'].includes(data.categorie)) { data.logo_url = null; data.logo_achtergrond = null }
    // Bij categoriewijziging: sponsor onderaan de nieuwe categorie plaatsen
    if (modal.mode === 'bewerken') {
      const origineel = sponsors.find(s => s.id === modal.id)
      if (origineel && origineel.categorie !== data.categorie) {
        const maxVolgorde = sponsors
          .filter(s => s.categorie === data.categorie)
          .reduce((max, s) => Math.max(max, s.volgorde), -1)
        data.volgorde = maxVolgorde + 1
      }
    }
    const { error } = modal.mode === 'nieuw'
      ? await createSponsor(data)
      : await updateSponsor(modal.id, data)
    if (error) { setFout(error.message); setOpslaan(false); return }
    setModal(null)
    setOpslaan(false)
    window.location.reload()
  }

  async function handleVerwijderen(id) {
    if (!confirm('Sponsor verwijderen?')) return
    await deleteSponsor(id)
    window.location.reload()
  }

  async function handleDrop(categorie, toIndex) {
    if (!dragInfo || dragInfo.fromIndex === toIndex) {
      setDragInfo(null); setDropIndex(null); return
    }
    const inCategorie = sponsors
      .filter(s => s.categorie === categorie)
      .sort((a, b) => a.volgorde - b.volgorde)
    const reordered = [...inCategorie]
    const [moved] = reordered.splice(dragInfo.fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    setDragInfo(null)
    setDropIndex(null)
    await Promise.all(reordered.map((s, i) => updateSponsor(s.id, { volgorde: i })))
    laadSponsors()
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold text-gray-800">Sponsors beheren</h2>
        <button onClick={openNieuw} className="bg-vvz-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-vvz-green-dark transition-colors">
          + Sponsor toevoegen
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Laden...</p>
      ) : (
        <div className="space-y-8">
          {CATEGORIEEN.map(cat => {
            const lijst = sponsors
              .filter(s => s.categorie === cat)
              .sort((a, b) => a.volgorde - b.volgorde)
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE[cat]}`}>{LABEL[cat]}</span>
                  <span className="text-xs text-gray-400">{lijst.length} sponsor{lijst.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {lijst.length === 0 ? (
                    <p className="text-center py-5 text-sm text-gray-400">Geen sponsors in deze categorie.</p>
                  ) : (
                    lijst.map((s, i) => (
                      <div
                        key={s.id}
                        draggable
                        onDragStart={() => setDragInfo({ categorie: cat, fromIndex: i })}
                        onDragOver={e => { e.preventDefault(); setDropIndex(`${cat}-${i}`) }}
                        onDragLeave={() => setDropIndex(null)}
                        onDrop={() => handleDrop(cat, i)}
                        onDragEnd={() => { setDragInfo(null); setDropIndex(null) }}
                        className={`flex items-center gap-3 px-4 py-3 text-sm border-b border-gray-50 last:border-0 cursor-grab active:cursor-grabbing transition-all
                          ${dropIndex === `${cat}-${i}` && dragInfo?.fromIndex !== i ? 'border-t-2 border-vvz-green' : ''}
                          ${dragInfo?.fromIndex === i && dragInfo?.categorie === cat ? 'opacity-40' : 'hover:bg-gray-50'}
                        `}
                      >
                        {/* Sleepgreep */}
                        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                        </svg>

                        {/* Logo preview */}
                        {s.logo_url ? (
                          <div className="w-10 h-8 flex items-center justify-center rounded shrink-0"
                            style={{ backgroundColor: s.logo_achtergrond || '#ffffff' }}>
                            <img src={s.logo_url} alt={s.naam} className="max-h-7 max-w-[36px] object-contain" />
                          </div>
                        ) : !['brons', 'jeugdplan'].includes(s.categorie) ? (
                          <div className="w-10 h-8 bg-gray-100 rounded shrink-0" />
                        ) : null}

                        <span className="font-medium text-gray-800 flex-1">{s.naam}</span>

                        <span className={`text-xs px-2 py-0.5 rounded-full ${s.actief ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {s.actief ? 'Actief' : 'Inactief'}
                        </span>

                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => openBewerken(s)} title="Wijzigen" className="p-1.5 rounded-full text-gray-500 hover:text-vvz-green hover:bg-gray-100 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                          </button>
                          <button onClick={() => handleVerwijderen(s.id)} title="Verwijderen" className="p-1.5 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
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
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{modal.mode === 'nieuw' ? 'Sponsor toevoegen' : 'Sponsor bewerken'}</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleOpslaan} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
                <input required value={form.naam} onChange={e => setForm(f => ({ ...f, naam: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categorie *</label>
                <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green">
                  <option value="goud">Goud</option>
                  <option value="zilver">Zilver</option>
                  <option value="brons">Brons</option>
                  <option value="jeugdplan">Jeugdplan</option>
                </select>
              </div>
              {!['brons', 'jeugdplan'].includes(form.categorie) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                    <input type="url" value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
                      placeholder="https://..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo achtergrondkleur</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={form.logo_achtergrond || '#ffffff'}
                        onChange={e => setForm(f => ({ ...f, logo_achtergrond: e.target.value }))}
                        className="h-9 w-14 rounded border border-gray-300 cursor-pointer p-0.5" />
                      <button type="button" onClick={() => setForm(f => ({ ...f, logo_achtergrond: '#ffffff' }))}
                        className="text-xs text-gray-400 hover:text-vvz-green transition-colors">Reset naar wit</button>
                    </div>
                    {form.logo_url && (
                      <div className="mt-2 flex items-center justify-center rounded-lg p-4 border border-gray-200 h-20 w-[200px]"
                        style={{ backgroundColor: form.logo_achtergrond || '#ffffff' }}>
                        <img src={form.logo_url} alt="preview" className="max-h-12 max-w-[160px] w-auto object-contain" />
                      </div>
                    )}
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                <input type="url" value={form.website_url} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))}
                  placeholder="https://..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green" />
              </div>
              {form.categorie === 'goud' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
                  <RichTextEditor value={form.beschrijving} onChange={val => setForm(f => ({ ...f, beschrijving: val }))} />
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="actief" checked={form.actief} onChange={e => setForm(f => ({ ...f, actief: e.target.checked }))}
                  className="accent-vvz-green" />
                <label htmlFor="actief" className="text-sm text-gray-700">Actief</label>
              </div>
              {fout && <p className="text-sm text-red-500">{fout}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={opslaan}
                  className="flex-1 bg-vvz-green text-white py-2 rounded-lg text-sm font-medium hover:bg-vvz-green-dark transition-colors disabled:opacity-50">
                  {opslaan ? 'Opslaan...' : 'Opslaan'}
                </button>
                <button type="button" onClick={() => setModal(null)}
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
