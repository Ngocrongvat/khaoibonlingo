-- Group battle DELETE policy — fixes "từ chối / thu hồi lời mời bị treo".
--
-- group_battles had INSERT/SELECT/UPDATE policies but NO delete policy, so RLS silently
-- rejected every delete (0 rows removed, no error) — declining or withdrawing a challenge
-- letter appeared to do nothing and the invite stayed stuck on the board forever.
--
-- This lets an owner/admin of EITHER battling group delete a battle that has not started
-- (status = 'pending' — i.e. a letter, or a battle still in scheduling/waiting). Active
-- and finished battles are never deletable here (leaving a live battle is a forfeit, a
-- recorded loss; finished battles are history). Child rows (pairs, chat) are removed by
-- their ON DELETE CASCADE, which runs with system privileges and needs no extra policy.
--
-- HOW TO APPLY: paste into Supabase Dashboard -> SQL Editor -> Run. Safe to re-run.

drop policy if exists group_battles_delete_by_admin on public.group_battles;
create policy group_battles_delete_by_admin on public.group_battles
  for delete to authenticated
  using (
    status = 'pending'
    and (
      public.is_group_admin(group_a_id, auth.uid())
      or public.is_group_admin(group_b_id, auth.uid())
    )
  );
