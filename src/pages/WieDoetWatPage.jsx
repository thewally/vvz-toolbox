import { useState, useEffect } from 'react'
import { fetchCommittees } from '../services/committees'

export default function WieDoetWatPage() {
  const [committees, setCommittees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await fetchCommittees()
      if (error) {
        setError(error.message)
      } else {
        setCommittees(data ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg">
          Kan gegevens niet laden.
        </div>
      </div>
    )
  }

  if (committees.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-4 pt-6">
        <div className="bg-gray-50 border border-gray-200 text-gray-600 text-sm p-4 rounded-lg">
          Geen commissies beschikbaar.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6 space-y-6">
      {committees.map(committee => (
        <div key={committee.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">{committee.naam}</h2>
          {(!committee.committee_members || committee.committee_members.length === 0) ? (
            <p className="text-sm text-gray-500">Geen leden</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {committee.committee_members.map(member => (
                <div key={member.id} className="py-3 first:pt-0 last:pb-0 text-sm">
                  <p className="text-gray-800">
                    {member.functie && <span className="font-medium">{member.functie}</span>}
                    {member.functie && member.naam && <span className="text-gray-400 mx-1.5">–</span>}
                    <span className={member.functie ? 'text-gray-700' : 'font-medium text-gray-800'}>{member.naam}</span>
                  </p>
                  {(member.telefoonnummer || member.emailadres) && (
                    <div className="flex gap-4 flex-wrap mt-0.5">
                      {member.telefoonnummer && (
                        <a href={`tel:${member.telefoonnummer}`} className="text-vvz-green hover:underline">{member.telefoonnummer}</a>
                      )}
                      {member.emailadres && (
                        <a href={`mailto:${member.emailadres}`} className="text-vvz-green hover:underline">{member.emailadres}</a>
                      )}
                    </div>
                  )}
                  {member.taken && <p className="text-gray-500 text-xs mt-1 whitespace-pre-line">{member.taken}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
