-- Three additions:
-- (1) Site-wide "online members" support - profiles.last_active_at + the profile_usernames
--     view extended to expose it publicly (mirrors the exact pattern already used to add
--     xp/streak/teddy_bears/avatar_url in chat_cleanup_and_user_menu.sql).
-- (2) A streak-based weekly leaderboard/teddy-bear prize, parallel to the existing XP-based
--     hall_of_fame (untouched) - see this file's RPC section for why a NEW explicit award
--     mechanism is needed here instead of whatever already awards teddy bears for the XP
--     board (that mechanism isn't tracked anywhere in this repo).
-- (3) A shared "activity_feed" table + Realtime, broadcasting welcome/badge/level-up/
--     teddy-bear/streak-top1 events to every connected client for the home screen's
--     scrolling ticker.
--
-- HOW TO APPLY: same manual-apply pattern as every other migration in this folder - paste
-- into Supabase Dashboard -> SQL Editor -> New query -> Run.

-- ============================= Presence (online members) =============================
alter table public.profiles add column if not exists last_active_at timestamptz;

-- Extends the same narrow public view already used for username lookups, friend/group
-- action menus, and the "Xem info" card - still deliberately excludes email/hearts/banned/
-- stats internals, only adds one more public-safe field.
create or replace view public.profile_usernames as
  select id, username, xp, streak, teddy_bears, avatar_url, last_active_at from public.profiles;

grant select on public.profile_usernames to authenticated;


-- ============================= Streak weekly leaderboard =============================
-- Mirrors hall_of_fame's shape/idempotency pattern exactly (week_id uniqueness = "already
-- awarded this week, skip"), just keyed on streak instead of xp. Does NOT touch or replace
-- hall_of_fame / the existing XP-based weekly prize at all.
create table public.streak_hall_of_fame (
  id uuid primary key default gen_random_uuid(),
  week_id text not null,
  username text not null,
  streak_value int not null,
  created_at timestamptz not null default now()
);

create unique index streak_hall_of_fame_week_idx on public.streak_hall_of_fame (week_id);

alter table public.streak_hall_of_fame enable row level security;

-- Same "casual feature, not anti-cheat" trust model already used for hall_of_fame/
-- leaderboard-adjacent tables throughout this app - any authenticated client may perform
-- the opportunistic weekly snapshot (see checkAndAwardStreakPrize() in leaderboard.js),
-- since whichever user's browser happens to be open past Saturday 19:00 triggers it, not
-- necessarily the winner.
create policy streak_hof_insert_authenticated on public.streak_hall_of_fame for insert to authenticated
  with check (true);

create policy streak_hof_select_all on public.streak_hall_of_fame for select to authenticated
  using (true);

create policy streak_hof_delete_authenticated on public.streak_hall_of_fame for delete to authenticated
  using (true);


-- ============================= Streak teddy-bear award RPC =============================
-- SECURITY DEFINER exception (same narrow-and-bounded reasoning as increment_group_vibrancy/
-- finalize_group_battle) - the client triggering the weekly streak check is often NOT the
-- winner, so a plain self-row profiles UPDATE can't reach the winner's teddy_bears column.
-- Deliberately does exactly one thing: += 1 on a specific user's teddy_bears, nothing else.
create or replace function public.award_streak_teddy_bear(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set teddy_bears = coalesce(teddy_bears, 0) + 1 where id = p_user_id;
end;
$$;

grant execute on function public.award_streak_teddy_bear(uuid) to authenticated;


-- ============================= Community activity feed =============================
-- One row per broadcastable event (new member, badge earned, level up, teddy bear
-- received, reached #1 streak) - powers the scrolling ticker on the home dashboard, shown
-- to every connected client via Realtime.
create table public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('welcome', 'badge', 'level_up', 'teddy_bear', 'streak_top1')),
  user_id uuid references public.profiles(id) on delete set null,
  username text not null,
  message text not null check (char_length(message) between 1 and 300),
  created_at timestamptz not null default now()
);

create index activity_feed_created_at_idx on public.activity_feed (created_at desc);

alter table public.activity_feed enable row level security;

-- INSERT is intentionally NOT restricted to "as yourself" - the teddy_bear event is
-- inserted by whichever client happens to trigger the weekly streak-prize check
-- (checkAndAwardStreakPrize()), announcing on behalf of the actual winner, who may not be
-- online at that moment at all. Same trust model as the rest of this app's "casual
-- community feature, not anti-cheat" stance.
create policy activity_feed_insert_authenticated on public.activity_feed for insert to authenticated
  with check (true);

create policy activity_feed_select_all on public.activity_feed for select to authenticated
  using (true);

-- Opportunistic cleanup (no cron infrastructure) - any authenticated client may delete
-- events older than 72h, the same "cannot delete anything that isn't already stale"
-- safety property as global_chat_messages' own cleanup policy. Kept longer than chat's 24h
-- window since these events are much lower-frequency and the ticker would run dry
-- overnight otherwise.
create policy activity_feed_delete_stale on public.activity_feed for delete to authenticated
  using (created_at < now() - interval '72 hours');

alter publication supabase_realtime add table public.activity_feed;
