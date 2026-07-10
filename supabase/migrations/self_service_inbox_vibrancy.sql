-- Self-service account management (rename + delete own account), per-side inbox
-- message deletion, and the per-user "Sôi nổi" (vibrancy) leaderboard column.
--
-- HOW TO APPLY: same manual-apply pattern as the other files in this folder - run this
-- file's contents directly in your Supabase project's SQL Editor (Dashboard -> SQL
-- Editor -> New query -> paste -> Run).

-- ============================= (1) Rename own account =============================
-- The username is denormalized into many tables (leaderboard, chat, duels, friends,
-- groups...) because their RLS models deliberately avoid joining back to `profiles`
-- (whose SELECT is restricted to your own row). A rename therefore has to fan out to
-- every copy in one transaction - which is exactly what a single SQL function gives us.
-- SECURITY DEFINER because several of those tables only allow updating your own rows
-- under RLS (e.g. a duel row where you are the opponent is "owned" by the challenger).
-- The function itself only ever touches rows tied to auth.uid(), so it cannot be used
-- to rename anyone else.
create or replace function public.rename_own_account(p_new_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_old text;
  v_new text := trim(p_new_username);
begin
  if v_uid is null then
    raise exception 'Bạn chưa đăng nhập.';
  end if;
  if v_new is null or char_length(v_new) < 3 or char_length(v_new) > 20 then
    raise exception 'Tên hiển thị phải từ 3 đến 20 ký tự.';
  end if;

  select username into v_old from public.profiles where id = v_uid;
  if v_old is null then
    raise exception 'Không tìm thấy hồ sơ của bạn.';
  end if;
  if v_old = v_new then
    return v_new;
  end if;
  if exists (select 1 from public.profiles where username = v_new and id <> v_uid) then
    raise exception 'Tên hiển thị này đã có người dùng khác sử dụng.';
  end if;

  update public.profiles set username = v_new where id = v_uid;

  -- The leaderboard is keyed by username (no id column), so move the row over.
  -- A leftover row under the new name (shouldn't exist, but upserts race) is replaced.
  delete from public.leaderboard where username = v_new;
  update public.leaderboard set username = v_new where username = v_old;
  update public.hall_of_fame set username = v_new where username = v_old;
  update public.streak_hall_of_fame set username = v_new where username = v_old;

  -- Denormalized copies on id-keyed tables - each update is scoped by the uid column
  -- sitting next to the username copy, never by the old name alone.
  update public.global_chat_messages set sender_username = v_new where sender_id = v_uid;
  update public.direct_messages set sender_username = v_new where sender_id = v_uid;
  update public.direct_messages set recipient_username = v_new where recipient_id = v_uid;
  update public.duels set challenger_username = v_new where challenger_id = v_uid;
  update public.duels set opponent_username = v_new where opponent_id = v_uid;
  update public.friendships set requester_username = v_new where requester_id = v_uid;
  update public.friendships set recipient_username = v_new where recipient_id = v_uid;
  update public.heart_gifts set from_username = v_new where from_id = v_uid;
  update public.activity_feed set username = v_new where user_id = v_uid;
  update public.group_members set username = v_new where user_id = v_uid;
  update public.groups set owner_username = v_new where owner_id = v_uid;
  update public.group_messages set sender_username = v_new where sender_id = v_uid;

  return v_new;
end;
$$;

grant execute on function public.rename_own_account(text) to authenticated;

-- ============================= (2) Delete own account =============================
-- Deleting the auth.users row cascades to profiles (profiles.id references
-- auth.users) and from there to every table with an "on delete cascade" FK back to
-- profiles (chat, duels, friendships, group memberships...). The username-keyed
-- leaderboard row has no FK, so it is removed explicitly. Hall-of-fame history is
-- deliberately kept - those are past weekly awards, not live account data.
--
-- DELIBERATE TRADE-OFF: two-party rows (DM threads, friendships, duel history) are
-- hard-deleted for BOTH participants, so the other person's copy of a shared
-- conversation disappears too. This is full-erasure semantics ("xóa sạch mọi dấu
-- vết"), chosen over a tombstone/"deleted user" model to keep the schema unchanged -
-- the client's confirm dialog warns the user explicitly before calling this.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_username text;
begin
  if v_uid is null then
    raise exception 'Bạn chưa đăng nhập.';
  end if;
  select username into v_username from public.profiles where id = v_uid;
  if v_username is not null then
    delete from public.leaderboard where username = v_username;
  end if;
  delete from auth.users where id = v_uid;
end;
$$;

grant execute on function public.delete_own_account() to authenticated;

-- ============================= (3) Inbox: delete messages for me =============================
-- Per-side soft delete: each participant can hide a message from THEIR view without
-- destroying the other side's copy (a hard DELETE would silently rewrite the other
-- person's conversation history). The client filters these flags out on read.
alter table public.direct_messages add column if not exists deleted_by_sender boolean not null default false;
alter table public.direct_messages add column if not exists deleted_by_recipient boolean not null default false;

-- The existing update policy only covered the recipient (for the `read` flag). The
-- sender now also needs to update their own outgoing rows (deleted_by_sender).
drop policy if exists direct_messages_update_sender_flags on public.direct_messages;
create policy direct_messages_update_sender_flags on public.direct_messages for update to authenticated
  using (sender_id = auth.uid()) with check (sender_id = auth.uid());

-- RLS policies can't restrict WHICH columns an update touches, so on their own the two
-- update policies would let a sender rewrite a message they already sent (or flip the
-- recipient's own deleted/read flags, hiding the message from the OTHER side). This
-- trigger enforces the per-role column contract: senders may only flip
-- deleted_by_sender, recipients may only flip read/deleted_by_recipient - everything
-- else (message text, ids, usernames, timestamps) is immutable after insert.
-- auth.uid() is null for service-role/SQL-editor sessions, which stay unrestricted.
create or replace function public.direct_messages_guard_update()
returns trigger
language plpgsql
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return new;
  end if;

  if new.sender_id is distinct from old.sender_id
     or new.sender_username is distinct from old.sender_username
     or new.recipient_id is distinct from old.recipient_id
     or new.recipient_username is distinct from old.recipient_username
     or new.message is distinct from old.message
     or new.created_at is distinct from old.created_at then
    raise exception 'Tin nhắn đã gửi không thể chỉnh sửa.';
  end if;

  if v_uid = old.sender_id then
    if new.read is distinct from old.read
       or new.deleted_by_recipient is distinct from old.deleted_by_recipient then
      raise exception 'Người gửi chỉ được ẩn tin nhắn ở phía mình.';
    end if;
  elsif v_uid = old.recipient_id then
    if new.deleted_by_sender is distinct from old.deleted_by_sender then
      raise exception 'Người nhận chỉ được ẩn tin nhắn ở phía mình.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists direct_messages_update_guard on public.direct_messages;
create trigger direct_messages_update_guard
  before update on public.direct_messages
  for each row execute function public.direct_messages_guard_update();

-- ============================= (4) User "Sôi nổi" (vibrancy) score =============================
-- Mirrors the group vibrancy_score concept at the individual level - accumulated from
-- activity (lessons, practice, duels, games, chat). Lives on the world-readable
-- `leaderboard` table so it can be ranked across users (profiles SELECT is self-only).
alter table public.leaderboard add column if not exists vibrancy integer not null default 0;
