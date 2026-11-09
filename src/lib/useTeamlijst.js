import { useCallback, useEffect, useState } from 'react'
import { getTeamsGecachet, peekTeams, abonneerOpTeams } from '../services/teamlijstcache'

// Teamlijst uit de gedeelde cache. Start direct met gecachete data (ook verouderd) en
// werkt bij wanneer een verversing op de achtergrond nieuwe data oplevert.
export default function useTeamlijst() {
  const [teams, setTeams] = useState(() => peekTeams())
  const [loading, setLoading] = useState(() => peekTeams() === null)
  const [error, setError] = useState(null)

  const laad = useCallback(async () => {
    setError(null)
    if (peekTeams() === null) setLoading(true)
    const { data, error: err } = await getTeamsGecachet()
    if (err) {
      setError(err.message || String(err))
    } else {
      setTeams(data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let actief = true
    laad()
    const stop = abonneerOpTeams((data) => { if (actief) setTeams(data) })
    return () => { actief = false; stop() }
  }, [laad])

  return { teams: teams ?? [], loading, error, opnieuw: laad }
}
