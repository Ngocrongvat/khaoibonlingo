const isConfigured = window.SupabaseClient ? window.SupabaseClient.isConfigured : false;
const client = window.SupabaseClient ? window.SupabaseClient.client : null;

// Session-scoped TTL cache for read queries. Rankings don't change second-to-second,
// but the UI refetches them on every tab switch / dashboard visit - a short TTL keeps
// the screens snappy and cuts Supabase request volume without ever showing stale data
// for long. Failures are cached too (same TTL) so a down endpoint isn't hammered.
// submitScore() clears the cache: the user's own sync is the one moment fresh rows
// genuinely matter.
const _readCache = new Map();
async function _cached(key, ttlMs, fn) {
    const hit = _readCache.get(key);
    if (hit && Date.now() - hit.t < ttlMs) return hit.v;
    const v = await fn();
    _readCache.set(key, { t: Date.now(), v });
    return v;
}

async function submitScore(username, xp, streak, vibrancy = null, lastActivityDate = null) {
    if (!client || !username) return;
    _readCache.clear();
    const base = {
        username,
        xp,
        streak,
        updated_at: new Date().toISOString()
    };
    try {
        // vibrancy and last_activity_date are newer columns - include them when the
        // caller has them, and fall back to the legacy payload if a column doesn't
        // exist yet so the core XP/streak sync never breaks.
        const payload = { ...base };
        if (vibrancy != null) payload.vibrancy = vibrancy;
        if (lastActivityDate) payload.last_activity_date = lastActivityDate;
        const { error } = await client.from('leaderboard').upsert(payload);
        if (error) {
            // Retry with only the always-present columns (covers a missing vibrancy or
            // last_activity_date column).
            const { error: retryError } = await client.from('leaderboard').upsert(base);
            if (retryError) throw retryError;
        }
    } catch (e) {
        console.error('Failed to submit score to leaderboard:', e);
    }
}

// User "Sôi nổi" ranking - same world-readable `leaderboard` table, sorted by the
// vibrancy column instead of xp/streak. Returns error:true (rendered as a friendly
// "not available" message) on projects that haven't added the column yet.
async function getVibrancyLeaderboard(count = 50) {
    return _cached('vibrancy:' + count, 30000, async () => {
        if (!client) return { configured: false, entries: [] };
        try {
            const { data, error } = await client
                .from('leaderboard')
                .select('*')
                .order('vibrancy', { ascending: false })
                .limit(count);
            if (error) throw error;
            return { configured: true, entries: data || [] };
        } catch (e) {
            console.error('Failed to fetch vibrancy leaderboard:', e);
            return { configured: true, entries: [], error: true };
        }
    });
}

async function fetchTop(count = 50) {
    return _cached('top:' + count, 30000, async () => {
        if (!client) return { configured: false, entries: [] };
        try {
            const { data, error } = await client
                .from('leaderboard')
                .select('*')
                .order('xp', { ascending: false })
                .limit(count);
            if (error) throw error;
            return { configured: true, entries: data || [] };
        } catch (e) {
            console.error('Failed to fetch leaderboard:', e);
            return { configured: true, entries: [], error: true };
        }
    });
}

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Bug fix: this used to build the id via `.toISOString()`, which converts to UTC first
// - getMonday() sets LOCAL midnight, so in any timezone ahead of UTC (Vietnam is
// UTC+7) that local midnight Monday becomes ~17:00 UTC *Sunday*, silently shifting the
// week id back by a day. Formatting the local Y/M/D components directly instead keeps
// the id matching the timezone the user actually experiences "this week" in.
function getWeekId(date) {
    const monday = getMonday(date);
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, '0');
    const d = String(monday.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Formats a week_id (that Monday's YYYY-MM-DD) as "Tuần N Tháng M, YYYY" for display -
// deliberately not a specific calendar date, since a week id is inherently a *range*
// (that Monday through Sunday), and showing one exact day out of seven reads as
// more precise than it actually is. "Week of month" (ceil(day / 7)) is a simple,
// good-enough approximation - it doesn't need to align with any official ISO week
// numbering, just to be a stable, human-readable label.
function formatWeekLabel(weekId) {
    const monday = new Date(`${weekId}T00:00:00`);
    if (Number.isNaN(monday.getTime())) return weekId;
    const weekOfMonth = Math.ceil(monday.getDate() / 7);
    return `Tuần ${weekOfMonth} Tháng ${monday.getMonth() + 1}, ${monday.getFullYear()}`;
}

function getSaturdayEveningOfWeek(date) {
    const monday = getMonday(date);
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    saturday.setHours(19, 0, 0, 0);
    return saturday;
}

async function checkAndAwardWeeklyPrize() {
    if (!client) return null;
    const now = new Date();
    const weekId = getWeekId(now);
    const awardMoment = getSaturdayEveningOfWeek(now);
    if (now < awardMoment) return null;

    try {
        const { data: existing } = await client
            .from('hall_of_fame')
            .select('week_id')
            .eq('week_id', weekId)
            .maybeSingle();
        if (existing) return null;

        const { data: top, error: topError } = await client
            .from('leaderboard')
            .select('*')
            .order('xp', { ascending: false })
            .limit(1);
        if (topError || !top || !top.length || top[0].xp <= 0) return null;
        const winner = top[0];

        const { error: insertError } = await client.from('hall_of_fame').insert({
            week_id: weekId,
            username: winner.username,
            weekly_xp: winner.xp
        });
        if (insertError) return null;

        return { username: winner.username, weeklyXp: winner.xp, weekId };
    } catch (e) {
        console.error('Weekly prize check failed:', e);
        return null;
    }
}

// A streak is alive ONLY if the user extended it today or yesterday - miss a single
// calendar day and the chain is broken. We judge that from `last_activity_date` (the
// local day of the user's last real lesson completion, mirroring app.js's updateStreak
// / normalizeStreakOnLoad), NOT from `updated_at`: updated_at is bumped by any sync
// (a plain login, an XP/vibrancy update), so it would let someone who opens the app
// daily but never practices squat the streak board with a dead chain.
function streakDayLabels() {
    const today = new Date().toDateString();
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return { today, yesterday: y.toDateString() };
}
// Backward-compat window for rows written before last_activity_date existed - once such
// a user next syncs, the precise column takes over.
const STREAK_FRESHNESS_MS = 48 * 60 * 60 * 1000;
function isStreakRowFresh(row) {
    if (row.last_activity_date) {
        const { today, yesterday } = streakDayLabels();
        return row.last_activity_date === today || row.last_activity_date === yesterday;
    }
    if (!row.updated_at) return false;
    return Date.now() - new Date(row.updated_at).getTime() <= STREAK_FRESHNESS_MS;
}

// Same `leaderboard` table already used for the XP board - just sorted by streak instead,
// no separate table needed for the ranking itself. Stale rows (see isStreakRowFresh)
// are dropped so long-gone users can't squat the top with a broken chain.
async function getStreakLeaderboard(count = 50) {
    return _cached('streak:' + count, 30000, async () => {
        if (!client) return { configured: false, entries: [] };
        try {
            const { data, error } = await client
                .from('leaderboard')
                .select('*')
                .order('streak', { ascending: false })
                .limit(count * 3);
            if (error) throw error;
            const entries = (data || []).filter(r => (r.streak || 0) > 0 && isStreakRowFresh(r)).slice(0, count);
            return { configured: true, entries };
        } catch (e) {
            console.error('Failed to fetch streak leaderboard:', e);
            return { configured: true, entries: [], error: true };
        }
    });
}

// Mirrors checkAndAwardWeeklyPrize() exactly (same Saturday-19:00 cutoff, same
// idempotency-via-unique-week_id pattern) but ranks by streak and writes to the separate
// streak_hall_of_fame table - deliberately does not touch hall_of_fame/the XP prize at
// all. Unlike the XP board (whose teddy-bear award comes from an untracked mechanism
// outside this repo), this explicitly calls award_streak_teddy_bear() since nothing else
// would credit the winner for a brand-new table.
async function checkAndAwardStreakPrize() {
    if (!client) return null;
    const now = new Date();
    const weekId = getWeekId(now);
    const awardMoment = getSaturdayEveningOfWeek(now);
    if (now < awardMoment) return null;

    try {
        const { data: existing } = await client
            .from('streak_hall_of_fame')
            .select('week_id')
            .eq('week_id', weekId)
            .maybeSingle();
        if (existing) return null;

        // Fetch a batch and take the best FRESH row - the weekly teddy bear must go to
        // a living streak, not to a stale row left behind by someone who quit months
        // ago (same freshness rule as getStreakLeaderboard).
        const { data: top, error: topError } = await client
            .from('leaderboard')
            .select('*')
            .order('streak', { ascending: false })
            .limit(25);
        if (topError || !top || !top.length) return null;
        const winner = top.find(r => (r.streak || 0) > 0 && isStreakRowFresh(r));
        if (!winner) return null;

        const { error: insertError } = await client.from('streak_hall_of_fame').insert({
            week_id: weekId,
            username: winner.username,
            streak_value: winner.streak
        });
        if (insertError) return null;

        // profile_usernames (not `leaderboard`, which has no id column) resolves the
        // winner's id for the teddy-bear RPC and the activity-feed broadcast.
        const { data: winnerProfile } = await client
            .from('profile_usernames')
            .select('id')
            .eq('username', winner.username)
            .maybeSingle();
        if (winnerProfile) {
            await client.rpc('award_streak_teddy_bear', { p_user_id: winnerProfile.id });
        }

        return { username: winner.username, streak: winner.streak, weekId, userId: winnerProfile ? winnerProfile.id : null };
    } catch (e) {
        console.error('Weekly streak prize check failed:', e);
        return null;
    }
}

async function getStreakHallOfFame(limit = 20) {
    if (!client) return [];
    try {
        const { data, error } = await client
            .from('streak_hall_of_fame')
            .select('*')
            .order('week_id', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error('Failed to fetch streak hall of fame:', e);
        return [];
    }
}

// Teddy-bear leaderboard - ranks by lifetime teddy_bears from the same world-readable
// profile_usernames view the friends/user-info cards already use (leaderboard table has
// no teddy column). Zero-bear users are dropped: an all-zero board reads as broken.
async function getTeddyLeaderboard(count = 50) {
    return _cached('teddy:' + count, 30000, async () => {
        if (!client) return { configured: false, entries: [] };
        try {
            const { data, error } = await client
                .from('profile_usernames')
                .select('username, teddy_bears, avatar_url')
                .order('teddy_bears', { ascending: false })
                .limit(count);
            if (error) throw error;
            const entries = (data || []).filter(r => (r.teddy_bears || 0) > 0);
            return { configured: true, entries };
        } catch (e) {
            console.error('Failed to fetch teddy leaderboard:', e);
            return { configured: true, entries: [], error: true };
        }
    });
}

// "Vị Vua Của Tuần" - the most recent weekly XP teddy-bear winner (latest hall_of_fame
// row). Resolves the avatar for the honor banner via profile_usernames; every lookup is
// optional-graceful so a missing table/row just means "no king yet".
async function getLatestKing() {
    // 10-minute TTL: long enough to spare the hall_of_fame table from every dashboard
    // visit, short enough that a freshly crowned Saturday-evening king shows up soon.
    return _cached('king', 10 * 60 * 1000, () => _getLatestKingRaw());
}
async function _getLatestKingRaw() {
    if (!client) return null;
    try {
        const { data, error } = await client
            .from('hall_of_fame')
            .select('*')
            .order('week_id', { ascending: false })
            .limit(1);
        if (error || !data || !data.length) return null;
        const king = data[0];
        let avatarUrl = null;
        try {
            const { data: prof } = await client
                .from('profile_usernames')
                .select('avatar_url')
                .eq('username', king.username)
                .maybeSingle();
            if (prof) avatarUrl = prof.avatar_url || null;
        } catch (e) { /* avatar is a nice-to-have */ }
        return { username: king.username, weekId: king.week_id, weeklyXp: king.weekly_xp, avatarUrl };
    } catch (e) {
        console.error('Failed to fetch weekly king:', e);
        return null;
    }
}

async function getHallOfFame(limit = 20) {
    if (!client) return [];
    try {
        const { data, error } = await client
            .from('hall_of_fame')
            .select('*')
            .order('week_id', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error('Failed to fetch hall of fame:', e);
        return [];
    }
}

async function resetLeaderboard() {
    if (!client) return { error: 'Chưa cấu hình.' };
    try {
        const { error } = await client.from('leaderboard').delete().neq('username', '');
        if (error) return { error: error.message };
        return {};
    } catch (e) {
        return { error: e.message };
    }
}

async function deleteHallOfFameEntry(weekId) {
    if (!client) return { error: 'Chưa cấu hình.' };
    try {
        const { error } = await client.from('hall_of_fame').delete().eq('week_id', weekId);
        if (error) return { error: error.message };
        return {};
    } catch (e) {
        return { error: e.message };
    }
}

async function clearHallOfFame() {
    if (!client) return { error: 'Chưa cấu hình.' };
    try {
        const { error } = await client.from('hall_of_fame').delete().neq('username', '');
        if (error) return { error: error.message };
        return {};
    } catch (e) {
        return { error: e.message };
    }
}

window.Leaderboard = {
    submitScore,
    fetchTop,
    isConfigured,
    getWeekId,
    formatWeekLabel,
    checkAndAwardWeeklyPrize,
    getHallOfFame,
    resetLeaderboard,
    deleteHallOfFameEntry,
    clearHallOfFame,
    getStreakLeaderboard,
    getVibrancyLeaderboard,
    checkAndAwardStreakPrize,
    getStreakHallOfFame,
    getTeddyLeaderboard,
    getLatestKing
};
