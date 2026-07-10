// Wrapped in an IIFE (same reason as duel.js) - this file is loaded via a classic
// <script> tag in the same shared global lexical scope as leaderboard.js/duel.js, so a
// top-level `const isConfigured`/`const client` here would collide with theirs.
(() => {
    const isConfigured = window.SupabaseClient ? window.SupabaseClient.isConfigured : false;
    const client = window.SupabaseClient ? window.SupabaseClient.client : null;

    // Same `profile_usernames` view duel.js already uses - `profiles` RLS restricts
    // SELECT to your own row, so looking up someone else's id by username has to go
    // through this narrow view (id + username only, nothing sensitive).
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

    // Wider read than searchUserByUsername() - pulls the extra public-safe columns
    // (see chat_cleanup_and_user_menu.sql) for the "click a username -> Xem info" card.
    // Kept as a separate function rather than widening searchUserByUsername()'s own
    // select() since that one is on the hot path for challenge/friend-request/message
    // lookups that only ever need id+username.
    async function getUserInfo(username) {
        if (!client || !username) return null;
        try {
            const { data, error } = await client
                .from('profile_usernames')
                .select('id, username, xp, streak, teddy_bears, avatar_url')
                .eq('username', username)
                .maybeSingle();
            if (error) throw error;
            return data || null;
        } catch (e) {
            console.error('Failed to fetch user info:', e);
            return null;
        }
    }

    // Powers the "Đang online" board - a user counts as online if last_active_at (bumped
    // every 60s by app.js's startPresenceHeartbeat() while a tab is open) falls inside the
    // given window. Same profile_usernames view already used everywhere else for public-
    // safe cross-user reads.
    async function getOnlineMembers(minutesWindow = 5, limit = 100) {
        if (!client) return [];
        try {
            const cutoff = new Date(Date.now() - minutesWindow * 60 * 1000).toISOString();
            const { data, error } = await client
                .from('profile_usernames')
                .select('id, username, xp, streak, last_active_at')
                .gt('last_active_at', cutoff)
                .order('last_active_at', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Failed to fetch online members:', e);
            return [];
        }
    }

    async function sendFriendRequest(myProfile, targetUsername) {
        if (!client || !myProfile || !targetUsername) return { error: 'Chưa cấu hình.' };
        try {
            const target = await searchUserByUsername(targetUsername);
            if (!target) return { error: 'Không tìm thấy người dùng này.' };
            if (target.id === myProfile.id) return { error: 'Bạn không thể tự kết bạn với chính mình.' };

            const { data, error } = await client.from('friendships').insert({
                requester_id: myProfile.id,
                requester_username: myProfile.username,
                recipient_id: target.id,
                recipient_username: target.username
            }).select().single();
            if (error) {
                // Unique index on the (unordered) pair blocks a duplicate pending/
                // accepted request - surface that specific case with a clear message
                // instead of a raw Postgres constraint error.
                if (error.code === '23505') return { error: 'Đã có lời mời hoặc đã là bạn bè với người này rồi.' };
                throw error;
            }
            return { data };
        } catch (e) {
            console.error('Failed to send friend request:', e);
            return { error: 'Không thể gửi lời mời kết bạn lúc này. Bảng "friendships" có thể chưa được tạo trên Supabase.' };
        }
    }

    async function acceptFriendRequest(id) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const { data, error } = await client
                .from('friendships')
                .update({ status: 'accepted', responded_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return { data };
        } catch (e) {
            console.error('Failed to accept friend request:', e);
            return { error: e.message };
        }
    }

    async function declineFriendRequest(id) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const { error } = await client
                .from('friendships')
                .update({ status: 'declined', responded_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            return {};
        } catch (e) {
            console.error('Failed to decline friend request:', e);
            return { error: e.message };
        }
    }

    async function cancelFriendRequest(id) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const { error } = await client.from('friendships').update({ status: 'cancelled' }).eq('id', id);
            if (error) throw error;
            return {};
        } catch (e) {
            console.error('Failed to cancel friend request:', e);
            return { error: e.message };
        }
    }

    // Normalizes each accepted friendship row (which stores requester/recipient, not
    // "me"/"friend") into a flat {friendshipId, friendId, friendUsername,
    // lastHeartGiftAt} shape from the current user's point of view - callers never need
    // to know which side of the row they were.
    async function getFriendsList(userId) {
        if (!client || !userId) return [];
        try {
            const { data, error } = await client
                .from('friendships')
                .select('*')
                .eq('status', 'accepted')
                .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);
            if (error) throw error;
            return (data || []).map(row => {
                const iAmRequester = row.requester_id === userId;
                return {
                    friendshipId: row.id,
                    friendId: iAmRequester ? row.recipient_id : row.requester_id,
                    friendUsername: iAmRequester ? row.recipient_username : row.requester_username,
                    lastHeartGiftAt: row.last_heart_gift_at
                };
            });
        } catch (e) {
            console.error('Failed to fetch friends list:', e);
            return [];
        }
    }

    async function getPendingRequestsFor(userId) {
        if (!client || !userId) return [];
        try {
            const { data, error } = await client
                .from('friendships')
                .select('*')
                .eq('recipient_id', userId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Failed to fetch pending friend requests:', e);
            return [];
        }
    }

    async function getFriendCount(userId) {
        const list = await getFriendsList(userId);
        return list.length;
    }

    // Targeted single-pair lookup (rather than fetching the whole friends list) - used by
    // the "click a username" action menu to decide whether to show a "Kết bạn" button,
    // which needs a fast per-click check against one specific other user, not everyone.
    async function isFriend(myId, otherId) {
        if (!client || !myId || !otherId) return false;
        try {
            const { data, error } = await client
                .from('friendships')
                .select('id')
                .eq('status', 'accepted')
                .or(`and(requester_id.eq.${myId},recipient_id.eq.${otherId}),and(requester_id.eq.${otherId},recipient_id.eq.${myId})`)
                .maybeSingle();
            if (error) throw error;
            return !!data;
        } catch (e) {
            console.error('Failed to check friendship status:', e);
            return false;
        }
    }

    // Mirrors duel.js's subscribeToIncomingInvites - watches for brand-new pending
    // requests landing with you as recipient while the app is open.
    function subscribeToIncomingFriendRequests(userId, onNewRequest) {
        if (!client || !userId) return () => {};
        const channel = client
            .channel('friend-requests:' + userId)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'friendships', filter: 'recipient_id=eq.' + userId },
                (payload) => onNewRequest(payload.new))
            .subscribe();
        return () => client.removeChannel(channel);
    }

    // Pure function - compares against local midnight, consistent with how streak/
    // leaderboard week-id logic elsewhere in this codebase already reasons about "today"
    // in the user's own timezone rather than UTC.
    function canGiftHeartToday(friendshipRow) {
        const lastGift = friendshipRow && (friendshipRow.last_heart_gift_at || friendshipRow.lastHeartGiftAt);
        if (!lastGift) return true;
        const last = new Date(lastGift);
        const now = new Date();
        return last.getFullYear() !== now.getFullYear()
            || last.getMonth() !== now.getMonth()
            || last.getDate() !== now.getDate();
    }

    // Sender never loses anything (per product decision) - this only stamps the
    // pair's cooldown and drops an unclaimed gift for the recipient to pick up
    // themselves (see claimGift) since RLS forbids writing to their `hearts` directly.
    async function giftHeart(friendshipId, myProfile, friendId) {
        if (!client || !myProfile || !friendshipId || !friendId) return { error: 'Chưa cấu hình.' };
        try {
            const { error: updateError } = await client
                .from('friendships')
                .update({ last_heart_gift_at: new Date().toISOString() })
                .eq('id', friendshipId);
            if (updateError) throw updateError;

            const { error: insertError } = await client.from('heart_gifts').insert({
                from_id: myProfile.id,
                from_username: myProfile.username,
                to_id: friendId
            });
            if (insertError) throw insertError;
            return {};
        } catch (e) {
            console.error('Failed to gift heart:', e);
            return { error: 'Không thể tặng tim lúc này.' };
        }
    }

    async function getUnclaimedGifts(userId) {
        if (!client || !userId) return [];
        try {
            const { data, error } = await client
                .from('heart_gifts')
                .select('*')
                .eq('to_id', userId)
                .eq('claimed', false);
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Failed to fetch unclaimed heart gifts:', e);
            return [];
        }
    }

    async function claimGift(giftId) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const { error } = await client
                .from('heart_gifts')
                .update({ claimed: true, claimed_at: new Date().toISOString() })
                .eq('id', giftId);
            if (error) throw error;
            return {};
        } catch (e) {
            console.error('Failed to claim heart gift:', e);
            return { error: e.message };
        }
    }

    window.Friends = {
        isConfigured,
        searchUserByUsername,
        getUserInfo,
        getOnlineMembers,
        sendFriendRequest,
        acceptFriendRequest,
        declineFriendRequest,
        cancelFriendRequest,
        getFriendsList,
        getPendingRequestsFor,
        getFriendCount,
        isFriend,
        subscribeToIncomingFriendRequests,
        canGiftHeartToday,
        giftHeart,
        getUnclaimedGifts,
        claimGift
    };
})();
