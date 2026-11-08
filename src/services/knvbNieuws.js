import { apiFetch } from './sportlink'
import { getApiBase } from '../lib/apiBase'

// KNVB-nieuws via de Quarkus-server; met retries voor de koude start van Render.
// Fout of geen array geeft []. De optionele opties zijn voor tests.
export async function fetchKnvbNieuws({ base = getApiBase(), ...opties } = {}) {
  if (!base) return []
  const { data, error } = await apiFetch('/api/knvb-nieuws', { ...opties, baseUrl: base })
  if (error) return []
  return Array.isArray(data) ? data : []
}
