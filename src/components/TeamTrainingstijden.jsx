import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { slugNaarTeamNaam } from '../services/wedstrijdenHelpers'
import { DAYS } from '../lib/constants'

export default function TeamTrainingstijden({ teamSlug }) {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function laden() {
      const teamNaam = slugNaarTeamNaam(teamSlug)
      if (!teamNaam) {
        setLoading(false)
        return
      }

      // Zoek team ID
      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('name', teamNaam)
        .limit(1)

      if (!teams || teams.length === 0) {
        setLoading(false)
        return
      }

      const teamId = teams[0].id

      // Zoek training slots via junction tabel
      const { data: slotTeams } = await supabase
        .from('training_slot_teams')
        .select(`
          training_slot_id,
          training_slots(
            id, day, start_time, end_time,
            training_slot_fields(fields(name))
          )
        `)
        .eq('team_id', teamId)

      if (slotTeams) {
        const result = slotTeams
          .map(st => st.training_slots)
          .filter(Boolean)
          .map(slot => ({
            day: slot.day,
            start_time: slot.start_time?.slice(0, 5),
            end_time: slot.end_time?.slice(0, 5),
            field: (slot.training_slot_fields || [])
              .map(f => f.fields?.name)
              .filter(Boolean)
              .join(', '),
          }))
        setSlots(result)
      }
      setLoading(false)
    }
    laden()
  }, [teamSlug])

  if (loading) return null
  if (slots.length === 0) return <p className="text-sm text-gray-500">Geen trainingstijden gevonden</p>

  return (
    <div className="space-y-2">
      {slots.map((slot, i) => {
        const dag = DAYS.find(d => d.value === slot.day)
        return (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span className="font-medium w-24">{dag?.label || `Dag ${slot.day}`}</span>
            <span className="text-gray-600">{slot.start_time} - {slot.end_time}</span>
            {slot.field && <span className="text-gray-400">{slot.field}</span>}
          </div>
        )
      })}
    </div>
  )
}
