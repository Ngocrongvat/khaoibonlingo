// app-groups2.js — additive group upgrades (directory, clickable group names, scheduled
// group battles with auto-pairing, chat avatars). New file so the existing group/duel
// machinery stays untouched; loads after app-social.js, before app-main.js.
//
// Scheduled battles need supabase/migrations/group_battle_scheduling.sql - every DB
// helper here degrades gracefully ("chưa sẵn sàng") when the migration hasn't run.

// ---------- DB helpers for scheduled battles + pairing board ----------
(function () {
    'use strict';
    const client = window.SupabaseClient ? window.SupabaseClient.client : null;

    // A member counts as "online" if their heartbeat (group_members.last_active_at,
    // refreshed on lessons / group visits) is within this window - same 3-minute rule the
    // old live battle screen uses.
    const ONLINE_WINDOW_MS = 3 * 60 * 1000;
    function isMemberOnline(m) {
        return !!(m && m.last_active_at && (Date.now() - new Date(m.last_active_at).getTime()) < ONLINE_WINDOW_MS);
    }

    // Owner schedules a battle: normal challenge row + scheduled_at/window_min.
    async function challengeScheduled(myGroupId, targetGroupName, scheduledAtISO, windowMin) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const target = await window.Groups.searchGroupByName(targetGroupName);
            if (!target) return { error: 'Không tìm thấy group này.' };
            if (target.id === myGroupId) return { error: 'Không thể tự thách đấu group của chính mình.' };
            const { data, error } = await client.from('group_battles').insert({
                group_a_id: myGroupId,
                group_b_id: target.id,
                initiated_by_group_id: myGroupId,
                scheduled_at: scheduledAtISO,
                window_min: windowMin,
            }).select().single();
            if (error) throw error;
            return { data };
        } catch (e) {
            console.error('Failed to schedule group battle:', e);
            const missing = /scheduled_at|window_min|column/i.test(e.message || '');
            return { error: missing ? 'Tính năng đặt lịch chưa sẵn sàng - quản trị viên cần chạy migration "group_battle_scheduling.sql".' : 'Không thể gửi thách đấu lúc này.' };
        }
    }

    // All scheduled battles (pending or active, not yet finished) involving a group.
    async function getScheduleFor(groupId) {
        if (!client || !groupId) return [];
        try {
            const { data, error } = await client
                .from('group_battles')
                .select('*')
                .or(`group_a_id.eq.${groupId},group_b_id.eq.${groupId}`)
                .not('scheduled_at', 'is', null)
                .neq('status', 'finished')
                .order('scheduled_at', { ascending: true })
                .limit(10);
            if (error) throw error;
            return data || [];
        } catch (e) { return []; }
    }

    // Accepting a scheduled challenge activates it AND generates the pairing board:
    // active members of both groups, shuffled, paired 1-1 up to the smaller roster.
    async function acceptScheduled(battle) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const [membersA, membersB] = await Promise.all([
                window.Groups.getGroupMembers(battle.group_a_id),
                window.Groups.getGroupMembers(battle.group_b_id),
            ]);
            const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
            const A = shuffle(membersA || []), B = shuffle(membersB || []);
            const n = Math.min(A.length, B.length);
            if (n === 0) return { error: 'Một trong hai group chưa có thành viên hoạt động.' };
            const rows = [];
            for (let i = 0; i < n; i++) {
                rows.push({
                    battle_id: battle.id,
                    // group_members rows carry `user_id` (see groups_schema.sql) - NOT
                    // profile_id; that mixup once broke the migration's policies too.
                    user_a_id: A[i].user_id, username_a: A[i].username,
                    user_b_id: B[i].user_id, username_b: B[i].username,
                });
            }
            const { error: pairErr } = await client.from('group_battle_pairs').insert(rows);
            if (pairErr) throw pairErr;
            const { error } = await client.from('group_battles').update({ status: 'active' }).eq('id', battle.id);
            if (error) throw error;
            return { pairs: rows.length };
        } catch (e) {
            console.error('Failed to accept scheduled battle:', e);
            const missing = /group_battle_pairs|relation/i.test(e.message || '');
            return { error: missing ? 'Cần chạy migration "group_battle_scheduling.sql" trước.' : 'Không thể nhận lời thách đấu lúc này.' };
        }
    }

    async function getPairs(battleId) {
        if (!client || !battleId) return [];
        try {
            const { data, error } = await client
                .from('group_battle_pairs').select('*')
                .eq('battle_id', battleId).order('created_at', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (e) { return []; }
    }

    // "VÀO TRẬN": stamp my side's join time (idempotent - keeps the first stamp).
    async function joinPair(pair, side) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const col = side === 'a' ? 'joined_a_at' : 'joined_b_at';
            if (pair[col]) return {};
            const { error } = await client.from('group_battle_pairs')
                .update({ [col]: new Date().toISOString() }).eq('id', pair.id);
            if (error) throw error;
            return {};
        } catch (e) { return { error: e.message }; }
    }

    // Timeout rules (client-driven, idempotent - safe for any viewer to run after the
    // window closes): one side joined -> that side wins the pair; neither -> draw; both
    // joined -> resolved by their tagged duel if finished, else draw. Then roll pair
    // results into the battle score and finish it.
    async function finalizeExpired(battle, pairs) {
        if (!client) return null;
        const windowEnd = new Date(battle.scheduled_at).getTime() + (battle.window_min || 30) * 60000;
        if (Date.now() < windowEnd) return null;
        try {
            let duels = [];
            try { duels = await window.Groups.getBattleDuels(battle.id); } catch (e) { }
            for (const p of pairs) {
                if (p.winner) continue;
                let winner = null;
                if (p.joined_a_at && p.joined_b_at) {
                    const duel = (duels || []).find(d => d.status === 'finished' && d.winner_id && [p.user_a_id, p.user_b_id].includes(d.challenger_id) && [p.user_a_id, p.user_b_id].includes(d.opponent_id));
                    winner = duel ? (duel.winner_id === p.user_a_id ? 'a' : 'b') : 'draw';
                } else if (p.joined_a_at) winner = 'a';
                else if (p.joined_b_at) winner = 'b';
                else winner = 'draw';
                await client.from('group_battle_pairs')
                    .update({ winner, decided_at: new Date().toISOString() })
                    .eq('id', p.id).is('winner', null);
                p.winner = winner;
            }
            const winsA = pairs.filter(p => p.winner === 'a').length;
            const winsB = pairs.filter(p => p.winner === 'b').length;
            const winnerGroupId = winsA > winsB ? battle.group_a_id : (winsB > winsA ? battle.group_b_id : null);
            await client.from('group_battles').update({
                status: 'finished', group_a_wins: winsA, group_b_wins: winsB,
                winner_group_id: winnerGroupId, finished_at: new Date().toISOString(),
            }).eq('id', battle.id).neq('status', 'finished');
            return { winsA, winsB, winnerGroupId };
        } catch (e) { console.error('finalizeExpired failed:', e); return null; }
    }

    // ---------- New letter-first challenge flow + owner chat + wager + rewards ----------

    // DM the target group's owner (best-effort notification). Never throws.
    async function notifyOwner(myProfile, group, text) {
        try {
            if (!myProfile || !group || !group.owner_id || group.owner_id === myProfile.id || !window.Inbox) return;
            await window.Inbox.sendDirectMessageToId(myProfile, group.owner_id, group.owner_username || 'Chủ nhóm', text);
        } catch (e) { /* notification is best-effort */ }
    }

    async function getBattle(battleId) {
        if (!client || !battleId) return null;
        try {
            const { data, error } = await client.from('group_battles').select('*').eq('id', battleId).maybeSingle();
            if (error) throw error;
            return data || null;
        } catch (e) { return null; }
    }

    // Every non-finished battle a group is in - INCLUDING letters (scheduled_at null),
    // which getScheduleFor() deliberately excludes. Powers the new phase-aware board.
    async function getBattlesFor(groupId) {
        if (!client || !groupId) return [];
        try {
            const { data, error } = await client.from('group_battles').select('*')
                .or(`group_a_id.eq.${groupId},group_b_id.eq.${groupId}`)
                .neq('status', 'finished')
                .order('created_at', { ascending: false }).limit(20);
            if (error) throw error;
            return data || [];
        } catch (e) { return []; }
    }

    // A few most-recent FINISHED scheduled battles, so the board can show the result +
    // reward summary right after a battle wraps (getBattlesFor excludes finished).
    async function getRecentFinishedFor(groupId) {
        if (!client || !groupId) return [];
        try {
            const { data, error } = await client.from('group_battles').select('*')
                .or(`group_a_id.eq.${groupId},group_b_id.eq.${groupId}`)
                .eq('status', 'finished').not('scheduled_at', 'is', null)
                .order('finished_at', { ascending: false }).limit(3);
            if (error) throw error;
            return data || [];
        } catch (e) { return []; }
    }

    // Step 1: send a challenge LETTER only (no schedule yet). The scheduling board opens
    // for both sides once the opponent accepts the letter.
    async function sendChallengeLetter(myGroupId, targetGroupName, myProfile) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const target = await window.Groups.searchGroupByName(targetGroupName);
            if (!target) return { error: 'Không tìm thấy group này.' };
            if (target.id === myGroupId) return { error: 'Không thể tự thách đấu group của chính mình.' };
            // Only a live NEW-flow letter (challenge_kind='letter') between THESE two
            // groups blocks a re-challenge - the old "ĐẤU GROUP" battles that also live in
            // group_battles (challenge_kind null) must NOT trip this guard (that false
            // "đang trong thách đấu khác" block was the reported bug). A stuck letter can
            // always be withdrawn from the board, so this never wedges permanently.
            const existing = await getBattlesFor(myGroupId);
            if ((existing || []).some(b => b.challenge_kind === 'letter' && (b.group_a_id === target.id || b.group_b_id === target.id))) {
                return { error: 'Bạn đang có một lời thách đấu với group này. Vào "Lịch thi đấu" để tiếp tục hoặc hủy nó rồi gửi lại.' };
            }
            const { data, error } = await client.from('group_battles').insert({
                group_a_id: myGroupId, group_b_id: target.id,
                initiated_by_group_id: myGroupId, invite_accepted: false, challenge_kind: 'letter',
            }).select().single();
            if (error) throw error;
            // "Máu chiến" counter - counts battles STARTED regardless of outcome (same as
            // challengeGroupBattle in groups.js).
            try {
                const { data: g } = await client.from('groups').select('battles_initiated').eq('id', myGroupId).single();
                if (g) await client.from('groups').update({ battles_initiated: (g.battles_initiated || 0) + 1 }).eq('id', myGroupId);
            } catch (e) { /* counter is non-critical */ }
            await notifyOwner(myProfile, target, '⚔️ Group của bạn nhận được một lời thách đấu mới! Vào Group → Lịch thi đấu để phản hồi.');
            return { data };
        } catch (e) {
            console.error('sendChallengeLetter failed:', e);
            const missing = /invite_accepted|challenge_kind|column|schema cache/i.test(e.message || '');
            return { error: missing ? 'Tính năng thách đấu mới chưa sẵn sàng - quản trị viên cần chạy các migration "group_battle_upgrades.sql" và "group_battle_realtime.sql".' : 'Không thể gửi thư thách đấu lúc này.' };
        }
    }

    // Challenger (or either admin, pre-battle) withdraws a letter/scheduling battle that
    // hasn't started - deletes the row (cascades pairs/chat). Refuses on an active battle:
    // once fighting has begun the only way out is a forfeit (a recorded loss).
    async function withdrawBattle(battleId) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const { data, error } = await client.from('group_battles').delete().eq('id', battleId).neq('status', 'active').select();
            if (error) throw error;
            if (!data || data.length === 0) {
                return { error: 'Không thu hồi được — trận đã bắt đầu, hoặc quản trị viên cần chạy migration "group_battle_delete_policy.sql".' };
            }
            return {};
        } catch (e) { return { error: 'Không thể hủy lúc này.' }; }
    }

    // Forfeit an ACTIVE battle: the caller's group concedes. Every still-open pair is
    // awarded to the opponent, forfeited_by is recorded, then the finalizer runs (early,
    // since no pair is left undecided) - the opponent wins outright + collects the wager.
    async function forfeitBattle(battle, myGroupId, myProfile) {
        if (!client || !battle) return { error: 'Chưa cấu hình.' };
        try {
            const winnerSide = (myGroupId === battle.group_a_id) ? 'b' : 'a';
            await client.from('group_battle_pairs')
                .update({ winner: winnerSide, decided_at: new Date().toISOString() })
                .eq('battle_id', battle.id).is('winner', null);
            await client.from('group_battles')
                .update({ forfeited_by_group_id: myGroupId })
                .eq('id', battle.id);
            const fin = await finalizeScheduledBattle(battle.id);
            return { forfeited: true, fin };
        } catch (e) {
            console.error('forfeitBattle failed:', e);
            const missing = /forfeited_by|column|schema cache/i.test(e.message || '');
            return { error: missing ? 'Cần chạy migration "group_battle_realtime.sql" trước.' : 'Không thể bỏ cuộc lúc này.' };
        }
    }

    // Live progress engine (best-effort, any viewer can run it): resolve any undecided
    // pair that already has a linked finished duel so the score moves the moment a 1v1
    // ends; then finalize when the window has closed OR every pair is decided.
    async function syncScheduledBattle(battle) {
        if (!client || !battle || battle.status !== 'active' || !battle.scheduled_at) return;
        try {
            let pairs = await getPairs(battle.id);
            const undecided = pairs.filter(p => !p.winner);
            if (undecided.length) {
                let duels = [];
                try { duels = await window.Groups.getBattleDuels(battle.id); } catch (e) { /* none yet */ }
                for (const p of undecided) {
                    const duel = (duels || []).find(d => d.status === 'finished' && d.winner_id
                        && [p.user_a_id, p.user_b_id].includes(d.challenger_id)
                        && [p.user_a_id, p.user_b_id].includes(d.opponent_id));
                    if (duel) {
                        const w = duel.winner_id === p.user_a_id ? 'a' : 'b';
                        await client.from('group_battle_pairs')
                            .update({ winner: w, decided_at: new Date().toISOString() })
                            .eq('id', p.id).is('winner', null);
                    }
                }
                pairs = await getPairs(battle.id);
            }
            const windowEnd = new Date(battle.scheduled_at).getTime() + (battle.window_min || 30) * 60000;
            if (Date.now() >= windowEnd || pairs.every(p => p.winner)) {
                await finalizeScheduledBattle(battle.id);
            }
        } catch (e) { /* live sync is best-effort - never break the board */ }
    }

    // Broadcast a public battle headline to the community marquee (activity_feed) so every
    // player sees it live on Home. Best-effort.
    async function postBattleMarquee(userId, username, message) {
        try {
            if (window.ActivityFeed && message) {
                await window.ActivityFeed.postEvent('group_battle', userId || null, username || 'Trọng tài', message);
            }
        } catch (e) { /* marquee is best-effort */ }
    }

    // Step 2: opponent owner/admin accepts the letter -> scheduling phase opens.
    async function acceptInvite(battle, myProfile) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const { data, error } = await client.from('group_battles')
                .update({ invite_accepted: true })
                .eq('id', battle.id).eq('status', 'pending').select().single();
            if (error) throw error;
            const a = await window.Groups.getGroupById(battle.group_a_id).catch(() => null);
            if (a) await notifyOwner(myProfile, a, '✅ Đối thủ đã NHẬN LỜI thách đấu. Vào Lịch thi đấu để đặt ngày giờ và mức cược.');
            return { data };
        } catch (e) {
            const missing = /invite_accepted|column|schema cache/i.test(e.message || '');
            return { error: missing ? 'Cần chạy migration "group_battle_upgrades.sql" trước.' : 'Không thể nhận lời lúc này.' };
        }
    }

    async function declineInvite(battleId) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            // .select() so we can tell a real delete from an RLS-silenced 0-row delete
            // (the "treo" bug: no delete policy meant the row was never actually removed).
            const { data, error } = await client.from('group_battles').delete().eq('id', battleId).select();
            if (error) throw error;
            if (!data || data.length === 0) {
                return { error: 'Không xóa được lời mời — quản trị viên cần chạy migration "group_battle_delete_policy.sql".' };
            }
            return {};
        } catch (e) { return { error: 'Không thể từ chối lúc này.' }; }
    }

    // Step 3 (challenger only): set / change the date-time, window and wager. The first
    // proposal is free; after that at most 3 CHANGES are allowed. Every save resets the
    // opponent's approval to false and notifies them.
    async function setSchedule(battle, scheduledAtISO, windowMin, wagerXp, myProfile) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const isFirst = !battle.scheduled_at;
            let changeCount = battle.schedule_change_count || 0;
            if (!isFirst) {
                if (changeCount >= 3) return { error: 'Đã đổi lịch tối đa 3 lần - không thể đổi thêm.' };
                changeCount += 1;
            }
            const { data, error } = await client.from('group_battles').update({
                scheduled_at: scheduledAtISO, window_min: windowMin,
                wager_xp: Math.max(0, wagerXp | 0),
                schedule_approved: false, schedule_change_count: changeCount,
            }).eq('id', battle.id).select().single();
            if (error) throw error;
            const b = await window.Groups.getGroupById(battle.group_b_id).catch(() => null);
            if (b) await notifyOwner(myProfile, b, `📅 Đối thủ ${isFirst ? 'đã gửi' : 'vừa đổi'} lịch thách đấu & mức cược. Vào Lịch thi đấu để duyệt.`);
            return { data };
        } catch (e) {
            const missing = /wager_xp|schedule_|column|schema cache/i.test(e.message || '');
            return { error: missing ? 'Cần chạy migration "group_battle_upgrades.sql" trước.' : 'Không thể lưu lịch lúc này.' };
        }
    }

    // Step 4 (opponent only): approve the current schedule + wager -> the battle is
    // locked in ("chờ trận"). Pairing then happens automatically when the window opens.
    async function approveSchedule(battle, myProfile) {
        if (!client) return { error: 'Chưa cấu hình.' };
        try {
            const { data, error } = await client.from('group_battles')
                .update({ schedule_approved: true })
                .eq('id', battle.id).select().single();
            if (error) throw error;
            const a = await window.Groups.getGroupById(battle.group_a_id).catch(() => null);
            if (a) await notifyOwner(myProfile, a, '🤝 Đối thủ đã CHẤP THUẬN lịch & mức cược. Trận đấu đã được chốt!');
            return { data };
        } catch (e) { return { error: 'Không thể duyệt lịch lúc này.' }; }
    }

    // ----- Owner-to-owner battle chat -----
    async function getBattleChat(battleId) {
        if (!client || !battleId) return [];
        try {
            const { data, error } = await client.from('group_battle_chat').select('*')
                .eq('battle_id', battleId).order('created_at', { ascending: true }).limit(100);
            if (error) throw error;
            return data || [];
        } catch (e) { return []; }
    }

    async function sendBattleChat(battleId, myProfile, text) {
        if (!client) return { error: 'Chưa cấu hình.' };
        const trimmed = (text || '').trim();
        if (!trimmed) return { error: 'Nhập tin nhắn.' };
        if (trimmed.length > 500) return { error: 'Tin nhắn quá dài (tối đa 500 ký tự).' };
        try {
            const { data, error } = await client.from('group_battle_chat').insert({
                battle_id: battleId, sender_id: myProfile.id,
                sender_username: myProfile.username, message: trimmed,
            }).select().single();
            if (error) throw error;
            return { data };
        } catch (e) {
            const missing = /group_battle_chat|relation|schema cache/i.test(e.message || '');
            return { error: missing ? 'Cần chạy migration "group_battle_upgrades.sql" trước.' : 'Không gửi được tin nhắn.' };
        }
    }

    // At window open, exactly ONE viewer atomically flips pending->active (winning the
    // claim) and seeds the 1-1 pairs from the two groups' CURRENT active rosters. Other
    // viewers see the claim already taken and do nothing - no duplicate pair rows.
    async function ensurePairsAndActivate(battle) {
        if (!client || !battle || battle.status !== 'pending' || !battle.schedule_approved || !battle.scheduled_at) return { skipped: true };
        if (Date.now() < new Date(battle.scheduled_at).getTime()) return { skipped: true };
        try {
            const [membersA, membersB] = await Promise.all([
                window.Groups.getGroupMembers(battle.group_a_id),
                window.Groups.getGroupMembers(battle.group_b_id),
            ]);
            const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
            // Online members go to the FRONT of each roster so, paired by index, online
            // faces online first; the offline remainder pairs up after.
            const onlineFirst = arr => shuffle((arr || []).filter(isMemberOnline)).concat(shuffle((arr || []).filter(m => !isMemberOnline(m))));
            const A = onlineFirst(membersA), B = onlineFirst(membersB);
            const n = Math.min(A.length, B.length);
            if (n === 0) return { pairs: 0 }; // nobody to pair - leave pending, don't waste the battle
            // Only claim (pending->active) once we know there ARE pairs to seed; exactly one
            // racing viewer wins the claim, so pairs are seeded once.
            const { data: claimed, error: claimErr } = await client.from('group_battles')
                .update({ status: 'active' })
                .eq('id', battle.id).eq('status', 'pending').eq('schedule_approved', true)
                .select().maybeSingle();
            if (claimErr) throw claimErr;
            if (!claimed) return { already: true };
            const nowIso = new Date().toISOString();
            const rows = [];
            for (let i = 0; i < n; i++) {
                const a = A[i], b = B[i];
                const aOn = isMemberOnline(a), bOn = isMemberOnline(b);
                // Kickoff rule: a pair with exactly ONE side online is decided 1-0 for the
                // present member immediately (they "showed up" - joined stamp set so the
                // reward-steal credits them), so a no-show can't hang that pair.
                let winner = null, decided = null, ja = null, jb = null;
                if (aOn && !bOn) { winner = 'a'; decided = nowIso; ja = nowIso; }
                else if (bOn && !aOn) { winner = 'b'; decided = nowIso; jb = nowIso; }
                rows.push({
                    battle_id: battle.id,
                    user_a_id: a.user_id, username_a: a.username,
                    user_b_id: b.user_id, username_b: b.username,
                    winner, decided_at: decided, joined_a_at: ja, joined_b_at: jb,
                });
            }
            const { error: pairErr } = await client.from('group_battle_pairs').insert(rows);
            if (pairErr) throw pairErr;
            const decidedAtKickoff = rows.filter(r => r.winner).length;
            return { pairs: rows.length, decidedAtKickoff };
        } catch (e) { console.error('ensurePairsAndActivate failed:', e); return { error: e.message }; }
    }

    // Server-side finalize + rewards (wager transfer + zero-sum 10% XP steal). Falls back
    // to the old client-only pair/score resolution when the RPC isn't installed yet.
    async function finalizeScheduledBattle(battleId) {
        if (!client || !battleId) return null;
        try {
            const { error } = await client.rpc('finalize_scheduled_group_battle', { p_battle_id: battleId });
            if (error) throw error;
            return { data: true };
        } catch (e) {
            console.error('finalizeScheduledBattle RPC failed:', e);
            const rpcMissing = /finalize_scheduled_group_battle|does not exist|schema cache|function/i.test(e.message || '');
            if (rpcMissing) {
                const battle = await getBattle(battleId);
                const pairs = await getPairs(battleId);
                if (battle) await finalizeExpired(battle, pairs);
                return { fallback: true };
            }
            return { error: e.message };
        }
    }

    window.GroupBattleSchedule = {
        challengeScheduled, getScheduleFor, acceptScheduled, getPairs, joinPair, finalizeExpired,
        getBattle, getBattlesFor, getRecentFinishedFor, sendChallengeLetter, acceptInvite, declineInvite,
        setSchedule, approveSchedule, getBattleChat, sendBattleChat,
        ensurePairsAndActivate, finalizeScheduledBattle,
        withdrawBattle, forfeitBattle, syncScheduledBattle, postBattleMarquee, isMemberOnline,
    };
})();

// ---------- UI: prototype extensions ----------
Object.assign(DuoClone.prototype, {

    // ===== Chat avatars (every chat box shows the sender's avatar; the reigning
    // weekly king's avatar wears the golden crown ring - see .chat-avatar-king). =====
    chatAvatarHtml(username) {
        if (!username) return '';
        const king = this.state.weeklyKing && this.state.weeklyKing.username === username;
        // Schedule one debounced hydration pass per render burst.
        if (!this._chatAvatarHydrateQueued) {
            this._chatAvatarHydrateQueued = true;
            setTimeout(() => { this._chatAvatarHydrateQueued = false; this.hydrateChatAvatars(); }, 60);
        }
        return `<span class="chat-avatar ${king ? 'chat-avatar-king' : ''}" data-cavatar="${this.escapeHtml(username)}" title="${king ? '👑 Vị Vua Của Tuần' : ''}">🙂</span>`;
    },

    // Fills every pending .chat-avatar with the user's real avatar image, batching the
    // username -> avatar_url lookups and caching them for the whole session.
    async hydrateChatAvatars() {
        try {
            if (!this._chatAvatarCache) this._chatAvatarCache = new Map();
            const cache = this._chatAvatarCache;
            const pending = [...document.querySelectorAll('.chat-avatar[data-cavatar]')];
            if (!pending.length) return;
            const unknown = [...new Set(pending.map(el => el.dataset.cavatar))].filter(u => !cache.has(u));
            if (unknown.length && window.SupabaseClient && window.SupabaseClient.client) {
                const { data } = await window.SupabaseClient.client
                    .from('profile_usernames').select('username, avatar_url')
                    .in('username', unknown.slice(0, 50));
                (data || []).forEach(r => cache.set(r.username, r.avatar_url || null));
                unknown.forEach(u => { if (!cache.has(u)) cache.set(u, null); });
            }
            pending.forEach(el => {
                const url = cache.get(el.dataset.cavatar);
                el.removeAttribute('data-cavatar');
                if (url) el.innerHTML = `<img src="${url}" alt="">`;
            });
        } catch (e) { /* avatars are decoration - never break chat */ }
    },

    // ===== Clickable group names (everywhere) =====
    // Renders a tappable group name; one document-level delegated listener (installed
    // at file load, below) opens the action sheet - no per-screen wiring needed.
    clickableGroupName(groupId, name) {
        return `<span class="clickable-groupname" data-gid="${this.escapeHtml(groupId || '')}" data-gname="${this.escapeHtml(name || '')}">🏰 ${this.escapeHtml(name || '')}</span>`;
    },

    // Bottom action sheet: xem info / xin vào / thoát (context-aware).
    async openGroupActions(groupId, name) {
        const existing = document.getElementById('group-actions-overlay');
        if (existing) existing.remove();
        let mine = null;
        try { mine = this.state.profile && window.Groups ? await window.Groups.getMyGroup(this.state.profile.id) : null; } catch (e) { }
        const isMyGroup = mine && mine.group && mine.group.id === groupId;
        const iAmAdmin = mine && mine.membership && ['owner', 'admin'].includes(mine.membership.role);
        const isOwner = isMyGroup && iAmAdmin;
        const myGroupId = mine && mine.group ? mine.group.id : null;
        const overlay = document.createElement('div');
        overlay.id = 'group-actions-overlay';
        overlay.className = 'group-actions-overlay';
        overlay.innerHTML = `
            <div class="group-actions-sheet">
                <div class="group-actions-title">🏰 ${this.escapeHtml(name || 'Group')}</div>
                <button class="btn-secondary ga-btn" data-ga="info">ℹ️ Xem info group</button>
                ${!mine ? `<button class="btn-primary ga-btn" data-ga="join">✉️ Xin vào group</button>` : ''}
                ${isMyGroup && !isOwner ? `<button class="btn-secondary ga-btn ga-danger" data-ga="leave">🚪 Thoát group</button>` : ''}
                ${!isMyGroup && iAmAdmin && myGroupId ? `<button class="btn-primary ga-btn" data-ga="challenge">⚔️ Gửi thư thách đấu</button>` : ''}
                ${isMyGroup && isOwner ? `<button class="btn-primary ga-btn" data-ga="board">⚔️ Thách đấu & Lịch thi đấu</button>` : ''}
                <button class="btn-secondary ga-btn" data-ga="close">Đóng</button>
            </div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        overlay.querySelectorAll('.ga-btn').forEach(btn => btn.addEventListener('click', async () => {
            const ga = btn.dataset.ga;
            overlay.remove();
            if (ga === 'info') this.renderGroupInfoCard(groupId);
            else if (ga === 'join') {
                const result = await window.Groups.requestJoin(this.state.profile, groupId);
                alert(result.error ? result.error : 'Đã gửi yêu cầu tham gia! Chờ Chủ nhóm duyệt nhé.');
            } else if (ga === 'leave') {
                this.showConfirmDialog(`Rời khỏi group "${name}"?`, async () => {
                    const r = await window.Groups.removeMember(mine.membership.id);
                    if (r.error) { alert(r.error); return; }
                    this.showBriefToast('Đã rời group.');
                    this.renderGroupsMenu();
                }, { okLabel: 'THOÁT' });
            } else if (ga === 'challenge') {
                this.showConfirmDialog(`Gửi thư thách đấu tới group "${name}"?`, async () => {
                    const r = await window.GroupBattleSchedule.sendChallengeLetter(myGroupId, name, this.state.profile);
                    if (r.error) { alert(r.error); return; }
                    this.showBriefToast('✉️ Đã gửi thư thách đấu! Chờ đối thủ nhận lời.');
                    this.renderBattleScheduleBoard(myGroupId);
                }, { okLabel: 'GỬI' });
            } else if (ga === 'board') this.renderBattleScheduleBoard(groupId);
        }));
    },

    // ===== Public group directory + info card =====
    async renderGroupDirectory() {
        this.ui.container.innerHTML = `<div class="welcome-screen"><div class="duo-character">🌍</div><h1 style="text-align:center;">Danh sách Group</h1><p style="text-align:center; color:#777;">Đang tải...</p></div>`;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        const groups = await window.Groups.searchGroups('', 50);
        const counts = await window.Groups.getMemberCounts(groups.map(g => g.id));
        const rows = groups.map(g => {
            const info = getGroupLevelInfo(g.vibrancy_score);
            return `<div class="friend-row group-dir-row">
                        ${g.avatar_url ? `<img class="group-dir-avatar" src="${g.avatar_url}" alt="">` : '<span class="group-dir-avatar group-dir-avatar-fallback">🏰</span>'}
                        <span class="friend-row-name group-dir-name">${this.clickableGroupName(g.id, g.name)}
                            <span class="group-row-meta">${info.label} · ⭐ ${g.vibrancy_score} sôi nổi · 👥 ${counts[g.id] || 0}/${window.Groups.MAX_MEMBERS}</span>
                        </span>
                    </div>`;
        }).join('');
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">🌍</div>
                <h1 style="text-align:center;">Danh sách Group</h1>
                <p style="text-align:center; color:#777;">${groups.length} group đang hoạt động - chạm tên group để xem lựa chọn</p>
                <div class="friends-list" style="margin-top:10px;">${rows || '<p style="text-align:center; color:#777;">Chưa có group nào.</p>'}</div>
                <button class="btn-secondary" id="group-dir-back" style="display:block; margin:15px auto; padding:15px 30px;">QUAY LẠI</button>
            </div>`;
        document.getElementById('group-dir-back').addEventListener('click', () => this.renderGroupsMenu());
    },

    async renderGroupInfoCard(groupId) {
        this.ui.container.innerHTML = `<div class="welcome-screen"><p style="text-align:center; color:#777;">Đang tải...</p></div>`;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        const g = await window.Groups.getGroupById(groupId);
        if (!g) { this.showBriefToast('Không tải được thông tin group.'); this.renderGroupsMenu(); return; }
        const counts = await window.Groups.getMemberCounts([g.id]);
        const members = await window.Groups.getGroupMembers(g.id).catch(() => []);
        const owner = (members || []).find(m => m.role === 'owner');
        const info = getGroupLevelInfo(g.vibrancy_score);
        const created = g.created_at ? new Date(g.created_at).toLocaleDateString('vi-VN') : '—';
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                ${g.avatar_url ? `<img src="${g.avatar_url}" alt="" style="width:88px; height:88px; border-radius:20px; display:block; margin:0 auto; object-fit:cover;">` : '<div class="duo-character">🏰</div>'}
                <h1 style="text-align:center; overflow-wrap:anywhere;">${this.escapeHtml(g.name)}</h1>
                <p style="text-align:center; color:#777;">${info.label}</p>
                <div class="user-info-stats">
                    <div class="user-info-stat"><span class="user-info-stat-value">⭐ ${g.vibrancy_score || 0}</span><span class="user-info-stat-label">Sôi nổi</span></div>
                    <div class="user-info-stat"><span class="user-info-stat-value">👥 ${counts[g.id] || 0}/${window.Groups.MAX_MEMBERS}</span><span class="user-info-stat-label">Thành viên</span></div>
                    <div class="user-info-stat"><span class="user-info-stat-value">⚔️ ${g.battles_initiated || 0}</span><span class="user-info-stat-label">Trận khởi xướng</span></div>
                </div>
                <p style="text-align:center; color:#777;">👑 Chủ group: <b>${this.escapeHtml(owner ? owner.username : '—')}</b> · Lập ngày ${created}</p>
                ${(g.description ? `<p style="text-align:center; color:#999;">${this.escapeHtml(g.description)}</p>` : '')}
                <button class="btn-secondary" id="group-info-back" style="display:block; margin:15px auto; padding:15px 30px;">QUAY LẠI</button>
            </div>`;
        document.getElementById('group-info-back').addEventListener('click', () => this.renderGroupDirectory());
    },

    // A calendar screen-icon that shows TODAY'S REAL DATE. The 📅 emoji is unusable
    // here: its artwork has "July 17" permanently baked into the font (World Emoji
    // Day) - users reasonably read that as "the system thinks it's the 17th".
    calendarIconHtml() {
        const now = new Date();
        return `<div class="cal-icon" aria-hidden="true">
                    <div class="cal-icon-month">Tháng ${now.getMonth() + 1}</div>
                    <div class="cal-icon-day">${now.getDate()}</div>
                </div>`;
    },

    // ===== Prominent battle notifications, realtime, countdown timers =====

    // Bold, urgent, auto-dismissing banner - louder than showBriefToast, for battle
    // milestones. kind: 'info' | 'success' | 'danger' | 'live' | 'gold'.
    showBattleAlert(message, kind = 'info') {
        let host = document.getElementById('battle-alert-host');
        if (!host) { host = document.createElement('div'); host.id = 'battle-alert-host'; document.body.appendChild(host); }
        const el = document.createElement('div');
        el.className = `battle-alert battle-alert-${kind}`;
        el.innerHTML = message;
        host.appendChild(el);
        setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 5400);
    },

    // Prominent local banner for the actor + a public marquee headline for everyone.
    async broadcastBattleStage(localMsg, kind, marqueeMsg) {
        if (localMsg) this.showBattleAlert(localMsg, kind);
        if (marqueeMsg) {
            const u = this.state.profile || {};
            await window.GroupBattleSchedule.postBattleMarquee(u.id, u.username, marqueeMsg);
        }
    },

    // One 1s ticker updates every countdown on screen ([data-countdown-to]=epoch ms).
    startBattleTick() {
        if (this._battleTick) return;
        this._battleTick = setInterval(() => this.renderCountdowns(), 1000);
        this.renderCountdowns();
    },
    stopBattleTick() {
        if (this._battleTick) { clearInterval(this._battleTick); this._battleTick = null; }
    },
    renderCountdowns() {
        const now = Date.now();
        const pad = n => String(n).padStart(2, '0');
        const nodes = document.querySelectorAll('[data-countdown-to]');
        if (!nodes.length && !document.getElementById('battle-timer-widget')) { this.stopBattleTick(); return; }
        nodes.forEach(el => {
            const target = parseInt(el.getAttribute('data-countdown-to'), 10);
            const left = target - now;
            if (left <= 0) {
                el.textContent = el.getAttribute('data-zero-text') || '00:00';
                el.classList.add('cd-done');
                if (el.hasAttribute('data-countdown-refresh') && !el._firedRefresh) {
                    el._firedRefresh = true;
                    if (this._battleBoardGroupId) setTimeout(() => this.renderBattleScheduleBoard(this._battleBoardGroupId), 800);
                }
                return;
            }
            const t = Math.floor(left / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
            el.textContent = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
            if (left < 60000) el.classList.add('cd-urgent');
        });
    },

    // Realtime board: any change to battles / pairs (score) re-renders (debounced, and
    // never while a chat box is focused); new chat messages append live without a reload.
    startBattleBoardLive(viewGroupId) {
        this.stopBattleBoardLive();
        const sb = window.SupabaseClient && window.SupabaseClient.client;
        if (!sb) return;
        this._battleBoardGroupId = viewGroupId;
        const reload = () => {
            const ae = document.activeElement;
            if (ae && ae.classList && ae.classList.contains('bb-chat-input')) { this._pendingBoardReload = true; return; }
            clearTimeout(this._boardReloadT);
            this._boardReloadT = setTimeout(() => this.renderBattleScheduleBoard(viewGroupId), 500);
        };
        this._battleBoardChannel = sb.channel('battle-board:' + viewGroupId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'group_battles', filter: 'group_a_id=eq.' + viewGroupId }, reload)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'group_battles', filter: 'group_b_id=eq.' + viewGroupId }, reload)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'group_battle_pairs' }, reload)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_battle_chat' }, p => this.onBattleChatInsert(p.new))
            .subscribe();
    },
    stopBattleBoardLive() {
        const sb = window.SupabaseClient && window.SupabaseClient.client;
        if (this._battleBoardChannel && sb) { try { sb.removeChannel(this._battleBoardChannel); } catch (e) { } }
        this._battleBoardChannel = null;
        clearTimeout(this._boardReloadT);
    },
    onBattleChatInsert(msg) {
        if (!msg) return;
        const list = document.querySelector(`.bb-chat-list[data-battle="${msg.battle_id}"]`);
        if (!list) return;
        const empty = list.querySelector('.bb-chat-empty'); if (empty) empty.remove();
        const mine = this.state.profile && msg.sender_id === this.state.profile.id;
        const div = document.createElement('div');
        div.className = 'bb-chat-msg ' + (mine ? 'mine' : '');
        div.innerHTML = `<b>${this.escapeHtml(msg.sender_username)}:</b> ${this.escapeHtml(msg.message)}`;
        list.appendChild(div);
        list.scrollTop = list.scrollHeight;
    },

    // Floating always-on countdown for the member's nearest imminent/active battle, on
    // any screen; click to jump to the board. Polled every 60s, ticked every 1s.
    async refreshBattleTimerWidget() {
        try {
            if (!this._battleTimerPoll) this._battleTimerPoll = setInterval(() => this.refreshBattleTimerWidget(), 60000);
            if (!this.state.profile || !window.Groups || !window.GroupBattleSchedule) return this.hideBattleTimer();
            const mine = await window.Groups.getMyGroup(this.state.profile.id).catch(() => null);
            if (!mine || !mine.group) return this.hideBattleTimer();
            const battles = await window.GroupBattleSchedule.getBattlesFor(mine.group.id);
            const now = Date.now();
            let best = null, kind = null, target = 0;
            for (const b of battles) {
                if (!b.scheduled_at) continue;
                const start = new Date(b.scheduled_at).getTime();
                const end = start + (b.window_min || 30) * 60000;
                if (b.status === 'active' && now < end) { best = b; kind = 'live'; target = end; break; }
                if (b.status === 'pending' && b.schedule_approved && now < start && (!best || start < target)) { best = b; kind = 'wait'; target = start; }
            }
            if (!best) return this.hideBattleTimer();
            this.showBattleTimer(mine.group.id, kind, target);
        } catch (e) { /* widget is best-effort */ }
    },
    showBattleTimer(myGroupId, kind, target) {
        let w = document.getElementById('battle-timer-widget');
        if (!w) {
            w = document.createElement('button');
            w.id = 'battle-timer-widget';
            document.body.appendChild(w);
            w.addEventListener('click', () => { if (this._battleTimerGroupId) this.renderBattleScheduleBoard(this._battleTimerGroupId); });
        }
        this._battleTimerGroupId = myGroupId;
        const label = kind === 'live' ? '⚔️ ĐANG THI ĐẤU · còn' : '⏳ Trận bắt đầu sau';
        w.className = 'battle-timer-widget ' + (kind === 'live' ? 'live' : 'wait');
        w.innerHTML = `<span class="btw-label">${label}</span><span class="btw-clock" data-countdown-to="${target}" data-zero-text="${kind === 'live' ? 'Hết giờ' : 'Bắt đầu!'}" data-countdown-refresh="1">--:--</span>`;
        this.startBattleTick();
    },
    hideBattleTimer() {
        const w = document.getElementById('battle-timer-widget');
        if (w) w.remove();
    },

    // ===== Letter-first challenge flow: search -> letter -> accept -> schedule+wager+chat
    //       -> approve -> auto-pair at window -> timed play -> server-side rewards. =====

    // Owner/admin searches for an opponent group and sends a challenge LETTER (step 1).
    renderChallengeSearch(myGroupId) {
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">🔍</div>
                <h1 style="text-align:center;">Tìm đối thủ</h1>
                <p style="text-align:center; color:#777;">Gửi thư mời thách đấu. Đối thủ nhận lời rồi bạn mới đặt lịch & mức cược.</p>
                <input type="text" id="chal-target" class="input-field" style="display:block; width:80%; max-width:320px; margin:12px auto; padding:12px; text-align:center;" placeholder="Tên group đối thủ...">
                <p id="chal-error" style="text-align:center; color: var(--duo-red); min-height:18px;"></p>
                <button class="btn-primary" id="chal-send" style="display:block; margin:10px auto; padding:15px 30px;">✉️ GỬI THƯ THÁCH ĐẤU</button>
                <button class="btn-secondary" id="chal-back" style="display:block; margin:0 auto; padding:12px 26px;">QUAY LẠI</button>
            </div>`;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('chal-back').addEventListener('click', () => this.renderBattleScheduleBoard(myGroupId));
        const input = document.getElementById('chal-target');
        this.attachSuggestions(input, async (q) => {
            const found = await window.Groups.searchGroups(q, 8);
            return found.filter(g => g.id !== myGroupId).map(g => ({
                label: `🏰 ${g.name} (${getGroupLevelInfo(g.vibrancy_score).label})`, value: g.name,
            }));
        });
        document.getElementById('chal-send').addEventListener('click', async () => {
            const target = input.value.trim();
            const err = document.getElementById('chal-error');
            if (!target) { err.innerText = 'Nhập tên group đối thủ.'; return; }
            const btn = document.getElementById('chal-send'); btn.disabled = true;
            const r = await window.GroupBattleSchedule.sendChallengeLetter(myGroupId, target, this.state.profile);
            if (r.error) { err.innerText = r.error; btn.disabled = false; return; }
            this.showBriefToast('✉️ Đã gửi thư thách đấu!');
            this.renderBattleScheduleBoard(myGroupId);
        });
    },

    // Challenger sets or changes the date-time, window and wager for ONE battle (step 3).
    renderScheduleEditor(battle, myGroupId) {
        if (!battle) { this.renderBattleScheduleBoard(myGroupId); return; }
        const base = battle.scheduled_at ? new Date(battle.scheduled_at) : new Date(Date.now() + 3600000);
        if (!battle.scheduled_at) base.setMinutes(Math.ceil(base.getMinutes() / 5) * 5, 0, 0);
        const pad = n => String(n).padStart(2, '0');
        const local = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T${pad(base.getHours())}:${pad(base.getMinutes())}`;
        const isFirst = !battle.scheduled_at;
        const changesLeft = 3 - (battle.schedule_change_count || 0);
        const win = battle.window_min || 30;
        const opt = (v, label) => `<option value="${v}" ${win === v ? 'selected' : ''}>${label}</option>`;
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                ${this.calendarIconHtml()}
                <h1 style="text-align:center;">${isFirst ? 'Đặt lịch & cược' : 'Đổi lịch & cược'}</h1>
                <p style="text-align:center; color:#777;">${isFirst ? 'Chọn ngày giờ, cửa sổ vào trận và mức cược EXP. Đối thủ sẽ duyệt.' : `Còn ${changesLeft} lần đổi. Mỗi lần đổi, đối thủ phải duyệt lại.`}</p>
                <label style="display:block; text-align:center; color:#777; font-size:13px; margin-top:8px;">Thời gian thi đấu</label>
                <input type="datetime-local" id="sched-time" class="input-field" style="display:block; width:80%; max-width:300px; margin:6px auto; padding:12px; text-align:center;" value="${local}">
                <label style="display:block; text-align:center; color:#777; font-size:13px; margin-top:8px;">Cửa sổ vào trận (phút)</label>
                <select id="sched-window" class="input-field" style="display:block; width:80%; max-width:300px; margin:6px auto; padding:12px; text-align:center;">
                    ${opt(15, '15 phút')}${opt(30, '30 phút')}${opt(60, '60 phút')}
                </select>
                <label style="display:block; text-align:center; color:#777; font-size:13px; margin-top:8px;">Cược EXP group (0 = không cược)</label>
                <input type="number" id="sched-wager" min="0" step="10" value="${battle.wager_xp || 0}" class="input-field" style="display:block; width:80%; max-width:300px; margin:6px auto; padding:12px; text-align:center;">
                <button class="btn-primary" id="sched-send" style="display:block; margin:16px auto; padding:15px 30px;">${isFirst ? 'GỬI LỊCH' : 'GỬI LỊCH MỚI'}</button>
                <button class="btn-secondary" id="sched-back" style="display:block; margin:0 auto; padding:12px 26px;">QUAY LẠI</button>
            </div>`;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('sched-back').addEventListener('click', () => this.renderBattleScheduleBoard(myGroupId));
        document.getElementById('sched-send').addEventListener('click', async () => {
            const when = document.getElementById('sched-time').value;
            const windowMin = parseInt(document.getElementById('sched-window').value, 10) || 30;
            const wager = Math.max(0, parseInt(document.getElementById('sched-wager').value, 10) || 0);
            const at = new Date(when);
            if (!when || isNaN(at.getTime()) || at.getTime() < Date.now() + 5 * 60000) { alert('Chọn thời gian ít nhất 5 phút sau hiện tại.'); return; }
            const btn = document.getElementById('sched-send'); btn.disabled = true;
            const r = await window.GroupBattleSchedule.setSchedule(battle, at.toISOString(), windowMin, wager, this.state.profile);
            if (r.error) { alert(r.error); btn.disabled = false; return; }
            this.showBriefToast('📅 Đã gửi lịch! Chờ đối thủ duyệt.');
            this.renderBattleScheduleBoard(myGroupId);
        });
    },

    // The phase-aware board: letters, scheduling+chat, waiting, live pairs, recent results.
    async renderBattleScheduleBoard(groupId) {
        this.ui.container.innerHTML = `<div class="welcome-screen">${this.calendarIconHtml()}<h1 style="text-align:center;">Lịch thi đấu</h1><p style="text-align:center; color:#777;">Đang tải...</p></div>`;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        const mine = this.state.profile ? await window.Groups.getMyGroup(this.state.profile.id).catch(() => null) : null;
        const myGroupId = mine && mine.group ? mine.group.id : null;
        const iAmAdmin = !!(mine && mine.membership && ['owner', 'admin'].includes(mine.membership.role));
        const viewGroupId = groupId || myGroupId;
        if (!viewGroupId) { this.renderGroupsMenu(); return; }

        const S = window.GroupBattleSchedule;
        const nameCache = {};
        const nameOf = async id => { if (nameCache[id]) return nameCache[id]; const g = await window.Groups.getGroupById(id).catch(() => null); nameCache[id] = g ? g.name : '?'; return nameCache[id]; };

        let battles = await S.getBattlesFor(viewGroupId);
        // Auto-pair approved battles whose time has arrived; the client that wins the claim
        // announces the kickoff on the community marquee.
        for (const b of battles) {
            if (b.status === 'pending' && b.schedule_approved && b.scheduled_at && Date.now() >= new Date(b.scheduled_at).getTime()) {
                const r = await S.ensurePairsAndActivate(b);
                if (r && r.pairs > 0) {
                    const na = await nameOf(b.group_a_id), nb = await nameOf(b.group_b_id);
                    this.showBattleAlert('⚔️ ĐẾN GIỜ! Trận đấu đã bắt đầu — vào trận ngay!', 'live');
                    await S.postBattleMarquee(this.state.profile && this.state.profile.id, this.state.profile && this.state.profile.username, `⚔️ TRẬN ĐẤU BẮT ĐẦU: ${na} 🆚 ${nb}! (${r.pairs} cặp)`);
                }
            }
        }
        battles = await S.getBattlesFor(viewGroupId);
        // Progress the live score and finalize on time for every active battle.
        for (const b of battles) { if (b.status === 'active') await S.syncScheduledBattle(b); }
        battles = await S.getBattlesFor(viewGroupId);
        const finished = await S.getRecentFinishedFor(viewGroupId);
        await this.announceFinishedBattles(finished, myGroupId, nameOf);

        let cards = '';
        for (const b of battles) cards += await this.renderBattleCard(b, myGroupId, iAmAdmin, nameOf);
        let finishedCards = '';
        for (const b of finished) finishedCards += await this.renderFinishedBattleCard(b, myGroupId, nameOf);

        const canSearch = iAmAdmin && myGroupId && viewGroupId === myGroupId;
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                ${this.calendarIconHtml()}
                <h1 style="text-align:center;">Lịch thi đấu Group</h1>
                <p style="text-align:center; color:#777;">Thư mời → nhận lời → đặt lịch & cược → duyệt → vào trận. Vắng mặt trong cửa sổ = xử thua cặp đó.</p>
                ${canSearch ? `<button class="btn-primary" id="chal-search-btn" style="display:block; margin:10px auto; padding:13px 26px;">🔍 Tìm & thách đấu group khác</button>` : ''}
                ${cards || '<p style="text-align:center; color:#777;">Chưa có trận nào.</p>'}
                ${finishedCards ? `<h3 style="text-align:center; margin-top:18px;">Kết quả gần đây</h3>${finishedCards}` : ''}
                <button class="btn-secondary" id="sched-board-back" style="display:block; margin:15px auto; padding:15px 30px;">QUAY LẠI</button>
            </div>`;
        document.getElementById('sched-board-back').addEventListener('click', () => { this.stopBattleBoardLive(); this.renderGroupsMenu(); });
        const searchBtn = document.getElementById('chal-search-btn');
        if (searchBtn) searchBtn.addEventListener('click', () => this.renderChallengeSearch(myGroupId));
        this.wireBattleBoard(viewGroupId, battles);
        this.ui.container.querySelectorAll('.bb-chat-list').forEach(l => { l.scrollTop = l.scrollHeight; });
        this.startBattleBoardLive(viewGroupId);
        this.startBattleTick();
        this.refreshBattleTimerWidget();
    },

    // Once per finished battle (per client), push the result to the marquee for everyone
    // and a prominent local banner if the viewer's group was involved.
    async announceFinishedBattles(finished, myGroupId, nameOf) {
        if (!this._announcedFinished) this._announcedFinished = new Set();
        for (const b of (finished || [])) {
            if (this._announcedFinished.has(b.id)) continue;
            this._announcedFinished.add(b.id);
            const na = await nameOf(b.group_a_id), nb = await nameOf(b.group_b_id);
            const hi = Math.max(b.group_a_wins || 0, b.group_b_wins || 0), lo = Math.min(b.group_a_wins || 0, b.group_b_wins || 0);
            const resultTxt = !b.winner_group_id ? `HÒA ${b.group_a_wins || 0}-${b.group_b_wins || 0}` : `${this.escapeHtml(b.winner_group_id === b.group_a_id ? na : nb)} THẮNG ${hi}-${lo}`;
            await window.GroupBattleSchedule.postBattleMarquee(this.state.profile && this.state.profile.id, this.state.profile && this.state.profile.username, `🏁 KẾT THÚC: ${na} 🆚 ${nb} — ${resultTxt}${b.forfeited_by_group_id ? ' (bỏ cuộc)' : ''}`);
            if (myGroupId && (b.group_a_id === myGroupId || b.group_b_id === myGroupId)) {
                const iWon = b.winner_group_id === myGroupId;
                this.showBattleAlert(`🏁 Trận đấu kết thúc! ${!b.winner_group_id ? '🤝 Hai group hòa nhau!' : (iWon ? '🏆 GROUP BẠN CHIẾN THẮNG!' : '💪 Group bạn đã thua trận này.')}`, iWon ? 'gold' : (!b.winner_group_id ? 'info' : 'danger'));
            }
        }
    },

    scoreboardHtml(nameA, nameB, winsA, winsB, live) {
        return `<div class="bb-scoreboard ${live ? 'live' : ''}">
                    <span class="bb-sb-team">${this.escapeHtml(nameA)}</span>
                    <span class="bb-sb-score">${winsA}<span class="bb-sb-dash">–</span>${winsB}</span>
                    <span class="bb-sb-team">${this.escapeHtml(nameB)}</span>
                </div>`;
    },

    // One battle card, rendered by phase. myGroupId identifies which side (if any) the
    // viewer belongs to; iAmAdmin gates the owner/admin-only actions.
    async renderBattleCard(b, myGroupId, iAmAdmin, nameOf) {
        const nameA = await nameOf(b.group_a_id), nameB = await nameOf(b.group_b_id);
        const adminA = iAmAdmin && myGroupId === b.group_a_id;   // challenger side
        const adminB = iAmAdmin && myGroupId === b.group_b_id;   // opponent side
        const title = `${this.clickableGroupName(b.group_a_id, nameA)} ⚔️ ${this.clickableGroupName(b.group_b_id, nameB)}`;
        const at = b.scheduled_at ? new Date(b.scheduled_at) : null;
        const timeLabel = at ? `${at.toLocaleDateString('vi-VN')} ${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}` : '';
        const windowEnd = at ? at.getTime() + (b.window_min || 30) * 60000 : 0;
        const inWindow = at && Date.now() >= at.getTime() && Date.now() < windowEnd;
        const wagerLine = (b.wager_xp || 0) > 0 ? `<div class="sched-card-time">💰 Cược: <b>${b.wager_xp}</b> EXP group</div>` : '';
        let body = '';

        if (b.status === 'pending' && !b.invite_accepted) {
            if (adminB) body = `<p style="color:#777; font-size:13px;">✉️ Group bạn nhận được thư thách đấu.</p>
                <button class="btn-primary bb-accept-letter" data-bid="${b.id}" style="padding:9px 18px; margin:4px;">NHẬN LỜI</button>
                <button class="btn-secondary bb-decline-letter" data-bid="${b.id}" style="padding:9px 18px; margin:4px;">TỪ CHỐI</button>`;
            else if (adminA) body = `<p style="color:#999; font-size:13px;">✉️ Đã gửi thư — chờ ${this.escapeHtml(nameB)} nhận lời.</p>
                <button class="btn-secondary bb-withdraw" data-bid="${b.id}" style="padding:8px 16px; margin-top:4px; color:var(--duo-red);">❌ Thu hồi thư mời</button>`;
            else body = `<p style="color:#999; font-size:13px;">✉️ Đã gửi thư — chờ ${this.escapeHtml(nameB)} nhận lời.</p>`;
            return `<div class="sched-card"><div class="sched-card-title">${title}</div>${body}</div>`;
        }

        if (at) {
            const tag = b.schedule_approved
                ? (inWindow ? '· <b style="color:#58a700">ĐANG DIỄN RA</b>' : (Date.now() >= windowEnd ? '· đang tổng kết' : '· ✅ đã chốt'))
                : '· ⏳ chờ duyệt';
            body += `<div class="sched-card-time">🕐 ${timeLabel} · cửa sổ ${b.window_min || 30} phút ${tag}</div>${wagerLine}`;
        } else {
            body += `<p style="color:#999; font-size:13px;">🤝 Đã nhận lời. Chờ đối thủ đặt lịch & mức cược.</p>`;
        }

        if (!b.schedule_approved) {
            if (adminA) {
                const changesLeft = 3 - (b.schedule_change_count || 0);
                body += (!at || changesLeft > 0)
                    ? `<button class="btn-primary bb-set-schedule" data-bid="${b.id}" style="padding:9px 18px; margin:4px;">${at ? `📅 Đổi lịch/cược (còn ${changesLeft} lần)` : '📅 Đặt lịch & cược'}</button>`
                    : `<p style="color:#999; font-size:13px;">Đã hết lượt đổi lịch (3/3) — chờ đối thủ duyệt.</p>`;
            }
            if (adminB) body += at
                ? `<button class="btn-primary bb-approve" data-bid="${b.id}" style="padding:9px 18px; margin:4px;">🤝 CHẤP THUẬN lịch & cược</button>`
                : `<p style="color:#999; font-size:13px;">⏳ Chờ đối thủ đặt lịch.</p>`;
        } else if (b.status === 'active' || inWindow) {
            const pairs = await window.GroupBattleSchedule.getPairs(b.id);
            const winsA = pairs.filter(p => p.winner === 'a').length, winsB = pairs.filter(p => p.winner === 'b').length;
            body += this.scoreboardHtml(nameA, nameB, winsA, winsB, true);
            if (inWindow) body += `<div class="bb-countdown-wrap live">⚔️ Thời gian thi đấu còn <span class="bb-countdown" data-countdown-to="${windowEnd}" data-zero-text="HẾT GIỜ" data-countdown-refresh="1">--:--</span></div>`;
            body += this.renderPairRows(b, pairs, inWindow, windowEnd);
            if ((adminA || adminB) && b.status === 'active') body += `<button class="btn-secondary bb-forfeit" data-bid="${b.id}" style="padding:8px 16px; margin-top:8px; color:var(--duo-red);">🏳️ Bỏ cuộc (xử thua)</button>`;
        } else if (at && Date.now() < at.getTime()) {
            body += this.scoreboardHtml(nameA, nameB, 0, 0, false);
            body += `<div class="bb-countdown-wrap wait">✅ Đã chốt! Trận bắt đầu sau <span class="bb-countdown" data-countdown-to="${at.getTime()}" data-zero-text="BẮT ĐẦU!" data-countdown-refresh="1">--:--</span></div>`;
        } else {
            body += `<p style="color:#999; font-size:13px;">⏳ Đang tổng kết trận...</p>`;
        }

        if ((adminA || adminB) && b.status === 'pending') body += `<button class="btn-secondary bb-withdraw" data-bid="${b.id}" style="padding:7px 14px; margin-top:6px; font-size:12px; color:#999;">❌ Hủy trận</button>`;
        if (adminA || adminB) body += await this.renderBattleChat(b);
        return `<div class="sched-card ${inWindow ? 'sched-card-live' : ''}"><div class="sched-card-title">${title}</div>${body}</div>`;
    },

    renderPairRows(b, pairs, inWindow, windowEnd) {
        if (!pairs || !pairs.length) return `<p style="color:#999; font-size:13px;">Chưa có cặp đấu.</p>`;
        const rows = pairs.map(p => {
            const meA = this.state.profile && p.user_a_id === this.state.profile.id;
            const meB = this.state.profile && p.user_b_id === this.state.profile.id;
            const status = p.winner
                ? (p.winner === 'draw' ? '🤝 Hòa' : `🏆 ${this.escapeHtml(p.winner === 'a' ? p.username_a : p.username_b)}`)
                : (inWindow ? `${p.joined_a_at ? '🟢' : '⚪'} vs ${p.joined_b_at ? '🟢' : '⚪'}` : '⏳');
            const cd = (inWindow && !p.winner) ? `<span class="bb-pair-cd" data-countdown-to="${windowEnd}" data-zero-text="⌛">--:--</span>` : '';
            const joinBtn = (inWindow && !p.winner && (meA || meB) && !(meA ? p.joined_a_at : p.joined_b_at))
                ? `<button class="btn-primary sched-join" data-pid="${p.id}" data-bid="${b.id}" data-side="${meA ? 'a' : 'b'}" style="padding:5px 12px; font-size:12px;">VÀO TRẬN</button>` : '';
            const duelBtn = (inWindow && !p.winner && (meA || meB) && (meA ? p.joined_a_at : p.joined_b_at) && (meA ? p.joined_b_at : p.joined_a_at))
                ? `<button class="btn-primary sched-duel" data-opponent="${this.escapeHtml(meA ? p.username_b : p.username_a)}" data-bid="${b.id}" data-side="${meA ? 'a' : 'b'}" style="padding:5px 12px; font-size:12px;">⚔️ ĐẤU NGAY</button>` : '';
            return `<div class="sched-pair-row ${meA || meB ? 'me' : ''}">
                        <span class="sched-pair-names">${this.escapeHtml(p.username_a)} ⚔️ ${this.escapeHtml(p.username_b)}</span>
                        <span class="sched-pair-status">${cd}${status}${joinBtn}${duelBtn}</span>
                    </div>`;
        }).join('');
        return `<div class="sched-pairs">${rows}</div>`;
    },

    // Private owner-to-owner thread for one battle (only owners/admins of both sides).
    // Realtime: new messages append via onBattleChatInsert (keyed by data-battle).
    async renderBattleChat(b) {
        const msgs = await window.GroupBattleSchedule.getBattleChat(b.id);
        const list = (msgs || []).map(m => {
            const mine = this.state.profile && m.sender_id === this.state.profile.id;
            return `<div class="bb-chat-msg ${mine ? 'mine' : ''}"><b>${this.escapeHtml(m.sender_username)}:</b> ${this.escapeHtml(m.message)}</div>`;
        }).join('') || `<div class="bb-chat-empty">Chưa có tin nhắn. Trao đổi lịch đấu với chủ group đối thủ ở đây.</div>`;
        return `<div class="bb-chat">
                    <div class="bb-chat-title">💬 Chat với chủ group đối thủ (trực tiếp)</div>
                    <div class="bb-chat-list" data-battle="${b.id}">${list}</div>
                    <div class="bb-chat-input-row">
                        <input type="text" class="bb-chat-input" id="bb-chat-input-${b.id}" maxlength="500" placeholder="Nhắn cho chủ group đối thủ...">
                        <button class="btn-primary bb-chat-send" data-bid="${b.id}" style="padding:8px 14px; font-size:13px;">Gửi</button>
                    </div>
                </div>`;
    },

    async renderFinishedBattleCard(b, myGroupId, nameOf) {
        const nameA = await nameOf(b.group_a_id), nameB = await nameOf(b.group_b_id);
        const pairs = await window.GroupBattleSchedule.getPairs(b.id);
        let outcome, kind;
        if (!b.winner_group_id) { outcome = '🤝 Hai group HÒA'; kind = 'info'; }
        else {
            const wn = b.winner_group_id === b.group_a_id ? nameA : nameB;
            const mineWon = myGroupId && b.winner_group_id === myGroupId;
            outcome = `🏆 ${this.escapeHtml(wn)} THẮNG${mineWon ? ' — group bạn!' : ''}`;
            kind = mineWon ? 'gold' : 'danger';
        }
        const forfeitNote = b.forfeited_by_group_id
            ? `<div class="bb-forfeit-note">🏳️ ${this.escapeHtml(b.forfeited_by_group_id === b.group_a_id ? nameA : nameB)} đã bỏ cuộc — bị xử thua.</div>` : '';
        const pairList = (pairs || []).map(p => {
            const w = p.winner === 'draw' ? '🤝 Hòa' : (p.winner === 'a' ? `🏆 ${this.escapeHtml(p.username_a)}` : (p.winner === 'b' ? `🏆 ${this.escapeHtml(p.username_b)}` : '—'));
            return `<div class="bb-result-pair"><span>${this.escapeHtml(p.username_a)} ⚔️ ${this.escapeHtml(p.username_b)}</span><span>${w}</span></div>`;
        }).join('');
        const wagerNote = (b.wager_xp || 0) > 0 && b.winner_group_id ? `<div class="bb-result-line">💰 Group thắng nhận <b>${b.wager_xp}</b> EXP cược.</div>` : '';
        const stealNote = b.winner_group_id ? `<div class="bb-result-line">🗡️ Mỗi thành viên group thắng có vào trận đã cướp 10% XP của đối thủ ghép cặp.</div>` : '';
        return `<div class="sched-card sched-card-finished bb-result-${kind}">
                    <div class="sched-card-title">${this.clickableGroupName(b.group_a_id, nameA)} ⚔️ ${this.clickableGroupName(b.group_b_id, nameB)}</div>
                    ${this.scoreboardHtml(nameA, nameB, b.group_a_wins || 0, b.group_b_wins || 0, false)}
                    <div class="bb-result-outcome">${outcome}</div>
                    ${forfeitNote}
                    <details class="bb-result-details"><summary>Chi tiết từng cặp (${(pairs || []).length})</summary><div class="bb-result-pairs">${pairList || '<i>Không có cặp đấu.</i>'}</div></details>
                    ${wagerNote}${stealNote}
                    <div class="bb-result-rule">Luật: mỗi cặp thắng +1 điểm; vắng mặt trong cửa sổ = xử thua cặp đó; cả hai vắng = hòa; group nhiều điểm hơn thắng.</div>
                </div>`;
    },

    // All delegated button wiring for the schedule board (called after innerHTML is set).
    wireBattleBoard(viewGroupId, battles) {
        const findB = bid => battles.find(x => x.id === bid);
        const reload = () => this.renderBattleScheduleBoard(viewGroupId);
        const on = (sel, fn) => this.ui.container.querySelectorAll(sel).forEach(btn => btn.addEventListener('click', () => fn(btn)));
        const namesOf = async b => [await window.Groups.getGroupById(b.group_a_id).catch(() => null), await window.Groups.getGroupById(b.group_b_id).catch(() => null)];

        on('.bb-accept-letter', async btn => {
            btn.disabled = true;
            const r = await window.GroupBattleSchedule.acceptInvite(findB(btn.dataset.bid), this.state.profile);
            if (r.error) { alert(r.error); btn.disabled = false; return; }
            this.showBattleAlert('✅ Đã NHẬN LỜI thách đấu! Chờ đối thủ đặt lịch & mức cược.', 'success');
            reload();
        });
        on('.bb-decline-letter', btn => this.showConfirmDialog('Từ chối lời thách đấu này?', async () => {
            const r = await window.GroupBattleSchedule.declineInvite(btn.dataset.bid);
            if (r.error) { alert(r.error); return; }
            this.showBriefToast('Đã từ chối.');
            reload();
        }, { okLabel: 'TỪ CHỐI' }));
        on('.bb-set-schedule', btn => this.renderScheduleEditor(findB(btn.dataset.bid), viewGroupId));
        on('.bb-approve', async btn => {
            btn.disabled = true;
            const b = findB(btn.dataset.bid);
            const r = await window.GroupBattleSchedule.approveSchedule(b, this.state.profile);
            if (r.error) { alert(r.error); btn.disabled = false; return; }
            this.showBattleAlert('🔒 ĐÃ CHỐT TRẬN ĐẤU! Đến giờ vào lại đây để thi đấu.', 'gold');
            const [ga, gb] = await namesOf(b);
            const at = b.scheduled_at ? new Date(b.scheduled_at) : null;
            const t = at ? `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')} ${at.toLocaleDateString('vi-VN')}` : '';
            await window.GroupBattleSchedule.postBattleMarquee(this.state.profile.id, this.state.profile.username, `🔒 CHỐT TRẬN: ${ga ? ga.name : '?'} 🆚 ${gb ? gb.name : '?'} lúc ${t}${(b.wager_xp || 0) > 0 ? ` · cược ${b.wager_xp} EXP` : ''}!`);
            reload();
        });
        on('.bb-withdraw', btn => this.showConfirmDialog('Hủy trận đấu này? (chỉ được khi trận chưa bắt đầu)', async () => {
            const r = await window.GroupBattleSchedule.withdrawBattle(btn.dataset.bid);
            if (r.error) { alert(r.error); return; }
            this.showBriefToast('Đã hủy trận.');
            reload();
        }, { okLabel: 'HỦY TRẬN' }));
        on('.bb-forfeit', btn => this.showConfirmDialog('Bỏ cuộc? Group bạn sẽ bị XỬ THUA trận này và mất điểm cược.', async () => {
            const b = findB(btn.dataset.bid);
            const r = await window.GroupBattleSchedule.forfeitBattle(b, viewGroupId, this.state.profile);
            if (r.error) { alert(r.error); return; }
            this.showBattleAlert('🏳️ Group bạn đã bỏ cuộc — xử thua.', 'danger');
            const [ga, gb] = await namesOf(b);
            const winner = viewGroupId === b.group_a_id ? gb : ga, loser = viewGroupId === b.group_a_id ? ga : gb;
            await window.GroupBattleSchedule.postBattleMarquee(this.state.profile.id, this.state.profile.username, `🏳️ ${loser ? loser.name : '?'} BỎ CUỘC — ${winner ? winner.name : '?'} thắng!`);
            reload();
        }, { okLabel: 'BỎ CUỘC' }));
        on('.bb-chat-send', async btn => {
            const input = document.getElementById('bb-chat-input-' + btn.dataset.bid);
            const r = await window.GroupBattleSchedule.sendBattleChat(btn.dataset.bid, this.state.profile, input ? input.value : '');
            if (r.error) { alert(r.error); return; }
            if (input) input.value = ''; // realtime (onBattleChatInsert) appends it instantly
        });
        on('.sched-join', async btn => {
            btn.disabled = true;
            const pairs = await window.GroupBattleSchedule.getPairs(btn.dataset.bid);
            const p = (pairs || []).find(x => x.id === btn.dataset.pid) || { id: btn.dataset.pid };
            await window.GroupBattleSchedule.joinPair(p, btn.dataset.side);
            this.showBattleAlert('🟢 Bạn đã VÀO TRẬN! Chờ đối thủ để bắt đầu đấu.', 'live');
            reload();
        });
        on('.sched-duel', async btn => {
            btn.disabled = true;
            const r = await this.sendGameDuelChallenge(btn.dataset.opponent, 'lesson', btn.dataset.bid, btn.dataset.side);
            if (r && r.error) { alert(r.error); btn.disabled = false; }
        });
    },

    // Dashboard hook (fire-and-forget): when a scheduled battle involving my group is
    // inside its play window and I still have an undecided pair, surface a call-to-arms.
    async checkScheduledBattleWindow() {
        try {
            if (!this.state.profile || !window.Groups || !window.GroupBattleSchedule) return;
            const mine = await window.Groups.getMyGroup(this.state.profile.id);
            if (!mine || !mine.group) return;
            const battles = await window.GroupBattleSchedule.getScheduleFor(mine.group.id);
            const now = Date.now();
            for (const b of battles) {
                if (b.status !== 'active' || !b.scheduled_at) continue;
                const start = new Date(b.scheduled_at).getTime();
                const end = start + (b.window_min || 30) * 60000;
                if (now < start || now >= end) continue;
                const pairs = await window.GroupBattleSchedule.getPairs(b.id);
                const minePair = pairs.find(p => !p.winner && (p.user_a_id === this.state.profile.id || p.user_b_id === this.state.profile.id));
                if (!minePair) continue;
                // one banner per battle per session
                if (this._notifiedBattles && this._notifiedBattles.has(b.id)) return;
                (this._notifiedBattles = this._notifiedBattles || new Set()).add(b.id);
                this.showBriefToast('⚔️ Đến giờ ghép đấu group! Vào lịch thi đấu ngay!');
                const host = document.querySelector('.home-dashboard');
                if (host) {
                    const banner = document.createElement('button');
                    banner.className = 'sched-alert-banner';
                    banner.innerHTML = '⚔️ TRẬN GHÉP ĐẤU GROUP ĐANG DIỄN RA — VÀO TRẬN NGAY';
                    banner.addEventListener('click', () => this.renderBattleScheduleBoard(mine.group.id));
                    host.prepend(banner);
                }
                return;
            }
        } catch (e) { /* purely additive - never break the dashboard */ }
    },
});

// Delegated click for every clickable group name rendered anywhere.
document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('.clickable-groupname');
    if (!el || typeof app === 'undefined') return;
    app.openGroupActions(el.dataset.gid, el.dataset.gname);
});
