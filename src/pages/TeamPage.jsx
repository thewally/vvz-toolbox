import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTeamProgramma, getTeamUitslagen, getTeams, getPoulestand, getTeamGegevens, getAfgelastingen } from '../services/wedstrijden'
import { formatDagLabel, datumSleutel, parseWedstrijdDatum, kiesPouleViaWedstrijd } from '../services/wedstrijdenHelpers'
import AgendaAbonneerKnop from '../components/AgendaAbonneerKnop'

const CLUB_RELATIECODE = import.meta.env.VITE_SPORTLINK_CLUB_RELATIECODE

const SPEELDAG_REGULIER = ['Zondag', 'Zaterdag']

function kiesPouleFallback(teamPoules) {
  if (!teamPoules.length) return null
  const sorted = [...teamPoules].sort((a, b) => {
    const s = (b.seizoen || '').localeCompare(a.seizoen || '')
    if (s !== 0) return s
    return (a.competitiesoort === 'regulier' ? 0 : 1) - (b.competitiesoort === 'regulier' ? 0 : 1)
  })
  return sorted[0]
}

function getTeamCategorie(team) {
  if (!team) return 'senioren'
  const naam = (team.teamnaam || '').toLowerCase()
  const cat = (team.leeftijdscategorie || '').toLowerCase()
  if (naam.includes('veteran') || naam.includes('vet.') || naam.includes('35+') || naam.includes('45+') || naam.includes('30+') || cat.includes('veteran')) return 'veteranen'
  const joMatch = naam.match(/[jm]o\s*(\d+)/)
  if (joMatch) return parseInt(joMatch[1], 10) <= 12 ? 'pupillen' : 'junioren'
  if (cat.includes('pupil')) return 'pupillen'
  if (cat.includes('junior')) return 'junioren'
  // Zaalvoetbal: niet-jeugd, niet-veteraan, niet-O23, geen reguliere speeldag
  const isO23 = naam.includes('o23')
  const isRegulier = SPEELDAG_REGULIER.includes(team.speeldag || '')
  if (!isO23 && !isRegulier) return 'zaalvoetbal'
  return 'senioren'
}

const CAT_LABELS = {
  senioren: 'Senioren',
  veteranen: 'Veteranen',
  junioren: 'Junioren',
  pupillen: 'Pupillen',
  zaalvoetbal: 'Zaalvoetbal',
}
function isThuis(w) {
  return w.thuisteamclubrelatiecode === CLUB_RELATIECODE
}

function ThuisUitBadge({ wedstrijd }) {
  const thuis = isThuis(wedstrijd)
  return (
    <span className={`inline-block w-14 text-center text-xs font-semibold px-2 py-0.5 rounded-full ${thuis ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
      {thuis ? 'Thuis' : 'Uit'}
    </span>
  )
}


export default function TeamPage() {
  const { teamcode } = useParams()
  const [programma, setProgramma] = useState([])
  const [uitslagen, setUitslagen] = useState([])
  const [teamInfo, setTeamInfo] = useState(null)
  const [stand, setStand] = useState([])
  const [poules, setPoules] = useState([])
  const [selectedPoulecode, setSelectedPoulecode] = useState(null)
  const [standLoading, setStandLoading] = useState(false)
  const [teamfoto, setTeamfoto] = useState(null)
  const [afgelastingen, setAfgelastingen] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [shareFile, setShareFile] = useState(null)

  async function laadAfbeelding(url) {
    if (!url) return null
    // Laad via proxy zodat Sportlink CORS geen blokkade vormt
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const proxyUrl = `${supabaseUrl}/functions/v1/image-proxy?url=${encodeURIComponent(url)}`
    return Promise.race([
      new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = proxyUrl
      }),
      new Promise(resolve => setTimeout(() => resolve(null), 5000)),
    ])
  }

  async function genereerShareBlob(w, logoThuis, logoUit) {
    const VVZ_GREEN = '#2E7D32'
    const S = 2
    const CARD_W = 520
    const PAD = 16
    const INNER_W = CARD_W - PAD * 2
    const HEADER_H = 44
    const LOGO_SIZE = 56
    const LOGO_COL = 66
    const CENTER_W = INNER_W - LOGO_COL * 2
    const BODY_PAD_X = 16
    const BODY_PAD_Y = 20
    const R = 16

    const thuis = isThuis(w)
    const verzamelTijd = w.verzameltijd || w.vertrektijd
    const verzamelLabel = w.vertrektijd && !w.verzameltijd ? 'Vertrek' : 'Verzamelen'
    const veld = w.veldnummer || w.veld || null

    const tmpCtx = document.createElement('canvas').getContext('2d')
    function regelHoogte(font, tekst, maxBreedte) {
      tmpCtx.font = font
      const woorden = tekst.split(' ')
      let regel = '', regels = 1
      for (const word of woorden) {
        const test = regel ? `${regel} ${word}` : word
        if (tmpCtx.measureText(test).width > maxBreedte && regel) { regel = word; regels++ }
        else regel = test
      }
      return regels
    }

    let centerH = BODY_PAD_Y
    centerH += 44
    if (verzamelTijd) centerH += 28
    centerH += 8
    centerH += 26
    centerH += 20
    centerH += 26
    if (w.accommodatie) {
      centerH += 10 + regelHoogte('13px Arial', `📍 ${w.accommodatie}${w.plaats ? `, ${w.plaats}` : ''}${veld ? ` · ${veld}` : ''}`, CENTER_W - 8) * 18
    }
    if (w.kleedkamerthuisteam) centerH += 20
    centerH += BODY_PAD_Y

    const BODY_H = Math.max(centerH, LOGO_SIZE + BODY_PAD_Y * 2)
    const CARD_H = HEADER_H + BODY_H
    const TOTAL_H = CARD_H + PAD * 2

    const canvas = document.createElement('canvas')
    canvas.width = CARD_W * S
    canvas.height = TOTAL_H * S
    const ctx = canvas.getContext('2d')
    ctx.scale(S, S)

    ctx.fillStyle = '#f3f4f6'
    ctx.fillRect(0, 0, CARD_W, TOTAL_H)

    const cx = PAD, cy = PAD
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(cx, cy, INNER_W, CARD_H, R)
    ctx.fill()

    ctx.save()
    ctx.beginPath()
    ctx.roundRect(cx, cy, INNER_W, HEADER_H, [R, R, 0, 0])
    ctx.clip()
    ctx.fillStyle = VVZ_GREEN
    ctx.fillRect(cx, cy, INNER_W, HEADER_H)
    ctx.restore()

    const DUTCH_DAYS = ['Zondag','Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag']
    const DUTCH_MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
    const d = new Date(w.wedstrijddatum)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 15px Arial'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText(`${DUTCH_DAYS[d.getDay()]} ${d.getDate()} ${DUTCH_MONTHS[d.getMonth()]}`, cx + 20, cy + HEADER_H / 2)

    const badgeTekst = thuis ? 'Thuis' : 'Uit'
    ctx.font = 'bold 13px Arial'
    const bw = ctx.measureText(badgeTekst).width + 24
    const bh = 26
    const bx = cx + INNER_W - 20 - bw
    const by = cy + (HEADER_H - bh) / 2
    ctx.fillStyle = thuis ? '#dcfce7' : '#f3f4f6'
    ctx.beginPath()
    ctx.roundRect(bx, by, bw, bh, bh / 2)
    ctx.fill()
    ctx.fillStyle = thuis ? '#15803d' : '#6b7280'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(badgeTekst, bx + bw / 2, by + bh / 2)

    const bodyY = cy + HEADER_H
    const logoY = bodyY + BODY_PAD_Y + (BODY_H - BODY_PAD_Y * 2 - LOGO_SIZE) / 2

    function drawLogoContain(img, x, y, size) {
      const ratio = Math.min(size / img.naturalWidth, size / img.naturalHeight)
      const iw = img.naturalWidth * ratio
      const ih = img.naturalHeight * ratio
      ctx.drawImage(img, x + (size - iw) / 2, y + (size - ih) / 2, iw, ih)
    }
    if (logoThuis) drawLogoContain(logoThuis, cx + BODY_PAD_X, logoY, LOGO_SIZE)
    if (logoUit) drawLogoContain(logoUit, cx + INNER_W - BODY_PAD_X - LOGO_SIZE, logoY, LOGO_SIZE)

    const midX = cx + BODY_PAD_X + LOGO_COL + CENTER_W / 2
    let textY = bodyY + BODY_PAD_Y

    ctx.fillStyle = '#1f2937'
    ctx.font = 'bold 36px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    textY += 36
    ctx.fillText(w.aanvangstijd || '--:--', midX, textY)
    textY += 8

    if (verzamelTijd) {
      ctx.font = '14px Arial'
      textY += 20
      ctx.fillText(`${verzamelLabel}: ${verzamelTijd}`, midX, textY)
      textY += 4
    }

    ctx.fillStyle = thuis ? VVZ_GREEN : '#1f2937'
    ctx.font = 'bold 17px Arial'
    textY += 18
    ctx.fillText(w.thuisteam, midX, textY)

    ctx.fillStyle = '#9ca3af'
    ctx.font = '13px Arial'
    textY += 18
    ctx.fillText('vs', midX, textY)

    ctx.fillStyle = !thuis ? VVZ_GREEN : '#1f2937'
    ctx.font = 'bold 17px Arial'
    textY += 20
    ctx.fillText(w.uitteam, midX, textY)

    if (w.accommodatie) {
      ctx.fillStyle = '#6b7280'
      ctx.font = '12px Arial'
      const locTekst = `📍 ${w.accommodatie}${w.plaats ? `, ${w.plaats}` : ''}${veld ? ` · ${veld}` : ''}`
      textY += 14
      const woorden = locTekst.split(' ')
      let regel = ''
      for (const word of woorden) {
        const test = regel ? `${regel} ${word}` : word
        if (ctx.measureText(test).width > CENTER_W - 8 && regel) {
          ctx.fillText(regel, midX, textY)
          textY += 16
          regel = word
        } else { regel = test }
      }
      if (regel) { ctx.fillText(regel, midX, textY); textY += 16 }
    }

    if (w.kleedkamerthuisteam) {
      ctx.fillStyle = '#6b7280'
      ctx.font = '12px Arial'
      textY += 4
      ctx.fillText(`Kleedkamer: ${w.kleedkamerthuisteam}`, midX, textY)
    }

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  }

  function shareWedstrijdCard(w) {
    if (!shareFile) return
    if (navigator.canShare?.({ files: [shareFile] })) {
      navigator.share({ files: [shareFile], title: `${w.thuisteam} vs ${w.uitteam}` })
        .catch(e => { if (e.name !== 'AbortError') console.error(e) })
      return
    }
    // Fallback: download
    const objectUrl = URL.createObjectURL(shareFile)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = 'wedstrijd-vvz49.png'
    a.click()
    URL.revokeObjectURL(objectUrl)
  }

  useEffect(() => { load() }, [teamcode])

  // Pre-genereer share-afbeelding zodat navigator.share() direct na klik werkt op iOS
  useEffect(() => {
    const vandaagSleutel = new Date().toISOString().slice(0, 10)
    const eerstvolgende = [...programma]
      .filter(w => w.wedstrijddatum && w.wedstrijddatum.slice(0, 10) >= vandaagSleutel)
      .sort((a, b) => new Date(a.wedstrijddatum) - new Date(b.wedstrijddatum))[0]
    if (!eerstvolgende) return
    setShareFile(null)
    Promise.all([
      laadAfbeelding(eerstvolgende.thuisteamlogo),
      laadAfbeelding(eerstvolgende.uitteamlogo),
    ]).then(([thuis, uit]) => {
      genereerShareBlob(eerstvolgende, thuis, uit).then(blob => {
        if (blob) setShareFile(new File([blob], 'wedstrijd-vvz49.png', { type: 'image/png' }))
      })
    })
  }, [programma])

  async function load() {
    setLoading(true)
    setError(null)
    const [progRes, uitRes, teamsRes, gegevensRes, afgelastRes] = await Promise.all([
      getTeamProgramma(teamcode),
      getTeamUitslagen(teamcode),
      getTeams(),
      getTeamGegevens(teamcode),
      getAfgelastingen(),
    ])
    if (progRes.error || uitRes.error) {
      setError((progRes.error || uitRes.error).message)
      setLoading(false)
      return
    }
    const progData = progRes.data ?? []
    setProgramma(progData)
    setUitslagen(uitRes.data ?? [])

    // Filter afgelastingen op dit team via teamcode of teamnaam
    const progCodes = new Set(progData.map(w => w.wedstrijdcode).filter(Boolean))
    const alleAfgelast = (afgelastRes.data ?? []).filter(w =>
      w.thuisteamclubrelatiecode === CLUB_RELATIECODE || w.uitteamclubrelatiecode === CLUB_RELATIECODE
    )
    // Haal wedstrijden op die voor dit team zijn maar al verwijderd zijn uit het programma
    const teamNamen = new Set(progData.flatMap(w => [w.thuisteam, w.uitteam]).filter(Boolean))
    const teamAfgelast = alleAfgelast.filter(w =>
      !progCodes.has(w.wedstrijdcode) &&
      (teamNamen.has(w.thuisteam) || teamNamen.has(w.uitteam) ||
       String(w.thuisteamcode) === String(teamcode) || String(w.uitteamcode) === String(teamcode))
    ).map(w => ({ ...w, afgelast: true }))
    setAfgelastingen(teamAfgelast)
    setTeamfoto(gegevensRes.data?.team?.teamfoto || null)

    // Verzamel alle poules voor dit team
    const teams = teamsRes.data ?? []
    const teamPoules = teams.filter(t => String(t.teamcode) === String(teamcode))
    setPoules(teamPoules)

    // Kies standaard: poule van de eerstvolgende wedstrijd, anders meest recente regulier
    const viaWedstrijd = kiesPouleViaWedstrijd(teamPoules, progRes.data ?? [])
    const info = viaWedstrijd || kiesPouleFallback(teamPoules)
    setTeamInfo(info)

    // Laad poulestand voor de standaard selectie
    if (info?.poulecode) {
      setSelectedPoulecode(info.poulecode)
      const standRes = await getPoulestand(info.poulecode)
      setStand(standRes.data ?? [])
    }

    setLoading(false)
  }

  async function handlePouleChange(poulecode) {
    setSelectedPoulecode(poulecode)
    const pouleInfo = poules.find(p => String(p.poulecode) === String(poulecode)) || null
    if (pouleInfo) setTeamInfo(pouleInfo)
    setStandLoading(true)
    const standRes = await getPoulestand(poulecode)
    setStand(standRes.data ?? [])
    setStandLoading(false)
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

  // VELD/FUTSAL badge eenmalig bepalen op basis van eerste beschikbare wedstrijd
  const eersteWedstrijd = [...programma, ...uitslagen][0]
  const sportBadgeLabel = (() => {
    // Programma gebruikt w.locatie, uitslagen w.sportomschrijving
    const locatieRaw = (eersteWedstrijd?.locatie || '').toLowerCase()
    if (locatieRaw) return locatieRaw.includes('futsal') || locatieRaw.includes('zaal') ? 'ZAAL' : locatieRaw.toUpperCase()
    const sport = (eersteWedstrijd?.sportomschrijving || '').toLowerCase()
    if (sport.includes('zaal') || sport.includes('futsal')) return 'ZAAL'
    if (sport) return 'VELD'
    return null
  })()
  const sportBadgeIsZaal = (sportBadgeLabel || '').includes('ZAAL')

  // Toekomstige wedstrijden (inclusief afgelaste)
  const vandaagSleutel = new Date().toISOString().slice(0, 10)
  const toekomstigNormaal = programma.filter(w => w.wedstrijddatum && datumSleutel(w.wedstrijddatum) >= vandaagSleutel)
  const toekomstigAfgelast = afgelastingen.filter(w => w.wedstrijddatum && datumSleutel(w.wedstrijddatum) >= vandaagSleutel)
  const toekomstig = [...toekomstigNormaal, ...toekomstigAfgelast]
    .sort((a, b) => parseWedstrijdDatum(a.wedstrijddatum) - parseWedstrijdDatum(b.wedstrijddatum))

  const eerstvolgende = toekomstigNormaal
    .filter(w => w.wedstrijddatum && datumSleutel(w.wedstrijddatum) >= vandaagSleutel)
    .sort((a, b) => parseWedstrijdDatum(a.wedstrijddatum) - parseWedstrijdDatum(b.wedstrijddatum))[0] || null

  return (
    <div className="max-w-3xl mx-auto p-4 pt-6">
      <div className="mb-4">
        <Link to={`/teams/${getTeamCategorie(teamInfo)}`} className="text-sm text-vvz-green hover:underline">&larr; {CAT_LABELS[getTeamCategorie(teamInfo)] || 'Teams'}</Link>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold text-gray-800">{teamnaam}</h1>
          {sportBadgeLabel && (
            <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${sportBadgeIsZaal ? 'bg-gray-100 text-gray-500' : 'bg-emerald-50 text-emerald-600'}`}>
              {sportBadgeLabel}
            </span>
          )}
        </div>
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
                <p className="text-2xl font-bold text-gray-800">{eerstvolgende.aanvangstijd || '--:--'}</p>                
                {(eerstvolgende.verzameltijd || eerstvolgende.vertrektijd) && (
                  <p className="text-lg mt-1 text-gray-800">
                    {eerstvolgende.verzameltijd && <span>Verzamelen: {eerstvolgende.verzameltijd}</span>}
                    {eerstvolgende.verzameltijd && eerstvolgende.vertrektijd && <span> · </span>}
                    {eerstvolgende.vertrektijd && <span>Vertrek: {eerstvolgende.vertrektijd}</span>}
                  </p>
                )}
                <p className={`text-lg font-bold mt-2 ${isThuis(eerstvolgende) ? 'text-vvz-green' : 'text-gray-800'}`}>{eerstvolgende.thuisteam}</p>
                <p className="text-gray-400 text-sm my-1">vs</p>
                <p className={`text-lg font-bold ${!isThuis(eerstvolgende) ? 'text-vvz-green' : 'text-gray-800'}`}>{eerstvolgende.uitteam}</p>

                {eerstvolgende.accommodatie && (
                  <p className="text-sm text-gray-500 mt-1">
                    📍 {eerstvolgende.accommodatie}{eerstvolgende.plaats ? `, ${eerstvolgende.plaats}` : ''}{(eerstvolgende.veldnummer || eerstvolgende.veld) ? ` · ${eerstvolgende.veldnummer || eerstvolgende.veld}` : ''}
                  </p>
                )}

                {eerstvolgende.kleedkamerthuisteam && (
                  <p className="text-sm text-gray-500 mt-1">Kleedkamer: {eerstvolgende.kleedkamerthuisteam}</p>
                )}

                <button
                  onClick={() => shareWedstrijdCard(eerstvolgende)}
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
              <p className="text-2xl font-bold text-gray-800 mb-2">{eerstvolgende.aanvangstijd || '--:--'}</p>
              {(eerstvolgende.verzameltijd || eerstvolgende.vertrektijd) && (
                <p className="text-lg text-gray-800 mt-1">
                  {eerstvolgende.verzameltijd && <span>Verzamelen: {eerstvolgende.verzameltijd}</span>}
                  {eerstvolgende.verzameltijd && eerstvolgende.vertrektijd && <span> · </span>}
                  {eerstvolgende.vertrektijd && <span>Vertrek: {eerstvolgende.vertrektijd}</span>}
                </p>
              )}
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
                </div>
                {eerstvolgende.uitteamlogo
                  ? <img src={eerstvolgende.uitteamlogo} alt={eerstvolgende.uitteam} className="w-14 h-14 object-contain" />
                  : <div className="w-14 h-14" />
                }
              </div>

              {eerstvolgende.accommodatie && (
                <p className="text-sm text-gray-500 mb-1">
                  📍 {eerstvolgende.accommodatie}{eerstvolgende.plaats ? `, ${eerstvolgende.plaats}` : ''}{(eerstvolgende.veldnummer || eerstvolgende.veld) ? ` · ${eerstvolgende.veldnummer || eerstvolgende.veld}` : ''}
                </p>
              )}

              {eerstvolgende.kleedkamerthuisteam && (
                <p className="text-sm text-gray-500 mb-3">Kleedkamer: {eerstvolgende.kleedkamerthuisteam}</p>
              )}

              <button
                onClick={() => shareWedstrijdCard(eerstvolgende)}
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

      {/* Agenda abonneren */}
      <section className="mb-8 bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Abonneer op het programma van {teamnaam}</h2>
        <AgendaAbonneerKnop teamcode={teamcode} />
      </section>

      {/* Programma — alle toekomstige wedstrijden */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-gray-700 mb-4">Programma</h2>
        {toekomstig.length === 0 ? (
          <p className="text-gray-500 text-sm">Geen komende wedstrijden.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {toekomstig.map((w, i) => (
              <div key={i} className={`bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 transition-shadow ${w.afgelast ? 'opacity-60' : 'hover:shadow-md'}`}>
                {/* Mobiel: drie-kolommen layout */}
                <div className="sm:hidden flex items-center gap-3">
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <span className={`text-sm font-bold ${w.afgelast ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{w.aanvangstijd || '--:--'}</span>
                    <span className={`w-14 text-center text-xs font-semibold px-2 py-0.5 rounded-full ${isThuis(w) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {isThuis(w) ? 'THUIS' : 'UIT'}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-0.5">
                    <span className={`font-semibold text-sm ${isThuis(w) ? 'text-vvz-green' : 'text-gray-800'}`}>{w.thuisteam}</span>
                    {w.afgelast
                      ? <span className="text-xs font-bold text-orange-500 uppercase">Afgelast</span>
                      : <span className="text-gray-400 text-xs">vs</span>
                    }
                    <span className={`font-semibold text-sm ${!isThuis(w) ? 'text-vvz-green' : 'text-gray-800'}`}>{w.uitteam}</span>
                    <span className="text-xs text-gray-400 capitalize">{formatDagLabel(w.wedstrijddatum)}</span>
                    {!w.afgelast && (w.accommodatie || w.veldnummer || w.veld) && <p className="text-xs text-gray-400">{w.accommodatie}{(w.veldnummer || w.veld) ? ` · ${w.veldnummer || w.veld}` : ''}</p>}
                    {!w.afgelast && (w.verzameltijd || w.vertrektijd) && (
                      <p className="text-xs text-gray-400">
                        {w.verzameltijd ? `Verzamelen ${w.verzameltijd}` : ''}
                        {w.verzameltijd && w.vertrektijd ? ' · ' : ''}
                        {w.vertrektijd ? `Vertrek ${w.vertrektijd}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                {/* Desktop: horizontale layout */}
                <div className="hidden sm:grid gap-x-2 gap-y-0.5" style={{gridTemplateColumns: 'auto 1fr 4rem 1fr auto'}}>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${w.afgelast ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{w.aanvangstijd || '--:--'}</span>
                    <ThuisUitBadge wedstrijd={w} />
                  </div>
                  <span className={`self-center text-right font-semibold text-sm truncate ${isThuis(w) ? 'text-vvz-green' : 'text-gray-800'}`}>{w.thuisteam}</span>
                  {w.afgelast
                    ? <span className="self-center text-center text-xs font-bold text-orange-500 uppercase">Afgelast</span>
                    : <span className="self-center text-center text-gray-400 text-xs">vs</span>
                  }
                  <span className={`self-center font-semibold text-sm truncate ${!isThuis(w) ? 'text-vvz-green' : 'text-gray-800'}`}>{w.uitteam}</span>
                  <span className="self-center text-xs text-gray-400 capitalize">{formatDagLabel(w.wedstrijddatum)}</span>
                  {!w.afgelast && (w.accommodatie || w.veldnummer || w.veld) && <>
                    <span />
                    <span />
                    <span className="text-center text-xs text-gray-400 col-start-2 col-end-5">{w.accommodatie}{(w.veldnummer || w.veld) ? ` · ${w.veldnummer || w.veld}` : ''}</span>
                  </>}
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
                    </div>
                    {/* Desktop: horizontale layout */}
                    <div className="hidden sm:grid gap-x-2 gap-y-0.5" style={{gridTemplateColumns: 'auto 1fr 4rem 1fr auto'}}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-800">{w.aanvangstijd || '--:--'}</span>
                        <ThuisUitBadge wedstrijd={w} />
                      </div>
                      <span className={`self-center text-right font-semibold text-sm truncate ${thuis ? 'text-vvz-green' : 'text-gray-800'}`}>{w.thuisteam}</span>
                      <span className="self-center text-center text-lg font-bold text-gray-800 tabular-nums">{thuisScore} – {uitScore}</span>
                      <span className={`self-center font-semibold text-sm truncate ${!thuis ? 'text-vvz-green' : 'text-gray-800'}`}>{w.uitteam}</span>
                      <span className="self-center text-xs text-gray-400 capitalize">{formatDagLabel(w.wedstrijddatum)}</span>
                      {w.accommodatie && <>
                        <span />
                        <span />
                        <span className="text-center text-xs text-gray-400 col-start-2 col-end-5">{w.accommodatie}</span>
                      </>}
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </section>

      {/* Poulestand */}
      {poules.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-gray-700 mb-4">Stand</h2>

          {/* Periode/competitie selectie */}
          {poules.length > 1 && (
            <select
              value={selectedPoulecode || ''}
              onChange={e => handlePouleChange(e.target.value)}
              className="mb-4 w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-vvz-green focus:border-vvz-green"
            >
              {poules.map(p => (
                <option key={p.poulecode} value={p.poulecode}>
                  {[p.competitienaam, p.klassenaam, p.poulenaam].filter(Boolean).join(' – ')}
                </option>
              ))}
            </select>
          )}

          {/* Poule informatie kaart */}
          {teamInfo && (teamInfo.klassenaam || teamInfo.poulenaam || teamInfo.competitienaam) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4 text-sm text-gray-600">
              <div className="flex flex-col gap-1">
                {teamInfo.competitienaam && (
                  <span><span className="font-medium text-gray-700">Competitie:</span> {teamInfo.competitienaam}</span>
                )}
                {(teamInfo.klassenaam || teamInfo.klasse) && (
                  <span><span className="font-medium text-gray-700">Klasse:</span> {teamInfo.klassenaam || teamInfo.klasse}</span>
                )}
                {teamInfo.poulenaam && (
                  <span><span className="font-medium text-gray-700">Poule:</span> {teamInfo.poulenaam}</span>
                )}
                {teamInfo.competitiesoort && (
                  <span><span className="font-medium text-gray-700">Soort:</span> {teamInfo.competitiesoort}</span>
                )}
              </div>
            </div>
          )}

          {/* Stand tabel */}
          {standLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-vvz-green" />
            </div>
          ) : stand.length > 0 ? (
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
          ) : (
            <p className="text-sm text-gray-400">Geen stand beschikbaar voor deze competitie.</p>
          )}
        </section>
      )}
    </div>
  )
}
