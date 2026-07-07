-- Two independent additions:
-- (1) A DELETE policy on global_chat_messages so any authenticated client can opportunistically
--     clean up messages older than 24h (this app has no server/cron infrastructure - see
--     global-chat.js's deleteOldMessages(), called on every fetch instead).
-- (2) Extends the public.profile_usernames view (see duels_profile_usernames_view.sql) with a
--     few more public-safe fields, needed for the new "click a username -> Xem info" screen.
--
-- HOW TO APPLY: same manual-apply pattern as every other migration in this folder - paste
-- into Supabase Dashboard -> SQL Editor -> New query -> Run.

-- ============================= Global chat auto-cleanup =============================
-- The condition `created_at < now() - interval '24 hours'` means this policy can NEVER
-- be used to delete a message that isn't already stale - any authenticated user can
-- trigger the cleanup (not just the sender), which is exactly the intended "opportunistic
-- self-cleaning public chat" behavior, not a moderation/abuse vector.
create policy global_chat_delete_stale on public.global_chat_messages for delete to authenticated
  using (created_at < now() - interval '24 hours');


-- ============================= Extend profile_usernames view =============================
-- Still deliberately excludes email, hearts, banned, stats (earned badges), and streak
-- internals like last_activity_date - only fields safe to show on a public "user info"
-- card. xp/streak/teddy_bears/avatar_url are already shown to everyone via the existing
-- Leaderboard and Hall of Fame screens, so this doesn't expose anything new in kind.
create or replace view public.profile_usernames as
  select id, username, xp, streak, teddy_bears, avatar_url from public.profiles;

grant select on public.profile_usernames to authenticated;
