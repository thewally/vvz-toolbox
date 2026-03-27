import { useEffect, useState } from 'react'
import { getAllSponsors, createSponsor, updateSponsor, deleteSponsor, generateSlug } from '../services/sponsors'

const LEEG = {
  naam: '', categorie: 'goud', logo_url: '', website_url: '',
  beschrijving: '', volgorde: 0, actief: true, logo_achtergrond: '',
}

export default function SponsoringBeheerPage() {
  const [sponsors, setSponsors] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | { mode: 'nieuw'|'bewerken', data }
  const [form, setForm] = useState(LEEG)
  const [opslaan, setOpslaan] = useState(false)
  const [fout, setFout] = useState(null)

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
    const data = { ...form, slug }
    const { error } = modal.mode === 'nieuw'
      ? await createSponsor(data)
      : await updateSponsor(modal.id, data)
    if (error) { setFout(error.message); setOpslaan(false); return }
    setModal(null)
    setOpslaan(false)
    laadSponsors()
  }

  async function handleVerwijderen(id) {
    if (!confirm('Sponsor verwijderen?')) return
    await deleteSponsor(id)
    laadSponsors()
  }

  const BADGE = {
    goud: 'bg-yellow-100 text-yellow-800',
    zilver: 'bg-gray-100 text-gray-700',
    brons: 'bg-orange-100 text-orange-800',
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Sponsors beheren</h2>
        <button onClick={openNieuw} className="bg-vvz-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-vvz-green-dark transition-colors">
          + Sponsor toevoegen
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Laden...</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Naam</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Categorie</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Volgorde</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Actief</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sponsors.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{s.naam}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE[s.categorie]}`}>
                      {s.categorie.charAt(0).toUpperCase() + s.categorie.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.volgorde}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.actief ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {s.actief ? 'Ja' : 'Nee'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right flex gap-2 justify-end">
                    <button onClick={() => openBewerken(s)} className="text-xs text-gray-500 hover:text-vvz-green transition-colors">Bewerken</button>
                    <button onClick={() => handleVerwijderen(s.id)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Verwijderen</button>
                  </td>
                </tr>
              ))}
              {sponsors.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nog geen sponsors.</td></tr>
              )}
            </tbody>
          </table>
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
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                <input type="url" value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
                  placeholder="https://..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo achtergrondkleur</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.logo_achtergrond || '#ffffff'}
                    onChange={e => setForm(f => ({ ...f, logo_achtergrond: e.target.value }))}
                    className="h-9 w-14 rounded border border-gray-300 cursor-pointer p-0.5"
                  />
                  <span className="text-xs text-gray-400">Laat leeg voor transparant</span>
                  {form.logo_achtergrond && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, logo_achtergrond: '' }))}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors">Wissen</button>
                  )}
                </div>
                {form.logo_url && (
                  <div className="mt-2 inline-flex items-center justify-center rounded-lg p-2 border border-gray-200"
                    style={{ backgroundColor: form.logo_achtergrond || 'transparent' }}>
                    <img src={form.logo_url} alt="preview" className="h-10 object-contain" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                <input type="url" value={form.website_url} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))}
                  placeholder="https://..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green" />
              </div>
              {form.categorie === 'goud' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschrijving</label>
                  <textarea value={form.beschrijving} onChange={e => setForm(f => ({ ...f, beschrijving: e.target.value }))}
                    rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green" />
                </div>
              )}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Volgorde</label>
                  <input type="number" value={form.volgorde} onChange={e => setForm(f => ({ ...f, volgorde: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vvz-green" />
                </div>
                <div className="flex items-end pb-2 gap-2">
                  <input type="checkbox" id="actief" checked={form.actief} onChange={e => setForm(f => ({ ...f, actief: e.target.checked }))}
                    className="accent-vvz-green" />
                  <label htmlFor="actief" className="text-sm text-gray-700">Actief</label>
                </div>
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
