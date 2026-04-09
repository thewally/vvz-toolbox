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
    if (v.committee_members) {
      return { naam: v.committee_members.naam, email: v.committee_members.emailadres, telefoon: v.committee_members.telefoonnummer }
    }
    const naam = v.contact_naam
    const email = v.contact_email
    const telefoon = v.contact_telefoon
    if (!naam && !email && !telefoon) return null
    return { naam, email, telefoon }
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
                    <div className="flex flex-col gap-1 mt-3 text-sm text-gray-500">
                      {contact.naam && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                          </svg>
                          <span>{contact.naam}</span>
                        </div>
                      )}
                      {contact.email && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                          </svg>
                          <a href={`mailto:${contact.email}`} className="text-vvz-green hover:underline">{contact.email}</a>
                        </div>
                      )}
                      {contact.telefoon && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                          </svg>
                          <a href={`tel:${contact.telefoon}`} className="text-vvz-green hover:underline">{contact.telefoon}</a>
                        </div>
                      )}
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
