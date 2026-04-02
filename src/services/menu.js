/*
-- Voer dit uit in Supabase SQL editor:
-- CREATE TABLE menu_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), parent_id UUID REFERENCES menu_items(id) ON DELETE CASCADE, label TEXT NOT NULL, type TEXT NOT NULL CHECK (type IN ('group', 'page', 'tool', 'external')), page_id UUID REFERENCES pages(id) ON DELETE SET NULL, tool_route TEXT, external_url TEXT, position INTEGER NOT NULL DEFAULT 0, is_visible BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
-- CREATE INDEX idx_menu_items_parent ON menu_items (parent_id, position);
-- ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Iedereen leest zichtbare items" ON menu_items FOR SELECT USING (is_visible = true);
-- CREATE POLICY "Beheerders lezen alles" ON menu_items FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "Beheerders CRUD" ON menu_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- CREATE TABLE quick_links (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), label TEXT NOT NULL, type TEXT NOT NULL CHECK (type IN ('page', 'tool', 'external')), page_id UUID REFERENCES pages(id) ON DELETE SET NULL, tool_route TEXT, external_url TEXT, position INTEGER NOT NULL DEFAULT 0, is_visible BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
-- CREATE INDEX idx_quick_links_position ON quick_links (position);
-- ALTER TABLE quick_links ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Iedereen leest zichtbare quick links" ON quick_links FOR SELECT USING (is_visible = true);
-- CREATE POLICY "Beheerders CRUD" ON quick_links FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fase 3: kolommen toevoegen aan quick_links:
-- ALTER TABLE quick_links ADD COLUMN description TEXT;
-- ALTER TABLE quick_links ADD COLUMN icon TEXT;
-- ALTER TABLE quick_links ADD COLUMN show_on_home BOOLEAN NOT NULL DEFAULT false;
*/

import { supabase } from '../lib/supabaseClient'

/**
 * Beschikbare tools (hardcoded routes die als menu-item geselecteerd kunnen worden)
 */
export const AVAILABLE_TOOLS = [
  { label: 'Activiteiten', route: '/activiteiten' },
  { label: 'Trainingsschema', route: '/trainingsschema' },
  { label: 'Veldindeling', route: '/trainingsschema/veldindeling' },
  { label: 'Programma', route: '/wedstrijden/programma' },
  { label: 'Uitslagen', route: '/wedstrijden/uitslagen' },
  { label: 'Afgelastingen', route: '/wedstrijden/afgelastingen' },
  { label: 'Wedstrijdverslagen', route: '/wedstrijden/verslagen' },
  { label: 'Topscorers & Keeperstrofee', route: '/wedstrijden/topscorers' },
  { label: 'Senioren', route: '/teams/senioren' },
  { label: 'Veteranen', route: '/teams/veteranen' },
  { label: 'Junioren', route: '/teams/junioren' },
  { label: 'Pupillen', route: '/teams/pupillen' },
  { label: 'Zaalvoetbal', route: '/teams/zaalvoetbal' },
  { label: 'Sponsors', route: '/sponsors' },
  { label: 'Sponsor worden?', route: '/sponsoring/sponsor-worden' },
  { label: 'Plattegrond', route: '/plattegrond' },
  { label: 'Huisstijl', route: '/huistijl' },
  { label: 'Historie', route: '/club/historie' },
  { label: 'Ereleden', route: '/club/ereleden' },
  { label: 'Reglementen', route: '/club/reglementen' },
  { label: 'Lid worden?', route: '/lid-worden' },
  { label: 'Contributie', route: '/lidmaatschap/contributie' },
  { label: 'Vrijwilliger worden?', route: '/vrijwilliger' },
  { label: 'Contactgegevens', route: '/contact/gegevens' },
  { label: 'Locatie & Routebeschrijving', route: '/contact/locatie' },
  { label: 'Wie doet wat?', route: '/contact/wie-doet-wat' },
  { label: 'Techniektrainingen', route: '/techniektrainingen' },
  { label: 'Nieuws', route: '/nieuws' },
]

/**
 * Retourneert de hardcoded AVAILABLE_TOOLS lijst
 */
export function getAvailableTools() {
  return AVAILABLE_TOOLS
}

/**
 * Haalt zichtbare menu_items op en bouwt een boomstructuur.
 * Retourneert top-level items met children[] array, gesorteerd op position.
 */
export async function fetchMenu() {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, page:pages(slug)')
    .order('position', { ascending: true })

  if (error) return { data: null, error }

  // Bouw boomstructuur
  const itemMap = new Map()
  const roots = []

  for (const item of data) {
    itemMap.set(item.id, { ...item, children: [] })
  }

  for (const item of data) {
    const node = itemMap.get(item.id)
    if (item.parent_id && itemMap.has(item.parent_id)) {
      itemMap.get(item.parent_id).children.push(node)
    } else {
      roots.push(node)
    }
  }

  return { data: roots, error: null }
}

/**
 * Haalt zichtbare quick_links op, gesorteerd op position.
 */
export async function fetchQuickLinks() {
  const { data, error } = await supabase
    .from('quick_links')
    .select('*, page:pages(slug)')
    .order('position', { ascending: true })

  if (error) return { data: null, error }
  return { data, error: null }
}

/**
 * Haalt alle menu_items op (plat, voor beheer). Inclusief niet-zichtbare.
 */
export async function fetchAllMenuItems() {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, page:pages(slug, title)')
    .order('position', { ascending: true })

  if (error) return { data: null, error }
  return { data, error: null }
}

/**
 * Haalt alle quick_links op (voor beheer). Inclusief niet-zichtbare.
 */
export async function fetchAllQuickLinks() {
  const { data, error } = await supabase
    .from('quick_links')
    .select('*, page:pages(slug, title)')
    .order('position', { ascending: true })

  if (error) return { data: null, error }
  return { data, error: null }
}

/**
 * Maakt een nieuw menu-item aan.
 */
export async function createMenuItem({ parent_id, label, type, page_id, tool_route, external_url, position, is_visible }) {
  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      parent_id: parent_id || null,
      label,
      type,
      page_id: page_id || null,
      tool_route: tool_route || null,
      external_url: external_url || null,
      position: position ?? 0,
      is_visible: is_visible ?? true,
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Werkt een menu-item bij.
 */
export async function updateMenuItem(id, updates) {
  const { data, error } = await supabase
    .from('menu_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

/**
 * Verwijdert een menu-item (cascade verwijdert ook kinderen).
 */
export async function deleteMenuItem(id) {
  const { data, error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id)

  return { data, error }
}

/**
 * Maakt een nieuwe quick link aan.
 */
export async function createQuickLink({ label, type, page_id, tool_route, external_url, position, is_visible, description, icon, show_on_home }) {
  const { data, error } = await supabase
    .from('quick_links')
    .insert({
      label,
      type,
      page_id: page_id || null,
      tool_route: tool_route || null,
      external_url: external_url || null,
      position: position ?? 0,
      is_visible: is_visible ?? true,
      description: description || null,
      icon: icon || null,
      show_on_home: show_on_home ?? false,
    })
    .select()
    .single()

  return { data, error }
}

/**
 * Werkt een quick link bij.
 */
export async function updateQuickLink(id, updates) {
  const { data, error } = await supabase
    .from('quick_links')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

/**
 * Verwijdert een quick link.
 */
export async function deleteQuickLink(id) {
  const { data, error } = await supabase
    .from('quick_links')
    .delete()
    .eq('id', id)

  return { data, error }
}

/**
 * Batch update van posities voor menu items.
 * @param {Array<{id: string, position: number}>} items
 */
export async function reorderMenuItems(items) {
  const results = await Promise.all(
    items.map(({ id, position }) =>
      supabase
        .from('menu_items')
        .update({ position, updated_at: new Date().toISOString() })
        .eq('id', id)
    )
  )

  const error = results.find(r => r.error)?.error || null
  return { data: !error, error }
}

/**
 * Batch update van posities voor quick links.
 * @param {Array<{id: string, position: number}>} items
 */
export async function reorderQuickLinks(items) {
  const results = await Promise.all(
    items.map(({ id, position }) =>
      supabase
        .from('quick_links')
        .update({ position, updated_at: new Date().toISOString() })
        .eq('id', id)
    )
  )

  const error = results.find(r => r.error)?.error || null
  return { data: !error, error }
}
