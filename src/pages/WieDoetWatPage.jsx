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
                <div key={member.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-gray-800">{member.naam}</span>
                    {member.functie && <span className="font-semibold text-gray-800 text-right shrink-0">{member.functie}</span>}
                  </div>
                  {(member.telefoonnummer || member.emailadres) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                      {member.telefoonnummer && (
                        <a href={`tel:${member.telefoonnummer}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-vvz-green transition-colors">
                          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                          </svg>
                          {member.telefoonnummer}
                        </a>
                      )}
                      {member.emailadres && (
                        <a href={`mailto:${member.emailadres}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-vvz-green transition-colors">
                          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                          </svg>
                          {member.emailadres}
                        </a>
                      )}
                    </div>
                  )}
                  {member.taken && <p className="text-xs text-gray-400 mt-1 whitespace-pre-line">{member.taken}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
