import { useState } from 'react'

export default function AgendaAbonneerKnop({ teamcode }) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const httpsUrl = `${supabaseUrl}/functions/v1/team-ical?teamcode=${teamcode}`
  const webcalUrl = httpsUrl.replace('https://', 'webcal://')

  const [gekopieerd, setGekopieerd] = useState(false)
  const [toonInstructie, setToonInstructie] = useState(false)

  async function kopieerUrl() {
    await navigator.clipboard.writeText(httpsUrl)
    setGekopieerd(true)
    setToonInstructie(true)
    setTimeout(() => setGekopieerd(false), 2000)
  }

  const calendarIcon = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )

  const copyIcon = gekopieerd ? (
    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )

  const downloadIcon = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )

  const btnClass = 'inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors'

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <a href={webcalUrl} className={btnClass}>
          {calendarIcon}
          Apple / Outlook
        </a>

        <button onClick={kopieerUrl} className={btnClass}>
          {copyIcon}
          {gekopieerd ? 'Gekopieerd!' : 'Google Agenda'}
        </button>

        <a href={httpsUrl} download className={btnClass}>
          {downloadIcon}
          Download .ics
        </a>
      </div>

      {toonInstructie && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          URL gekopieerd. Open je browser en ga naar{' '}
          <span className="font-medium text-gray-700 select-all">calendar.google.com</span>
          {' '}→ Instellingen → <strong>Agenda via URL toevoegen</strong>, plak de URL en klik op <strong>Agenda toevoegen</strong>.
        </p>
      )}
    </div>
  )
}
