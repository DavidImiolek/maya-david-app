-- =====================================================================
-- Maya David App – Datenbank-Fundament (Feature 1: Geteilter Kalender)
-- Einmal komplett im Supabase SQL Editor ausführen.
-- =====================================================================

-- ---------- 1. TABELLEN ----------------------------------------------

-- Wir zwei. Ein Profil wird automatisch angelegt, sobald ein Login-Nutzer entsteht.
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  farbe      text not null default '#1D9E75',
  created_at timestamptz not null default now()
);

-- Termine. end_at leer = Open End. recurrence_rule = RRULE-Standard, z. B. 'FREQ=WEEKLY;BYDAY=TU'
create table public.events (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  created_by      uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title           text not null check (length(trim(title)) > 0),
  location        text,
  note            text,
  start_at        timestamptz not null,
  end_at          timestamptz,
  all_day         boolean not null default false,
  status          text not null default 'fest' check (status in ('fest', 'vielleicht')),
  recurrence_rule text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Regel: Ende nie vor Beginn
  constraint ende_nach_beginn check (end_at is null or end_at >= start_at),
  -- Regel: Ganztägig und Open End schließen sich aus
  constraint ganztaegig_nicht_open_end check (not (all_day and end_at is null))
);

-- Ausgefallene Einzeltermine einer Serie ("Dienstag fällt diese Woche aus")
create table public.event_exceptions (
  event_id uuid not null references public.events(id) on delete cascade,
  datum    date not null,
  primary key (event_id, datum)
);

-- Kommentare, jeweils zu einem Termin an einem bestimmten Tag
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  datum      date not null,
  author_id  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  text       text not null check (length(trim(text)) > 0),
  created_at timestamptz not null default now()
);

create index events_start_idx   on public.events (start_at);
create index comments_event_idx on public.comments (event_id, datum);


-- ---------- 2. AUTOMATIKEN (Trigger) ---------------------------------

-- Bei jedem Login-Nutzer automatisch ein Profil anlegen (Name = Teil vor dem @)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name) values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Beim Bearbeiten: Zeitstempel aktualisieren und "eingetragen von" festhalten
create or replace function public.events_before_update()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.created_by := old.created_by;
  return new;
end;
$$;

create trigger events_before_update
  before update on public.events
  for each row execute function public.events_before_update();


-- ---------- 3. BERECHTIGUNGEN (Row Level Security) -------------------
-- Ohne Policy darf niemand irgendetwas. Jede Policy erlaubt genau eine Aktion.

alter table public.profiles         enable row level security;
alter table public.events           enable row level security;
alter table public.event_exceptions enable row level security;
alter table public.comments         enable row level security;

-- Profile: beide sehen beide, jeder ändert nur sein eigenes
create policy "profile ansehen"   on public.profiles for select to authenticated using (true);
create policy "eigenes profil"    on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Termine: ansehen beide; anlegen beide (für sich oder den anderen);
-- bearbeiten/löschen nur Besitzer ODER Ersteller
create policy "termine ansehen"   on public.events for select to authenticated using (true);
create policy "termine anlegen"   on public.events for insert to authenticated
  with check (created_by = auth.uid());
create policy "termine bearbeiten" on public.events for update to authenticated
  using (auth.uid() in (owner_id, created_by))
  with check (auth.uid() in (owner_id, created_by));
create policy "termine löschen"   on public.events for delete to authenticated
  using (auth.uid() in (owner_id, created_by));

-- Ausnahmen: gleiche Regel wie Bearbeiten des zugehörigen Termins
create policy "ausnahmen ansehen" on public.event_exceptions for select to authenticated using (true);
create policy "ausnahmen anlegen" on public.event_exceptions for insert to authenticated
  with check (exists (select 1 from public.events e
                      where e.id = event_id and auth.uid() in (e.owner_id, e.created_by)));
create policy "ausnahmen löschen" on public.event_exceptions for delete to authenticated
  using (exists (select 1 from public.events e
                 where e.id = event_id and auth.uid() in (e.owner_id, e.created_by)));

-- Kommentare: beide lesen und schreiben überall, löschen nur eigene
create policy "kommentare ansehen"  on public.comments for select to authenticated using (true);
create policy "kommentare schreiben" on public.comments for insert to authenticated
  with check (author_id = auth.uid());
create policy "kommentare löschen"  on public.comments for delete to authenticated
  using (author_id = auth.uid());


-- ---------- 4. LIVE-UPDATES (Realtime) -------------------------------
alter publication supabase_realtime add table public.events, public.event_exceptions, public.comments;
