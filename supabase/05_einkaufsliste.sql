-- =====================================================================
-- Feature: Einkaufsliste (geteilt, mit Push bei neuen Einträgen)
-- =====================================================================
create table if not exists public.shopping_items (
  id             uuid primary key default gen_random_uuid(),
  text           text not null check (length(trim(text)) > 0),
  created_by     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  erledigt       boolean not null default false,
  erledigt_von   uuid references public.profiles(id) on delete set null,
  erledigt_at    timestamptz,
  benachrichtigt boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists shopping_items_created_idx on public.shopping_items (created_at);

-- Berechtigungen: beide sehen, ergänzen, abhaken und löschen alles
alter table public.shopping_items enable row level security;
drop policy if exists "einkauf ansehen" on public.shopping_items;
create policy "einkauf ansehen"    on public.shopping_items for select to authenticated using (true);
drop policy if exists "einkauf anlegen" on public.shopping_items;
create policy "einkauf anlegen"    on public.shopping_items for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "einkauf abhaken" on public.shopping_items;
create policy "einkauf abhaken"    on public.shopping_items for update to authenticated using (true) with check (true);
drop policy if exists "einkauf löschen" on public.shopping_items;
create policy "einkauf löschen"    on public.shopping_items for delete to authenticated using (true);

-- Live-Updates
alter publication supabase_realtime add table public.shopping_items;

-- Bündelung: wann bekam jemand zuletzt eine Einkaufs-Benachrichtigung?
alter table public.profiles add column if not exists letzter_einkauf_push timestamptz;

-- Push bei neuem Eintrag (gleiche Funktion wie beim Kalender)
drop trigger if exists push_ausloesen on public.shopping_items;
create trigger push_ausloesen
  after insert on public.shopping_items
  for each row execute function public.push_ausloesen();
