import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { AVAILABLE_ROLES } from '../services/roles'
import {
  lijstGebruikers, maakGebruiker, zetRollen, verwijderGebruiker, stuurUitnodiging,
} from '../services/gebruikersApi'
import { VINKBARE_ROLLEN, bouwRollenlijst, formatLaatsteLogin } from '../lib/gebruikersHelpers'

const rolLabel = (slug) => AVAILABLE_ROLES.find((r) => r.slug === slug)?.label ?? slug
const naamVan = (u) => u.display_name || u.email

function Schakelaar({ aan, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={aan}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ease-in-out ${aan ? 'bg-vvz-green' : 'bg-gray-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${aan ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

function Modal({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto">{children}</div>
    </div>
  )
}

export default function GebruikersBeheerAuth0() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [melding, setMelding] = useState(null) // { type: 'ok' | 'fout', tekst }
  const busy = useRef(false) // voorkomt dubbele verzoeken bij dubbelklikken
  const [bezig, setBezig] = useState(false)

  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRollen, setInviteRollen] = useState([])
  const [inviteAdmin, setInviteAdmin] = useState(false)
  const [inviteError, setInviteError] = useState(null)

  const [rolesUser, setRolesUser] = useState(null)
  const [rolesAdmin, setRolesAdmin] = useState(false)
  const [rolesChecked, setRolesChecked] = useState([])
  const [rolesError, setRolesError] = useState(null)

  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleteError, setDeleteError] = useState(null)

  const laadLijst = useCallback(async ({ stil = false } = {}) => {
    if (!stil) setLoading(true)
    setLoadError(null)
    const { data, error } = await lijstGebruikers()
    if (error) {
      setLoadError(error.message)
    } else {
      setUsers(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { laadLijst() }, [laadLijst])

  // Voert een actie uit terwijl andere acties geblokkeerd zijn: één verzoek per klik.
  async function uitvoeren(fn) {
    if (busy.current) return
    busy.current = true
    setBezig(true)
    try {
      await fn()
    } finally {
      busy.current = false
      setBezig(false)
    }
  }

  const toggle = (lijst, slug) => (lijst.includes(slug) ? lijst.filter((r) => r !== slug) : [...lijst, slug])

  function openInvite() {
    setShowInvite(true)
    setInviteError(null)
    setMelding(null)
  }

  function handleInvite(e) {
    e.preventDefault()
    uitvoeren(async () => {
      setInviteError(null)
      const email = inviteEmail.trim()
      const rollen = bouwRollenlijst({ aangevinkt: inviteRollen, admin: inviteAdmin })
      const { error } = await maakGebruiker({ email, display_name: inviteName.trim(), rollen })
      if (error) {
        setInviteError(error.message)
        return
      }
      setShowInvite(false)
      setInviteEmail('')
      setInviteName('')
      setInviteRollen([])
      setInviteAdmin(false)
      setMelding({ type: 'ok', tekst: `Uitnodiging verstuurd naar ${email}` })
      await laadLijst({ stil: true })
    })
  }

  function openRollen(u) {
    setRolesUser(u)
    setRolesAdmin((u.rollen || []).includes('admin'))
    setRolesChecked((u.rollen || []).filter((r) => VINKBARE_ROLLEN.includes(r)))
    setRolesError(null)
  }

  function handleOpslaanRollen() {
    uitvoeren(async () => {
      setRolesError(null)
      const rollen = bouwRollenlijst({ huidig: rolesUser.rollen || [], aangevinkt: rolesChecked, admin: rolesAdmin })
      const { error } = await zetRollen(rolesUser.id, rollen)
      if (error) {
        setRolesError(error.message)
        if (error.status === 404) await laadLijst({ stil: true })
        return
      }
      setUsers((huidig) => huidig.map((x) => (x.id === rolesUser.id ? { ...x, rollen } : x)))
      setRolesUser(null)
      setMelding({ type: 'ok', tekst: 'Rollen opgeslagen' })
    })
  }

  function handleOpnieuw(u) {
    uitvoeren(async () => {
      setMelding(null)
      const { error } = await stuurUitnodiging(u.id)
      setMelding(error ? { type: 'fout', tekst: error.message } : { type: 'ok', tekst: 'Uitnodiging opnieuw verstuurd' })
    })
  }

  function handleDelete() {
    uitvoeren(async () => {
      setDeleteError(null)
      const { error } = await verwijderGebruiker(deleteConfirm.id)
      if (error && error.status !== 404) {
        setDeleteError(error.message)
        return
      }
      const naam = naamVan(deleteConfirm)
      setDeleteConfirm(null)
      if (error) {
        // 404: de gebruiker bestond al niet meer, ververs de lijst
        setMelding({ type: 'fout', tekst: error.message })
        await laadLijst({ stil: true })
      } else {
        setUsers((huidig) => huidig.filter((x) => x.id !== deleteConfirm.id))
        setMelding({ type: 'ok', tekst: `${naam} is verwijderd` })
      }
    })
  }

  const eigen = (u) => u.id === user?.id

  return (
    <div className="max-w-5xl mx-auto p-4 pt-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gebruikers</h1>
        <button
          onClick={openInvite}
          className="bg-vvz-green text-white px-4 py-2 rounded-lg font-medium hover:bg-vvz-green-dark transition-colors"
        >
          Gebruiker uitnodigen
        </button>
      </div>

      {melding && (
        <div role={melding.type === 'ok' ? 'status' : 'alert'} className={`${melding.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} text-sm p-3 rounded-lg mb-4`}>
          {melding.tekst}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Laden...</p>
      ) : loadError ? (
        <div role="alert" className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
          <p>{loadError}</p>
          <button onClick={() => laadLijst()} className="mt-2 underline font-medium">Opnieuw proberen</button>
        </div>
      ) : users.length === 0 ? (
        <p className="text-gray-500">Geen gebruikers gevonden.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Naam</th>
                <th className="hidden sm:table-cell px-4 py-3 text-xs font-medium text-gray-500 uppercase">E-mail</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Rollen</th>
                <th className="hidden md:table-cell px-4 py-3 text-xs font-medium text-gray-500 uppercase">Laatste login</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => {
                const rollen = u.rollen || []
                const isAdmin = rollen.includes('admin')
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      <div>
                        {u.display_name || '-'}
                        {eigen(u) && <span className="ml-2 text-xs text-gray-400 italic">Jijzelf</span>}
                      </div>
                      <div className="sm:hidden text-xs text-gray-400 truncate max-w-[160px]">{u.email}</div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-sm">
                      {rollen.length === 0 ? (
                        <span className="text-xs text-gray-300 italic">Geen rollen</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {isAdmin && <span className="text-xs font-medium text-vvz-green bg-green-50 rounded px-1.5 py-0.5">Beheerder</span>}
                          {rollen.filter((r) => r !== 'admin').map((r) => (
                            <span key={r} className="text-xs text-gray-600 bg-gray-100 rounded px-1.5 py-0.5">{rolLabel(r)}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-500">{formatLaatsteLogin(u.laatste_login)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-3 text-sm">
                        <button
                          onClick={() => openRollen(u)}
                          disabled={bezig}
                          aria-label={`Rollen bewerken voor ${naamVan(u)}`}
                          className="text-gray-500 hover:text-vvz-green disabled:opacity-50"
                        >
                          Rollen
                        </button>
                        {!eigen(u) && (
                          <>
                            <button
                              onClick={() => handleOpnieuw(u)}
                              disabled={bezig}
                              aria-label={`Uitnodiging opnieuw sturen naar ${naamVan(u)}`}
                              className="text-gray-500 hover:text-vvz-green disabled:opacity-50"
                            >
                              Uitnodiging opnieuw sturen
                            </button>
                            <button
                              onClick={() => { setDeleteConfirm(u); setDeleteError(null) }}
                              disabled={bezig}
                              aria-label={`Verwijder ${naamVan(u)}`}
                              className="text-gray-500 hover:text-red-600 disabled:opacity-50"
                            >
                              Verwijderen
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {deleteConfirm && (
        <Modal>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Gebruiker verwijderen</h2>
          <p className="text-sm text-gray-600 mb-4">
            Weet je zeker dat je <span className="font-medium text-gray-800">{naamVan(deleteConfirm)}</span> wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
          </p>
          {deleteError && <div role="alert" className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-4">{deleteError}</div>}
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDeleteConfirm(null)} disabled={bezig} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50">Annuleren</button>
            <button onClick={handleDelete} disabled={bezig} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50">
              {bezig ? 'Bezig...' : 'Ja, verwijderen'}
            </button>
          </div>
        </Modal>
      )}

      {rolesUser && (
        <Modal>
          <h2 className="text-lg font-bold text-gray-800 mb-0.5">Rollen voor {naamVan(rolesUser)}</h2>
          <p className="text-sm text-gray-500 mb-4">{rolesUser.email}</p>
          {rolesError && <div role="alert" className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-3">{rolesError}</div>}
          <div className="divide-y divide-gray-100">
            <div className="flex items-center justify-between min-h-[44px] py-2">
              <span className="text-sm font-medium text-gray-800">
                Beheerder
                {eigen(rolesUser) && <span className="block text-xs font-normal text-gray-400">Je kunt je eigen beheerderrol niet uitzetten.</span>}
              </span>
              <Schakelaar aan={rolesAdmin} onChange={() => setRolesAdmin(!rolesAdmin)} disabled={bezig || (eigen(rolesUser) && rolesAdmin)} label="Beheerder toggle" />
            </div>
            {VINKBARE_ROLLEN.map((slug) => (
              <div key={slug} className="flex items-center justify-between min-h-[44px] py-2">
                <span className="text-sm text-gray-700">{rolLabel(slug)}</span>
                <Schakelaar aan={rolesChecked.includes(slug)} onChange={() => setRolesChecked(toggle(rolesChecked, slug))} disabled={bezig} label={`${rolLabel(slug)} toggle`} />
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-end mt-4">
            <button onClick={() => setRolesUser(null)} disabled={bezig} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50">Annuleren</button>
            <button onClick={handleOpslaanRollen} disabled={bezig} className="bg-vvz-green text-white px-4 py-2 rounded-lg font-medium hover:bg-vvz-green-dark transition-colors disabled:opacity-50">
              {bezig ? 'Bezig...' : 'Opslaan'}
            </button>
          </div>
        </Modal>
      )}

      {showInvite && (
        <Modal>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Gebruiker uitnodigen</h2>
          <form onSubmit={handleInvite} className="space-y-4">
            {inviteError && <div role="alert" className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{inviteError}</div>}
            <div>
              <label htmlFor="invite-naam" className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
              <input
                id="invite-naam"
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-vvz-green focus:border-transparent"
                placeholder="Voor- en achternaam"
              />
            </div>
            <div>
              <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-1">E-mailadres</label>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-vvz-green focus:border-transparent"
                placeholder="naam@voorbeeld.nl"
              />
            </div>
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 mb-1">Rollen</legend>
              <div className="divide-y divide-gray-100">
                <div className="flex items-center justify-between min-h-[40px] py-1">
                  <span className="text-sm font-medium text-gray-800">Beheerder</span>
                  <Schakelaar aan={inviteAdmin} onChange={() => setInviteAdmin(!inviteAdmin)} disabled={bezig} label="Beheerder toggle" />
                </div>
                {VINKBARE_ROLLEN.map((slug) => (
                  <label key={slug} className="flex items-center justify-between min-h-[40px] py-1 text-sm text-gray-700">
                    {rolLabel(slug)}
                    <input type="checkbox" checked={inviteRollen.includes(slug)} onChange={() => setInviteRollen(toggle(inviteRollen, slug))} disabled={bezig} className="h-4 w-4" />
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowInvite(false)} disabled={bezig} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50">Annuleren</button>
              <button type="submit" disabled={bezig} className="bg-vvz-green text-white px-4 py-2 rounded-lg font-medium hover:bg-vvz-green-dark transition-colors disabled:opacity-50">
                {bezig ? 'Bezig...' : 'Uitnodigen'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
