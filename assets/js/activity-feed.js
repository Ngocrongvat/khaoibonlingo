// Wrapped in an IIFE (same reason as global-chat.js/friends.js) - this file is loaded via
// a classic <script> tag in the same shared global lexical scope as those files, so a
// top-level `const isConfigured`/`const client` here would collide with theirs.
(() => {
    const isConfigured = window.SupabaseClient ? window.SupabaseClient.isConfigured : false;
    const client = window.SupabaseClient ? window.SupabaseClient.client : null;

    // Opportunistic cleanup (no cron infrastructure) - mirrors global-chat.js's
    // deleteOldMessages() exactly, just a longer 72h window since these events are much
    // lower-frequency and the ticker would run dry overnight with chat's 24h cutoff.
    async function deleteOldEvents() {
        if (!client) return;
        try {
            const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
            const { error } = await client.from('activity_feed').delete().lt('created_at', cutoff);
            if (error) throw error;
        } catch (e) {
            console.error('Failed to delete old activity feed events:', e);
        }
    }

    // userId is optional (null for events where the acting client doesn't have it handy -
    // callers should still pass it whenever available so ticker entries can use
    // clickableUsername()). Not restricted to "post about yourself" - the teddy_bear event
    // is posted on behalf of whichever user won the weekly streak prize, which may not be
    // the client currently running (see checkAndAwardStreakPrize() in leaderboard.js).
    async function postEvent(eventType, userId, username, message) {
        if (!client || !username || !message) return { error: 'Chưa cấu hình.' };
        try {
            const { data, error } = await client.from('activity_feed').insert({
                event_type: eventType,
                user_id: userId || null,
                username,
                message: message.slice(0, 300)
            }).select().single();
            if (error) throw error;
            return { data };
        } catch (e) {
            console.error('Failed to post activity feed event:', e);
            return { error: e.message };
        }
    }

    async function getRecentEvents(limit = 30) {
        if (!client) return [];
        deleteOldEvents();
        try {
            const { data, error } = await client
                .from('activity_feed')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return (data || []).reverse();
        } catch (e) {
            console.error('Failed to fetch activity feed events:', e);
            return [];
        }
    }

    // channelKey mirrors the exact pattern already fixed this session for global-chat.js/
    // inbox.js/groups.js - a distinct key per independent subscriber avoids two callers
    // colliding on the same channel name and hitting "cannot add callbacks after
    // subscribe()".
    function subscribeToNewEvents(onNew, channelKey = 'widget') {
        if (!client) return () => {};
        const channel = client
            .channel('activity-feed:' + channelKey)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'activity_feed' },
                (payload) => onNew(payload.new))
            .subscribe();
        return () => client.removeChannel(channel);
    }

    window.ActivityFeed = {
        isConfigured,
        postEvent,
        getRecentEvents,
        subscribeToNewEvents
    };
})();
