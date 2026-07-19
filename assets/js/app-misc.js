// app-misc.js — DuoClone methods split out of the former monolithic app.js.
// Attaches to DuoClone.prototype (defined in app.js). Load AFTER app.js and BEFORE
// app-main.js (which instantiates the app). Pure mechanical split - no behavior change.
Object.assign(DuoClone.prototype, {
    init() {
        if (!this.state.courseData) {
            this.ui.container.innerHTML = "<h1 style='color:red'>Lỗi load dữ liệu.</h1>";
            return;
        }

        // Single delegated listener for EVERY clickable username in the app, registered
        // once here rather than re-wired after each of the ~15 screens that display one -
        // any element anywhere (now or added later) with class "user-clickable" and
        // data-username (optionally data-user-id) automatically gets the action menu.
        document.body.addEventListener('click', (e) => {
            const target = e.target.closest('.user-clickable');
            if (!target) return;
            e.stopPropagation();
            const username = target.dataset.username;
            if (!username) return;
            this.showUserActionMenu(target, target.dataset.userId || null, username);
        });

        if (this.ui.checkBtn) {
            this.ui.checkBtn.onclick = () => this.checkAnswer();
        }
        if (this.ui.skipBtn) {
            this.ui.skipBtn.onclick = () => this.skipCurrentExercise();
        }
        if (this.ui.modalBtn) {
            this.ui.modalBtn.onclick = () => this.closeModal();
        }
        if (this.ui.closeLessonBtn) {
            this.ui.closeLessonBtn.onclick = () => this.handleSignOut();
        }
        if (this.ui.navMoreBtn && this.ui.navMoreMenu) {
            this.ui.navMoreBtn.onclick = (e) => {
                e.stopPropagation();
                this.ui.navMoreMenu.classList.toggle('hidden');
            };
            // Closes on any click elsewhere on the page, including on the menu's own
            // items (leaderboard/games/achievements/admin) right after their own
            // handler runs - simpler than repeating "close the menu" in each one.
            document.addEventListener('click', () => {
                this.ui.navMoreMenu.classList.add('hidden');
            });
            this.ui.navMoreMenu.addEventListener('click', (e) => e.stopPropagation());
            this.ui.navMoreMenu.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => this.ui.navMoreMenu.classList.add('hidden'));
            });
        }
        if (this.ui.homeBtn) {
            this.ui.homeBtn.onclick = () => this.renderHomeDashboard();
        }
        if (this.ui.userDisplay) {
            this.ui.userDisplay.onclick = () => this.renderAccountSettings();
        }
        if (this.ui.leaderboardBtn) {
            this.ui.leaderboardBtn.onclick = () => this.renderLeaderboard();
        }
        if (this.ui.gamesBtn) {
            this.ui.gamesBtn.onclick = () => this.renderGamePicker();
        }
        if (this.ui.practiceBtn) {
            this.ui.practiceBtn.onclick = () => this.startPracticeMode();
        }
        if (this.ui.assessmentBtn) {
            this.ui.assessmentBtn.onclick = () => this.startAssessment();
        }
        if (this.ui.ieltsBtn) {
            this.ui.ieltsBtn.onclick = () => this.renderIeltsMenu();
        }
        if (this.ui.duelBtn) {
            this.ui.duelBtn.onclick = () => this.renderDuelMenu();
        }
        if (this.ui.friendsBtn) {
            this.ui.friendsBtn.onclick = () => this.renderFriendsMenu();
        }
        if (this.ui.inboxBtn) {
            this.ui.inboxBtn.onclick = () => this.renderInboxMenu();
        }
        if (this.ui.groupsBtn) {
            this.ui.groupsBtn.onclick = () => this.renderGroupsMenu();
        }
        if (this.ui.onlineMembersBtn) {
            this.ui.onlineMembersBtn.onclick = () => this.renderOnlineMembers();
        }
        if (this.ui.achievementsBtn) {
            this.ui.achievementsBtn.onclick = () => this.renderAchievements();
        }
        if (this.ui.adminBtn) {
            this.ui.adminBtn.onclick = () => this.renderAdminDashboard();
        }

        this.renderAuthScreen();
    },

    async resumeSession() {
        if (!window.AuthService || !window.AuthService.isConfigured) return;
        // Arriving via the "quên mật khẩu" email link: Supabase puts type=recovery in
        // the URL hash and emits PASSWORD_RECOVERY once the recovery session is set up.
        // Both signals are checked because the hash can be consumed/cleared by the SDK
        // before this runs, and the event alone can fire after completeLogin() has
        // already navigated away.
        if (location.hash.includes('type=recovery')) {
            this.state.passwordRecoveryPending = true;
        }
        window.AuthService.onPasswordRecovery(() => {
            this.state.passwordRecoveryPending = true;
            this.renderPasswordResetScreen();
        });
        const session = await window.AuthService.getSession();
        if (session && session.user) {
            await this.completeLogin(session.user);
        }
    },

    async handleSignOut() {
        if (!this.state.currentUser) return;
        if (window.AuthService) {
            await window.AuthService.signOut();
        }
        location.reload();
    },

    loadLocalPosition(userId) {
        const saved = localStorage.getItem(`duo_position_${userId}`);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.state.currentUnitIdx = data.currentUnitIdx || 0;
                this.state.currentLessonIdx = data.currentLessonIdx || 0;
                this.state.currentExIdx = data.currentExIdx || 0;
                this.state.lastHeartUpdate = data.lastHeartUpdate || Date.now();
                // Bug fix: these were never persisted, so reloading mid-lesson while
                // some wrong answers were queued for end-of-lesson review silently wiped
                // the queue and reset reviewMode to false - but currentExIdx stayed
                // wherever it was (often already past the end of lesson.exercises, since
                // review mode only starts once the normal pass is done), so
                // getCurrentExercise() would return undefined and crash renderLesson().
                this.state.reviewQueue = Array.isArray(data.reviewQueue) ? data.reviewQueue : [];
                this.state.reviewMode = !!data.reviewMode;
            } catch (e) {
                this.state.lastHeartUpdate = Date.now();
            }
        } else {
            this.state.lastHeartUpdate = Date.now();
        }

        // Bug fix ("mất tiến trình khi đổi máy/mất localStorage"): the course position
        // used to live ONLY in this device's localStorage - a new device, a cleared
        // browser, or iOS's separate home-screen-app storage silently dropped the user
        // back to unit 1 even though their XP/streak (stored in the profile) survived.
        // The position now ALSO rides in profiles.stats.position (see
        // saveUserProgress()); on login, whichever of local vs server is FURTHER wins.
        // Adopting the further one is always safe - the path map has no replay, so a
        // position only ever moves forward.
        const server = this.state.stats && this.state.stats.position;
        if (server && typeof server.u === 'number') {
            const local = [this.state.currentUnitIdx, this.state.currentLessonIdx, this.state.currentExIdx];
            const remote = [server.u || 0, server.l || 0, server.e || 0];
            const serverFurther = remote[0] > local[0]
                || (remote[0] === local[0] && remote[1] > local[1])
                || (remote[0] === local[0] && remote[1] === local[1] && remote[2] > local[2]);
            if (serverFurther) {
                // clamp against the current course shape in case data evolved
                const units = this.state.courseData.units;
                this.state.currentUnitIdx = Math.min(remote[0], units.length);
                if (this.state.currentUnitIdx < units.length) {
                    const lessons = units[this.state.currentUnitIdx].lessons;
                    this.state.currentLessonIdx = Math.min(remote[1], lessons.length - 1);
                    this.state.currentExIdx = Math.min(remote[2], lessons[this.state.currentLessonIdx].exercises.length - 1);
                } else {
                    this.state.currentLessonIdx = 0;
                    this.state.currentExIdx = 0;
                }
                // the local review queue belonged to the older position - drop it
                this.state.reviewQueue = [];
                this.state.reviewMode = false;
            }
        }
        // Heart-regen clock survives storage loss the same way the position does:
        // when this device has no local record, fall back to the server copy
        // (stats.heartsT, saved alongside hearts) - otherwise a fresh device reset
        // the 15-minute wait to zero and offline accrual was lost, which read as
        // "tim không hồi" right after reinstalling the home-screen app.
        if (!saved && this.state.stats && typeof this.state.stats.heartsT === 'number') {
            this.state.lastHeartUpdate = this.state.stats.heartsT;
        }

        // From here on saveUserProgress() may write the position to the profile -
        // never before, or a pre-load save would clobber the server copy with 0/0/0.
        this.state.positionLoaded = true;
        this.saveLocalPosition();
        this.updateNav();
    },

    saveLocalPosition() {
        if (!this.state.profile) return;
        localStorage.setItem(`duo_position_${this.state.profile.id}`, JSON.stringify({
            currentUnitIdx: this.state.currentUnitIdx,
            currentLessonIdx: this.state.currentLessonIdx,
            currentExIdx: this.state.currentExIdx,
            lastHeartUpdate: this.state.lastHeartUpdate,
            reviewQueue: this.state.reviewQueue,
            reviewMode: this.state.reviewMode
        }));
    },

    saveUserProgress() {
        if (!this.state.profile) return;
        this.saveLocalPosition();

        if (window.AuthService) {
            // Course position rides in the same stats blob so a fresh device can
            // restore it (see loadLocalPosition()'s reconcile). Only once the local
            // position has actually been loaded - the whole stats blob is overwritten
            // on every save, so writing earlier would clobber the server copy with
            // the constructor's 0/0/0.
            if (this.state.positionLoaded) {
                this.state.stats.position = {
                    u: this.state.currentUnitIdx,
                    l: this.state.currentLessonIdx,
                    e: this.state.currentExIdx,
                    t: Date.now()
                };
                // regen clock saved WITH the hearts value so a fresh device can
                // resume accrual consistently (see loadLocalPosition()).
                this.state.stats.heartsT = this.state.lastHeartUpdate || Date.now();
            }
            // errorHistory rides along inside the same stats jsonb blob as earnedBadges/
            // certificates (no new SQL column) - piggybacking on this already-frequent
            // save path (called from ~18 sites across every mode) means the spaced-
            // repetition history syncs to Supabase without adding any new write traffic.
            const stats = this.errorTracker
                ? { ...this.state.stats, errorHistory: this.errorTracker.data }
                : this.state.stats;
            window.AuthService.updateProfile(this.state.profile.id, {
                hearts: this.state.hearts,
                xp: this.state.xp,
                weekly_xp: this.state.weeklyXp,
                streak: this.state.streak,
                last_activity_date: this.state.lastActivityDate,
                last_week_id: this.state.lastWeekId,
                stats
            });
        }
    },

    // No longer zeroes weeklyXp at the start of a new week - XP now accumulates forever
    // (it doubles as the rank/level progress meter, see getRankInfo()), and the
    // leaderboard/hall-of-fame ranks by that same cumulative total instead of a
    // resetting weekly counter. A leader who nobody catches up to just keeps winning
    // the weekly prize, which is the intended behavior now, not a bug. lastWeekId is
    // kept (still updated) only because checkAndAwardWeeklyPrize()'s own idempotency
    // check depends on distinguishing which week has already been awarded.
    checkWeeklyReset() {
        if (!window.Leaderboard || !window.Leaderboard.getWeekId) return;
        const currentWeekId = window.Leaderboard.getWeekId(new Date());
        if (this.state.lastWeekId !== currentWeekId) {
            this.state.lastWeekId = currentWeekId;
            this.saveUserProgress();
        }
    },

    startEnergyRegeneration() {
        setInterval(() => this.applyHeartRegen(), 60000);
    },

    // Rule-based mentor advice, not AI-backed (see MENTOR_TIPS comment). Situational
    // tips take priority over the daily rotating one, since "bạn sắp hết tim" is more
    // useful right now than a generic feature-discovery tip.
    getMentorTip() {
        const todayStr = new Date().toDateString();
        if (this.state.streak > 0 && this.state.lastActivityDate !== todayStr) {
            return `🔥 Bạn đang giữ chuỗi ${this.state.streak} ngày liên tiếp - học ngay hôm nay để không bị đứt chuỗi nhé!`;
        }
        if (this.state.hearts <= 5) {
            return `💔 Bạn sắp hết tim rồi (còn ${this.state.hearts}) - thử chơi 🎮 mini game để nhận thêm tim ngay lập tức!`;
        }
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        return MENTOR_TIPS[dayOfYear % MENTOR_TIPS.length];
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    },

    // Shared fuzzy-suggestion dropdown for any text input that expects a name
    // (username or group name). fetcher(query) -> [{label, value}]. Suggestions render
    // in a box right under the input; clicking one fills the input. Debounced so it
    // fires between keystrokes, not on every one.
    attachSuggestions(input, fetcher, onPick = null) {
        if (!input) return;
        const box = document.createElement('div');
        box.className = 'suggest-box hidden';
        input.insertAdjacentElement('afterend', box);
        let debounce = null;
        const close = () => { box.classList.add('hidden'); box.innerHTML = ''; };
        input.addEventListener('input', () => {
            clearTimeout(debounce);
            const q = input.value.trim();
            if (q.length < 2) { close(); return; }
            debounce = setTimeout(async () => {
                const items = await fetcher(q);
                if (!items.length || document.activeElement !== input) { close(); return; }
                box.innerHTML = items.map((it, i) => `<button type="button" class="suggest-item" data-idx="${i}">${this.escapeHtml(it.label)}</button>`).join('');
                box.classList.remove('hidden');
                box.querySelectorAll('.suggest-item').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const item = items[parseInt(btn.dataset.idx, 10)];
                        input.value = item.value;
                        close();
                        if (onPick) onPick(item);
                    });
                });
            }, 250);
        });
        // mousedown fires before the input's blur, so a click on a suggestion always
        // lands before this closes the box.
        input.addEventListener('blur', () => setTimeout(close, 200));
    },

    // Username flavor of attachSuggestions() - used by every "nhập tên người dùng"
    // form (duel challenge, new message, add friend).
    attachUserSuggestions(input, onPick = null) {
        if (!window.Friends || !window.Friends.searchUsers) return;
        const myName = this.state.currentUser;
        this.attachSuggestions(input, async (q) => {
            const users = await window.Friends.searchUsers(q, 8);
            return users.filter(u => u.username !== myName).map(u => ({ label: `👤 ${u.username}`, value: u.username, id: u.id }));
        }, onPick);
    },

    closeUserActionMenu() {
        const existing = document.getElementById('user-action-menu');
        if (existing) existing.remove();
        if (this._dismissUserActionMenu) {
            document.removeEventListener('click', this._dismissUserActionMenu);
            this._dismissUserActionMenu = null;
        }
    },

    async showUserActionMenu(anchorEl, userId, username) {
        // No point showing "challenge/message/friend yourself".
        if (username === this.state.currentUser || (this.state.profile && userId === this.state.profile.id)) return;
        if (!window.Friends || !this.state.currentUser) return;

        this.closeUserActionMenu();

        let resolvedId = userId;
        if (!resolvedId) {
            const found = await window.Friends.searchUserByUsername(username);
            if (found) resolvedId = found.id;
        }

        let alreadyFriends = false;
        if (resolvedId && this.state.profile) {
            alreadyFriends = await window.Friends.isFriend(this.state.profile.id, resolvedId);
        }

        // Re-check the anchor is still on screen (the async lookups above could easily
        // outlive a fast navigation away) before positioning a menu against it.
        if (!document.body.contains(anchorEl)) return;

        const rect = anchorEl.getBoundingClientRect();
        const menu = document.createElement('div');
        menu.className = 'user-action-menu';
        menu.id = 'user-action-menu';
        menu.style.top = (rect.bottom + window.scrollY + 6) + 'px';
        const menuWidth = 210;
        menu.style.left = Math.max(8, Math.min(rect.left + window.scrollX, window.innerWidth - menuWidth - 8)) + 'px';

        menu.innerHTML = `
            <div class="user-action-menu-header">${this.escapeHtml(username)}</div>
            <button class="user-action-menu-item" data-action="duel">⚔️ Thách đấu</button>
            <button class="user-action-menu-item" data-action="message">💬 Gửi tin nhắn</button>
            <button class="user-action-menu-item" data-action="info">ℹ️ Xem info</button>
            ${(resolvedId && !alreadyFriends) ? '<button class="user-action-menu-item" data-action="friend">👋 Kết bạn</button>' : ''}
        `;
        document.body.appendChild(menu);

        menu.querySelector('[data-action="duel"]').addEventListener('click', () => {
            this.closeUserActionMenu();
            this.renderGameTypePicker(username);
        });
        menu.querySelector('[data-action="message"]').addEventListener('click', () => {
            this.closeUserActionMenu();
            if (!resolvedId) { alert('Không tìm thấy người dùng này.'); return; }
            this.renderConversation(resolvedId, username);
        });
        menu.querySelector('[data-action="info"]').addEventListener('click', () => {
            this.closeUserActionMenu();
            this.renderUserInfo(username);
        });
        const friendBtn = menu.querySelector('[data-action="friend"]');
        if (friendBtn) {
            friendBtn.addEventListener('click', async () => {
                this.closeUserActionMenu();
                const result = await window.Friends.sendFriendRequest(this.state.profile, username);
                alert(result.error || 'Đã gửi lời mời kết bạn!');
            });
        }

        // Deferred by one tick so the SAME click that opened the menu (which is still
        // bubbling up to document when this runs) doesn't immediately close it again.
        setTimeout(() => {
            this._dismissUserActionMenu = (e) => {
                if (!menu.contains(e.target)) this.closeUserActionMenu();
            };
            document.addEventListener('click', this._dismissUserActionMenu);
        }, 0);
    },

    bindExerciseEvents(ex) {
        const optionBasedTypes = ['multiple_choice', 'listening', 'preposition', 'fill_blank', 'synonym', 'meaning', 'reading', 'dialogue'];
        if (optionBasedTypes.includes(ex.type)) {
            this.ui.container.querySelectorAll('.option-card').forEach((el, i) => {
                el.addEventListener('click', () => this.selectOption(i, el));
            });
            if (ex.type === 'listening') {
                const listenBtn = document.getElementById('listen-btn');
                if (listenBtn) listenBtn.addEventListener('click', () => this.playAudio(ex.options[ex.correct]));
                const listenSlowBtn = document.getElementById('listen-slow-btn');
                if (listenSlowBtn) listenSlowBtn.addEventListener('click', () => this.playAudioSlow(ex.options[ex.correct]));
            }
        } else if (ex.type === 'translate' || ex.type === 'ordering') {
            const words = ex.options || ex.shuffled;
            this.ui.container.querySelectorAll('.word-bank .word-chip').forEach((el, i) => {
                el.addEventListener('click', () => this.addWord(words[i], el));
            });
        } else if (ex.type === 'pronunciation') {
            const listenBtn = document.getElementById('listen-btn');
            if (listenBtn) listenBtn.addEventListener('click', () => this.playAudio(ex.target));
            const listenSlowBtn = document.getElementById('listen-slow-btn');
            if (listenSlowBtn) listenSlowBtn.addEventListener('click', () => this.playAudioSlow(ex.target));
            const micBtn = document.getElementById('mic-btn');
            if (micBtn) micBtn.addEventListener('click', () => this.startRecording());
        } else if (ex.type === 'dictation') {
            const phase = this.state.dictationPhase || 0;
            const listenBtn = document.getElementById('listen-btn');
            if (listenBtn) listenBtn.addEventListener('click', () => this.playAudio(ex.target));
            const listenSlowBtn = document.getElementById('listen-slow-btn');
            if (listenSlowBtn) listenSlowBtn.addEventListener('click', () => this.playAudioSlow(ex.target));
            if (phase === 0) {
                const bank = this.dictationWordBank(ex);
                this.ui.container.querySelectorAll('.word-bank .word-chip').forEach((el, i) => {
                    el.addEventListener('click', () => this.addWord(bank[i], el));
                });
                this.playAudio(ex.target);
            } else if (phase === 1) {
                const input = document.getElementById('dictation-input');
                if (input) {
                    input.addEventListener('input', () => {
                        this.state.dictationText = input.value;
                        const hasText = input.value.trim().length > 0;
                        this.ui.checkBtn.disabled = !hasText;
                        this.ui.checkBtn.classList.toggle('active', hasText);
                    });
                }
                this.playAudio(ex.target);
            } else {
                const micBtn = document.getElementById('mic-btn');
                if (micBtn) micBtn.addEventListener('click', () => this.startRecording());
            }
        } else if (ex.type === 'matching') {
            this.ui.container.querySelectorAll('#match-left .match-card').forEach(el => {
                el.addEventListener('click', () => this.onMatchLeftClick(el));
            });
            this.ui.container.querySelectorAll('#match-right .match-card').forEach(el => {
                el.addEventListener('click', () => this.onMatchRightClick(el, ex));
            });
        } else if (ex.type === 'listening_comprehension') {
            const listenBtn = document.getElementById('listen-btn');
            if (listenBtn) listenBtn.addEventListener('click', () => this.playAudio(ex.audioText));
            const listenSlowBtn = document.getElementById('listen-slow-btn');
            if (listenSlowBtn) listenSlowBtn.addEventListener('click', () => this.playAudioSlow(ex.audioText));

            const typeBtn = document.getElementById('mode-type-btn');
            const speakBtn = document.getElementById('mode-speak-btn');
            const typePanel = document.getElementById('comprehension-type-panel');
            const speakPanel = document.getElementById('comprehension-speak-panel');
            const setMode = (mode) => {
                this.state.comprehensionMode = mode;
                typeBtn.classList.toggle('active', mode === 'type');
                speakBtn.classList.toggle('active', mode === 'speak');
                typePanel.style.display = mode === 'type' ? '' : 'none';
                speakPanel.style.display = mode === 'speak' ? '' : 'none';
                const hasAnswer = mode === 'type'
                    ? this.state.comprehensionText.trim().length > 0
                    : !!this.state.recognizedSpeech;
                this.ui.checkBtn.disabled = !hasAnswer;
                this.ui.checkBtn.classList.toggle('active', hasAnswer);
            };
            if (typeBtn) typeBtn.addEventListener('click', () => setMode('type'));
            if (speakBtn) speakBtn.addEventListener('click', () => setMode('speak'));

            const input = document.getElementById('comprehension-input');
            if (input) {
                input.addEventListener('input', () => {
                    this.state.comprehensionText = input.value;
                    if (this.state.comprehensionMode === 'type') {
                        const hasText = input.value.trim().length > 0;
                        this.ui.checkBtn.disabled = !hasText;
                        this.ui.checkBtn.classList.toggle('active', hasText);
                    }
                });
            }
            const micBtn = document.getElementById('mic-btn');
            if (micBtn) micBtn.addEventListener('click', () => this.startRecording());
        }
    },

    onMatchLeftClick(el) {
        const ms = this.state.matchingState;
        if (!ms || ms.matchedIds.has(el.dataset.id)) return;
        this.ui.container.querySelectorAll('#match-left .match-card').forEach(c => c.classList.remove('selected'));
        ms.selectedLeftId = el.dataset.id;
        el.classList.add('selected');
    },

    onMatchRightClick(el, ex) {
        const ms = this.state.matchingState;
        if (!ms || !ms.selectedLeftId || ms.matchedIds.has(el.dataset.id)) return;
        const leftId = ms.selectedLeftId;
        const rightId = el.dataset.id;
        const leftEl = Array.from(this.ui.container.querySelectorAll('#match-left .match-card'))
            .find(c => c.dataset.id === leftId);
        if (leftId === rightId) {
            ms.matchedIds.add(leftId);
            if (leftEl) leftEl.classList.add('matched');
            el.classList.add('matched');
            if (leftEl) this.drawMatchConnection(leftEl, el);
            ms.selectedLeftId = null;
            if (ms.matchedIds.size === ex.pairs.length) {
                this.ui.checkBtn.disabled = false;
                this.ui.checkBtn.classList.add('active');
            }
        } else {
            ms.mistakenIds.add(leftId);
            ms.mistakenIds.add(rightId);
            el.classList.add('wrong');
            if (leftEl) leftEl.classList.add('wrong');
            setTimeout(() => {
                el.classList.remove('wrong');
                if (leftEl) leftEl.classList.remove('wrong');
            }, 400);
            ms.selectedLeftId = null;
        }
    },

    drawMatchConnection(leftEl, rightEl) {
        const svg = document.getElementById('match-svg');
        const area = document.getElementById('match-area');
        if (!svg || !area) return;
        const areaRect = area.getBoundingClientRect();
        svg.setAttribute('viewBox', `0 0 ${areaRect.width} ${areaRect.height}`);
        const leftRect = leftEl.getBoundingClientRect();
        const rightRect = rightEl.getBoundingClientRect();
        const x1 = leftRect.right - areaRect.left;
        const y1 = leftRect.top + leftRect.height / 2 - areaRect.top;
        const x2 = rightRect.left - areaRect.left;
        const y2 = rightRect.top + rightRect.height / 2 - areaRect.top;
        const midX = (x1 + x2) / 2;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
        path.setAttribute('class', 'match-line');
        svg.appendChild(path);
    },

    // Spells out a number (0-9999) in English words, matching how course targets are
    // written - used to reconcile speech-recognition output with the expected text.
    numberToEnglishWords(n) {
        const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
            'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
        const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
        if (n < 0 || n > 9999 || !Number.isInteger(n)) return String(n);
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
        if (n < 1000) return ones[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + this.numberToEnglishWords(n % 100) : '');
        return this.numberToEnglishWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + this.numberToEnglishWords(n % 1000) : '');
    },

    // Bug fix: speech recognition returns DIGITS for spoken numbers ("seven o'clock"
    // comes back as "7 o'clock" or even "7:00"), while course targets are written in
    // words - a correct reading of a short target like "Three" scored 20% and was
    // marked wrong. Normalization now (1) drops apostrophes so o'clock == oclock,
    // (2) expands H:MM clock times, and (3) spells out standalone digits, so both
    // sides of the comparison land on the same word form. Also applies to dictation
    // and spoken comprehension answers, which share this normalizer.
    normalizeSpeech(text) {
        return (text || '')
            .toLowerCase()
            .replace(/['’]/g, '')
            .replace(/(\d{1,2}):(\d{2})\b/g, (m, h, mm) => {
                const hour = this.numberToEnglishWords(parseInt(h, 10));
                const mins = parseInt(mm, 10);
                return mins === 0 ? `${hour} oclock` : `${hour} ${this.numberToEnglishWords(mins)}`;
            })
            .replace(/[^\w\s]/g, ' ')
            .replace(/\d+/g, (m) => this.numberToEnglishWords(parseInt(m, 10)))
            .replace(/\s+/g, ' ')
            .trim();
    },

    playTone(type) {
        // Mascot reactions play as real sound-effect FILES via MascotVoice
        // (assets/sounds/). The old oscillator "synth" sounds were removed; this
        // just forwards the reaction name and stays silent if a file is missing.
        // Returns the audio element (for callers that sync animation to playback).
        if (window.MascotVoice) return window.MascotVoice.play(type);
        return null;
    },

    selectOption(idx, el) {
        this.state.selectedOption = idx;
        document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        this.ui.checkBtn.disabled = false;
        this.ui.checkBtn.classList.add('active');
    },

    addWord(word, el) {
        this.state.currentAnswer.push(word);
        el.classList.add('used');
        const slot = document.getElementById('answer-slot');
        const chip = document.createElement('div');
        chip.className = 'word-chip';
        chip.innerText = word;
        chip.onclick = () => this.removeWord(word, chip, el);
        slot.appendChild(chip);
        this.ui.checkBtn.disabled = false;
        this.ui.checkBtn.classList.add('active');
    },

    removeWord(word, chip, originalEl) {
        this.state.currentAnswer = this.state.currentAnswer.filter(w => w !== word);
        chip.remove();
        originalEl.classList.remove('used');
    },

    // ============== Session answer log (powers the "Tổng kết" summary screens) ==============
    // One record per distinct question answered in the current session (lesson, practice,
    // assessment, placement or lesson-duel). A question re-answered during review updates
    // its existing record (final verdict) but keeps hadMistake=true so the summary can
    // show it needed a retry.

    resetSessionAnswers() {
        this.state.sessionAnswers = [];
    },

    describeQuestionForSummary(ex) {
        if (!ex) return '';
        if (ex.type === 'translate') return `Dịch: "${ex.source || ''}"`;
        if (ex.type === 'ordering') return `Sắp xếp câu: "${ex.sentence || ''}"`;
        if (ex.type === 'preposition' || ex.type === 'fill_blank') return `Điền vào chỗ trống: "${ex.sentence || ''}"`;
        if (ex.type === 'matching') return 'Nối các cặp từ tương ứng';
        if (ex.type === 'listening') return 'Nghe và chọn từ/câu đúng';
        if (ex.type === 'dictation') return 'Nghe và gõ lại câu';
        if (ex.type === 'pronunciation') return `Phát âm: "${ex.target || ''}"`;
        return ex.question || '';
    },

    describeCorrectAnswerForSummary(ex) {
        if (!ex) return '';
        const optionBasedTypes = ['multiple_choice', 'listening', 'preposition', 'fill_blank', 'synonym', 'meaning', 'reading', 'dialogue'];
        if (optionBasedTypes.includes(ex.type)) return ex.options && ex.options[ex.correct] != null ? String(ex.options[ex.correct]) : '';
        if (ex.type === 'translate' || ex.type === 'ordering') return Array.isArray(ex.correct) ? ex.correct.join(' ') : '';
        if (ex.type === 'pronunciation' || ex.type === 'dictation') return ex.target || '';
        if (ex.type === 'matching') return (ex.pairs || []).map(p => `${p.en} = ${p.vi}`).join('  ·  ');
        if (ex.type === 'listening_comprehension') return (ex.acceptedAnswers && ex.acceptedAnswers[0]) || '';
        return '';
    },

    // Captures what the user actually submitted for the CURRENT exercise - must be
    // called from checkAnswer() while the per-exercise input state is still populated
    // (it gets wiped on the next renderLesson()).
    captureUserAnswerForSummary(ex) {
        if (!ex) return '';
        const optionBasedTypes = ['multiple_choice', 'listening', 'preposition', 'fill_blank', 'synonym', 'meaning', 'reading', 'dialogue'];
        if (optionBasedTypes.includes(ex.type)) {
            return this.state.selectedOption != null && ex.options ? String(ex.options[this.state.selectedOption]) : '';
        }
        if (ex.type === 'translate' || ex.type === 'ordering') return (this.state.currentAnswer || []).join(' ');
        if (ex.type === 'pronunciation') return this.state.recognizedSpeech || '';
        if (ex.type === 'dictation') {
            const phase = this.state.dictationPhase || 0;
            if (phase === 0) return (this.state.currentAnswer || []).join(' ');
            if (phase === 1) return this.state.dictationText || '';
            return this.state.recognizedSpeech || '';
        }
        if (ex.type === 'matching') {
            const ms = this.state.matchingState;
            return ms && ms.mistakenIds.size === 0 ? 'Nối đúng tất cả' : 'Có lần nối sai';
        }
        if (ex.type === 'listening_comprehension') {
            return (this.state.comprehensionMode === 'speak' ? this.state.recognizedSpeech : this.state.comprehensionText) || '';
        }
        return '';
    },

    recordSessionAnswer(ex, isCorrect, userAnswer) {
        if (!ex) return;
        if (!Array.isArray(this.state.sessionAnswers)) this.state.sessionAnswers = [];
        // The id alone isn't a safe dedup key: generated exercises use
        // Date.now()+random ids that can collide within one batch - include the
        // question content so two distinct questions can never merge into one row.
        const key = `${ex.id || ''}|${ex.type}|${ex.question || ''}|${ex.target || ex.sentence || ex.source || ''}`;
        const existing = this.state.sessionAnswers.find(r => r.key === key);
        if (existing) {
            existing.isCorrect = isCorrect;
            existing.userAnswer = userAnswer;
            existing.hadMistake = existing.hadMistake || !isCorrect;
            return;
        }
        this.state.sessionAnswers.push({
            key,
            question: this.describeQuestionForSummary(ex),
            correctAnswer: this.describeCorrectAnswerForSummary(ex),
            userAnswer,
            isCorrect,
            hadMistake: !isCorrect
        });
    },

    // Shared summary block rendered at the end of every question-based session,
    // including duels - lists each question with the user's answer vs. the correct one.
    sessionSummaryHtml() {
        const records = this.state.sessionAnswers || [];
        if (!records.length) return '';
        const correctCount = records.filter(r => r.isCorrect).length;
        const rows = records.map((r, i) => `
            <div class="summary-row ${r.isCorrect ? 'summary-correct' : 'summary-wrong'}">
                <div class="summary-row-head">
                    <span class="summary-verdict">${r.isCorrect ? '✅' : '❌'}</span>
                    <span class="summary-question">Câu ${i + 1}: ${this.escapeHtml(r.question)}</span>
                    ${r.isCorrect && r.hadMistake ? '<span class="summary-retry-note">(đúng sau khi ôn lại)</span>' : ''}
                </div>
                ${r.userAnswer ? `<div class="summary-line">Bạn trả lời: <strong>${this.escapeHtml(r.userAnswer)}</strong></div>` : ''}
                <div class="summary-line">Đáp án đúng: <strong class="summary-answer">${this.escapeHtml(r.correctAnswer)}</strong></div>
            </div>
        `).join('');
        return `
            <div class="session-summary">
                <h3 class="session-summary-title">📋 Tổng kết đáp án (${correctCount}/${records.length} đúng)</h3>
                <div class="session-summary-list">${rows}</div>
            </div>
        `;
    },

    // In-app confirmation dialog replacing native confirm() for flows that must NEVER
    // silently stop working: browsers offer a "block additional dialogs" checkbox that
    // makes every later confirm() auto-return false with no visible prompt - which is
    // exactly the "skip sometimes does nothing" instability users hit. A DOM-based
    // dialog can't be suppressed that way.
    showConfirmDialog(message, onConfirm, options = {}) {
        const existing = document.getElementById('app-confirm-overlay');
        if (existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.id = 'app-confirm-overlay';
        overlay.className = 'app-confirm-overlay';
        overlay.innerHTML = `
            <div class="app-confirm-box">
                <p class="app-confirm-msg">${this.escapeHtml(message)}</p>
                <div class="app-confirm-actions">
                    <button class="btn-primary" data-action="ok">${this.escapeHtml(options.okLabel || 'ĐỒNG Ý')}</button>
                    <button class="btn-secondary" data-action="cancel">${this.escapeHtml(options.cancelLabel || 'HỦY')}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        // Once-only resolution: rapid double/triple clicks on OK must not re-run the
        // confirmed action (listeners still fire on the detached button otherwise).
        let resolved = false;
        const close = () => { resolved = true; overlay.remove(); };
        overlay.querySelector('[data-action="ok"]').addEventListener('click', () => {
            if (resolved) return;
            close();
            onConfirm();
        });
        overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    },

    performSkip(isLastBeforeLessonComplete, SKIP_XP_PENALTY) {
        this.skipInFlight = true;
        try {
            this.performSkipInner(isLastBeforeLessonComplete, SKIP_XP_PENALTY);
        } finally {
            this.skipInFlight = false;
        }
    },

    performSkipInner(isLastBeforeLessonComplete, SKIP_XP_PENALTY) {
        const rankBefore = getRankInfo(this.state.xp).rankIndex;
        this.state.xp = Math.max(0, this.state.xp - SKIP_XP_PENALTY);
        this.ui.xp.innerText = this.state.xp;
        this.checkRankDemotion(rankBefore);

        const ex = this.getCurrentExercise();
        if (ex) this.recordSessionAnswer(ex, false, '(đã bỏ qua)');
        if (ex && this.errorTracker) {
            if (ex.type === 'matching') {
                (ex.pairs || []).forEach(pair => this.errorTracker.recordResult(pair.en, false));
            } else if (ex.type === 'listening_comprehension' && ex.meta) {
                this.errorTracker.recordResult(`${ex.meta.templateId}_${ex.meta.questionIdx}`, false);
            } else {
                const key = (ex.meta && (ex.meta.wordEn || ex.meta.answer)) || ex.id;
                this.errorTracker.recordResult(key, false);
            }
        }

        this.saveUserProgress();

        if (this.state.mode === 'practice') { this.nextPracticeExercise(); return; }
        if (this.state.mode === 'assessment') { this.nextAssessmentExercise(); return; }
        if (this.state.mode === 'placement') { this.nextPlacementExercise(); return; }

        if (this.state.reviewMode) {
            // Bug fix (the "stuck in the lesson" complaint): skipping during review used
            // to send the question to the BACK of the queue like a wrong answer does -
            // so a user skipping their way through review just rotated the same queue
            // forever and the lesson could never end. A skip is paid for with XP, so it
            // now REMOVES the question from the queue: every skip strictly reduces the
            // remaining work and the lesson always terminates.
            this.state.reviewQueue.shift();
            if (this.state.reviewQueue.length === 0) {
                this.state.reviewMode = false;
                this.finishLessonCompletion(true);
                return;
            }
            this.saveUserProgress();
            this.renderLesson();
            return;
        }

        if (isLastBeforeLessonComplete) {
            // Nothing else pending - finish the lesson right away instead of queueing
            // this exercise into review (which would just loop back to it again).
            this.finishLessonCompletion(true);
            return;
        }

        // Regular curriculum lesson: queue for review like a wrong answer, then advance.
        this.state.stats.lessonWrongCount = (this.state.stats.lessonWrongCount || 0) + 1;
        this.state.reviewQueue.push(ex);
        this.nextExercise();
    },

    showResultModal(correct) {
        this.ui.modal.classList.remove('hidden');
        const mascot = this.ui.modalMascot;
        if (correct) {
            // Rotate through a few delighted faces + reaction animations + accessories
            // so the reward never feels repetitive - each right answer is a small
            // "surprise & delight" for young learners.
            const happyMoods = ['excited', 'giggle', 'love', 'wink', 'party', 'laugh', 'cool', 'blush', 'starstruck'];
            const happyAnims = ['mascot-pop-happy', 'mascot-dance', 'mascot-spin-pop'];
            const accessories = ['🌟', '✨', '💛', '🎉', '🥳', '😄', '🤩', '💯'];
            const mood = pickRandom(happyMoods);
            if (mascot) {
                mascot.className = 'mascot ' + pickRandom(happyAnims);
                mascot.innerHTML = getMascotSvg(mood, 68) + `<span class="mascot-accessory">${pickRandom(accessories)}</span>`;
                this.spawnMascotParticles(mascot, moodParticles(mood), 9);
            }
            // --- EXTRA "explosion" layer on top of the existing reward effects ---
            this.burstCorrect(mascot);
            this.ui.modalIcon.innerText = "✅";
            this.ui.modalTitle.innerText = pickRandom(['Chính xác!', 'Tuyệt vời!', 'Giỏi quá!', 'Xuất sắc!']);
            this.ui.modalTitle.style.color = "var(--duo-green)";
            this.ui.modalMsg.innerText = pickRandom(HAPPY_MESSAGES);
            this.ui.modalBtn.className = "btn-primary";
        } else {
            const sadMoods = ['surprised', 'teary', 'pout', 'dizzy', 'sob'];
            const sadAnims = ['mascot-wobble-sad', 'mascot-cry-shake'];
            const sadMood = pickRandom(sadMoods);
            if (mascot) {
                mascot.className = 'mascot ' + pickRandom(sadAnims);
                mascot.innerHTML = getMascotSvg(sadMood, 68) + `<span class="mascot-accessory">${pickRandom(['💫', '💧', '😢', '😵', '🥺'])}</span>`;
            }
            this.ui.modalIcon.innerText = "❌";
            this.ui.modalTitle.innerText = pickRandom(['Ôi tiếc quá!', 'Suýt rồi!', 'Thử lại nhé!', 'Chưa đúng!']);
            this.ui.modalTitle.style.color = "var(--duo-red)";
            this.ui.modalMsg.innerText = pickRandom(SAD_MESSAGES);
            this.ui.modalBtn.className = "btn-secondary";
        }
    },

    // Extra "explosion" of juice layered ON TOP of the normal correct-answer
    // reward (the modal mascot pop + particles are untouched): a confetti pop, a
    // second louder burst of explosive emojis, an expanding shockwave ring around
    // the mascot, and a shiny 'sparkle' sound stacked over the 'ding'.
    burstCorrect(mascot) {
        // layered sound: the shiny sparkle over the base ding = a fuller "pop"
        this.playTone('sparkle');
        // full-screen confetti pop (canvas-confetti, same lib the finale uses)
        if (window.confetti) {
            window.confetti({ particleCount: 70, spread: 80, startVelocity: 45, ticks: 120, origin: { y: 0.55 }, scalar: 0.9 });
            window.confetti({ particleCount: 30, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
            window.confetti({ particleCount: 30, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
        }
        if (mascot) {
            // a bigger, more explosive emoji burst on top of the existing one
            this.spawnMascotParticles(mascot, ['💥', '🎉', '✨', '⭐', '🌟', '🎊'], 12);
            // expanding shockwave ring
            const ring = document.createElement('span');
            ring.className = 'correct-shockwave';
            mascot.appendChild(ring);
            setTimeout(() => ring.remove(), 700);
        }
    },

    closeModal() {
        this.ui.modal.classList.add('hidden');
        const correct = this.ui.modalTitle.style.color === "var(--duo-green)";

        if (this.state.mode === 'practice') {
            if (correct) {
                this.nextPracticeExercise();
            } else {
                this.renderLesson();
            }
            return;
        }

        if (this.state.mode === 'assessment') {
            if (correct) this.state.assessmentCorrect++;
            this.nextAssessmentExercise();
            return;
        }

        if (this.state.mode === 'placement') {
            if (correct) this.state.assessmentCorrect++;
            this.nextPlacementExercise();
            return;
        }

        if (this.state.mode === 'duel') {
            if (correct) this.state.duelCorrect++;
            this.nextDuelExercise();
            return;
        }

        if (this.state.hearts <= 0) {
            this.renderOutOfHearts();
            return;
        }

        if (this.state.reviewMode) {
            if (correct) {
                this.state.reviewQueue.shift();
                if (this.state.reviewQueue.length === 0) {
                    this.state.reviewMode = false;
                    this.finishLessonCompletion();
                } else {
                    // Persist here too, not just on the initial miss - otherwise a reload
                    // partway through review resurrects an already-cleared queue entry
                    // (see loadLocalPosition()'s reviewQueue/reviewMode restore).
                    this.saveUserProgress();
                    this.renderLesson();
                }
            } else {
                this.renderLesson();
            }
            return;
        }

        // First pass through the lesson: right or wrong, always move forward.
        // Wrong answers were already queued for review in checkAnswer().
        this.nextExercise();
    },

    nextExercise() {
        const unit = this.state.courseData.units[this.state.currentUnitIdx];
        const lesson = unit.lessons[this.state.currentLessonIdx];
        this.state.currentExIdx++;

        if (this.state.currentExIdx >= lesson.exercises.length) {
            if (this.state.reviewQueue.length > 0) {
                this.state.reviewMode = true;
                this.saveUserProgress();
                this.renderLesson();
                return;
            }
            this.finishLessonCompletion();
            return;
        }
        this.saveUserProgress();
        this.renderLesson();
    },

    // skippedReward=true means the user skipped the lesson's last remaining question
    // instead of answering it (see skipCurrentExercise()) - they still move on to the
    // next lesson, but without the completion celebration or XP/streak reward, since
    // that last question was the actual condition for "completing" this lesson.
    finishLessonCompletion(skippedReward = false) {
        const unit = this.state.courseData.units[this.state.currentUnitIdx];
        const completedLessonIdx = this.state.currentLessonIdx;
        const completedLessonTitle = unit.lessons[completedLessonIdx] ? unit.lessons[completedLessonIdx].title : '';
        if (!skippedReward) {
            if (window.confetti) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
            if (this.state.stats.lessonWrongCount === 0) {
                this.state.stats.perfectLessons++;
            }
        }
        this.state.stats.lessonWrongCount = 0;
        this.state.reviewQueue = [];
        this.state.reviewMode = false;
        if (!skippedReward) this.awardLessonCompletion();
        this.checkBadges();
        this.state.currentLessonIdx++;
        this.state.currentExIdx = 0;
        if (this.state.currentLessonIdx >= unit.lessons.length) {
            this.state.currentUnitIdx++;
            this.state.currentLessonIdx = 0;
        }
        this.saveUserProgress();
        this.renderLessonSummary(skippedReward, completedLessonTitle, { unit, lessonIdx: completedLessonIdx });
    },

    // "Cốt lõi bài học": the concrete words/sentences this lesson taught, distilled
    // from its own exercises (EN + VI where the exercise carries both).
    buildLessonCoreSummary(lesson) {
        if (!lesson) return [];
        const items = [];
        const seen = new Set();
        const add = (en, vi) => {
            const key = (en || '').toLowerCase().trim();
            if (!key || seen.has(key)) return;
            seen.add(key);
            items.push({ en, vi: vi || '' });
        };
        lesson.exercises.forEach(e => {
            if (e.type === 'multiple_choice' && Array.isArray(e.options)) {
                const m = /How do you say '([^']+)'\?/.exec(e.question || '');
                add(String(e.options[e.correct]), m ? m[1] : '');
            } else if (e.type === 'listening' && Array.isArray(e.options)) {
                add(String(e.options[e.correct]), '');
            } else if (e.type === 'translate') add(e.target, e.source);
            else if (e.type === 'ordering') add(e.sentence, e.source);
            else if (e.type === 'pronunciation' || e.type === 'dictation') add(e.target, '');
            else if (e.type === 'preposition' && Array.isArray(e.options)) {
                add((e.sentence || '').replace('___', String(e.options[e.correct]).toUpperCase()), '');
            }
        });
        return items.slice(0, 8);
    },

    lessonCoreSummaryHtml(coreItems) {
        if (!coreItems || !coreItems.length) return '';
        return `
            <div class="core-summary">
                <h3 class="core-summary-title">🌟 Cốt lõi bài học</h3>
                <ul class="core-summary-list">
                    ${coreItems.map(it => `<li><strong>${this.escapeHtml(it.en)}</strong>${it.vi ? ` — ${this.escapeHtml(it.vi)}` : ''}</li>`).join('')}
                </ul>
            </div>
        `;
    },

    // Fanfare + confetti + floating particles for a completion moment. `happy=false`
    // keeps a gentler sound for the "didn't quite make it" screens.
    playBigCelebration(happy = true) {
        if (!happy) { this.playTone('whimper'); return; }
        this.playTone('fanfare');
        // Layer a short cheerful jingle under the fanfare voice for the big moment.
        if (window.MascotVoice && window.MascotVoice.jingle) window.MascotVoice.jingle();
        if (window.confetti) confetti({ particleCount: 130, spread: 75, origin: { y: 0.6 } });
        const m = document.getElementById('celebrate-mascot');
        if (m) this.spawnMascotParticles(m, ['🎉', '🎊', '🥳', '⭐', '🌟', '✨', '💛'], 14);
    },

    awardLessonCompletion() {
        const settings = this.state.courseData.settings || {};
        const xpGain = settings.xp_per_lesson || 0;
        const streakBonus = settings.streak_bonus || 0;
        const streakExtended = this.updateStreak();
        let totalGain = xpGain + (streakExtended ? streakBonus : 0);

        // Streak milestone reward: hit a milestone day and get hearts refilled to full
        // + bonus XP, with a celebration shown from renderLessonSummary().
        const milestone = streakExtended ? STREAK_MILESTONES[this.state.streak] : null;
        if (milestone) {
            totalGain += milestone.xp;
            const heartsBefore = this.state.hearts;
            this.state.hearts = MAX_HEARTS;
            this.updateHeartsDisplay();
            this.state.pendingStreakMilestone = { days: this.state.streak, xp: milestone.xp, heartsRefilled: MAX_HEARTS - heartsBefore };
        }

        this.state.xp += totalGain;
        this.addVibrancy(10);
        // weeklyXp is no longer independently tracked/reset - it's kept as a mirror of
        // the same cumulative xp purely so the admin dashboard's "XP tuần" column (which
        // reads profiles.weekly_xp) doesn't show a stale, confusing number now that the
        // leaderboard itself ranks by total xp (see syncLeaderboardScore()).
        this.state.weeklyXp = this.state.xp;
        this.ui.xp.innerText = this.state.xp;
        this.ui.streak.innerText = this.state.streak;
        this.syncLeaderboardScore();
        // "Chuỗi online thành viên" contribution to the group's vibrancy score - only on
        // days the streak actually extended (not every lesson), scaled by streak length.
        if (streakExtended && this.state.myGroupId && window.Groups) {
            window.Groups.creditStreakVibrancy(this.state.myGroupId, this.state.streak).catch(() => {});
        }
        if (streakExtended) {
            this.checkStreakTop1();
        }
    },

    // "Sôi nổi" (vibrancy) score for the individual user - mirrors the group concept:
    // earned by simply being active (lessons, practice, duels, games, chat), never
    // deducted. Stored in stats jsonb (persisted by the next saveUserProgress()) and
    // pushed to the leaderboard table by the next syncLeaderboardScore().
    addVibrancy(points) {
        if (!this.state.currentUser || !points) return;
        this.state.vibrancy = (this.state.vibrancy || 0) + points;
        this.state.stats.vibrancy = this.state.vibrancy;
        // Push straight to the leaderboard row (fire-and-forget): practice, games and
        // chat award points WITHOUT going through syncLeaderboardScore(), so without
        // this the public "Sôi nổi" board lagged behind until the next lesson
        // completion or re-login - which read as "points never credited".
        if (window.Leaderboard) {
            window.Leaderboard.submitScore(this.state.currentUser, this.state.xp, this.state.streak, this.state.vibrancy, this.state.lastActivityDate);
        }
    },

    // Centralized level-up detection - every XP-changing action in the app eventually
    // calls syncLeaderboardScore(), so checking here catches a level crossed via lesson
    // completion, duel wins, or anything else without needing before/after tracking
    // scattered at each individual XP-award site.
    checkLevelUp() {
        if (!this.state.profile) return;
        const currentLevel = getRankInfo(this.state.xp).level;
        if (this.state.lastKnownLevel != null && currentLevel > this.state.lastKnownLevel) {
            if (window.ActivityFeed) {
                window.ActivityFeed.postEvent('level_up', this.state.profile.id, this.state.currentUser, `⭐ ${this.state.currentUser} vừa thăng lên Cấp ${currentLevel}!`);
            }
        }
        this.state.lastKnownLevel = currentLevel;
    },

    async refreshTeddyBears() {
        if (!window.AuthService || !this.state.profile) return;
        const fresh = await window.AuthService.getProfile(this.state.profile.id);
        if (fresh && typeof fresh.teddy_bears === 'number' && fresh.teddy_bears !== this.state.teddyBears) {
            this.state.teddyBears = fresh.teddy_bears;
            this.checkBadges();
        }
    },

    showDMToast(msg) {
        if (document.getElementById('dm-toast-' + msg.id)) return;
        const toast = document.createElement('div');
        toast.className = 'duel-invite-toast';
        toast.id = 'dm-toast-' + msg.id;
        toast.innerHTML = `
            <div class="duel-invite-toast-header">📬 <strong>${this.clickableUsername(msg.sender_id, msg.sender_username)}</strong>: ${this.escapeHtml(msg.message.slice(0, 60))}</div>
            <div class="duel-invite-toast-actions">
                <button class="btn-primary" data-action="open" style="padding:6px 14px; font-size:13px;">Mở</button>
                <button class="btn-secondary" data-action="dismiss" style="padding:6px 14px; font-size:13px;">Đóng</button>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        const dismiss = () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        };
        toast.querySelector('[data-action="open"]').addEventListener('click', () => {
            dismiss();
            this.renderConversation(msg.sender_id, msg.sender_username);
        });
        toast.querySelector('[data-action="dismiss"]').addEventListener('click', dismiss);
    },

    // One-time special moment for a BRAND NEW signup only (see completeLogin()'s
    // isNewSignup flag) - distinct from showBriefToast/showBadgeToast in both visual
    // weight (bigger, longer-lived) and the confetti burst accompanying it.
    showWelcomeToast(username) {
        const toast = document.createElement('div');
        toast.className = 'badge-toast welcome-toast';
        toast.innerHTML = `<span class="badge-toast-icon">🎉</span><div><strong>Chào mừng đến với KhoaiBonlingo!</strong><br>${this.escapeHtml(username)}, chúc bạn học vui mỗi ngày!</div>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 4500);
        if (window.confetti) {
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
        }
    },

    // Call right after an xp-DECREASING event (skip penalty, duel loss) with the rank
    // tier index from just before that change. Since rank is purely derived from xp
    // (see getRankInfo()), a demotion needs no separate bookkeeping to detect - just
    // compare the tier before vs. after. Silent no-op when the loss wasn't big enough
    // to cross a tier boundary, which is the common case.
    checkRankDemotion(rankIndexBefore) {
        const rankAfter = getRankInfo(this.state.xp);
        if (rankAfter.rankIndex < rankIndexBefore) {
            alert(`😢 Bạn đã tụt xuống danh hiệu ${rankAfter.rankIcon} ${rankAfter.rankName} rồi. Đừng nản lòng - cố gắng luyện tập thêm để lấy lại phong độ nhé! Bài tập tiếp theo sẽ dễ hơn một chút để bạn lấy lại nhịp.`);
        }
    },

    async handleRename() {
        const statusEl = document.getElementById('rename-status');
        const newName = document.getElementById('rename-input').value.trim();
        if (newName.length < 3 || newName.length > 20) {
            statusEl.style.color = 'var(--duo-red)';
            statusEl.innerText = 'Tên hiển thị phải từ 3 đến 20 ký tự.';
            return;
        }
        if (newName === this.state.currentUser) {
            statusEl.style.color = 'var(--duo-red)';
            statusEl.innerText = 'Đây đã là tên hiện tại của bạn rồi.';
            return;
        }
        statusEl.style.color = 'var(--duo-dark-grey)';
        statusEl.innerText = 'Đang đổi tên...';
        const result = await window.AuthService.renameAccount(newName);
        if (result.error) {
            statusEl.style.color = 'var(--duo-red)';
            statusEl.innerText = /rename_own_account/.test(result.error)
                ? 'Tính năng đổi tên chưa sẵn sàng - quản trị viên cần chạy migration "self_service_inbox_vibrancy.sql" trên Supabase.'
                : `Đổi tên thất bại: ${result.error}`;
            return;
        }
        this.state.currentUser = result.username;
        if (this.state.profile) this.state.profile.username = result.username;
        if (this.ui.userBadgeName) this.ui.userBadgeName.innerText = result.username;
        statusEl.style.color = 'var(--duo-green)';
        statusEl.innerText = `Đổi tên thành công! Tên mới của bạn là "${result.username}".`;
    }
});
