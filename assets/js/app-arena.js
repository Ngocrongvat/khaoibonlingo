// app-arena.js — DuoClone methods split out of the former monolithic app.js.
// Attaches to DuoClone.prototype (defined in app.js). Load AFTER app.js and BEFORE
// app-main.js (which instantiates the app). Pure mechanical split - no behavior change.
Object.assign(DuoClone.prototype, {
    // Ranks by cumulative xp, not a resetting weekly counter - a leader nobody catches
    // up to simply keeps winning the Saturday prize, which is intended now (see
    // checkWeeklyReset()'s comment for the full reasoning).
    syncLeaderboardScore() {
        if (window.Leaderboard && this.state.currentUser) {
            window.Leaderboard.submitScore(this.state.currentUser, this.state.xp, this.state.streak, this.state.vibrancy || 0, this.state.lastActivityDate);
            window.Leaderboard.checkAndAwardWeeklyPrize().then(() => this.refreshTeddyBears());
            // Parallel, independent weekly prize track for streak - does not touch or
            // interact with the XP prize above at all (see checkAndAwardStreakPrize()'s
            // own comment on why it needs an explicit teddy-bear RPC).
            window.Leaderboard.checkAndAwardStreakPrize().then((winner) => {
                if (winner && window.ActivityFeed) {
                    window.ActivityFeed.postEvent('teddy_bear', winner.userId, winner.username, `🧸 ${winner.username} vừa nhận gấu bông vì giữ chuỗi ${winner.streak} ngày cao nhất tuần!`);
                }
                if (winner && this.state.profile && winner.userId === this.state.profile.id) {
                    this.refreshTeddyBears();
                }
            });
        }
        this.checkLevelUp();
    },

    async renderLeaderboard(sortBy = 'xp') {
        if (!this.state.currentUser) {
            alert("Vui lòng đăng nhập trước khi xem bảng xếp hạng!");
            return;
        }
        const tabs = [
            { key: 'xp', label: '⭐ XP' },
            { key: 'streak', label: '🔥 Chuỗi ngày' },
            { key: 'vibrancy', label: '⚡ Sôi nổi' },
            { key: 'teddy', label: '🧸 Gấu bông' }
        ];
        this.ui.container.innerHTML = `
            <div class="leaderboard-screen">
                <h2 style="text-align: center;">🏆 Bảng Xếp Hạng</h2>
                <p style="text-align: center; color: #777;">Đang tải...</p>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');

        let result = { configured: false, entries: [] };
        let king = null;
        if (window.Leaderboard) {
            // The king lookup rides along on every tab (cheap, 1-row) so the 👑 marker on
            // rows stays consistent; the big honor banner itself only shows on the XP tab.
            const kingPromise = window.Leaderboard.getLatestKing().catch(() => null);
            if (sortBy === 'streak') result = await window.Leaderboard.getStreakLeaderboard(50);
            else if (sortBy === 'vibrancy') result = await window.Leaderboard.getVibrancyLeaderboard(50);
            else if (sortBy === 'teddy') result = await window.Leaderboard.getTeddyLeaderboard(50);
            else result = await window.Leaderboard.fetchTop(50);
            king = await kingPromise;
            this.state.weeklyKing = king; // cache for the nav-avatar frame + user info card
            this.applyKingFrameToNav();
        }

        const valueLabel = (entry) => {
            if (sortBy === 'streak') return `🔥 ${entry.streak || 0} ngày`;
            if (sortBy === 'vibrancy') return `⚡ ${entry.vibrancy || 0} điểm`;
            if (sortBy === 'teddy') return `🧸 ${entry.teddy_bears || 0} gấu bông`;
            return `⭐ ${entry.xp || 0} XP`;
        };

        let bodyHtml;
        if (!result.configured) {
            bodyHtml = `<p style="text-align: center; color: #777;">Bảng xếp hạng đang được thiết lập, quay lại sau nhé!</p>`;
        } else if (result.error) {
            bodyHtml = sortBy === 'vibrancy'
                ? `<p style="text-align: center; color: #777;">Bảng Sôi nổi chưa sẵn sàng - quản trị viên cần chạy migration "self_service_inbox_vibrancy.sql" trên Supabase.</p>`
                : `<p style="text-align: center; color: #777;">Không thể tải bảng xếp hạng lúc này. Vui lòng thử lại sau.</p>`;
        } else if (!result.entries.length) {
            bodyHtml = sortBy === 'teddy'
                ? `<p style="text-align: center; color: #777;">Chưa ai có gấu bông. Dẫn đầu bảng XP hoặc Chuỗi ngày vào 19h thứ Bảy để nhận 🧸 đầu tiên!</p>`
                : `<p style="text-align: center; color: #777;">Chưa có ai trên bảng xếp hạng. Hãy là người đầu tiên!</p>`;
        } else {
            bodyHtml = `<div class="leaderboard-list">` + result.entries.map((entry, idx) => {
                const rank = idx + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                const isMe = entry.username === this.state.currentUser;
                const isKing = king && entry.username === king.username;
                return `<div class="leaderboard-row ${isMe ? 'me' : ''} ${isKing ? 'lb-king-row' : ''}">
                            <span class="lb-rank">${medal}</span>
                            <span class="lb-name">${isKing ? '<span class="lb-king-crown" title="Vị Vua Của Tuần">👑</span>' : ''}${isMe ? this.escapeHtml(entry.username) : this.clickableUsername(null, entry.username)}</span>
                            <span class="lb-xp">${valueLabel(entry)}</span>
                        </div>`;
            }).join('') + `</div>`;
        }

        // Honor banner - only on the XP tab (the king IS the weekly XP teddy winner).
        // The crown avatar frame in the banner is the same exclusive .king-frame the
        // winner wears on their nav avatar all week.
        let kingBannerHtml = '';
        if (sortBy === 'xp' && king) {
            const kingAvatar = king.avatarUrl
                ? `<img src="${king.avatarUrl}" alt="">`
                : `<span class="king-banner-fallback">🙂</span>`;
            kingBannerHtml = `
                <div class="king-banner">
                    <div class="king-banner-frame king-frame">${kingAvatar}</div>
                    <div class="king-banner-text">
                        <div class="king-banner-title">👑 VỊ VUA CỦA TUẦN</div>
                        <div class="king-banner-name">${this.clickableUsername(null, king.username)}</div>
                        <div class="king-banner-meta">🧸 ${this.escapeHtml(window.Leaderboard.formatWeekLabel(king.weekId))} · ${king.weeklyXp} XP</div>
                        <div class="king-banner-perk">Đặc quyền: khung avatar vua trong suốt tuần trị vì</div>
                    </div>
                </div>`;
        }

        const footNote = sortBy === 'vibrancy'
            ? '⚡ Điểm Sôi nổi tăng khi bạn hoạt động: học bài, luyện tập, thách đấu, chơi game và trò chuyện cùng cộng đồng.'
            : sortBy === 'teddy'
                ? '🧸 Gấu bông là phần thưởng vinh danh mỗi tuần: dẫn đầu bảng XP hoặc bảng Chuỗi ngày lúc 19h thứ Bảy để nhận. Tích lũy mãi mãi, không bị reset!'
                : '🧸 Người dẫn đầu lúc 19h thứ Bảy sẽ được tặng gấu bông và trở thành 👑 Vị Vua Của Tuần với khung avatar đặc quyền! Điểm không bị reset - nếu không ai vượt qua, người dẫn đầu vẫn tiếp tục được thưởng vào tuần sau.';

        this.ui.container.innerHTML = `
            <div class="leaderboard-screen">
                <h2 style="text-align: center;">🏆 Bảng Xếp Hạng</h2>
                <div class="game-picker-list" style="flex-direction:row; flex-wrap:wrap; justify-content:center; gap:8px; max-width:500px; margin:10px auto;">
                    ${tabs.map(t => `<button class="btn-secondary user-lb-tab-btn ${t.key === sortBy ? 'group-lb-tab-active' : ''}" data-sort="${t.key}" style="padding:8px 14px; font-size:13px;">${t.label}</button>`).join('')}
                </div>
                ${kingBannerHtml}
                ${bodyHtml}
                <p style="text-align: center; color: #999; font-size: 13px; margin-top: 15px;">${footNote}</p>
                <button class="btn-secondary" id="user-lb-groups-btn" style="display:block; margin: 10px auto 0; padding: 12px 24px;">🏰 BẢNG XẾP HẠNG GROUP</button>
                <button class="btn-primary" style="margin-top: 10px;" onclick="app.closeLeaderboard()">QUAY LẠI</button>
            </div>
        `;
        this.ui.container.querySelectorAll('.user-lb-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.renderLeaderboard(btn.dataset.sort));
        });
        document.getElementById('user-lb-groups-btn').addEventListener('click', () => this.renderGroupLeaderboards());
    },

    closeLeaderboard() {
        this.renderHomeDashboard();
    },

    renderGamePicker() {
        if (!this.state.currentUser) {
            alert("Vui lòng đăng nhập trước khi chơi game!");
            return;
        }
        this.ui.container.innerHTML = `
            <div class="game-screen">
                <h2 style="text-align: center;">🎮 Trò Chơi Luyện Từ Vựng</h2>
                <div class="game-picker-list">
                    <div class="game-picker-row">
                        <button class="btn-primary game-pick-btn" id="pick-word-match">⚡ Ghép Từ Nhanh</button>
                        <button class="btn-secondary game-pick-duel-btn" data-game-type="word_match" title="Đấu 1v1">⚔️</button>
                    </div>
                    <div class="game-picker-row">
                        <button class="btn-primary game-pick-btn" id="pick-memory">🧠 Lật Thẻ Nhớ Từ</button>
                        <button class="btn-secondary game-pick-duel-btn" data-game-type="memory" title="Đấu 1v1">⚔️</button>
                    </div>
                    <div class="game-picker-row">
                        <button class="btn-primary game-pick-btn" id="pick-odd-one-out">🔎 Từ Lạc Loài</button>
                        <button class="btn-secondary game-pick-duel-btn" data-game-type="odd_one_out" title="Đấu 1v1">⚔️</button>
                    </div>
                    <div class="game-picker-row">
                        <button class="btn-primary game-pick-btn" id="pick-reflex">⚡ Phản Xạ Từ Vựng</button>
                        <button class="btn-secondary game-pick-duel-btn" data-game-type="reflex" title="Đấu 1v1">⚔️</button>
                    </div>
                    <div class="game-picker-row">
                        <button class="btn-primary game-pick-btn" id="pick-picture-word">🖼️ Nhìn Hình Chọn Từ</button>
                        <button class="btn-secondary game-pick-duel-btn" data-game-type="picture_word" title="Đấu 1v1">⚔️</button>
                    </div>
                </div>
                <button class="btn-secondary" style="margin-top: 20px;" id="game-picker-close">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');

        document.getElementById('pick-word-match').addEventListener('click', () => this.launchWordMatchGame());
        document.getElementById('pick-memory').addEventListener('click', () => this.launchMemoryGame());
        document.getElementById('pick-odd-one-out').addEventListener('click', () => this.launchOddOneOutGame());
        document.getElementById('pick-reflex').addEventListener('click', () => this.launchReflexGame());
        document.getElementById('pick-picture-word').addEventListener('click', () => this.launchPictureWordGame());
        document.getElementById('game-picker-close').addEventListener('click', () => this.renderHomeDashboard());
        this.ui.container.querySelectorAll('.game-pick-duel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!this.state.currentUser) { alert('Vui lòng đăng nhập trước khi thi đấu 1v1!'); return; }
                this.renderDuelChallengeForm(btn.dataset.gameType);
            });
        });
    },

    // Difficulty fed to solo mini-games: beginners (first 10 chapters) get difficulty 1
    // (easy vocab + relaxed timers); otherwise it scales with the player's rank. Duels are
    // unaffected (they hand pre-generated rounds to the game).
    gameDifficulty() {
        return (this.isBeginnerMode() || (this.state.stats && this.state.stats.easyMode)) ? 1 : getRankInfo(this.state.xp).difficulty;
    },

    launchWordMatchGame() {
        if (window.Games) {
            Games.renderWordMatchGame(this.ui.container, {
                onRoundEnd: (matched, total) => this.applyGameReward(matched, total),
                onExit: () => this.renderGamePicker(),
                difficulty: this.gameDifficulty()
            });
        }
    },

    launchMemoryGame() {
        if (window.Games) {
            const userId = this.state.profile ? this.state.profile.id : 'guest';
            Games.renderMemoryGame(this.ui.container, {
                onRoundEnd: (matched, total) => this.applyGameReward(matched, total),
                onExit: () => this.renderGamePicker(),
                difficulty: this.gameDifficulty()
            }, userId);
        }
    },

    launchOddOneOutGame() {
        if (window.Games) {
            Games.renderOddOneOutGame(this.ui.container, {
                onRoundEnd: (matched, total) => this.applyGameReward(matched, total),
                onExit: () => this.renderGamePicker(),
                difficulty: this.gameDifficulty()
            });
        }
    },

    launchReflexGame() {
        if (window.Games) {
            Games.renderReflexGame(this.ui.container, {
                onRoundEnd: (matched, total) => this.applyGameReward(matched, total),
                onExit: () => this.renderGamePicker(),
                difficulty: this.gameDifficulty()
            });
        }
    },

    launchPictureWordGame() {
        if (window.Games) {
            Games.renderPictureWordGame(this.ui.container, {
                onRoundEnd: (matched, total) => this.applyGameReward(matched, total),
                onExit: () => this.renderGamePicker()
            });
        }
    },

    // Chapter-integrated communication scene: generated at runtime from the unit's own
    // vetted content (scenarios.js buildFromUnit). Isolated — does not affect
    // lesson/progress/hearts. Reached only from the path map, one unique scene per
    // chapter. IMPORTANT: never hide checkBtn via style.display here — the rest of the
    // app only ever disables it, and a display:none that relied on an exit callback to
    // undo once stuck forever when users left via the home button (bug 0fcdd79).
    launchUnitScenario(unitIdx) {
        if (!window.Scenarios) { alert('Tính năng đang tải, thử lại sau giây lát nhé!'); return; }
        const unit = this.state.courseData.units[unitIdx];
        if (!unit) return;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        if (this.ui.skipBtn) this.ui.skipBtn.style.display = 'none';
        window.Scenarios.openUnit(this.ui.container, unit, unitIdx, () => this.renderHomeDashboard());
    },

    applyGameReward(matched, total) {
        const ratio = total > 0 ? matched / total : 0;
        let reward = 0;
        if (ratio >= 1) reward = 3;
        else if (ratio >= 0.5) reward = 1;

        if (reward > 0 && this.state.currentUser) {
            const before = this.state.hearts;
            // Game rewards still respect the cap - but never REDUCE hearts that are
            // already above it (achievement bonuses may have pushed them past MAX).
            this.state.hearts = Math.max(this.state.hearts, Math.min(MAX_HEARTS, this.state.hearts + reward));
            const actualGained = this.state.hearts - before;
            this.updateHeartsDisplay();
            this.addVibrancy(3);
            this.saveUserProgress();
            if (actualGained > 0) {
                this.showHeartRewardToast(actualGained);
            }
        }
    },

    checkBadges() {
        if (!this.badgeTracker || !this.state.currentUser) return;
        const errStats = this.errorTracker ? this.errorTracker.getStats() : { totalCorrect: 0 };
        const snapshot = {
            streak: this.state.streak,
            xp: this.state.xp,
            teddyBears: this.state.teddyBears,
            totalCorrect: errStats.totalCorrect,
            perfectLessons: this.state.stats.perfectLessons,
            pronunciationCorrect: this.state.stats.pronunciationCorrect,
            courseCompleted: this.state.stats.courseCompleted,
            practiceSessions: this.state.stats.practiceSessions,
            assessmentsPassed: this.state.stats.assessmentsPassed,
            duelsPlayed: this.state.stats.duelsPlayed,
            duelWins: this.state.stats.duelWins,
            friendCount: this.state.friendCount || 0
        };
        const newBadges = this.badgeTracker.checkAndAward(snapshot);
        // Each unlocked achievement grants +5 hearts ON TOP of the normal cap -
        // deliberately NOT clamped to MAX_HEARTS (overflow hearts are fully usable;
        // only passive regen and game/gift rewards respect the cap, so the overflow
        // simply drains back down over time). completeLogin() was updated to stop
        // clamping stored hearts on load for the same reason.
        const BADGE_HEART_BONUS = 5;
        newBadges.forEach(b => {
            this.state.hearts += BADGE_HEART_BONUS;
            this.showBadgeToast(b, BADGE_HEART_BONUS);
            if (window.ActivityFeed && this.state.profile) {
                window.ActivityFeed.postEvent('badge', this.state.profile.id, this.state.currentUser, `🏅 ${this.state.currentUser} vừa mở khóa huy hiệu "${b.name}"!`);
            }
        });
        if (newBadges.length) {
            this.updateHeartsDisplay();
        }
        if (newBadges.length) {
            // Persist to Supabase right away - some call sites (e.g. checkAnswer()) already
            // ran saveUserProgress() before checkBadges(), so a newly earned badge would
            // otherwise sit unsaved until some unrelated later save.
            this.state.stats.earnedBadges = this.badgeTracker.earned;
            this.saveUserProgress();
        }
    },

    showBadgeToast(badge, heartBonus = 0) {
        const toast = document.createElement('div');
        toast.className = 'badge-toast';
        toast.innerHTML = `<span class="badge-toast-icon">${badge.icon}</span><div><strong>Huy hiệu mới!</strong><br>${this.escapeHtml(badge.name)}${heartBonus ? `<br><span style="color:var(--duo-red); font-weight:800;">+${heartBonus} ❤️ tim thưởng!</span>` : ''}</div>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3500);
        this.playTone('sparkle');
        // Lighter than the signup/level-up confetti bursts below - a badge can be earned
        // fairly often, so a smaller/quicker burst keeps it celebratory without becoming
        // visual noise on every lesson.
        if (window.confetti) {
            confetti({ particleCount: 60, spread: 55, origin: { y: 0.3 } });
        }
    },

    // Small rank-tier icon overlaid on the avatar corner, like a rank emblem on a
    // profile picture in a competitive game - recomputed from xp every time (see
    // getRankInfo()'s comment on why rank is never stored, only derived).
    updateRankBadge() {
        if (!this.ui.userBadgeRank) return;
        const rankInfo = getRankInfo(this.state.xp);
        this.ui.userBadgeRank.innerText = rankInfo.rankIcon;
        this.ui.userBadgeRank.title = rankInfo.label;
    },

    async renderAchievements() {
        if (!this.state.currentUser) {
            alert("Vui lòng đăng nhập trước khi xem thành tích!");
            return;
        }
        const badges = this.badgeTracker
            ? this.badgeTracker.getAllBadgesWithStatus()
            : BADGE_DEFINITIONS.map(b => ({ ...b, earned: false }));

        const badgeHtml = badges.map(b => `
            <div class="badge-item ${b.earned ? 'earned' : 'locked'}">
                <div class="badge-icon">${b.earned ? b.icon : '🔒'}</div>
                <div class="badge-name">${this.escapeHtml(b.name)}</div>
                <div class="badge-desc">${this.escapeHtml(b.description)}</div>
            </div>
        `).join('');

        this.ui.container.innerHTML = `
            <div class="achievements-screen">
                <h2 style="text-align: center;">🏅 Bảng Thành Tích</h2>
                <p style="text-align: center; color: #777; font-weight: 700;">🧸 Bạn đã có ${this.state.teddyBears} gấu bông</p>
                <div class="badge-grid">${badgeHtml}</div>
                <h2 style="text-align: center; margin-top: 30px;">🧸 Gấu Bông Vinh Danh Tuần</h2>
                <div class="leaderboard-list" id="teddy-list"><p style="text-align: center; color: #777;">Đang tải...</p></div>
                <button class="btn-secondary" id="view-certificates" style="display: block; margin: 20px auto 0;">🎖️ Chứng Chỉ Của Tôi</button>
                <button class="btn-primary" id="achievements-close" style="margin-top: 20px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('achievements-close').addEventListener('click', () => this.renderHomeDashboard());
        document.getElementById('view-certificates').addEventListener('click', () => this.renderCertificateHistory());

        const teddyListEl = document.getElementById('teddy-list');
        if (window.Leaderboard && window.Leaderboard.isConfigured) {
            const winners = await window.Leaderboard.getHallOfFame(10);
            if (teddyListEl) {
                teddyListEl.innerHTML = winners.length ? winners.map(w => `
                    <div class="leaderboard-row">
                        <span class="lb-rank">🧸</span>
                        <span class="lb-name">${this.clickableUsername(null, w.username)}</span>
                        <span class="lb-xp">${this.escapeHtml(window.Leaderboard.formatWeekLabel(w.week_id))} — ${w.weekly_xp} XP</span>
                    </div>
                `).join('') : `<p style="text-align: center; color: #777;">Chưa có ai được trao gấu bông. Hãy dẫn đầu bảng xếp hạng vào tối thứ 7!</p>`;
            }
        } else if (teddyListEl) {
            teddyListEl.innerHTML = `<p style="text-align: center; color: #777;">Bảng xếp hạng đang được thiết lập, quay lại sau nhé!</p>`;
        }
    }
});
