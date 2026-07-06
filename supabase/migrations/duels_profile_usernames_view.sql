-- Follow-up migration: fixes a real bug found during end-to-end testing.
--
-- The "challenge by username" feature needs to resolve ANY user's username to their id,
-- but `profiles` RLS restricts SELECT to your own row only (confirmed by testing: a
-- no-filter `select * from profiles` as an authenticated user returns exactly 1 row -
-- your own). Directly querying `profiles` for someone else's username always returns
-- nothing, so "challenge a friend" silently fails with "user not found" even when that
-- friend definitely has an account.
--
-- Fix: a narrow public view exposing ONLY `id` and `username` - never email, xp, stats,
-- hearts, or banned status - so other users' identities can be resolved without loosening
-- the real `profiles` table's row-level security at all.
--
-- HOW TO APPLY: same as duels_schema.sql - paste into Supabase Dashboard -> SQL Editor ->
-- New query -> Run.

create or replace view public.profile_usernames as
  select id, username from public.profiles;

-- Deliberately NOT setting security_invoker = true: Postgres views default to running
-- with the view OWNER's privileges for RLS purposes (the owner here is whatever
-- admin/service role executes this migration in the SQL Editor, which can see all rows),
-- so this view exposes every user's id+username to any authenticated querier regardless
-- of their own row-level restriction on the underlying `profiles` table. This is the
-- standard "narrow public view over a locked-down table" pattern.
grant select on public.profile_usernames to authenticated;
