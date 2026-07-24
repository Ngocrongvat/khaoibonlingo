// Report + block (Compliance & Child-Safety, part 2). window.Moderation lets a user report
// a message/user and block a user so their messages/DMs are hidden everywhere. Blocks live in
// public.user_blocks (owner-scoped RLS); reports in public.content_reports (insert-only, read
// via dashboard). See supabase/migrations/content_moderation.sql. The block set is cached in
// memory and consulted synchronously by the chat render/realtime paths via isBlocked().
const Moderation = (() => {
    const client = window.SupabaseClient ? window.SupabaseClient.client : null;

    let blockedIds = new Set();
    let loadedFor = null; // profile id the cache was loaded for (idempotent ensureLoaded)

    async function loadMyBlocks(myId) {
        if (!client || !myId) return blockedIds;
        try {
            const { data, error } = await client.from('user_blocks').select('blocked_id').eq('blocker_id', myId);
            if (error) throw error;
            blockedIds = new Set((data || []).map((r) => r.blocked_id));
        } catch (e) {
            console.error('Failed to load blocks (migration content_moderation.sql may be missing):', e);
        }
        return blockedIds;
    }

    // Load the block list once per signed-in user (safe to call on every home render).
    async function ensureLoaded(myId) {
        if (!myId || loadedFor === myId) return blockedIds;
        loadedFor = myId;
        return loadMyBlocks(myId);
    }

    function isBlocked(id) {
        return !!id && blockedIds.has(id);
    }

    function getBlockedIds() {
        return blockedIds;
    }

    async function blockUser(myProfile, blockedId, blockedUsername) {
        if (!client || !myProfile || !blockedId) return { error: 'Chưa cấu hình.' };
        if (blockedId === myProfile.id) return { error: 'Bạn không thể tự chặn chính mình.' };
        try {
            const { error } = await client.from('user_blocks').insert({
                blocker_id: myProfile.id,
                blocked_id: blockedId,
                blocked_username: blockedUsername || null,
            });
            // 23505 = already blocked; treat as success.
            if (error && error.code !== '23505') throw error;
            blockedIds.add(blockedId);
            return {};
        } catch (e) {
            console.error('blockUser failed:', e);
            return { error: 'Không thể chặn lúc này. (Quản trị viên cần chạy migration content_moderation.sql.)' };
        }
    }

    async function unblockUser(myProfile, blockedId) {
        if (!client || !myProfile || !blockedId) return { error: 'Chưa cấu hình.' };
        try {
            const { error } = await client.from('user_blocks').delete().eq('blocker_id', myProfile.id).eq('blocked_id', blockedId);
            if (error) throw error;
            blockedIds.delete(blockedId);
            return {};
        } catch (e) {
            console.error('unblockUser failed:', e);
            return { error: 'Không thể bỏ chặn lúc này.' };
        }
    }

    // payload: { reportedUserId, reportedUsername, context, messageId, messageText, reason }
    async function reportContent(myProfile, payload) {
        if (!client || !myProfile) return { error: 'Chưa cấu hình.' };
        payload = payload || {};
        try {
            const { error } = await client.from('content_reports').insert({
                reporter_id: myProfile.id,
                reporter_username: myProfile.username,
                reported_user_id: payload.reportedUserId || null,
                reported_username: payload.reportedUsername || null,
                context: payload.context || null,
                message_id: payload.messageId != null ? String(payload.messageId) : null,
                message_text: payload.messageText ? String(payload.messageText).slice(0, 1000) : null,
                reason: payload.reason ? String(payload.reason).slice(0, 300) : null,
            });
            if (error) throw error;
            return {};
        } catch (e) {
            console.error('reportContent failed:', e);
            return { error: 'Không thể gửi báo cáo lúc này. (Quản trị viên cần chạy migration content_moderation.sql.)' };
        }
    }

    return { loadMyBlocks, ensureLoaded, isBlocked, getBlockedIds, blockUser, unblockUser, reportContent };
})();

window.Moderation = Moderation;
