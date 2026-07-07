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
            return data || null;
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
            (data || []).forEach(row => {
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
            return data || [];
        } catch (e) {
            console.error('Failed to fetch conversation messages:', e);
            return [];
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
        markConversationRead,
        getTotalUnreadCount,
        subscribeToIncomingMessages
    };
})();
