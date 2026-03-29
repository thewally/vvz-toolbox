import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTeamProgramma, getTeamUitslagen, getTeams, getPoulestand, getTeamGegevens } from '../services/wedstrijden'
import { groepeerPerDag, formatDagLabel, formatDatumKort, datumSleutel, parseWedstrijdDatum } from '../services/wedstrijdenHelpers'

const CLUB_RELATIECODE = import.meta.env.VITE_SPORTLINK_CLUB_RELATIECODE

function getTeamCategorie(team) {
  if (!team) return 'senioren'
  const naam = (team.teamnaam || '').toLowerCase()
  const cat = (team.leeftijdscategorie || '').toLowerCase()
  if (naam.includes('veteran') || naam.includes('vet.') || naam.includes('35+') || naam.includes('45+') || naam.includes('30+') || cat.includes('veteran')) return 'veteranen'
  const joMatch = naam.match(/[jm]o\s*(\d+)/)
  if (joMatch) return parseInt(joMatch[1], 10) <= 12 ? 'pupillen' : 'junioren'
  if (cat.includes('pupil')) return 'pupillen'
  if (cat.includes('junior')) return 'junioren'
  return 'senioren'
}
const WEBCAL_BASE = 'webcal://thewally.github.io/vvz-toolbox/wedstrijden/ical'

function isThuis(w) {
  return w.thuisteamclubrelatiecode === CLUB_RELATIECODE
}

function getTegenstander(w) {
  return isThuis(w) ? w.uitteam : w.thuisteam
}

function ThuisUitBadge({ wedstrijd }) {
  const thuis = isThuis(wedstrijd)
  return (
    <span className={`inline-block w-14 text-center text-xs font-semibold px-2 py-0.5 rounded-full ${thuis ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
      {thuis ? 'Thuis' : 'Uit'}
    </span>
  )
}

function fitText(ctx, text, maxWidth, startSize) {
  let size = startSize
  while (size > 16) {
    ctx.font = `bold ${size}px system-ui, sans-serif`
    if (ctx.measureText(text).width <= maxWidth) return size
    size -= 2
  }
  // Truncate with ellipsis at minimum size
  ctx.font = `bold ${size}px system-ui, sans-serif`
  while (ctx.measureText(text + '...').width > maxWidth && text.length > 1) {
    text = text.slice(0, -1)
  }
  return size
}



function drawBadge(ctx, text, cx, cy, bgColor, textColor) {
  ctx.font = 'bold 22px system-ui, sans-serif'
  const tw = ctx.measureText(text).width
  const bw = tw + 32
  const bh = 38
  const r = bh / 2
  ctx.fillStyle = bgColor
  ctx.beginPath()
  ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, r)
  ctx.fill()
  ctx.fillStyle = textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, cx, cy)
}

async function shareWedstrijdCard(w, teamnaam, teamcode) {
  const VVZ_GREEN = '#2E7D32'
  const WIDTH = 1200
  const HEIGHT = 630
  const thuis = isThuis(w)

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'alphabetic'

  // Light gray background
  ctx.fillStyle = '#f3f4f6'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // White card
  const cardX = 60, cardY = 50, cardW = WIDTH - 120, cardH = HEIGHT - 100
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(cardX, cardY, cardW, cardH, 24)
  ctx.fill()

  // Green top bar on card
  const barH = 90
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(cardX, cardY, cardW, barH, [24, 24, 0, 0])
  ctx.clip()
  ctx.fillStyle = VVZ_GREEN
  ctx.fillRect(cardX, cardY, cardW, barH)
  ctx.restore()

  // VVZ'49 label + teamnaam in bar
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.font = 'bold 32px system-ui, sans-serif'
  ctx.fillText("VVZ'49", cardX + 36, cardY + barH / 2 - 12)
  ctx.font = '22px system-ui, sans-serif'
  ctx.fillText(teamnaam, cardX + 36, cardY + barH / 2 + 16)

  // Date + time right side of bar
  const dagLabel = formatDagLabel(w.wedstrijddatum)
  ctx.textAlign = 'right'
  ctx.font = '22px system-ui, sans-serif'
  ctx.fillText(dagLabel.charAt(0).toUpperCase() + dagLabel.slice(1), cardX + cardW - 36, cardY + barH / 2 - 12)
  ctx.font = 'bold 28px system-ui, sans-serif'
  ctx.fillText(w.aanvangstijd || '--:--', cardX + cardW - 36, cardY + barH / 2 + 18)

  // Team names
  const teamY = cardY + barH + 110
  ctx.textBaseline = 'alphabetic'

  const thuisSize = fitText(ctx, w.thuisteam, cardW * 0.38, 44)
  ctx.font = `bold ${thuisSize}px system-ui, sans-serif`
  ctx.fillStyle = thuis ? VVZ_GREEN : '#1f2937'
  ctx.textAlign = 'center'
  ctx.fillText(w.thuisteam, cardX + cardW * 0.28, teamY)

  // vs
  ctx.fillStyle = '#9ca3af'
  ctx.font = 'bold 36px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('vs', WIDTH / 2, teamY - 16)
  ctx.textBaseline = 'alphabetic'

  const uitSize = fitText(ctx, w.uitteam, cardW * 0.38, 44)
  ctx.font = `bold ${uitSize}px system-ui, sans-serif`
  ctx.fillStyle = !thuis ? VVZ_GREEN : '#1f2937'
  ctx.textAlign = 'center'
  ctx.fillText(w.uitteam, cardX + cardW * 0.72, teamY)

  // Badges
  const badgeY = teamY + 70
  const isZaal = (w.locatie || '').toLowerCase().includes('zaal') || (w.locatie || '').toLowerCase().includes('futsal')
  drawBadge(ctx, thuis ? 'THUIS' : 'UIT',
    WIDTH / 2 - 80, badgeY,
    thuis ? '#dcfce7' : '#f3f4f6',
    thuis ? '#15803d' : '#6b7280')
  drawBadge(ctx, isZaal ? 'ZAAL' : 'VELD',
    WIDTH / 2 + 80, badgeY,
    isZaal ? '#f3f4f6' : '#d1fae5',
    isZaal ? '#6b7280' : '#065f46')

  // Accommodatie
  if (w.accommodatie) {
    ctx.fillStyle = '#6b7280'
    ctx.font = '20px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    const loc = '📍 ' + w.accommodatie + (w.plaats ? `, ${w.plaats}` : '')
    ctx.fillText(loc, WIDTH / 2, badgeY + 52)
  }
  if (w.verzameltijd) {
    ctx.fillStyle = '#6b7280'
    ctx.font = '20px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`🕐 Verzamelen om ${w.verzameltijd}`, WIDTH / 2, badgeY + 80)
  }

  // Convert to blob and share
  let blob
  try {
    blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  } catch {
    blob = null
  }

  if (blob) {
    const file = new File([blob], 'wedstrijd-vvz49.png', { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        const mapsQ = w.accommodatie ? encodeURIComponent(`${w.accommodatie}${w.plaats ? `, ${w.plaats}` : ''}`) : null
        const shareText = [
          `📅 ${formatDagLabel(w.wedstrijddatum)} om ${w.aanvangstijd || '?'}`,
          mapsQ ? `Locatie: https://maps.google.com/?q=${mapsQ}` : null,
          w.verzameltijd ? `🕐 Verzamelen om ${w.verzameltijd}` : null,
        ].filter(Boolean).join('\n')
        await navigator.share({
          files: [file],
          title: `${w.thuisteam} vs ${w.uitteam}`,
          text: shareText,
        })
        return
      } catch (e) {
        if (e.name === 'AbortError') return
      }
    }
  }
  window.open(buildWhatsAppUrl(w, teamnaam, teamcode))
}

function buildWhatsAppUrl(w, teamnaam, teamcode) {
  const thuisUit = isThuis(w) ? 'thuis' : 'uit'
  const pageUrl = `https://thewally.github.io/vvz-toolbox/#/teams/${teamcode}`
  const mapsQuery = w.accommodatie ? encodeURIComponent(`${w.accommodatie}${w.plaats ? `, ${w.plaats}` : ''}`) : null
  const mapsUrl = mapsQuery ? `https://maps.google.com/?q=${mapsQuery}` : null
  const tekst = [
    `📅 ${formatDagLabel(w.wedstrijddatum)} om ${w.aanvangstijd || '?'}`,
    w.accommodatie ? `📍 ${w.accommodatie}${w.plaats ? `, ${w.plaats}` : ''}` : null,
    mapsUrl ? `Locatie: ${mapsUrl}` : null,
    w.verzameltijd ? `🕐 Verzamelen om ${w.verzameltijd}` : null,
    `\n${pageUrl}`,
  ].filter(Boolean).join('\n')
  return `https://wa.me/?text=${encodeURIComponent(tekst)}`
}

export default function TeamPage() {
  const { teamcode } = useParams()
  const [programma, setProgramma] = useState([])
  const [uitslagen, setUitslagen] = useState([])
  const [teamInfo, setTeamInfo] = useState(null)
  const [stand, setStand] = useState([])
  const [teamfoto, setTeamfoto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { load() }, [teamcode])

  async function load() {
    setLoading(true)
    setError(null)
    const [progRes, uitRes, teamsRes, gegevensRes] = await Promise.all([
      getTeamProgramma(teamcode),
      getTeamUitslagen(teamcode),
      getTeams(),
      getTeamGegevens(teamcode),
    ])
    if (progRes.error || uitRes.error) {
      setError((progRes.error || uitRes.error).message)
      setLoading(false)
      return
    }
    setProgramma(progRes.data ?? [])
    setUitslagen(uitRes.data ?? [])
    setTeamfoto(gegevensRes.data?.team?.teamfoto || null)

    // Zoek team info voor poulecode en teamnaam
    const teams = teamsRes.data ?? []
    const info = teams.find(t => String(t.teamcode) === String(teamcode) && t.competitiesoort === 'regulier')
      || teams.find(t => String(t.teamcode) === String(teamcode))
    setTeamInfo(info || null)

    // Laad poulestand als poulecode bekend is
    if (info?.poulecode) {
      const standRes = await getPoulestand(info.poulecode)
      setStand(standRes.data ?? [])
    }

    setLoading(false)
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green" />
    </div>
  )

  if (error) return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg">
        Kon gegevens niet laden: {error}
        <button onClick={load} className="ml-3 underline font-medium">Opnieuw proberen</button>
      </div>
    </div>
  )

  // Teamnaam bepalen
  const eigenWedstrijd = [...programma, ...uitslagen].find(w => isThuis(w))
  const teamnaam = teamInfo?.teamnaam
    || eigenWedstrijd?.thuisteam
    || [...programma, ...uitslagen].find(w => !isThuis(w))?.uitteam
    || `Team ${teamcode}`

  // Toekomstige wedstrijden (alles)
  const vandaagSleutel = new Date().toISOString().slice(0, 10)
  const toekomstig = [...programma]
    .filter(w => w.wedstrijddatum && datumSleutel(w.wedstrijddatum) >= vandaagSleutel)
    .sort((a, b) => parseWedstrijdDatum(a.wedstrijddatum) - parseWedstrijdDatum(b.wedstrijddatum))

  const eerstvolgende = toekomstig[0] || null

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
      <div className="mb-4">
        <Link to={`/teams/${getTeamCategorie(teamInfo)}`} className="text-sm text-vvz-green hover:underline">&larr; Teams</Link>
      </div>

      <div className="flex items-center justify-between mb-4 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">{teamnaam}</h1>
        <a
          href={`${WEBCAL_BASE}/${teamcode}.ics`}
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-vvz-green border border-vvz-green/40 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
          title="Abonneer via Google Calendar / Apple Calendar"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5" />
          </svg>
          Agenda abonneren
        </a>
      </div>

      {/* Uitgelichte wedstrijd */}
      {eerstvolgende && (
        <section className="mb-8">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-vvz-green text-white px-5 py-3 flex items-center justify-between">
              <p className="text-sm font-medium capitalize">{formatDagLabel(eerstvolgende.wedstrijddatum)}</p>
              <ThuisUitBadge wedstrijd={eerstvolgende} />
            </div>
            {/* Mobiel: drie-kolommen layout met logo's links en rechts */}
            <div className="sm:hidden p-5 flex items-start gap-3">
              <div className="shrink-0 w-14 flex justify-center pt-1">
                {eerstvolgende.thuisteamlogo && (
                  <img src={eerstvolgende.thuisteamlogo} alt={eerstvolgende.thuisteam} className="w-14 h-14 object-contain" />
                )}
              </div>
              <div className="flex-1 flex flex-col items-center text-center">
                <p className={`text-lg font-bold ${isThuis(eerstvolgende) ? 'text-vvz-green' : 'text-gray-800'}`}>{eerstvolgende.thuisteam}</p>
                <p className="text-gray-400 text-sm my-1">vs</p>
                <p className={`text-lg font-bold ${!isThuis(eerstvolgende) ? 'text-vvz-green' : 'text-gray-800'}`}>{eerstvolgende.uitteam}</p>
                <p className="text-2xl font-bold text-gray-800 mt-2">{eerstvolgende.aanvangstijd || '--:--'}</p>

                {(eerstvolgende.verzameltijd || eerstvolgende.vertrektijd) && (
                  <p className="text-sm text-gray-500 mt-1">
                    {eerstvolgende.verzameltijd && <span>Verzamelen {eerstvolgende.verzameltijd}</span>}
                    {eerstvolgende.verzameltijd && eerstvolgende.vertrektijd && <span> · </span>}
                    {eerstvolgende.vertrektijd && <span>Vertrek {eerstvolgende.vertrektijd}</span>}
                  </p>
                )}

                {eerstvolgende.accommodatie && (
                  <p className="text-sm text-gray-500 mt-1">
                    📍 {eerstvolgende.accommodatie}{eerstvolgende.plaats ? `, ${eerstvolgende.plaats}` : ''}
                  </p>
                )}

                {eerstvolgende.kleedkamerthuisteam && (
                  <p className="text-sm text-gray-500 mt-1">Kleedkamer: {eerstvolgende.kleedkamerthuisteam}</p>
                )}

                <button
                  onClick={() => shareWedstrijdCard(eerstvolgende, teamnaam, teamcode)}
                  className="mt-3 inline-flex items-center gap-2 bg-vvz-green hover:bg-vvz-green/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Delen
                </button>
              </div>
              <div className="shrink-0 w-14 flex justify-center pt-1">
                {eerstvolgende.uitteamlogo && (
                  <img src={eerstvolgende.uitteamlogo} alt={eerstvolgende.uitteam} className="w-14 h-14 object-contain" />
                )}
              </div>
            </div>

            {/* Desktop: horizontale layout met logo's */}
            <div className="hidden sm:flex flex-col items-center text-center p-5">
              <div className="flex items-center justify-center gap-4 mb-2">
                {eerstvolgende.thuisteamlogo
                  ? <img src={eerstvolgende.thuisteamlogo} alt={eerstvolgende.thuisteam} className="w-14 h-14 object-contain" />
                  : <div className="w-14 h-14" />
                }
                <div>
                  <p className="text-xl font-bold leading-tight">
                    <span className={isThuis(eerstvolgende) ? 'text-vvz-green' : 'text-gray-800'}>{eerstvolgende.thuisteam}</span>
                    <span className="text-gray-400 font-normal mx-2">vs</span>
                    <span className={!isThuis(eerstvolgende) ? 'text-vvz-green' : 'text-gray-800'}>{eerstvolgende.uitteam}</span>
                  </p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{eerstvolgende.aanvangstijd || '--:--'}</p>
                </div>
                {eerstvolgende.uitteamlogo
                  ? <img src={eerstvolgende.uitteamlogo} alt={eerstvolgende.uitteam} className="w-14 h-14 object-contain" />
                  : <div className="w-14 h-14" />
                }
              </div>

              {(eerstvolgende.verzameltijd || eerstvolgende.vertrektijd) && (
                <p className="text-sm text-gray-500 mb-1">
                  {eerstvolgende.verzameltijd && <span>Verzamelen {eerstvolgende.verzameltijd}</span>}
                  {eerstvolgende.verzameltijd && eerstvolgende.vertrektijd && <span> · </span>}
                  {eerstvolgende.vertrektijd && <span>Vertrek {eerstvolgende.vertrektijd}</span>}
                </p>
              )}

              {eerstvolgende.accommodatie && (
                <p className="text-sm text-gray-500 mb-1">
                  📍 {eerstvolgende.accommodatie}{eerstvolgende.plaats ? `, ${eerstvolgende.plaats}` : ''}
                </p>
              )}

              {eerstvolgende.kleedkamerthuisteam && (
                <p className="text-sm text-gray-500 mb-3">Kleedkamer: {eerstvolgende.kleedkamerthuisteam}</p>
              )}

              <button
                onClick={() => shareWedstrijdCard(eerstvolgende, teamnaam, teamcode)}
                className="mt-2 inline-flex items-center gap-2 bg-vvz-green hover:bg-vvz-green/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Delen
              </button>
            </div>
          </div>
        </section>
      )}

      {teamfoto && (
        <img
          src={`data:image/jpeg;base64,${teamfoto}`}
          alt={`Teamfoto ${teamnaam}`}
          className="w-full rounded-xl mb-6"
        />
      )}

      {/* Programma — alle toekomstige wedstrijden */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-gray-700 mb-4">Programma</h2>
        {toekomstig.length === 0 ? (
          <p className="text-gray-500 text-sm">Geen komende wedstrijden.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {toekomstig.map((w, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 hover:shadow-md transition-shadow">
                {/* Mobiel: drie-kolommen layout */}
                <div className="sm:hidden flex items-center gap-3">
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-gray-800">{w.aanvangstijd || '--:--'}</span>
                    <span className={`w-14 text-center text-xs font-semibold px-2 py-0.5 rounded-full ${isThuis(w) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {isThuis(w) ? 'THUIS' : 'UIT'}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-0.5">
                    <span className={`font-semibold text-sm ${isThuis(w) ? 'text-vvz-green' : 'text-gray-800'}`}>{w.thuisteam}</span>
                    <span className="text-gray-400 text-xs">vs</span>
                    <span className={`font-semibold text-sm ${!isThuis(w) ? 'text-vvz-green' : 'text-gray-800'}`}>{w.uitteam}</span>
                    <span className="text-xs text-gray-400 capitalize">{formatDagLabel(w.wedstrijddatum)}</span>
                    {w.accommodatie && <p className="text-xs text-gray-400">{w.accommodatie}</p>}
                    {(w.verzameltijd || w.vertrektijd) && (
                      <p className="text-xs text-gray-400">
                        {w.verzameltijd ? `Verzamelen ${w.verzameltijd}` : ''}
                        {w.verzameltijd && w.vertrektijd ? ' · ' : ''}
                        {w.vertrektijd ? `Vertrek ${w.vertrektijd}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 w-14" />
                </div>
                {/* Desktop: horizontale layout */}
                <div className="hidden sm:flex items-center gap-2">
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">{w.aanvangstijd || '--:--'}</span>
                    <ThuisUitBadge wedstrijd={w} />
                  </div>
                  <span className={`flex-1 text-right font-semibold text-sm truncate ${isThuis(w) ? 'text-vvz-green' : 'text-gray-800'}`}>{w.thuisteam}</span>
                  <span className="shrink-0 w-16 text-center text-gray-400 text-xs">vs</span>
                  <span className={`flex-1 font-semibold text-sm truncate ${!isThuis(w) ? 'text-vvz-green' : 'text-gray-800'}`}>{w.uitteam}</span>
                  <span className="shrink-0 text-xs text-gray-400 capitalize">{formatDagLabel(w.wedstrijddatum)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Uitslagen — alle beschikbare */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-gray-700 mb-4">Uitslagen</h2>
        {uitslagen.length === 0 ? (
          <p className="text-gray-500 text-sm">Geen recente uitslagen.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {[...uitslagen]
              .sort((a, b) => parseWedstrijdDatum(b.wedstrijddatum) - parseWedstrijdDatum(a.wedstrijddatum))
              .map((w, i) => {
                const scores = w.uitslag ? w.uitslag.split('-').map(s => s.trim()) : null
                const thuisScore = scores?.[0] ?? '-'
                const uitScore = scores?.[1] ?? '-'
                const thuis = isThuis(w)
                return (
                  <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 hover:shadow-md transition-shadow">
                    {/* Mobiel: drie-kolommen layout */}
                    <div className="sm:hidden flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-gray-800">{w.aanvangstijd || '--:--'}</span>
                        <span className={`w-14 text-center text-xs font-semibold px-2 py-0.5 rounded-full ${thuis ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {thuis ? 'THUIS' : 'UIT'}
                        </span>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center text-center gap-0.5">
                        <span className={`font-semibold text-sm ${thuis ? 'text-vvz-green' : 'text-gray-800'}`}>{w.thuisteam}</span>
                        <span className="text-lg font-bold text-gray-800 tabular-nums">{thuisScore} – {uitScore}</span>
                        <span className={`font-semibold text-sm ${!thuis ? 'text-vvz-green' : 'text-gray-800'}`}>{w.uitteam}</span>
                        <span className="text-xs text-gray-400 capitalize">{formatDagLabel(w.wedstrijddatum)}</span>
                      </div>
                      <div className="shrink-0 w-14" />
                    </div>
                    {/* Desktop: horizontale layout */}
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="shrink-0 flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-800">{w.aanvangstijd || '--:--'}</span>
                        <ThuisUitBadge wedstrijd={w} />
                      </div>
                      <span className={`flex-1 text-right font-semibold text-sm truncate ${thuis ? 'text-vvz-green' : 'text-gray-800'}`}>{w.thuisteam}</span>
                      <span className="shrink-0 w-16 text-center text-lg font-bold text-gray-800 tabular-nums">{thuisScore} – {uitScore}</span>
                      <span className={`flex-1 font-semibold text-sm truncate ${!thuis ? 'text-vvz-green' : 'text-gray-800'}`}>{w.uitteam}</span>
                      <span className="shrink-0 text-xs text-gray-400 capitalize">{formatDagLabel(w.wedstrijddatum)}</span>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </section>

      {/* Poulestand */}
      {stand.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-gray-700 mb-4">Stand</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500">
                  <th className="px-3 py-2 text-left font-medium w-8">#</th>
                  <th className="px-3 py-2 text-left font-medium">Team</th>
                  <th className="px-3 py-2 text-center font-medium w-8">G</th>
                  <th className="px-3 py-2 text-center font-medium w-8">W</th>
                  <th className="px-3 py-2 text-center font-medium w-8">G</th>
                  <th className="px-3 py-2 text-center font-medium w-8">V</th>
                  <th className="px-3 py-2 text-center font-medium w-12">Pnt</th>
                </tr>
              </thead>
              <tbody>
                {stand.map((rij, i) => (
                  <tr key={i} className={`border-b border-gray-50 ${rij.eigenteam === 'true' ? 'bg-green-50 font-semibold' : ''}`}>
                    <td className="px-3 py-2 text-gray-500">{rij.positie}</td>
                    <td className="px-3 py-2 truncate max-w-0">
                      <span className={rij.eigenteam === 'true' ? 'text-vvz-green' : 'text-gray-800'}>{rij.teamnaam}</span>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600">{rij.gespeeldewedstrijden}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{rij.gewonnen}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{rij.gelijk}</td>
                    <td className="px-3 py-2 text-center text-gray-600">{rij.verloren}</td>
                    <td className="px-3 py-2 text-center font-bold text-gray-800">{rij.punten}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
