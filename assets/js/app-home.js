// app-home.js — DuoClone methods split out of the former monolithic app.js.
// Attaches to DuoClone.prototype (defined in app.js). Load AFTER app.js and BEFORE
// app-main.js (which instantiates the app). Pure mechanical split - no behavior change.
Object.assign(DuoClone.prototype, {
    getGreeting() {
        const hour = new Date().getHours();
        if (hour < 11) return 'Chào buổi sáng';
        if (hour < 18) return 'Chào buổi chiều';
        return 'Chào buổi tối';
    },

    renderHomeDashboard() {
        if (!this.state.currentUser) { this.renderAuthScreen(); return; }
        // Cleans up any global-chat realtime subscription left over from a previous
        // visit to this screen before the DOM (and the widget state) gets rebuilt below
        // - without this, revisiting Home repeatedly while the chat was left open would
        // stack a new channel on top of the old one every time.
        this.cleanupGlobalChat();
        this.cleanupActivityTicker();
        this.state.mode = 'curriculum';
        this.updateNav();
        // Fire-and-forget: keeps the reigning king's exclusive nav-avatar frame current
        // without ever blocking the dashboard render.
        this.refreshWeeklyKing();
        const unit = this.state.courseData.units[this.state.currentUnitIdx];
        const lesson = unit ? unit.lessons[this.state.currentLessonIdx] : null;

        this.ui.container.innerHTML = `
            <div class="home-dashboard">
                <div class="activity-ticker" id="activity-ticker">
                    <div class="activity-ticker-track" id="activity-ticker-track"></div>
                </div>

                <div class="home-greeting-row">
                    <div class="home-greeting-mascot">${getMascotSvg('happy', 100)}</div>
                    <div>
                        <h1 class="home-greeting-text">${this.getGreeting()}, ${this.escapeHtml(this.state.currentUser)}!</h1>
                        <p class="home-streak-line">⭐ ${this.state.xp} XP &nbsp;•&nbsp; ❤️ ${this.state.hearts} tim</p>
                    </div>
                </div>

                ${this.streakCardHtml()}

                <div class="mentor-tip-card">
                    <div class="mentor-tip-icon">${getMascotSvg('idle', 44)}</div>
                    <p class="mentor-tip-text">${this.escapeHtml(this.getMentorTip())}</p>
                </div>

                ${lesson ? `
                    <button class="btn-primary home-continue-btn" id="home-continue-btn">
                        TIẾP TỤC HỌC: ${this.escapeHtml(lesson.title)}
                    </button>
                ` : ''}

                <div class="global-chat-widget" id="global-chat-widget">
                    <button class="global-chat-toggle" id="global-chat-toggle">
                        <span>🌐 Chat Cộng Đồng <span id="global-chat-unread-badge" class="nav-unread-badge hidden">0</span></span>
                        <span id="global-chat-toggle-icon">▾</span>
                    </button>
                    <div class="global-chat-body hidden" id="global-chat-body">
                        <div class="global-chat-messages" id="global-chat-messages"></div>
                        <div class="global-chat-input-row">
                            <input type="text" id="global-chat-input" class="input-field" maxlength="500" placeholder="Nhắn gì đó với mọi người...">
                            <button class="btn-primary" id="global-chat-send">GỬI</button>
                        </div>
                    </div>
                </div>

                <h2 class="home-path-heading">🗺️ Lộ trình học tập</h2>
                <div class="unit-strip" id="unit-strip"></div>
                <div class="path-map" id="path-map"></div>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        if (this.ui.skipBtn) this.ui.skipBtn.style.display = 'none';

        const continueBtn = document.getElementById('home-continue-btn');
        if (continueBtn) continueBtn.addEventListener('click', () => this.renderLesson());

        // "Play with me": tapping the greeting mascot triggers a random cute action.
        const greetMascot = document.querySelector('.home-greeting-mascot');
        if (greetMascot) {
            greetMascot.classList.add('mascot-tappable');
            greetMascot.setAttribute('title', 'Chạm vào tớ để chơi nào! 🎉');
            greetMascot.addEventListener('click', () => this.mascotPlay(greetMascot));
        }

        this.renderUnitStrip();
        this.renderPathMap(this.state.currentUnitIdx);
        this.initGlobalChatWidget();
        this.initActivityTicker();
        this.refreshStreakRank();
    },

    // Wires the toggle + send controls ONCE right after the widget's markup is created -
    // toggling the panel open/closed only ever flips a CSS class on the existing DOM (see
    // toggleGlobalChat()), so wiring these here (rather than inside the open/close logic
    // itself) avoids attaching a second click handler to the same send button every time
    // the user re-opens the panel.
    initGlobalChatWidget() {
        const toggle = document.getElementById('global-chat-toggle');
        if (toggle) toggle.addEventListener('click', () => this.toggleGlobalChat());

        const sendBtn = document.getElementById('global-chat-send');
        const input = document.getElementById('global-chat-input');
        const send = async () => {
            if (!input || !window.GlobalChat || !this.state.profile) return;
            const text = input.value.trim();
            if (!text) return;
            input.value = '';
            const result = await window.GlobalChat.sendMessage(this.state.profile, text);
            if (result.error) { alert(result.error); return; }
            // Chatting counts toward the user's "Sôi nổi" score, mirroring how group
            // chat activity feeds the group's vibrancy.
            this.addVibrancy(1);
            this.saveUserProgress();
        };
        if (sendBtn) sendBtn.addEventListener('click', send);
        if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });

        // The badge element itself is rebuilt fresh on every Home render - reflect
        // whatever setupGlobalChatWatcher() has already tracked in memory since login.
        this.updateGlobalChatBadge(this.state.globalChatUnreadCount || 0);
    },

    getGlobalChatLastSeen() {
        if (!this.state.profile) return null;
        return localStorage.getItem(`duo_global_chat_last_seen_${this.state.profile.id}`);
    },

    setGlobalChatLastSeen(iso) {
        if (!this.state.profile) return;
        localStorage.setItem(`duo_global_chat_last_seen_${this.state.profile.id}`, iso);
    },

    updateGlobalChatBadge(count) {
        const badge = document.getElementById('global-chat-unread-badge');
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    },

    // Called once per login (completeLogin()), mirroring setupInboxWatcher()/
    // setupFriendRequestWatcher() - keeps the unread badge current for the whole
    // session, not just while the Home dashboard happens to be open. Uses its own
    // channelKey ('badge-watcher') distinct from the widget's own open/closed
    // subscription (see subscribeToNewMessages()'s doc comment in global-chat.js).
    async setupGlobalChatWatcher() {
        if (!window.GlobalChat || !window.GlobalChat.isConfigured || !this.state.profile) return;
        const lastSeen = this.getGlobalChatLastSeen() || new Date(0).toISOString();
        this.state.globalChatUnreadCount = await window.GlobalChat.getUnreadCount(lastSeen);
        this.updateGlobalChatBadge(this.state.globalChatUnreadCount);
        if (this.globalChatWatcherUnsub) this.globalChatWatcherUnsub();
        this.globalChatWatcherUnsub = window.GlobalChat.subscribeToNewMessages((msg) => {
            if (this.state.profile && msg.sender_id === this.state.profile.id) return;
            const body = document.getElementById('global-chat-body');
            const widgetOpen = body && !body.classList.contains('hidden');
            if (widgetOpen) {
                // Already looking at the chat - the widget's own subscription (see
                // toggleGlobalChat()) live-appends it there, so treat it as seen
                // immediately instead of incrementing the badge behind the user's back.
                this.setGlobalChatLastSeen(new Date().toISOString());
                return;
            }
            this.state.globalChatUnreadCount = (this.state.globalChatUnreadCount || 0) + 1;
            this.updateGlobalChatBadge(this.state.globalChatUnreadCount);
        }, 'badge-watcher');
    },

    async toggleGlobalChat() {
        const body = document.getElementById('global-chat-body');
        const icon = document.getElementById('global-chat-toggle-icon');
        if (!body) return;
        const opening = body.classList.contains('hidden');
        body.classList.toggle('hidden');
        if (icon) icon.textContent = opening ? '▴' : '▾';

        if (!opening) {
            this.cleanupGlobalChat();
            return;
        }
        this.setGlobalChatLastSeen(new Date().toISOString());
        this.state.globalChatUnreadCount = 0;
        this.updateGlobalChatBadge(0);
        if (!window.GlobalChat) return;
        const messages = await window.GlobalChat.getRecentMessages(50);
        this.renderGlobalChatMessages(messages);
        this.setupGlobalChatHistoryScroll(messages);
        this.cleanupGlobalChat();
        this.globalChatUnsub = window.GlobalChat.subscribeToNewMessages((msg) => {
            // Defensive check: if the user has since navigated away from Home, this
            // channel keeps running (see cleanupGlobalChat() comment above) until the
            // next Home visit cleans it up - guard against writing into a DOM node that
            // no longer exists rather than erroring.
            const listEl = document.getElementById('global-chat-messages');
            if (!listEl) return;
            this.appendGlobalChatMessage(msg);
            this.setGlobalChatLastSeen(new Date().toISOString());
        });
    },

    renderGlobalChatMessages(messages) {
        const listEl = document.getElementById('global-chat-messages');
        if (!listEl) return;
        listEl.innerHTML = messages.length
            ? messages.map(m => this.globalChatMessageHtml(m)).join('')
            : '<p style="text-align:center; color:#999; font-size:13px;">Chưa có tin nhắn nào. Hãy là người đầu tiên chào hỏi!</p>';
        listEl.scrollTop = listEl.scrollHeight;
    },

    appendGlobalChatMessage(msg) {
        const listEl = document.getElementById('global-chat-messages');
        if (!listEl) return;
        listEl.insertAdjacentHTML('beforeend', this.globalChatMessageHtml(msg));
        listEl.scrollTop = listEl.scrollHeight;
    },

    cleanupGlobalChat() {
        if (this.globalChatUnsub) {
            this.globalChatUnsub();
            this.globalChatUnsub = null;
        }
    },

    // "Kéo lên để xem lịch sử" for the community chat: when the user scrolls near the
    // top of the message list, one older page is fetched (strictly before the oldest
    // message currently shown) and prepended, preserving the visual scroll position.
    // Uses onscroll assignment (not addEventListener) so re-opening the widget can't
    // stack duplicate handlers on the same element.
    setupGlobalChatHistoryScroll(initialMessages) {
        const listEl = document.getElementById('global-chat-messages');
        if (!listEl) return;
        this.state.globalChatOldestIso = initialMessages.length ? initialMessages[0].created_at : null;
        // A first page smaller than the requested 50 means there is nothing older.
        this.state.globalChatHasOlder = initialMessages.length >= 50;
        this.state.globalChatLoadingOlder = false;

        listEl.onscroll = async () => {
            if (listEl.scrollTop > 40) return;
            if (this.state.globalChatLoadingOlder || !this.state.globalChatHasOlder || !this.state.globalChatOldestIso) return;
            this.state.globalChatLoadingOlder = true;
            try {
                const older = await window.GlobalChat.getMessagesBefore(this.state.globalChatOldestIso, 50);
                if (!older.length) {
                    this.state.globalChatHasOlder = false;
                    return;
                }
                this.state.globalChatOldestIso = older[0].created_at;
                this.state.globalChatHasOlder = older.length >= 50;
                const prevHeight = listEl.scrollHeight;
                listEl.insertAdjacentHTML('afterbegin', older.map(m => this.globalChatMessageHtml(m)).join(''));
                // Keep the message the user was looking at in place instead of snapping
                // the view to the very top of the newly-prepended block.
                listEl.scrollTop += listEl.scrollHeight - prevHeight;
            } finally {
                this.state.globalChatLoadingOlder = false;
            }
        };
    },

    // Community-wide scrolling ticker (welcome/badge/level-up/teddy-bear/streak-top1
    // events, broadcast via activity-feed.js's Realtime channel) - always running while
    // Home is on screen, no toggle/collapse unlike the chat widget, since it's meant to be
    // ambient background info rather than something the user opens deliberately.
    // Keeps only FRESH events on screen: anything older than 12h is dropped, and at
    // most the 12 newest are shown - the DB retains 72h of history (see activity-feed
    // .js's cleanup window), but a marquee crowded with day-old news buries whatever
    // just happened, which defeats its purpose as a live ticker.
    pruneTickerEvents(events) {
        // Show MORE news and keep it a bit longer than before (was 12 items / 12h):
        // up to 20 items within 24h, so the strip carries enough activity without
        // going stale. The DB retains 72h (see activity-feed.js), and newest-first
        // ordering keeps fresh news leading regardless.
        const MAX_TICKER_AGE_MS = 24 * 60 * 60 * 1000;
        const MAX_TICKER_ITEMS = 20;
        const cutoff = Date.now() - MAX_TICKER_AGE_MS;
        return (events || [])
            .filter(e => !e.created_at || new Date(e.created_at).getTime() >= cutoff)
            .slice(-MAX_TICKER_ITEMS);
    },

    async initActivityTicker() {
        if (!window.ActivityFeed) return;
        // 5-minute TTL on the backfill fetch: every dashboard visit used to re-query the
        // last 40 events even though the realtime subscription below keeps the list live
        // anyway. Within the TTL we just re-render what we already have.
        const TICKER_FETCH_TTL_MS = 5 * 60 * 1000;
        const fresh = this._tickerFetchedAt && (Date.now() - this._tickerFetchedAt < TICKER_FETCH_TTL_MS)
            && (this.state.activityTickerEvents || []).length;
        if (!fresh) {
            this.state.activityTickerEvents = this.pruneTickerEvents(await window.ActivityFeed.getRecentEvents(40));
            this._tickerFetchedAt = Date.now();
        }
        this.renderActivityTicker();
        this.cleanupActivityTicker();
        this.activityTickerUnsub = window.ActivityFeed.subscribeToNewEvents((event) => {
            const track = document.getElementById('activity-ticker-track');
            if (!track) return;
            this.state.activityTickerEvents = this.pruneTickerEvents([...(this.state.activityTickerEvents || []), event]);
            this.renderActivityTicker();
        });
    },

    renderActivityTicker() {
        const track = document.getElementById('activity-ticker-track');
        if (!track) return;
        const events = this.state.activityTickerEvents || [];
        if (!events.length) {
            track.innerHTML = '';
            track.style.animation = 'none';
            return;
        }
        // Two IDENTICAL copies back-to-back drive a seamless CSS loop: the track is
        // animated translateX(0) -> -50%, and -50% of the track equals exactly one
        // copy's width ONLY when the two copies are the same width. Each copy therefore
        // ends with the same trailing separator (so the wrap-around join also shows a
        // bullet), and the track must have NO left padding (see .activity-ticker-track)
        // or -50% would no longer land on a copy boundary and the loop would jump.
        // Newest event FIRST: the marquee restarts from its beginning on every
        // (re)render, so fresh news must lead the strip.
        const SEP = '&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;';
        const copy = [...events].reverse().map(e => this.escapeHtml(e.message)).join(SEP) + SEP;
        track.innerHTML = `<span>${copy}</span><span aria-hidden="true">${copy}</span>`;
        // Scroll speed scales with content length so a short list doesn't fly by too fast
        // and a long one doesn't crawl - restarting the animation (removing then
        // re-triggering) is a minor visual reset but happens rarely (a few events/session).
        // Faster than before (was *3.5, 18-90s) per request: snappier ticker.
        const duration = Math.max(12, Math.min(58, events.length * 2.3));
        track.style.animation = 'none';
        void track.offsetWidth;
        track.style.animation = `activityTickerScroll ${duration}s linear infinite`;
    },

    cleanupActivityTicker() {
        if (this.activityTickerUnsub) {
            this.activityTickerUnsub();
            this.activityTickerUnsub = null;
        }
    },

    renderUnitStrip() {
        const strip = document.getElementById('unit-strip');
        if (!strip) return;
        strip.innerHTML = this.state.courseData.units.map((u, idx) => {
            const status = idx < this.state.currentUnitIdx ? 'done' : (idx === this.state.currentUnitIdx ? 'current' : 'locked');
            const icon = status === 'done' ? '✅' : (status === 'current' ? '📍' : '🔒');
            return `<button class="unit-chip unit-chip-${status}" data-unit-idx="${idx}">${icon} <span>${this.escapeHtml(u.title)}</span></button>`;
        }).join('');
        strip.querySelectorAll('.unit-chip').forEach(chip => {
            chip.addEventListener('click', () => this.renderPathMap(parseInt(chip.dataset.unitIdx, 10)));
        });
    },

    renderPathMap(viewedUnitIdx) {
        const map = document.getElementById('path-map');
        if (!map) return;
        const unit = this.state.courseData.units[viewedUnitIdx];
        if (!unit) return;

        document.querySelectorAll('.unit-chip').forEach(chip => {
            chip.classList.toggle('unit-chip-viewing', parseInt(chip.dataset.unitIdx, 10) === viewedUnitIdx);
        });

        // A fully locked future unit has nothing to show yet - one "fog of war" teaser
        // reads better than a wall of grey locked circles for lessons the player can't
        // even see the names of contextually yet.
        if (viewedUnitIdx > this.state.currentUnitIdx) {
            map.innerHTML = `
                <h3 class="path-map-unit-title">${this.escapeHtml(unit.title)}</h3>
                <div class="path-fog-teaser">
                    <div class="path-fog-icon">🌫️</div>
                    <p>Vùng đất chưa khám phá - hoàn thành chương hiện tại để mở khóa ${unit.lessons.length} bài học ở đây!</p>
                </div>
            `;
            return;
        }

        const isPastUnit = viewedUnitIdx < this.state.currentUnitIdx;
        // Progressive reveal ("mở rộng dần"): the current unit only shows completed
        // lessons + the current one + several upcoming locked previews - the rest stay
        // hidden behind a fog teaser rather than dumping every remaining locked node on
        // screen at once. Showing more than just 1 upcoming node (bumped from +2 to +6)
        // gives a stronger "look how much is coming up" sense of a journey ahead, rather
        // than the path feeling like it dead-ends right after the current lesson. Each
        // completed lesson pushes the fog boundary one node further, so the visible map
        // literally grows as the player advances.
        const visibleCount = isPastUnit
            ? unit.lessons.length
            : Math.min(this.state.currentLessonIdx + 6, unit.lessons.length);
        const hiddenCount = unit.lessons.length - visibleCount;

        const offsets = [0, 1, 2, 1]; // zigzag pattern, repeats every 4 nodes
        const nodesHtml = unit.lessons.slice(0, visibleCount).map((l, idx) => {
            const status = isPastUnit
                ? 'done'
                : (idx < this.state.currentLessonIdx ? 'done' : (idx === this.state.currentLessonIdx ? 'current' : 'locked'));

            const icon = status === 'done' ? '✓' : (status === 'current' ? '★' : '🔒');
            const offsetClass = `path-node-offset-${offsets[idx % offsets.length]}`;
            const mascotHtml = status === 'current' ? `<div class="path-node-mascot">${getMascotSvg('happy', 40)}</div>` : '';
            return `
                <div class="path-node-row ${offsetClass}" data-node-idx="${idx}">
                    <div class="path-node-wrap">
                        ${mascotHtml}
                        <button class="path-node path-node-${status}" data-lesson-idx="${idx}" title="${this.escapeHtml(l.title)}">
                            <span>${icon}</span>
                        </button>
                    </div>
                    <span class="path-node-label">${this.escapeHtml(l.title)}</span>
                </div>
            `;
        }).join('');

        const fogHtml = hiddenCount > 0 ? `
            <div class="path-fog-teaser path-fog-teaser-inline">
                <div class="path-fog-icon">🌫️</div>
                <p>Còn ${hiddenCount} bài học đang chờ khám phá phía trước!</p>
            </div>
        ` : '';

        map.innerHTML = `
            <h3 class="path-map-unit-title">${this.escapeHtml(unit.title)}</h3>
            <button class="scn-unit-btn" id="scn-unit-btn">
                <span class="scn-unit-btn-main">🎬 Xem tình huống giao tiếp — Chương ${viewedUnitIdx + 1}</span>
                <span class="scn-unit-btn-sub">Hoạt cảnh mới dành riêng cho chương này</span>
            </button>
            <div class="path-map-track">
                <svg class="path-road-svg" id="path-road-svg"></svg>
                ${nodesHtml}
            </div>
            ${fogHtml}
        `;

        const scnUnitBtn = document.getElementById('scn-unit-btn');
        if (scnUnitBtn) scnUnitBtn.addEventListener('click', () => this.launchUnitScenario(viewedUnitIdx));

        map.querySelectorAll('.path-node').forEach(nodeBtn => {
            nodeBtn.addEventListener('click', () => {
                if (nodeBtn.classList.contains('path-node-current')) {
                    this.renderLesson();
                } else if (nodeBtn.classList.contains('path-node-done')) {
                    this.showBriefToast('✓ Bạn đã hoàn thành bài này rồi!');
                } else {
                    this.showBriefToast('🔒 Hoàn thành các bài trước để mở khóa nhé!');
                }
            });
        });

        this.drawPathRoad();
    },

    // Draws a winding "road" through the visible node centers so the path reads as an
    // actual map/trail rather than a plain vertical list of circles. Positions are
    // measured from the live DOM (after the zigzag offsets are applied) rather than
    // computed in the abstract, so it stays correct across any viewport width.
    drawPathRoad() {
        const svg = document.getElementById('path-road-svg');
        const track = document.querySelector('.path-map-track');
        if (!svg || !track) return;
        const trackRect = track.getBoundingClientRect();
        const nodes = Array.from(track.querySelectorAll('.path-node'));
        if (nodes.length < 2) return;

        const points = nodes.map(n => {
            const r = n.getBoundingClientRect();
            return {
                x: r.left + r.width / 2 - trackRect.left,
                y: r.top + r.height / 2 - trackRect.top
            };
        });

        svg.setAttribute('viewBox', `0 0 ${trackRect.width} ${trackRect.height}`);
        svg.setAttribute('width', trackRect.width);
        svg.setAttribute('height', trackRect.height);

        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const cur = points[i];
            const midY = (prev.y + cur.y) / 2;
            d += ` C ${prev.x} ${midY}, ${cur.x} ${midY}, ${cur.x} ${cur.y}`;
        }

        svg.innerHTML = `<path d="${d}" class="path-road-line"/>`;
    },

    // Small reusable toast for brief, low-stakes feedback (path map node taps) - distinct
    // from showBadgeToast (celebratory, icon+title) and the duel invite toast (actionable
    // with buttons); this one is just a single line that fades on its own.
    showBriefToast(message) {
        const toast = document.createElement('div');
        toast.className = 'brief-toast';
        toast.innerText = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 2200);
    },

    startCourse() {
        this.ui.container.innerHTML = "";
        if (this.state.currentUnitIdx >= this.state.courseData.units.length) {
            this.renderCourseComplete();
        } else {
            this.renderHomeDashboard();
        }
    },

    // Spawns a burst of floating emoji particles (stars/hearts/confetti) that rise and
    // fade around a target element - a cheap, dependency-free "juice" layer for the
    // celebratory moments. Purely decorative: it never touches game state and cleans up
    // its own nodes, so it can be sprinkled anywhere without side effects.
    spawnMascotParticles(container, emojis, count) {
        if (!container) return;
        const host = document.createElement('div');
        host.className = 'mascot-particles';
        container.appendChild(host);
        for (let i = 0; i < count; i++) {
            const p = document.createElement('span');
            p.className = 'mascot-particle';
            p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            const angle = (Math.random() - 0.5) * 160;      // -80..80deg spread
            const dist = 40 + Math.random() * 70;
            p.style.setProperty('--dx', `${Math.sin(angle * Math.PI / 180) * dist}px`);
            p.style.setProperty('--dy', `${-40 - Math.random() * 80}px`);
            p.style.setProperty('--rot', `${(Math.random() - 0.5) * 120}deg`);
            p.style.left = `${45 + Math.random() * 10}%`;
            p.style.animationDelay = `${Math.random() * 0.15}s`;
            p.style.fontSize = `${14 + Math.random() * 12}px`;
            host.appendChild(p);
        }
        setTimeout(() => host.remove(), 1400);
    },

    // Home-screen "play with me": tap the greeting mascot and it keeps doing cute
    // actions (jump/spin/wiggle/run/flip/bounce/nod) - re-rolling a fresh action +
    // happy face + particle burst every ~0.85s - for the WHOLE duration of the
    // random "smile" sound, then settles back the instant the audio ends. So a
    // short giggle is a quick hop and a long laugh is a full dance number.
    mascotPlay(el) {
        if (!el) return;
        const ACTIONS = ['mascot-play-jump', 'mascot-play-spin', 'mascot-play-wiggle', 'mascot-play-bounce', 'mascot-play-flip', 'mascot-play-run', 'mascot-play-nod'];
        const MOODS = ['wink', 'party', 'love', 'laugh', 'giggle', 'starstruck', 'excited', 'cool', 'blush'];

        // A fresh tap supersedes any play still in progress.
        clearInterval(this._mascotPlayInterval);
        clearTimeout(this._mascotPlayTimer);
        if (this._mascotAudio) { try { this._mascotAudio.pause(); } catch (e) { } this._mascotAudio = null; }
        const gen = this._mascotGen = (this._mascotGen || 0) + 1;
        const isCurrent = () => this._mascotGen === gen;

        let first = true;
        const doAction = () => {
            const action = pickRandom(ACTIONS);
            const mood = pickRandom(MOODS);
            el.innerHTML = getMascotSvg(mood, 100);
            el.classList.remove(...ACTIONS);
            void el.offsetWidth;                   // retrigger the one-shot action
            el.classList.add(action, 'mascot-playing');
            if (first || Math.random() < 0.5) this.spawnMascotParticles(el, moodParticles(mood), first ? 7 : 5);
            first = false;
        };
        const stop = () => {
            if (!isCurrent()) return;
            clearInterval(this._mascotPlayInterval);
            clearTimeout(this._mascotPlayTimer);
            if (this._mascotAudio) { try { this._mascotAudio.pause(); } catch (e) { } this._mascotAudio = null; }
            el.classList.remove(...ACTIONS, 'mascot-playing');
            if (document.body.contains(el)) el.innerHTML = getMascotSvg('happy', 100);
        };

        doAction();
        const audio = this.playTone('smile');
        this._mascotAudio = audio || null;

        // Cycle actions until the sound ends; also bail if the user navigates away
        // (the greeting mascot leaves the DOM) so audio/animation never linger.
        this._mascotPlayInterval = setInterval(() => {
            if (!isCurrent() || !document.body.contains(el)) { stop(); return; }
            doAction();
        }, 850);

        if (audio && typeof audio.addEventListener === 'function') {
            audio.addEventListener('ended', stop, { once: true });
            audio.addEventListener('error', () => { this._mascotPlayTimer = setTimeout(stop, 900); }, { once: true });
            this._mascotPlayTimer = setTimeout(stop, 65000);   // hard safety cap
        } else {
            // no audio (missing file / blocked) - fall back to a short one-off action
            this._mascotPlayTimer = setTimeout(stop, 900);
        }
    },

    updateNav() {
        if (this.state.mode === 'practice' || this.state.mode === 'assessment' || this.state.mode === 'placement') {
            const total = this.state.practiceQueue.length;
            const current = this.state.practiceIdx;
            this.ui.progress.style.width = `${total ? (current / total) * 100 : 0}%`;
        } else {
            const unit = this.state.courseData.units[this.state.currentUnitIdx];
            if (unit) {
                const lesson = unit.lessons[this.state.currentLessonIdx];
                const total = lesson.exercises.length;
                const current = this.state.currentExIdx;
                this.ui.progress.style.width = `${(current / total) * 100}%`;
            } else {
                this.ui.progress.style.width = '100%';
            }
        }
        this.ui.hearts.innerText = this.state.hearts;
        this.ui.streak.innerText = this.state.streak;
        this.ui.xp.innerText = this.state.xp;
        this.updateRankBadge();
        this.refreshHomeGreeting();
    },

    // The greeting line under the Home banner shows the same streak/XP/hearts as the
    // top nav but used to be rendered ONCE - regen ticks, gift claims and badge
    // bonuses updated the nav and left it stale. Every stat write now refreshes both.
    refreshHomeGreeting() {
        const el = document.querySelector('.home-streak-line');
        if (el) el.innerHTML = `⭐ ${this.state.xp} XP &nbsp;•&nbsp; ❤️ ${this.state.hearts} tim`;
        const card = document.getElementById('streak-card');
        if (card) card.outerHTML = this.streakCardHtml();
    },

    // The streak's live status, so the UI can say clearly whether the chain is safe
    // for today, at risk, or not started - not just a bare number.
    //   safe: extended today already (nothing more needed today)
    //   risk: alive but NOT practiced yet today (must do a lesson today to keep it)
    //   none: no streak yet
    streakInfo() {
        const count = this.state.streak || 0;
        if (count <= 0) return { count: 0, state: 'none', message: 'Bắt đầu chuỗi học mới ngay hôm nay nhé!' };
        const practicedToday = this.state.lastActivityDate === new Date().toDateString();
        return practicedToday
            ? { count, state: 'safe', message: 'Tuyệt vời! Bạn đã giữ chuỗi hôm nay 🎉' }
            : { count, state: 'risk', message: 'Học 1 bài hôm nay để không bị đứt chuỗi!' };
    },

    // Prominent streak card for the Home screen (replaces the old buried "🔥 Chuỗi N"
    // text). Colour + status line make "safe today / about to break / start" obvious.
    streakCardHtml() {
        const s = this.streakInfo();
        const unit = s.count === 1 ? 'ngày' : 'ngày liên tiếp';
        return `
            <div class="streak-card streak-card-${s.state}" id="streak-card">
                <div class="streak-flame">🔥</div>
                <div class="streak-card-body">
                    <div class="streak-card-count"><span class="streak-card-num">${s.count}</span> ${unit}</div>
                    <div class="streak-card-status">${this.escapeHtml(s.message)}</div>
                </div>
                <div class="streak-rank" id="streak-rank">${this.streakRankHtml()}</div>
            </div>`;
    },

    // The user's own position on the (fresh, alive-streak) leaderboard - cached in
    // state so re-rendering the card doesn't re-hit the network. Only shown for a
    // positive rank (motivating); an unranked/off-board user just sees no badge.
    streakRankHtml() {
        const rank = this.state.streakRank;
        if (!rank || rank < 1) return '';
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅';
        return `<span class="streak-rank-num">${medal} #${rank}</span><span class="streak-rank-label">bảng chuỗi</span>`;
    },

    updateStreakRankDom() {
        const el = document.getElementById('streak-rank');
        if (el) el.innerHTML = this.streakRankHtml();
    },

    async refreshStreakRank() {
        if (!window.Leaderboard || !this.state.currentUser || !window.Leaderboard.getStreakLeaderboard) return;
        if ((this.state.streak || 0) <= 0) { this.state.streakRank = null; this.updateStreakRankDom(); return; }
        try {
            const res = await window.Leaderboard.getStreakLeaderboard(100);
            const entries = (res && res.entries) || [];
            const idx = entries.findIndex(e => e.username === this.state.currentUser);
            this.state.streakRank = idx >= 0 ? idx + 1 : null;
        } catch (e) {
            this.state.streakRank = null;
        }
        this.updateStreakRankDom();
    },

    // The Khoai mascot in a big celebratory pose for completion screens (replaces the
    // old flat emoji). Call playBigCelebration() right after it lands in the DOM.
    bigCelebrateMascotHtml(mood, size) {
        return `<div class="duo-character mascot-jump" id="celebrate-mascot">${getMascotSvg(mood || 'excited', size || 96)}</div>`;
    },

    // Full-screen celebration for hitting a streak milestone (3/7/14/30/50/100/…): a
    // jumping party mascot, a confetti storm, a fanfare, and the reward just granted
    // (bonus XP + hearts refilled to full - see awardLessonCompletion()).
    showStreakMilestone(m) {
        if (window.confetti) {
            window.confetti({ particleCount: 180, spread: 95, startVelocity: 52, ticks: 160, origin: { y: 0.5 }, scalar: 1.05 });
            window.confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } });
            window.confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } });
        }
        this.playTone('fanfare');
        const heartLine = m.heartsRefilled > 0
            ? `<div class="milestone-reward">❤️ Tim được nạp đầy (+${m.heartsRefilled})</div>`
            : `<div class="milestone-reward">❤️ Tim đã đầy</div>`;
        const overlay = document.createElement('div');
        overlay.className = 'milestone-overlay';
        overlay.innerHTML = `
            <div class="milestone-card">
                <div class="duo-character mascot-jump milestone-mascot">${getMascotSvg('party', 120)}</div>
                <div class="milestone-flames">🔥 ${m.days} 🔥</div>
                <h1 class="milestone-title">CHUỖI ${m.days} NGÀY!</h1>
                <p class="milestone-sub">Bạn thật kiên trì - đây là phần thưởng xứng đáng!</p>
                <div class="milestone-rewards">
                    <div class="milestone-reward">⭐ +${m.xp} XP</div>
                    ${heartLine}
                </div>
                <button class="btn-primary milestone-btn" id="milestone-btn">TUYỆT VỜI! 🎉</button>
            </div>`;
        document.body.appendChild(overlay);
        const mascotEl = overlay.querySelector('.milestone-mascot');
        if (mascotEl) this.spawnMascotParticles(mascotEl, ['🔥', '⭐', '🎉', '✨', '💛'], 14);
        const close = () => overlay.remove();
        overlay.querySelector('#milestone-btn').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    },

    // Only checked on days the streak actually extended (not every lesson), and only
    // announces once per session (announcedTop1ThisSession) so a user who's ALREADY #1
    // doesn't get re-broadcast on every single lesson they finish while holding the lead.
    async checkStreakTop1() {
        if (!window.Leaderboard || !this.state.profile || this.state.announcedTop1ThisSession) return;
        // submitScore() inside syncLeaderboardScore() (called just above, fire-and-forget)
        // needs a moment to land before this query would see this session's own updated
        // streak value - a short wait here is simpler than threading an awaited promise
        // back through awardLessonCompletion()'s otherwise-synchronous call chain.
        await new Promise(resolve => setTimeout(resolve, 800));
        const result = await window.Leaderboard.getStreakLeaderboard(1);
        const top = result.entries && result.entries[0];
        if (top && top.username === this.state.currentUser && window.ActivityFeed) {
            this.state.announcedTop1ThisSession = true;
            window.ActivityFeed.postEvent('streak_top1', this.state.profile.id, this.state.currentUser, `🔥 ${this.state.currentUser} đang giữ chuỗi ngày cao nhất bảng xếp hạng!`);
        }
    },

    // Bug fix: a BROKEN streak used to keep displaying (and re-syncing to the
    // leaderboard) at its old value after login - updateStreak() only corrects it on
    // the next lesson completion, so someone who quit at 🔥30 kept showing 30 and
    // could keep topping the streak board. Called from completeLogin() right after
    // the profile loads: if the last activity day is neither today nor yesterday, the
    // chain is already dead - zero it now and persist, so every later display/sync
    // (nav, home greeting, leaderboard submit) uses the truth.
    normalizeStreakOnLoad() {
        if (!this.state.streak) return;
        const todayStr = new Date().toDateString();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const last = this.state.lastActivityDate;
        if (last === todayStr || last === yesterday.toDateString()) return;
        this.state.streak = 0;
        this.saveUserProgress();
    },

    updateStreak() {
        const todayStr = new Date().toDateString();

        if (this.state.lastActivityDate === todayStr) {
            return false; // already active today, streak unchanged
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const wasActiveYesterday = this.state.lastActivityDate === yesterday.toDateString();

        this.state.streak = wasActiveYesterday ? this.state.streak + 1 : 1;
        this.state.lastActivityDate = todayStr;
        return true;
    },

    // 3 user ranking tabs (XP / Chuỗi / Sôi nổi) sharing one screen, mirroring
    // renderGroupLeaderboards()'s tab pattern, plus a shortcut to the group boards.
    // ---- "Vị Vua Của Tuần" (latest weekly XP teddy-bear winner, hall_of_fame) --------
    // The reigning king wears an exclusive golden crown frame on their nav avatar for
    // the whole week. Cached in state.weeklyKing; purely decorative, so every failure
    // path just means "no frame" - never blocks anything else.
    async refreshWeeklyKing() {
        if (!window.Leaderboard || !this.state.currentUser) return;
        try {
            this.state.weeklyKing = await window.Leaderboard.getLatestKing();
        } catch (e) {
            this.state.weeklyKing = null;
        }
        this.applyKingFrameToNav();
    },

    applyKingFrameToNav() {
        const wrap = document.querySelector('.user-badge-avatar-wrap');
        if (!wrap) return;
        const isKing = !!(this.state.weeklyKing && this.state.currentUser
            && this.state.weeklyKing.username === this.state.currentUser);
        wrap.classList.toggle('king-frame-nav', isKing);
        if (isKing) wrap.setAttribute('title', '👑 Vị Vua Của Tuần');
        else if (wrap.getAttribute('title') === '👑 Vị Vua Của Tuần') wrap.removeAttribute('title');
    }
});
