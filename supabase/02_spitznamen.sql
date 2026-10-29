-- =====================================================================
-- Feature: wechselnde Begrüßungsnamen (Spitznamen)
-- Die Startseite wählt bei jedem App-Start zufällig einen davon.
-- Leere Liste = es wird einfach "name" verwendet.
-- =====================================================================
alter table public.profiles add column if not exists spitznamen text[] not null default '{}';
