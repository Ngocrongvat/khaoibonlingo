-- Schema for the friends system (friend requests/list), heart gifting between friends,
-- and generalizing the existing `duels` table to cover mini-game 1v1 matches too.
--
-- HOW TO APPLY: same manual-apply pattern as duels_schema.sql - run this file's
-- contents directly in your Supabase project's SQL Editor (Dashboard -> SQL Editor ->
-- New query -> paste -> Run). Nothing here can be executed from this codebase
-- automatically since it requires your live project.

-- ============================= Friendships =============================
-- One row per friend request. status transitions: pending -> accepted/declined, or
-- pending -> cancelled (requester backs out before the other side responds).
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  requester_username text not null,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  recipient_username text not null,

  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),

  created_at timestamptz not null default now(),
  responded_at timestamptz,

  -- Cooldown for heart gifting, shared by the PAIR regardless of which side sends -
  -- "1 gift per pair per day", not "1 gift per direction per day".
  last_heart_gift_at timestamptz,

  constraint friendships_no_self check (requester_id <> recipient_id)
);

-- Prevents duplicate pending/accepted requests between the same two people in either
-- direction (A->B pending while B->A pending, or trying to re-request an existing
-- friendship). Declined/cancelled rows are excluded so a past decline doesn't
-- permanently block a future request between the same pair.
create unique index friendships_pair_active_idx on public.friendships
  (least(requester_id, recipient_id), greatest(requester_id, recipient_id))
  where status in ('pending', 'accepted');

create index friendships_recipient_pending_idx on public.friendships (recipient_id, status);
create index friendships_requester_idx on public.friendships (requester_id);

alter table public.friendships enable row level security;

-- INSERT: only as yourself (the requester).
create policy friendships_insert_as_requester on public.friendships for insert to authenticated
  with check (requester_id = auth.uid());

-- SELECT: only the two people involved.
create policy friendships_select_participants on public.friendships for select to authenticated
  using (requester_id = auth.uid() or recipient_id = auth.uid());

-- UPDATE: either participant (recipient accepts/declines; either side can cancel a
-- pending request or update the heart-gift cooldown timestamp). Same row-level-only
-- tradeoff already documented in duels_schema.sql applies here too - this is a casual
-- social feature between people who already know each other, not an anti-cheat system.
create policy friendships_update_participants on public.friendships for update to authenticated
  using (requester_id = auth.uid() or recipient_id = auth.uid())
  with check (requester_id = auth.uid() or recipient_id = auth.uid());

-- Required for Realtime - without this, subscriptions connect but never receive events.
alter publication supabase_realtime add table public.friendships;


-- ============================= Heart gifts =============================
-- "Gift to claim later" model instead of the sender directly writing to the
-- recipient's `hearts` column - `profiles` RLS only allows updating your OWN row, so a
-- client can never increment someone else's hearts directly. The sender inserts a row
-- here (writing only their own `from_id`); the recipient claims it by incrementing
-- their OWN `hearts` column and marking this row claimed - both writes stay within the
-- existing "always update your own row" RLS model, no SECURITY DEFINER RPC needed.
create table public.heart_gifts (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles(id) on delete cascade,
  from_username text not null,
  to_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  claimed boolean not null default false,
  claimed_at timestamptz
);

create index heart_gifts_to_unclaimed_idx on public.heart_gifts (to_id, claimed);

alter table public.heart_gifts enable row level security;

-- INSERT: only as the sender.
create policy heart_gifts_insert_as_sender on public.heart_gifts for insert to authenticated
  with check (from_id = auth.uid());

-- SELECT: sender or recipient (recipient needs to see+claim; sender may want history).
create policy heart_gifts_select_participants on public.heart_gifts for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());

-- UPDATE: only the recipient can mark their own incoming gift as claimed.
create policy heart_gifts_update_recipient_claim on public.heart_gifts for update to authenticated
  using (to_id = auth.uid()) with check (to_id = auth.uid());

alter publication supabase_realtime add table public.heart_gifts;


-- ============================= Generalize duels for mini-games =============================
-- The existing `duels` table (see duels_schema.sql) is already schema-generic:
-- `questions` is jsonb (any round-data shape), `challenger_correct`/`opponent_correct`
-- are plain integers already used as "score", `question_count` is already "total
-- rounds". Adding game_type/game_level is the ONLY schema change needed to reuse the
-- entire table + the Duel module's realtime/RLS/winner-resolution logic for mini-game
-- 1v1 matches too, instead of building a parallel duels-for-games system.
alter table public.duels add column game_type text not null default 'lesson'
  check (game_type in ('lesson', 'word_match', 'memory', 'odd_one_out', 'reflex', 'picture_word'));

-- Only meaningful when game_type = 'memory' (both players must be forced to the same
-- level/difficulty config - pairs count and max mistakes both scale with level).
alter table public.duels add column game_level int;
