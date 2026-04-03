// Voer dit uit in Supabase SQL editor:
// CREATE TABLE news_items (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   title TEXT NOT NULL,
//   slug TEXT NOT NULL UNIQUE,
//   intro TEXT,
//   content TEXT,
//   image_url TEXT,
//   image_path TEXT,
//   published_at TIMESTAMPTZ DEFAULT now(),
//   expires_at TIMESTAMPTZ,
//   created_at TIMESTAMPTZ DEFAULT now(),
//   updated_at TIMESTAMPTZ DEFAULT now()
// );
// CREATE INDEX idx_news_items_slug ON news_items (slug);
// CREATE INDEX idx_news_items_published_at ON news_items (published_at DESC);
// ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Publiek lezen" ON news_items FOR SELECT USING (published_at IS NOT NULL AND published_at <= now() AND (expires_at IS NULL OR expires_at > now()));
// CREATE POLICY "Beheerders lezen alles" ON news_items FOR SELECT TO authenticated USING (true);
// CREATE POLICY "Beheerders schrijven" ON news_items FOR INSERT TO authenticated WITH CHECK (true);
// CREATE POLICY "Beheerders wijzigen" ON news_items FOR UPDATE TO authenticated USING (true);
// CREATE POLICY "Beheerders verwijderen" ON news_items FOR DELETE TO authenticated USING (true);

import { supabase } from '../lib/supabaseClient'
import { deletePageImage } from './pages'

// Alle items ophalen (beheer) — inclusief verlopen/concept
export async function fetchAllNewsItems() {
  const { data, error } = await supabase
    .from('news_items')
    .select('*')
    .order('published_at', { ascending: false })
  return { data, error }
}

// Publieke items ophalen (gefilterd door RLS)
// Optioneel: limit voor homepage sidebar
export async function fetchPublicNewsItems(limit = null) {
  let query = supabase
    .from('news_items')
    .select('id, title, slug, intro, image_url, published_at')
    .order('published_at', { ascending: false })
  if (limit) query = query.limit(limit)
  const { data, error } = await query
  return { data, error }
}

// Enkel item ophalen via slug (publiek, RLS filtert)
export async function fetchNewsItemBySlug(slug) {
  const { data, error } = await supabase
    .from('news_items')
    .select('*')
    .eq('slug', slug)
    .single()
  return { data, error }
}

// Enkel item ophalen via id (beheer)
export async function fetchNewsItemById(id) {
  const { data, error } = await supabase
    .from('news_items')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

// Aanmaken
export async function createNewsItem(itemData) {
  const { data, error } = await supabase
    .from('news_items')
    .insert(itemData)
    .select()
    .single()
  return { data, error }
}

// Bijwerken
export async function updateNewsItem(id, updates) {
  const { data, error } = await supabase
    .from('news_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

// Verwijderen (inclusief afbeelding cleanup)
export async function deleteNewsItem(id) {
  // Haal item op voor image cleanup
  const { data: item } = await supabase
    .from('news_items')
    .select('content, image_path')
    .eq('id', id)
    .single()

  // Verwijder nieuwsafbeelding
  if (item?.image_path) {
    await deletePageImage(item.image_path)
  }

  // Verwijder inline afbeeldingen uit content
  if (item?.content) {
    const paths = extractImagePaths(item.content)
    if (paths.length > 0) {
      await supabase.storage.from('page-images').remove(paths)
    }
  }

  const { data, error } = await supabase
    .from('news_items')
    .delete()
    .eq('id', id)
  return { data, error }
}

// Helper: extracteer storage paden uit TipTap HTML
function extractImagePaths(html) {
  const matches = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)]
  return matches
    .filter(m => m[1].includes('/page-images/'))
    .map(m => m[1].split('/page-images/').pop().split('?')[0])
}
