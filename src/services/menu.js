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

-- Fase 4: Seed data - initialiseer het standaard hoofdmenu
-- Voer dit uit in de Supabase SQL editor als alternatief voor de UI-knop:
--
-- DO $$
-- DECLARE
--   grp_wedstrijdinformatie UUID;
--   grp_teams UUID;
--   grp_trainen UUID;
--   grp_sponsoring UUID;
--   grp_clubinformatie UUID;
--   grp_lidmaatschap UUID;
--   grp_contact UUID;
-- BEGIN
--   -- Groepen aanmaken
--   INSERT INTO menu_items (label, type, position, is_visible) VALUES ('WEDSTRIJDINFORMATIE', 'group', 0, true) RETURNING id INTO grp_wedstrijdinformatie;
--   INSERT INTO menu_items (label, type, position, is_visible) VALUES ('TEAMS', 'group', 1, true) RETURNING id INTO grp_teams;
--   INSERT INTO menu_items (label, type, position, is_visible) VALUES ('TRAINEN', 'group', 2, true) RETURNING id INTO grp_trainen;
--   INSERT INTO menu_items (label, type, position, is_visible) VALUES ('SPONSORING', 'group', 3, true) RETURNING id INTO grp_sponsoring;
--   INSERT INTO menu_items (label, type, position, is_visible) VALUES ('CLUBINFORMATIE', 'group', 4, true) RETURNING id INTO grp_clubinformatie;
--   INSERT INTO menu_items (label, type, position, is_visible) VALUES ('LIDMAATSCHAP', 'group', 5, true) RETURNING id INTO grp_lidmaatschap;
--   INSERT INTO menu_items (label, type, position, is_visible) VALUES ('CONTACT', 'group', 6, true) RETURNING id INTO grp_contact;
--
--   -- WEDSTRIJDINFORMATIE children
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_wedstrijdinformatie, 'Programma', 'tool', '/wedstrijden/programma', 0, true);
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_wedstrijdinformatie, 'Uitslagen', 'tool', '/wedstrijden/uitslagen', 1, true);
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_wedstrijdinformatie, 'Afgelastingen', 'tool', '/wedstrijden/afgelastingen', 2, true);
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_wedstrijdinformatie, 'Wedstrijdverslagen', 'tool', '/wedstrijden/verslagen', 3, true);
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_wedstrijdinformatie, 'Topscorers & Keeperstrofee', 'tool', '/wedstrijden/topscorers', 4, true);
--
--   -- TEAMS children
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_teams, 'Senioren', 'tool', '/teams/senioren', 0, true);
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_teams, 'Veteranen', 'tool', '/teams/veteranen', 1, true);
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_teams, 'Junioren', 'tool', '/teams/junioren', 2, true);
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_teams, 'Pupillen', 'tool', '/teams/pupillen', 3, true);
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_teams, 'Zaalvoetbal', 'tool', '/teams/zaalvoetbal', 4, true);
--
--   -- TRAINEN children
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_trainen, 'Trainingsschema', 'tool', '/trainingsschema', 0, true);
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_trainen, 'Veldindeling', 'tool', '/trainingsschema/veldindeling', 1, true);
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_trainen, 'Techniektrainingen', 'tool', '/techniektrainingen', 2, true);
--
--   -- SPONSORING children
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_sponsoring, 'Sponsors', 'tool', '/sponsors', 0, true);
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_sponsoring, 'Sponsor worden?', 'tool', '/sponsoring/sponsor-worden', 1, true);
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_sponsoring, 'Sponsor Acties', 'tool', '/sponsoring/acties', 2, true);
--
--   -- CLUBINFORMATIE children
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_clubinformatie, 'Plattegrond', 'tool', '/plattegrond', 0, true);
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_clubinformatie, 'Huisstijl', 'tool', '/huistijl', 1, true);
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_clubinformatie, 'Historie', 'tool', '/club/historie', 2, true);
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_clubinformatie, 'Ereleden', 'tool', '/club/ereleden', 3, true);
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_clubinformatie, 'Reglementen', 'tool', '/club/reglementen', 4, true);
--
--   -- LIDMAATSCHAP children
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_lidmaatschap, 'Lid worden?', 'tool', '/lid-worden', 0, true);
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_lidmaatschap, 'Contributie', 'tool', '/lidmaatschap/contributie', 1, true);
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_lidmaatschap, 'Vrijwilliger worden?', 'tool', '/vrijwilliger', 2, true);
--
--   -- CONTACT children
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_contact, 'Contactgegevens', 'tool', '/contact/gegevens', 0, true);
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_contact, 'Locatie & Routebeschrijving', 'tool', '/contact/locatie', 1, true);
--   INSERT INTO menu_items (parent_id, label, type, tool_route, position, is_visible) VALUES (grp_contact, 'Wie doet wat?', 'tool', '/contact/wie-doet-wat', 2, true);
-- END $$;
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
    .select('*, page:pages(slug), page_group:page_groups(id, name, slug)')
    .eq('is_visible', true)
    .order('position', { ascending: true })

  if (error) return { data: null, error }

  // Haal pagina's op voor page_group items
  const pageGroupIds = data
    .filter(item => item.type === 'page_group' && item.page_group_id)
    .map(item => item.page_group_id)

  let groupPages = []
  if (pageGroupIds.length > 0) {
    const now = new Date().toISOString()
    const { data: gp } = await supabase
      .from('pages')
      .select('id, title, slug, group_id')
      .in('group_id', pageGroupIds)
      .not('published_at', 'is', null)
      .lte('published_at', now)
      .or('expires_at.is.null,expires_at.gt.' + now)
      .order('position', { ascending: true })
    groupPages = gp || []
  }

  // Bouw boomstructuur
  const itemMap = new Map()
  const roots = []

  for (const item of data) {
    const node = { ...item, children: [] }
    if (item.type === 'page_group' && item.page_group_id) {
      node._groupPages = groupPages.filter(p => p.group_id === item.page_group_id)
    }
    itemMap.set(item.id, node)
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
export async function createMenuItem({ parent_id, label, type, page_id, tool_route, external_url, page_group_id, position, is_visible }) {
  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      parent_id: parent_id || null,
      label,
      type,
      page_id: page_id || null,
      tool_route: tool_route || null,
      external_url: external_url || null,
      page_group_id: page_group_id || null,
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
