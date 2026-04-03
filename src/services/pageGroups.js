/*
-- Voer dit uit in Supabase SQL editor:
-- CREATE TABLE page_groups (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name TEXT NOT NULL,
--   slug TEXT NOT NULL UNIQUE,
--   position INTEGER NOT NULL DEFAULT 0,
--   created_at TIMESTAMPTZ DEFAULT now(),
--   updated_at TIMESTAMPTZ DEFAULT now()
-- );
-- CREATE INDEX idx_page_groups_position ON page_groups (position);
-- ALTER TABLE page_groups ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Publiek lezen" ON page_groups FOR SELECT USING (true);
-- CREATE POLICY "Beheerders schrijven" ON page_groups FOR INSERT TO authenticated WITH CHECK (true);
-- CREATE POLICY "Beheerders wijzigen" ON page_groups FOR UPDATE TO authenticated USING (true);
-- CREATE POLICY "Beheerders verwijderen" ON page_groups FOR DELETE TO authenticated USING (true);
--
-- ALTER TABLE pages ADD COLUMN group_id UUID REFERENCES page_groups(id) ON DELETE SET NULL;
-- ALTER TABLE pages ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
-- CREATE INDEX idx_pages_group ON pages (group_id, position);
--
-- ALTER TABLE menu_items DROP CONSTRAINT menu_items_type_check;
-- ALTER TABLE menu_items ADD CONSTRAINT menu_items_type_check CHECK (type IN ('group', 'page', 'tool', 'external', 'page_group'));
-- ALTER TABLE menu_items ADD COLUMN page_group_id UUID REFERENCES page_groups(id) ON DELETE SET NULL;
*/

import { supabase } from '../lib/supabaseClient'

export async function fetchPageGroups() {
  const { data, error } = await supabase
    .from('page_groups')
    .select('*')
    .order('position', { ascending: true })
  return { data, error }
}

export async function createPageGroup({ name, slug, position }) {
  const { data, error } = await supabase
    .from('page_groups')
    .insert({ name, slug, position: position ?? 0 })
    .select()
    .single()
  return { data, error }
}

export async function updatePageGroup(id, updates) {
  const { data, error } = await supabase
    .from('page_groups')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function deletePageGroup(id) {
  const { data, error } = await supabase
    .from('page_groups')
    .delete()
    .eq('id', id)
  return { data, error }
}

export async function reorderPageGroups(items) {
  const results = await Promise.all(
    items.map(({ id, position }) =>
      supabase
        .from('page_groups')
        .update({ position, updated_at: new Date().toISOString() })
        .eq('id', id)
    )
  )
  const error = results.find(r => r.error)?.error || null
  return { data: !error, error }
}
