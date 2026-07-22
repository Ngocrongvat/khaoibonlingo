// app-lesson.js — DuoClone methods split out of the former monolithic app.js.
// Attaches to DuoClone.prototype (defined in app.js). Load AFTER app.js and BEFORE
// app-main.js (which instantiates the app). Pure mechanical split - no behavior change.
Object.assign(DuoClone.prototype, {
    // isNewSignup is only ever true from the signup branch above - distinguishes "just
    // created this account" from every other completeLogin() call site (plain sign-in,
    // session restore on page load), which never pass it.
    async completeLogin(user, fallbackUsername, isNewSignup = false) {
        this.state.authUser = user;
        const profile = await window.AuthService.ensureProfile(user, fallbackUsername);
        if (!profile) {
            alert('Không tải được hồ sơ người dùng. Có thể bảng "profiles" chưa được tạo trên Supabase, hoặc đã có lỗi khi tạo hồ sơ. Vui lòng thử lại.');
            return;
        }
        if (profile.usernameWasTaken) {
            alert(`Tên hiển thị "${profile.usernameWasTaken}" đã có người dùng khác sử dụng. Bạn sẽ dùng tên "${profile.username}" thay thế.`);
        }
        if (profile.banned) {
            alert('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
            if (window.AuthService) await window.AuthService.signOut();
            location.reload();
            return;
        }

        this.state.profile = profile;
        this.state.currentUser = profile.username;
        this.state.isAdmin = profile.role === 'admin';
        // No clamp to MAX_HEARTS here: hearts CAN legitimately exceed the cap now
        // (achievement unlocks grant +5 each with overflow allowed - see checkBadges()).
        // MAX_HEARTS still caps passive regen and game/gift rewards, so overflow only
        // ever drains back down toward the cap.
        this.state.hearts = typeof profile.hearts === 'number' ? profile.hearts : MAX_HEARTS;
        this.state.xp = profile.xp || 0;
        this.state.weeklyXp = profile.weekly_xp || 0;
        this.state.streak = profile.streak || 0;
        this.state.lastActivityDate = profile.last_activity_date || null;
        this.state.lastWeekId = profile.last_week_id || null;
        this.state.teddyBears = profile.teddy_bears || 0;
        this.state.stats = Object.assign({ ...DEFAULT_STATS }, profile.stats || {});
        this.state.avatarUrl = profile.avatar_url || null;
        // "Sôi nổi" activity score - persisted inside the stats jsonb (no new profiles
        // column) and mirrored to the world-readable leaderboard table for ranking.
        this.state.vibrancy = this.state.stats.vibrancy || 0;
        // AFTER stats hydration on purpose: this may call saveUserProgress(), which
        // writes the whole stats blob - running it earlier would persist the default
        // stats over the user's real badges/certificates/history.
        this.normalizeStreakOnLoad();

        if (this.ui.userBadgeName) this.ui.userBadgeName.innerText = this.state.currentUser;
        this.updateAvatarDisplay();
        if (this.ui.adminBtn) {
            this.ui.adminBtn.style.display = this.state.isAdmin ? 'flex' : 'none';
        }

        if (typeof ErrorTracker !== 'undefined') {
            this.errorTracker = new ErrorTracker(profile.id);
            this.errorTracker.hydrateFromRemote(this.state.stats.errorHistory);
        }
        if (typeof BadgeTracker !== 'undefined') {
            this.badgeTracker = new BadgeTracker(profile.id);
            this.badgeTracker.hydrateFromRemote(this.state.stats.earnedBadges || {});
        }

        this.loadLocalPosition(profile.id);
        // Grant any hearts that came due while the app was closed IMMEDIATELY -
        // waiting for the interval's first tick meant a quick visit shorter than 60s
        // never saw its regen at all.
        this.applyHeartRegen();
        this.checkWeeklyReset();
        this.setupDuelInviteWatcher();
        this.setupFriendRequestWatcher();
        this.claimPendingHeartGifts();
        this.setupInboxWatcher();
        this.setupGlobalChatWatcher();
        this.setupGroupHeartbeat();
        // Fire once immediately rather than waiting up to 60s for startPresenceHeartbeat()'s
        // first interval tick, so a freshly logged-in user shows up in "Đang online" right away.
        window.AuthService.updateProfile(profile.id, { last_active_at: new Date().toISOString() });

        // Baseline for level-up detection (see syncLeaderboardScore()) - set once per
        // login so only a level actually CROSSED during this session gets announced, not
        // whatever level the account already happened to be at before logging in.
        this.state.lastKnownLevel = getRankInfo(this.state.xp).level;

        if (isNewSignup) {
            this.showWelcomeToast(profile.username);
            if (window.ActivityFeed) {
                window.ActivityFeed.postEvent('welcome', profile.id, profile.username, `🎉 Chào mừng thành viên mới ${profile.username} đã gia nhập KhoaiBonlingo!`);
            }
        }

        if (this.state.passwordRecoveryPending) {
            // Came here from a "quên mật khẩu" email link - let the user set the new
            // password before dropping them into the course.
            this.renderPasswordResetScreen();
        } else {
            // Placement test removed (too hard a first impression for young beginners):
            // new users start straight at Bronze / difficulty 1, Chapter 1 Lesson 1, and
            // ride the gentle "beginner mode" on-ramp (see isBeginnerMode()) instead.
            this.startCourse();
        }
        this.syncLeaderboardScore();
    },

    // Gentle on-ramp for young/new learners: active while the learner is still inside the
    // first 10 chapters. Auto-graduates simply by progressing past chapter 10 - no extra
    // stored flag, so it can never get "stuck on". Drives easier games (difficulty 1) and
    // the word-first lesson substitution in the early chapters.
    isBeginnerMode() {
        return (this.state.currentUnitIdx || 0) < 10;
    },

    getCurrentExercise() {
        if (this.state.mode === 'duel') {
            return this.state.duelQueue[this.state.duelIdx];
        }
        if (this.state.mode === 'practice' || this.state.mode === 'assessment' || this.state.mode === 'placement' || this.state.mode === 'gate') {
            return this.state.practiceQueue[this.state.practiceIdx];
        }
        if (this.state.reviewMode) {
            return this.state.reviewQueue[0];
        }
        const unit = this.state.courseData.units[this.state.currentUnitIdx];
        const lesson = unit.lessons[this.state.currentLessonIdx];
        // Defensive clamp: currentExIdx should always be in range now that
        // reviewQueue/reviewMode are persisted (see loadLocalPosition()), but this keeps
        // renderLesson() from crashing on `undefined.type` if some other edge case ever
        // leaves the index stale relative to the lesson's exercise count.
        const idx = Math.min(this.state.currentExIdx, lesson.exercises.length - 1);
        return this.presentedExerciseFor(lesson, idx);
    },

    // Adapts the raw curriculum exercise to the learner without changing the exercise
    // COUNT (so all the index/length/progress logic is untouched). Cached per current
    // lesson so a given slot renders the SAME adapted exercise across re-renders (tiles
    // don't reshuffle, dictation phase stays put).
    presentedExerciseFor(lesson, idx) {
        const key = `${this.state.currentUnitIdx}:${this.state.currentLessonIdx}:${this.state.stats.easyMode ? 'E' : 'N'}`;
        if (this._presentKey !== key) { this._presentKey = key; this._presentCache = {}; }
        if (!this._presentCache[idx]) this._presentCache[idx] = this.presentExercise(lesson.exercises[idx], idx);
        return this._presentCache[idx];
    },

    presentExercise(raw, exIdx) {
        if (!raw) return raw;
        const beginner = this.isBeginnerMode() || this.state.stats.easyMode;
        if (beginner) {
            // Word-first on-ramp (Phase 2): strip the decoy tiles from 'translate' so young
            // learners assemble the sentence from ONLY the needed words. Safe because the
            // answer check compares the assembled WORDS to ex.correct, not the tile order.
            if (raw.type === 'translate' && Array.isArray(raw.correct) && Array.isArray(raw.options)
                && raw.options.length > raw.correct.length) {
                return { ...raw, options: shuffleArray(raw.correct), _beginnerized: true };
            }
            return raw;
        }
        // Normal chapters: sprinkle in the 3-phase dictation (listen → type → read aloud)
        // by upgrading ~1/3 of the multi-word 'translate' drills. dictationWordBank() only
        // needs ex.target (which translate already has), so the swap is a clean type flip.
        if (raw.type === 'translate' && raw.target && String(raw.target).trim().split(/\s+/).length >= 3
            && ((this.state.currentUnitIdx + this.state.currentLessonIdx + exIdx) % 3 === 0)) {
            return { ...raw, type: 'dictation', question: 'Nghe và gõ lại câu:', _threePhase: true };
        }
        return raw;
    },

    // Single source of truth for heart-regen accounting. Called by the minute
    // interval, once right after login, and on every out-of-hearts countdown tick -
    // previously the ONLY grant point was the 60s interval, so a user opening the app
    // for a quick look (or watching the countdown hit 0:00) could sit up to a minute
    // with hearts visibly "not regenerating", and a sub-60s visit never regenerated
    // at all.
    applyHeartRegen() {
        if (!this.state.profile) return false;
        const now = Date.now();
        if (this.state.hearts >= MAX_HEARTS) {
            // Nothing accrues at/above the cap - re-anchor the clock so that when a
            // heart IS lost later, the 15-minute wait starts from around now. The old
            // code left the anchor wherever it last granted (possibly days old), which
            // made the first loss refill instantly instead of regenerating honestly.
            this.state.lastHeartUpdate = now;
            return false;
        }
        const lastUpdate = this.state.lastHeartUpdate || now;
        const elapsed = now - lastUpdate;
        if (elapsed < HEART_REGEN_MS) return false;
        const recovered = Math.floor(elapsed / HEART_REGEN_MS);
        this.state.hearts = Math.min(MAX_HEARTS, this.state.hearts + recovered);
        // Keep the remainder (old code reset to `now`, silently discarding up to
        // 14m59s of progress toward the next heart on every grant).
        this.state.lastHeartUpdate = now - (elapsed % HEART_REGEN_MS);
        this.saveUserProgress();
        this.updateNav();
        return true;
    },

    // Site-wide "online members" support - unlike Groups.sendHeartbeat() (which only runs
    // for members currently in a group, crediting vibrancy_score), this runs for EVERY
    // logged-in user regardless of group membership, just stamping profiles.last_active_at
    // so renderOnlineMembers() can show who's recently active. Mirrors
    // startEnergyRegeneration()'s always-on interval pattern, called once at init().
    startPresenceHeartbeat() {
        setInterval(() => {
            if (this.state.profile && window.AuthService) {
                window.AuthService.updateProfile(this.state.profile.id, { last_active_at: new Date().toISOString() });
            }
        }, 60000);
    },

    // Called once per login - looks up the user's current group (membership can change
    // across sessions, so this can't just be cached from a previous login) and, if
    // they're in one, starts a 60s interval crediting a small amount of vibrancy_score
    // and refreshing last_active_at (used by the battle screen's 🟢 online indicator).
    // Mirrors startEnergyRegeneration()'s interval pattern; no explicit cleanup needed -
    // handleSignOut() does a full location.reload(), which tears down the interval along
    // with all other page state.
    async setupGroupHeartbeat() {
        if (this.groupHeartbeatInterval) {
            clearInterval(this.groupHeartbeatInterval);
            this.groupHeartbeatInterval = null;
        }
        if (!window.Groups || !this.state.profile) return;
        const mine = await window.Groups.getMyGroup(this.state.profile.id);
        this.state.myGroupId = mine ? mine.group.id : null;
        if (!this.state.myGroupId) return;

        window.Groups.sendHeartbeat(this.state.myGroupId, this.state.profile.id);
        this.groupHeartbeatInterval = setInterval(() => {
            if (this.state.myGroupId && this.state.profile) {
                window.Groups.sendHeartbeat(this.state.myGroupId, this.state.profile.id);
            }
        }, 60000);
    },

    // So the learner always knows what lesson/question they're on and how far they've
    // gotten, without having to guess from the exercise content alone. Duel deliberately
    // returns '' - it already has its own dedicated head-to-head progress bar rendered
    // outside #lesson-container (see startDuelBattle()), and stacking a second progress
    // readout there would be redundant.
    getLessonProgressLabel() {
        if (this.state.mode === 'duel') return '';
        if (this.state.mode === 'practice') {
            return `Luyện tập tự do — Câu ${this.state.practiceIdx + 1}/${this.state.practiceQueue.length}`;
        }
        if (this.state.mode === 'assessment') {
            return `📝 Bài kiểm tra đánh giá — Câu ${this.state.practiceIdx + 1}/${this.state.practiceQueue.length}`;
        }
        if (this.state.mode === 'placement') {
            return `🎯 Bài test xếp loại năng lực — Câu ${this.state.practiceIdx + 1}/${this.state.practiceQueue.length}`;
        }
        if (this.state.mode === 'gate') {
            return `🎯 KIỂM TRA QUA CHƯƠNG ${this.state.currentUnitIdx + 1} — Câu ${this.state.practiceIdx + 1}/${this.state.practiceQueue.length}`;
        }
        if (this.state.reviewMode) {
            return `🔁 Ôn tập lại câu sai — còn ${this.state.reviewQueue.length} câu`;
        }
        const unit = this.state.courseData.units[this.state.currentUnitIdx];
        const lesson = unit.lessons[this.state.currentLessonIdx];
        const idx = Math.min(this.state.currentExIdx, lesson.exercises.length - 1);
        return `Chương ${this.state.currentUnitIdx + 1}: ${this.escapeHtml(unit.title)} • Bài ${this.state.currentLessonIdx + 1}: ${this.escapeHtml(lesson.title)} — Câu ${idx + 1}/${lesson.exercises.length}`;
    },

    renderLesson() {
        // Held between chapters until the mandatory gate test is passed (Cluster B). Any
        // entry into the lesson view (Home "TIẾP TỤC HỌC", reload) reroutes to the gate.
        if (this.state.mode === 'curriculum' && this.state.pendingChapterGate != null) {
            this.startChapterGate();
            return;
        }
        const ex = this.getCurrentExercise();

        // Dictation is a 3-phase reinforcement drill (assemble → type → read). The phase
        // resets whenever we land on a DIFFERENT exercise instance; a phase transition
        // re-renders the SAME instance (see checkAnswer) and keeps its phase.
        if (this.state._dictExRef !== ex) { this.state._dictExRef = ex; this.state.dictationPhase = 0; }

        this.ensureSessionAnswerContext();
        this.updateNav();

        const progressLabel = this.getLessonProgressLabel();
        let html = progressLabel ? `<div class="lesson-progress-label">${progressLabel}</div>` : '';
        // dictation renders its own phase-specific prompt inside its branch.
        if (ex.type !== 'reading' && ex.type !== 'dialogue' && ex.type !== 'listening_comprehension' && ex.type !== 'dictation') {
            html += `<div class="exercise-title">${this.escapeHtml(ex.question || 'Dịch câu này')}</div>`;
        }

        if (ex.type === 'multiple_choice' || ex.type === 'synonym' || ex.type === 'meaning') {
            html += `<div class="options-grid">`;
            ex.options.forEach((opt, i) => {
                html += `<div class="option-card" data-idx="${i}">${this.escapeHtml(opt)}</div>`;
            });
            html += `</div>`;
        } else if (ex.type === 'preposition' || ex.type === 'fill_blank') {
            const blanked = this.escapeHtml(ex.sentence).replace('___', '<span class="blank">_____</span>');
            html += `<div class="exercise-prompt preposition-sentence" style="font-size: 22px; margin-bottom: 20px; color: #333; font-weight: 600;">${blanked}</div>`;
            html += `<div class="options-grid">`;
            ex.options.forEach((opt, i) => {
                html += `<div class="option-card" data-idx="${i}">${this.escapeHtml(opt)}</div>`;
            });
            html += `</div>`;
        } else if (ex.type === 'translate' || ex.type === 'ordering') {
            html += `<div class="exercise-prompt" style="font-size: 20px; margin-bottom: 20px; color: #777;">${this.escapeHtml(ex.source || ex.sentence)}</div>`;
            html += `<div class="word-bank">`;
            (ex.options || ex.shuffled).forEach((word, i) => {
                html += `<div class="word-chip" data-idx="${i}">${this.escapeHtml(word)}</div>`;
            });
            html += `</div><div class="answer-slot" id="answer-slot"></div>`;
        } else if (ex.type === 'listening') {
            html += `<div class="listening-container">
                        <button class="btn-listen" id="listen-btn">
                            <span style="font-size: 40px;">🔊</span><br>Nghe bài này
                        </button>
                        <button class="btn-listen" id="listen-slow-btn">
                            <span style="font-size: 40px;">🐢</span><br>Nghe chậm
                        </button>
                     </div>`;
            html += `<div class="options-grid">`;
            ex.options.forEach((opt, i) => {
                html += `<div class="option-card" data-idx="${i}">${this.escapeHtml(opt)}</div>`;
            });
            html += `</div>`;
        } else if (ex.type === 'pronunciation') {
            html += `<div class="exercise-prompt" style="font-size: 26px; margin-bottom: 20px; color: #333; font-weight: 700;">${this.escapeHtml(ex.target)}</div>`;
            html += `<div class="pronunciation-controls">
                        <button class="btn-listen" id="listen-btn">
                            <span style="font-size: 32px;">🔊</span><br>Nghe mẫu
                        </button>
                        <button class="btn-listen" id="listen-slow-btn">
                            <span style="font-size: 32px;">🐢</span><br>Nghe chậm
                        </button>
                        <button class="btn-listen" id="mic-btn">
                            <span style="font-size: 32px;">🎤</span><br>Nhấn để nói
                        </button>
                     </div>`;
            html += `<div id="pronunciation-result" class="pronunciation-result"></div>`;
        } else if (ex.type === 'dictation') {
            const phase = this.state.dictationPhase || 0;
            const audioBtns = `<div class="pronunciation-controls">
                        <button class="btn-listen" id="listen-btn"><span style="font-size: 32px;">🔊</span><br>Nghe lại</button>
                        <button class="btn-listen" id="listen-slow-btn"><span style="font-size: 32px;">🐢</span><br>Nghe chậm</button>
                     </div>`;
            const steps = `<div class="dictation-steps">Bước ${phase + 1}/3</div>`;
            if (phase === 0) {
                // Phase 1: hear it, then ASSEMBLE from a word bank (correct words shuffled
                // in with a few distractors) - an easier on-ramp for new learners.
                html += `<div class="exercise-title">🎧 Nghe rồi ghép lại câu (có sẵn từ gợi ý)</div>${steps}`;
                html += audioBtns;
                const bank = this.dictationWordBank(ex);
                html += `<div class="word-bank">`;
                bank.forEach((word, i) => { html += `<div class="word-chip" data-idx="${i}">${this.escapeHtml(word)}</div>`; });
                html += `</div><div class="answer-slot" id="answer-slot"></div>`;
            } else if (phase === 1) {
                // Phase 2: type the SAME sentence from memory, no word bank - deepens recall.
                html += `<div class="exercise-title">✍️ Giờ tự gõ lại câu đó từ trí nhớ (không còn gợi ý)</div>${steps}`;
                html += audioBtns;
                html += `<input type="text" id="dictation-input" class="input-field dictation-input" placeholder="Gõ lại câu bạn vừa ghép...">`;
            } else {
                // Phase 3: read the sentence aloud (≥70% = pass) to cement pronunciation.
                html += `<div class="exercise-title">🗣️ Cuối cùng, đọc to câu này (đạt trên 70% là được)</div>${steps}`;
                html += `<div class="exercise-prompt" style="font-size: 24px; margin-bottom: 16px; color: #333; font-weight: 700; text-align:center;">${this.escapeHtml(ex.target)}</div>`;
                html += `<div class="pronunciation-controls">
                            <button class="btn-listen" id="listen-btn"><span style="font-size: 32px;">🔊</span><br>Nghe mẫu</button>
                            <button class="btn-listen" id="listen-slow-btn"><span style="font-size: 32px;">🐢</span><br>Nghe chậm</button>
                            <button class="btn-listen" id="mic-btn"><span style="font-size: 32px;">🎤</span><br>Nhấn để nói</button>
                         </div>`;
                html += `<div id="pronunciation-result" class="pronunciation-result"></div>`;
            }
        } else if (ex.type === 'reading') {
            html += `<div class="reading-passage">${this.escapeHtml(ex.passage)}</div>`;
            html += `<div class="exercise-title" style="margin-top: 20px;">${this.escapeHtml(ex.question)}</div>`;
            html += `<div class="options-grid">`;
            ex.options.forEach((opt, i) => {
                html += `<div class="option-card" data-idx="${i}">${this.escapeHtml(opt)}</div>`;
            });
            html += `</div>`;
        } else if (ex.type === 'dialogue') {
            html += `<div class="dialogue-box">`;
            ex.lines.forEach(line => {
                html += `<div class="dialogue-line">${this.escapeHtml(line)}</div>`;
            });
            html += `</div>`;
            html += `<div class="exercise-title" style="margin-top: 20px;">${this.escapeHtml(ex.question)}</div>`;
            html += `<div class="options-grid">`;
            ex.options.forEach((opt, i) => {
                html += `<div class="option-card" data-idx="${i}">${this.escapeHtml(opt)}</div>`;
            });
            html += `</div>`;
        } else if (ex.type === 'matching') {
            const leftItems = shuffleArray(ex.pairs.map(p => ({ id: p.id, text: p.en })));
            const rightItems = shuffleArray(ex.pairs.map(p => ({ id: p.id, text: p.vi })));
            this.state.matchingState = { matchedIds: new Set(), mistakenIds: new Set(), selectedLeftId: null };
            html += `<div class="match-game-area" id="match-area">
                        <svg class="match-lines-svg" id="match-svg"></svg>
                        <div class="match-game-grid">
                            <div class="match-column" id="match-left">
                                ${leftItems.map(item => `<div class="match-card" data-id="${item.id}">${this.escapeHtml(item.text)}</div>`).join('')}
                            </div>
                            <div class="match-column" id="match-right">
                                ${rightItems.map(item => `<div class="match-card" data-id="${item.id}">${this.escapeHtml(item.text)}</div>`).join('')}
                            </div>
                        </div>
                     </div>`;
        } else if (ex.type === 'listening_comprehension') {
            html += `<div class="pronunciation-controls">
                        <button class="btn-listen" id="listen-btn">
                            <span style="font-size: 32px;">🔊</span><br>Nghe lại
                        </button>
                        <button class="btn-listen" id="listen-slow-btn">
                            <span style="font-size: 32px;">🐢</span><br>Nghe chậm
                        </button>
                     </div>`;
            if (ex.kind === 'passage') {
                html += `<div class="reading-passage">${this.escapeHtml(ex.text)}</div>`;
            } else {
                const label = ex.kind === 'song' ? '(Lời bài hát)' : '';
                html += `${label ? `<p style="text-align:center; color:#999; font-size:13px; margin-bottom:4px;">${label}</p>` : ''}<div class="dialogue-box">${ex.lines.map(l => `<div class="dialogue-line">${this.escapeHtml(l)}</div>`).join('')}</div>`;
            }
            html += `<div class="exercise-title" style="margin-top: 20px;">${this.escapeHtml(ex.question)}</div>`;
            html += `<div class="pronunciation-controls">
                        <button class="btn-listen mode-btn active" id="mode-type-btn"><span style="font-size:28px;">⌨️</span><br>Gõ câu trả lời</button>
                        <button class="btn-listen mode-btn" id="mode-speak-btn"><span style="font-size:28px;">🎤</span><br>Nói câu trả lời</button>
                     </div>`;
            html += `<div id="comprehension-type-panel">
                        <input type="text" id="comprehension-input" class="input-field dictation-input" placeholder="Nhập câu trả lời của bạn...">
                     </div>`;
            html += `<div id="comprehension-speak-panel" style="display:none;">
                        <button class="btn-listen" id="mic-btn"><span style="font-size: 32px;">🎤</span><br>Nhấn để nói</button>
                        <div id="pronunciation-result" class="pronunciation-result"></div>
                     </div>`;
        }

        // Per-chapter background (Cluster B): each chapter tints the lesson area with a
        // different soft theme (8 rotate) so progressing feels fresh. Scoped to the lesson
        // wrapper so other screens keep their own look.
        const bgN = (this.state.currentUnitIdx || 0) % 8;
        this.ui.container.innerHTML = `<div class="lesson-bg lesson-bg-${bgN}">${html}</div>`;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        // Self-heal: if any feature ever hid the check button (style.display) and its
        // restore path was skipped, entering an exercise must always bring it back -
        // without this, one missed restore would silently kill answering for the whole
        // session (that exact bug shipped once via the scenario screens).
        this.ui.checkBtn.style.display = '';
        // Not offered in duels - skipping mid-race would let you advance your own
        // progress bar without actually answering, which is unfair in a head-to-head
        // wager. Every other mode (including matching, which has no check-button step)
        // can offer it.
        if (this.ui.skipBtn) {
            this.ui.skipBtn.style.display = this.state.mode === 'duel' ? 'none' : '';
        }
        this.state.selectedOption = null;
        this.state.currentAnswer = [];
        this.state.recognizedSpeech = null;
        this.state.dictationText = '';
        this.state.comprehensionText = '';
        this.state.comprehensionMode = 'type';

        this.bindExerciseEvents(ex);
    },

    playAudio(text, rate = 0.9) {
        if (!('speechSynthesis' in window)) {
            console.log("Speech synthesis not supported on this device.");
            return;
        }
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = rate;
        speechSynthesis.speak(utterance);
    },

    // Rate 0.35 (vs. the normal 0.9) so learners can clearly pick out individual words -
    // slower than a first pass at 0.5 turned out to be, per user feedback that it still
    // wasn't slow enough to hear each word distinctly.
    playAudioSlow(text) {
        this.playAudio(text, 0.35);
    },

    startRecording() {
        // Tap-to-toggle: a second tap WHILE listening stops and scores. This is the fix
        // for iPhone Safari where onend often never fires on its own, leaving the mic
        // stuck on "Đang nghe..." with no way to stop.
        if (this.recognitionActive) { this.stopRecording(); return; }

        const resultEl = document.getElementById('pronunciation-result');
        const micBtn = document.getElementById('mic-btn');

        const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionCtor) {
            if (resultEl) resultEl.innerText = 'Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.';
            return;
        }

        // Tear the previous session down hard (abort, not stop) - iOS Safari can throw
        // "recognition has already started" if a stale instance lingers.
        if (this.recognition) {
            try { this.recognition.onresult = this.recognition.onend = this.recognition.onerror = null; this.recognition.abort(); } catch (e) { }
            this.recognition = null;
        }

        const recognition = new SpeechRecognitionCtor();
        this.recognition = recognition;
        recognition.lang = 'en-US';
        recognition.continuous = false;
        // interimResults ON keeps iPhone reliable (with them off it often returns nothing),
        // and we keep the BEST transcript across every interim + final result and across
        // alternatives - but we DON'T score/commit on interims (that made Android show a
        // result "too early", before the user finished). Scoring happens only on finish.
        recognition.interimResults = true;
        recognition.maxAlternatives = 5;

        const ex = this.getCurrentExercise();
        const target = (ex && ex.target) || '';
        let best = { transcript: '', score: -1 };
        let lastInterim = '';
        const consider = (raw) => {
            const transcript = (raw || '').trim();
            if (!transcript) return;
            lastInterim = transcript;
            const score = target ? this.pronunciationScore(transcript, target) : transcript.length;
            if (score > best.score) best = { transcript, score };
        };
        const idleMic = () => {
            if (micBtn) { micBtn.classList.remove('recording'); micBtn.innerHTML = '<span style="font-size: 32px;">🎤</span><br>Nhấn để nói'; }
        };

        // Commit exactly once - on natural end, manual stop, error, or the safety timeout.
        let finalized = false;
        const finalize = () => {
            if (finalized) return;
            finalized = true;
            this.recognitionActive = false;
            clearTimeout(this._recTimeout);
            clearTimeout(this._recStopFallback);
            idleMic();
            this.state.recognizedSpeech = best.transcript;
            if (best.transcript) {
                this.ui.checkBtn.disabled = false;
                this.ui.checkBtn.classList.add('active');
                if (resultEl) {
                    let html = `Bạn nói: "${this.escapeHtml(best.transcript)}"`;
                    if (target) {
                        const s = this.pronunciationScore(best.transcript, target);
                        const color = s >= 80 ? 'var(--duo-green)' : (s >= 50 ? '#ffc800' : 'var(--duo-red)');
                        html += `<br><span style="font-weight:800; color:${color};">Độ chính xác: ${s}%</span>`;
                    }
                    resultEl.innerHTML = html;
                }
            } else if (resultEl && !resultEl.dataset.err) {
                resultEl.innerText = 'Không nghe rõ, hãy thử lại (nói to và gần micro hơn nhé).';
            }
        };
        this._recFinalize = finalize;

        // Fresh attempt: clear the previous result so a failed re-record can't be checked.
        this.state.recognizedSpeech = '';
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        this.recognitionActive = true;
        if (micBtn) {
            micBtn.classList.add('recording');
            micBtn.innerHTML = '<span style="font-size: 30px;">🎙️</span><br>Đang nghe... (chạm để dừng)';
        }
        if (resultEl) { resultEl.innerText = ''; delete resultEl.dataset.err; }

        recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const res = event.results[i];
                for (let a = 0; a < res.length; a++) consider(res[a].transcript);
            }
            // Live interim preview ONLY (grey, no score, Check stays disabled) so the
            // result isn't shown before the user has finished speaking.
            if (resultEl && lastInterim) resultEl.innerHTML = `<span style="color:#999;">Đang nghe: "${this.escapeHtml(lastInterim)}"…</span>`;
        };

        recognition.onerror = (e) => {
            const err = e && e.error;
            if (err === 'not-allowed' || err === 'service-not-allowed' || err === 'audio-capture') {
                if (resultEl) { resultEl.dataset.err = '1'; resultEl.innerText = 'Hãy cho phép truy cập micro (và có mạng) để chấm phát âm nhé.'; }
                finalize();
            }
            // no-speech / aborted / network: let onend commit whatever (if anything) we heard.
        };

        recognition.onend = () => finalize();

        // Safety: iPhone Safari can hang without ever firing onend - auto-stop after 12s.
        this._recTimeout = setTimeout(() => this.stopRecording(), 12000);

        try {
            recognition.start();
        } catch (e) {
            this.recognitionActive = false;
            idleMic();
        }
    },

    // Stop listening and score. Called by the mic toggle and the safety timeout.
    stopRecording() {
        if (!this.recognitionActive) return;
        try { if (this.recognition) this.recognition.stop(); } catch (e) { }
        // iOS may never fire onend after stop(); force-commit shortly after so the mic
        // button always returns to idle and the score is shown.
        clearTimeout(this._recStopFallback);
        this._recStopFallback = setTimeout(() => { if (this._recFinalize) this._recFinalize(); }, 1400);
    },

    // Character-level similarity (0-100) between what was recognized and the target
    // sentence, via Levenshtein edit distance. This is a free, local approximation - not
    // true phoneme-level acoustic pronunciation analysis (that needs a paid API like
    // Azure Pronunciation Assessment, not available here) - but it reflects "how close"
    // far more informatively than a binary correct/wrong ever could.
    pronunciationScore(spoken, target) {
        const a = this.normalizeSpeech(spoken);
        const b = this.normalizeSpeech(target);
        if (!a || !b) return 0;
        if (a === b) return 100;
        const distance = levenshteinDistance(a, b);
        const maxLen = Math.max(a.length, b.length);
        return Math.max(0, Math.round((1 - distance / maxLen) * 100));
    },

    // Kept as a boolean gate (same name/signature every caller already expects) so
    // duel exclusion, the pronunciation_master badge counter, and checkAnswer()'s
    // isCorrect logic are all unaffected - only the scoring method underneath changed,
    // not the pass/fail threshold (still the same 80% bar as the old word-overlap check).
    comparePronunciation(spoken, target) {
        return this.pronunciationScore(spoken, target) >= 80;
    },

    // Checks a short free-form comprehension answer against a list of acceptable
    // keywords/phrases - unlike comparePronunciation (which checks the WHOLE target
    // sentence was reproduced), this only needs ANY one accepted answer to be present,
    // since the user is answering a question about a passage, not repeating it verbatim.
    checkComprehensionAnswer(userText, acceptedAnswers) {
        if (!userText || !acceptedAnswers || !acceptedAnswers.length) return false;
        const normalizedUser = this.normalizeSpeech(userText);
        if (!normalizedUser) return false;
        const userWords = normalizedUser.split(' ');
        return acceptedAnswers.some(accepted => {
            const normalizedAccepted = this.normalizeSpeech(accepted);
            if (!normalizedAccepted) return false;
            if (normalizedUser.includes(normalizedAccepted)) return true;
            const acceptedWords = normalizedAccepted.split(' ');
            if (acceptedWords.length === 1) return false;
            const matches = acceptedWords.filter(w => userWords.includes(w)).length;
            return matches / acceptedWords.length >= 0.8;
        });
    },

    // Use for every direct hearts write outside updateNav() so the Home greeting can
    // never drift from the nav counter again.
    updateHeartsDisplay() {
        if (this.ui.hearts) this.ui.hearts.innerText = this.state.hearts;
        this.refreshHomeGreeting();
    },

    // Builds (and caches) the phase-0 word bank for a dictation sentence: the correct
    // words shuffled together with a few common-word distractors, so new learners
    // assemble the sentence rather than type it cold. Cached on the exercise so the
    // bank stays stable within an attempt (chip indices must keep matching the words).
    dictationWordBank(ex) {
        if (ex._dictBank) return ex._dictBank;
        const words = (ex.target || '').split(' ').filter(Boolean);
        const inSentence = new Set(words.map(w => w.toLowerCase()));
        const POOL = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'you', 'we', 'they', 'and', 'very', 'today', 'not', 'do', 'have', 'his', 'her', 'this', 'that', 'can', 'will', 'my'];
        const n = Math.min(3, Math.max(1, Math.floor(words.length / 2)));
        const distractors = shuffleArray(POOL.filter(w => !inSentence.has(w))).slice(0, n);
        ex._dictBank = shuffleArray([...words, ...distractors]);
        return ex._dictBank;
    },

    // Keys the answer log to the specific session it belongs to (one curriculum
    // lesson, one duel, one practice run...). Called on every renderLesson(): when the
    // key matches, records survive detours (e.g. visiting Home mid-lesson and hitting
    // "TIẾP TỤC HỌC" keeps everything answered so far); when it changes (different
    // lesson, different mode), stale records are dropped so they can't leak into the
    // wrong summary.
    ensureSessionAnswerContext() {
        const mode = this.state.mode;
        const key = mode === 'curriculum'
            ? `curriculum:${this.state.currentUnitIdx}:${this.state.currentLessonIdx}`
            : (mode === 'duel' ? `duel:${this.state.duelId}` : mode);
        if (this.state.sessionAnswersKey !== key) {
            this.state.sessionAnswersKey = key;
            this.resetSessionAnswers();
        }
    },

    async checkAnswer() {
        const ex = this.getCurrentExercise();
        let isCorrect = false;

        const optionBasedTypes = ['multiple_choice', 'listening', 'preposition', 'fill_blank', 'synonym', 'meaning', 'reading', 'dialogue'];
        if (optionBasedTypes.includes(ex.type)) {
            isCorrect = this.state.selectedOption === ex.correct;
        } else if (ex.type === 'translate' || ex.type === 'ordering') {
            isCorrect = JSON.stringify(this.state.currentAnswer) === JSON.stringify(ex.correct);
        } else if (ex.type === 'pronunciation') {
            isCorrect = this.comparePronunciation(this.state.recognizedSpeech, ex.target);
        } else if (ex.type === 'dictation') {
            const phase = this.state.dictationPhase || 0;
            if (phase === 0) {
                isCorrect = JSON.stringify(this.state.currentAnswer) === JSON.stringify((ex.target || '').split(' '));
            } else if (phase === 1) {
                isCorrect = this.comparePronunciation(this.state.dictationText, ex.target);
            } else {
                isCorrect = this.pronunciationScore(this.state.recognizedSpeech, ex.target) >= 70;
            }
        } else if (ex.type === 'matching') {
            const ms = this.state.matchingState;
            isCorrect = !!ms && ms.mistakenIds.size === 0;
        } else if (ex.type === 'listening_comprehension') {
            const answerText = this.state.comprehensionMode === 'speak'
                ? this.state.recognizedSpeech
                : this.state.comprehensionText;
            isCorrect = this.checkComprehensionAnswer(answerText, ex.acceptedAnswers);
        }

        // Dictation 3-phase: a correct NON-final phase advances to the next phase in
        // place (light chime, fresh inputs, no heart/modal/queue). Only the final phase
        // (or any wrong answer) falls through to the normal correct/wrong flow below.
        if (ex.type === 'dictation' && isCorrect && (this.state.dictationPhase || 0) < 2) {
            this.state.dictationPhase = (this.state.dictationPhase || 0) + 1;
            this.playTone('correct');
            this.renderLesson();
            return;
        }

        this.recordSessionAnswer(ex, isCorrect, this.captureUserAnswerForSummary(ex));

        if (this.errorTracker) {
            if (ex.type === 'matching') {
                const ms = this.state.matchingState;
                ex.pairs.forEach(pair => {
                    this.errorTracker.recordResult(pair.en, !(ms && ms.mistakenIds.has(pair.id)));
                });
            } else if (ex.type === 'listening_comprehension' && ex.meta) {
                const key = `${ex.meta.templateId}_${ex.meta.questionIdx}`;
                this.errorTracker.recordResult(key, isCorrect);
            } else {
                const key = (ex.meta && (ex.meta.wordEn || ex.meta.answer)) || ex.id;
                this.errorTracker.recordResult(key, isCorrect);
            }
        }

        const noHeartCostModes = ['practice', 'assessment', 'placement', 'duel', 'gate'];
        if (ex.type === 'pronunciation' && isCorrect) {
            this.state.stats.pronunciationCorrect++;
        }

        if (isCorrect) {
            this.playTone('ding');
            this.presentResult(true);
        } else {
            this.playTone('oops');
            if (!noHeartCostModes.includes(this.state.mode)) {
                this.state.hearts--;
                this.updateHeartsDisplay();
            }
            if (this.state.mode === 'curriculum') {
                this.state.stats.lessonWrongCount++;
                if (this.state.reviewMode) {
                    // wrong again during review: send to the back of the queue for a later retry
                    this.state.reviewQueue.push(this.state.reviewQueue.shift());
                } else {
                    // first miss: queue it for review at the end of the lesson, don't block progress
                    this.state.reviewQueue.push(ex);
                }
            }
            this.presentResult(false);
        }
        if (!noHeartCostModes.includes(this.state.mode)) {
            this.saveUserProgress();
        }
        this.checkBadges();
    },

    // Deliberately does NOT reuse closeModal()'s per-mode branching: that branching
    // decides whether to advance at all based on correctness (e.g. practice mode
    // re-renders the SAME exercise on a wrong answer so the user must retry it) - a skip
    // must always move forward regardless of mode, which is the opposite of that
    // behavior. Costs XP, not a heart, and not offered in duel mode (button is hidden
    // there - see renderLesson()).
    skipCurrentExercise() {
        if (this.state.mode === 'duel') return;
        // Re-entrancy guard: a double-click (or a click landing while the previous
        // skip's re-render is still in flight) must not deduct XP twice or advance two
        // questions.
        if (this.skipInFlight) return;
        const SKIP_XP_PENALTY = 5;
        // The core-reinforcement round ("ôn luyện củng cố") is a free bonus round -
        // it's announced as costing no hearts and no XP - so skipping there must NOT
        // deduct XP nor warn about an XP penalty. (Bug: it still charged/warned XP.)
        const isCoreReview = !!this.state.lessonReviewCore;
        // Free practice ("Luyện tập tự do", mode 'practice' without the reinforcement
        // flag) is a low-stakes drill - skipping there costs no XP either (announced in
        // its intro). Only the main curriculum keeps the skip penalty.
        const isFreePractice = this.state.mode === 'practice' && !isCoreReview;
        const skipPenalty = (isCoreReview || isFreePractice) ? 0 : SKIP_XP_PENALTY;

        // Bug fix: skipping used to ALWAYS queue the skipped exercise into reviewQueue,
        // then advance - but if this was the lesson's last remaining question (nothing
        // else pending), that queue-push immediately flips reviewMode back on and
        // re-shows the very same question, making it look like skip "did nothing" even
        // though XP was already deducted. Detect that case up front so it can be
        // handled as "finish the lesson without the completion reward" instead of
        // silently looping back.
        const isLastBeforeLessonComplete = this.state.mode === 'curriculum' && (() => {
            if (this.state.reviewMode) return this.state.reviewQueue.length === 1;
            const unit = this.state.courseData.units[this.state.currentUnitIdx];
            const lesson = unit.lessons[this.state.currentLessonIdx];
            return this.state.currentExIdx === lesson.exercises.length - 1 && this.state.reviewQueue.length === 0;
        })();

        const confirmMsg = isCoreReview
            ? 'Bỏ qua câu ôn luyện này? Vòng ôn luyện củng cố không tính tim hay XP - bạn sẽ không bị trừ gì cả.'
            : isFreePractice
                ? 'Bỏ qua câu luyện tập này? Luyện tập tự do không bị trừ tim hay XP nhé.'
                : (isLastBeforeLessonComplete
                    ? `Đây là câu điều kiện để hoàn thành bài học! Nếu bỏ qua, bạn sẽ KHÔNG nhận được điểm thưởng hoàn thành bài (vẫn bị trừ ${SKIP_XP_PENALTY} XP). Bạn có chắc muốn bỏ qua không?`
                    : `Bỏ qua câu này sẽ bị trừ ${SKIP_XP_PENALTY} XP. Bạn có chắc muốn bỏ qua không?`);
        this.showConfirmDialog(confirmMsg, () => this.performSkip(isLastBeforeLessonComplete, skipPenalty), { okLabel: 'BỎ QUA' });
    },

    // ============== Ôn luyện củng cố (post-lesson review round) ==============
    // SAME core content, NEW question forms: every word/sentence the lesson just
    // taught comes back once more, but transformed into a DIFFERENT exercise type
    // (taught by multiple-choice -> reviewed by listening; taught by translate ->
    // reviewed by word-ordering; pronunciation sentence -> dictation...). The learner
    // re-retrieves the exact core one extra time through a fresh angle - which is
    // what makes it stick - instead of being quizzed on unrelated sibling content.
    buildLessonReviewQueue(unit, lessonIdx) {
        const lesson = unit && unit.lessons[lessonIdx];
        if (!lesson) return [];
        let seq = 0;
        const rid = () => `rev_${Date.now()}_${seq++}`;

        // distractor pool: every word answer appearing anywhere in this unit
        const wordPool = [];
        unit.lessons.forEach(l => l.exercises.forEach(e => {
            if ((e.type === 'multiple_choice' || e.type === 'listening') && Array.isArray(e.options)) {
                const ans = String(e.options[e.correct]);
                if (!wordPool.some(w => w.toLowerCase() === ans.toLowerCase())) wordPool.push(ans);
            }
        }));
        const distractors = (word, n) => {
            const out = [];
            for (const c of shuffleArray(wordPool)) {
                if (out.length >= n) break;
                if (c.toLowerCase() === word.toLowerCase()) continue;
                if (out.some(o => o.toLowerCase() === c.toLowerCase())) continue;
                out.push(c);
            }
            return out.length >= n ? out : null;
        };
        // Vietnamese gloss for a word (needed when flipping listening -> MC): the word
        // came from the curated vocab bank, so an unambiguous entry exists there.
        const viFor = (en) => {
            if (typeof VOCAB_BANK === 'undefined') return null;
            for (const cat of ['nouns', 'verbs', 'adjectives', 'adverbs']) {
                const hit = (VOCAB_BANK[cat] || []).find(w =>
                    w.en && w.en.toLowerCase() === en.toLowerCase() && w.vi && !/[(),\/;]/.test(w.vi));
                if (hit) return hit.vi;
            }
            return null;
        };
        const reshuffledDifferent = (words) => {
            let sh = shuffleArray(words);
            for (let t = 0; t < 10 && sh.join('') === words.join(''); t++) sh = shuffleArray(words);
            return sh.join('') === words.join('') ? [...words].reverse() : sh;
        };

        const mkListening = (word) => {
            const d = distractors(word, 3);
            if (!d) return null;
            const options = shuffleArray([word, ...d]);
            return { id: rid(), type: 'listening', question: 'Listen and choose the correct word', options, correct: options.indexOf(word) };
        };
        const mkMc = (word) => {
            const vi = viFor(word);
            const d = distractors(word, 3);
            if (!vi || !d) return null;
            const options = shuffleArray([word, ...d]);
            return { id: rid(), type: 'multiple_choice', question: `How do you say '${vi}'?`, options, correct: options.indexOf(word) };
        };
        const mkOrdering = (sentence, vi) => {
            const words = (sentence || '').split(' ');
            if (words.length < 3 || !vi) return null;
            return { id: rid(), type: 'ordering', source: vi, sentence, shuffled: reshuffledDifferent(words), correct: words };
        };
        const mkTranslate = (sentence, vi) => {
            const words = (sentence || '').split(' ');
            if (words.length < 3 || !vi) return null;
            const lower = words.map(w => w.toLowerCase());
            const extras = shuffleArray(['yesterday', 'always', 'because', 'quickly', 'many', 'blue', 'never', 'small'].filter(d => !lower.includes(d))).slice(0, 2);
            return { id: rid(), type: 'translate', source: vi, target: sentence, options: shuffleArray([...words, ...extras]), correct: words };
        };
        const mkDictation = (sentence) => ({ id: rid(), type: 'dictation', question: 'Nghe và gõ lại câu:', target: sentence });
        const mkPronSent = (sentence) => ({ id: rid(), type: 'pronunciation', question: 'Hãy đọc to câu này thật chuẩn:', target: sentence });
        const mkPronWord = (word) => ({ id: rid(), type: 'pronunciation', question: 'Hãy phát âm từ này thật chuẩn:', target: word });

        // A review form only counts as "new" if the lesson didn't ALREADY quiz this
        // exact content in that form (e.g. a word taught by BOTH multiple-choice and
        // listening must come back as pronunciation, not as either of those again) -
        // and if the review round itself hasn't claimed that form for it yet.
        const contentOf = (ex) => ((ex.target || ex.sentence || (Array.isArray(ex.options) ? String(ex.options[ex.correct]) : '')) + '').toLowerCase().trim();
        const takenPairs = new Set(lesson.exercises.map(e => e.type + '|' + contentOf(e)));
        const pickForm = (builders) => {
            for (const build of builders) {
                const alt = build();
                if (!alt) continue;
                const key = alt.type + '|' + contentOf(alt);
                if (takenPairs.has(key)) continue;
                takenPairs.add(key);
                return alt;
            }
            return null;
        };

        const queue = [];
        lesson.exercises.forEach(e => {
            let alt = null;
            if ((e.type === 'multiple_choice' || e.type === 'listening') && Array.isArray(e.options)) {
                const w = String(e.options[e.correct]);
                const order = e.type === 'multiple_choice'
                    ? [() => mkListening(w), () => mkMc(w), () => mkPronWord(w)]
                    : [() => mkMc(w), () => mkListening(w), () => mkPronWord(w)];
                alt = pickForm(order);
            } else if (e.type === 'pronunciation') {
                const t = e.target || '';
                alt = t.split(' ').length === 1
                    ? pickForm([() => mkMc(t), () => mkListening(t)])
                    : pickForm([() => mkDictation(t), () => mkTranslate(t, null)]);
            } else if (e.type === 'translate') {
                alt = pickForm([() => mkOrdering(e.target, e.source), () => mkDictation(e.target), () => mkPronSent(e.target)]);
            } else if (e.type === 'ordering') {
                alt = pickForm([() => mkTranslate(e.sentence, e.source), () => mkDictation(e.sentence), () => mkPronSent(e.sentence)]);
            } else if (e.type === 'dictation') {
                alt = pickForm([() => mkPronSent(e.target), () => mkOrdering(e.target, e.source)]);
            } else if (e.type === 'preposition' && Array.isArray(e.options)) {
                const filled = (e.sentence || '').replace('___', String(e.options[e.correct]));
                alt = pickForm([() => mkDictation(filled), () => mkPronSent(filled)]);
            }
            if (alt) queue.push(alt);
        });
        return queue;
    },

    // Runs the review round through the EXISTING practice machinery (no hearts at
    // stake, same render/check/skip flows) - only the finish line differs, routed to
    // renderLessonReviewDone() by the lessonReviewCore flag in nextPracticeExercise().
    startLessonReview(queue, coreItems) {
        this.state.mode = 'practice';
        this.state.practiceQueue = queue;
        this.state.practiceIdx = 0;
        this.state.lessonReviewCore = coreItems;
        this.resetSessionAnswers();
        this.renderLesson();
    },

    renderLessonReviewDone() {
        const core = this.state.lessonReviewCore || [];
        this.state.lessonReviewCore = null;
        this.state.mode = 'curriculum';
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                ${this.bigCelebrateMascotHtml('love', 96)}
                <h1 style="text-align: center;">Ôn luyện hoàn tất!</h1>
                <p style="text-align: center; color: #777;">Bạn vừa ôn lại đúng phần cốt lõi của bài dưới những dạng câu hỏi mới - cách tốt nhất để nhớ lâu.</p>
                ${this.sessionSummaryHtml()}
                ${this.lessonCoreSummaryHtml(core)}
                <button class="btn-primary" id="review-done-continue" style="display: block; margin: 20px auto 10px; padding: 15px 30px;">TIẾP TỤC HỌC</button>
                <button class="btn-secondary" id="review-done-home" style="display: block; margin: 0 auto; padding: 12px 26px;">VỀ TRANG CHÍNH</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        if (this.ui.skipBtn) this.ui.skipBtn.style.display = 'none';
        this.playBigCelebration();
        document.getElementById('review-done-continue').addEventListener('click', () => this.continueAfterLesson());
        document.getElementById('review-done-home').addEventListener('click', () => this.renderHomeDashboard());
    },

    // End-of-lesson "Tổng kết" screen (replaces the old blocking alert()): celebrates
    // the completion AND lists every question of the lesson with the user's answer vs.
    // the correct one, so mistakes are visible before moving on. The lesson indices were
    // already advanced by finishLessonCompletion() - the continue button just renders
    // whatever comes next.
    renderLessonSummary(skippedReward, lessonTitle, completedCtx = null) {
        const headline = skippedReward
            ? 'Bài học kết thúc (đã bỏ qua câu điều kiện)'
            : 'Hoàn thành bài học!';
        const subtitle = skippedReward
            ? 'Bạn đã bỏ qua câu điều kiện của bài học nên không nhận được điểm thưởng lần này. Cố gắng hơn ở bài tiếp theo nhé!'
            : `Chúc mừng! Bạn đã hoàn thành "${lessonTitle}".`;

        // Optional reinforcement round: same structures, brand-new questions pulled
        // from the unit's sibling lessons (needs at least 3 to be worth offering).
        const completedLesson = completedCtx ? completedCtx.unit.lessons[completedCtx.lessonIdx] : null;
        const reviewQueue = completedCtx ? this.buildLessonReviewQueue(completedCtx.unit, completedCtx.lessonIdx) : [];
        const coreItems = this.buildLessonCoreSummary(completedLesson);

        // Perfect lesson (no wrong answers this session) gets the heart-eyed 'love'
        // face; a normal clear gets 'excited'; a skipped-condition clear stays sheepish.
        const perfect = (this.state.sessionAnswers || []).length > 0 && (this.state.sessionAnswers || []).every(r => r.isCorrect && !r.hadMistake);
        // Skipping the condition gets a sheepish, apologetic little face (varied so
        // it isn't always identical) instead of the celebratory one.
        const sheepishMood = pickRandom(['surprised', 'pout', 'dizzy']);
        const summaryMood = skippedReward ? sheepishMood : (perfect ? 'love' : 'excited');
        const summaryMascot = skippedReward
            ? `<div class="duo-character mascot-wobble-sad" id="skip-mascot">${getMascotSvg(summaryMood, 96)}<span class="mascot-accessory">${pickRandom(['💧', '😅', '🥺'])}</span></div>`
            : this.bigCelebrateMascotHtml(summaryMood, 96);
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                ${summaryMascot}
                <h1 style="text-align: center;">${this.escapeHtml(headline)}</h1>
                <p style="text-align: center; color: #777;">${this.escapeHtml(subtitle)}</p>
                ${this.sessionSummaryHtml()}
                ${this.lessonCoreSummaryHtml(coreItems)}
                ${reviewQueue.length >= 3 ? `
                    <button class="btn-primary" id="lesson-review-btn" style="display: block; margin: 20px auto 0; padding: 15px 30px;">🔄 ÔN LUYỆN CỦNG CỐ (${reviewQueue.length} câu)</button>
                    <p style="text-align:center; color:#999; font-size:12.5px; margin:6px 0 0;">Bắt buộc ôn lại cốt lõi vừa học dưới dạng câu hỏi mới - không tốn tim, giúp nhớ thật lâu</p>
                ` : `<button class="btn-primary" id="lesson-summary-continue" style="display: block; margin: 15px auto; padding: 15px 30px;">TIẾP TỤC</button>`}
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        if (this.ui.skipBtn) this.ui.skipBtn.style.display = 'none';
        if (!skippedReward) {
            this.playBigCelebration();
        } else {
            // Was silent before: give the skip its own gentle, apologetic reaction -
            // a soft "whimper" plus a small sympathetic particle puff on the mascot.
            this.playTone('whimper');
            const sm = document.getElementById('skip-mascot');
            if (sm) this.spawnMascotParticles(sm, ['💧', '😅', '💦', '💫'], 6);
        }
        const reviewBtn = document.getElementById('lesson-review-btn');
        if (reviewBtn) reviewBtn.addEventListener('click', () => this.startLessonReview(reviewQueue, coreItems));
        const continueBtn = document.getElementById('lesson-summary-continue');
        if (continueBtn) continueBtn.addEventListener('click', () => this.continueAfterLesson());

        // A streak milestone reached this lesson pops its celebration OVER the summary.
        if (this.state.pendingStreakMilestone) {
            const m = this.state.pendingStreakMilestone;
            this.state.pendingStreakMilestone = null;
            this.showStreakMilestone(m);
        }
    },

    renderCourseComplete() {
        this.state.stats.courseCompleted = true;
        this.checkBadges();
        this.ui.progress.style.width = '100%';
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                ${this.bigCelebrateMascotHtml('love', 110)}
                <h1 style="text-align: center;">Hoàn thành khóa học!</h1>
                <p style="text-align: center; color: #777;">Bạn đã chinh phục toàn bộ bài học. Tuyệt vời lắm!</p>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        this.playBigCelebration();
        // an extra confetti wave for the biggest moment in the app
        if (window.confetti) setTimeout(() => confetti({ particleCount: 160, spread: 100, origin: { y: 0.5 } }), 350);
    },

    returnToApp() {
        const inLimitedMode = ['practice', 'assessment', 'placement', 'gate'].includes(this.state.mode);
        if (!this.state.currentUser) {
            this.renderAuthScreen();
        } else if (!inLimitedMode && this.state.hearts <= 0) {
            this.renderOutOfHearts();
        } else if (!inLimitedMode && this.state.currentUnitIdx >= this.state.courseData.units.length) {
            this.renderCourseComplete();
        } else {
            this.renderLesson();
        }
    },

    getMsUntilNextHeart() {
        const lastUpdate = this.state.lastHeartUpdate || Date.now();
        const elapsed = Date.now() - lastUpdate;
        return Math.max(0, HEART_REGEN_MS - elapsed);
    },

    updateHeartCountdown() {
        const el = document.getElementById('heart-countdown');
        if (!el) {
            clearInterval(this.heartCountdownInterval);
            return;
        }
        // Run the regen accounting on every countdown tick so the heart lands the
        // second it is due - not up to 59s later when the minute interval fires.
        this.applyHeartRegen();
        if (this.state.hearts > 0) {
            clearInterval(this.heartCountdownInterval);
            this.renderLesson();
            return;
        }
        const ms = this.getMsUntilNextHeart();
        const totalSec = Math.ceil(ms / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        el.textContent = `Tim tiếp theo sau: ${min}:${sec.toString().padStart(2, '0')}`;
    },

    renderOutOfHearts() {
        this.saveUserProgress();
        this.ui.container.innerHTML = `
            <div class="welcome-screen out-of-hearts">
                <div class="duo-character mascot-cry">💔</div>
                <h1 style="text-align: center;">Hết tim rồi!</h1>
                <p style="text-align: center; color: #777;">Chờ hồi tim hoặc chơi trò chơi để nhận thêm tim nhé.</p>
                <p style="text-align: center; font-weight: 800; font-size: 20px; color: var(--duo-red);" id="heart-countdown"></p>
                <button class="btn-primary" id="out-of-hearts-games" style="display: block; margin: 20px auto; padding: 15px 30px;">🎮 CHƠI GAME KIẾM TIM</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('out-of-hearts-games').addEventListener('click', () => this.renderGamePicker());
        this.playTone('whimper');

        this.updateHeartCountdown();
        clearInterval(this.heartCountdownInterval);
        this.heartCountdownInterval = setInterval(() => this.updateHeartCountdown(), 1000);
    },

    showHeartRewardToast(amount) {
        const toast = document.createElement('div');
        toast.className = 'badge-toast';
        toast.innerHTML = `<span class="badge-toast-icon">❤️</span><div><strong>+${amount} tim!</strong><br>Phần thưởng từ trò chơi</div>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    },

    startPracticeMode() {
        if (!this.state.currentUser) {
            alert("Vui lòng đăng nhập trước khi luyện tập!");
            return;
        }
        if (!window.ExerciseGenerator) return;

        // Tell the learner the rules once per session before the first drill, so the
        // "no XP penalty on skip" and "need >55% to earn XP" are never a surprise.
        if (!this.practiceIntroShown) {
            this.practiceIntroShown = true;
            const xp = (this.state.courseData.settings || {}).xp_per_lesson || 0;
            this.showConfirmDialog(
                `🏋️ Luyện tập tự do:\n• Bỏ qua câu KHÔNG bị trừ XP.\n• Trả lời đúng trên 55% số câu để được +${xp} XP (như một bài học).\n• Số câu nhiều hơn bài chính để bạn luyện sâu hơn.\nCùng luyện nào!`,
                () => this.beginPracticeSession(),
                { okLabel: 'BẮT ĐẦU', cancelLabel: 'ĐỂ SAU' }
            );
            return;
        }
        this.beginPracticeSession();
    },

    beginPracticeSession() {
        if (!window.ExerciseGenerator) return;

        // Rank is the authoritative floor now (it supersedes placementLevel, which is
        // still kept around only as the "has this user ever been placed" flag - see
        // getRankInfo()'s comment) - recommendDifficulty() can still push it higher if
        // the learner's recent accuracy is running ahead of their rank, but never lower,
        // since a rank demotion (see renderDuelResult()/skipCurrentExercise()) should
        // immediately make new exercises easier again without any extra bookkeeping here.
        const baseDifficulty = this.errorTracker ? this.errorTracker.recommendDifficulty() : 1;
        const rankDifficulty = getRankInfo(this.state.xp).difficulty;
        let difficulty = Math.max(baseDifficulty, rankDifficulty);
        // The "Chế độ Dễ (cho trẻ nhỏ)" toggle and the first-10-chapters beginner zone must
        // also make FREE PRACTICE gentle - otherwise a high-level user who turns Easy mode
        // on still gets hard generated drills here (the reported gap).
        if (this.isBeginnerMode() || (this.state.stats && this.state.stats.easyMode)) difficulty = 1;
        const weakKeys = this.errorTracker ? new Set(this.errorTracker.getWeakItems(30)) : new Set();
        // Match ALL_TYPES.length so every exercise type appears at least once per session -
        // generateBatch round-robins by index, so a fixed count smaller than the type list
        // would permanently starve whichever types sit at the tail of ALL_TYPES.
        const batchSize = window.ExerciseGenerator.ALL_TYPES ? window.ExerciseGenerator.ALL_TYPES.length : 10;

        this.state.mode = 'practice';
        // A FREE practice session must never inherit the core-review flag: if the user
        // abandoned an "ôn luyện củng cố" round mid-way (home button, nav menu), a stale
        // lessonReviewCore would make THIS session end on the review recap instead of
        // renderPracticeSummary - mixing the two flows and silently skipping the
        // practice XP reward. (User-reported: review and free practice jumping into
        // each other.)
        this.state.lessonReviewCore = null;
        this.state.practiceQueue = window.ExerciseGenerator.generateBatch(batchSize, difficulty, weakKeys);
        this.state.practiceIdx = 0;
        this.resetSessionAnswers();
        this.renderLesson();
    },

    nextPracticeExercise() {
        this.state.practiceIdx++;
        if (this.state.practiceIdx >= this.state.practiceQueue.length) {
            // A post-lesson reinforcement round rides the practice machinery but ends
            // on its own recap screen (see startLessonReview()) - normal practice
            // sessions are untouched.
            if (this.state.lessonReviewCore) {
                this.renderLessonReviewDone();
            } else {
                this.renderPracticeSummary();
            }
        } else {
            this.renderLesson();
        }
    },

    renderPracticeSummary() {
        this.state.stats.practiceSessions++;
        this.addVibrancy(5);

        // Reward: the SAME XP as a main lesson, but only when this session's accuracy is
        // above 55% (announced in the intro). Skips count as wrong for the ratio, but
        // cost no XP - so it's a pure upside that rewards consistent effort.
        const PASS_PCT = 55;
        const answers = this.state.sessionAnswers || [];
        const total = this.state.practiceQueue.length || answers.length || 1;
        const correct = answers.filter(r => r.isCorrect).length;
        const pct = Math.round((correct / total) * 100);
        const xpReward = (this.state.courseData.settings || {}).xp_per_lesson || 0;
        const passed = pct > PASS_PCT;
        if (passed && xpReward > 0) {
            this.state.xp += xpReward;
            this.ui.xp.innerText = this.state.xp;
            this.syncLeaderboardScore();
        }
        this.checkBadges();

        const rewardBanner = passed
            ? `<div class="practice-reward practice-reward-win">🎉 Đúng ${correct}/${total} (${pct}%) — Thưởng +${xpReward} XP!</div>`
            : `<div class="practice-reward practice-reward-miss">Đúng ${correct}/${total} (${pct}%) — Cần đúng trên ${PASS_PCT}% để nhận +${xpReward} XP. Luyện thêm nhé!</div>`;

        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                ${this.bigCelebrateMascotHtml(passed ? 'love' : 'excited', 96)}
                <h1 style="text-align: center;">Hoàn thành buổi luyện tập!</h1>
                <p style="text-align: center; color: #777;">Bạn đã luyện ${total} câu.</p>
                ${rewardBanner}
                ${this.sessionSummaryHtml()}
                <button class="btn-primary" id="practice-again" style="display: block; margin: 20px auto; padding: 15px 30px;">LUYỆN THÊM</button>
                <button class="btn-secondary" id="practice-exit" style="display: block; margin: 10px auto; padding: 15px 30px;">VỀ TRANG CHÍNH</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        this.playBigCelebration(passed);
        document.getElementById('practice-again').addEventListener('click', () => this.startPracticeMode());
        document.getElementById('practice-exit').addEventListener('click', () => {
            this.state.mode = 'curriculum';
            this.renderHomeDashboard();
        });
    },

    startAssessment() {
        if (!this.state.currentUser) {
            alert("Vui lòng đăng nhập trước khi làm bài kiểm tra!");
            return;
        }
        if (!window.ExerciseGenerator) return;

        this.state.mode = 'assessment';
        this.state.practiceQueue = window.ExerciseGenerator.generateBatch(20, 2, null);
        this.state.practiceIdx = 0;
        this.state.assessmentCorrect = 0;
        this.resetSessionAnswers();
        this.renderLesson();
    },

    // ============== Chapter gate test (Cluster B) ==============
    // A mandatory pass-test between chapters. Its questions aggregate the CORE content of
    // every lesson in the chapter (reusing buildLessonReviewQueue, which pulls from the
    // whole unit's vocab, then shuffles/dedupes/caps). Passing (>=70%) awards DOUBLE a
    // lesson's XP and unlocks the next chapter; failing lets the learner retry. No hearts
    // are staked (it's a knowledge check, not a survival run).
    buildChapterGateQueue(unit) {
        let q = [];
        (unit.lessons || []).forEach((l, i) => { q = q.concat(this.buildLessonReviewQueue(unit, i) || []); });
        const seen = new Set(); const out = [];
        for (const ex of shuffleArray(q)) {
            const key = (ex.question || ex.target || ex.source || JSON.stringify(ex.correct || '')).toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key); out.push(ex);
            if (out.length >= 12) break;
        }
        return out;
    },

    startChapterGate() {
        const unit = this.state.courseData.units[this.state.currentUnitIdx];
        if (!unit) { this.advanceChapterAfterGate(); this.renderLesson(); return; }
        const queue = this.buildChapterGateQueue(unit);
        if (queue.length < 3) { // not enough distinct core to test - just unlock
            this.advanceChapterAfterGate();
            if (this.state.currentUnitIdx >= this.state.courseData.units.length) this.renderCourseComplete();
            else this.renderLesson();
            return;
        }
        this.state.mode = 'gate';
        this.state.practiceQueue = queue;
        this.state.practiceIdx = 0;
        this.state.gateCorrect = 0;
        this.resetSessionAnswers();
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">🎯</div>
                <h1 style="text-align: center;">Kiểm tra qua Chương ${this.state.currentUnitIdx + 1}!</h1>
                <p style="text-align: center; color: #777;">Trả lời đúng <b>≥ 70%</b> để vượt qua và mở khoá chương tiếp theo. Tổng hợp cốt lõi cả chương (${queue.length} câu) — không tính tim.</p>
                <p style="text-align: center; font-weight: 800; color: var(--duo-green);">🏆 Vượt qua được thưởng GẤP ĐÔI điểm XP!</p>
                <button class="btn-primary" id="gate-start" style="display: block; margin: 20px auto; padding: 15px 30px;">BẮT ĐẦU KIỂM TRA</button>
            </div>`;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        if (this.ui.skipBtn) this.ui.skipBtn.style.display = 'none';
        document.getElementById('gate-start').addEventListener('click', () => this.renderLesson());
    },

    nextGateExercise() {
        this.state.practiceIdx++;
        if (this.state.practiceIdx >= this.state.practiceQueue.length) {
            this.finishChapterGate();
        } else {
            this.renderLesson();
        }
    },

    // Shared "continue" after a lesson summary / review round: routes into the mandatory
    // chapter gate test when this was the chapter's last lesson, otherwise into the next
    // lesson (or the course-complete screen).
    continueAfterLesson() {
        this.resetSessionAnswers();
        if (this.state.pendingChapterGate != null) {
            this.startChapterGate();
            return;
        }
        if (this.state.currentUnitIdx >= this.state.courseData.units.length) {
            this.renderCourseComplete();
        } else {
            this.renderLesson();
        }
    },

    advanceChapterAfterGate() {
        this.state.pendingChapterGate = null;
        this.state.currentUnitIdx++;
        this.state.currentLessonIdx = 0;
        this.state.currentExIdx = 0;
        this.saveUserProgress();
    },

    finishChapterGate() {
        const total = this.state.practiceQueue.length || 1;
        const correct = this.state.gateCorrect || 0;
        const pct = Math.round((correct / total) * 100);
        const passed = pct >= 70;
        const chapterNum = this.state.currentUnitIdx + 1;
        this.state.mode = 'curriculum';
        let reward = 0;
        if (passed) {
            reward = ((this.state.courseData.settings || {}).xp_per_lesson || 10) * 2;
            this.state.xp += reward;
            this.state.weeklyXp = (this.state.weeklyXp || 0) + reward;
            this.state.stats.assessmentsPassed = (this.state.stats.assessmentsPassed || 0) + 1;
            this.advanceChapterAfterGate();
            this.syncLeaderboardScore();
            this.checkBadges();
        }
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                ${passed ? this.bigCelebrateMascotHtml('love', 100) : `<div class="duo-character">${getMascotSvg('surprised', 100)}</div>`}
                <h1 style="text-align: center;">${passed ? `🎉 Vượt qua Chương ${chapterNum}!` : 'Chưa đạt, cố lên nhé!'}</h1>
                <p style="text-align: center; color: #777;">Bạn trả lời đúng ${correct}/${total} câu (${pct}%).</p>
                ${passed
                    ? `<div class="practice-reward practice-reward-win">🏆 Thưởng GẤP ĐÔI: +${reward} XP!</div>`
                    : `<div class="practice-reward practice-reward-miss">Cần đúng ≥ 70% để qua chương. Ôn lại rồi thử lại nhé!</div>`}
                <button class="btn-primary" id="gate-continue" style="display: block; margin: 20px auto; padding: 15px 30px;">${passed ? 'HỌC CHƯƠNG MỚI ➜' : 'LÀM LẠI'}</button>
                <button class="btn-secondary" id="gate-home" style="display: block; margin: 0 auto; padding: 12px 26px;">VỀ TRANG CHÍNH</button>
            </div>`;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        if (this.ui.skipBtn) this.ui.skipBtn.style.display = 'none';
        if (passed) this.playBigCelebration();
        document.getElementById('gate-continue').addEventListener('click', () => {
            this.resetSessionAnswers();
            if (passed) {
                if (this.state.currentUnitIdx >= this.state.courseData.units.length) this.renderCourseComplete();
                else this.renderLesson();
            } else {
                this.startChapterGate(); // retry the same chapter's gate
            }
        });
        document.getElementById('gate-home').addEventListener('click', () => this.renderHomeDashboard());
    },

    // Shown once, right before a brand-new account's very first placement test - without
    // it, a new user just gets dropped straight into 10 unexplained questions with no
    // idea why, which reads as broken rather than intentional.
    renderPlacementIntro() {
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">🎯</div>
                <h1 style="text-align: center;">Chào mừng bạn đến với KhoaiBonlingo!</h1>
                <p style="text-align: center; color: #777;">Trước khi bắt đầu, bạn cần hoàn thành <strong>bài test xếp loại năng lực</strong> (10 câu, chỉ mất khoảng 2-3 phút) để chúng mình biết trình độ tiếng Anh hiện tại của bạn.</p>
                <p style="text-align: center; color: #777;">Kết quả sẽ được dùng để xếp hạng khởi điểm, gắn kèm danh hiệu trên hồ sơ của bạn, và điều chỉnh độ khó của các bài học sao cho phù hợp nhất.</p>
                <button class="btn-primary" id="placement-intro-start" style="display: block; margin: 20px auto; padding: 15px 30px;">BẮT ĐẦU TEST</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('placement-intro-start').addEventListener('click', () => this.startPlacementTest());
    },

    startPlacementTest() {
        this.state.mode = 'placement';
        this.state.practiceQueue = this.buildPlacementQueue();
        this.state.practiceIdx = 0;
        this.state.assessmentCorrect = 0;
        this.resetSessionAnswers();
        this.renderLesson();
    },

    buildPlacementQueue() {
        const types = ['multiple_choice', 'translate', 'ordering', 'fill_blank'];
        const difficulties = [1, 1, 1, 2, 2, 2, 2, 3, 3, 3];
        return difficulties.map((d, i) => window.ExerciseGenerator.generateExercise(types[i % types.length], d, null));
    },

    nextPlacementExercise() {
        this.state.practiceIdx++;
        if (this.state.practiceIdx >= this.state.practiceQueue.length) {
            this.finishPlacementTest();
        } else {
            this.renderLesson();
        }
    },

    finishPlacementTest() {
        const total = this.state.practiceQueue.length;
        const correct = this.state.assessmentCorrect;
        const ratio = total > 0 ? correct / total : 0;
        let level = 1;
        if (ratio >= 0.75) level = 3;
        else if (ratio >= 0.4) level = 2;

        this.state.stats.placementLevel = level;

        // Seeds a starting rank via upfront XP rather than a separate "starting level"
        // field - getRankInfo() is a pure function of total xp (see its definition), so
        // granting a bonus here is the only way for the placement result to actually
        // move the needle on rank; a strong result lands around Vàng (Gold), a middling
        // one around Bạc (Silver), a weak one starts at the very bottom (Đồng/Bronze).
        const placementXpBonus = ratio >= 0.75 ? 2000 : (ratio >= 0.4 ? 1000 : 0);
        this.state.xp += placementXpBonus;
        this.state.weeklyXp = this.state.xp;

        this.state.mode = 'curriculum';
        this.saveUserProgress();
        this.syncLeaderboardScore();

        const rankInfo = getRankInfo(this.state.xp);
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">🎯</div>
                <h1 style="text-align: center;">Xếp loại năng lực xong!</h1>
                <p style="text-align: center; color: #777;">Bạn trả lời đúng ${correct}/${total} câu.</p>
                <p style="text-align: center; font-weight: 800; font-size: 22px; color: var(--duo-green);">Danh hiệu khởi điểm: ${rankInfo.rankIcon} ${this.escapeHtml(rankInfo.rankName)} (Cấp ${rankInfo.level})</p>
                <p style="text-align: center; color: #777;">Các bài luyện tập sẽ được điều chỉnh phù hợp và tăng dần độ khó theo danh hiệu của bạn.</p>
                ${this.sessionSummaryHtml()}
                <button class="btn-primary" id="placement-done" style="display: block; margin: 20px auto; padding: 15px 30px;">BẮT ĐẦU HỌC</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('placement-done').addEventListener('click', () => this.startCourse());
    },

    nextAssessmentExercise() {
        this.state.practiceIdx++;
        if (this.state.practiceIdx >= this.state.practiceQueue.length) {
            this.renderCertificateResult();
        } else {
            this.renderLesson();
        }
    },

    renderCertificateResult() {
        const total = this.state.practiceQueue.length;
        const correct = this.state.assessmentCorrect;
        const scorePct = Math.round((correct / total) * 100);
        const passed = scorePct >= 70;
        const level = scorePct >= 90 ? 'Xuất sắc' : (scorePct >= 70 ? 'Đạt yêu cầu' : 'Cần cố gắng thêm');
        const dateStr = new Date().toLocaleDateString('vi-VN');

        if (passed) {
            this.state.stats.assessmentsPassed++;
            this.state.stats.certificates = this.state.stats.certificates || [];
            this.state.stats.certificates.push({ score: scorePct, level, awardedAt: new Date().toISOString() });
            this.ui.container.innerHTML = `
                <div class="certificate">
                    <div class="certificate-badge">🏅</div>
                    <h2>CHỨNG CHỈ HOÀN THÀNH</h2>
                    <p class="certificate-name">${this.escapeHtml(this.state.currentUser)}</p>
                    <p>đã hoàn thành bài kiểm tra đánh giá với kết quả</p>
                    <p class="certificate-score">${scorePct}% — ${level}</p>
                    <p class="certificate-date">Ngày ${dateStr}</p>
                </div>
                ${this.sessionSummaryHtml()}
                <button class="btn-primary" id="cert-done" style="display: block; margin: 20px auto; padding: 15px 30px;">HOÀN TẤT</button>
            `;
        } else {
            this.ui.container.innerHTML = `
                <div class="welcome-screen">
                    <div class="duo-character mascot-cry">📝</div>
                    <h1 style="text-align: center;">Kết quả: ${scorePct}%</h1>
                    <p style="text-align: center; color: #777;">Bạn cần đạt ít nhất 70% để nhận chứng chỉ. Hãy luyện tập thêm rồi thử lại nhé!</p>
                    ${this.sessionSummaryHtml()}
                    <button class="btn-primary" id="cert-done" style="display: block; margin: 20px auto; padding: 15px 30px;">VỀ TRANG CHÍNH</button>
                </div>
            `;
        }

        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('cert-done').addEventListener('click', () => {
            this.state.mode = 'curriculum';
            this.renderHomeDashboard();
        });

        this.playTone(passed ? 'cheer' : 'cry');
        this.addVibrancy(passed ? 10 : 5);
        this.checkBadges();
        this.saveUserProgress();
    },

    // Silently applies any hearts gifted by friends while the user was away (or just
    // sitting on another screen) - the sender only ever wrote to their OWN row (see
    // friends.js giftHeart()), so claiming means incrementing OUR OWN hearts and
    // marking the gift claimed, both self-updates allowed under the existing RLS model.
    async claimPendingHeartGifts() {
        if (!window.Friends || !window.Friends.isConfigured || !this.state.profile) return;
        const gifts = await window.Friends.getUnclaimedGifts(this.state.profile.id);
        if (!gifts.length) return;
        let totalGained = 0;
        for (const gift of gifts) {
            const before = this.state.hearts;
            // Same overflow-safe capping as applyGameReward(): gifts respect MAX_HEARTS
            // but must never clamp DOWN hearts already above it (achievement bonuses).
            this.state.hearts = Math.max(this.state.hearts, Math.min(MAX_HEARTS, this.state.hearts + 1));
            totalGained += this.state.hearts - before;
            await window.Friends.claimGift(gift.id);
        }
        this.updateHeartsDisplay();
        this.saveUserProgress();
        const lastSender = gifts[gifts.length - 1].from_username;
        const label = gifts.length > 1
            ? `🎁 Bạn nhận được ${totalGained} tim từ bạn bè!`
            : `🎁 Bạn nhận được 1 tim từ ${this.escapeHtml(lastSender)}!`;
        this.showHeartGiftToast(label);
    },

    showHeartGiftToast(label) {
        const toast = document.createElement('div');
        toast.className = 'badge-toast';
        toast.innerHTML = `<span class="badge-toast-icon">❤️</span><div>${label}</div>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    },

    renderCertificateHistory() {
        const certificates = (this.state.stats.certificates || []).slice().reverse();
        const listHtml = certificates.length ? certificates.map(c => `
            <div class="certificate">
                <div class="certificate-badge">🏅</div>
                <h2>CHỨNG CHỈ HOÀN THÀNH</h2>
                <p class="certificate-name">${this.escapeHtml(this.state.currentUser)}</p>
                <p>đã hoàn thành bài kiểm tra đánh giá với kết quả</p>
                <p class="certificate-score">${c.score}% — ${this.escapeHtml(c.level)}</p>
                <p class="certificate-date">Ngày ${new Date(c.awardedAt).toLocaleDateString('vi-VN')}</p>
            </div>
        `).join('') : `<p style="text-align: center; color: #777;">Bạn chưa có chứng chỉ nào. Hãy vượt qua bài kiểm tra đánh giá (≥70%) để nhận chứng chỉ đầu tiên!</p>`;

        this.ui.container.innerHTML = `
            <div class="achievements-screen">
                <h2 style="text-align: center;">🎖️ Chứng Chỉ Của Tôi</h2>
                <div style="max-height: 60vh; overflow-y: auto;">${listHtml}</div>
                <button class="btn-primary" id="cert-history-close" style="margin-top: 20px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('cert-history-close').addEventListener('click', () => this.renderHomeDashboard());
    }
});
