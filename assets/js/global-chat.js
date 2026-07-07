// Wrapped in an IIFE (same reason as duel.js/friends.js) - this file is loaded via a
// classic <script> tag in the same shared global lexical scope as those files, so a
// top-level `const isConfigured`/`const client` here would collide with theirs.
(() => {
    const isConfigured = window.SupabaseClient ? window.SupabaseClient.isConfigured : false;
    const client = window.SupabaseClient ? window.SupabaseClient.client : null;

    const MAX_MESSAGE_LENGTH = 500;

    // Opportunistic cleanup - this app has no server/cron infrastructure, so "auto-delete
    // after 24h" can only realistically mean "delete stale rows whenever a client happens
    // to be reading the chat" (called from getRecentMessages() below on every fetch).
    // Fire-and-forget: a failed cleanup should never block the read, and running it
    // concurrently with the SELECT (rather than awaiting it first) keeps chat opens fast.
    async function deleteOldMessages() {
        if (!client) return;
        try {
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { error } = await client.from('global_chat_messages').delete().lt('created_at', cutoff);
            if (error) throw error;
        } catch (e) {
            console.error('Failed to delete old global chat messages:', e);
        }
    }

    // Returns messages oldest-first (ready to render top-to-bottom in a chat log) even
    // though the query itself fetches newest-first (so LIMIT actually caps at "most
    // recent N" rather than "oldest N") - the reverse happens client-side.
    async function getRecentMessages(limit = 50) {
        if (!client) return [];
        deleteOldMessages();
        try {
            const { data, error } = await client
                .from('global_chat_messages')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return (data || []).reverse();
        } catch (e) {
            console.error('Failed to fetch global chat messages:', e);
            return [];
        }
    }

    // Cheap count-only query (head:true skips fetching row bodies) for the unread badge -
    // avoids downloading full message text just to count how many arrived since sinceIso.
    async function getUnreadCount(sinceIso) {
        if (!client || !sinceIso) return 0;
        try {
            const { count, error } = await client
                .from('global_chat_messages')
                .select('id', { count: 'exact', head: true })
                .gt('created_at', sinceIso);
            if (error) throw error;
            return count || 0;
        } catch (e) {
            console.error('Failed to fetch global chat unread count:', e);
            return 0;
        }
    }

    async function sendMessage(myProfile, text) {
        if (!client || !myProfile) return { error: 'Chưa cấu hình.' };
        const trimmed = (text || '').trim();
        if (!trimmed) return { error: 'Vui lòng nhập tin nhắn.' };
        if (trimmed.length > MAX_MESSAGE_LENGTH) return { error: `Tin nhắn quá dài (tối đa ${MAX_MESSAGE_LENGTH} ký tự).` };
        try {
            const { data, error } = await client.from('global_chat_messages').insert({
                sender_id: myProfile.id,
                sender_username: myProfile.username,
                message: trimmed
            }).select().single();
            if (error) throw error;
            return { data };
        } catch (e) {
            console.error('Failed to send global chat message:', e);
            return { error: 'Không thể gửi tin nhắn lúc này. Bảng "global_chat_messages" có thể chưa được tạo trên Supabase.' };
        }
    }

    // Returns an unsubscribe function - callers must call it when the chat widget is
    // torn down/collapsed, otherwise the realtime channel leaks.
    //
    // channelKey distinguishes the widget's own open/closed subscription (toggleGlobalChat()
    // in app.js) from the session-wide unread-badge watcher (setupGlobalChatWatcher(), one
    // per login) - both call this same function. Without a distinct key they'd both try to
    // open a channel named 'global-chat', and Supabase's client.channel(name) reuses an
    // already-subscribed channel object for a repeated name, which throws "cannot add
    // callbacks after subscribe()" on the second .on(...) call - the exact bug already found
    // and fixed for inbox.js's subscribeToIncomingMessages().
    function subscribeToNewMessages(onNew, channelKey = 'widget') {
        if (!client) return () => {};
        const channel = client
            .channel('global-chat:' + channelKey)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'global_chat_messages' },
                (payload) => onNew(payload.new))
            .subscribe();
        return () => client.removeChannel(channel);
    }

    window.GlobalChat = {
        isConfigured,
        MAX_MESSAGE_LENGTH,
        getRecentMessages,
        getUnreadCount,
        sendMessage,
        subscribeToNewMessages
    };
})();
