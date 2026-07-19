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
                    user_a_id: A[i].profile_id, username_a: A[i].username,
                    user_b_id: B[i].profile_id, username_b: B[i].username,
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

    window.GroupBattleSchedule = { challengeScheduled, getScheduleFor, acceptScheduled, getPairs, joinPair, finalizeExpired };
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
        const isOwner = isMyGroup && mine.membership && ['owner', 'admin'].includes(mine.membership.role);
        const overlay = document.createElement('div');
        overlay.id = 'group-actions-overlay';
        overlay.className = 'group-actions-overlay';
        overlay.innerHTML = `
            <div class="group-actions-sheet">
                <div class="group-actions-title">🏰 ${this.escapeHtml(name || 'Group')}</div>
                <button class="btn-secondary ga-btn" data-ga="info">ℹ️ Xem info group</button>
                ${!mine ? `<button class="btn-primary ga-btn" data-ga="join">✉️ Xin vào group</button>` : ''}
                ${isMyGroup && !isOwner ? `<button class="btn-secondary ga-btn ga-danger" data-ga="leave">🚪 Thoát group</button>` : ''}
                ${isMyGroup && isOwner ? `<button class="btn-primary ga-btn" data-ga="schedule">⚔️ Thách đấu & đặt lịch</button>` : ''}
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
            } else if (ga === 'schedule') this.renderScheduleChallengeForm(groupId);
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
                <p style="text-align:center; color:#777;">👑 Chủ group: <b>${this.escapeHtml(owner ? owner.username : '—')}</b> · 📅 Lập ngày ${created}</p>
                ${(g.description ? `<p style="text-align:center; color:#999;">${this.escapeHtml(g.description)}</p>` : '')}
                <button class="btn-secondary" id="group-info-back" style="display:block; margin:15px auto; padding:15px 30px;">QUAY LẠI</button>
            </div>`;
        document.getElementById('group-info-back').addEventListener('click', () => this.renderGroupDirectory());
    },

    // ===== Scheduled battle: owner form -> pairing board -> timed play =====
    renderScheduleChallengeForm(myGroupId) {
        // default: +1 hour, rounded to 5 minutes, as a local datetime string
        const d = new Date(Date.now() + 3600000); d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
        const pad = n => String(n).padStart(2, '0');
        const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">📅</div>
                <h1 style="text-align:center;">Thách đấu & đặt lịch</h1>
                <p style="text-align:center; color:#777;">Hệ thống sẽ tự ghép cặp thành viên hai group khi group kia nhận lời.</p>
                <input type="text" id="sched-target" class="input-field" style="display:block; width:80%; max-width:300px; margin:10px auto; padding:12px; text-align:center;" placeholder="Tên group đối thủ...">
                <label style="display:block; text-align:center; color:#777; font-size:13px; margin-top:8px;">Thời gian thi đấu</label>
                <input type="datetime-local" id="sched-time" class="input-field" style="display:block; width:80%; max-width:300px; margin:6px auto; padding:12px; text-align:center;" value="${local}">
                <label style="display:block; text-align:center; color:#777; font-size:13px; margin-top:8px;">Cửa sổ vào trận (phút)</label>
                <select id="sched-window" class="input-field" style="display:block; width:80%; max-width:300px; margin:6px auto; padding:12px; text-align:center;">
                    <option value="15">15 phút</option><option value="30" selected>30 phút</option><option value="60">60 phút</option>
                </select>
                <button class="btn-primary" id="sched-send" style="display:block; margin:16px auto; padding:15px 30px;">GỬI THÁCH ĐẤU</button>
                <button class="btn-secondary" id="sched-back" style="display:block; margin:0 auto; padding:12px 26px;">QUAY LẠI</button>
            </div>`;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('sched-back').addEventListener('click', () => this.renderGroupsMenu());
        document.getElementById('sched-send').addEventListener('click', async () => {
            const target = document.getElementById('sched-target').value.trim();
            const when = document.getElementById('sched-time').value;
            const windowMin = parseInt(document.getElementById('sched-window').value, 10) || 30;
            if (!target) { alert('Nhập tên group đối thủ.'); return; }
            const at = new Date(when);
            if (!when || isNaN(at.getTime()) || at.getTime() < Date.now() + 5 * 60000) { alert('Chọn thời gian ít nhất 5 phút sau hiện tại.'); return; }
            const btn = document.getElementById('sched-send'); btn.disabled = true;
            const r = await window.GroupBattleSchedule.challengeScheduled(myGroupId, target, at.toISOString(), windowMin);
            if (r.error) { alert(r.error); btn.disabled = false; return; }
            this.showBriefToast('⚔️ Đã gửi thách đấu kèm lịch!');
            this.renderBattleScheduleBoard(myGroupId);
        });
    },

    // The public schedule/pair board for a group's scheduled battles.
    async renderBattleScheduleBoard(groupId) {
        this.ui.container.innerHTML = `<div class="welcome-screen"><div class="duo-character">📅</div><h1 style="text-align:center;">Lịch thi đấu</h1><p style="text-align:center; color:#777;">Đang tải...</p></div>`;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        const battles = await window.GroupBattleSchedule.getScheduleFor(groupId);
        const mine = this.state.profile ? await window.Groups.getMyGroup(this.state.profile.id).catch(() => null) : null;
        const isAdminOfB = b => mine && mine.group && mine.group.id === b.group_b_id && ['owner', 'admin'].includes(mine.membership.role);
        const nameOf = async id => { const g = await window.Groups.getGroupById(id).catch(() => null); return g ? g.name : '?'; };

        let cards = '';
        for (const b of battles) {
            const [nameA, nameB] = await Promise.all([nameOf(b.group_a_id), nameOf(b.group_b_id)]);
            const at = new Date(b.scheduled_at);
            const timeLabel = `${at.toLocaleDateString('vi-VN')} ${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
            const windowEnd = at.getTime() + (b.window_min || 30) * 60000;
            const inWindow = Date.now() >= at.getTime() && Date.now() < windowEnd;
            const expired = Date.now() >= windowEnd;
            let pairsHtml = '', actionHtml = '';
            if (b.status === 'pending') {
                actionHtml = isAdminOfB(b)
                    ? `<button class="btn-primary sched-accept" data-bid="${b.id}" style="padding:10px 20px;">NHẬN LỜI (tự ghép cặp)</button>`
                    : `<p style="color:#999; font-size:13px;">⏳ Chờ group ${this.escapeHtml(nameB)} nhận lời...</p>`;
            } else {
                const pairs = await window.GroupBattleSchedule.getPairs(b.id);
                if (expired) await window.GroupBattleSchedule.finalizeExpired(b, pairs);
                pairsHtml = `<div class="sched-pairs">` + pairs.map(p => {
                    const meA = this.state.profile && p.user_a_id === this.state.profile.id;
                    const meB = this.state.profile && p.user_b_id === this.state.profile.id;
                    const status = p.winner
                        ? (p.winner === 'draw' ? '🤝 Hòa' : `🏆 ${this.escapeHtml(p.winner === 'a' ? p.username_a : p.username_b)}`)
                        : (inWindow ? `${p.joined_a_at ? '🟢' : '⚪'} vs ${p.joined_b_at ? '🟢' : '⚪'}` : '⏳');
                    const joinBtn = (inWindow && !p.winner && (meA || meB) && !(meA ? p.joined_a_at : p.joined_b_at))
                        ? `<button class="btn-primary sched-join" data-pid="${p.id}" data-side="${meA ? 'a' : 'b'}" style="padding:5px 12px; font-size:12px;">VÀO TRẬN</button>` : '';
                    const duelBtn = (inWindow && !p.winner && (meA || meB) && (meA ? p.joined_a_at : p.joined_b_at) && (meA ? p.joined_b_at : p.joined_a_at))
                        ? `<button class="btn-primary sched-duel" data-opponent="${this.escapeHtml(meA ? p.username_b : p.username_a)}" data-bid="${b.id}" data-side="${meA ? 'a' : 'b'}" style="padding:5px 12px; font-size:12px;">⚔️ ĐẤU NGAY</button>` : '';
                    return `<div class="sched-pair-row ${meA || meB ? 'me' : ''}">
                                <span class="sched-pair-names">${this.escapeHtml(p.username_a)} ⚔️ ${this.escapeHtml(p.username_b)}</span>
                                <span class="sched-pair-status">${status}${joinBtn}${duelBtn}</span>
                            </div>`;
                }).join('') + `</div>`;
            }
            cards += `<div class="sched-card">
                        <div class="sched-card-title">${this.clickableGroupName(b.group_a_id, nameA)} ⚔️ ${this.clickableGroupName(b.group_b_id, nameB)}</div>
                        <div class="sched-card-time">🕐 ${timeLabel} · cửa sổ ${b.window_min || 30} phút ${inWindow ? '· <b style="color:#58a700">ĐANG DIỄN RA</b>' : ''}</div>
                        ${pairsHtml}${actionHtml}
                      </div>`;
        }
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">📅</div>
                <h1 style="text-align:center;">Lịch thi đấu Group</h1>
                <p style="text-align:center; color:#777;">Không vào trận trong cửa sổ thi đấu = xử thua cặp đó; cả hai vắng = hòa.</p>
                ${cards || '<p style="text-align:center; color:#777;">Chưa có trận nào được đặt lịch.</p>'}
                <button class="btn-secondary" id="sched-board-back" style="display:block; margin:15px auto; padding:15px 30px;">QUAY LẠI</button>
            </div>`;
        document.getElementById('sched-board-back').addEventListener('click', () => this.renderGroupsMenu());
        this.ui.container.querySelectorAll('.sched-accept').forEach(btn => btn.addEventListener('click', async () => {
            btn.disabled = true;
            const b = battles.find(x => x.id === btn.dataset.bid);
            const r = await window.GroupBattleSchedule.acceptScheduled(b);
            if (r.error) { alert(r.error); btn.disabled = false; return; }
            this.showBriefToast(`✅ Đã nhận lời! Ghép ${r.pairs} cặp đấu.`);
            this.renderBattleScheduleBoard(groupId);
        }));
        this.ui.container.querySelectorAll('.sched-join').forEach(btn => btn.addEventListener('click', async () => {
            btn.disabled = true;
            const all = await window.GroupBattleSchedule.getPairs(battles.find(x => x.status === 'active') ? battles.find(x => x.status === 'active').id : '');
            const p = all.find(x => x.id === btn.dataset.pid) || { id: btn.dataset.pid };
            await window.GroupBattleSchedule.joinPair(p, btn.dataset.side);
            this.showBriefToast('🟢 Đã vào trận - chờ đối thủ...');
            this.renderBattleScheduleBoard(groupId);
        }));
        this.ui.container.querySelectorAll('.sched-duel').forEach(btn => btn.addEventListener('click', async () => {
            btn.disabled = true;
            const r = await this.sendGameDuelChallenge(btn.dataset.opponent, 'lesson', btn.dataset.bid, btn.dataset.side);
            if (r && r.error) { alert(r.error); btn.disabled = false; }
        }));
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
