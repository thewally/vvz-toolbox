-- =============================================================================
-- Migration: Koppel bestaande training_slots aan het actieve schema
-- =============================================================================
-- Voer dit script uit NADAT add_schedules.sql is uitgevoerd.
--
-- Dit script koppelt alle training_slots die nog geen schedule_id hebben
-- automatisch aan het schema dat op 'active = true' staat.
-- =============================================================================

update training_slots
  set schedule_id = (
    select id from schedules where active = true limit 1
  )
  where schedule_id is null;

-- Controleer het resultaat (moet 0 zijn):
select count(*) as "Ongekoppelde slots" from training_slots where schedule_id is null;
