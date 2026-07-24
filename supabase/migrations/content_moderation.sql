-- Report + block (Compliance & Child-Safety, part 2). Run in Supabase → SQL Editor.
-- Reports are inspected by admins in the Supabase dashboard (service role bypasses RLS).

-- user_blocks: a user hides another user's messages/DMs everywhere. Owner-scoped.
create table if not exists public.user_blocks (
    id               bigint generated always as identity primary key,
    created_at       timestamptz not null default now(),
    blocker_id       uuid not null references auth.users(id) on delete cascade,
    blocked_id       uuid not null,
    blocked_username text,
    unique (blocker_id, blocked_id)
);
create index if not exists user_blocks_blocker_idx on public.user_blocks (blocker_id);

alter table public.user_blocks enable row level security;

drop policy if exists "user_blocks own select" on public.user_blocks;
create policy "user_blocks own select" on public.user_blocks
    for select to authenticated using (blocker_id = auth.uid());

drop policy if exists "user_blocks own insert" on public.user_blocks;
create policy "user_blocks own insert" on public.user_blocks
    for insert to authenticated with check (blocker_id = auth.uid());

drop policy if exists "user_blocks own delete" on public.user_blocks;
create policy "user_blocks own delete" on public.user_blocks
    for delete to authenticated using (blocker_id = auth.uid());

-- content_reports: user-submitted reports of a message or user. Insert-only for users;
-- reads happen via the Supabase dashboard / service role (no SELECT policy on purpose).
create table if not exists public.content_reports (
    id                bigint generated always as identity primary key,
    created_at        timestamptz not null default now(),
    reporter_id       uuid,
    reporter_username text,
    reported_user_id  uuid,
    reported_username text,
    context           text,   -- 'global_chat' | 'direct_message' | 'group_chat' | 'user_profile'
    message_id        text,
    message_text      text,
    reason            text,
    status            text not null default 'open'
);
create index if not exists content_reports_created_at_idx on public.content_reports (created_at desc);

alter table public.content_reports enable row level security;

drop policy if exists "content_reports insert own" on public.content_reports;
create policy "content_reports insert own" on public.content_reports
    for insert to authenticated with check (reporter_id = auth.uid());
-- (No SELECT/UPDATE/DELETE policies: reports are managed via the dashboard/service role.)
