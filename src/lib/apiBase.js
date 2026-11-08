// Gedeelde base-url van de Quarkus-server (Render) voor /api/... endpoints
// (kaart thewally/ontwikkelstraat#64).

const SPORTLINK_PAD = '/api/sportlink'

function zonderSlashAchteraan(s) {
  return s.replace(/\/+$/, '')
}

// Zuivere functie (testbaar zonder Vite). Volgorde:
// 1. apiUrl (VITE_API_URL): root van de service, bijvoorbeeld https://x.onrender.com
// 2. sportlinkProxyUrl (VITE_SPORTLINK_PROXY_URL) die op /api/sportlink eindigt, zonder dat stuk
// Anders: lege string (geen bruikbare base).
export function bepaalApiBase({ apiUrl, sportlinkProxyUrl } = {}) {
  const api = typeof apiUrl === 'string' ? zonderSlashAchteraan(apiUrl.trim()) : ''
  if (api) return api
  const proxy = typeof sportlinkProxyUrl === 'string' ? zonderSlashAchteraan(sportlinkProxyUrl.trim()) : ''
  if (proxy.endsWith(SPORTLINK_PAD)) return proxy.slice(0, -SPORTLINK_PAD.length)
  return ''
}

// Zuivere url-opbouw: base + pad. Zonder base blijft het pad relatief (de aanroep faalt dan netjes).
export function bouwApiUrl(base, pad) {
  return `${base}${pad}`
}

export function getApiBase() {
  const base = bepaalApiBase({
    apiUrl: import.meta.env.VITE_API_URL,
    sportlinkProxyUrl: import.meta.env.VITE_SPORTLINK_PROXY_URL,
  })
  if (!base) {
    console.error('Geen API-base-url: zet VITE_API_URL (of VITE_SPORTLINK_PROXY_URL die eindigt op /api/sportlink).')
  }
  return base
}

export function apiUrl(pad) {
  return bouwApiUrl(getApiBase(), pad)
}

export function imageProxyUrl(base, url) {
  return bouwApiUrl(base, `/api/image-proxy?url=${encodeURIComponent(url)}`)
}

export function teamIcalUrl(base, teamcode) {
  return bouwApiUrl(base, `/api/team-ical?teamcode=${encodeURIComponent(teamcode)}`)
}

// https:// wordt webcal://; een http://-url (dev) blijft ongewijzigd.
export function webcalUrl(httpsUrl) {
  return httpsUrl.replace(/^https:/i, 'webcal:')
}
