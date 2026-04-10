const SPORTLINK_BASE = 'https://data.sportlink.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Amsterdam',
  'BEGIN:STANDARD',
  'DTSTART:19701025T030000',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10',
  'END:STANDARD',
  'BEGIN:DAYLIGHT',
  'DTSTART:19700329T020000',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3',
  'END:DAYLIGHT',
  'END:VTIMEZONE',
].join('\r\n')

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function formatICalDate(dateStr: string, timeStr?: string) {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number)
  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number)
    return `${year}${pad(month)}${pad(day)}T${pad(h)}${pad(m)}00`
  }
  return `${year}${pad(month)}${pad(day)}`
}

function escapeIcal(str: string) {
  return (str || '').replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')
}

function addMinutes(dateStr: string, timeStr: string, minutes: number) {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number)
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m + minutes
  const newH = Math.floor(total / 60) % 24
  const newM = total % 60
  return `${year}${pad(month)}${pad(day)}T${pad(newH)}${pad(newM)}00`
}

function getWedstrijdDuur(teamNaam: string): number {
  const naam = teamNaam.toLowerCase()
  // 7x7 (altijd 20 minuten)
  if (/7\s*x\s*7/.test(naam)) return 20
  // Senioren / veteranen 11x11
  if (/veteran|vet\.|selectie|derde|zesde|30\+|35\+|45\+/.test(naam) || /vvz\s*'?49\s+\d/.test(naam)) return 105
  // Jeugd o.b.v. leeftijdscategorie
  const match = naam.match(/[jmo]o\s*(\d+)/)
  if (match) {
    const cat = parseInt(match[1], 10)
    if (cat <= 7)  return 55
    if (cat <= 9)  return 65
    if (cat <= 13) return 75
    if (cat <= 15) return 85
    if (cat <= 17) return 95
    return 105
  }
  return 105
}

function generateIcal(wedstrijden: any[], teamNaam: string, teamcode: string) {
  const dtstamp = formatICalDate(new Date().toISOString().slice(0, 10), '00:00')
  const teamUrl = `https://thewally.github.io/vvz-toolbox/teams/${teamcode}`
  const events: string[] = []

  for (const w of wedstrijden) {
    const dateStr = w.wedstrijddatum.slice(0, 10)
    const dtstart = formatICalDate(dateStr, w.aanvangstijd)
    const duur = getWedstrijdDuur(teamNaam)
    const dtend = w.aanvangstijd ? addMinutes(dateStr, w.aanvangstijd, duur) : dtstart
    const location = [w.accommodatie, w.plaats].filter(Boolean).join(', ')
    const uid = `${w.wedstrijdcode || dtstart}-${teamNaam.replace(/\s/g, '')}@vvz49`

    // Wedstrijd event
    events.push([
      'BEGIN:VEVENT',
      `DTSTART;TZID=Europe/Amsterdam:${dtstart}`,
      `DTEND;TZID=Europe/Amsterdam:${dtend}`,
      `SUMMARY:${escapeIcal(`${w.thuisteam} - ${w.uitteam}`)}`,
      location ? `LOCATION:${escapeIcal(location)}` : '',
      `DESCRIPTION:${teamUrl}`,
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      'END:VEVENT',
    ].filter(Boolean).join('\r\n'))

    // Verzamel- of vertrektijd event (apart agenda-item van 30 min)
    const verzamelTijd = w.verzameltijd || w.vertrektijd
    const verzamelLabel = w.vertrektijd && !w.verzameltijd ? 'Vertrek' : 'Verzamelen'
    if (verzamelTijd) {
      const vzStart = formatICalDate(dateStr, verzamelTijd)
      const vzEnd = addMinutes(dateStr, verzamelTijd, 30)
      events.push([
        'BEGIN:VEVENT',
        `DTSTART;TZID=Europe/Amsterdam:${vzStart}`,
        `DTEND;TZID=Europe/Amsterdam:${vzEnd}`,
        `SUMMARY:${verzamelLabel}: ${escapeIcal(`${w.thuisteam} - ${w.uitteam}`)}`,
        location ? `LOCATION:${escapeIcal(location)}` : '',
        `UID:verzamel-${uid}`,
        `DTSTAMP:${dtstamp}`,
        'END:VEVENT',
      ].filter(Boolean).join('\r\n'))
    }
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//VVZ49 Toolbox//${teamNaam}//NL`,
    `X-WR-CALNAME:${teamNaam}`,
    'X-WR-TIMEZONE:Europe/Amsterdam',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    VTIMEZONE,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const teamcode = url.searchParams.get('teamcode')

  if (!teamcode) {
    return new Response('Missing teamcode parameter', { status: 400 })
  }

  const clientId = Deno.env.get('SPORTLINK_CLIENT_ID')
  if (!clientId) {
    return new Response('Sportlink not configured', { status: 500 })
  }

  try {
    // Haal teamnaam op
    const teamsUrl = new URL(`${SPORTLINK_BASE}/teams`)
    teamsUrl.searchParams.set('client_id', clientId)
    teamsUrl.searchParams.set('gebruiklokaleteamgegevens', 'NEE')
    const teamsRes = await fetch(teamsUrl.toString())
    if (!teamsRes.ok) throw new Error(`Sportlink teams error: ${teamsRes.status}`)
    const teams = await teamsRes.json()
    const team = teams.find((t: any) => String(t.teamcode) === String(teamcode))
    const teamNaam = team?.teamnaam || `Team ${teamcode}`

    // Haal programma op
    const progUrl = new URL(`${SPORTLINK_BASE}/programma`)
    progUrl.searchParams.set('client_id', clientId)
    progUrl.searchParams.set('teamcode', teamcode)
    progUrl.searchParams.set('aantaldagen', '365')
    progUrl.searchParams.set('eigenwedstrijden', 'JA')
    progUrl.searchParams.set('thuis', 'JA')
    progUrl.searchParams.set('uit', 'JA')
    progUrl.searchParams.set('gebruiklokaleteamgegevens', 'NEE')
    const progRes = await fetch(progUrl.toString())
    if (!progRes.ok) throw new Error(`Sportlink programma error: ${progRes.status}`)
    const programma = await progRes.json()

    const ical = generateIcal(programma || [], teamNaam, teamcode)

    return new Response(ical, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${teamcode}.ics"`,
        'Cache-Control': 'public, max-age=3600',
        ...corsHeaders,
      },
    })
  } catch (err) {
    console.error(err)
    return new Response('Failed to fetch calendar data', { status: 502 })
  }
})
