export default function AgendaAbonneerKnop({ teamcode }) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const httpsUrl = `${supabaseUrl}/functions/v1/team-ical?teamcode=${teamcode}`
  const webcalUrl = httpsUrl.replace('https://', 'webcal://')
  const googleUrl = `https://www.google.com/calendar/render?cid=${encodeURIComponent(httpsUrl)}`

  const calendarIcon = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )

  return (
    <div className="flex flex-wrap gap-2">
      {/* iOS / macOS / Outlook: webcal */}
      <a
        href={webcalUrl}
        className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {calendarIcon}
        Apple / Outlook
      </a>

      {/* Android: Google Agenda */}
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {calendarIcon}
        Google Agenda
      </a>

      {/* Fallback: download */}
      <a
        href={httpsUrl}
        download
        className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        Download .ics
      </a>
    </div>
  )
}
