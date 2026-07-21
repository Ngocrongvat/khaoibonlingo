-- Group battle END-OF-ARENA inbox summary.
--
-- Extends finalize_scheduled_group_battle so that, the moment a scheduled battle is
-- finalized (normal finish OR forfeit), EVERY paired user receives a personal message in
-- their inbox (direct_messages): a congratulation / condolence, the group result + score,
-- the wager movement, and exactly how much XP THEY personally gained or lost from the 10%
-- steal. Runs inside the one-time reward block (guarded by rewards_applied) so nobody is
-- messaged twice.
--
-- Sender: direct_messages forbids self-messages and (under RLS) only lets a client send
-- as itself, but this SECURITY DEFINER function bypasses RLS - so each recipient's message
-- is sent by their OWN group's captain (owner), falling back to the opposing captain for
-- the owner themselves (a captain can't message themselves). No system/bot account needed.
--
-- HOW TO APPLY: paste into Supabase Dashboard -> SQL Editor -> Run. Safe to re-run.
-- Supersedes the finalize function in group_battle_realtime.sql.

-- Builds one recipient's Vietnamese end-of-arena summary from THEIR group's perspective.
-- p_winner_group null = draw. p_i_forfeited = this recipient's group is the one that quit.
create or replace function public._battle_result_dm(
  p_winner_group uuid, p_my_group uuid, p_my_name text, p_opp_name text,
  p_my_wins int, p_opp_wins int, p_wager int, p_delta int, p_i_forfeited boolean
) returns text
language sql
immutable
as $$
  select
    (case
       when p_winner_group is null then
         '🤝 Trận đấu group giữa "' || p_my_name || '" và "' || p_opp_name || '" đã kết thúc HÒA ' || p_my_wins::text || '-' || p_opp_wins::text || '. '
       when p_winner_group = p_my_group then
         '🏆 CHÚC MỪNG CHIẾN THẮNG! Group "' || p_my_name || '" của bạn đã THẮNG group "' || p_opp_name || '" với tỉ số ' || p_my_wins::text || '-' || p_opp_wins::text || '. '
         || (case when coalesce(p_wager, 0) > 0 then 'Group được +' || p_wager::text || ' EXP tiền cược. ' else '' end)
       else
         (case when p_i_forfeited then '🏳️ Group "' || p_my_name || '" của bạn đã bỏ cuộc nên bị xử THUA trước group "' || p_opp_name || '". '
               else '💪 Cố lên nhé! Group "' || p_my_name || '" của bạn đã thua group "' || p_opp_name || '" với tỉ số ' || p_my_wins::text || '-' || p_opp_wins::text || '. ' end)
         || (case when coalesce(p_wager, 0) > 0 then 'Group mất ' || p_wager::text || ' EXP tiền cược. ' else '' end)
     end)
    ||
    (case
       when coalesce(p_delta, 0) > 0 then 'Cá nhân bạn đã CƯỚP được +' || p_delta::text || ' XP của đối thủ ghép cặp! 🗡️'
       when coalesce(p_delta, 0) < 0 then 'Cá nhân bạn bị đối thủ cướp mất ' || abs(p_delta)::text || ' XP. 😣 Luyện tập thêm rồi phục thù nhé!'
       else 'XP cá nhân của bạn không thay đổi lần này.'
     end)
$$;

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
  v_delta_a int;
  v_delta_b int;
  v_ga_name text; v_gb_name text;
  v_oa_id uuid; v_oa_name text; v_ob_id uuid; v_ob_name text;
  v_wager int;
  v_msg text; v_send_id uuid; v_send_name text;
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
  if now() < v_window_end
     and exists (select 1 from public.group_battle_pairs where battle_id = p_battle_id and winner is null) then
    return v_battle;
  end if;

  -- Resolve undecided pairs, then tally.
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

  select name, owner_id, owner_username into v_ga_name, v_oa_id, v_oa_name from public.groups where id = v_battle.group_a_id;
  select name, owner_id, owner_username into v_gb_name, v_ob_id, v_ob_name from public.groups where id = v_battle.group_b_id;
  v_wager := greatest(0, coalesce(v_battle.wager_xp, 0));

  if v_winner_group is not null then
    update public.groups
       set battle_wins = battle_wins + 1, vibrancy_score = vibrancy_score + v_wager
     where id = v_winner_group;
    update public.groups
       set battle_losses = battle_losses + 1, vibrancy_score = greatest(0, vibrancy_score - v_wager)
     where id = v_loser_group;
  end if;

  -- Per-pair: apply the 10% XP steal (winner side that joined), record each user's delta,
  -- then send BOTH paired users their personal end-of-arena summary in the inbox.
  for v_pair in select * from public.group_battle_pairs where battle_id = p_battle_id loop
    v_delta_a := 0; v_delta_b := 0;
    if v_winner_group = v_battle.group_a_id and v_pair.joined_a_at is not null then
      select greatest(0, floor(coalesce(xp, 0) * 0.1))::int into v_steal from public.profiles where id = v_pair.user_b_id;
      if coalesce(v_steal, 0) > 0 then
        update public.profiles set xp = greatest(0, coalesce(xp, 0) - v_steal) where id = v_pair.user_b_id;
        update public.profiles set xp = coalesce(xp, 0) + v_steal where id = v_pair.user_a_id;
        v_delta_a := v_steal; v_delta_b := -v_steal;
      end if;
    elsif v_winner_group = v_battle.group_b_id and v_pair.joined_b_at is not null then
      select greatest(0, floor(coalesce(xp, 0) * 0.1))::int into v_steal from public.profiles where id = v_pair.user_a_id;
      if coalesce(v_steal, 0) > 0 then
        update public.profiles set xp = greatest(0, coalesce(xp, 0) - v_steal) where id = v_pair.user_a_id;
        update public.profiles set xp = coalesce(xp, 0) + v_steal where id = v_pair.user_b_id;
        v_delta_b := v_steal; v_delta_a := -v_steal;
      end if;
    end if;

    -- user_a (group A perspective); sender = A's captain, else B's captain if recipient is A's captain.
    v_send_id := case when v_pair.user_a_id <> v_oa_id then v_oa_id else v_ob_id end;
    v_send_name := case when v_pair.user_a_id <> v_oa_id then v_oa_name else v_ob_name end;
    v_msg := public._battle_result_dm(v_winner_group, v_battle.group_a_id, v_ga_name, v_gb_name,
                                      v_wins_a, v_wins_b, v_wager, v_delta_a,
                                      v_battle.forfeited_by_group_id is not distinct from v_battle.group_a_id);
    if v_send_id is not null and v_send_id <> v_pair.user_a_id then
      insert into public.direct_messages (sender_id, sender_username, recipient_id, recipient_username, message)
        values (v_send_id, coalesce(v_send_name, 'Trọng tài'), v_pair.user_a_id, v_pair.username_a, v_msg);
    end if;

    -- user_b (group B perspective).
    v_send_id := case when v_pair.user_b_id <> v_ob_id then v_ob_id else v_oa_id end;
    v_send_name := case when v_pair.user_b_id <> v_ob_id then v_ob_name else v_oa_name end;
    v_msg := public._battle_result_dm(v_winner_group, v_battle.group_b_id, v_gb_name, v_ga_name,
                                      v_wins_b, v_wins_a, v_wager, v_delta_b,
                                      v_battle.forfeited_by_group_id is not distinct from v_battle.group_b_id);
    if v_send_id is not null and v_send_id <> v_pair.user_b_id then
      insert into public.direct_messages (sender_id, sender_username, recipient_id, recipient_username, message)
        values (v_send_id, coalesce(v_send_name, 'Trọng tài'), v_pair.user_b_id, v_pair.username_b, v_msg);
    end if;
  end loop;

  return v_battle;
end;
$$;

grant execute on function public.finalize_scheduled_group_battle(uuid) to authenticated;
