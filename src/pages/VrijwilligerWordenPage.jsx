import { useState, useEffect } from 'react'
import DOMPurify from 'dompurify'
import { fetchVolunteerGroups } from '../services/volunteers'

export default function VrijwilligerWordenPage() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [fout, setFout] = useState(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await fetchVolunteerGroups()
      if (error) {
        setFout(error.message)
      } else {
        // Filter: only groups with at least one active vacancy
        const filtered = (data ?? [])
          .map(g => ({
            ...g,
            volunteer_vacancies: (g.volunteer_vacancies || []).filter(v => v.actief),
          }))
          .filter(g => g.volunteer_vacancies.length > 0)
        setGroups(filtered)
      }
      setLoading(false)
    }
    load()
  }, [])

  function getContactInfo(v) {
    // Prefer linked committee member, fall back to free-form fields
    if (v.committee_members) {
      return { naam: v.committee_members.naam, email: v.committee_members.emailadres }
    }
    const naam = v.contact_naam
    const email = v.contact_email
    if (!naam && !email) return null
    return { naam, email }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
      </div>
    )
  }

  if (fout) {
    return (
      <div className="max-w-3xl mx-auto p-4 pt-6">
        <div className="p-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">{fout}</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Vrijwilliger worden?</h1>
      <p className="text-gray-600 mb-8">
        VVZ'49 draait op vrijwilligers! Bekijk hieronder de openstaande vacatures en neem contact op als je wilt helpen.
      </p>

      {groups.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Er zijn momenteel geen vacatures.</p>
        </div>
      )}

      {groups.map(g => (
        <div key={g.id} className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{g.naam}</h2>
          <div className="grid gap-4">
            {g.volunteer_vacancies.map(v => {
              const contact = getContactInfo(v)
              return (
                <div key={v.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{v.titel}</h3>
                  {v.beschrijving && (
                    <div
                      className="text-sm text-gray-600 leading-relaxed mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_a]:text-vvz-green [&_a]:underline"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(v.beschrijving) }}
                    />
                  )}
                  {contact && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      <span>
                        {contact.naam}
                        {contact.email && (
                          <> &mdash; <a href={`mailto:${contact.email}`} className="text-vvz-green hover:underline">{contact.email}</a></>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
