import { supabase } from '../lib/supabaseClient'

const BUCKET = 'documents'

/**
 * Alle documenten ophalen, gesorteerd op sort_order (oplopend), dan created_at.
 */
export async function fetchDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  return { data, error }
}

/**
 * Publieke URL ophalen voor een bestandspad in de documents-bucket.
 */
export function getDocumentPublicUrl(filePath) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath)
  return data?.publicUrl ?? null
}

/**
 * Upload een bestand naar de documents-bucket en maak een document-record aan.
 * @param {File} file - Het bestand om te uploaden
 * @param {string} title - Titel voor het document
 */
export async function uploadDocument(file, title) {
  if (!file) return { data: null, error: new Error('Geen bestand opgegeven') }

  // Genereer uniek pad: <timestamp>-<random>.<ext>
  const dot = file.name.lastIndexOf('.')
  const ext = dot >= 0 ? file.name.slice(dot + 1) : ''
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, '')
  const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt ? '.' + safeExt : ''}`

  // Upload naar storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      contentType: file.type || undefined,
      upsert: false,
    })

  if (uploadError) return { data: null, error: uploadError }

  // Bepaal volgend sort_order: onderaan plaatsen
  const { data: existing } = await supabase
    .from('documents')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

  // Insert record in tabel
  const { data, error } = await supabase
    .from('documents')
    .insert({
      title: title?.trim() || file.name,
      file_path: filePath,
      file_name: file.name,
      file_size: file.size ?? null,
      mime_type: file.type || null,
      sort_order: nextOrder,
    })
    .select()
    .single()

  // Als insert faalt: storage weer opschonen
  if (error) {
    await supabase.storage.from(BUCKET).remove([filePath])
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Document verwijderen uit storage en tabel.
 */
export async function deleteDocument(id, filePath) {
  if (filePath) {
    await supabase.storage.from(BUCKET).remove([filePath])
  }
  const { data, error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)
  return { data, error }
}

/**
 * Document bijwerken (titel, sort_order). Bestandsinhoud wordt niet gewijzigd.
 */
export async function updateDocument(id, updates) {
  const { data, error } = await supabase
    .from('documents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

/**
 * Formatteer bestandsgrootte in een leesbare vorm (B / KB / MB).
 */
export function formatFileSize(bytes) {
  if (bytes == null || isNaN(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
