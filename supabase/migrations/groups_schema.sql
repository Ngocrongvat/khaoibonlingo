-- Schema for the Group (guild) system: create/join/manage groups, group chat, a
-- "vibrancy score" that doubles as group EXP/level, and group-vs-group battles built
-- as an aggregation of individual 1v1 duels (reusing the existing `duels` table/
-- `duel.js` module rather than a parallel battle system).
--
-- HOW TO APPLY: same manual-apply pattern as every other migration in this folder -
-- paste into Supabase Dashboard -> SQL Editor -> New query -> Run.
--
-- Table order matters here: every table is created FIRST (this section), then two
-- SECURITY DEFINER helper functions, then RLS/policies AFTER (further down) - several
-- policies need to reference OTHER tables in this same migration (e.g. groups' policies
-- check group_members), which fails with "relation does not exist" (42P01) if a policy
-- referencing a table is created before that table exists.

-- ============================= Tables =============================

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  description text,
  avatar_url text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  owner_username text not null,

  -- Doubles as the group's EXP - getGroupLevelInfo() in app.js runs it through the
  -- exact same xpNeededForLevel()/getRankInfo() curve already used for individual
  -- players, so leveling feels consistent rather than inventing a second formula.
  vibrancy_score int not null default 0,

  -- Two separate leaderboard-ranking counters (see "thiện chiến"/"máu chiến" below) -
  -- deliberately distinct from vibrancy_score, which only measures activity/level, not
  -- battle performance.
  battle_wins int not null default 0,
  battle_losses int not null default 0,
  battles_initiated int not null default 0,

  created_at timestamptz not null default now()
);

create unique index groups_name_idx on public.groups (lower(name));

-- status: 'pending' (join request awaiting owner/admin approval) -> 'active'.
-- role: 'owner' (exactly one per group, set at creation) | 'admin' (promoted by owner)
-- | 'member' (default for everyone else).
create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  username text not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  status text not null default 'pending' check (status in ('pending', 'active')),
  last_active_at timestamptz,
  joined_at timestamptz not null default now()
);

create unique index group_members_pair_idx on public.group_members (group_id, user_id);
create index group_members_group_status_idx on public.group_members (group_id, status);
create index group_members_user_idx on public.group_members (user_id, status);

-- Mirrors global_chat_messages (see chat_and_inbox_schema.sql) but scoped to one
-- group's active members only, instead of world-readable.
create table public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_username text not null,
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

create index group_messages_group_created_idx on public.group_messages (group_id, created_at desc);

create table public.group_battles (
  id uuid primary key default gen_random_uuid(),
  group_a_id uuid not null references public.groups(id) on delete cascade,
  group_b_id uuid not null references public.groups(id) on delete cascade,
  initiated_by_group_id uuid not null references public.groups(id) on delete cascade,

  status text not null default 'pending' check (status in ('pending', 'active', 'finished')),
  group_a_wins int not null default 0,
  group_b_wins int not null default 0,
  winner_group_id uuid references public.groups(id),

  created_at timestamptz not null default now(),
  finished_at timestamptz,

  constraint group_battles_distinct_groups check (group_a_id <> group_b_id)
);

create index group_battles_group_a_idx on public.group_battles (group_a_id, status);
create index group_battles_group_b_idx on public.group_battles (group_b_id, status);

-- The existing `duels` table/duel.js module is already schema-generic (see
-- friends_and_gifts_schema.sql's game_type/game_level addition) - every function
-- operates per-row via .eq('id', duelId) and never shape-checks columns, so these two
-- nullable columns are enough to tag a 1v1 duel as "belongs to this group battle, on
-- this side" without touching duel.js's existing logic at all.
alter table public.duels add column group_battle_id uuid references public.group_battles(id);
alter table public.duels add column group_side text check (group_side in ('a', 'b'));


-- ============================= Membership check helper functions =============================
-- CRITICAL: every policy anywhere in this file that needs to check "is this user a
-- member/admin of this group" MUST call one of these two functions rather than writing
-- an inline `exists (select 1 from group_members where ...)` subquery directly. A
-- plain subquery on group_members, referenced from a POLICY defined ON group_members
-- itself (e.g. group_members_update_by_admin checking group_members), causes Postgres
-- to recurse: evaluating that subquery re-triggers group_members' RLS, which contains
-- the same subquery, forever - error 42P17 "infinite recursion detected in policy for
-- relation group_members" (this is exactly what broke the first version of this
-- migration). SECURITY DEFINER breaks the recursion because the function body runs
-- with the function owner's privileges, which bypasses RLS on the table it queries
-- entirely, so there's no policy to recursively re-evaluate.
create or replace function public.is_active_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id and status = 'active'
  );
$$;

create or replace function public.is_group_admin(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id
      and role in ('owner', 'admin') and status = 'active'
  );
$$;

grant execute on function public.is_active_group_member(uuid, uuid) to authenticated;
grant execute on function public.is_group_admin(uuid, uuid) to authenticated;


-- ============================= Vibrancy score increment RPC =============================
-- SECURITY DEFINER is a deliberate, narrow exception to this app's usual stance against
-- it (see friends_and_gifts_schema.sql's heart_gifts comment) - member heartbeats from
-- possibly several people in the same group hitting this concurrently need real atomic
-- += semantics, which the "gift row to self-claim" pattern used elsewhere doesn't fit
-- (this isn't a transfer between two users' own rows, it's a shared counter). Kept safe
-- by doing far less than the elevated privilege would allow: small bounded amount only,
-- and the caller must already be an active member of the exact group they're crediting.
create or replace function public.increment_group_vibrancy(p_group_id uuid, p_amount int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount < 1 or p_amount > 200 then
    raise exception 'invalid amount';
  end if;
  if not public.is_active_group_member(p_group_id, auth.uid()) then
    raise exception 'not a member of this group';
  end if;
  update public.groups set vibrancy_score = vibrancy_score + p_amount where id = p_group_id;
end;
$$;

grant execute on function public.increment_group_vibrancy(uuid, int) to authenticated;


-- ============================= Finalize group battle RPC =============================
-- Another deliberate SECURITY DEFINER exception, for the same class of reason as
-- increment_group_vibrancy() above: whoever clicks "Kết thúc trận" is an owner/admin of
-- ONE of the two groups (enforced below), but finishing a battle needs to write
-- battle_wins/battle_losses/vibrancy_score onto BOTH groups - the loser's row update
-- would be silently rejected by groups_update_by_admin RLS otherwise, since the caller
-- is never an admin of the OPPOSING group. Doing the whole read-decide-write sequence
-- inside one SECURITY DEFINER function keeps it atomic (no other client can recompute
-- the score mid-way through) and correctly reaches both groups' rows.
create or replace function public.finalize_group_battle(p_battle_id uuid)
returns public.group_battles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_battle public.group_battles;
  v_winner_id uuid;
  v_loser_id uuid;
  v_wager constant int := 100;
begin
  select * into v_battle from public.group_battles where id = p_battle_id;
  if v_battle is null then
    raise exception 'battle not found';
  end if;

  -- Re-implements group_battles_update_members' authorization check explicitly, since
  -- SECURITY DEFINER means this function body itself bypasses that RLS policy.
  if not (public.is_active_group_member(v_battle.group_a_id, auth.uid())
       or public.is_active_group_member(v_battle.group_b_id, auth.uid())) then
    raise exception 'not a member of either group in this battle';
  end if;

  if v_battle.status <> 'active' then
    return v_battle; -- idempotent - already finished, no-op (mirrors finalizeDuel()'s pattern)
  end if;

  if v_battle.group_a_wins > v_battle.group_b_wins then
    v_winner_id := v_battle.group_a_id;
    v_loser_id := v_battle.group_b_id;
  elsif v_battle.group_b_wins > v_battle.group_a_wins then
    v_winner_id := v_battle.group_b_id;
    v_loser_id := v_battle.group_a_id;
  end if;
  -- else: a tie leaves both v_winner_id/v_loser_id null - no group's stats change.

  update public.group_battles
    set status = 'finished', winner_group_id = v_winner_id, finished_at = now()
    where id = p_battle_id and status = 'active'
    returning * into v_battle;

  if v_winner_id is not null then
    update public.groups
      set battle_wins = battle_wins + 1, vibrancy_score = vibrancy_score + v_wager
      where id = v_winner_id;
    update public.groups
      set battle_losses = battle_losses + 1, vibrancy_score = greatest(0, vibrancy_score - v_wager)
      where id = v_loser_id;
  end if;

  return v_battle;
end;
$$;

grant execute on function public.finalize_group_battle(uuid) to authenticated;


-- ============================= RLS: groups =============================
alter table public.groups enable row level security;

-- INSERT: only as your own group (you become its owner).
create policy groups_insert_as_owner on public.groups for insert to authenticated
  with check (owner_id = auth.uid());

-- SELECT: public - browsing/searching groups to join has to work before you're a
-- member of anything, same reasoning as leaderboard/hall_of_fame being world-readable.
create policy groups_select_all on public.groups for select to authenticated
  using (true);

-- UPDATE: owner/admin only (editing name/description/avatar_url, and battle
-- counters/vibrancy_score when an owner/admin resolves a battle - see
-- finalizeGroupBattle() in groups.js). Postgres RLS can't restrict individual columns
-- within one policy, so this doesn't distinguish "which field" is being changed - it
-- relies on the same row-level-only trust model already documented for
-- friendships/duels elsewhere in this app. The separate increment_group_vibrancy() RPC
-- above exists for a DIFFERENT reason: ordinary members (not owner/admin) have no
-- UPDATE access here at all, so their periodic heartbeat needs the RPC specifically to
-- contribute to vibrancy_score despite lacking this policy's access.
create policy groups_update_by_admin on public.groups for update to authenticated
  using (public.is_group_admin(id, auth.uid()))
  with check (public.is_group_admin(id, auth.uid()));

alter publication supabase_realtime add table public.groups;


-- ============================= RLS: group_members =============================
alter table public.group_members enable row level security;

-- INSERT: always as yourself. Only the group's actual owner_id may insert themselves
-- as role='owner'+status='active' (happens exactly once, right after creating the
-- group) - anyone else can only ever self-insert as role='member'+status='pending',
-- i.e. a join request. This is enforced here rather than trusted client-side, so a
-- crafted request can't self-approve or self-promote at insert time. Queries `groups`,
-- not `group_members` itself, so this one was never at risk of the recursion above.
create policy group_members_insert_self on public.group_members for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      (role = 'owner' and status = 'active' and exists (
        select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()
      ))
      or (role = 'member' and status = 'pending')
    )
  );

-- SELECT: the active roster of any group is publicly visible (same "browsing a group
-- shows its members" pattern as most social apps); pending join requests are only
-- visible to that group's own owner/admin, so a request stays private until approved.
-- Both use the helper functions instead of an inline self-join subquery - see the
-- comment above is_active_group_member().
create policy group_members_select_active_public on public.group_members for select to authenticated
  using (status = 'active');

create policy group_members_select_pending_by_admin on public.group_members for select to authenticated
  using (status = 'pending' and public.is_group_admin(group_id, auth.uid()));

-- UPDATE: owner/admin can approve/promote/demote any row in their group. Members can
-- also self-update their OWN row (needed for the heartbeat writing last_active_at).
-- Row-level-only tradeoff, same documented stance as friendships/duels elsewhere in
-- this app (a casual social feature, not an anti-cheat system) - a member could in
-- theory call the API directly to self-promote, but the normal UI never exposes that.
create policy group_members_update_by_admin on public.group_members for update to authenticated
  using (public.is_group_admin(group_id, auth.uid()))
  with check (public.is_group_admin(group_id, auth.uid()));

create policy group_members_update_self_heartbeat on public.group_members for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- DELETE: leave the group yourself, or be kicked by an owner/admin.
create policy group_members_delete_self_or_admin on public.group_members for delete to authenticated
  using (user_id = auth.uid() or public.is_group_admin(group_id, auth.uid()));

alter publication supabase_realtime add table public.group_members;


-- ============================= RLS: group_messages =============================
alter table public.group_messages enable row level security;

create policy group_messages_insert_as_member on public.group_messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_active_group_member(group_id, auth.uid()));

create policy group_messages_select_members on public.group_messages for select to authenticated
  using (public.is_active_group_member(group_id, auth.uid()));

alter publication supabase_realtime add table public.group_messages;


-- ============================= RLS: group_battles =============================
alter table public.group_battles enable row level security;

create policy group_battles_insert_by_admin on public.group_battles for insert to authenticated
  with check (public.is_group_admin(initiated_by_group_id, auth.uid()));

create policy group_battles_select_members on public.group_battles for select to authenticated
  using (public.is_active_group_member(group_a_id, auth.uid()) or public.is_active_group_member(group_b_id, auth.uid()));

-- UPDATE covers: the opposing side's owner/admin accepting a pending challenge, and
-- either side's owner/admin finalizing an active battle (also used by any member's
-- client to opportunistically recompute the live group_a_wins/group_b_wins tally as
-- individual linked duels finish - see finalizeGroupBattle()/recomputeBattleScore() in
-- groups.js).
create policy group_battles_update_members on public.group_battles for update to authenticated
  using (public.is_active_group_member(group_a_id, auth.uid()) or public.is_active_group_member(group_b_id, auth.uid()))
  with check (public.is_active_group_member(group_a_id, auth.uid()) or public.is_active_group_member(group_b_id, auth.uid()));

alter publication supabase_realtime add table public.group_battles;


-- ============================= Group avatar storage =============================
-- Reuses the SAME public `avatars` bucket already created by avatars_storage.sql, just
-- under a distinct path prefix (avatars/group-<group_id>/avatar.<ext>) so both the
-- bucket and its public-read policy are shared. Only the write policies differ: instead
-- of the simple auth.uid() folder-match used for personal avatars, group avatar writes
-- check the caller has an owner/admin role for the specific group_id embedded in the
-- path (extracted by stripping the "group-" prefix from the folder segment) via the
-- same is_group_admin() helper used everywhere else, for the same recursion-avoidance
-- reason (storage.objects policies calling into group_members indirectly hit the same
-- issue as a direct policy would).
create policy "group_avatar_upload_by_admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] like 'group-%'
    and public.is_group_admin(replace((storage.foldername(name))[1], 'group-', '')::uuid, auth.uid())
  );

create policy "group_avatar_update_by_admin"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] like 'group-%'
    and public.is_group_admin(replace((storage.foldername(name))[1], 'group-', '')::uuid, auth.uid())
  );

create policy "group_avatar_delete_by_admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] like 'group-%'
    and public.is_group_admin(replace((storage.foldername(name))[1], 'group-', '')::uuid, auth.uid())
  );

-- No new SELECT policy needed - avatar_read_public from avatars_storage.sql already
-- covers the whole 'avatars' bucket regardless of path prefix.
