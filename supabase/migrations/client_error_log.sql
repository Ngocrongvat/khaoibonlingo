-- Client-side error log (Foundation GĐ0, item 4: error monitoring — self-hosted, no vendor).
-- assets/js/error-monitor.js inserts uncaught JS errors + unhandled promise rejections here.
-- Reads are intentionally NOT exposed to anon/authenticated: inspect errors in the Supabase
-- dashboard (the service role bypasses RLS), so no user can read another user's error data.

create table if not exists public.client_errors (
    id          bigint generated always as identity primary key,
    created_at  timestamptz not null default now(),
    message     text,
    source      text,
    lineno      integer,
    colno       integer,
    stack       text,
    page_url    text,
    user_agent  text,
    username    text,
    app_version text
);

-- For pruning old rows and for time-ordered inspection in the dashboard.
create index if not exists client_errors_created_at_idx
    on public.client_errors (created_at desc);

alter table public.client_errors enable row level security;

-- Anyone may INSERT an error report — errors can happen before login, so anon is allowed.
-- with check (true) but no USING/SELECT policy means rows can be written but not read back
-- through the anon/authenticated API.
drop policy if exists "client_errors insert any" on public.client_errors;
create policy "client_errors insert any"
    on public.client_errors
    for insert
    to anon, authenticated
    with check (true);

-- (No SELECT / UPDATE / DELETE policies on purpose: only the service role / dashboard can
--  read or manage rows.)
