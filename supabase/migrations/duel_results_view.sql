-- Follow-up migration for the "Bảng Xếp Hạng Thánh Chiến" (duel hall-of-fame) feature.
--
-- `duels` RLS restricts SELECT to rows where you're the challenger or opponent (see
-- duels_select_participants in duels_schema.sql), which is correct for the battle itself
-- but means a client can never see anyone ELSE's finished duels - so a global "who has
-- the most wins" ranking has nothing to query against.
--
-- Fix: the same narrow-public-view pattern as duels_profile_usernames_view.sql. This view
-- exposes only finished duels, and only the columns needed to compute a leaderboard
-- (never `questions` - the actual quiz content/answers - and never in-progress rows).

create or replace view public.duel_results as
  select id, winner_id, challenger_id, challenger_username, opponent_id, opponent_username, finished_at
  from public.duels
  where status = 'finished';

-- Same reasoning as profile_usernames: leaving security_invoker at its default (owner
-- privileges) is what makes this view bypass the base table's per-row RLS and show
-- everyone's finished duels to any authenticated querier.
grant select on public.duel_results to authenticated;
