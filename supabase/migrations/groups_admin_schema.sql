-- Site-wide admin capabilities over the Group system, for supabase/migrations/groups_schema.sql.
--
-- IMPORTANT CONTEXT: unlike profiles/leaderboard/hall_of_fame (whose admin-only actions in
-- this app rely purely on hiding the button client-side, with no RLS tracked in this
-- repo), the Group tables have real, enforced RLS from groups_schema.sql. `profiles.role =
-- 'admin'` (site-wide admin) has NO bypass over that RLS today - the "admin" role inside
-- group_members is a completely separate, per-group concept. This migration adds a real,
-- DB-enforced bypass for site-wide admins, using the exact same SECURITY DEFINER pattern
-- already established by is_group_admin()/increment_group_vibrancy()/finalize_group_battle().
--
-- HOW TO APPLY: same manual-apply pattern as every other migration in this folder - paste
-- into Supabase Dashboard -> SQL Editor -> New query -> Run. Requires groups_schema.sql
-- (and its finalize_group_battle() follow-up) to already be applied.

-- ============================= Site-admin check helper =============================
-- SECURITY DEFINER is required here for a different reason than is_group_admin() - this
-- reads profiles.role for an ARBITRARY user id (the caller), but profiles RLS restricts
-- SELECT to your own row only, so a normal query could never check anyone's role from
-- inside a policy or another function.
create or replace function public.is_site_admin(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = p_user_id), false);
$$;

grant execute on function public.is_site_admin(uuid) to authenticated;


-- ============================= Oversight: SELECT bypass policies =============================
-- Additional PERMISSIVE policies (Postgres OR's multiple permissive policies for the same
-- command together) - these don't replace the existing member-scoped SELECT policies, they
-- just add "...or you're a site admin" as an alternative path, so admins can see pending
-- join requests and battles/messages for groups they aren't personally in.
create policy group_members_select_by_site_admin on public.group_members for select to authenticated
  using (public.is_site_admin(auth.uid()));

create policy group_battles_select_by_site_admin on public.group_battles for select to authenticated
  using (public.is_site_admin(auth.uid()));

create policy group_messages_select_by_site_admin on public.group_messages for select to authenticated
  using (public.is_site_admin(auth.uid()));


-- ============================= FK safety fix =============================
-- duels.group_battle_id (added in groups_schema.sql) referenced group_battles(id) with no
-- explicit ON DELETE rule, defaulting to RESTRICT - deleting a group (which cascades to its
-- group_battles rows) would fail with a foreign key violation if any duel still pointed at
-- one of those battles. SET NULL makes the whole deletion chain (groups -> group_battles ->
-- duels.group_battle_id) safe unconditionally, not just for the admin_delete_group() RPC
-- below.
alter table public.duels drop constraint if exists duels_group_battle_id_fkey;
alter table public.duels add constraint duels_group_battle_id_fkey
  foreign key (group_battle_id) references public.group_battles(id) on delete set null;


-- ============================= Admin RPCs =============================
-- Every function below starts with the same guard and does exactly one bounded action -
-- consistent with this app's narrow-SECURITY-DEFINER convention (see groups_schema.sql's
-- comments on increment_group_vibrancy()/finalize_group_battle() for the reasoning).

create or replace function public.admin_delete_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_site_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;
  delete from public.groups where id = p_group_id;
end;
$$;

create or replace function public.admin_remove_group_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_site_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;
  delete from public.group_members where id = p_member_id;
end;
$$;

-- Promoting someone to 'owner' first demotes the group's CURRENT owner(s) to 'admin' - a
-- group should only ever have exactly one 'owner' row, and this is the only path (besides
-- group creation itself) that can set that role, so it's the one place that invariant needs
-- enforcing.
create or replace function public.admin_change_member_role(p_member_id uuid, p_new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  if not public.is_site_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;
  if p_new_role not in ('owner', 'admin', 'member') then
    raise exception 'invalid role';
  end if;

  select group_id into v_group_id from public.group_members where id = p_member_id;
  if v_group_id is null then
    raise exception 'member not found';
  end if;

  if p_new_role = 'owner' then
    update public.group_members set role = 'admin'
      where group_id = v_group_id and role = 'owner' and id <> p_member_id;
  end if;

  update public.group_members set role = p_new_role where id = p_member_id;
end;
$$;

create or replace function public.admin_set_group_vibrancy(p_group_id uuid, p_new_score int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_site_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;
  update public.groups set vibrancy_score = greatest(0, p_new_score) where id = p_group_id;
end;
$$;

create or replace function public.admin_delete_group_message(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_site_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;
  delete from public.group_messages where id = p_message_id;
end;
$$;

-- Reuses finalize_group_battle()'s exact winner-decision logic but skips the "caller must
-- be a member of either group" check, since an admin force-closing a battle is by
-- definition acting on a battle they may have no part in. Calling this on a still-'pending'
-- 0-0 battle closes it with no winner and no stat changes on either side - functions as an
-- implicit "cancel" without needing a separate status value or code path.
create or replace function public.admin_force_finish_battle(p_battle_id uuid)
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
  if not public.is_site_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  select * into v_battle from public.group_battles where id = p_battle_id;
  if v_battle is null then
    raise exception 'battle not found';
  end if;
  if v_battle.status = 'finished' then
    return v_battle;
  end if;

  if v_battle.group_a_wins > v_battle.group_b_wins then
    v_winner_id := v_battle.group_a_id;
    v_loser_id := v_battle.group_b_id;
  elsif v_battle.group_b_wins > v_battle.group_a_wins then
    v_winner_id := v_battle.group_b_id;
    v_loser_id := v_battle.group_a_id;
  end if;

  update public.group_battles
    set status = 'finished', winner_group_id = v_winner_id, finished_at = now()
    where id = p_battle_id
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

grant execute on function public.admin_delete_group(uuid) to authenticated;
grant execute on function public.admin_remove_group_member(uuid) to authenticated;
grant execute on function public.admin_change_member_role(uuid, text) to authenticated;
grant execute on function public.admin_set_group_vibrancy(uuid, int) to authenticated;
grant execute on function public.admin_delete_group_message(uuid) to authenticated;
grant execute on function public.admin_force_finish_battle(uuid) to authenticated;
