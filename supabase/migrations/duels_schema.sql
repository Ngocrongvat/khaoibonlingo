-- Schema for the 1v1 realtime duel feature.
--
-- HOW TO APPLY: this repo has no Supabase CLI/migration pipeline wired up, so run this
-- file's contents directly in your Supabase project's SQL Editor (Dashboard -> SQL Editor
-- -> New query -> paste -> Run). This is the same manual-apply pattern already used for
-- the IELTS grading Edge Function's ANTHROPIC_API_KEY secret - nothing here can be
-- executed from this codebase automatically since it requires your live project.

create table public.duels (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  challenger_username text not null,
  opponent_id uuid not null references public.profiles(id) on delete cascade,
  opponent_username text not null,

  status text not null default 'pending'
    check (status in ('pending', 'declined', 'cancelled', 'active', 'finished', 'expired')),

  -- Generated ONCE by the challenger at invite time (ExerciseGenerator.generateExercise()
  -- output, JSON-serializable) - both sides answer from this exact array, so there is no
  -- per-client RNG mismatch.
  questions jsonb not null,
  question_count int not null,

  -- Live progress per side, updated after every answered question. Realtime UPDATE
  -- events on this row are what the OTHER side's subscription reacts to.
  challenger_idx int not null default 0,
  challenger_correct int not null default 0,
  challenger_finished boolean not null default false,
  challenger_finished_at timestamptz,

  opponent_idx int not null default 0,
  opponent_correct int not null default 0,
  opponent_finished boolean not null default false,
  opponent_finished_at timestamptz,

  winner_id uuid references public.profiles(id),

  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  finished_at timestamptz
);

create index duels_opponent_pending_idx on public.duels (opponent_id, status);
create index duels_challenger_idx on public.duels (challenger_id);

-- Row Level Security
alter table public.duels enable row level security;

-- INSERT: any authenticated user can create a duel, but only as the challenger
-- (must be inserting their own auth.uid() into challenger_id).
create policy "duels_insert_as_challenger"
  on public.duels for insert
  to authenticated
  with check (challenger_id = auth.uid());

-- SELECT: only the two participants can see the row (this also gates what Realtime
-- will replay to a given client's subscription).
create policy "duels_select_participants"
  on public.duels for select
  to authenticated
  using (challenger_id = auth.uid() or opponent_id = auth.uid());

-- UPDATE: only the two participants can update, row-level only.
-- NOTE (explicit tradeoff, not an oversight): Postgres RLS USING/WITH CHECK clauses are
-- per-row, not per-column, so this policy cannot stop the challenger's client from also
-- writing opponent_* columns (or vice versa) in the same UPDATE statement. Building a
-- SECURITY DEFINER RPC per column is real engineering effort for zero practical payoff
-- here: this is a casual 1v1 quiz between two people who already know each other's
-- usernames, not a wagering/ranked/anti-cheat system. If this ever becomes competitive
-- or monetized, revisit with per-column RPC functions instead of client-side updates.
create policy "duels_update_participants"
  on public.duels for update
  to authenticated
  using (challenger_id = auth.uid() or opponent_id = auth.uid())
  with check (challenger_id = auth.uid() or opponent_id = auth.uid());

-- Required for Realtime to work at all - without this, postgres_changes subscriptions
-- connect successfully but silently never receive any events. This is the #1 cause of
-- "realtime doesn't work" bug reports for a new table.
alter publication supabase_realtime add table public.duels;

-- ONE THING TO VERIFY YOURSELF: the "challenge by username" feature needs to look up
-- OTHER users' profiles by username (not just your own by id). Check that your existing
-- `profiles` table RLS has a SELECT policy permissive enough for this (it almost
-- certainly already does, since the Leaderboard and Hall of Fame features already need
-- to read other users' usernames to display them) - this migration does not touch
-- `profiles` RLS at all, only the new `duels` table.
