// Voer dit uit in Supabase SQL editor:
// CREATE TABLE pages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, content TEXT, published_at TIMESTAMPTZ DEFAULT now(), expires_at TIMESTAMPTZ, og_title TEXT, og_description TEXT, og_image_url TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
// CREATE INDEX idx_pages_slug ON pages (slug);
// ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Publiek lezen" ON pages FOR SELECT USING (published_at <= now() AND (expires_at IS NULL OR expires_at > now()));
// CREATE POLICY "Beheerders lezen alles" ON pages FOR SELECT TO authenticated USING (true);
// CREATE POLICY "Beheerders schrijven" ON pages FOR INSERT TO authenticated WITH CHECK (true);
// CREATE POLICY "Beheerders wijzigen" ON pages FOR UPDATE TO authenticated USING (true);
// CREATE POLICY "Beheerders verwijderen" ON pages FOR DELETE TO authenticated USING (true);
// Storage bucket aanmaken en policies instellen in Supabase:
// 1. Ga naar Storage → New bucket → naam: page-images → zet Public bucket AAN
// 2. Voer daarna deze policies uit in de SQL editor:
// CREATE POLICY "Publiek lezen storage" ON storage.objects FOR SELECT USING (bucket_id = 'page-images');
// CREATE POLICY "Beheerders uploaden" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'page-images');
// CREATE POLICY "Beheerders verwijderen storage" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'page-images');
// CREATE POLICY "Beheerders updaten storage" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'page-images');

import { supabase } from '../lib/supabaseClient'

export async function fetchAllPages() {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function fetchPageBySlug(slug) {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .lte('published_at', new Date().toISOString())
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
    .single()
  return { data, error }
}

export async function fetchPageById(id) {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

export async function createPage(pageData) {
  const { data, error } = await supabase
    .from('pages')
    .insert(pageData)
    .select()
    .single()
  return { data, error }
}

export async function updatePage(id, updates) {
  const { data, error } = await supabase
    .from('pages')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deletePage(id) {
  // Haal eerst de pagina op om afbeeldingen te kunnen verwijderen
  const { data: page } = await supabase.from('pages').select('content').eq('id', id).single()
  if (page?.content) {
    const paths = extractImagePaths(page.content)
    if (paths.length > 0) {
      await supabase.storage.from('page-images').remove(paths)
    }
  }
  const { data, error } = await supabase.from('pages').delete().eq('id', id)
  return { data, error }
}

function extractImagePaths(html) {
  const matches = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)]
  return matches
    .map(m => m[1])
    .filter(url => url.includes('/page-images/'))
    .map(url => url.split('/page-images/').pop().split('?')[0])
}

export async function uploadPageImage(file) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
  const filePath = fileName

  const { error: uploadError } = await supabase.storage
    .from('page-images')
    .upload(filePath, file)

  if (uploadError) return { data: null, error: uploadError }

  const { data } = supabase.storage
    .from('page-images')
    .getPublicUrl(filePath)

  return { data: { url: data.publicUrl, path: filePath }, error: null }
}

export async function deletePageImage(path) {
  const { data, error } = await supabase.storage
    .from('page-images')
    .remove([path])
  return { data, error }
}
