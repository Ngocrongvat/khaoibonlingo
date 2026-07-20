-- Group battle REALTIME + forfeit + timely-finish upgrades.
--
-- Builds on group_battle_upgrades.sql. Adds:
--   * group_battles.forfeited_by_group_id  - which group quit (auto-loss).
--   * group_battles.challenge_kind         - marks NEW letter-flow battles so the
--     duplicate-challenge guard no longer trips on OLD "ĐẤU GROUP" battles that share
--     the group_battles table.
--   * group_battle_pairs added to the realtime publication so both sides see the score
--     move live.
--   * finalize_scheduled_group_battle relaxed so it finalizes EARLY once no pair is
--     undecided (one-sided pairs auto-resolve at activation and forfeits decide every
--     pair up front), instead of always waiting for the full window to elapse.
--
-- HOW TO APPLY: paste into Supabase Dashboard -> SQL Editor -> Run. Safe to re-run.
-- Requires groups_schema.sql + group_battle_scheduling.sql + group_battle_upgrades.sql first.

alter table public.group_battles add column if not exists forfeited_by_group_id uuid references public.groups(id);
alter table public.group_battles add column if not exists challenge_kind text;

-- Live score: both sides watch pairs resolve in realtime. Wrapped so a re-run (already
-- in the publication) is a no-op rather than an error.
do $$ begin
  alter publication supabase_realtime add table public.group_battle_pairs;
exception when others then null; end $$;

-- Re-create the finalizer with the relaxed window guard. Body is otherwise identical to
-- group_battle_upgrades.sql's version (pair resolution + wager transfer + zero-sum 10%
-- XP steal for participating winners), so this file fully supersedes it.
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

  if not (public.is_active_group_member(v_battle.group_a_id, auth.uid())
       or public.is_active_group_member(v_battle.group_b_id, auth.uid())) then
    raise exception 'not a member of either group in this battle';
  end if;

  if v_battle.status = 'finished' or v_battle.rewards_applied then
    return v_battle;
  end if;
  if v_battle.status <> 'active' or v_battle.scheduled_at is null then
    return v_battle;
  end if;

  v_window_end := v_battle.scheduled_at + make_interval(mins => coalesce(v_battle.window_min, 30));
  -- Finalize when the window has closed OR every pair is already decided (one-sided
  -- pairs auto-win at activation; a forfeit decides them all) - no need to wait idle.
  if now() < v_window_end
     and exists (select 1 from public.group_battle_pairs where battle_id = p_battle_id and winner is null) then
    return v_battle;
  end if;

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
