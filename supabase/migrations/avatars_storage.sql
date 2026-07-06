-- Migration for the profile settings feature: avatar upload.
--
-- Adds an avatar_url column to profiles, and sets up a public Storage bucket for
-- avatar images with per-user write access (each user can only write inside their own
-- folder, named after their auth uid).
--
-- HOW TO APPLY: paste into Supabase Dashboard -> SQL Editor -> New query -> Run.

alter table public.profiles add column if not exists avatar_url text;

-- Public bucket: avatar images aren't sensitive, so reads are open to everyone (this is
-- how the rest of the app already displays other users' identities - e.g. leaderboard,
-- duel opponent names). Writes are still locked down below.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Files are stored as avatars/<user_id>/avatar.<ext> - storage.foldername(name) splits
-- the object path into an array of folder segments, so [1] is that leading <user_id>
-- segment. This restricts uploads/overwrites to your own folder only.
create policy "avatar_upload_own_folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_update_own_folder"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_delete_own_folder"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_read_public"
  on storage.objects for select
  using (bucket_id = 'avatars');
