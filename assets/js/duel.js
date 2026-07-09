// Wrapped in an IIFE (unlike leaderboard.js's plain top-level consts) because this file
// is loaded via a classic <script> tag in the same shared global lexical scope as
// leaderboard.js - two files both declaring top-level `const isConfigured`/`const client`
// collide with "Identifier has already been declared", silently breaking whichever script
// loads second (its top-level code never runs, so window.Duel never gets set).
(() => {
    const isConfigured = window.SupabaseClient ? window.SupabaseClient.isConfigured : false;
    const client = window.SupabaseClient ? window.SupabaseClient.client : null;

    // Queries the narrow `profile_usernames` view (id + username only), not `profiles`
    // directly - the profiles table's RLS restricts SELECT to your own row only, so a
    // direct query here would never find another user. The view intentionally exposes
    // nothing beyond id/username (no email/xp/stats/hearts/banned) to other users.
    async function getProfileIdByUsername(username) {
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
            console.error('Failed to look up profile by username:', e);
            return null;
        }
    }

    // gameType/gameLevel default to the original lesson-duel behavior - callers
    // challenging to a mini-game instead pass e.g. 'word_match'/'memory' and (for
    // 'memory' only) the level both players are locked to. The `duels` table and every
    // other function in this module were already schema-generic (questions is jsonb,
    // *_correct are plain integers used as "score") - these two extra columns are the
    // only change needed to reuse the whole realtime/RLS/winner-resolution pipeline for
    // mini-game 1v1 instead of building a parallel system.
    // questionCount defaults to questions.length (true for lesson questions and every
    // mini-game's round array 1:1) but the Memory game's `questions` payload is its
    // CARDS array (2x the pair count, since each pair has an en+vi card) - the actual
    // "total" that matches the 0..config.pairs scale used by *_correct/onProgress needs
    // to be passed explicitly there instead of falling out of questions.length.
    // groupBattleId/groupSide are optional and only ever set when this duel is one leg
    // of a larger group-vs-group battle (see groups.js's group battle screen in app.js).
    // Only included in the insert payload when actually provided (not just defaulted to
    // null) - PostgREST rejects an insert containing a key with no matching column, so
    // sending these unconditionally would break EVERY duel challenge (not just group
    // battle ones) on any Supabase project that hasn't yet run groups_schema.sql,
    // silently regressing a feature that has nothing to do with groups.
    async function challengeUser(myProfile, targetUsername, questions, gameType = 'lesson', gameLevel = null, questionCount = null, groupBattleId = null, groupSide = null) {
        if (!client || !myProfile || !targetUsername) return { error: 'Chưa cấu hình.' };
        try {
            const target = await getProfileIdByUsername(targetUsername);
            if (!target) return { error: 'Không tìm thấy người dùng này.' };
            if (target.id === myProfile.id) return { error: 'Bạn không thể tự thách đấu chính mình.' };

            const payload = {
                challenger_id: myProfile.id,
                challenger_username: myProfile.username,
                opponent_id: target.id,
                opponent_username: target.username,
                questions,
                question_count: questionCount != null ? questionCount : questions.length,
                game_type: gameType,
                game_level: gameLevel
            };
            if (groupBattleId != null) payload.group_battle_id = groupBattleId;
            if (groupSide != null) payload.group_side = groupSide;

            const { data, error } = await client.from('duels').insert(payload).select().single();
            if (error) throw error;
            return { data };
        } catch (e) {
            console.error('Failed to create duel challenge:', e);
            return { error: 'Không thể gửi lời thách đấu lúc này. Bảng "duels" có thể chưa được tạo trên Supabase.' };
        }
    }

    async function acceptDuel(duelId) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const { data, error } = await client
                .from('duels')
                .update({ status: 'active', accepted_at: new Date().toISOString() })
                .eq('id', duelId)
                .select()
                .single();
            if (error) throw error;
            return { data };
        } catch (e) {
            console.error('Failed to accept duel:', e);
            return { error: e.message };
        }
    }

    async function declineDuel(duelId) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const { error } = await client.from('duels').update({ status: 'declined' }).eq('id', duelId);
            if (error) throw error;
            return {};
        } catch (e) {
            console.error('Failed to decline duel:', e);
            return { error: e.message };
        }
    }

    async function cancelDuel(duelId) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const { error } = await client.from('duels').update({ status: 'cancelled' }).eq('id', duelId);
            if (error) throw error;
            return {};
        } catch (e) {
            console.error('Failed to cancel duel:', e);
            return { error: e.message };
        }
    }

    async function updateMyProgress(duelId, isChallenger, progress) {
        if (!client) return;
        const fields = isChallenger
            ? {
                challenger_idx: progress.idx,
                challenger_correct: progress.correct,
                challenger_finished: progress.finished,
                challenger_finished_at: progress.finished ? new Date().toISOString() : null
            }
            : {
                opponent_idx: progress.idx,
                opponent_correct: progress.correct,
                opponent_finished: progress.finished,
                opponent_finished_at: progress.finished ? new Date().toISOString() : null
            };
        try {
            const { error } = await client.from('duels').update(fields).eq('id', duelId);
            if (error) throw error;
        } catch (e) {
            console.error('Failed to update duel progress:', e);
        }
    }

    async function getPendingInvitesFor(userId) {
        if (!client || !userId) return [];
        try {
            const { data, error } = await client
                .from('duels')
                .select('*')
                .eq('opponent_id', userId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error('Failed to fetch pending duel invites:', e);
            return [];
        }
    }

    // Listens for brand-new challenges landing in your inbox while you're active in the
    // app (INSERT, not UPDATE - a fresh row appearing with you as opponent), so the main
    // screen can show a notification without the user having to open the Duel menu
    // themselves. Separate channel/filter from subscribeToDuel, which watches one
    // already-known duel row by id.
    function subscribeToIncomingInvites(userId, onNewInvite) {
        if (!client || !userId) return () => {};
        const channel = client
            .channel('duel-invites:' + userId)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'duels', filter: 'opponent_id=eq.' + userId },
                (payload) => onNewInvite(payload.new))
            .subscribe();
        return () => client.removeChannel(channel);
    }

    // Queries the `duel_results` view (finished duels only, id/winner/username columns
    // only - see duel_results_view.sql) since `duels` RLS restricts visibility to your
    // own matches. Aggregates win counts client-side (no GROUP BY round-trip needed) -
    // consistent with how leaderboard.js already does its own client-side logic.
    async function getDuelLeaderboard(limit = 20) {
        if (!client) return [];
        try {
            const { data, error } = await client
                .from('duel_results')
                .select('winner_id, challenger_id, challenger_username, opponent_id, opponent_username')
                .not('winner_id', 'is', null);
            if (error) throw error;
            const wins = {};
            (data || []).forEach(row => {
                const winnerName = row.winner_id === row.challenger_id ? row.challenger_username : row.opponent_username;
                if (!winnerName) return;
                wins[winnerName] = (wins[winnerName] || 0) + 1;
            });
            return Object.entries(wins)
                .map(([username, winCount]) => ({ username, wins: winCount }))
                .sort((a, b) => b.wins - a.wins)
                .slice(0, limit);
        } catch (e) {
            console.error('Failed to compute duel leaderboard:', e);
            return [];
        }
    }

    async function getDuel(duelId) {
        if (!client) return null;
        try {
            const { data, error } = await client.from('duels').select('*').eq('id', duelId).maybeSingle();
            if (error) throw error;
            return data;
        } catch (e) {
            console.error('Failed to fetch duel:', e);
            return null;
        }
    }

    // Subscribes to live changes on a single duel row (opponent accepting/declining,
    // progress ticking up, finishing). Returns an unsubscribe function - callers must
    // call it when leaving the duel flow, otherwise the realtime channel leaks.
    function subscribeToDuel(duelId, onUpdate) {
        if (!client) return () => {};
        const channel = client
            .channel('duel:' + duelId)
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'duels', filter: 'id=eq.' + duelId },
                (payload) => onUpdate(payload.new))
            .subscribe();
        return () => client.removeChannel(channel);
    }

    // Pure function, no network call - most correct answers wins, tie-broken by whoever
    // finished first.
    function resolveDuelWinner(duelRow) {
        if (duelRow.challenger_correct > duelRow.opponent_correct) return duelRow.challenger_id;
        if (duelRow.opponent_correct > duelRow.challenger_correct) return duelRow.opponent_id;
        if (duelRow.challenger_finished_at && duelRow.opponent_finished_at) {
            return new Date(duelRow.challenger_finished_at) <= new Date(duelRow.opponent_finished_at)
                ? duelRow.challenger_id
                : duelRow.opponent_id;
        }
        return null; // true tie with no finish-time data - callers should treat as a draw
    }

    // Idempotent by design (only affects rows not already finished) - safe even if both
    // sides' clients detect "both finished" near-simultaneously and both call this.
    async function finalizeDuel(duelId, winnerId) {
        if (!client) return;
        try {
            const { error } = await client
                .from('duels')
                .update({ status: 'finished', winner_id: winnerId, finished_at: new Date().toISOString() })
                .eq('id', duelId)
                .neq('status', 'finished');
            if (error) throw error;
        } catch (e) {
            console.error('Failed to finalize duel:', e);
        }
    }

    window.Duel = {
        isConfigured,
        getProfileIdByUsername,
        challengeUser,
        acceptDuel,
        declineDuel,
        cancelDuel,
        updateMyProgress,
        getPendingInvitesFor,
        getDuel,
        getDuelLeaderboard,
        subscribeToDuel,
        subscribeToIncomingInvites,
        resolveDuelWinner,
        finalizeDuel
    };
})();
