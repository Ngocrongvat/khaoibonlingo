// app-social.js — DuoClone methods split out of the former monolithic app.js.
// Attaches to DuoClone.prototype (defined in app.js). Load AFTER app.js and BEFORE
// app-main.js (which instantiates the app). Pure mechanical split - no behavior change.
Object.assign(DuoClone.prototype, {
    globalChatMessageHtml(m) {
        const isMine = this.state.profile && m.sender_id === this.state.profile.id;
        return `
            <div class="chat-bubble-row ${isMine ? 'mine' : 'theirs'}">
                <div class="chat-bubble">
                    ${isMine ? '' : `<span class="chat-bubble-sender">${this.clickableUsername(m.sender_id, m.sender_username)}</span>`}
                    ${this.escapeHtml(m.message)}
                </div>
            </div>
        `;
    },

    // ===================== Clickable username -> action menu =====================
    // Wrap ANY displayed username in this everywhere in the app (Leaderboard, Friends,
    // Duel, chat, Inbox, toasts...) to get the "⚔️ Thách đấu / 💬 Gửi tin nhắn / ℹ️ Xem
    // info / 👋 Kết bạn" popup for free via the single delegated listener in init().
    // userId is optional - pass null/'' when the call site only has a username (e.g.
    // Leaderboard/Hall of Fame rows, which don't store a user id) and
    // showUserActionMenu() will resolve it lazily via Friends.searchUserByUsername().
    clickableUsername(userId, username) {
        const safeName = this.escapeHtml(username || '');
        return `<span class="user-clickable" data-user-id="${userId || ''}" data-username="${safeName}">${safeName}</span>`;
    },

    async renderUserInfo(username) {
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">👤</div>
                <h1 style="text-align: center;">${this.escapeHtml(username)}</h1>
                <p style="text-align: center; color: #777;">Đang tải...</p>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');

        const info = window.Friends ? await window.Friends.getUserInfo(username) : null;
        if (!info) {
            this.ui.container.innerHTML = `
                <div class="welcome-screen">
                    <div class="duo-character">🤔</div>
                    <h1 style="text-align: center;">${this.escapeHtml(username)}</h1>
                    <p style="text-align: center; color: #777;">Không tìm thấy thông tin người dùng này.</p>
                    <button class="btn-secondary" id="user-info-back" style="display: block; margin: 20px auto; padding: 15px 30px;">QUAY LẠI</button>
                </div>
            `;
            document.getElementById('user-info-back').addEventListener('click', () => this.renderHomeDashboard());
            return;
        }

        const rank = getRankInfo(info.xp || 0);
        const isWeeklyKing = !!(this.state.weeklyKing && this.state.weeklyKing.username === info.username);
        const infoAvatarHtml = info.avatar_url
            ? `<img src="${info.avatar_url}" alt="" style="width:88px; height:88px; border-radius:50%; display:block; margin:0 auto; object-fit:cover;">`
            : `<div class="duo-character">👤</div>`;
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                ${isWeeklyKing ? `<div class="king-frame king-frame-info">${infoAvatarHtml}</div>` : infoAvatarHtml}
                <h1 style="text-align: center;">${this.escapeHtml(info.username)}</h1>
                ${isWeeklyKing ? `<p class="king-info-title">👑 Vị Vua Của Tuần</p>` : ''}
                <p style="text-align: center; color: #777;">${rank.label}</p>
                <div class="user-info-stats">
                    <div class="user-info-stat"><span class="user-info-stat-value">⭐ ${info.xp || 0}</span><span class="user-info-stat-label">XP</span></div>
                    <div class="user-info-stat"><span class="user-info-stat-value">🔥 ${info.streak || 0}</span><span class="user-info-stat-label">Chuỗi ngày</span></div>
                    <div class="user-info-stat"><span class="user-info-stat-value">🧸 ${info.teddy_bears || 0}</span><span class="user-info-stat-label">Gấu bông</span></div>
                </div>
                <div class="game-picker-list" style="max-width: 280px;">
                    <button class="btn-primary game-pick-btn" id="user-info-duel">⚔️ Thách đấu</button>
                    <button class="btn-primary game-pick-btn" id="user-info-message">💬 Gửi tin nhắn</button>
                </div>
                <button class="btn-secondary" id="user-info-back" style="display: block; margin: 10px auto; padding: 15px 30px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('user-info-back').addEventListener('click', () => this.renderHomeDashboard());
        document.getElementById('user-info-duel').addEventListener('click', () => this.renderGameTypePicker(info.username));
        document.getElementById('user-info-message').addEventListener('click', () => this.renderConversation(info.id, info.username));
    },

    buildDuelQuestions(count, difficulty) {
        const types = DuoClone.DUEL_SAFE_TYPES;
        const qs = [];
        for (let i = 0; i < count; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const ex = window.ExerciseGenerator.generateExercise(type, difficulty, new Set());
            if (ex) qs.push(ex);
        }
        return qs;
    },

    cleanupDuelUI() {
        if (this.state.duelUnsub) {
            this.state.duelUnsub();
            this.state.duelUnsub = null;
        }
        if (this.duelWatchdogInterval) {
            clearInterval(this.duelWatchdogInterval);
            this.duelWatchdogInterval = null;
        }
        const bar = document.getElementById('duel-progress-bar');
        if (bar) bar.remove();
    },

    injectDuelProgressBar(duelRow, isChallenger) {
        const existing = document.getElementById('duel-progress-bar');
        if (existing) existing.remove();
        const bar = document.createElement('div');
        bar.id = 'duel-progress-bar';
        bar.className = 'duel-progress-bar';
        document.body.appendChild(bar);
        this.renderDuelProgressBar(duelRow, isChallenger);
    },

    renderDuelProgressBar(duelRow, isChallenger) {
        const bar = document.getElementById('duel-progress-bar');
        if (!bar) return;
        const total = duelRow.question_count;
        const myIdx = isChallenger ? this.state.duelIdx : this.state.duelIdx;
        const oppName = isChallenger ? duelRow.opponent_username : duelRow.challenger_username;
        const oppIdx = isChallenger ? duelRow.opponent_idx : duelRow.challenger_idx;
        const oppCorrect = isChallenger ? duelRow.opponent_correct : duelRow.challenger_correct;
        bar.innerHTML = `
            <div class="duel-progress-row">
                <span>⚔️ Bạn: ${myIdx}/${total}</span>
                <span>${this.escapeHtml(oppName)}: ${oppIdx}/${total} (${oppCorrect} đúng)</span>
                <button id="duel-forfeit-btn" class="btn-secondary" style="padding:3px 10px; font-size:11.5px;">Bỏ cuộc</button>
            </div>
        `;
        // innerHTML above wipes any previously-bound listener, so this must be re-wired
        // on every call (fine - updates are infrequent, one per answered question).
        const forfeitBtn = document.getElementById('duel-forfeit-btn');
        if (forfeitBtn) forfeitBtn.addEventListener('click', () => this.forfeitDuel());
    },

    // Bug fix: like the earlier IELTS "no way out mid-test" issue, there was previously no
    // way to leave an active duel short of finishing every question or fully signing out
    // via the nav X button. Forfeiting counts as a loss (opponent wins outright, you pay
    // the XP wager) rather than a free bail-out, since escaping a losing duel for free
    // would defeat the point of the wager.
    async forfeitDuel() {
        if (!confirm('Bỏ cuộc sẽ tính là thua trận này (-20 XP) và đối thủ thắng. Bạn có chắc chắn?')) return;
        const duelRow = await window.Duel.getDuel(this.state.duelId);
        if (!duelRow) { this.state.mode = 'curriculum'; this.returnToApp(); return; }
        const oppId = this.state.isDuelChallenger ? duelRow.opponent_id : duelRow.challenger_id;
        await window.Duel.finalizeDuel(this.state.duelId, oppId);
        const finalRow = await window.Duel.getDuel(this.state.duelId);
        this.finishDuelIfNeeded(finalRow || duelRow);
    },

    async renderDuelMenu() {
        if (!this.state.currentUser) {
            alert("Vui lòng đăng nhập trước khi thi đấu 1v1!");
            return;
        }
        if (!window.Duel) return;
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">⚔️</div>
                <h1 style="text-align: center;">Đấu 1v1</h1>
                <p style="text-align: center; color: #777;">Đang kiểm tra lời mời...</p>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');

        const invites = await window.Duel.getPendingInvitesFor(this.state.profile.id);
        const invitesHtml = invites.length ? invites.map(inv => `
            <div class="leaderboard-row" data-duel-id="${inv.id}" style="cursor:pointer;">
                <span class="lb-rank">⚔️</span>
                <span class="lb-name">${this.clickableUsername(inv.challenger_id, inv.challenger_username)}</span>
                <span class="lb-xp">đã thách đấu bạn</span>
            </div>
        `).join('') : `<p style="text-align:center; color:#777;">Chưa có lời mời nào.</p>`;

        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">⚔️</div>
                <h1 style="text-align: center;">Đấu 1v1</h1>
                <h2 style="text-align:center;">Lời mời đang chờ</h2>
                <div style="max-width:500px; margin:0 auto;">${invitesHtml}</div>
                <button class="btn-primary" id="duel-challenge-btn" style="display: block; margin: 20px auto; padding: 15px 30px;">THÁCH ĐẤU NGƯỜI KHÁC</button>
                <button class="btn-secondary" id="duel-leaderboard-btn" style="display: block; margin: 10px auto; padding: 15px 30px;">🏆 BẢNG XẾP HẠNG THÁNH CHIẾN</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('duel-challenge-btn').addEventListener('click', () => this.renderDuelChallengeForm());
        document.getElementById('duel-leaderboard-btn').addEventListener('click', () => this.renderDuelLeaderboard());
        this.ui.container.querySelectorAll('[data-duel-id]').forEach(el => {
            const invite = invites.find(i => i.id === el.dataset.duelId);
            el.addEventListener('click', () => this.renderDuelInvitePrompt(invite));
        });
    },

    async renderDuelLeaderboard() {
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">🏆</div>
                <h1 style="text-align: center;">Bảng Xếp Hạng Thánh Chiến</h1>
                <p style="text-align: center; color: #777;">Đang tải...</p>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');

        const entries = await window.Duel.getDuelLeaderboard(20);
        const myUsername = this.state.profile ? this.state.profile.username : null;
        const rowsHtml = entries.length ? entries.map((e, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
            const isMe = e.username === myUsername;
            return `
                <div class="leaderboard-row" style="${isMe ? 'background: var(--accent-soft, #fff8e8); font-weight:800;' : ''}">
                    <span class="lb-rank">${medal}</span>
                    <span class="lb-name">${isMe ? this.escapeHtml(e.username) : this.clickableUsername(null, e.username)}</span>
                    <span class="lb-xp">${e.wins} thắng</span>
                </div>
            `;
        }).join('') : `<p style="text-align:center; color:#777;">Chưa có trận thắng nào được ghi nhận.</p>`;

        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">🏆</div>
                <h1 style="text-align: center;">Bảng Xếp Hạng Thánh Chiến</h1>
                <p style="text-align: center; color: #777;">Vinh danh những chiến binh thắng nhiều trận thách đấu nhất.</p>
                <div style="max-width:500px; margin:0 auto;">${rowsHtml}</div>
                <button class="btn-secondary" id="duel-leaderboard-back" style="display: block; margin: 20px auto; padding: 15px 30px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('duel-leaderboard-back').addEventListener('click', () => this.renderHomeDashboard());
    },

    // gameType defaults to 'lesson' (the original behavior, reached from the Duel menu's
    // "THÁCH ĐẤU NGƯỜI KHÁC" button) - the game picker's per-game "⚔️" buttons reuse this
    // same form with the corresponding mini-game type instead.
    renderDuelChallengeForm(gameType = 'lesson') {
        const label = DuoClone.GAME_TYPE_LABELS[gameType] || '';
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">⚔️</div>
                <h1 style="text-align: center;">Thách đấu${label ? ' — ' + label : ''}</h1>
                <p style="text-align: center; color: #777;">Nhập tên người dùng bạn muốn thách đấu.</p>
                <p style="text-align: center; color: #999; font-size: 13px;">⚠️ Cược 20 XP: thắng được +20 XP từ đối thủ, thua bị trừ 20 XP. Hòa không đổi gì.</p>
                <input type="text" id="duel-target-input" class="input-field" style="display:block; width:80%; max-width:300px; margin:15px auto; padding:15px; text-align:center;" placeholder="Tên người dùng...">
                <p id="duel-challenge-error" style="text-align:center; color: var(--duo-red); min-height:18px;"></p>
                <button class="btn-primary" id="duel-send-challenge" style="display: block; margin: 10px auto; padding: 15px 30px;">GỬI LỜI THÁCH ĐẤU</button>
                <button class="btn-secondary" id="duel-back" style="display: block; margin: 10px auto; padding: 15px 30px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('duel-back').addEventListener('click', () => this.renderHomeDashboard());
        this.attachUserSuggestions(document.getElementById('duel-target-input'));
        document.getElementById('duel-send-challenge').addEventListener('click', async () => {
            const target = document.getElementById('duel-target-input').value.trim();
            const errorEl = document.getElementById('duel-challenge-error');
            if (!target) { errorEl.innerText = 'Vui lòng nhập tên người dùng.'; return; }
            const result = await this.sendGameDuelChallenge(target, gameType);
            if (result && result.error) errorEl.innerText = result.error;
        });
    },

    // Builds the pre-generated round set for a mini-game duel (challenger-side only -
    // the opponent later plays from the exact same data read back off the duels row).
    // `rounds` is always a flat array here (even for Memory, whose cards ARE the array -
    // `level`/`config` are reconstructed separately in renderGameDuelRound() via the
    // dedicated game_level column). `total` is the score-scale denominator matching
    // *_correct/onProgress - for every game except Memory this equals rounds.length, but
    // Memory's cards array is 2x its actual pair count (one card each for the en/vi
    // side of every pair), so it's returned separately rather than derived from
    // rounds.length.
    // Memory always starts new duels at level 1 regardless of either player's own solo
    // progress, so a duel's difficulty is predictable and fair for both sides.
    buildGameDuelRounds(gameType) {
        if (gameType === 'word_match') {
            const rounds = window.Games.generateWordMatchRounds();
            return { rounds, level: null, total: rounds.length };
        }
        if (gameType === 'memory') {
            const level = 1;
            const generated = window.Games.generateMemoryRounds(level);
            return { rounds: generated.cards, level, total: generated.config.pairs };
        }
        if (gameType === 'odd_one_out') {
            const rounds = window.Games.generateOddOneOutRounds();
            return { rounds, level: null, total: rounds.length };
        }
        if (gameType === 'reflex') {
            const rounds = window.Games.generateReflexRounds();
            return { rounds, level: null, total: rounds.length };
        }
        if (gameType === 'picture_word') {
            const rounds = window.Games.generatePictureWordRounds();
            return { rounds, level: null, total: rounds.length };
        }
        return null;
    },

    // Single entry point for sending ANY duel challenge (lesson or mini-game), used by
    // both the manual-username form (renderDuelChallengeForm) and the friend-list
    // "⚔️ Thách đấu" button (renderGameTypePicker) - keeps question/round generation and
    // the challengeUser() call in one place instead of duplicated per entry point.
    // groupBattleId/groupSide are optional - only passed when this challenge is one leg
    // of a group-vs-group battle (renderGroupBattleScreen()'s per-member "Đấu" buttons),
    // tagging the resulting duel row so recomputeBattleScore() can find it later. Every
    // other call site (friend list, manual username form) omits them, keeping the
    // existing individual-duel behavior byte-for-byte unchanged.
    async sendGameDuelChallenge(targetUsername, gameType = 'lesson', groupBattleId = null, groupSide = null) {
        if (this.state.mode === 'duel') return { error: 'Bạn đang trong một trận đấu khác.' };
        let questions, gameLevel = null, questionCount = null;
        if (gameType === 'lesson') {
            const baseDifficulty = this.errorTracker ? this.errorTracker.recommendDifficulty() : 2;
            const difficulty = Math.max(baseDifficulty, getRankInfo(this.state.xp).difficulty);
            questions = this.buildDuelQuestions(8, difficulty);
        } else {
            const built = this.buildGameDuelRounds(gameType);
            if (!built) return { error: 'Loại trò chơi không hợp lệ.' };
            questions = built.rounds;
            gameLevel = built.level;
            questionCount = built.total;
        }
        const result = await window.Duel.challengeUser(this.state.profile, targetUsername, questions, gameType, gameLevel, questionCount, groupBattleId, groupSide);
        if (result.error) return result;
        this.renderDuelWaitingRoom(result.data);
        return result;
    },

    renderDuelWaitingRoom(duelRow) {
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">⏳</div>
                <h1 style="text-align: center;">Đang chờ ${this.clickableUsername(duelRow.opponent_id, duelRow.opponent_username)} chấp nhận...</h1>
                <p id="duel-wait-hint" style="text-align: center; color: #777;"></p>
                <button class="btn-secondary" id="duel-cancel" style="display: block; margin: 20px auto; padding: 15px 30px;">HỦY THÁCH ĐẤU</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('duel-cancel').addEventListener('click', async () => {
            await window.Duel.cancelDuel(duelRow.id);
            this.cleanupDuelUI();
            this.renderDuelMenu();
        });

        const createdAt = new Date(duelRow.created_at).getTime();
        const hintInterval = setInterval(() => {
            const hintEl = document.getElementById('duel-wait-hint');
            if (!hintEl) { clearInterval(hintInterval); return; }
            const elapsedMin = Math.floor((Date.now() - createdAt) / 60000);
            hintEl.innerText = elapsedMin >= 3 ? 'Đối thủ chưa phản hồi. Bạn có thể hủy và thử lại sau.' : '';
        }, 5000);

        this.state.duelUnsub = window.Duel.subscribeToDuel(duelRow.id, async (updated) => {
            if (updated.status === 'active') {
                clearInterval(hintInterval);
                this.cleanupDuelUI();
                // Defensive re-fetch: `updated` comes straight off the realtime
                // websocket payload, which can arrive with `questions` (jsonb) missing
                // if Postgres TOASTed that column and this UPDATE didn't touch it - see
                // duels_replica_identity_full.sql for the real fix (REPLICA IDENTITY
                // FULL). A plain REST GET always returns the complete row regardless,
                // so fall back to it if the realtime payload looks incomplete.
                const fullRow = updated.questions ? updated : await window.Duel.getDuel(duelRow.id);
                this.startDuelBattle(fullRow || updated, true);
            } else if (updated.status === 'declined' || updated.status === 'cancelled') {
                clearInterval(hintInterval);
                this.cleanupDuelUI();
                alert('Lời thách đấu đã bị từ chối hoặc hủy.');
                this.renderDuelMenu();
            }
        });
    },

    renderDuelInvitePrompt(invite) {
        const gameType = invite.game_type || 'lesson';
        const label = DuoClone.GAME_TYPE_LABELS[gameType] || '';
        const subtitle = gameType === 'lesson'
            ? `Bộ đề gồm ${invite.question_count} câu hỏi. Sẵn sàng chưa?`
            : `Thử thách: ${label}. Sẵn sàng chưa?`;
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">⚔️</div>
                <h1 style="text-align: center;">${this.clickableUsername(invite.challenger_id, invite.challenger_username)} đã thách đấu bạn!</h1>
                <p style="text-align: center; color: #777;">${subtitle}</p>
                <p style="text-align: center; color: #999; font-size: 13px;">⚠️ Cược 20 XP: thắng được +20 XP từ đối thủ, thua bị trừ 20 XP. Hòa không đổi gì.</p>
                <button class="btn-primary" id="duel-accept" style="display: block; margin: 15px auto; padding: 15px 30px;">CHẤP NHẬN</button>
                <button class="btn-secondary" id="duel-decline" style="display: block; margin: 10px auto; padding: 15px 30px;">TỪ CHỐI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('duel-accept').addEventListener('click', async () => {
            const result = await window.Duel.acceptDuel(invite.id);
            if (result.error) { alert('Không thể chấp nhận lúc này.'); return; }
            this.startDuelBattle(result.data, false);
        });
        document.getElementById('duel-decline').addEventListener('click', async () => {
            await window.Duel.declineDuel(invite.id);
            this.renderDuelMenu();
        });
    },

    startDuelBattle(duelRow, isChallenger) {
        this.state.mode = 'duel';
        this.state.duelId = duelRow.id;
        this.state.isDuelChallenger = isChallenger;
        this.state.duelQueue = duelRow.questions;
        this.state.duelTotal = duelRow.question_count;
        this.state.duelGameType = duelRow.game_type || 'lesson';
        this.state.duelGameLevel = duelRow.game_level;
        this.state.duelIdx = isChallenger ? duelRow.challenger_idx : duelRow.opponent_idx;
        this.state.duelCorrect = isChallenger ? duelRow.challenger_correct : duelRow.opponent_correct;
        this.state.duelLastOpponentUpdate = Date.now();
        this.state.duelResultShown = false;
        this.resetSessionAnswers();

        this.injectDuelProgressBar(duelRow, isChallenger);

        this.state.duelUnsub = window.Duel.subscribeToDuel(duelRow.id, (updated) => {
            this.state.duelLastOpponentUpdate = Date.now();
            this.renderDuelProgressBar(updated, isChallenger);
            const oppFinished = isChallenger ? updated.opponent_finished : updated.challenger_finished;
            const myFinished = isChallenger ? updated.challenger_finished : updated.opponent_finished;
            // Bug fix: forfeitDuel() only flips `status` to 'finished' - it never touches
            // challenger_finished/opponent_finished, so the other side's client (still
            // mid-duel, its own *_finished still false) would never satisfy
            // myFinished && oppFinished and would stay stuck answering a duel that's
            // already over server-side. Checking status directly catches that case too.
            if ((myFinished && oppFinished) || updated.status === 'finished') {
                this.finishDuelIfNeeded(updated);
            }
        });

        this.duelWatchdogInterval = setInterval(() => {
            if (this.state.mode !== 'duel') { clearInterval(this.duelWatchdogInterval); return; }
            const silentMs = Date.now() - this.state.duelLastOpponentUpdate;
            const bar = document.getElementById('duel-progress-bar');
            if (bar && silentMs > 90000 && !document.getElementById('duel-forfeit-claim')) {
                const btn = document.createElement('button');
                btn.id = 'duel-forfeit-claim';
                btn.className = 'btn-secondary';
                btn.style.cssText = 'display:block; margin:6px auto 0; padding:8px 16px; font-size:13px;';
                btn.innerText = 'Đối thủ có vẻ đã rời trận - Xác nhận thắng';
                btn.addEventListener('click', async () => {
                    await window.Duel.finalizeDuel(this.state.duelId, this.state.profile.id);
                    const finalRow = await window.Duel.getDuel(this.state.duelId);
                    this.renderDuelResult(finalRow);
                });
                bar.appendChild(btn);
            }
        }, 15000);

        if (this.state.duelGameType === 'lesson') {
            this.renderLesson();
        } else {
            this.renderGameDuelRound();
        }
    },

    // Launches the mini-game corresponding to this duel's game_type, wiring its
    // onProgress/onRoundEnd callbacks into the same Duel.updateMyProgress()/
    // finishDuelIfNeeded() pipeline the lesson-duel path already uses via
    // nextDuelExercise() - the round-robin progress bar, forfeit watchdog, and result
    // screen are all shared code, unaware of which game_type produced the score.
    renderGameDuelRound() {
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        if (this.ui.skipBtn) this.ui.skipBtn.style.display = 'none';

        const duelData = this.state.duelQueue;
        const callbacks = {
            onProgress: (idx, correct) => {
                this.state.duelIdx = idx;
                this.state.duelCorrect = correct;
                window.Duel.updateMyProgress(this.state.duelId, this.state.isDuelChallenger, { idx, correct, finished: false });
            },
            onRoundEnd: (correct, total) => {
                this.state.duelIdx = total;
                this.state.duelCorrect = correct;
                window.Duel.updateMyProgress(this.state.duelId, this.state.isDuelChallenger, { idx: total, correct, finished: true });
                this.renderDuelWaitingForOpponent();
            },
            // Backing out mid-round abandons the match same as the lesson-duel forfeit
            // button - there is no "just leave" option once a duel round has started.
            onExit: () => this.forfeitDuel()
        };

        const gameType = this.state.duelGameType;
        if (gameType === 'word_match') {
            window.Games.renderWordMatchGame(this.ui.container, callbacks, duelData);
        } else if (gameType === 'memory') {
            const uid = this.state.profile ? this.state.profile.id : 'guest';
            const level = this.state.duelGameLevel || 1;
            const memoryDuelData = { level, config: window.Games.getMemoryLevelConfig(level), cards: duelData };
            window.Games.renderMemoryGame(this.ui.container, callbacks, uid, memoryDuelData);
        } else if (gameType === 'odd_one_out') {
            window.Games.renderOddOneOutGame(this.ui.container, callbacks, duelData);
        } else if (gameType === 'reflex') {
            window.Games.renderReflexGame(this.ui.container, callbacks, duelData);
        } else if (gameType === 'picture_word') {
            window.Games.renderPictureWordGame(this.ui.container, callbacks, duelData);
        }
    },

    nextDuelExercise() {
        this.state.duelIdx++;
        const finished = this.state.duelIdx >= this.state.duelQueue.length;
        window.Duel.updateMyProgress(this.state.duelId, this.state.isDuelChallenger, {
            idx: this.state.duelIdx,
            correct: this.state.duelCorrect,
            finished
        });
        if (!finished) {
            this.renderLesson();
            return;
        }
        this.renderDuelWaitingForOpponent();
    },

    async renderDuelWaitingForOpponent() {
        const duelRow = await window.Duel.getDuel(this.state.duelId);
        const oppFinished = this.state.isDuelChallenger ? duelRow.opponent_finished : duelRow.challenger_finished;
        if (oppFinished || duelRow.status === 'finished') {
            this.finishDuelIfNeeded(duelRow);
            return;
        }
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">⏳</div>
                <h1 style="text-align: center;">Bạn đã xong! Đang chờ đối thủ...</h1>
                <p style="text-align: center; color: #777;">Bạn trả lời đúng ${this.state.duelCorrect}/${this.state.duelTotal} câu.</p>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
    },

    async finishDuelIfNeeded(duelRow) {
        // Guard against double-invocation: this can be reached both from the realtime
        // subscription callback AND from the renderDuelWaitingForOpponent() fallback path
        // firing in quick succession for the same completion, which would otherwise
        // double-count XP/stats/badges in renderDuelResult().
        if (this.state.duelResultShown) return;
        this.state.duelResultShown = true;

        let finalRow = duelRow;
        if (duelRow.status !== 'finished') {
            const winnerId = window.Duel.resolveDuelWinner(duelRow);
            await window.Duel.finalizeDuel(duelRow.id, winnerId);
            finalRow = await window.Duel.getDuel(duelRow.id) || duelRow;
        }
        // If this 1v1 was one leg of a group battle, opportunistically recompute that
        // battle's aggregate score now - whichever client happens to reach this point
        // first after the duel resolves keeps the group_battles row current, no cron
        // needed (same "whoever's here does the update" pattern as chat auto-cleanup).
        if (finalRow.group_battle_id && window.Groups) {
            window.Groups.recomputeBattleScore(finalRow.group_battle_id).catch(() => {});
        }
        this.renderDuelResult(finalRow);
    },

    renderDuelResult(duelRow) {
        this.cleanupDuelUI();
        const myId = this.state.profile.id;
        const iWon = duelRow.winner_id === myId;
        const isDraw = !duelRow.winner_id;
        const myCorrect = this.state.isDuelChallenger ? duelRow.challenger_correct : duelRow.opponent_correct;
        const oppCorrect = this.state.isDuelChallenger ? duelRow.opponent_correct : duelRow.challenger_correct;
        const oppName = this.state.isDuelChallenger ? duelRow.opponent_username : duelRow.challenger_username;
        const oppId = this.state.isDuelChallenger ? duelRow.opponent_id : duelRow.challenger_id;

        // Zero-sum wager: the winner takes XP straight from the loser rather than both
        // sides just getting a flat participation bonus - each client only ever touches
        // its OWN xp, so both sides applying their own half of the same transfer
        // (winner: +WAGER, loser: -WAGER) achieves the transfer without a server-side
        // transaction. Draws are left untouched - no one risked anything to lose.
        const DUEL_XP_WAGER = 20;
        const rankBefore = getRankInfo(this.state.xp).rankIndex;
        this.state.stats.duelsPlayed = (this.state.stats.duelsPlayed || 0) + 1;
        if (iWon) {
            this.state.stats.duelWins = (this.state.stats.duelWins || 0) + 1;
            this.state.xp += DUEL_XP_WAGER;
        } else if (!isDraw) {
            this.state.xp = Math.max(0, this.state.xp - DUEL_XP_WAGER);
        }
        // Gap fix: duel XP changes never used to reach the leaderboard at all (only
        // awardLessonCompletion() called syncLeaderboardScore()) - now that ranking is
        // unified around cumulative xp, a duel win/loss should move your leaderboard
        // position too.
        this.state.weeklyXp = this.state.xp;
        this.ui.xp.innerText = this.state.xp;
        this.checkRankDemotion(rankBefore);
        this.syncLeaderboardScore();

        const resultLabel = isDraw ? 'HÒA!' : (iWon ? 'BẠN THẮNG!' : 'BẠN THUA');
        const resultColor = isDraw ? 'var(--duo-text)' : (iWon ? 'var(--duo-green)' : 'var(--duo-red)');
        const xpChangeLabel = isDraw ? '' : (iWon ? `+${DUEL_XP_WAGER} XP` : `-${DUEL_XP_WAGER} XP`);
        const xpChangeColor = iWon ? 'var(--duo-green)' : 'var(--duo-red)';

        // Winner gets "Thách đấu lại", loser gets "Phục thù" - same action underneath
        // (send a fresh challenge of the same game type to the same opponent), the label
        // just matches which side of the result the user is standing on.
        const rematchLabel = isDraw ? '⚔️ ĐẤU LẠI' : (iWon ? '⚔️ THÁCH ĐẤU LẠI' : '🔥 PHỤC THÙ');
        const gameType = duelRow.game_type || 'lesson';

        this.ui.container.innerHTML = `
            <div class="certificate">
                <div class="certificate-badge">${isDraw ? '🤝' : (iWon ? '🏆' : '⚔️')}</div>
                <h2 style="color:${resultColor};">${resultLabel}</h2>
                <p class="certificate-score">Bạn: ${myCorrect} đúng &nbsp;|&nbsp; ${this.clickableUsername(oppId, oppName)}: ${oppCorrect} đúng</p>
                ${xpChangeLabel ? `<p style="font-weight:800; color:${xpChangeColor};">${xpChangeLabel}</p>` : ''}
            </div>
            ${gameType === 'lesson' ? this.sessionSummaryHtml() : ''}
            <button class="btn-primary" id="duel-rematch-btn" style="display: block; margin: 20px auto 10px; padding: 15px 30px;">${rematchLabel}</button>
            <p id="duel-rematch-error" style="text-align:center; color: var(--duo-red); min-height:18px; margin:0;"></p>
            <button class="btn-secondary" id="duel-result-done" style="display: block; margin: 10px auto; padding: 15px 30px;">VỀ TRANG CHÍNH</button>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('duel-result-done').addEventListener('click', () => {
            this.state.mode = 'curriculum';
            this.renderHomeDashboard();
        });
        document.getElementById('duel-rematch-btn').addEventListener('click', async () => {
            const btn = document.getElementById('duel-rematch-btn');
            const errorEl = document.getElementById('duel-rematch-error');
            // The finished duel is over - leave duel mode BEFORE re-challenging, since
            // sendGameDuelChallenge() refuses to start a challenge mid-duel.
            this.state.mode = 'curriculum';
            btn.disabled = true;
            const result = await this.sendGameDuelChallenge(oppName, gameType);
            if (result && result.error) {
                btn.disabled = false;
                if (errorEl) errorEl.innerText = result.error;
            }
        });
        this.playTone(iWon ? 'cheer' : (isDraw ? 'correct' : 'cry'));
        this.addVibrancy(8);
        this.checkBadges();
        this.saveUserProgress();
    },

    // ===================== Online members board =====================

    async renderOnlineMembers() {
        if (!this.state.currentUser) {
            alert("Vui lòng đăng nhập trước khi xem thành viên đang online!");
            return;
        }
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">🟢</div>
                <h1 style="text-align: center;">Đang Online</h1>
                <p style="text-align: center; color: #777;">Đang tải...</p>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        if (!window.Friends) return;

        const members = await window.Friends.getOnlineMembers(5, 100);
        const rowsHtml = members.length ? members.map(m => {
            const isMe = m.username === this.state.currentUser;
            return `
                <div class="friend-row">
                    <span class="friend-row-name">🟢 ${isMe ? this.escapeHtml(m.username) + ' (bạn)' : this.clickableUsername(m.id, m.username)}</span>
                    <span class="friend-row-actions" style="color:#999; font-size:12px;">⭐ ${m.xp || 0} XP · 🔥 ${m.streak || 0}</span>
                </div>
            `;
        }).join('') : `<p style="text-align:center; color:#777;">Không có ai đang online lúc này.</p>`;

        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">🟢</div>
                <h1 style="text-align: center;">Đang Online (${members.length})</h1>
                <p style="text-align: center; color: #777;">Thành viên hoạt động trong 5 phút gần đây.</p>
                <div class="friends-list">${rowsHtml}</div>
                <button class="btn-secondary" id="online-members-back" style="display: block; margin: 20px auto; padding: 15px 30px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('online-members-back').addEventListener('click', () => this.renderHomeDashboard());
    },

    // ===================== Friends (requests, list, heart gifting) =====================

    async renderFriendsMenu() {
        if (!this.state.currentUser) {
            alert("Vui lòng đăng nhập trước khi xem bạn bè!");
            return;
        }
        if (!window.Friends) return;
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">👥</div>
                <h1 style="text-align: center;">Bạn Bè</h1>
                <p style="text-align: center; color: #777;">Đang tải...</p>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');

        const [pendingRequests, friendsList] = await Promise.all([
            window.Friends.getPendingRequestsFor(this.state.profile.id),
            window.Friends.getFriendsList(this.state.profile.id)
        ]);
        // Drives the friend-count achievement badges (friend_5/friend_20) - checked
        // right after the list loads rather than fetched separately for checkBadges().
        this.state.friendCount = friendsList.length;
        this.checkBadges();

        const requestsHtml = pendingRequests.map(req => `
            <div class="friend-row">
                <span class="friend-row-name">👋 ${this.clickableUsername(req.requester_id, req.requester_username)}</span>
                <span class="friend-row-actions">
                    <button class="btn-primary friend-accept-btn" data-request-id="${req.id}" style="padding:5px 12px; font-size:12px;">Chấp nhận</button>
                    <button class="btn-secondary friend-decline-btn" data-request-id="${req.id}" style="padding:5px 12px; font-size:12px;">Từ chối</button>
                </span>
            </div>
        `).join('');

        const friendsHtml = friendsList.length ? friendsList.map(f => {
            const canGift = window.Friends.canGiftHeartToday({ last_heart_gift_at: f.lastHeartGiftAt });
            return `
                <div class="friend-row" data-friendship-id="${f.friendshipId}" data-friend-id="${f.friendId}" data-friend-username="${this.escapeHtml(f.friendUsername)}">
                    <span class="friend-row-name">🧑 ${this.clickableUsername(f.friendId, f.friendUsername)}</span>
                    <span class="friend-row-actions">
                        <button class="btn-primary friend-duel-btn" style="padding:5px 12px; font-size:12px;">⚔️ Thách đấu</button>
                        <button class="btn-secondary friend-gift-btn" style="padding:5px 12px; font-size:12px;" ${canGift ? '' : 'disabled'}>${canGift ? '❤️ Tặng tim' : '❤️ Đã tặng hôm nay'}</button>
                    </span>
                </div>
            `;
        }).join('') : `<p style="text-align:center; color:#777;">Bạn chưa có người bạn nào. Hãy kết bạn nhé!</p>`;

        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">👥</div>
                <h1 style="text-align: center;">Bạn Bè</h1>
                ${pendingRequests.length ? `<h2 style="text-align:center;">Lời mời kết bạn</h2><div style="max-width:500px; margin:0 auto 20px;">${requestsHtml}</div>` : ''}
                <h2 style="text-align:center;">Danh sách bạn bè (${friendsList.length})</h2>
                <div style="max-width:500px; margin:0 auto;">${friendsHtml}</div>
                <button class="btn-primary" id="friends-add-btn" style="display: block; margin: 20px auto; padding: 15px 30px;">+ KẾT BẠN</button>
                <button class="btn-secondary" id="friends-close" style="display: block; margin: 10px auto; padding: 15px 30px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');

        document.getElementById('friends-add-btn').addEventListener('click', () => this.renderAddFriendForm());
        document.getElementById('friends-close').addEventListener('click', () => this.renderHomeDashboard());

        this.ui.container.querySelectorAll('.friend-accept-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await window.Friends.acceptFriendRequest(btn.dataset.requestId);
                this.renderFriendsMenu();
            });
        });
        this.ui.container.querySelectorAll('.friend-decline-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await window.Friends.declineFriendRequest(btn.dataset.requestId);
                this.renderFriendsMenu();
            });
        });
        this.ui.container.querySelectorAll('.friend-duel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.state.mode === 'duel') { alert('Bạn đang trong một trận đấu khác.'); return; }
                const row = btn.closest('[data-friend-username]');
                this.renderGameTypePicker(row.dataset.friendUsername);
            });
        });
        this.ui.container.querySelectorAll('.friend-gift-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (btn.disabled) return;
                const row = btn.closest('[data-friendship-id]');
                btn.disabled = true;
                const result = await window.Friends.giftHeart(row.dataset.friendshipId, this.state.profile, row.dataset.friendId);
                if (result.error) { alert(result.error); btn.disabled = false; return; }
                btn.textContent = '❤️ Đã tặng hôm nay';
                alert(`🎁 Đã tặng 1 tim cho ${row.dataset.friendUsername}!`);
            });
        });
    },

    renderAddFriendForm() {
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">👥</div>
                <h1 style="text-align: center;">Kết bạn</h1>
                <p style="text-align: center; color: #777;">Nhập tên người dùng bạn muốn kết bạn.</p>
                <input type="text" id="friend-target-input" class="input-field" style="display:block; width:80%; max-width:300px; margin:15px auto; padding:15px; text-align:center;" placeholder="Tên người dùng...">
                <p id="friend-add-error" style="text-align:center; color: var(--duo-red); min-height:18px;"></p>
                <button class="btn-primary" id="friend-send-request" style="display: block; margin: 10px auto; padding: 15px 30px;">GỬI LỜI MỜI KẾT BẠN</button>
                <button class="btn-secondary" id="friend-add-back" style="display: block; margin: 10px auto; padding: 15px 30px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('friend-add-back').addEventListener('click', () => this.renderHomeDashboard());
        this.attachUserSuggestions(document.getElementById('friend-target-input'));
        document.getElementById('friend-send-request').addEventListener('click', async () => {
            const target = document.getElementById('friend-target-input').value.trim();
            const errorEl = document.getElementById('friend-add-error');
            if (!target) { errorEl.innerText = 'Vui lòng nhập tên người dùng.'; return; }
            const result = await window.Friends.sendFriendRequest(this.state.profile, target);
            if (result.error) { errorEl.innerText = result.error; return; }
            this.renderFriendsMenu();
        });
    },

    // ===================== Groups =====================

    // Entry point from the nav icon. Two very different screens depending on whether
    // the user is already in a group (own group summary + "Vào group") or not yet
    // (browse/search public groups + "+ Tạo group"), mirroring how renderFriendsMenu()
    // itself doesn't branch this way (friends are many, a group is at most one at a
    // time per the plan's "mỗi user ở 1 group tại một thời điểm" scope).
    async renderGroupsMenu(searchQuery = '') {
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">🏰</div>
                <h1 style="text-align: center;">Group</h1>
                <p style="text-align: center; color: #777;">Đang tải...</p>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');

        if (!window.Groups || !this.state.profile) return;
        const mine = await window.Groups.getMyGroup(this.state.profile.id);

        if (mine) {
            const levelInfo = getGroupLevelInfo(mine.group.vibrancy_score);
            this.ui.container.innerHTML = `
                <div class="welcome-screen">
                    ${mine.group.avatar_url
                        ? `<img src="${mine.group.avatar_url}" alt="" style="width:88px; height:88px; border-radius:20px; display:block; margin:0 auto; object-fit:cover;">`
                        : `<div class="duo-character">🏰</div>`}
                    <h1 style="text-align: center;">${this.escapeHtml(mine.group.name)}</h1>
                    <p style="text-align: center; color: #777;">${levelInfo.label} · ⭐ ${mine.group.vibrancy_score} điểm sôi nổi</p>
                    <button class="btn-primary" id="group-enter-btn" style="display: block; margin: 20px auto; padding: 15px 30px;">VÀO GROUP</button>
                    <button class="btn-secondary" id="group-leaderboards-btn" style="display: block; margin: 10px auto; padding: 12px 30px;">🏆 BẢNG XẾP HẠNG GROUP</button>
                    <button class="btn-secondary" id="groups-close" style="display: block; margin: 10px auto; padding: 15px 30px;">QUAY LẠI</button>
                </div>
            `;
            document.getElementById('group-enter-btn').addEventListener('click', () => this.renderGroupDetail(mine.group.id));
            document.getElementById('group-leaderboards-btn').addEventListener('click', () => this.renderGroupLeaderboards());
            document.getElementById('groups-close').addEventListener('click', () => this.renderHomeDashboard());
            this.ui.checkBtn.disabled = true;
            this.ui.checkBtn.classList.remove('active');
            return;
        }

        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">🏰</div>
                <h1 style="text-align: center;">Group</h1>
                <p style="text-align: center; color: #777;">Bạn chưa ở trong group nào. Tham gia hoặc tạo group mới!</p>
                <input type="text" id="group-search-input" class="input-field" style="display:block; width:80%; max-width:300px; margin:10px auto; padding:12px; text-align:center;" placeholder="Tìm group theo tên (gõ gần đúng)..." value="${this.escapeHtml(searchQuery)}">
                <button class="btn-primary" id="group-create-btn" style="display: block; margin: 10px auto; padding: 15px 30px;">+ TẠO GROUP</button>
                <button class="btn-secondary" id="group-leaderboards-btn" style="display: block; margin: 10px auto; padding: 12px 30px;">🏆 BẢNG XẾP HẠNG GROUP</button>
                <h3 id="group-list-heading" style="text-align:center; margin:15px 0 5px;">🔥 Group sôi nổi nhất</h3>
                <div class="friends-list" id="group-browse-list" style="margin-top:5px;"><p style="text-align:center; color:#777;">Đang tải...</p></div>
                <button class="btn-secondary" id="groups-close" style="display: block; margin: 15px auto; padding: 15px 30px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');

        document.getElementById('group-create-btn').addEventListener('click', () => this.renderCreateGroupForm());
        document.getElementById('group-leaderboards-btn').addEventListener('click', () => this.renderGroupLeaderboards());
        document.getElementById('groups-close').addEventListener('click', () => this.renderHomeDashboard());

        // Refreshes ONLY the list (not the whole screen) so live search-as-you-type
        // never steals focus from the input mid-word.
        const refreshList = async (query) => {
            const listEl = document.getElementById('group-browse-list');
            const headingEl = document.getElementById('group-list-heading');
            if (!listEl) return;
            const groups = await window.Groups.searchGroups(query, 30);
            const counts = await window.Groups.getMemberCounts(groups.map(g => g.id));
            if (headingEl) headingEl.textContent = query ? `🔎 Kết quả cho "${query}"` : '🔥 Group sôi nổi nhất';
            listEl.innerHTML = groups.length
                ? groups.map(g => {
                    const info = getGroupLevelInfo(g.vibrancy_score);
                    return `
                        <div class="friend-row">
                            <span class="friend-row-name">🏰 ${this.escapeHtml(g.name)}
                                <span class="group-row-meta">${info.label} · ⭐ ${g.vibrancy_score} sôi nổi · 👥 ${counts[g.id] || 0}/${window.Groups.MAX_MEMBERS} thành viên</span>
                            </span>
                            <span class="friend-row-actions">
                                <button class="btn-primary group-join-btn" data-group-id="${g.id}" style="padding:5px 12px; font-size:12px;">Xin gia nhập</button>
                            </span>
                        </div>
                    `;
                }).join('')
                : `<p style="text-align:center; color:#777;">Chưa có group nào${query ? ' gần khớp với tìm kiếm' : ''}. Hãy là người đầu tiên tạo group!</p>`;
            listEl.querySelectorAll('.group-join-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    btn.disabled = true;
                    const result = await window.Groups.requestJoin(this.state.profile, btn.dataset.groupId);
                    if (result.error) { alert(result.error); btn.disabled = false; return; }
                    alert('Đã gửi yêu cầu tham gia! Chờ Chủ nhóm duyệt nhé.');
                    refreshList(query);
                });
            });
        };
        await refreshList(searchQuery);

        const searchInput = document.getElementById('group-search-input');
        let searchDebounce = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => refreshList(searchInput.value.trim()), 300);
        });
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { clearTimeout(searchDebounce); refreshList(searchInput.value.trim()); }
        });
    },

    renderCreateGroupForm() {
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">🏰</div>
                <h1 style="text-align: center;">Tạo Group</h1>
                <input type="text" id="group-name-input" class="input-field" style="display:block; width:80%; max-width:300px; margin:15px auto; padding:15px; text-align:center;" placeholder="Tên group (2-40 ký tự)...">
                <textarea id="group-desc-input" class="input-field" style="display:block; width:80%; max-width:300px; margin:10px auto; padding:12px;" placeholder="Mô tả ngắn (không bắt buộc)..." rows="3"></textarea>
                <p id="group-create-error" style="text-align:center; color: var(--duo-red); min-height:18px;"></p>
                <button class="btn-primary" id="group-create-submit" style="display: block; margin: 10px auto; padding: 15px 30px;">TẠO GROUP</button>
                <button class="btn-secondary" id="group-create-back" style="display: block; margin: 10px auto; padding: 15px 30px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('group-create-back').addEventListener('click', () => this.renderGroupsMenu());
        document.getElementById('group-create-submit').addEventListener('click', async () => {
            const name = document.getElementById('group-name-input').value.trim();
            const description = document.getElementById('group-desc-input').value.trim();
            const errorEl = document.getElementById('group-create-error');
            if (!name) { errorEl.innerText = 'Vui lòng nhập tên group.'; return; }
            const result = await window.Groups.createGroup(this.state.profile, name, description);
            if (result.error) { errorEl.innerText = result.error; return; }
            this.state.myGroupId = result.data.id;
            this.setupGroupHeartbeat();
            this.renderGroupDetail(result.data.id);
        });
    },

    // Small sub-menu shown after clicking "⚔️ Thách đấu" on a friend row - lets the
    // challenger pick lesson or any of the 5 mini-games, then delegates to the same
    // sendGameDuelChallenge() the manual-username form/game-picker duel buttons use.
    renderGameTypePicker(friendUsername) {
        const labels = DuoClone.GAME_TYPE_LABELS;
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">⚔️</div>
                <h1 style="text-align: center;">Thách đấu ${this.escapeHtml(friendUsername)}</h1>
                <p style="text-align: center; color: #777;">Chọn loại thi đấu.</p>
                <div class="game-picker-list">
                    ${Object.keys(labels).map(gt => `<button class="btn-primary game-pick-btn" data-game-type="${gt}">${labels[gt]}</button>`).join('')}
                </div>
                <button class="btn-secondary" style="margin-top: 20px;" id="game-type-picker-back">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('game-type-picker-back').addEventListener('click', () => this.renderHomeDashboard());
        this.ui.container.querySelectorAll('[data-game-type]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const result = await this.sendGameDuelChallenge(friendUsername, btn.dataset.gameType);
                if (result && result.error) alert(result.error);
            });
        });
    },

    // Full group screen: header/level, avatar upload + pending join requests (owner/
    // admin only), member roster with role controls, an embedded group chat widget
    // (mirrors the home dashboard's global-chat-widget markup/behavior under distinct
    // ids so both can exist independently), and the entry point into group battles.
    async renderGroupDetail(groupId) {
        this.cleanupGroupChat();
        this.ui.container.innerHTML = `<div class="welcome-screen"><p style="text-align:center; color:#777;">Đang tải...</p></div>`;
        if (!window.Groups || !this.state.profile) return;

        const [group, members, myMembership] = await Promise.all([
            window.Groups.getGroupById(groupId),
            window.Groups.getGroupMembers(groupId),
            window.Groups.getMyGroup(this.state.profile.id)
        ]);
        if (!group) {
            this.ui.container.innerHTML = `<div class="welcome-screen"><p style="text-align:center; color:#777;">Không tìm thấy group này.</p><button class="btn-secondary" id="group-detail-back" style="display:block; margin:15px auto; padding:12px 24px;">QUAY LẠI</button></div>`;
            document.getElementById('group-detail-back').addEventListener('click', () => this.renderHomeDashboard());
            return;
        }
        const myRole = myMembership && myMembership.group.id === groupId ? myMembership.membership.role : null;
        const isAdmin = myRole === 'owner' || myRole === 'admin';
        const isOwner = myRole === 'owner';

        const pendingRequests = isAdmin ? await window.Groups.getPendingJoinRequests(groupId) : [];
        const levelInfo = getGroupLevelInfo(group.vibrancy_score);
        const roleLabel = { owner: '👑 Chủ nhóm', admin: '⭐ Phó nhóm', member: '' };

        const requestsHtml = pendingRequests.length ? `
            <h3 style="margin: 15px 0 8px;">Yêu cầu tham gia (${pendingRequests.length})</h3>
            ${pendingRequests.map(r => `
                <div class="friend-row">
                    <span class="friend-row-name">👋 ${this.clickableUsername(r.user_id, r.username)}</span>
                    <span class="friend-row-actions">
                        <button class="btn-primary group-approve-btn" data-id="${r.id}" style="padding:5px 12px; font-size:12px;">Duyệt</button>
                        <button class="btn-secondary group-decline-btn" data-id="${r.id}" style="padding:5px 12px; font-size:12px;">Từ chối</button>
                    </span>
                </div>
            `).join('')}
        ` : '';

        const membersHtml = members.map(m => `
            <div class="friend-row" data-member-id="${m.id}" data-user-id="${m.user_id}">
                <span class="friend-row-name">${this.clickableUsername(m.user_id, m.username)} ${roleLabel[m.role] ? `<span class="group-role-badge">${roleLabel[m.role]}</span>` : ''}</span>
                ${isAdmin && m.user_id !== this.state.profile.id ? `
                    <span class="friend-row-actions">
                        ${m.role === 'member' ? `<button class="btn-secondary group-promote-btn" data-id="${m.id}" style="padding:5px 10px; font-size:11px;">Phong Phó nhóm</button>` : ''}
                        ${isOwner && m.role === 'admin' ? `<button class="btn-secondary group-demote-btn" data-id="${m.id}" style="padding:5px 10px; font-size:11px;">Hạ cấp</button>` : ''}
                        <button class="btn-secondary group-kick-btn" data-id="${m.id}" style="padding:5px 10px; font-size:11px; color:var(--duo-red);">Xoá</button>
                    </span>
                ` : ''}
            </div>
        `).join('');

        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                ${group.avatar_url
                    ? `<img src="${group.avatar_url}" alt="" style="width:88px; height:88px; border-radius:20px; display:block; margin:0 auto; object-fit:cover;">`
                    : `<div class="duo-character">🏰</div>`}
                <h1 style="text-align: center;">${this.escapeHtml(group.name)}</h1>
                ${group.description ? `<p style="text-align:center; color:#777;">${this.escapeHtml(group.description)}</p>` : ''}
                <p style="text-align: center; color: #777;">${levelInfo.label} · ⭐ ${group.vibrancy_score} điểm sôi nổi · ⚔️ ${group.battle_wins}T-${group.battle_losses}B</p>

                ${isAdmin ? `
                    <input type="file" id="group-avatar-input" accept="image/*" style="display:block; margin: 10px auto;">
                ` : ''}

                <button class="btn-primary" id="group-battle-btn" style="display: block; margin: 15px auto; padding: 15px 30px;">⚔️ ĐẤU GROUP</button>

                ${requestsHtml}

                <h3 style="margin: 15px 0 8px;">Thành viên (${members.length}/${window.Groups.MAX_MEMBERS})</h3>
                <div class="friends-list">${membersHtml}</div>

                <div class="global-chat-widget" id="group-chat-widget">
                    <button class="global-chat-toggle" id="group-chat-toggle">
                        <span>💬 Chat nhóm</span>
                        <span id="group-chat-toggle-icon">▾</span>
                    </button>
                    <div class="global-chat-body hidden" id="group-chat-body">
                        <div class="global-chat-messages" id="group-chat-messages"></div>
                        <div class="global-chat-input-row">
                            <input type="text" id="group-chat-input" class="input-field" maxlength="500" placeholder="Nhắn gì đó với cả nhóm...">
                            <button class="btn-primary" id="group-chat-send">GỬI</button>
                        </div>
                    </div>
                </div>

                ${myRole && myRole !== 'owner' ? `<button class="btn-secondary" id="group-leave-btn" style="display: block; margin: 15px auto; padding: 12px 24px; color:var(--duo-red);">RỜI GROUP</button>` : ''}
                <button class="btn-secondary" id="group-detail-back" style="display: block; margin: 10px auto; padding: 15px 30px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');

        document.getElementById('group-detail-back').addEventListener('click', () => this.renderHomeDashboard());
        document.getElementById('group-battle-btn').addEventListener('click', () => this.renderGroupBattleMenu(groupId));

        const avatarInput = document.getElementById('group-avatar-input');
        if (avatarInput) {
            avatarInput.addEventListener('change', async () => {
                const file = avatarInput.files[0];
                if (!file || !window.AuthService) return;
                const result = await window.AuthService.uploadGroupAvatar(groupId, file);
                if (result.error) { alert(result.error); return; }
                await window.Groups.updateGroupAvatar(groupId, result.url);
                this.renderGroupDetail(groupId);
            });
        }

        this.ui.container.querySelectorAll('.group-approve-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const result = await window.Groups.approveJoinRequest(btn.dataset.id, groupId);
                if (result.error) { alert(result.error); return; }
                this.renderGroupDetail(groupId);
            });
        });
        this.ui.container.querySelectorAll('.group-decline-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                await window.Groups.declineJoinRequest(btn.dataset.id);
                this.renderGroupDetail(groupId);
            });
        });
        this.ui.container.querySelectorAll('.group-promote-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                await window.Groups.promoteToAdmin(btn.dataset.id);
                this.renderGroupDetail(groupId);
            });
        });
        this.ui.container.querySelectorAll('.group-demote-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                await window.Groups.demoteToMember(btn.dataset.id);
                this.renderGroupDetail(groupId);
            });
        });
        this.ui.container.querySelectorAll('.group-kick-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Xoá thành viên này khỏi group?')) return;
                await window.Groups.removeMember(btn.dataset.id);
                this.renderGroupDetail(groupId);
            });
        });
        const leaveBtn = document.getElementById('group-leave-btn');
        if (leaveBtn) {
            leaveBtn.addEventListener('click', async () => {
                if (!confirm('Bạn chắc chắn muốn rời group này?')) return;
                await window.Groups.removeMember(myMembership.membership.id);
                this.state.myGroupId = null;
                this.renderHomeDashboard();
            });
        }

        this.initGroupChatWidget(groupId);
    },

    initGroupChatWidget(groupId) {
        const toggle = document.getElementById('group-chat-toggle');
        if (toggle) toggle.addEventListener('click', () => this.toggleGroupChat(groupId));

        const sendBtn = document.getElementById('group-chat-send');
        const input = document.getElementById('group-chat-input');
        const send = async () => {
            if (!input || !window.Groups || !this.state.profile) return;
            const text = input.value.trim();
            if (!text) return;
            input.value = '';
            const result = await window.Groups.sendGroupMessage(groupId, this.state.profile, text);
            if (result.error) alert(result.error);
        };
        if (sendBtn) sendBtn.addEventListener('click', send);
        if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    },

    async toggleGroupChat(groupId) {
        const body = document.getElementById('group-chat-body');
        const icon = document.getElementById('group-chat-toggle-icon');
        if (!body) return;
        const opening = body.classList.contains('hidden');
        body.classList.toggle('hidden');
        if (icon) icon.textContent = opening ? '▴' : '▾';

        if (!opening) {
            this.cleanupGroupChat();
            return;
        }
        if (!window.Groups) return;
        const messages = await window.Groups.getGroupMessages(groupId, 50);
        this.renderGroupChatMessages(messages);
        this.cleanupGroupChat();
        this.groupChatUnsub = window.Groups.subscribeToGroupMessages(groupId, (msg) => {
            const listEl = document.getElementById('group-chat-messages');
            if (!listEl) return;
            this.appendGroupChatMessage(msg);
        });
    },

    groupChatMessageHtml(m) {
        const isMine = this.state.profile && m.sender_id === this.state.profile.id;
        return `
            <div class="chat-bubble-row ${isMine ? 'mine' : 'theirs'}">
                <div class="chat-bubble">
                    ${isMine ? '' : `<span class="chat-bubble-sender">${this.clickableUsername(m.sender_id, m.sender_username)}</span>`}
                    ${this.escapeHtml(m.message)}
                </div>
            </div>
        `;
    },

    renderGroupChatMessages(messages) {
        const listEl = document.getElementById('group-chat-messages');
        if (!listEl) return;
        listEl.innerHTML = messages.length
            ? messages.map(m => this.groupChatMessageHtml(m)).join('')
            : '<p style="text-align:center; color:#999; font-size:13px;">Chưa có tin nhắn nào trong group.</p>';
        listEl.scrollTop = listEl.scrollHeight;
    },

    appendGroupChatMessage(msg) {
        const listEl = document.getElementById('group-chat-messages');
        if (!listEl) return;
        listEl.insertAdjacentHTML('beforeend', this.groupChatMessageHtml(msg));
        listEl.scrollTop = listEl.scrollHeight;
    },

    cleanupGroupChat() {
        if (this.groupChatUnsub) {
            this.groupChatUnsub();
            this.groupChatUnsub = null;
        }
    },

    // 3 tabs sharing one screen (Cấp độ/Thiện chiến/Máu chiến) rather than 3 separate
    // render functions - reuses the exact .leaderboard-row/.lb-name/.lb-xp markup/CSS
    // already built for renderLeaderboard()/renderDuelLeaderboard(), just pointed at
    // window.Groups.getGroupLeaderboard() instead.
    async renderGroupLeaderboards(sortBy = 'vibrancy_score') {
        const tabs = [
            { key: 'vibrancy_score', label: '⚡ Sôi nổi' },
            { key: 'battle_wins', label: 'Thiện chiến' },
            { key: 'battles_initiated', label: 'Máu chiến' }
        ];
        this.ui.container.innerHTML = `<div class="welcome-screen"><p style="text-align:center; color:#777;">Đang tải...</p></div>`;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        if (!window.Groups) return;

        const entries = await window.Groups.getGroupLeaderboard(sortBy, 20);
        const valueLabel = (g) => {
            if (sortBy === 'battle_wins') return `${g.battle_wins} thắng`;
            if (sortBy === 'battles_initiated') return `${g.battles_initiated} trận`;
            return `${getGroupLevelInfo(g.vibrancy_score).label} · ⭐ ${g.vibrancy_score}`;
        };
        const rowsHtml = entries.length ? entries.map((g, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
            return `
                <div class="leaderboard-row">
                    <span class="lb-rank">${medal}</span>
                    <span class="lb-name">🏰 ${this.escapeHtml(g.name)}</span>
                    <span class="lb-xp">${valueLabel(g)}</span>
                </div>
            `;
        }).join('') : `<p style="text-align:center; color:#777;">Chưa có group nào.</p>`;

        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">🏆</div>
                <h1 style="text-align: center;">Bảng Xếp Hạng Group</h1>
                <div class="game-picker-list" style="flex-direction:row; justify-content:center; gap:8px; max-width:500px; margin:10px auto;">
                    ${tabs.map(t => `<button class="btn-secondary group-lb-tab-btn ${t.key === sortBy ? 'group-lb-tab-active' : ''}" data-sort="${t.key}" style="padding:8px 14px; font-size:13px;">${t.label}</button>`).join('')}
                </div>
                <div style="max-width:500px; margin:0 auto;">${rowsHtml}</div>
                <button class="btn-secondary" id="group-lb-back" style="display: block; margin: 20px auto; padding: 15px 30px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('group-lb-back').addEventListener('click', () => this.renderHomeDashboard());
        this.ui.container.querySelectorAll('.group-lb-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.renderGroupLeaderboards(btn.dataset.sort));
        });
    },

    // Intermediate screen reached from "⚔️ ĐẤU GROUP" - routes straight into the live
    // battle screen if one is already active, otherwise shows any incoming challenges to
    // accept/decline plus a form to challenge another group by name.
    async renderGroupBattleMenu(groupId) {
        this.ui.container.innerHTML = `<div class="welcome-screen"><p style="text-align:center; color:#777;">Đang tải...</p></div>`;
        if (!window.Groups) return;

        const active = await window.Groups.getActiveBattleFor(groupId);
        if (active) {
            this.renderGroupBattleScreen(active.id);
            return;
        }

        const [pending, myMembership] = await Promise.all([
            window.Groups.getPendingBattlesFor(groupId),
            window.Groups.getMyGroup(this.state.profile.id)
        ]);
        const myRole = myMembership ? myMembership.membership.role : null;
        const isAdmin = myRole === 'owner' || myRole === 'admin';

        const pendingHtml = pending.length ? `
            <h3 style="margin: 15px 0 8px;">Lời thách đấu</h3>
            ${await Promise.all(pending.map(async b => {
                const challenger = await window.Groups.getGroupById(b.group_a_id);
                return `
                    <div class="friend-row">
                        <span class="friend-row-name">⚔️ ${this.escapeHtml(challenger ? challenger.name : 'Group khác')}</span>
                        <span class="friend-row-actions">
                            ${isAdmin ? `
                                <button class="btn-primary group-battle-accept-btn" data-id="${b.id}" style="padding:5px 12px; font-size:12px;">Chấp nhận</button>
                                <button class="btn-secondary group-battle-decline-btn" data-id="${b.id}" style="padding:5px 12px; font-size:12px;">Từ chối</button>
                            ` : '<span style="color:#999; font-size:12px;">Chờ Chủ/Phó nhóm duyệt</span>'}
                        </span>
                    </div>
                `;
            })).then(rows => rows.join(''))}
        ` : '';

        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">⚔️</div>
                <h1 style="text-align: center;">Đấu Group</h1>
                <p style="text-align: center; color: #777;">Tổng điểm nhiều trận 1vs1 giữa thành viên 2 group.</p>
                ${pendingHtml}
                ${isAdmin ? `
                    <h3 style="margin: 15px 0 8px;">Thách đấu group khác</h3>
                    <input type="text" id="group-battle-target-input" class="input-field" style="display:block; width:80%; max-width:300px; margin:10px auto; padding:12px; text-align:center;" placeholder="Tên group muốn thách đấu...">
                    <p id="group-battle-error" style="text-align:center; color: var(--duo-red); min-height:18px;"></p>
                    <button class="btn-primary" id="group-battle-challenge-btn" style="display: block; margin: 10px auto; padding: 15px 30px;">GỬI THÁCH ĐẤU</button>
                ` : ''}
                <button class="btn-secondary" id="group-battle-menu-back" style="display: block; margin: 15px auto; padding: 15px 30px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');

        document.getElementById('group-battle-menu-back').addEventListener('click', () => this.renderGroupDetail(groupId));
        this.ui.container.querySelectorAll('.group-battle-accept-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const result = await window.Groups.acceptGroupBattle(btn.dataset.id);
                if (result.error) { alert(result.error); return; }
                this.renderGroupBattleScreen(btn.dataset.id);
            });
        });
        this.ui.container.querySelectorAll('.group-battle-decline-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                await window.Groups.declineGroupBattle(btn.dataset.id);
                this.renderGroupBattleMenu(groupId);
            });
        });
        const challengeBtn = document.getElementById('group-battle-challenge-btn');
        if (challengeBtn) {
            // Group-name suggestions (excluding our own group) so admins don't need
            // the exact name to send a battle challenge.
            this.attachSuggestions(document.getElementById('group-battle-target-input'), async (q) => {
                const found = await window.Groups.searchGroups(q, 8);
                return found.filter(g => g.id !== groupId).map(g => ({
                    label: `🏰 ${g.name} (${getGroupLevelInfo(g.vibrancy_score).label})`,
                    value: g.name
                }));
            });
            challengeBtn.addEventListener('click', async () => {
                const target = document.getElementById('group-battle-target-input').value.trim();
                const errorEl = document.getElementById('group-battle-error');
                if (!target) { errorEl.innerText = 'Vui lòng nhập tên group.'; return; }
                const result = await window.Groups.challengeGroupBattle(groupId, target);
                if (result.error) { errorEl.innerText = result.error; return; }
                alert('Đã gửi thách đấu! Chờ group kia chấp nhận.');
                this.renderGroupBattleMenu(groupId);
            });
        }
    },

    // Live battle screen: shows the running aggregate score, both sides' currently-
    // online members (heartbeat'd within the last 3 minutes) with per-member "Đấu"
    // buttons, and a manual "Kết thúc trận" for owner/admin - no automatic timer since
    // this app has no cron infrastructure (see groups_schema.sql's comments).
    async renderGroupBattleScreen(battleId) {
        this.ui.container.innerHTML = `<div class="welcome-screen"><p style="text-align:center; color:#777;">Đang tải...</p></div>`;
        if (!window.Groups || !this.state.profile) return;

        const recomputed = await window.Groups.recomputeBattleScore(battleId);
        if (!recomputed) {
            this.ui.container.innerHTML = `<div class="welcome-screen"><p style="text-align:center; color:#777;">Không tìm thấy trận đấu.</p><button class="btn-secondary" id="group-battle-back" style="display:block; margin:15px auto; padding:12px 24px;">QUAY LẠI</button></div>`;
            document.getElementById('group-battle-back').addEventListener('click', () => this.renderHomeDashboard());
            return;
        }

        const [groupA, groupB, membersA, membersB, myMembership] = await Promise.all([
            window.Groups.getGroupById(recomputed.group_a_id),
            window.Groups.getGroupById(recomputed.group_b_id),
            window.Groups.getGroupMembers(recomputed.group_a_id),
            window.Groups.getGroupMembers(recomputed.group_b_id),
            window.Groups.getMyGroup(this.state.profile.id)
        ]);
        const myGroupId = myMembership ? myMembership.group.id : null;
        const myRole = myMembership ? myMembership.membership.role : null;
        const isAdmin = myRole === 'owner' || myRole === 'admin';
        const mySide = myGroupId === recomputed.group_a_id ? 'a' : (myGroupId === recomputed.group_b_id ? 'b' : null);

        const ONLINE_WINDOW_MS = 3 * 60 * 1000;
        const isOnline = (m) => m.last_active_at && (Date.now() - new Date(m.last_active_at).getTime()) < ONLINE_WINDOW_MS;

        const renderSide = (members, sideKey) => {
            const isMySide = sideKey === mySide;
            return members.map(m => {
                const online = isOnline(m);
                const canChallenge = !isMySide && mySide && online && recomputed.status === 'active';
                return `
                    <div class="friend-row">
                        <span class="friend-row-name">${online ? '🟢' : '⚪'} ${this.clickableUsername(m.user_id, m.username)}</span>
                        ${canChallenge ? `<button class="btn-primary group-battle-fight-btn" data-username="${this.escapeHtml(m.username)}" data-side="${mySide}" style="padding:5px 12px; font-size:12px;">Đấu</button>` : ''}
                    </div>
                `;
            }).join('');
        };

        if (recomputed.status === 'finished') {
            const resultText = !recomputed.winner_group_id
                ? 'Trận đấu hoà!'
                : (recomputed.winner_group_id === myGroupId ? '🏆 Group bạn đã thắng!' : 'Group bạn đã thua trận này.');
            this.ui.container.innerHTML = `
                <div class="certificate">
                    <div class="certificate-badge">${!recomputed.winner_group_id ? '🤝' : (recomputed.winner_group_id === myGroupId ? '🏆' : '⚔️')}</div>
                    <h2>${resultText}</h2>
                    <p class="certificate-score">${this.escapeHtml(groupA.name)}: ${recomputed.group_a_wins} thắng &nbsp;|&nbsp; ${this.escapeHtml(groupB.name)}: ${recomputed.group_b_wins} thắng</p>
                </div>
                <button class="btn-primary" id="group-battle-back" style="display: block; margin: 20px auto; padding: 15px 30px;">VỀ TRANG CHÍNH</button>
            `;
            this.ui.checkBtn.disabled = true;
            this.ui.checkBtn.classList.remove('active');
            document.getElementById('group-battle-back').addEventListener('click', () => this.renderHomeDashboard());
            return;
        }

        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">⚔️</div>
                <h1 style="text-align: center;">${this.escapeHtml(groupA.name)} vs ${this.escapeHtml(groupB.name)}</h1>
                <p style="text-align: center; font-size: 22px; font-weight: 800;">${recomputed.group_a_wins} — ${recomputed.group_b_wins}</p>
                <p style="text-align: center; color: #777;">🟢 = đang online, có thể thách đấu ngay</p>

                <h3 style="margin: 15px 0 8px;">${this.escapeHtml(groupA.name)}</h3>
                <div class="friends-list">${renderSide(membersA, 'a')}</div>

                <h3 style="margin: 15px 0 8px;">${this.escapeHtml(groupB.name)}</h3>
                <div class="friends-list">${renderSide(membersB, 'b')}</div>

                ${isAdmin ? `<button class="btn-secondary" id="group-battle-finish-btn" style="display: block; margin: 15px auto; padding: 12px 24px;">KẾT THÚC TRẬN</button>` : ''}
                <button class="btn-secondary" id="group-battle-back" style="display: block; margin: 10px auto; padding: 15px 30px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');

        document.getElementById('group-battle-back').addEventListener('click', () => this.renderHomeDashboard());
        this.ui.container.querySelectorAll('.group-battle-fight-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const result = await this.sendGameDuelChallenge(btn.dataset.username, 'lesson', battleId, btn.dataset.side);
                if (result && result.error) alert(result.error);
            });
        });
        const finishBtn = document.getElementById('group-battle-finish-btn');
        if (finishBtn) {
            finishBtn.addEventListener('click', async () => {
                if (!confirm('Kết thúc trận đấu ngay bây giờ? Bên nào đang thắng nhiều trận 1vs1 hơn sẽ được tính thắng chung cuộc.')) return;
                const result = await window.Groups.finalizeGroupBattle(battleId);
                if (result.error) { alert(result.error); return; }
                this.renderGroupBattleScreen(battleId);
            });
        }
    },

    // ===================== Personal Inbox (direct messages) =====================

    async renderInboxMenu() {
        if (!this.state.currentUser) {
            alert("Vui lòng đăng nhập trước khi xem hộp thư!");
            return;
        }
        if (!window.Inbox) return;
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">📬</div>
                <h1 style="text-align: center;">Hộp Thư</h1>
                <p style="text-align: center; color: #777;">Đang tải...</p>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');

        const conversations = await window.Inbox.getConversations(this.state.profile.id);

        const listHtml = conversations.length ? conversations.map(c => `
            <div class="friend-row inbox-conversation-row" data-other-id="${c.otherUserId}" data-other-username="${this.escapeHtml(c.otherUsername)}">
                <span class="friend-row-name">${c.unreadCount > 0 ? '🔵 ' : ''}${this.clickableUsername(c.otherUserId, c.otherUsername)}</span>
                <span class="inbox-preview">
                    ${this.escapeHtml((c.lastMessage || '').slice(0, 36))}${(c.lastMessage || '').length > 36 ? '…' : ''}
                    ${c.unreadCount > 0 ? `<span class="nav-unread-badge">${c.unreadCount}</span>` : ''}
                </span>
                <button class="btn-secondary inbox-delete-convo-btn" data-other-id="${c.otherUserId}" title="Xóa cuộc trò chuyện (chỉ phía bạn)" style="padding:4px 10px; font-size:12px;">🗑️</button>
            </div>
        `).join('') : `<p style="text-align:center; color:#777;">Chưa có tin nhắn nào. Hãy nhắn tin cho ai đó nhé!</p>`;

        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">📬</div>
                <h1 style="text-align: center;">Hộp Thư</h1>
                <div style="max-width:500px; margin:0 auto;">${listHtml}</div>
                <button class="btn-primary" id="inbox-new-btn" style="display: block; margin: 20px auto; padding: 15px 30px;">+ NHẮN TIN MỚI</button>
                <button class="btn-secondary" id="inbox-close" style="display: block; margin: 10px auto; padding: 15px 30px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('inbox-new-btn').addEventListener('click', () => this.renderNewMessageForm());
        document.getElementById('inbox-close').addEventListener('click', () => this.renderHomeDashboard());
        this.ui.container.querySelectorAll('.inbox-conversation-row').forEach(row => {
            row.addEventListener('click', () => this.renderConversation(row.dataset.otherId, row.dataset.otherUsername));
        });
        this.ui.container.querySelectorAll('.inbox-delete-convo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // The row's own click handler opens the conversation - a delete click
                // must not also navigate into the thread it is about to remove.
                e.stopPropagation();
                this.showConfirmDialog('Xóa toàn bộ cuộc trò chuyện này khỏi hộp thư của bạn? (Người kia vẫn giữ bản của họ)', async () => {
                    const result = await window.Inbox.deleteConversationForMe(this.state.profile.id, btn.dataset.otherId);
                    if (result.error) { alert(result.error); return; }
                    this.updateInboxBadge();
                    this.renderInboxMenu();
                }, { okLabel: 'XÓA' });
            });
        });
    },

    renderNewMessageForm() {
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">📬</div>
                <h1 style="text-align: center;">Nhắn tin mới</h1>
                <p style="text-align: center; color: #777;">Nhập tên người dùng bạn muốn nhắn tin (không cần là bạn bè).</p>
                <input type="text" id="dm-target-input" class="input-field" style="display:block; width:80%; max-width:300px; margin:15px auto; padding:15px; text-align:center;" placeholder="Tên người dùng...">
                <p id="dm-target-error" style="text-align:center; color: var(--duo-red); min-height:18px;"></p>
                <button class="btn-primary" id="dm-target-next" style="display: block; margin: 10px auto; padding: 15px 30px;">TIẾP TỤC</button>
                <button class="btn-secondary" id="dm-target-back" style="display: block; margin: 10px auto; padding: 15px 30px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('dm-target-back').addEventListener('click', () => this.renderHomeDashboard());
        this.attachUserSuggestions(document.getElementById('dm-target-input'));
        document.getElementById('dm-target-next').addEventListener('click', async () => {
            const target = document.getElementById('dm-target-input').value.trim();
            const errorEl = document.getElementById('dm-target-error');
            if (!target) { errorEl.innerText = 'Vui lòng nhập tên người dùng.'; return; }
            if (target === this.state.currentUser) { errorEl.innerText = 'Bạn không thể tự nhắn tin cho chính mình.'; return; }
            const user = await window.Inbox.searchUserByUsername(target);
            if (!user) { errorEl.innerText = 'Không tìm thấy người dùng này.'; return; }
            this.renderConversation(user.id, user.username);
        });
    },

    cleanupInboxConversation() {
        if (this.inboxConversationUnsub) {
            this.inboxConversationUnsub();
            this.inboxConversationUnsub = null;
        }
    },

    async renderConversation(otherUserId, otherUsername) {
        if (!this.state.currentUser || !window.Inbox) return;
        this.cleanupInboxConversation();
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">📬</div>
                <h1 style="text-align: center;">${this.escapeHtml(otherUsername)}</h1>
                <div class="conversation-thread" id="conversation-thread"></div>
                <div class="conversation-input-row">
                    <input type="text" id="dm-message-input" class="input-field" placeholder="Nhập tin nhắn...">
                    <button class="btn-primary" id="dm-send-btn">GỬI</button>
                </div>
                <button class="btn-secondary" id="conversation-back" style="display: block; margin: 15px auto 0; padding: 12px 24px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('conversation-back').addEventListener('click', () => {
            this.cleanupInboxConversation();
            this.renderHomeDashboard();
        });

        await window.Inbox.markConversationRead(this.state.profile.id, otherUserId);
        this.updateInboxBadge();

        // Kept in the closure so per-message delete buttons can look their row back up
        // by id - refreshed on every re-render (send, incoming message, delete).
        let currentMessages = [];
        const refresh = async () => {
            currentMessages = await window.Inbox.getConversationMessages(this.state.profile.id, otherUserId);
            renderMessages(currentMessages);
        };
        const renderMessages = (messages) => {
            const threadEl = document.getElementById('conversation-thread');
            if (!threadEl) return;
            threadEl.innerHTML = messages.map(m => {
                const isMine = m.sender_id === this.state.profile.id;
                return `<div class="chat-bubble-row ${isMine ? 'mine' : 'theirs'}">
                            <div class="chat-bubble">${this.escapeHtml(m.message)}</div>
                            <button class="dm-delete-btn" data-msg-id="${m.id}" title="Xóa tin nhắn này (chỉ phía bạn)">✕</button>
                        </div>`;
            }).join('');
            threadEl.scrollTop = threadEl.scrollHeight;
            threadEl.querySelectorAll('.dm-delete-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const msg = currentMessages.find(m => m.id === btn.dataset.msgId);
                    if (!msg) return;
                    this.showConfirmDialog('Xóa tin nhắn này khỏi hộp thư của bạn? (Người kia vẫn nhìn thấy bản của họ)', async () => {
                        const result = await window.Inbox.deleteMessageForMe(this.state.profile.id, msg);
                        if (result.error) { alert(result.error); return; }
                        this.updateInboxBadge();
                        refresh();
                    }, { okLabel: 'XÓA' });
                });
            });
        };

        await refresh();

        const sendHandler = async () => {
            const input = document.getElementById('dm-message-input');
            const text = input.value.trim();
            if (!text) return;
            input.value = '';
            const result = await window.Inbox.sendDirectMessageToId(this.state.profile, otherUserId, otherUsername, text);
            if (result.error) { alert(result.error); return; }
            await refresh();
        };
        document.getElementById('dm-send-btn').addEventListener('click', sendHandler);
        document.getElementById('dm-message-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendHandler();
        });

        // Scoped to THIS conversation - subscribeToIncomingMessages already filters at
        // the DB level to "messages addressed to me", the sender check here narrows it
        // further to just the person currently open on screen.
        this.inboxConversationUnsub = window.Inbox.subscribeToIncomingMessages(this.state.profile.id, async (msg) => {
            if (msg.sender_id !== otherUserId) return;
            await window.Inbox.markConversationRead(this.state.profile.id, otherUserId);
            this.updateInboxBadge();
            await refresh();
        }, 'conversation:' + otherUserId);
    },

    // Called once per login (completeLogin()) - keeps the unread badge current and
    // toasts new incoming DMs regardless of which screen is open, mirroring
    // setupDuelInviteWatcher()/setupFriendRequestWatcher().
    async setupInboxWatcher() {
        if (!window.Inbox || !window.Inbox.isConfigured || !this.state.profile) return;
        this.updateInboxBadge();
        if (this.inboxUnsub) this.inboxUnsub();
        this.inboxUnsub = window.Inbox.subscribeToIncomingMessages(this.state.profile.id, (msg) => {
            this.updateInboxBadge();
            // If the matching conversation thread is already open, its own subscription
            // (see renderConversation()) handles live-appending the message - avoid
            // double-showing it as a toast on top of that.
            if (document.getElementById('conversation-thread') && this.state.mode !== 'duel') {
                return;
            }
            if (this.state.mode === 'duel') return;
            this.showDMToast(msg);
        });
    },

    async updateInboxBadge() {
        if (!window.Inbox || !this.state.profile || !this.ui.inboxUnreadBadge) return;
        const count = await window.Inbox.getTotalUnreadCount(this.state.profile.id);
        if (count > 0) {
            this.ui.inboxUnreadBadge.textContent = count > 99 ? '99+' : String(count);
            this.ui.inboxUnreadBadge.classList.remove('hidden');
        } else {
            this.ui.inboxUnreadBadge.classList.add('hidden');
        }
    },

    // Fetches any invites that arrived while the user was offline, then subscribes for
    // new ones landing during this session - called once per login (completeLogin()),
    // not per screen render, since re-subscribing on every returnToApp() would leak
    // channels.
    async setupDuelInviteWatcher() {
        if (!window.Duel || !window.Duel.isConfigured || !this.state.profile) return;
        const existing = await window.Duel.getPendingInvitesFor(this.state.profile.id);
        existing.forEach(inv => this.showDuelInviteToast(inv));
        if (this.duelInviteUnsub) this.duelInviteUnsub();
        this.duelInviteUnsub = window.Duel.subscribeToIncomingInvites(this.state.profile.id, (invite) => {
            this.showDuelInviteToast(invite);
        });
    },

    showDuelInviteToast(invite) {
        // Don't interrupt an already-active duel with a second challenge - the pending
        // invite is still safely sitting in the DB and will surface next time the user
        // opens the Duel menu once their current match ends.
        if (this.state.mode === 'duel') return;
        // Guard against showing the same invite twice (the initial getPendingInvitesFor
        // fetch and a stray realtime echo could both resolve to the same row).
        if (document.getElementById('duel-invite-toast-' + invite.id)) return;

        const toast = document.createElement('div');
        toast.className = 'duel-invite-toast';
        toast.id = 'duel-invite-toast-' + invite.id;
        toast.innerHTML = `
            <div class="duel-invite-toast-header">⚔️ <strong>${this.clickableUsername(invite.challenger_id, invite.challenger_username)}</strong> đã thách đấu bạn!</div>
            <div class="duel-invite-toast-actions">
                <button class="btn-primary" data-action="accept" style="padding:6px 14px; font-size:13px;">Chấp nhận</button>
                <button class="btn-secondary" data-action="decline" style="padding:6px 14px; font-size:13px;">Từ chối</button>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);

        const dismiss = () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        };
        toast.querySelector('[data-action="accept"]').addEventListener('click', async () => {
            dismiss();
            if (this.state.mode === 'duel') { alert('Bạn đang trong một trận đấu khác.'); return; }
            const result = await window.Duel.acceptDuel(invite.id);
            if (result.error) { alert('Không thể chấp nhận lúc này.'); return; }
            this.startDuelBattle(result.data, false);
        });
        toast.querySelector('[data-action="decline"]').addEventListener('click', async () => {
            dismiss();
            await window.Duel.declineDuel(invite.id);
        });
    },

    // Mirrors setupDuelInviteWatcher() - fetches requests that arrived while offline,
    // then subscribes for new ones landing this session.
    async setupFriendRequestWatcher() {
        if (!window.Friends || !window.Friends.isConfigured || !this.state.profile) return;
        const existing = await window.Friends.getPendingRequestsFor(this.state.profile.id);
        existing.forEach(req => this.showFriendRequestToast(req));
        if (this.friendRequestUnsub) this.friendRequestUnsub();
        this.friendRequestUnsub = window.Friends.subscribeToIncomingFriendRequests(this.state.profile.id, (req) => {
            this.showFriendRequestToast(req);
        });
    },

    showFriendRequestToast(request) {
        // Guard against showing the same request twice (initial fetch + a stray
        // realtime echo could both resolve to the same row) - same pattern as the duel
        // invite toast's own guard.
        if (document.getElementById('friend-request-toast-' + request.id)) return;

        const toast = document.createElement('div');
        toast.className = 'duel-invite-toast';
        toast.id = 'friend-request-toast-' + request.id;
        toast.innerHTML = `
            <div class="duel-invite-toast-header">👋 <strong>${this.clickableUsername(request.requester_id, request.requester_username)}</strong> muốn kết bạn với bạn!</div>
            <div class="duel-invite-toast-actions">
                <button class="btn-primary" data-action="accept" style="padding:6px 14px; font-size:13px;">Chấp nhận</button>
                <button class="btn-secondary" data-action="decline" style="padding:6px 14px; font-size:13px;">Từ chối</button>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);

        const dismiss = () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        };
        toast.querySelector('[data-action="accept"]').addEventListener('click', async () => {
            dismiss();
            await window.Friends.acceptFriendRequest(request.id);
        });
        toast.querySelector('[data-action="decline"]').addEventListener('click', async () => {
            dismiss();
            await window.Friends.declineFriendRequest(request.id);
        });
    },

    // ===================== Admin: Group oversight (groups_admin_schema.sql) =====================
    // Every write here goes through a dedicated admin_* RPC in groups.js, which itself is
    // backed by a SECURITY DEFINER function checking is_site_admin(auth.uid()) - real DB-
    // level enforcement, not just this UI being hidden from non-admins (see the plan's
    // context note on why profiles/leaderboard's admin actions don't offer that guarantee
    // but Group's do).

    async renderAdminGroupsList(searchQuery = '') {
        this.ui.container.innerHTML = `<div class="admin-screen"><p style="text-align:center; color:#777;">Đang tải...</p></div>`;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        if (!window.Groups) return;

        const groups = await window.Groups.searchGroups(searchQuery, 100);
        const rowsHtml = groups.length ? groups.map(g => {
            const info = getGroupLevelInfo(g.vibrancy_score);
            return `
                <div class="admin-row">
                    <div class="admin-row-main">
                        <strong>🏰 ${this.escapeHtml(g.name)}</strong>
                        <div class="admin-row-meta">${info.label} · ⭐ ${g.vibrancy_score} điểm sôi nổi · ⚔️ ${g.battle_wins}T-${g.battle_losses}B · Máu chiến: ${g.battles_initiated}</div>
                    </div>
                    <div class="admin-row-actions">
                        <button class="btn-secondary admin-action-btn" data-group-action="view-group" data-id="${g.id}">Xem chi tiết</button>
                        <button class="btn-secondary admin-action-btn admin-action-danger" data-group-action="delete-group" data-id="${g.id}">Xóa group</button>
                    </div>
                </div>
            `;
        }).join('') : `<p style="text-align: center; color: #777;">Không tìm thấy group nào.</p>`;

        this.ui.container.innerHTML = `
            <div class="admin-screen">
                <h2 style="text-align: center;">🏰 Quản lý Group</h2>
                <div class="admin-controls">
                    <input type="text" id="admin-group-search" class="input-field admin-search-input" placeholder="Tìm group theo tên..." value="${this.escapeHtml(searchQuery)}">
                </div>
                <div class="admin-table">${rowsHtml}</div>
                <button class="btn-secondary" id="admin-groups-back" style="margin-top: 20px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');

        document.getElementById('admin-groups-back').addEventListener('click', () => this.renderAdminDashboard());
        const searchInput = document.getElementById('admin-group-search');
        searchInput.addEventListener('input', () => this.renderAdminGroupsList(searchInput.value));
        this.ui.container.querySelectorAll('.admin-action-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleAdminGroupAction(btn));
        });
    },

    async renderAdminGroupDetail(groupId) {
        this.ui.container.innerHTML = `<div class="admin-screen"><p style="text-align:center; color:#777;">Đang tải...</p></div>`;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        if (!window.Groups) return;

        const [group, members, battles] = await Promise.all([
            window.Groups.getGroupById(groupId),
            window.Groups.adminGetGroupMembersAll(groupId),
            window.Groups.adminGetBattlesFor(groupId)
        ]);
        if (!group) {
            this.ui.container.innerHTML = `<div class="admin-screen"><p style="text-align:center; color:#777;">Không tìm thấy group này.</p><button class="btn-secondary" id="admin-group-detail-back">QUAY LẠI</button></div>`;
            document.getElementById('admin-group-detail-back').addEventListener('click', () => this.renderAdminGroupsList());
            return;
        }

        const roleLabel = { owner: '👑 Chủ nhóm', admin: '⭐ Phó nhóm', member: 'Thành viên' };
        const roleOptions = (current) => ['owner', 'admin', 'member']
            .map(r => `<option value="${r}" ${r === current ? 'selected' : ''}>${roleLabel[r]}</option>`).join('');

        const membersHtml = members.length ? members.map(m => `
            <div class="admin-row">
                <div class="admin-row-main">
                    <strong>${this.escapeHtml(m.username)}</strong>
                    ${m.status === 'pending' ? '<span class="admin-badge-tag">Chờ duyệt</span>' : ''}
                    <div class="admin-row-meta">${roleLabel[m.role] || m.role}</div>
                </div>
                <div class="admin-row-actions">
                    <select class="input-field admin-role-select" data-id="${m.id}" style="width:auto; padding:6px 10px; font-size:12px;">${roleOptions(m.role)}</select>
                    <button class="btn-secondary admin-action-btn admin-action-danger" data-group-action="remove-member" data-id="${m.id}">Gỡ khỏi group</button>
                </div>
            </div>
        `).join('') : `<p style="text-align: center; color: #777;">Group chưa có thành viên nào.</p>`;

        const battleStatusLabel = { pending: 'Chờ chấp nhận', active: 'Đang diễn ra', finished: 'Đã kết thúc' };
        const battlesHtml = battles.length ? battles.map(b => `
            <div class="admin-row">
                <div class="admin-row-main">
                    <strong>${b.group_a_wins} — ${b.group_b_wins}</strong>
                    <div class="admin-row-meta">${battleStatusLabel[b.status] || b.status} · ${new Date(b.created_at).toLocaleString('vi-VN')}</div>
                </div>
                <div class="admin-row-actions">
                    ${b.status !== 'finished' ? `<button class="btn-secondary admin-action-btn" data-group-action="force-finish-battle" data-id="${b.id}">Buộc kết thúc</button>` : ''}
                </div>
            </div>
        `).join('') : `<p style="text-align: center; color: #777;">Group chưa có trận đấu nào.</p>`;

        this.ui.container.innerHTML = `
            <div class="admin-screen">
                <h2 style="text-align: center;">🏰 ${this.escapeHtml(group.name)}</h2>
                <div style="display:flex; align-items:center; justify-content:center; gap:10px; margin: 10px 0;">
                    <input type="number" id="admin-vibrancy-input" class="input-field" value="${group.vibrancy_score}" style="width:120px; text-align:center;">
                    <button class="btn-secondary" id="admin-save-vibrancy">Lưu điểm sôi nổi</button>
                </div>

                <h3 style="margin: 20px 0 8px;">Thành viên (${members.length})</h3>
                <div class="admin-table">${membersHtml}</div>

                <h3 style="margin: 20px 0 8px;">Trận đấu</h3>
                <div class="admin-table">${battlesHtml}</div>

                <div class="admin-controls" style="justify-content: center; margin-top: 20px;">
                    <button class="btn-secondary" id="admin-view-chat">💬 Xem &amp; kiểm duyệt chat</button>
                    <button class="btn-secondary admin-action-danger" id="admin-delete-group-btn">Xóa group này</button>
                </div>

                <button class="btn-secondary" id="admin-group-detail-back" style="margin-top: 20px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');

        document.getElementById('admin-group-detail-back').addEventListener('click', () => this.renderAdminGroupsList());
        document.getElementById('admin-view-chat').addEventListener('click', () => this.renderAdminGroupChat(groupId));
        document.getElementById('admin-save-vibrancy').addEventListener('click', async () => {
            const val = parseInt(document.getElementById('admin-vibrancy-input').value, 10);
            if (Number.isNaN(val)) { alert('Giá trị không hợp lệ.'); return; }
            const result = await window.Groups.adminSetVibrancy(groupId, val);
            if (result.error) { alert(result.error); return; }
            this.renderAdminGroupDetail(groupId);
        });
        document.getElementById('admin-delete-group-btn').addEventListener('click', async () => {
            const ok = confirm(`XÓA VĨNH VIỄN group "${group.name}"? Toàn bộ thành viên, tin nhắn, trận đấu sẽ mất. Không thể hoàn tác.`);
            if (!ok) return;
            const result = await window.Groups.adminDeleteGroup(groupId);
            if (result.error) { alert(result.error); return; }
            this.renderAdminGroupsList();
        });
        this.ui.container.querySelectorAll('.admin-role-select').forEach(sel => {
            sel.addEventListener('change', async () => {
                sel.disabled = true;
                const result = await window.Groups.adminChangeMemberRole(sel.dataset.id, sel.value);
                if (result.error) { alert(result.error); }
                this.renderAdminGroupDetail(groupId);
            });
        });
        this.ui.container.querySelectorAll('[data-group-action]').forEach(btn => {
            btn.addEventListener('click', () => this.handleAdminGroupAction(btn, groupId));
        });
    },

    async renderAdminGroupChat(groupId) {
        this.ui.container.innerHTML = `<div class="admin-screen"><p style="text-align:center; color:#777;">Đang tải...</p></div>`;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        if (!window.Groups) return;

        const messages = await window.Groups.getGroupMessages(groupId, 100);
        const messagesHtml = messages.length ? messages.map(m => `
            <div class="admin-row">
                <div class="admin-row-main">
                    <strong>${this.escapeHtml(m.sender_username)}</strong>
                    <div class="admin-row-meta">${this.escapeHtml(m.message)}</div>
                    <div class="admin-row-meta">${new Date(m.created_at).toLocaleString('vi-VN')}</div>
                </div>
                <div class="admin-row-actions">
                    <button class="btn-secondary admin-action-btn admin-action-danger" data-group-action="delete-message" data-id="${m.id}">Xóa</button>
                </div>
            </div>
        `).join('') : `<p style="text-align: center; color: #777;">Group chưa có tin nhắn nào.</p>`;

        this.ui.container.innerHTML = `
            <div class="admin-screen">
                <h2 style="text-align: center;">💬 Kiểm duyệt chat nhóm</h2>
                <div class="admin-table">${messagesHtml}</div>
                <button class="btn-secondary" id="admin-group-chat-back" style="margin-top: 20px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');

        document.getElementById('admin-group-chat-back').addEventListener('click', () => this.renderAdminGroupDetail(groupId));
        this.ui.container.querySelectorAll('[data-group-action]').forEach(btn => {
            btn.addEventListener('click', () => this.handleAdminGroupAction(btn, groupId));
        });
    },

    async handleAdminGroupAction(btn, groupId) {
        const action = btn.dataset.groupAction;
        const id = btn.dataset.id;

        if (action === 'view-group') {
            this.renderAdminGroupDetail(id);
            return;
        }

        if (action === 'delete-group') {
            const ok = confirm('XÓA VĨNH VIỄN group này? Toàn bộ thành viên, tin nhắn, trận đấu sẽ mất. Không thể hoàn tác.');
            if (!ok) return;
            btn.disabled = true;
            const result = await window.Groups.adminDeleteGroup(id);
            if (result.error) { alert(result.error); return; }
            this.renderAdminGroupsList();
            return;
        }

        if (action === 'remove-member') {
            const ok = confirm('Gỡ thành viên này khỏi group?');
            if (!ok) return;
            btn.disabled = true;
            const result = await window.Groups.adminRemoveMember(id);
            if (result.error) { alert(result.error); return; }
            this.renderAdminGroupDetail(groupId);
            return;
        }

        if (action === 'force-finish-battle') {
            const ok = confirm('Buộc kết thúc trận đấu này ngay bây giờ? Nếu trận đang 0-0 hoặc chưa ai chấp nhận, hành động này coi như hủy trận (không bên nào được cộng/trừ điểm).');
            if (!ok) return;
            btn.disabled = true;
            const result = await window.Groups.adminForceFinishBattle(id);
            if (result.error) { alert(result.error); return; }
            this.renderAdminGroupDetail(groupId);
            return;
        }

        if (action === 'delete-message') {
            const ok = confirm('Xóa tin nhắn này?');
            if (!ok) return;
            btn.disabled = true;
            const result = await window.Groups.adminDeleteMessage(id);
            if (result.error) { alert(result.error); return; }
            this.renderAdminGroupChat(groupId);
            return;
        }
    }
});
