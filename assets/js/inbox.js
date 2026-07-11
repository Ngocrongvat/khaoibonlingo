// Wrapped in an IIFE (same reason as duel.js/friends.js/global-chat.js).
(() => {
    const isConfigured = window.SupabaseClient ? window.SupabaseClient.isConfigured : false;
    const client = window.SupabaseClient ? window.SupabaseClient.client : null;

    const MAX_MESSAGE_LENGTH = 1000;

    // Same `profile_usernames` view duel.js/friends.js already use - `profiles` RLS
    // restricts SELECT to your own row, so looking up someone else's id by username has
    // to go through this narrow view. Unlike friends.js's flow, an inbox message does
    // NOT require the two people to already be friends.
    async function searchUserByUsername(username) {
        if (!client || !username) return null;
        try {
            const { data, error } = await client
                .from('profile_usernames')
                .select('id, username')
                .eq('username', username)
                .maybeSingle();
            if (error) throw error;
            if (data) return data;
            // Case-insensitive fallback, same as friends.js/duel.js - messaging
            // "tester" still reaches "Tester".
            const { data: ciData } = await client
                .from('profile_usernames')
                .select('id, username')
                .ilike('username', username)
                .maybeSingle();
            return ciData || null;
        } catch (e) {
            console.error('Failed to search user by username:', e);
            return null;
        }
    }

    async function sendDirectMessage(myProfile, targetUsername, text) {
        if (!client || !myProfile || !targetUsername) return { error: 'Chưa cấu hình.' };
        const trimmed = (text || '').trim();
        if (!trimmed) return { error: 'Vui lòng nhập tin nhắn.' };
        if (trimmed.length > MAX_MESSAGE_LENGTH) return { error: `Tin nhắn quá dài (tối đa ${MAX_MESSAGE_LENGTH} ký tự).` };
        try {
            const target = await searchUserByUsername(targetUsername);
            if (!target) return { error: 'Không tìm thấy người dùng này.' };
            if (target.id === myProfile.id) return { error: 'Bạn không thể tự nhắn tin cho chính mình.' };

            const { data, error } = await client.from('direct_messages').insert({
                sender_id: myProfile.id,
                sender_username: myProfile.username,
                recipient_id: target.id,
                recipient_username: target.username,
                message: trimmed
            }).select().single();
            if (error) throw error;
            return { data };
        } catch (e) {
            console.error('Failed to send direct message:', e);
            return { error: 'Không thể gửi tin nhắn lúc này. Bảng "direct_messages" có thể chưa được tạo trên Supabase.' };
        }
    }

    // Sends directly to an already-known recipient id (used from within an open
    // conversation, where the other user's id is already known - avoids a redundant
    // username lookup round-trip on every reply).
    async function sendDirectMessageToId(myProfile, recipientId, recipientUsername, text) {
        if (!client || !myProfile || !recipientId) return { error: 'Chưa cấu hình.' };
        const trimmed = (text || '').trim();
        if (!trimmed) return { error: 'Vui lòng nhập tin nhắn.' };
        if (trimmed.length > MAX_MESSAGE_LENGTH) return { error: `Tin nhắn quá dài (tối đa ${MAX_MESSAGE_LENGTH} ký tự).` };
        try {
            const { data, error } = await client.from('direct_messages').insert({
                sender_id: myProfile.id,
                sender_username: myProfile.username,
                recipient_id: recipientId,
                recipient_username: recipientUsername,
                message: trimmed
            }).select().single();
            if (error) throw error;
            return { data };
        } catch (e) {
            console.error('Failed to send direct message:', e);
            return { error: 'Không thể gửi tin nhắn lúc này.' };
        }
    }

    // Fetches every message involving this user, then groups client-side by "the other
    // party" - there's no separate conversations table, a conversation is just the set
    // of messages between two specific people. Mirrors how friends.js normalizes
    // requester/recipient rows into a flat {friendId, friendUsername} shape.
    // Per-side soft delete (see self_service_inbox_vibrancy.sql): a message the user
    // deleted from THEIR side carries deleted_by_sender/deleted_by_recipient = true and
    // must disappear from their lists without touching the other participant's view.
    // Filtered client-side (not in the query) so this keeps working on projects that
    // haven't applied that migration yet - the columns are simply undefined there.
    function isDeletedForMe(row, userId) {
        const iAmSender = row.sender_id === userId;
        return iAmSender ? !!row.deleted_by_sender : !!row.deleted_by_recipient;
    }

    async function getConversations(userId) {
        if (!client || !userId) return [];
        try {
            const { data, error } = await client
                .from('direct_messages')
                .select('*')
                .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
                .order('created_at', { ascending: true });
            if (error) throw error;

            const byOther = new Map();
            (data || []).filter(row => !isDeletedForMe(row, userId)).forEach(row => {
                const iAmSender = row.sender_id === userId;
                const otherId = iAmSender ? row.recipient_id : row.sender_id;
                const otherUsername = iAmSender ? row.recipient_username : row.sender_username;
                if (!byOther.has(otherId)) {
                    byOther.set(otherId, { otherUserId: otherId, otherUsername, lastMessage: '', lastMessageAt: null, unreadCount: 0 });
                }
                const convo = byOther.get(otherId);
                convo.lastMessage = row.message;
                convo.lastMessageAt = row.created_at;
                if (!iAmSender && !row.read) convo.unreadCount++;
            });

            return [...byOther.values()].sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
        } catch (e) {
            console.error('Failed to fetch conversations:', e);
            return [];
        }
    }

    async function getConversationMessages(userId, otherUserId) {
        if (!client || !userId || !otherUserId) return [];
        try {
            const { data, error } = await client
                .from('direct_messages')
                .select('*')
                .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
                .order('created_at', { ascending: true });
            if (error) throw error;
            return (data || []).filter(row => !isDeletedForMe(row, userId));
        } catch (e) {
            console.error('Failed to fetch conversation messages:', e);
            return [];
        }
    }

    // Hides ONE message from the caller's side only - sets the flag matching their role
    // on that row. RLS allows each side to update only their own rows, so the wrong-side
    // flag can't be flipped even if called with a mismatched role.
    async function deleteMessageForMe(userId, message) {
        if (!client || !userId || !message) return { error: 'Chưa cấu hình.' };
        const iAmSender = message.sender_id === userId;
        // A recipient hiding an unread message also marks it read, otherwise it would
        // keep counting toward the unread badge while being invisible in the thread.
        const fields = iAmSender ? { deleted_by_sender: true } : { deleted_by_recipient: true, read: true };
        try {
            const { error } = await client
                .from('direct_messages')
                .update(fields)
                .eq('id', message.id);
            if (error) throw error;
            return {};
        } catch (e) {
            console.error('Failed to delete message:', e);
            return { error: 'Không thể xóa tin nhắn. Có thể cần chạy migration "self_service_inbox_vibrancy.sql" trên Supabase.' };
        }
    }

    // Hides an entire conversation from the caller's side (both directions), leaving
    // the other participant's copy untouched. Two updates because each direction flips
    // a different flag under a different RLS policy.
    async function deleteConversationForMe(userId, otherUserId) {
        if (!client || !userId || !otherUserId) return { error: 'Chưa cấu hình.' };
        try {
            const { error: sentErr } = await client
                .from('direct_messages')
                .update({ deleted_by_sender: true })
                .eq('sender_id', userId)
                .eq('recipient_id', otherUserId);
            if (sentErr) throw sentErr;
            const { error: recvErr } = await client
                .from('direct_messages')
                .update({ deleted_by_recipient: true, read: true })
                .eq('recipient_id', userId)
                .eq('sender_id', otherUserId);
            if (recvErr) throw recvErr;
            return {};
        } catch (e) {
            console.error('Failed to delete conversation:', e);
            return { error: 'Không thể xóa cuộc trò chuyện. Có thể cần chạy migration "self_service_inbox_vibrancy.sql" trên Supabase.' };
        }
    }

    // Marks every unread message FROM otherUserId TO userId as read - only ever updates
    // rows where recipient_id = userId (our own incoming messages), consistent with the
    // "always update your own row" RLS model used across this codebase.
    async function markConversationRead(userId, otherUserId) {
        if (!client || !userId || !otherUserId) return;
        try {
            const { error } = await client
                .from('direct_messages')
                .update({ read: true })
                .eq('recipient_id', userId)
                .eq('sender_id', otherUserId)
                .eq('read', false);
            if (error) throw error;
        } catch (e) {
            console.error('Failed to mark conversation as read:', e);
        }
    }

    async function getTotalUnreadCount(userId) {
        if (!client || !userId) return 0;
        try {
            const { count, error } = await client
                .from('direct_messages')
                .select('id', { count: 'exact', head: true })
                .eq('recipient_id', userId)
                .eq('read', false);
            if (error) throw error;
            return count || 0;
        } catch (e) {
            console.error('Failed to fetch unread message count:', e);
            return 0;
        }
    }

    // Mirrors duel.js's subscribeToIncomingInvites - watches for brand-new messages
    // landing with you as recipient, regardless of which conversation screen (if any)
    // is currently open.
    //
    // channelKey distinguishes the session-wide watcher (setupInboxWatcher(), one per
    // login) from a per-conversation subscription (renderConversation(), one per open
    // thread) - both call this same function with the same userId, and Supabase's
    // client.channel(name) reuses an existing channel object for a name that's already
    // subscribed. Without a distinct key, the second .channel('inbox:'+userId) call
    // would try to attach a second postgres_changes listener to the SAME already-
    // subscribed channel and throw "cannot add callbacks after subscribe()".
    function subscribeToIncomingMessages(userId, onNew, channelKey = 'watcher') {
        if (!client || !userId) return () => {};
        const channel = client
            .channel('inbox:' + channelKey + ':' + userId)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: 'recipient_id=eq.' + userId },
                (payload) => onNew(payload.new))
            .subscribe();
        return () => client.removeChannel(channel);
    }

    window.Inbox = {
        isConfigured,
        MAX_MESSAGE_LENGTH,
        searchUserByUsername,
        sendDirectMessage,
        sendDirectMessageToId,
        getConversations,
        getConversationMessages,
        deleteMessageForMe,
        deleteConversationForMe,
        markConversationRead,
        getTotalUnreadCount,
        subscribeToIncomingMessages
    };
})();
