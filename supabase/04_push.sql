-- =====================================================================
-- Feature: Push-Benachrichtigung bei neuem Termin (+ rote Zahl am App-Icon)
-- =====================================================================

-- 1) Push-Abos: pro Gerät ein Eintrag (iPhone, evtl. PC)
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "eigene abos" on public.push_subscriptions;
create policy "eigene abos" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2) Wann hat jemand zuletzt die App geöffnet? → daraus die Zahl am Icon
alter table public.profiles add column if not exists zuletzt_gesehen timestamptz not null default now();

-- 3) Damit jeder Termin höchstens einmal benachrichtigt wird
alter table public.events add column if not exists benachrichtigt boolean not null default false;

-- 4) Bei jedem neuen Eintrag die Edge Function "push" aufrufen (für alle Features gleich)
create extension if not exists pg_net;

create or replace function public.push_ausloesen()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url     := 'https://nqmnqrznvevzazlvqrzr.supabase.co/functions/v1/push',
    body    := jsonb_build_object('table', tg_table_name, 'id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
end;
$$;

drop trigger if exists push_ausloesen on public.events;
create trigger push_ausloesen
  after insert on public.events
  for each row execute function public.push_ausloesen();
