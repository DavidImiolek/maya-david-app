-- =====================================================================
-- Feature: gemeinsame Termine (für David UND Maya)
-- gemeinsam = true → Termin gehört beiden, beide dürfen ihn bearbeiten/löschen.
-- owner_id bleibt gesetzt (wer ihn angelegt hat), zählt aber bei gemeinsam nicht.
-- =====================================================================
alter table public.events add column if not exists gemeinsam boolean not null default false;

drop policy if exists "termine bearbeiten" on public.events;
create policy "termine bearbeiten" on public.events for update to authenticated
  using (gemeinsam or auth.uid() in (owner_id, created_by))
  with check (gemeinsam or auth.uid() in (owner_id, created_by));

drop policy if exists "termine löschen" on public.events;
create policy "termine löschen" on public.events for delete to authenticated
  using (gemeinsam or auth.uid() in (owner_id, created_by));

drop policy if exists "ausnahmen anlegen" on public.event_exceptions;
create policy "ausnahmen anlegen" on public.event_exceptions for insert to authenticated
  with check (exists (select 1 from public.events e
                      where e.id = event_id and (e.gemeinsam or auth.uid() in (e.owner_id, e.created_by))));

drop policy if exists "ausnahmen löschen" on public.event_exceptions;
create policy "ausnahmen löschen" on public.event_exceptions for delete to authenticated
  using (exists (select 1 from public.events e
                 where e.id = event_id and (e.gemeinsam or auth.uid() in (e.owner_id, e.created_by))));
