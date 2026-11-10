-- =====================================================================
-- Feature: Termine im iPhone-Kalender (Kalender-Abo)
-- =====================================================================

-- Schalter pro Termin: "In iPhone-Kalender übernehmen"
alter table public.events add column if not exists im_iphone_kalender boolean not null default false;

-- Pro Person ein geheimer Schlüssel für die private Kalender-Adresse
-- (der iPhone-Kalender kann sich nicht einloggen – der Schlüssel in der Adresse ersetzt das Login)
alter table public.profiles add column if not exists kalender_token text unique
  default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
update public.profiles
  set kalender_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  where kalender_token is null;
