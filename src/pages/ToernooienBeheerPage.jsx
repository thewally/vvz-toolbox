import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  fetchTournaments,
  deleteTournament,
  publishTournament,
} from '../services/tournaments'
import { supabase } from '../lib/supabaseClient'

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}-${month}-${d.getFullYear()}`
}

export default function ToernooienBeheerPage() {
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState([])
  const [matchCounts, setMatchCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [working, setWorking] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error: fetchErr } = await fetchTournaments()
    if (fetchErr) {
      setError(fetchErr.message)
      setLoading(false)
      return
    }
    setTournaments(data ?? [])

    // Haal wedstrijdaantallen op per toernooi
    if (data && data.length > 0) {
      const ids = data.map(t => t.id)
      const { data: matchData } = await supabase
        .from('tournament_matches')
        .select('tournament_id')
        .in('tournament_id', ids)
      const counts = {}
      for (const row of matchData ?? []) {
        counts[row.tournament_id] = (counts[row.tournament_id] ?? 0) + 1
      }
      setMatchCounts(counts)
    }
    setLoading(false)
  }

  async function handlePublishToggle(t) {
    setWorking(true)
    const { error: err } = await publishTournament(t.id, !t.is_published)
    setWorking(false)
    if (err) {
      setError(err.message)
      return
    }
    await load()
  }

  async function handleDelete() {
    if (!deleteConfirm) return
    setWorking(true)
    const { error: err } = await deleteTournament(deleteConfirm.id)
    setWorking(false)
    if (err) {
      setError(err.message)
      return
    }
    setDeleteConfirm(null)
    await load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-4 pt-6">
      <Link to="/beheer" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
        &#8249; Terug naar Beheer
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Toernooien</h1>
        <button
          onClick={() => navigate('/beheer/toernooien/nieuw')}
          className="bg-vvz-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-vvz-green/90"
        >
          Nieuw toernooi
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {tournaments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-gray-500 mb-4">Er zijn nog geen toernooien aangemaakt.</p>
          <button
            onClick={() => navigate('/beheer/toernooien/nieuw')}
            className="bg-vvz-green text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-vvz-green/90"
          >
            Maak het eerste toernooi aan
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Naam</th>
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3">Wedstrijden</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tournaments.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    <Link to={`/beheer/toernooien/${t.id}`} className="text-vvz-green hover:underline">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(t.date)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                      {matchCounts[t.id] ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {t.is_published ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                        Gepubliceerd
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                        Concept
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handlePublishToggle(t)}
                        disabled={working}
                        className="text-xs border border-gray-300 text-gray-700 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        {t.is_published ? 'Depubliceren' : 'Publiceren'}
                      </button>
                      <Link
                        to={`/beheer/toernooien/${t.id}`}
                        className="text-xs border border-gray-300 text-gray-700 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50"
                      >
                        Bewerken
                      </Link>
                      <button
                        onClick={() => setDeleteConfirm(t)}
                        disabled={working}
                        className="text-xs border border-red-300 text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
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

      {deleteConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Toernooi verwijderen</h2>
            <p className="text-sm text-gray-600 mb-4">
              Weet je zeker dat je het toernooi <strong>{deleteConfirm.name}</strong> wilt verwijderen?
              Alle velden, teams, poules en wedstrijden worden permanent verwijderd.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={working}
                className="border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Annuleren
              </button>
              <button
                onClick={handleDelete}
                disabled={working}
                className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {working ? 'Bezig...' : 'Verwijderen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
