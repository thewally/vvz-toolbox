import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchPublicNewsItems } from '../services/news'
import { fetchActivities } from '../services/activities'
import { getProgramma, getUitslagen, getTeams, getPoulestand, getTeamProgramma, getAfgelastingen } from '../services/wedstrijden'
import { kiesPouleViaWedstrijd } from '../services/wedstrijdenHelpers'
import { fetchTvInstellingen, DEFAULT_INSTELLINGEN } from '../services/tvInstellingen'
import { fetchKnvbNieuws } from '../services/knvbNieuws'

const CLUB = import.meta.env.VITE_SPORTLINK_CLUB_RELATIECODE
const ITEMS_PER_PAGE = 10
const PROGRAMMA_PER_PAGE = 16
const DUTCH_DAYS_SHORT = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']
const DUTCH_MONTHS_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const DUTCH_MONTHS_LONG = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
const DUTCH_DAYS_LONG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTodaySleutel() {
  return new Date().toISOString().slice(0, 10)
}

function isWeekendDag() {
  const d = new Date().getDay()
  return d === 0 || d === 6
}

function isVvzWedstrijd(w) {
  return (w.thuisteamclubrelatiecode === CLUB || w.uitteamclubrelatiecode === CLUB)
    && !!w.thuisteam && !!w.uitteam
    && w.uitteam !== 'N.N.B.' && w.thuisteam !== 'N.N.B.'
}

function getVvzNaam(w) {
  return w.thuisteamclubrelatiecode === CLUB ? w.thuisteam : w.uitteam
}

function getTegenstander(w) {
  return w.thuisteamclubrelatiecode === CLUB ? w.uitteam : w.thuisteam
}

function isThuiswedstrijd(w) {
  return w.thuisteamclubrelatiecode === CLUB
}

function getSpeeltype(w) {
  const acc = (w.accommodatie || '').toLowerCase()
  if (acc.includes('zaal')) return 'Zaal'
  const dag = w.wedstrijddatum ? new Date(w.wedstrijddatum).getDay() : null
  const uur = w.aanvangstijd ? parseInt(w.aanvangstijd.split(':')[0], 10) : null
  if (dag === 5 && uur !== null && uur >= 18) return '7x7'
  return 'Veld'
}

function isHuidigSpelend(w) {
  const vandaag = getTodaySleutel()
  if (!w.wedstrijddatum || w.wedstrijddatum.slice(0, 10) !== vandaag) return false
  if (!w.aanvangstijd) return false
  const now = new Date()
  const [h, m] = w.aanvangstijd.split(':').map(Number)
  const aanvang = new Date(now)
  aanvang.setHours(h, m, 0, 0)
  const einde = new Date(aanvang.getTime() + 90 * 60 * 1000)
  return now >= aanvang && now <= einde
}

function isNogTeSpelen(w) {
  const vandaag = getTodaySleutel()
  if (!w.wedstrijddatum || w.wedstrijddatum.slice(0, 10) !== vandaag) return false
  if (w.uitslag) return false
  if (!w.aanvangstijd) return true
  const now = new Date()
  const [h, m] = w.aanvangstijd.split(':').map(Number)
  const aanvang = new Date(now)
  aanvang.setHours(h, m, 0, 0)
  return now < aanvang
}

function formatDatumKort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00')
  return `${DUTCH_DAYS_SHORT[d.getDay()]} ${d.getDate()} ${DUTCH_MONTHS_SHORT[d.getMonth()]}`
}

function formatDatumLang(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00')
  return `${DUTCH_DAYS_LONG[d.getDay()]} ${d.getDate()} ${DUTCH_MONTHS_SHORT[d.getMonth()]}`
}

function formatDatumVolledig(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00')
  return `${DUTCH_DAYS_LONG[d.getDay()]} ${d.getDate()} ${DUTCH_MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`
}

function formatPeriodeVolledig(startStr, endStr) {
  if (!startStr) return ''
  const s = new Date(startStr.slice(0, 10) + 'T00:00:00')
  if (!endStr) return formatDatumVolledig(startStr)
  const e = new Date(endStr.slice(0, 10) + 'T00:00:00')
  const dagS = `${DUTCH_DAYS_LONG[s.getDay()]} ${s.getDate()}`
  const dagE = `${DUTCH_DAYS_LONG[e.getDay()]} ${e.getDate()}`
  const diffDagen = Math.round((e - s) / 86400000)
  const verbinding = diffDagen <= 1 ? 'en' : 't/m'
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${dagS} ${verbinding} ${dagE} ${DUTCH_MONTHS_LONG[e.getMonth()]} ${e.getFullYear()}`
  }
  return `${dagS} ${DUTCH_MONTHS_LONG[s.getMonth()]} ${verbinding} ${dagE} ${DUTCH_MONTHS_LONG[e.getMonth()]} ${e.getFullYear()}`
}

function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function kiesPoule(teamPoules) {
  if (!teamPoules.length) return null
  return [...teamPoules].sort((a, b) => {
    const s = (b.seizoen || '').localeCompare(a.seizoen || '')
    if (s !== 0) return s
    const ar = a.competitiesoort === 'regulier' ? 0 : 1
    const br = b.competitiesoort === 'regulier' ? 0 : 1
    return ar - br
  })[0]
}

function getComingZaterdag() {
  const now = new Date()
  const dag = now.getDay()
  const daysUntilSat = dag === 6 ? 0 : (6 - dag)
  const sat = new Date(now)
  sat.setDate(now.getDate() + daysUntilSat)
  return sat.toISOString().slice(0, 10)
}

function formatUitslag(uitslag, isThuisVvz) {
  if (!uitslag) return null
  const parts = uitslag.split('-').map(s => s.trim())
  if (parts.length !== 2) return null
  const [thuis, uit] = parts.map(Number)
  const vvzScore = isThuisVvz ? thuis : uit
  const tegScore = isThuisVvz ? uit : thuis
  return { vvzScore, tegScore, gewonnen: vvzScore > tegScore, gelijk: vvzScore === tegScore }
}

// Splits een array in pagina's van `size` items
function pagineer(items, size) {
  const pages = []
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size))
  }
  return pages.length ? pages : [[]]
}

// ─── Slide-componenten ───────────────────────────────────────────────────────

function PaginaLabel({ pagina, totaal }) {
  if (totaal <= 1) return null
  return (
    <span className="text-white/50 text-lg font-medium ml-3">
      {pagina}/{totaal}
    </span>
  )
}

function SlideNieuws({ item }) {
  if (!item) return null
  return (
    <div className="flex gap-10 h-full">
      {item.image_url && (
        <div className="flex-shrink-0 flex items-center justify-center" style={{ maxWidth: '40%' }}>
          <img
            src={item.image_url}
            alt=""
            className="max-w-full max-h-full object-contain rounded-2xl"
          />
        </div>
      )}
      <div className="flex flex-col justify-center flex-1">
        <p className="text-white/50 text-lg font-medium mb-3">
          {item.published_at ? formatDatumLang(item.published_at.slice(0, 10)) : ''}
        </p>
        <h2 className="text-4xl font-bold text-white leading-tight mb-5">{item.title}</h2>
        <p className="text-white/80 text-2xl leading-relaxed">
          {stripHtml(item.content).slice(0, 400)}
        </p>
      </div>
    </div>
  )
}

function SlideActiviteiten({ items }) {
  return (
    <div className="grid grid-cols-[auto_auto_auto_1fr] gap-x-10">
      {['Datum', 'Van', 'Tot', 'Activiteit'].map(kop => (
        <span key={kop} className="text-white/50 text-base uppercase tracking-widest pb-2">{kop}</span>
      ))}
      <span className="col-span-4 border-b border-white/30 mb-0" />
      {items.map(item => {
        const datum = item.date
          ? formatDatumVolledig(item.date)
          : item.dates_item
            ? formatDatumVolledig(item.dates_item)
            : item.date_start
              ? formatPeriodeVolledig(item.date_start, item.date_end)
              : ''
        const cel = 'py-3 flex items-center'
        return (
          <>
            <span key={`${item.id}-datum`} className={`text-emerald-200 font-medium text-xl whitespace-nowrap ${cel}`}>{datum}</span>
            <span key={`${item.id}-van`} className={`text-white/80 text-xl font-mono whitespace-nowrap ${cel}`}>{item.time_start ? item.time_start.slice(0, 5) : '–'}</span>
            <span key={`${item.id}-tot`} className={`text-white/80 text-xl font-mono whitespace-nowrap ${cel}`}>{item.time_end ? item.time_end.slice(0, 5) : '–'}</span>
            <span key={`${item.id}-titel`} className={`text-white text-xl ${cel}`}>{item.title}</span>
            <span key={`${item.id}-lijn`} className="col-span-4 border-b border-white/20" />
          </>
        )
      })}
    </div>
  )
}

function SpelTypeBadge({ w }) {
  const type = getSpeeltype(w)
  if (!type) return null
  return (
    <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-white/10 text-white/60 flex-shrink-0">
      {type}
    </span>
  )
}

function ProgrammaRij({ w }) {
  const isThuis = isThuiswedstrijd(w)
  return (
    <div className="flex items-center gap-4 py-3 border-b border-white/20">
      <span className="text-white/60 text-xl w-16 flex-shrink-0 font-mono">{w.aanvangstijd || '--:--'}</span>
      <div className="grid flex-1 min-w-0" style={{gridTemplateColumns: '1fr 6rem 1fr'}}>
        <span className={`text-xl text-right truncate pr-4 ${isThuis ? 'text-white font-bold' : 'text-white/80'}`}>{w.thuisteam}</span>
        <span className="text-white/40 text-lg text-center">vs</span>
        <span className={`text-xl truncate pl-4 ${!isThuis ? 'text-white font-bold' : 'text-white/80'}`}>{w.uitteam}</span>
      </div>
      <SpelTypeBadge w={w} />
      <span className="text-sm font-semibold tracking-widest w-14 text-right flex-shrink-0 text-white/70">
        {isThuis ? 'THUIS' : 'UIT'}
      </span>
    </div>
  )
}

function UitslagRij({ w }) {
  const isThuis = isThuiswedstrijd(w)
  const uitslag = w.uitslag ? formatUitslag(w.uitslag, isThuis) : null
  return (
    <div className="flex items-center gap-4 py-3 border-b border-white/20">
      <span className="text-white/60 text-xl w-16 flex-shrink-0 font-mono">{w.aanvangstijd || '--:--'}</span>
      <div className="grid flex-1 min-w-0" style={{gridTemplateColumns: '1fr 6rem 1fr'}}>
        <span className={`text-xl text-right truncate pr-4 ${isThuis ? 'text-white font-bold' : 'text-white/80'}`}>{w.thuisteam}</span>
        <span className="text-white/40 text-lg text-center">vs</span>
        <span className={`text-xl truncate pl-4 ${!isThuis ? 'text-white font-bold' : 'text-white/80'}`}>{w.uitteam}</span>
      </div>
      <SpelTypeBadge w={w} />
      {uitslag ? (
        <span className={`text-2xl font-bold w-16 text-center flex-shrink-0 ${
          uitslag.gewonnen ? 'text-emerald-200' : uitslag.gelijk ? 'text-white/70' : 'text-red-300'
        }`}>
          {w.uitslag}
        </span>
      ) : (
        <span className="text-white/30 text-2xl w-16 text-center flex-shrink-0">–</span>
      )}
      <span className="text-sm font-semibold tracking-widest w-14 text-right flex-shrink-0 text-white/70">
        {isThuis ? 'THUIS' : 'UIT'}
      </span>
    </div>
  )
}

function SlideAfgelastingen({ wedstrijden }) {
  return (
    <div>
      {wedstrijden.map(w => {
        const isThuis = isThuiswedstrijd(w)
        return (
          <div key={w.wedstrijdcode || `${w.thuisteam}-${w.uitteam}`} className="flex items-center gap-4 py-3 border-b border-white/20">
            <span className="text-white/60 text-xl w-16 flex-shrink-0 font-mono">{w.aanvangstijd || '--:--'}</span>
            <div className="grid flex-1 min-w-0" style={{gridTemplateColumns: '1fr 6rem 1fr'}}>
              <span className={`text-xl text-right truncate pr-4 ${isThuis ? 'text-white font-bold' : 'text-white/80'}`}>{w.thuisteam}</span>
              <span className="text-white/40 text-lg text-center">vs</span>
              <span className={`text-xl truncate pl-4 ${!isThuis ? 'text-white font-bold' : 'text-white/80'}`}>{w.uitteam}</span>
            </div>
            <span className="text-red-300 text-sm font-semibold tracking-widest flex-shrink-0">AFGELAST</span>
          </div>
        )
      })}
    </div>
  )
}

function SlideHuidigeWedstrijd({ wedstrijd }) {
  const w = wedstrijd
  const isThuis = isThuiswedstrijd(w)
  const veld = w.veldnummer || w.veld || null
  const locatie = w.accommodatie ? `${w.accommodatie}${veld ? ` · ${veld}` : ''}` : veld

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 text-center">
      <div className="flex items-center gap-3">
        <span className="w-5 h-5 bg-emerald-200 rounded-full animate-pulse" />
        <span className="text-white/70 font-mono text-3xl">{w.aanvangstijd}</span>
        {locatie && (
          <>
            <span className="text-white/30 text-2xl">·</span>
            <span className="text-emerald-200 text-2xl font-semibold">{locatie}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-8 w-full max-w-4xl">
        <div className={`flex-1 text-right ${isThuis ? '' : 'opacity-70'}`}>
          <p className="text-5xl font-bold text-white leading-tight">{w.thuisteam}</p>
          {isThuis && <p className="text-emerald-200 text-xl font-semibold mt-2 tracking-widest uppercase">Thuis</p>}
        </div>
        <span className="text-white/30 text-5xl font-light flex-shrink-0">vs</span>
        <div className={`flex-1 text-left ${!isThuis ? '' : 'opacity-70'}`}>
          <p className="text-5xl font-bold text-white leading-tight">{w.uitteam}</p>
          {!isThuis && <p className="text-emerald-200 text-xl font-semibold mt-2 tracking-widest uppercase">Thuis</p>}
        </div>
      </div>
    </div>
  )
}

function SlideStanden({ standenData }) {
  if (!standenData.length) return (
    <p className="text-white/50 text-xl text-center py-12">Geen standendata beschikbaar.</p>
  )
  const cols = standenData.length > 2 ? 'grid-cols-3' : standenData.length === 2 ? 'grid-cols-2' : 'grid-cols-1'
  return (
    <div className={`grid ${cols} gap-6 h-full`}>
      {standenData.map(({ teamnaam, stand }) => (
        <div key={teamnaam} className="bg-black/20 rounded-xl overflow-hidden">
          <div className="bg-black/20 px-4 py-3 border-b border-white/10">
            <h3 className="text-emerald-200 font-bold text-lg">{teamnaam}</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 text-xs uppercase bg-black/10">
                <th className="px-3 py-2 text-left w-6">#</th>
                <th className="px-3 py-2 text-left">Team</th>
                <th className="px-2 py-2 text-center w-8">G</th>
                <th className="px-2 py-2 text-center w-8">W</th>
                <th className="px-2 py-2 text-center w-8">V</th>
                <th className="px-2 py-2 text-center w-10 text-white/60">Pnt</th>
              </tr>
            </thead>
            <tbody>
              {stand.slice(0, 10).map((rij, i) => {
                const isVvz = (rij.teamnaam || '').toLowerCase().includes('vvz')
                return (
                  <tr key={i} className={`border-t border-white/10 ${isVvz ? 'bg-white/15' : ''}`}>
                    <td className="px-3 py-2 text-white/40 text-sm">{rij.positie ?? i + 1}</td>
                    <td className={`px-3 py-2 text-sm ${isVvz ? 'text-white font-bold' : 'text-white/80'}`}>
                      {rij.teamnaam}
                    </td>
                    <td className="px-2 py-2 text-center text-white/60 text-sm">{rij.gespeeld ?? rij.aantalgespeeldewedstrijden ?? '-'}</td>
                    <td className="px-2 py-2 text-center text-white/60 text-sm">{rij.gewonnen ?? '-'}</td>
                    <td className="px-2 py-2 text-center text-white/60 text-sm">{rij.verloren ?? '-'}</td>
                    <td className={`px-2 py-2 text-center font-bold text-sm ${isVvz ? 'text-emerald-200' : 'text-white'}`}>
                      {rij.punten ?? '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

function UitslagenKolom({ wedstrijden, showDatum }) {
  let prevDatum = null
  let eersteHeader = true
  return wedstrijden.map(w => {
    const datum = (w.wedstrijddatum || '').slice(0, 10)
    const nieuweDag = showDatum && datum !== prevDatum
    prevDatum = datum
    const isEerste = nieuweDag && eersteHeader
    if (nieuweDag) eersteHeader = false
    return (
      <div key={w.wedstrijdcode || `${w.thuisteam}-${w.uitteam}`}>
        {nieuweDag && (
          <h3 className={`text-white font-bold text-lg mb-1 capitalize ${isEerste ? '' : 'mt-10 pt-4'}`}>
            {formatDatumLang(datum)}
          </h3>
        )}
        <UitslagRij w={w} />
      </div>
    )
  })
}

function SlideUitslagenLijst({ wedstrijden, showDatum }) {
  return <UitslagenKolom wedstrijden={wedstrijden} showDatum={showDatum} />
}

function SlideProgrammaLijst({ wedstrijden }) {
  return (
    <div>
      {wedstrijden.map(w => (
        <ProgrammaRij key={w.wedstrijdcode || `${w.thuisteam}-${w.uitteam}`} w={w} />
      ))}
    </div>
  )
}

function KolomMetDagHeaders({ wedstrijden }) {
  let prevDatum = null
  let eersteHeader = true
  return wedstrijden.map(w => {
    const datum = (w.wedstrijddatum || '').slice(0, 10)
    const nieuweDag = datum !== prevDatum
    prevDatum = datum
    const isEerste = nieuweDag && eersteHeader
    if (nieuweDag) eersteHeader = false
    return (
      <div key={w.wedstrijdcode || `${w.thuisteam}-${w.uitteam}`}>
        {nieuweDag && (
          <h3 className={`text-white font-bold text-lg mb-1 capitalize ${isEerste ? '' : 'mt-10 pt-4'}`}>
            {formatDatumLang(datum)}
          </h3>
        )}
        <ProgrammaRij w={w} />
      </div>
    )
  })
}

function SlideProgrammaWeek({ wedstrijden }) {
  const helft = Math.ceil(wedstrijden.length / 2)
  const links = wedstrijden.slice(0, helft)
  const rechts = wedstrijden.slice(helft)
  return (
    <div className="grid grid-cols-2 gap-x-8 items-start">
      <div><KolomMetDagHeaders wedstrijden={links} /></div>
      <div><KolomMetDagHeaders wedstrijden={rechts} /></div>
    </div>
  )
}

// ─── Klok ────────────────────────────────────────────────────────────────────

function Klok() {
  const [tijd, setTijd] = useState('')
  useEffect(() => {
    function update() {
      const now = new Date()
      setTijd(now.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="text-4xl font-mono text-white/80 tabular-nums">{tijd}</span>
}

// ─── Hoofdpagina ─────────────────────────────────────────────────────────────

export default function TvSchermPage() {
  const [searchParams] = useSearchParams()

  const [config, setConfig] = useState(DEFAULT_INSTELLINGEN)
  const [nieuws, setNieuws] = useState([])
  const [knvbNieuws, setKnvbNieuws] = useState([])
  const [afgelastingen, setAfgelastingen] = useState([])
  const [activiteiten, setActiviteiten] = useState([])
  const [programma, setProgramma] = useState([])
  const [uitslagen, setUitslagen] = useState([])
  const [standenData, setStandenData] = useState([])
  const [geladen, setGeladen] = useState(false)

  // URL-parameter ?interval=N overschrijft de Supabase-instelling
  const intervalMs = useMemo(() => {
    const urlParam = searchParams.get('interval')
    const seconden = urlParam ? Math.max(5, Number(urlParam)) : config.interval_seconden
    return seconden * 1000
  }, [searchParams, config.interval_seconden])

  const [slideIdx, setSlideIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [contentHoogte, setContentHoogte] = useState(window.innerHeight - 200)

  const slidesRef = useRef([])
  const mainRef = useRef(null)

  useEffect(() => {
    if (!mainRef.current) return
    const observer = new ResizeObserver(entries => {
      const hoogte = entries[0]?.contentRect.height
      if (hoogte > 0) setContentHoogte(hoogte)
    })
    observer.observe(mainRef.current)
    return () => observer.disconnect()
  }, [])

  const dynamischItemsPerPagina = useMemo(() => {
    const RIJ_HOOGTE = 52
    const DAG_HEADER = 80
    const zonderHeaders = Math.max(4, Math.floor(contentHoogte / RIJ_HOOGTE))
    const metEenDagHeader = Math.max(4, Math.floor((contentHoogte - DAG_HEADER) / RIJ_HOOGTE))
    return { zonderHeaders, metEenDagHeader }
  }, [contentHoogte])

  function pagineerPerDag(wedstrijden, itemsPerPagina, naam, type, extraProps = {}) {
    const dagGroepen = {}
    wedstrijden.forEach(w => {
      const datum = (w.wedstrijddatum || '').slice(0, 10)
      if (!dagGroepen[datum]) dagGroepen[datum] = []
      dagGroepen[datum].push(w)
    })
    const slides = []
    Object.entries(dagGroepen).forEach(([datum, items]) => {
      pagineer(items, itemsPerPagina).forEach((pagina, i) => {
        if (pagina.length > 0) {
          const dagPaginas = Math.ceil(items.length / itemsPerPagina)
          slides.push({
            datum,
            wedstrijden: pagina,
            paginaBinnenDag: i + 1,
            totaalBinnenDag: dagPaginas,
            ...extraProps,
            hoofdtitel: naam,
            type,
          })
        }
      })
    })
    return slides
  }

  // ── Data laden ──────────────────────────────────────────────────────────────

  const laadStanden = useCallback(async (vandaagProgramma, teams) => {
    const vvzTeamsVandaag = vandaagProgramma
      .filter(w => w.thuisteamclubrelatiecode === CLUB || w.uitteamclubrelatiecode === CLUB)
      .map(w => w.thuisteamclubrelatiecode === CLUB ? w.thuisteam : w.uitteam)

    const uniekTeams = [...new Set(vvzTeamsVandaag)]
    const perTeamcode = new Map()
    for (const t of teams) {
      if (!t.teamcode) continue
      if (!perTeamcode.has(t.teamcode)) perTeamcode.set(t.teamcode, [])
      perTeamcode.get(t.teamcode).push(t)
    }
    const teamcodeLookup = new Map()
    for (const t of teams) {
      if (t.teamnaam && t.teamcode) teamcodeLookup.set(t.teamnaam, t.teamcode)
    }
    const teamcodesVandaag = [...new Set(
      uniekTeams.map(naam => teamcodeLookup.get(naam)).filter(Boolean)
    )]
    const teamcodesMetMeerderePoules = teamcodesVandaag
      .filter(tc => (perTeamcode.get(tc) || []).length > 1)
    const programmaResultaten = await Promise.all(
      teamcodesMetMeerderePoules.map(tc =>
        getTeamProgramma(tc).then(r => ({ tc, data: r.data ?? [] }))
      )
    )
    const programmaPerTeamcode = new Map()
    for (const { tc, data } of programmaResultaten) programmaPerTeamcode.set(tc, data)

    const selectieMap = {}
    for (const teamcode of teamcodesVandaag) {
      const poules = perTeamcode.get(teamcode) || []
      const teamProgramma = programmaPerTeamcode.get(teamcode) ?? []
      const gekozen = kiesPouleViaWedstrijd(poules, teamProgramma) || kiesPoule(poules)
      if (gekozen?.poulecode) selectieMap[teamcode] = gekozen.poulecode
    }
    const uniekePoulecodes = [...new Set(Object.values(selectieMap))]
    const results = await Promise.all(
      uniekePoulecodes.map(pc => getPoulestand(pc).then(r => ({ pc, data: r.data ?? [] })))
    )
    const standenMap = {}
    for (const { pc, data } of results) standenMap[pc] = data

    const standenLijst = teamcodesVandaag
      .map(tc => {
        const poulecode = selectieMap[tc]
        if (!poulecode) return null
        const naam = uniekTeams.find(n => teamcodeLookup.get(n) === tc) || tc
        return { teamnaam: naam, stand: standenMap[poulecode] ?? [] }
      })
      .filter(Boolean)
      .filter(s => s.stand.length > 0)

    setStandenData(standenLijst)
  }, [])

  const laadAlleData = useCallback(async () => {
    const [nieuwsRes, actRes, progRes, uitRes, teamsRes, configRes, knvbRes, afgelastRes] = await Promise.all([
      fetchPublicNewsItems(10),
      fetchActivities({ hidePast: true }),
      getProgramma(),
      getUitslagen(),
      getTeams(),
      fetchTvInstellingen(),
      fetchKnvbNieuws(),
      getAfgelastingen(),
    ])
    setConfig(configRes)
    const prog = progRes.data ?? []
    const teams = teamsRes.data ?? []
    setNieuws(nieuwsRes.data ?? [])
    setKnvbNieuws(knvbRes)
    const afgelastData = (afgelastRes.data ?? []).filter(w =>
      (w.thuisteamclubrelatiecode === CLUB || w.uitteamclubrelatiecode === CLUB) && w.thuisteam && w.uitteam
    )
    setAfgelastingen(afgelastData)
    const gesorteerdeActiviteiten = (actRes.data ?? [])
      .sort((a, b) => {
        const datumA = a.sort_date || ''
        const datumB = b.sort_date || ''
        if (datumA !== datumB) return datumA.localeCompare(datumB)
        const vanA = a.time_start || ''
        const vanB = b.time_start || ''
        if (vanA !== vanB) return vanA.localeCompare(vanB)
        const totA = a.time_end || ''
        const totB = b.time_end || ''
        return totA.localeCompare(totB)
      })
      .slice(0, 40)
    setActiviteiten(gesorteerdeActiviteiten)
    setProgramma(prog)
    setUitslagen(uitRes.data ?? [])
    setGeladen(true)

    if (isWeekendDag()) {
      const vandaag = getTodaySleutel()
      const vandaagProg = prog.filter(w => (w.wedstrijddatum || '').slice(0, 10) === vandaag)
      laadStanden(vandaagProg, teams)
    }
  }, [laadStanden])

  useEffect(() => {
    laadAlleData()
    const refreshId = setInterval(laadAlleData, 5 * 60 * 1000)
    return () => clearInterval(refreshId)
  }, [laadAlleData])

  // ── Dia-berekening ──────────────────────────────────────────────────────────

  const vandaag = getTodaySleutel()
  const weekend = isWeekendDag()

  const huidigeWedstrijden = useMemo(() =>
    programma.filter(w => isThuiswedstrijd(w) && isHuidigSpelend(w)),
  [programma])

  const uitslagenVandaag = useMemo(() =>
    uitslagen.filter(w => isVvzWedstrijd(w) && (w.wedstrijddatum || '').slice(0, 10) === vandaag),
  [uitslagen, vandaag])

  const nogTeSpelen = useMemo(() =>
    programma.filter(w => isVvzWedstrijd(w) && isNogTeSpelen(w)),
  [programma])

  const programmaDezeWeek = useMemo(() => {
    const satSleutel = getComingZaterdag()
    return programma.filter(w =>
      isVvzWedstrijd(w) &&
      (w.wedstrijddatum || '').slice(0, 10) >= vandaag &&
      (w.wedstrijddatum || '').slice(0, 10) <= satSleutel
    )
  }, [programma, vandaag])

  const uitslagenDezeWeek = useMemo(() => {
    const weekGeleden = new Date()
    weekGeleden.setDate(weekGeleden.getDate() - 7)
    const weekGeledenSleutel = weekGeleden.toISOString().slice(0, 10)
    return uitslagen.filter(w =>
      isVvzWedstrijd(w) &&
      (w.wedstrijddatum || '').slice(0, 10) >= weekGeledenSleutel &&
      (w.wedstrijddatum || '').slice(0, 10) <= vandaag
    )
  }, [uitslagen, vandaag])

  // Bouw de dia-lijst op — lange lijsten worden gesplitst in pagina's
  const slides = useMemo(() => {
    if (!geladen) return []
    const s = config.slides

    // Bouw groepen: elke groep is een reeks slides die bij elkaar horen
    // (zelfde dag of zelfde onderwerp). Nieuws wordt tussen groepen ingevoegd.
    const groepen = []

    if (s.activiteiten) {
      const actPaginas = pagineer(activiteiten, ITEMS_PER_PAGE).filter(p => p.length > 0)
      if (actPaginas.length > 0) {
        groepen.push(actPaginas.map((pagina, i) => ({
          id: `activiteiten-${i}`,
          hoofdtitel: 'Activiteiten',
          type: 'activiteiten',
          items: pagina,
          paginaBinnenDag: i + 1,
          totaalBinnenDag: actPaginas.length,
        })))
      }
    }

    if (s.huidige_wedstrijden) {
      const totaal = huidigeWedstrijden.length
      huidigeWedstrijden.forEach((w, i) => {
        groepen.push([{
          id: `huidige-${i}`,
          hoofdtitel: "Wordt nu gespeeld bij VVZ'49",
          paginaBinnenDag: i + 1,
          totaalBinnenDag: totaal,
          type: 'huidige',
          wedstrijd: w,
        }])
      })
    }

    if (s.afgelastingen && afgelastingen.length > 0) {
      pagineerPerDag(afgelastingen, dynamischItemsPerPagina.zonderHeaders, 'Afgelastingen', 'afgelastingen', { showDatum: false })
        .forEach((slide, i) => {
          const groep = groepen.find(g => g[0].id?.toString().startsWith('afgelastingen-') && g[0].datum === slide.datum)
          if (groep) groep.push({ id: `afgelastingen-${i}`, ...slide })
          else groepen.push([{ id: `afgelastingen-${i}`, ...slide }])
        })
    }

    if (s.nog_te_spelen) {
      pagineerPerDag(nogTeSpelen, dynamischItemsPerPagina.zonderHeaders, 'Programma van vandaag', 'nog-te-spelen', { showDatum: false })
        .forEach((slide, i) => {
          // Slides van dezelfde dag groeperen
          const groep = groepen.find(g => g[0].id?.toString().startsWith('nog-te-spelen-') && g[0].datum === slide.datum)
          if (groep) groep.push({ id: `nog-te-spelen-${i}`, ...slide })
          else groepen.push([{ id: `nog-te-spelen-${i}`, ...slide }])
        })
    }

    if (s.uitslagen_vandaag) {
      pagineerPerDag(uitslagenVandaag, dynamischItemsPerPagina.zonderHeaders, 'Uitslagen van vandaag', 'uitslagen', { showDatum: false })
        .forEach((slide, i) => {
          const groep = groepen.find(g => g[0].id?.toString().startsWith('uitslagen-') && g[0].datum === slide.datum)
          if (groep) groep.push({ id: `uitslagen-${i}`, ...slide })
          else groepen.push([{ id: `uitslagen-${i}`, ...slide }])
        })
    }

    if (s.programma_week) {
      pagineerPerDag(programmaDezeWeek, dynamischItemsPerPagina.metEenDagHeader, 'Programma deze week', 'programma-week', { showDatum: false })
        .forEach((slide, i) => {
          const groep = groepen.find(g => g[0].id?.toString().startsWith('programma-week-') && g[0].datum === slide.datum)
          if (groep) groep.push({ id: `programma-week-${i}`, ...slide })
          else groepen.push([{ id: `programma-week-${i}`, ...slide }])
        })
    }

    if (s.uitslagen_week) {
      pagineerPerDag(uitslagenDezeWeek, dynamischItemsPerPagina.metEenDagHeader, 'Uitslagen deze week', 'uitslagen', { showDatum: false })
        .forEach((slide, i) => {
          const groep = groepen.find(g => g[0].id?.toString().startsWith('uitslagen-week-') && g[0].datum === slide.datum)
          if (groep) groep.push({ id: `uitslagen-week-${i}`, ...slide })
          else groepen.push([{ id: `uitslagen-week-${i}`, ...slide }])
        })
    }

    // Nieuwsgroepen gelijkmatig tussen de andere groepen invoegen
    const vvzAantal = config.nieuws_aantal?.vvz ?? 3
    const knvbAantal = config.nieuws_aantal?.knvb ?? 3
    {
      const nieuwsSlides = [
        ...(s.vvz_nieuws ? nieuws.slice(0, vvzAantal).map((item, i) => [{ id: `nieuws-${i}`, hoofdtitel: "VVZ'49 Club Nieuws", type: 'nieuws', item }]) : []),
        ...(s.knvb_nieuws ? knvbNieuws.slice(0, knvbAantal).map((item, i) => [{
          id: `knvb-nieuws-${i}`, hoofdtitel: 'KNVB Nieuws', type: 'nieuws', item: {
            id: `knvb-${i}`,
            title: item.title,
            content: item.description,
            image_url: item.image,
            published_at: item.pubDate ? new Date(item.pubDate).toISOString().slice(0, 10) : null,
          },
        }]) : []),
      ]
      if (nieuwsSlides.length > 0 && groepen.length > 0) {
        const stap = Math.max(1, Math.floor(groepen.length / nieuwsSlides.length))
        nieuwsSlides.forEach((groep, i) => groepen.splice(stap * i + i, 0, groep))
      } else {
        nieuwsSlides.forEach(groep => groepen.push(groep))
      }
    }

    return groepen.flat()
  }, [geladen, config.slides, config.nieuws_aantal, dynamischItemsPerPagina, nieuws, knvbNieuws, afgelastingen, activiteiten, huidigeWedstrijden, uitslagenVandaag, nogTeSpelen, programmaDezeWeek, uitslagenDezeWeek])

  useEffect(() => { slidesRef.current = slides }, [slides])

  // ── Rotatie + progressbalk ──────────────────────────────────────────────────

  useEffect(() => {
    if (slides.length === 0) return
    const startTime = Date.now()

    const progressId = setInterval(() => {
      const elapsed = Date.now() - startTime
      setProgress((elapsed % intervalMs) / intervalMs)
    }, 50)

    const rotateId = setInterval(() => {
      setProgress(0)
      setSlideIdx(prev => (prev + 1) % (slidesRef.current.length || 1))
    }, intervalMs)

    return () => {
      clearInterval(progressId)
      clearInterval(rotateId)
    }
  }, [slides.length, intervalMs])

  useEffect(() => {
    if (slides.length > 0 && slideIdx >= slides.length) setSlideIdx(0)
  }, [slides.length, slideIdx])

  // ── Keyboard navigatie ──────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight') setSlideIdx(prev => (prev + 1) % (slidesRef.current.length || 1))
      if (e.key === 'ArrowLeft') setSlideIdx(prev => (prev - 1 + slidesRef.current.length) % (slidesRef.current.length || 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────────

  const slide = slides[slideIdx] ?? null

  function renderDia() {
    if (!slide) return null
    switch (slide.type) {
      case 'nieuws':
        return <SlideNieuws item={slide.item} />
      case 'activiteiten':
        return <SlideActiviteiten items={slide.items} />
      case 'huidige':
        return <SlideHuidigeWedstrijd wedstrijd={slide.wedstrijd} />
      case 'standen':
        return <SlideStanden standenData={standenData} />
      case 'uitslagen':
        return <SlideUitslagenLijst wedstrijden={slide.wedstrijden} showDatum={slide.showDatum} />
      case 'nog-te-spelen':
        return <SlideProgrammaLijst wedstrijden={slide.wedstrijden} />
      case 'programma-week':
        return <SlideProgrammaLijst wedstrijden={slide.wedstrijden} />
      case 'afgelastingen':
        return <SlideAfgelastingen wedstrijden={slide.wedstrijden} />
      default:
        return null
    }
  }

  if (!geladen) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#2E7D32' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    )
  }

  const hoofdtitel = slide?.hoofdtitel ?? ''
  const heeftDatum = !!slide?.datum
  const heeftPaginering = (slide?.totaalBinnenDag ?? 0) > 1
  const subLabel = [
    heeftDatum ? formatDatumLang(slide.datum) : null,
    heeftPaginering ? `(${slide.paginaBinnenDag}/${slide.totaalBinnenDag})` : null,
  ].filter(Boolean).join(' ')

  return (
    <div className="min-h-screen text-white flex flex-col select-none overflow-hidden" style={{ backgroundColor: '#2E7D32' }}>

      {/* Header */}
      <header className="flex items-center justify-between px-10 py-5 flex-shrink-0 bg-black/10">
        <img
          src={`${import.meta.env.BASE_URL}logo-vvz.png`}
          alt="VVZ'49"
          className="h-14"
        />
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white tracking-wide leading-tight">{hoofdtitel}</h1>
          {subLabel && (
            <p className="text-xl text-white/60 mt-0.5 capitalize">{subLabel}</p>
          )}
        </div>
        <Klok />
      </header>

      {/* Dia-inhoud */}
      <main ref={mainRef} className="flex-1 px-10 py-6 overflow-hidden">
        {renderDia()}
      </main>

      {/* Footer: dots + progressbalk */}
      <footer className="px-10 pb-6 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3 justify-center flex-wrap">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setSlideIdx(i)}
              className={`rounded-full transition-all ${
                i === slideIdx
                  ? 'w-8 h-3 bg-white'
                  : 'w-3 h-3 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
        <div className="h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </footer>
    </div>
  )
}
