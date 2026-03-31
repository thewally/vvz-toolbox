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
          <h2 className="text-lg font-bold text-gray-800 mb-4">{committee.name}</h2>
          {(!committee.committee_members || committee.committee_members.length === 0) ? (
            <p className="text-sm text-gray-500">Geen leden</p>
          ) : (
            <div className="space-y-3">
              {committee.committee_members.map(member => (
                <div key={member.id} className="text-sm">
                  <p className="font-medium text-gray-800">{member.name}</p>
                  <div className="flex gap-4 flex-wrap text-gray-600">
                    {member.phone && (
                      <a href={`tel:${member.phone}`} className="text-vvz-green hover:underline">{member.phone}</a>
                    )}
                    {member.email && (
                      <a href={`mailto:${member.email}`} className="text-vvz-green hover:underline">{member.email}</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
