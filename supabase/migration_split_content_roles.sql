-- =============================================================================
-- Migratie: splits 'content' rol op in 4 aparte rollen
-- =============================================================================

-- 1. Verwijder de bestaande CHECK constraint
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_slug_check;

-- 2. Migreer bestaande 'content' rollen naar de 4 nieuwe rollen (constraint is nu weg)
INSERT INTO user_roles (user_id, role_slug, assigned_by, created_at)
SELECT user_id, 'paginas', assigned_by, created_at FROM user_roles WHERE role_slug = 'content'
ON CONFLICT (user_id, role_slug) DO NOTHING;

INSERT INTO user_roles (user_id, role_slug, assigned_by, created_at)
SELECT user_id, 'nieuws', assigned_by, created_at FROM user_roles WHERE role_slug = 'content'
ON CONFLICT (user_id, role_slug) DO NOTHING;

INSERT INTO user_roles (user_id, role_slug, assigned_by, created_at)
SELECT user_id, 'verslagen', assigned_by, created_at FROM user_roles WHERE role_slug = 'content'
ON CONFLICT (user_id, role_slug) DO NOTHING;

INSERT INTO user_roles (user_id, role_slug, assigned_by, created_at)
SELECT user_id, 'reglementen', assigned_by, created_at FROM user_roles WHERE role_slug = 'content'
ON CONFLICT (user_id, role_slug) DO NOTHING;

-- 3. Verwijder oude 'content' rollen
DELETE FROM user_roles WHERE role_slug = 'content';

-- 4. Voeg nieuwe CHECK constraint toe zonder 'content'
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_slug_check
  CHECK (role_slug IN (
    'activiteiten', 'trainingsschema', 'sponsoring',
    'ereleden', 'contact', 'gebruikers',
    'vrijwilligers', 'lid-worden',
    'paginas', 'nieuws', 'verslagen', 'reglementen'
  ));
