-- Schema for the global community chat (home page widget) and the personal inbox
-- (1-on-1 direct messages between any two users, not just friends).
--
-- HOW TO APPLY: same manual-apply pattern as duels_schema.sql / friends_and_gifts_schema.sql
-- - run this file's contents directly in your Supabase project's SQL Editor (Dashboard ->
-- SQL Editor -> New query -> paste -> Run). Nothing here can be executed from this
-- codebase automatically since it requires your live project.

-- ============================= Global chat =============================
-- One row per message, visible to every authenticated user, writable only as yourself.
-- No moderation/deletion in this first version - a casual community chat for a small
-- hobby app, not a system that needs abuse-handling tooling yet.
create table public.global_chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_username text not null,
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

create index global_chat_messages_created_at_idx on public.global_chat_messages (created_at desc);

alter table public.global_chat_messages enable row level security;

-- INSERT: only as yourself.
create policy global_chat_insert_as_self on public.global_chat_messages for insert to authenticated
  with check (sender_id = auth.uid());

-- SELECT: everyone can read every message - this is the whole point of a shared chat.
create policy global_chat_select_all on public.global_chat_messages for select to authenticated
  using (true);

-- Required for Realtime - without this, subscriptions connect but never receive events.
alter publication supabase_realtime add table public.global_chat_messages;


-- ============================= Direct messages (personal inbox) =============================
-- One row per message between exactly two users. Unlike friendships/duels, this has NO
-- requirement that the two people be friends first - anyone can message anyone by
-- username, same as the existing "challenge by username" flow.
create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_username text not null,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  recipient_username text not null,
  message text not null check (char_length(message) between 1 and 1000),
  created_at timestamptz not null default now(),
  read boolean not null default false,
  constraint direct_messages_no_self check (sender_id <> recipient_id)
);

-- Powers "list all messages between me and this other person, in order" - the
-- least/greatest pair makes the index useful regardless of who is sender vs recipient.
create index direct_messages_conversation_idx on public.direct_messages
  (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at);

create index direct_messages_recipient_unread_idx on public.direct_messages (recipient_id, read);

alter table public.direct_messages enable row level security;

-- INSERT: only as the sender.
create policy direct_messages_insert_as_sender on public.direct_messages for insert to authenticated
  with check (sender_id = auth.uid());

-- SELECT: either participant in the conversation.
create policy direct_messages_select_participants on public.direct_messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());

-- UPDATE: only the recipient can mark their own incoming message as read (same
-- self-row-only pattern already used for heart_gifts.claimed).
create policy direct_messages_update_recipient_read on public.direct_messages for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

alter publication supabase_realtime add table public.direct_messages;
