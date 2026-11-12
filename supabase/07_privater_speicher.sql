-- =====================================================================
-- Privater Bilder-Speicher (Supabase Storage)
-- Bucket "privat": NICHT öffentlich, nur eingeloggte Nutzer (ihr zwei) dürfen Bilder ansehen.
-- Hochladen erfolgt im Dashboard (Storage → privat → Upload).
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('privat', 'privat', false)
on conflict (id) do nothing;

drop policy if exists "privat ansehen" on storage.objects;
create policy "privat ansehen" on storage.objects for select to authenticated
  using (bucket_id = 'privat');
