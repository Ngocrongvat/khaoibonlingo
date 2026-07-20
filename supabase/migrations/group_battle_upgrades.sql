-- Group battle UPGRADES (feature: "tối ưu chế độ thách đấu group").
--
-- Builds on group_battle_scheduling.sql. Adds the letter-first challenge flow, a private
-- owner-to-owner chat on the scheduling board, a group-EXP wager, a capped/re-approved
-- reschedule loop, and the end-of-battle rewards: the winning group takes the wager and
-- every PARTICIPATING member of the winning group robs 10% of their paired opponent's XP
-- (a zero-sum transfer). All reward writes live in ONE SECURITY DEFINER RPC so they stay
-- atomic and can reach the opposing group's / opposing players' rows (which the caller's
-- RLS could never touch directly) - same deliberate, narrowly-scoped exception already
-- used by finalize_group_battle() / increment_group_vibrancy() in groups_schema.sql.
--
-- HOW TO APPLY: paste this whole file into Supabase Dashboard -> SQL Editor -> Run. Safe
-- to re-run (every statement is idempotent). Requires groups_schema.sql +
-- group_battle_scheduling.sql to have been applied first.

-- ============================= New group_battles columns =============================
-- Phase flags for the new flow. A battle now moves:
--   letter (status=pending, invite_accepted=false)
--     -> scheduling (invite_accepted=true, schedule_approved=false)  [chat + set date + wager]
--     -> waiting (schedule_approved=true, scheduled_at in the future)
--     -> active (paired at window open) -> finished (rewards applied once).
alter table public.group_battles add column if not exists invite_accepted boolean not null default false;
alter table public.group_battles add column if not exists wager_xp int not null default 0;
alter table public.group_battles add column if not exists schedule_change_count int not null default 0;
alter table public.group_battles add column if not exists schedule_approved boolean not null default false;
alter table public.group_battles add column if not exists rewards_applied boolean not null default false;

-- ============================= Owner-to-owner battle chat =============================
-- A private thread attached to one battle, visible/writable ONLY to owners/admins of the
-- two battling groups (this is the "khung chat tự sinh giữa 2 chủ group"). Distinct from
-- group_messages (which is one group's internal chat) - this one bridges the two sides.
create table if not exists public.group_battle_chat (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.group_battles(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_username text not null,
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists group_battle_chat_battle_idx on public.group_battle_chat (battle_id, created_at);

alter table public.group_battle_chat enable row level security;

-- SELECT/INSERT: only an owner/admin of either group in this battle. Uses the
-- SECURITY DEFINER helper is_group_admin() (never an inline group_members subquery) for
-- the same anti-recursion reason documented at length in groups_schema.sql.
drop policy if exists group_battle_chat_select_admins on public.group_battle_chat;
create policy group_battle_chat_select_admins on public.group_battle_chat
  for select to authenticated using (
    exists (
      select 1 from public.group_battles b
      where b.id = battle_id
        and (public.is_group_admin(b.group_a_id, auth.uid())
          or public.is_group_admin(b.group_b_id, auth.uid()))
    )
  );

drop policy if exists group_battle_chat_insert_admins on public.group_battle_chat;
create policy group_battle_chat_insert_admins on public.group_battle_chat
  for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.group_battles b
      where b.id = battle_id
        and (public.is_group_admin(b.group_a_id, auth.uid())
          or public.is_group_admin(b.group_b_id, auth.uid()))
    )
  );

-- Live chat updates (optional - the client also re-reads on each render). Wrapped so a
-- re-run (table already in the publication) is a no-op instead of an error.
do $$ begin
  alter publication supabase_realtime add table public.group_battle_chat;
exception when others then null; end $$;

-- ============================= Finalize scheduled battle + rewards RPC =============================
-- Resolves every pair server-side (same timeout rules as the client finalizeExpired:
-- one side joined -> that side wins the pair; neither -> draw; both -> decided by their
-- linked finished duel, else draw), tallies the group score, finishes the battle, then
-- applies rewards EXACTLY ONCE (rewards_applied guard):
--   * group level: winner +wager vibrancy, loser -wager (floored at 0), win/loss counters
--   * member level: each participating member of the WINNING group steals 10% of their
--     paired opponent's current xp - added to the winner, subtracted from the loser
--     (zero-sum). "Participating" = that member stamped their join within the window,
--     regardless of whether their individual pair was won, lost, or drawn.
-- SECURITY DEFINER: needed to write the opposing group's row and the opposing players'
-- profiles.xp, which the caller (an admin/member of only one side) can't reach under RLS.
create or replace function public.finalize_scheduled_group_battle(p_battle_id uuid)
returns public.group_battles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_battle public.group_battles;
  v_pair record;
  v_winner text;
  v_wins_a int := 0;
  v_wins_b int := 0;
  v_winner_group uuid;
  v_loser_group uuid;
  v_window_end timestamptz;
  v_steal int;
  v_win_user uuid;
  v_lose_user uuid;
begin
  select * into v_battle from public.group_battles where id = p_battle_id for update;
  if v_battle is null then
    raise exception 'battle not found';
  end if;

  -- Re-implements group_battles_update_members' check explicitly (SECURITY DEFINER
  -- bypasses RLS on this function's own writes).
  if not (public.is_active_group_member(v_battle.group_a_id, auth.uid())
       or public.is_active_group_member(v_battle.group_b_id, auth.uid())) then
    raise exception 'not a member of either group in this battle';
  end if;

  -- Idempotent guards: already finished / rewarded, or not yet started.
  if v_battle.status = 'finished' or v_battle.rewards_applied then
    return v_battle;
  end if;
  if v_battle.status <> 'active' or v_battle.scheduled_at is null then
    return v_battle;
  end if;

  v_window_end := v_battle.scheduled_at + make_interval(mins => coalesce(v_battle.window_min, 30));
  if now() < v_window_end then
    return v_battle; -- window still open
  end if;

  -- Resolve undecided pairs, then tally. (PL/pgSQL record fields aren't assignable, so
  -- the running winner for THIS pair is tracked in v_winner rather than mutating v_pair.)
  for v_pair in select * from public.group_battle_pairs where battle_id = p_battle_id loop
    if v_pair.winner is null then
      if v_pair.joined_a_at is not null and v_pair.joined_b_at is not null then
        select case when d.winner_id = v_pair.user_a_id then 'a'
                    when d.winner_id = v_pair.user_b_id then 'b'
                    else 'draw' end
          into v_winner
          from public.duels d
         where d.group_battle_id = p_battle_id
           and d.status = 'finished'
           and d.winner_id is not null
           and d.challenger_id in (v_pair.user_a_id, v_pair.user_b_id)
           and d.opponent_id in (v_pair.user_a_id, v_pair.user_b_id)
         order by d.finished_at desc nulls last
         limit 1;
        if v_winner is null then v_winner := 'draw'; end if;
      elsif v_pair.joined_a_at is not null then
        v_winner := 'a';
      elsif v_pair.joined_b_at is not null then
        v_winner := 'b';
      else
        v_winner := 'draw';
      end if;
      update public.group_battle_pairs
        set winner = v_winner, decided_at = now()
        where id = v_pair.id and winner is null;
    else
      v_winner := v_pair.winner;
    end if;
    if v_winner = 'a' then v_wins_a := v_wins_a + 1;
    elsif v_winner = 'b' then v_wins_b := v_wins_b + 1;
    end if;
  end loop;

  if v_wins_a > v_wins_b then
    v_winner_group := v_battle.group_a_id; v_loser_group := v_battle.group_b_id;
  elsif v_wins_b > v_wins_a then
    v_winner_group := v_battle.group_b_id; v_loser_group := v_battle.group_a_id;
  end if;

  -- Finish the battle (only from 'active' - loses the race gracefully to a concurrent caller).
  update public.group_battles
     set status = 'finished', group_a_wins = v_wins_a, group_b_wins = v_wins_b,
         winner_group_id = v_winner_group, finished_at = now(), rewards_applied = true
   where id = p_battle_id and status = 'active' and rewards_applied = false
   returning * into v_battle;

  if not found then
    select * into v_battle from public.group_battles where id = p_battle_id;
    return v_battle;
  end if;

  if v_winner_group is not null then
    update public.groups
       set battle_wins = battle_wins + 1,
           vibrancy_score = vibrancy_score + greatest(0, coalesce(v_battle.wager_xp, 0))
     where id = v_winner_group;
    update public.groups
       set battle_losses = battle_losses + 1,
           vibrancy_score = greatest(0, vibrancy_score - greatest(0, coalesce(v_battle.wager_xp, 0)))
     where id = v_loser_group;

    for v_pair in select * from public.group_battle_pairs where battle_id = p_battle_id loop
      v_win_user := null;
      v_lose_user := null;
      if v_winner_group = v_battle.group_a_id and v_pair.joined_a_at is not null then
        v_win_user := v_pair.user_a_id; v_lose_user := v_pair.user_b_id;
      elsif v_winner_group = v_battle.group_b_id and v_pair.joined_b_at is not null then
        v_win_user := v_pair.user_b_id; v_lose_user := v_pair.user_a_id;
      end if;
      if v_win_user is not null then
        select greatest(0, floor(coalesce(xp, 0) * 0.1))::int into v_steal
          from public.profiles where id = v_lose_user;
        if coalesce(v_steal, 0) > 0 then
          update public.profiles set xp = greatest(0, coalesce(xp, 0) - v_steal) where id = v_lose_user;
          update public.profiles set xp = coalesce(xp, 0) + v_steal where id = v_win_user;
        end if;
      end if;
    end loop;
  end if;

  return v_battle;
end;
$$;

grant execute on function public.finalize_scheduled_group_battle(uuid) to authenticated;
