const isConfigured = window.SupabaseClient ? window.SupabaseClient.isConfigured : false;
const client = window.SupabaseClient ? window.SupabaseClient.client : null;

async function submitScore(username, xp, streak) {
    if (!client || !username) return;
    try {
        const { error } = await client.from('leaderboard').upsert({
            username,
            xp,
            streak,
            updated_at: new Date().toISOString()
        });
        if (error) throw error;
    } catch (e) {
        console.error('Failed to submit score to leaderboard:', e);
    }
}

async function fetchTop(count = 50) {
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
    clearHallOfFame
};
