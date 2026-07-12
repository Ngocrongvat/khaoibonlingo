const MAX_HEARTS = 10;
const HEART_REGEN_MS = 15 * 60 * 1000;

const HAPPY_MESSAGES = [
    "Bạn thật tuyệt vời!",
    "Chính xác luôn!",
    "Giỏi quá!",
    "Quá đỉnh!",
    "Xuất sắc!"
];

const SAD_MESSAGES = [
    "Đừng bỏ cuộc, hãy thử lại nhé!",
    "Không sao, cố lên nào!",
    "Sai một chút thôi, tiếp tục nhé!",
    "Gần đúng rồi, thử lại xem!"
];

// General-purpose mentor advice for the home dashboard - picked in rotation (by day of
// year, so it changes daily but stays stable within a day) unless a more urgent
// situational tip applies (see getMentorTip()). Deliberately rule-based, not AI-backed -
// no LLM call is wired up for this, same reasoning as why IELTS grading needs its own
// configured Edge Function.
const MENTOR_TIPS = [
    "Nghe chưa rõ từ nào? Bấm nút 🐢 \"Nghe chậm\" trong bài nghe để nghe rõ từng từ một nhé!",
    "Gặp câu quá khó? Bạn có thể bấm \"Bỏ qua câu này\", nhưng nhớ là sẽ mất một ít XP đó!",
    "Đã sẵn sàng thử thách bản thân? Ghé 🎓 Luyện thi IELTS để rèn cả 4 kỹ năng chuẩn quốc tế!",
    "Rủ bạn bè cùng học cho vui! Thử ⚔️ Đấu 1v1 xem ai giỏi tiếng Anh hơn nhé!",
    "Muốn vừa chơi vừa học từ mới? Ghé 🎮 Trò chơi để thử \"Từ Lạc Loài\" hay \"Phản Xạ Từ Vựng\"!",
    "Những câu bạn trả lời sai sẽ tự động xuất hiện lại ở cuối bài học - đừng ngại sai, đó là lúc bạn nhớ lâu nhất!",
    "Học đều mỗi ngày dù chỉ 5 phút cũng tốt hơn học dồn 1 lần thật nhiều - chuỗi ngày học của bạn sẽ cảm ơn bạn đó!",
    "Chế độ 🏋️ Luyện tập sẽ tự động tập trung vào những từ bạn hay sai - luyện thêm ở đó để tiến bộ nhanh hơn!",
    "Bạn đã đổi ảnh đại diện của mình chưa? Bấm vào tên của bạn ở góc trên bên phải để cá nhân hóa tài khoản nhé!",
    "Hết tim đừng lo - tim sẽ tự hồi theo thời gian, hoặc chơi mini game để nhận thêm tim ngay lập tức!"
];

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// KhoaiBonlingo's mascot: a chubby sweet-potato character ("Bé Khoai"), replacing the
// generic owl emoji everywhere it stood in as "the app mascot" (auth screen, result
// modal). Built from plain ellipses/circles and short curve paths - no complex path
// data - so it stays easy to read and tweak. mood is 'idle' | 'happy' | 'sad'; the
// existing .mascot-accessory sparkle/tear overlay (✨/💧) is layered on separately by
// the caller, same as before.
function getMascotSvg(mood, size) {
    size = size || 80;
    const armIdle = `
        <ellipse cx="18" cy="118" rx="15" ry="21" fill="#E8935B" transform="rotate(18 18 118)"/>
        <ellipse cx="182" cy="118" rx="15" ry="21" fill="#E8935B" transform="rotate(-18 182 118)"/>
    `;
    const armHappy = `
        <ellipse cx="20" cy="65" rx="15" ry="21" fill="#E8935B" transform="rotate(55 20 65)"/>
        <ellipse cx="180" cy="65" rx="15" ry="21" fill="#E8935B" transform="rotate(-55 180 65)"/>
    `;
    let arms = armIdle;
    let eyebrows = '';
    let mouth = `<path d="M82,132 Q100,142 118,132" stroke="#3B2A22" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;

    if (mood === 'happy') {
        arms = armHappy;
        mouth = `
            <path d="M75,126 Q100,158 125,126 Q100,144 75,126 Z" fill="#8B4A3A"/>
            <path d="M85,136 Q100,144 115,136 Q100,140 85,136 Z" fill="#FF9EB0"/>
        `;
    } else if (mood === 'sad') {
        eyebrows = `
            <path d="M66,80 L86,87" stroke="#3B2A22" stroke-width="3.5" stroke-linecap="round"/>
            <path d="M134,80 L114,87" stroke="#3B2A22" stroke-width="3.5" stroke-linecap="round"/>
        `;
        mouth = `<path d="M82,140 Q100,127 118,140" stroke="#3B2A22" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    }

    return `
        <svg width="${size}" height="${Math.round(size * 0.95)}" viewBox="0 0 200 190" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="100" cy="184" rx="60" ry="7" fill="rgba(0,0,0,0.08)"/>
            ${arms}
            <ellipse cx="70" cy="174" rx="18" ry="9" fill="#C97A42"/>
            <ellipse cx="130" cy="174" rx="18" ry="9" fill="#C97A42"/>
            <path d="M100,15 C150,15 185,55 185,105 C185,150 148,172 100,172 C52,172 15,150 15,105 C15,55 50,15 100,15 Z" fill="#E8935B"/>
            <ellipse cx="100" cy="118" rx="55" ry="36" fill="#F2A873" opacity="0.55"/>
            <path d="M15,105 C15,150 52,172 100,172 C148,172 185,150 185,105 C185,133 155,156 100,156 C45,156 15,133 15,105 Z" fill="#C97A42" opacity="0.35"/>
            <ellipse cx="45" cy="130" rx="4" ry="3" fill="#C97A42" opacity="0.35" transform="rotate(-20 45 130)"/>
            <ellipse cx="155" cy="95" rx="3.5" ry="2.5" fill="#C97A42" opacity="0.35" transform="rotate(15 155 95)"/>
            <path d="M100,22 C92,6 76,0 66,4 C75,13 83,19 92,25 Z" fill="#6FBF73"/>
            <path d="M100,22 C108,6 124,0 134,4 C125,13 117,19 108,25 Z" fill="#7ED47F"/>
            <path d="M100,22 C99,8 100,2 101,2 C103,8 102,16 101,23 Z" fill="#57A75C"/>
            <ellipse cx="60" cy="115" rx="13" ry="9" fill="#FF9EB0" opacity="0.65"/>
            <ellipse cx="140" cy="115" rx="13" ry="9" fill="#FF9EB0" opacity="0.65"/>
            ${eyebrows}
            <ellipse cx="76" cy="95" rx="12" ry="15" fill="white"/>
            <ellipse cx="124" cy="95" rx="12" ry="15" fill="white"/>
            <circle cx="78" cy="99" r="6.5" fill="#3B2A22"/>
            <circle cx="126" cy="99" r="6.5" fill="#3B2A22"/>
            <circle cx="81" cy="94" r="2.2" fill="white"/>
            <circle cx="129" cy="94" r="2.2" fill="white"/>
            ${mouth}
        </svg>
    `;
}

// Rank/level system: XP (already tracked forever, see checkWeeklyReset()'s comment)
// doubles as the level-progress meter. Every LEVELS_PER_RANK levels is one rank tier,
// each mapped to a generated-exercise difficulty (the existing 1-3 scale used
// throughout exercise-generator.js). Deliberately NOT stored as a separate DB column:
// since it's a pure function of xp (which is already persisted), recomputing it on
// demand means a rank promotion/demotion can never drift out of sync with the XP that
// caused it.
const LEVELS_PER_RANK = 10;
const RANK_TIERS = [
    { name: 'Đồng', icon: '🥉', difficulty: 1 },
    { name: 'Bạc', icon: '🥈', difficulty: 1 },
    { name: 'Vàng', icon: '🥇', difficulty: 2 },
    { name: 'Bạch Kim', icon: '🔷', difficulty: 2 },
    { name: 'Kim Cương', icon: '💎', difficulty: 3 },
    { name: 'Cao Thủ', icon: '👑', difficulty: 3 },
    { name: 'Huyền Thoại', icon: '🌟', difficulty: 3 }
];

// Standard character-level edit distance (insertions/deletions/substitutions) between
// two strings - used by App.pronunciationScore() to turn a speech-recognition transcript
// into a 0-100 similarity score instead of a binary word-overlap check.
function levenshteinDistance(a, b) {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    let prevRow = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
        const currRow = [i];
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            currRow[j] = Math.min(
                prevRow[j] + 1,        // deletion
                currRow[j - 1] + 1,    // insertion
                prevRow[j - 1] + cost  // substitution
            );
        }
        prevRow = currRow;
    }
    return prevRow[n];
}

// XP needed to advance FROM `level` to `level + 1` - grows linearly (not a flat
// amount) so higher levels take meaningfully longer to reach, the same way most game
// leveling curves work. Level 1 costs XP_LEVEL_BASE; each subsequent level costs
// XP_LEVEL_GROWTH more than the one before it.
const XP_LEVEL_BASE = 100;
const XP_LEVEL_GROWTH = 15;
function xpNeededForLevel(level) {
    return XP_LEVEL_BASE + (level - 1) * XP_LEVEL_GROWTH;
}

// Pure function of xp - see the comment above for why this isn't a stored field. Walks
// level-by-level (rather than a closed-form divide) because each level now costs a
// different amount of XP than the last.
function getRankInfo(xp) {
    const safeXp = Math.max(0, xp || 0);
    let level = 1;
    let remaining = safeXp;
    while (remaining >= xpNeededForLevel(level)) {
        remaining -= xpNeededForLevel(level);
        level++;
    }
    const rankIndex = Math.min(RANK_TIERS.length - 1, Math.floor((level - 1) / LEVELS_PER_RANK));
    const tier = RANK_TIERS[rankIndex];
    const levelInRank = ((level - 1) % LEVELS_PER_RANK) + 1;
    return {
        level,
        rankIndex,
        rankName: tier.name,
        rankIcon: tier.icon,
        difficulty: tier.difficulty,
        levelInRank,
        xpIntoLevel: remaining,
        xpForNextLevel: xpNeededForLevel(level),
        label: `${tier.icon} ${tier.name} (Cấp ${level})`
    };
}

// Group "level" from its accumulated vibrancy_score - reuses the exact same
// xpNeededForLevel() curve as individual players (via getRankInfo() above) rather than
// inventing a second formula, so leveling up a group feels consistent with leveling up
// a character. No rank tiers here (groups don't have Đồng/Bạc/Vàng...), just a level +
// progress-to-next-level readout.
function getGroupLevelInfo(vibrancyScore) {
    const safeScore = Math.max(0, vibrancyScore || 0);
    let level = 1;
    let remaining = safeScore;
    while (remaining >= xpNeededForLevel(level)) {
        remaining -= xpNeededForLevel(level);
        level++;
    }
    return {
        level,
        scoreIntoLevel: remaining,
        scoreForNextLevel: xpNeededForLevel(level),
        label: `Cấp ${level}`
    };
}

const DEFAULT_STATS = {
    perfectLessons: 0,
    pronunciationCorrect: 0,
    courseCompleted: false,
    practiceSessions: 0,
    assessmentsPassed: 0,
    placementLevel: 0,
    lessonWrongCount: 0,
    earnedBadges: {},
    certificates: [],
    duelWins: 0,
    duelsPlayed: 0
};

class DuoClone {
    constructor() {
        this.state = {
            currentUser: null,
            authUser: null,
            profile: null,
            isAdmin: false,
            hearts: MAX_HEARTS,
            xp: 0,
            streak: 0,
            lastActivityDate: null,
            lastHeartUpdate: Date.now(),
            weeklyXp: 0,
            lastWeekId: null,
            teddyBears: 0,
            currentUnitIdx: 0,
            currentLessonIdx: 0,
            currentExIdx: 0,
            selectedOption: null,
            currentAnswer: [],
            courseData: typeof COURSE_DATA !== 'undefined' ? COURSE_DATA : null,
            mode: 'curriculum',
            practiceQueue: [],
            practiceIdx: 0,
            assessmentCorrect: 0,
            reviewQueue: [],
            reviewMode: false,
            friendCount: 0,
            stats: { ...DEFAULT_STATS }
        };
        this.errorTracker = null;
        this.badgeTracker = null;
        this.authMode = 'signin';

        this.ui = {
            container: document.getElementById('lesson-container'),
            hearts: document.getElementById('hearts'),
            streak: document.getElementById('streak'),
            xp: document.getElementById('xp'),
            progress: document.getElementById('progress-bar'),
            checkBtn: document.getElementById('check-btn'),
            skipBtn: document.getElementById('skip-btn'),
            startBtn: document.getElementById('start-btn'),
            modal: document.getElementById('modal-overlay'),
            modalTitle: document.getElementById('modal-title'),
            modalMsg: document.getElementById('modal-msg'),
            modalIcon: document.getElementById('modal-icon'),
            modalMascot: document.getElementById('modal-mascot'),
            modalBtn: document.getElementById('modal-btn'),
            userDisplay: document.getElementById('user-display'),
            userBadgeName: document.getElementById('user-badge-name'),
            userBadgeAvatar: document.getElementById('user-badge-avatar'),
            userBadgeRank: document.getElementById('user-badge-rank'),
            closeLessonBtn: document.getElementById('close-lesson'),
            navMoreBtn: document.getElementById('nav-more-btn'),
            navMoreMenu: document.getElementById('nav-more-menu'),
            homeBtn: document.getElementById('home-btn'),
            leaderboardBtn: document.getElementById('leaderboard-btn'),
            gamesBtn: document.getElementById('games-btn'),
            practiceBtn: document.getElementById('practice-btn'),
            assessmentBtn: document.getElementById('assessment-btn'),
            ieltsBtn: document.getElementById('ielts-btn'),
            duelBtn: document.getElementById('duel-btn'),
            friendsBtn: document.getElementById('friends-btn'),
            inboxBtn: document.getElementById('inbox-btn'),
            inboxUnreadBadge: document.getElementById('inbox-unread-badge'),
            groupsBtn: document.getElementById('groups-btn'),
            onlineMembersBtn: document.getElementById('online-members-btn'),
            achievementsBtn: document.getElementById('achievements-btn'),
            adminBtn: document.getElementById('admin-btn')
        };

        this.init();
        this.startEnergyRegeneration();
        this.startPresenceHeartbeat();
        this.resumeSession();
    }

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
    }

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
    }

    // Shown when the user lands here from a password-recovery email - they already have
    // a temporary session, so updatePassword() works directly; afterwards continue into
    // the app like a normal login.
    renderPasswordResetScreen() {
        this.state.passwordRecoveryPending = true;
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">🔑</div>
                <h1 style="text-align: center;">Đặt lại mật khẩu</h1>
                <p style="text-align: center; color: #777;">Nhập mật khẩu mới cho tài khoản của bạn.</p>
                <div class="auth-box" style="display: flex; flex-direction: column; gap: 15px; margin: 30px auto; width: 80%; max-width: 300px;">
                    <div class="password-field-wrap">
                        <input type="password" id="recovery-password-input" placeholder="Mật khẩu mới (ít nhất 6 ký tự)..." class="input-field" style="width:100%; padding: 15px 44px 15px 15px; border: 2px solid #e5e5e5; border-radius: 12px; text-align: center;">
                        <button type="button" class="password-eye-btn" id="recovery-eye-btn" title="Hiện/ẩn mật khẩu">👁️</button>
                    </div>
                    <input type="password" id="recovery-password-confirm" placeholder="Nhập lại mật khẩu mới..." class="input-field" style="padding: 15px; border: 2px solid #e5e5e5; border-radius: 12px; text-align: center;">
                    <p id="recovery-error" style="color: var(--duo-red); text-align: center; font-size: 14px; min-height: 18px; margin: 0;"></p>
                    <button id="recovery-submit-btn" class="btn-primary" style="padding: 15px; background-color: #58cc02; color: white; border: none; border-radius: 12px; font-weight: 800; cursor: pointer;">LƯU MẬT KHẨU MỚI</button>
                </div>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        if (this.ui.skipBtn) this.ui.skipBtn.style.display = 'none';

        this.bindPasswordEyeToggle('recovery-eye-btn', 'recovery-password-input');
        document.getElementById('recovery-submit-btn').addEventListener('click', async () => {
            const errorEl = document.getElementById('recovery-error');
            const pw = document.getElementById('recovery-password-input').value;
            const confirmPw = document.getElementById('recovery-password-confirm').value;
            if (pw.length < 6) { errorEl.innerText = 'Mật khẩu mới phải có ít nhất 6 ký tự.'; return; }
            if (pw !== confirmPw) { errorEl.innerText = 'Hai mật khẩu không khớp nhau.'; return; }
            errorEl.style.color = 'var(--duo-dark-grey)';
            errorEl.innerText = 'Đang cập nhật...';
            const result = await window.AuthService.updatePassword(pw);
            if (result.error) {
                errorEl.style.color = 'var(--duo-red)';
                errorEl.innerText = `Không đặt lại được mật khẩu: ${result.error}`;
                return;
            }
            this.state.passwordRecoveryPending = false;
            alert('Đặt lại mật khẩu thành công! Bạn sẽ được đăng nhập ngay bây giờ.');
            const session = await window.AuthService.getSession();
            if (session && session.user) {
                await this.completeLogin(session.user);
            } else {
                location.reload();
            }
        });
    }

    // Shared by the login screen and the recovery screen - flips one password input
    // between type=password/text so users can see what they typed.
    bindPasswordEyeToggle(btnId, inputId) {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (!btn || !input) return;
        btn.addEventListener('click', () => {
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            btn.textContent = show ? '🙈' : '👁️';
        });
    }

    renderAuthScreen() {
        this.ui.container.innerHTML = `
            <div id="auth-screen" class="welcome-screen">
                <div class="brand-banner">
                    <div class="brand-mascot">${getMascotSvg('happy', 118)}</div>
                    <h1 class="brand-wordmark"><span class="brand-khoai">Khoai</span><span class="brand-bon">Bon</span><span class="brand-lingo">lingo</span></h1>
                    <p class="brand-tagline">Học tiếng Anh vui - Lớn khôn mỗi ngày</p>
                </div>
                <h1 id="auth-title" style="text-align: center;">Đăng nhập</h1>
                <div class="auth-box" style="display: flex; flex-direction: column; gap: 15px; margin: 30px auto; width: 80%; max-width: 300px;">
                    <input type="text" id="username-input" placeholder="Tên hiển thị..." class="input-field" style="display: none; padding: 15px; border: 2px solid #e5e5e5; border-radius: 12px; text-align: center;">
                    <input type="email" id="email-input" placeholder="Email..." class="input-field" style="padding: 15px; border: 2px solid #e5e5e5; border-radius: 12px; text-align: center;">
                    <div class="password-field-wrap">
                        <input type="password" id="password-input" placeholder="Mật khẩu (ít nhất 6 ký tự)..." class="input-field" style="width:100%; padding: 15px 44px 15px 15px; border: 2px solid #e5e5e5; border-radius: 12px; text-align: center;">
                        <button type="button" class="password-eye-btn" id="password-eye-btn" title="Hiện/ẩn mật khẩu">👁️</button>
                    </div>
                    <p id="auth-error" style="color: var(--duo-red); text-align: center; font-size: 14px; min-height: 18px; margin: 0;"></p>
                    <button id="login-btn" class="btn-primary" style="padding: 15px; background-color: #58cc02; color: white; border: none; border-radius: 12px; font-weight: 800; cursor: pointer;">ĐĂNG NHẬP</button>
                    <button id="auth-toggle-btn" style="padding: 12px; border-radius: 12px; font-weight: 700; cursor: pointer; background: white; border: 2px solid #e5e5e5; color: #777;">Chưa có tài khoản? Đăng ký</button>
                    <button id="forgot-password-btn" style="padding: 6px; border: none; background: none; color: #1cb0f6; font-weight: 700; cursor: pointer; font-size: 14px;">Quên mật khẩu?</button>
                </div>
            </div>
        `;
        this.ui.usernameInput = document.getElementById('username-input');
        this.ui.emailInput = document.getElementById('email-input');
        this.ui.passwordInput = document.getElementById('password-input');
        this.ui.loginBtn = document.getElementById('login-btn');

        this.applyAuthMode();
        this.ui.loginBtn.onclick = () => this.handleAuthSubmit();
        document.getElementById('auth-toggle-btn').addEventListener('click', () => {
            this.authMode = this.authMode === 'signin' ? 'signup' : 'signin';
            this.applyAuthMode();
        });
        this.bindPasswordEyeToggle('password-eye-btn', 'password-input');
        document.getElementById('forgot-password-btn').addEventListener('click', () => this.handleForgotPassword());

        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
    }

    applyAuthMode() {
        const isSignup = this.authMode === 'signup';
        document.getElementById('auth-title').innerText = isSignup ? 'Đăng ký' : 'Đăng nhập';
        this.ui.usernameInput.style.display = isSignup ? 'block' : 'none';
        this.ui.loginBtn.innerText = isSignup ? 'ĐĂNG KÝ' : 'ĐĂNG NHẬP';
        document.getElementById('auth-toggle-btn').innerText = isSignup ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký';
        const errorEl = document.getElementById('auth-error');
        errorEl.innerText = '';
        errorEl.style.color = 'var(--duo-red)';
    }

    // Reuses whatever the user already typed in the email box (asking again would be
    // pointless friction) - only errors if it's empty. Success/failure is reported in
    // the same inline auth-error element the login flow already uses.
    async handleForgotPassword() {
        const errorEl = document.getElementById('auth-error');
        const email = this.ui.emailInput.value.trim();
        errorEl.style.color = 'var(--duo-red)';
        if (!email) {
            errorEl.innerText = 'Nhập email của bạn vào ô Email phía trên rồi bấm "Quên mật khẩu?" nhé.';
            return;
        }
        if (!window.AuthService || !window.AuthService.isConfigured) {
            errorEl.innerText = 'Hệ thống đăng nhập chưa được cấu hình.';
            return;
        }
        errorEl.style.color = 'var(--duo-dark-grey)';
        errorEl.innerText = 'Đang gửi email đặt lại mật khẩu...';
        const result = await window.AuthService.requestPasswordReset(email);
        if (result.error) {
            errorEl.style.color = 'var(--duo-red)';
            errorEl.innerText = `Không gửi được email: ${result.error}`;
            return;
        }
        errorEl.style.color = 'var(--duo-green)';
        errorEl.innerText = `Đã gửi! Kiểm tra hộp thư ${email} và bấm vào link để đặt lại mật khẩu.`;
    }

    async handleAuthSubmit() {
        const email = this.ui.emailInput.value.trim();
        const password = this.ui.passwordInput.value;
        const errorEl = document.getElementById('auth-error');
        errorEl.innerText = '';

        if (!email || !password) {
            errorEl.innerText = 'Vui lòng nhập đầy đủ email và mật khẩu.';
            return;
        }
        if (!window.AuthService || !window.AuthService.isConfigured) {
            errorEl.innerText = 'Hệ thống đăng nhập chưa được cấu hình.';
            return;
        }

        this.ui.loginBtn.disabled = true;

        if (this.authMode === 'signup') {
            const username = this.ui.usernameInput.value.trim();
            if (!username) {
                errorEl.innerText = 'Vui lòng nhập tên hiển thị.';
                this.ui.loginBtn.disabled = false;
                return;
            }
            const result = await window.AuthService.signUp(email, password, username);
            this.ui.loginBtn.disabled = false;
            if (result.error) {
                errorEl.innerText = result.error;
                return;
            }
            if (result.pendingConfirmation) {
                errorEl.style.color = 'var(--duo-green)';
                errorEl.innerText = 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận, sau đó đăng nhập.';
                this.authMode = 'signin';
                this.applyAuthMode();
                return;
            }
            await this.completeLogin(result.user, username, true);
        } else {
            const result = await window.AuthService.signIn(email, password);
            this.ui.loginBtn.disabled = false;
            if (result.error) {
                errorEl.innerText = result.error;
                return;
            }
            await this.completeLogin(result.user);
        }
    }

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

        const neverPlaced = !this.state.stats.placementLevel;
        const noProgressYet = this.state.xp === 0 && this.state.currentUnitIdx === 0 && this.state.currentLessonIdx === 0 && this.state.currentExIdx === 0;
        if (this.state.passwordRecoveryPending) {
            // Came here from a "quên mật khẩu" email link - let the user set the new
            // password before dropping them into the course.
            this.renderPasswordResetScreen();
        } else if (neverPlaced && noProgressYet && window.ExerciseGenerator) {
            this.renderPlacementIntro();
        } else {
            this.startCourse();
        }
        this.syncLeaderboardScore();
    }

    async handleSignOut() {
        if (!this.state.currentUser) return;
        if (window.AuthService) {
            await window.AuthService.signOut();
        }
        location.reload();
    }

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
        // From here on saveUserProgress() may write the position to the profile -
        // never before, or a pre-load save would clobber the server copy with 0/0/0.
        this.state.positionLoaded = true;
        this.saveLocalPosition();
        this.updateNav();
    }

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
    }

    getCurrentExercise() {
        if (this.state.mode === 'duel') {
            return this.state.duelQueue[this.state.duelIdx];
        }
        if (this.state.mode === 'practice' || this.state.mode === 'assessment' || this.state.mode === 'placement') {
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
        return lesson.exercises[idx];
    }

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
    }

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
    }

    startEnergyRegeneration() {
        setInterval(() => {
            if (this.state.hearts < MAX_HEARTS && this.state.profile) {
                const now = Date.now();
                const lastUpdate = this.state.lastHeartUpdate || now;
                const elapsed = now - lastUpdate;
                if (elapsed >= HEART_REGEN_MS) {
                    const recovered = Math.floor(elapsed / HEART_REGEN_MS);
                    this.state.hearts = Math.min(MAX_HEARTS, this.state.hearts + recovered);
                    this.state.lastHeartUpdate = now;
                    this.saveUserProgress();
                    this.updateNav();
                }
            }
        }, 60000);
    }

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
    }

    getGreeting() {
        const hour = new Date().getHours();
        if (hour < 11) return 'Chào buổi sáng';
        if (hour < 18) return 'Chào buổi chiều';
        return 'Chào buổi tối';
    }

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
    }

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
        const unit = this.state.courseData.units[this.state.currentUnitIdx];
        const lesson = unit ? unit.lessons[this.state.currentLessonIdx] : null;

        this.ui.container.innerHTML = `
            <div class="home-dashboard">
                <div class="activity-ticker" id="activity-ticker">
                    <div class="activity-ticker-track" id="activity-ticker-track"></div>
                </div>

                <div class="home-greeting-row">
                    <div class="home-greeting-mascot">${getMascotSvg('happy', 64)}</div>
                    <div>
                        <h1 class="home-greeting-text">${this.getGreeting()}, ${this.escapeHtml(this.state.currentUser)}!</h1>
                        <p class="home-streak-line">🔥 Chuỗi ${this.state.streak} ngày &nbsp;•&nbsp; ⭐ ${this.state.xp} XP &nbsp;•&nbsp; ❤️ ${this.state.hearts} tim</p>
                    </div>
                </div>

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

        this.renderUnitStrip();
        this.renderPathMap(this.state.currentUnitIdx);
        this.initGlobalChatWidget();
        this.initActivityTicker();
    }

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
    }

    getGlobalChatLastSeen() {
        if (!this.state.profile) return null;
        return localStorage.getItem(`duo_global_chat_last_seen_${this.state.profile.id}`);
    }

    setGlobalChatLastSeen(iso) {
        if (!this.state.profile) return;
        localStorage.setItem(`duo_global_chat_last_seen_${this.state.profile.id}`, iso);
    }

    updateGlobalChatBadge(count) {
        const badge = document.getElementById('global-chat-unread-badge');
        if (!badge) return;
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

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
    }

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
    }

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
    }

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
    }

    renderGlobalChatMessages(messages) {
        const listEl = document.getElementById('global-chat-messages');
        if (!listEl) return;
        listEl.innerHTML = messages.length
            ? messages.map(m => this.globalChatMessageHtml(m)).join('')
            : '<p style="text-align:center; color:#999; font-size:13px;">Chưa có tin nhắn nào. Hãy là người đầu tiên chào hỏi!</p>';
        listEl.scrollTop = listEl.scrollHeight;
    }

    appendGlobalChatMessage(msg) {
        const listEl = document.getElementById('global-chat-messages');
        if (!listEl) return;
        listEl.insertAdjacentHTML('beforeend', this.globalChatMessageHtml(msg));
        listEl.scrollTop = listEl.scrollHeight;
    }

    cleanupGlobalChat() {
        if (this.globalChatUnsub) {
            this.globalChatUnsub();
            this.globalChatUnsub = null;
        }
    }

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
    }

    // Community-wide scrolling ticker (welcome/badge/level-up/teddy-bear/streak-top1
    // events, broadcast via activity-feed.js's Realtime channel) - always running while
    // Home is on screen, no toggle/collapse unlike the chat widget, since it's meant to be
    // ambient background info rather than something the user opens deliberately.
    // Keeps only FRESH events on screen: anything older than 12h is dropped, and at
    // most the 12 newest are shown - the DB retains 72h of history (see activity-feed
    // .js's cleanup window), but a marquee crowded with day-old news buries whatever
    // just happened, which defeats its purpose as a live ticker.
    pruneTickerEvents(events) {
        const MAX_TICKER_AGE_MS = 12 * 60 * 60 * 1000;
        const MAX_TICKER_ITEMS = 12;
        const cutoff = Date.now() - MAX_TICKER_AGE_MS;
        return (events || [])
            .filter(e => !e.created_at || new Date(e.created_at).getTime() >= cutoff)
            .slice(-MAX_TICKER_ITEMS);
    }

    async initActivityTicker() {
        if (!window.ActivityFeed) return;
        this.state.activityTickerEvents = this.pruneTickerEvents(await window.ActivityFeed.getRecentEvents(30));
        this.renderActivityTicker();
        this.cleanupActivityTicker();
        this.activityTickerUnsub = window.ActivityFeed.subscribeToNewEvents((event) => {
            const track = document.getElementById('activity-ticker-track');
            if (!track) return;
            this.state.activityTickerEvents = this.pruneTickerEvents([...(this.state.activityTickerEvents || []), event]);
            this.renderActivityTicker();
        });
    }

    renderActivityTicker() {
        const track = document.getElementById('activity-ticker-track');
        if (!track) return;
        const events = this.state.activityTickerEvents || [];
        if (!events.length) {
            track.innerHTML = '';
            track.style.animation = 'none';
            return;
        }
        // Joined text is duplicated back-to-back so the CSS scroll loop has no visible
        // gap - once the first copy has fully scrolled past, the second is already lined
        // up to continue seamlessly (classic marquee technique).
        // Newest event FIRST: the marquee scrolls from its beginning after every
        // (re)render, so fresh news must lead the strip - chronological order buried a
        // just-arrived event behind up to 11 older ones for a whole scroll cycle.
        const joined = [...events].reverse().map(e => this.escapeHtml(e.message)).join('&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;');
        track.innerHTML = `<span>${joined}</span><span aria-hidden="true">&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;${joined}</span>`;
        // Scroll speed scales with content length so a short list doesn't fly by too fast
        // and a long one doesn't crawl - restarting the animation (removing then
        // re-triggering) is a minor visual reset but happens rarely (a few events/session).
        const duration = Math.max(18, Math.min(90, events.length * 3.5));
        track.style.animation = 'none';
        void track.offsetWidth;
        track.style.animation = `activityTickerScroll ${duration}s linear infinite`;
    }

    cleanupActivityTicker() {
        if (this.activityTickerUnsub) {
            this.activityTickerUnsub();
            this.activityTickerUnsub = null;
        }
    }

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
    }

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
            <div class="path-map-track">
                <svg class="path-road-svg" id="path-road-svg"></svg>
                ${nodesHtml}
            </div>
            ${fogHtml}
        `;

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
    }

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
    }

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
    }

    startCourse() {
        this.ui.container.innerHTML = "";
        if (this.state.currentUnitIdx >= this.state.courseData.units.length) {
            this.renderCourseComplete();
        } else {
            this.renderHomeDashboard();
        }
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

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
    }

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
    }

    // Username flavor of attachSuggestions() - used by every "nhập tên người dùng"
    // form (duel challenge, new message, add friend).
    attachUserSuggestions(input, onPick = null) {
        if (!window.Friends || !window.Friends.searchUsers) return;
        const myName = this.state.currentUser;
        this.attachSuggestions(input, async (q) => {
            const users = await window.Friends.searchUsers(q, 8);
            return users.filter(u => u.username !== myName).map(u => ({ label: `👤 ${u.username}`, value: u.username, id: u.id }));
        }, onPick);
    }

    closeUserActionMenu() {
        const existing = document.getElementById('user-action-menu');
        if (existing) existing.remove();
        if (this._dismissUserActionMenu) {
            document.removeEventListener('click', this._dismissUserActionMenu);
            this._dismissUserActionMenu = null;
        }
    }

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
    }

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
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                ${info.avatar_url
                    ? `<img src="${info.avatar_url}" alt="" style="width:88px; height:88px; border-radius:50%; display:block; margin:0 auto; object-fit:cover;">`
                    : `<div class="duo-character">👤</div>`}
                <h1 style="text-align: center;">${this.escapeHtml(info.username)}</h1>
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
    }

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
        if (this.state.reviewMode) {
            return `🔁 Ôn tập lại câu sai — còn ${this.state.reviewQueue.length} câu`;
        }
        const unit = this.state.courseData.units[this.state.currentUnitIdx];
        const lesson = unit.lessons[this.state.currentLessonIdx];
        const idx = Math.min(this.state.currentExIdx, lesson.exercises.length - 1);
        return `Chương ${this.state.currentUnitIdx + 1}: ${this.escapeHtml(unit.title)} • Bài ${this.state.currentLessonIdx + 1}: ${this.escapeHtml(lesson.title)} — Câu ${idx + 1}/${lesson.exercises.length}`;
    }

    renderLesson() {
        const ex = this.getCurrentExercise();

        this.ensureSessionAnswerContext();
        this.updateNav();

        const progressLabel = this.getLessonProgressLabel();
        let html = progressLabel ? `<div class="lesson-progress-label">${progressLabel}</div>` : '';
        if (ex.type !== 'reading' && ex.type !== 'dialogue' && ex.type !== 'listening_comprehension') {
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
            html += `<div class="pronunciation-controls">
                        <button class="btn-listen" id="listen-btn">
                            <span style="font-size: 32px;">🔊</span><br>Nghe lại
                        </button>
                        <button class="btn-listen" id="listen-slow-btn">
                            <span style="font-size: 32px;">🐢</span><br>Nghe chậm
                        </button>
                     </div>`;
            html += `<input type="text" id="dictation-input" class="input-field dictation-input" placeholder="Gõ lại câu bạn nghe được...">`;
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

        this.ui.container.innerHTML = html;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
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
    }

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
            const listenBtn = document.getElementById('listen-btn');
            if (listenBtn) listenBtn.addEventListener('click', () => this.playAudio(ex.target));
            const listenSlowBtn = document.getElementById('listen-slow-btn');
            if (listenSlowBtn) listenSlowBtn.addEventListener('click', () => this.playAudioSlow(ex.target));
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
    }

    onMatchLeftClick(el) {
        const ms = this.state.matchingState;
        if (!ms || ms.matchedIds.has(el.dataset.id)) return;
        this.ui.container.querySelectorAll('#match-left .match-card').forEach(c => c.classList.remove('selected'));
        ms.selectedLeftId = el.dataset.id;
        el.classList.add('selected');
    }

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
    }

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
    }

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
    }

    // Rate 0.35 (vs. the normal 0.9) so learners can clearly pick out individual words -
    // slower than a first pass at 0.5 turned out to be, per user feedback that it still
    // wasn't slow enough to hear each word distinctly.
    playAudioSlow(text) {
        this.playAudio(text, 0.35);
    }

    startRecording() {
        const resultEl = document.getElementById('pronunciation-result');
        const micBtn = document.getElementById('mic-btn');

        const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionCtor) {
            if (resultEl) resultEl.innerText = 'Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.';
            return;
        }

        if (this.recognition) {
            this.recognition.stop();
        }

        const recognition = new SpeechRecognitionCtor();
        this.recognition = recognition;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        if (micBtn) {
            micBtn.classList.add('recording');
            micBtn.innerHTML = '<span style="font-size: 32px;">🎙️</span><br>Đang nghe...';
        }
        if (resultEl) resultEl.innerText = '';

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.state.recognizedSpeech = transcript;
            if (resultEl) {
                const ex = this.getCurrentExercise();
                const target = ex && ex.target;
                let html = `Bạn nói: "${this.escapeHtml(transcript)}"`;
                if (target) {
                    const score = this.pronunciationScore(transcript, target);
                    const color = score >= 80 ? 'var(--duo-green)' : (score >= 50 ? '#ffc800' : 'var(--duo-red)');
                    html += `<br><span style="font-weight:800; color:${color};">Độ chính xác: ${score}%</span>`;
                }
                resultEl.innerHTML = html;
            }
            this.ui.checkBtn.disabled = false;
            this.ui.checkBtn.classList.add('active');
        };

        recognition.onerror = () => {
            if (resultEl) resultEl.innerText = 'Không nghe rõ, hãy thử lại.';
        };

        recognition.onend = () => {
            if (micBtn) {
                micBtn.classList.remove('recording');
                micBtn.innerHTML = '<span style="font-size: 32px;">🎤</span><br>Nhấn để nói';
            }
        };

        recognition.start();
    }

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
    }

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
    }

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
    }

    // Kept as a boolean gate (same name/signature every caller already expects) so
    // duel exclusion, the pronunciation_master badge counter, and checkAnswer()'s
    // isCorrect logic are all unaffected - only the scoring method underneath changed,
    // not the pass/fail threshold (still the same 80% bar as the old word-overlap check).
    comparePronunciation(spoken, target) {
        return this.pronunciationScore(spoken, target) >= 80;
    }

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
    }

    playTone(type) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!this.audioCtx) this.audioCtx = new AudioCtx();
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        const ctx = this.audioCtx;
        const now = ctx.currentTime;

        if (type === 'correct') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(783.99, now + 0.1);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        } else if (type === 'cheer') {
            // Rising 4-note "ta-da!" arpeggio (C5-E5-G5-C6) - a cheerful giggle/cheer
            // for big wins (lesson/course complete), stronger than the per-answer chime.
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, i) => {
                const start = now + i * 0.11;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, start);
                gain.gain.setValueAtTime(0.001, start);
                gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
                osc.start(start);
                osc.stop(start + 0.2);
            });
        } else if (type === 'cry') {
            // Descending, wavering whimper: a soft tone sliding down in pitch while a
            // fast LFO modulates its volume (tremolo) for a "sniffling" character -
            // deliberately not the harsh square-wave buzz used for a plain wrong answer.
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            lfo.connect(lfoGain);
            lfoGain.connect(gain.gain);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(330, now);
            osc.frequency.linearRampToValueAtTime(220, now + 0.9);
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(7, now);
            lfoGain.gain.setValueAtTime(0.05, now);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
            osc.start(now);
            lfo.start(now);
            osc.stop(now + 0.9);
            lfo.stop(now + 0.9);
        } else {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.linearRampToValueAtTime(120, now + 0.25);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        }
    }

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
    }

    selectOption(idx, el) {
        this.state.selectedOption = idx;
        document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        this.ui.checkBtn.disabled = false;
        this.ui.checkBtn.classList.add('active');
    }

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
    }

    removeWord(word, chip, originalEl) {
        this.state.currentAnswer = this.state.currentAnswer.filter(w => w !== word);
        chip.remove();
        originalEl.classList.remove('used');
    }

    // ============== Session answer log (powers the "Tổng kết" summary screens) ==============
    // One record per distinct question answered in the current session (lesson, practice,
    // assessment, placement or lesson-duel). A question re-answered during review updates
    // its existing record (final verdict) but keeps hadMistake=true so the summary can
    // show it needed a retry.

    resetSessionAnswers() {
        this.state.sessionAnswers = [];
    }

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
    }

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
    }

    describeCorrectAnswerForSummary(ex) {
        if (!ex) return '';
        const optionBasedTypes = ['multiple_choice', 'listening', 'preposition', 'fill_blank', 'synonym', 'meaning', 'reading', 'dialogue'];
        if (optionBasedTypes.includes(ex.type)) return ex.options && ex.options[ex.correct] != null ? String(ex.options[ex.correct]) : '';
        if (ex.type === 'translate' || ex.type === 'ordering') return Array.isArray(ex.correct) ? ex.correct.join(' ') : '';
        if (ex.type === 'pronunciation' || ex.type === 'dictation') return ex.target || '';
        if (ex.type === 'matching') return (ex.pairs || []).map(p => `${p.en} = ${p.vi}`).join('  ·  ');
        if (ex.type === 'listening_comprehension') return (ex.acceptedAnswers && ex.acceptedAnswers[0]) || '';
        return '';
    }

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
        if (ex.type === 'dictation') return this.state.dictationText || '';
        if (ex.type === 'matching') {
            const ms = this.state.matchingState;
            return ms && ms.mistakenIds.size === 0 ? 'Nối đúng tất cả' : 'Có lần nối sai';
        }
        if (ex.type === 'listening_comprehension') {
            return (this.state.comprehensionMode === 'speak' ? this.state.recognizedSpeech : this.state.comprehensionText) || '';
        }
        return '';
    }

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
    }

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
    }

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
            isCorrect = this.comparePronunciation(this.state.dictationText, ex.target);
        } else if (ex.type === 'matching') {
            const ms = this.state.matchingState;
            isCorrect = !!ms && ms.mistakenIds.size === 0;
        } else if (ex.type === 'listening_comprehension') {
            const answerText = this.state.comprehensionMode === 'speak'
                ? this.state.recognizedSpeech
                : this.state.comprehensionText;
            isCorrect = this.checkComprehensionAnswer(answerText, ex.acceptedAnswers);
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

        const noHeartCostModes = ['practice', 'assessment', 'placement', 'duel'];
        if (ex.type === 'pronunciation' && isCorrect) {
            this.state.stats.pronunciationCorrect++;
        }

        if (isCorrect) {
            this.playTone('cheer');
            this.showResultModal(true);
        } else {
            this.playTone('cry');
            if (!noHeartCostModes.includes(this.state.mode)) {
                this.state.hearts--;
                this.ui.hearts.innerText = this.state.hearts;
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
            this.showResultModal(false);
        }
        if (!noHeartCostModes.includes(this.state.mode)) {
            this.saveUserProgress();
        }
        this.checkBadges();
    }

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
    }

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

        const confirmMsg = isLastBeforeLessonComplete
            ? `Đây là câu điều kiện để hoàn thành bài học! Nếu bỏ qua, bạn sẽ KHÔNG nhận được điểm thưởng hoàn thành bài (vẫn bị trừ ${SKIP_XP_PENALTY} XP). Bạn có chắc muốn bỏ qua không?`
            : `Bỏ qua câu này sẽ bị trừ ${SKIP_XP_PENALTY} XP. Bạn có chắc muốn bỏ qua không?`;
        this.showConfirmDialog(confirmMsg, () => this.performSkip(isLastBeforeLessonComplete, SKIP_XP_PENALTY), { okLabel: 'BỎ QUA' });
    }

    performSkip(isLastBeforeLessonComplete, SKIP_XP_PENALTY) {
        this.skipInFlight = true;
        try {
            this.performSkipInner(isLastBeforeLessonComplete, SKIP_XP_PENALTY);
        } finally {
            this.skipInFlight = false;
        }
    }

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
    }

    showResultModal(correct) {
        this.ui.modal.classList.remove('hidden');
        const mascot = this.ui.modalMascot;
        if (correct) {
            if (mascot) {
                mascot.className = 'mascot mascot-cheer';
                mascot.innerHTML = getMascotSvg('happy', 64) + '<span class="mascot-accessory">✨</span>';
            }
            this.ui.modalIcon.innerText = "✅";
            this.ui.modalTitle.innerText = "Chính xác!";
            this.ui.modalTitle.style.color = "var(--duo-green)";
            this.ui.modalMsg.innerText = pickRandom(HAPPY_MESSAGES);
            this.ui.modalBtn.className = "btn-primary";
        } else {
            if (mascot) {
                mascot.className = 'mascot mascot-cry';
                mascot.innerHTML = getMascotSvg('sad', 64) + '<span class="mascot-accessory">💧</span>';
            }
            this.ui.modalIcon.innerText = "❌";
            this.ui.modalTitle.innerText = "Sai rồi!";
            this.ui.modalTitle.style.color = "var(--duo-red)";
            this.ui.modalMsg.innerText = pickRandom(SAD_MESSAGES);
            this.ui.modalBtn.className = "btn-secondary";
        }
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

    renderLessonReviewDone() {
        const core = this.state.lessonReviewCore || [];
        this.state.lessonReviewCore = null;
        this.state.mode = 'curriculum';
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character mascot-cheer">🎓</div>
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
        this.playTone('cheer');
        document.getElementById('review-done-continue').addEventListener('click', () => {
            this.resetSessionAnswers();
            if (this.state.currentUnitIdx >= this.state.courseData.units.length) {
                this.renderCourseComplete();
            } else {
                this.renderLesson();
            }
        });
        document.getElementById('review-done-home').addEventListener('click', () => this.renderHomeDashboard());
    }

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

        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character ${skippedReward ? 'mascot-cry' : 'mascot-cheer'}">${skippedReward ? '😅' : '🎉'}</div>
                <h1 style="text-align: center;">${this.escapeHtml(headline)}</h1>
                <p style="text-align: center; color: #777;">${this.escapeHtml(subtitle)}</p>
                ${this.sessionSummaryHtml()}
                ${this.lessonCoreSummaryHtml(coreItems)}
                ${reviewQueue.length >= 3 ? `
                    <button class="btn-primary" id="lesson-review-btn" style="display: block; margin: 20px auto 0; padding: 15px 30px;">🔄 ÔN LUYỆN CỦNG CỐ (${reviewQueue.length} câu)</button>
                    <p style="text-align:center; color:#999; font-size:12.5px; margin:6px 0 0;">Hỏi lại đúng cốt lõi vừa học dưới dạng câu hỏi mới - không tốn tim, giúp nhớ lâu hơn</p>
                ` : ''}
                <button class="${reviewQueue.length >= 3 ? 'btn-secondary' : 'btn-primary'}" id="lesson-summary-continue" style="display: block; margin: 15px auto; padding: 15px 30px;">TIẾP TỤC</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        if (this.ui.skipBtn) this.ui.skipBtn.style.display = 'none';
        if (!skippedReward) this.playTone('cheer');
        const reviewBtn = document.getElementById('lesson-review-btn');
        if (reviewBtn) reviewBtn.addEventListener('click', () => this.startLessonReview(reviewQueue, coreItems));
        document.getElementById('lesson-summary-continue').addEventListener('click', () => {
            this.resetSessionAnswers();
            if (this.state.currentUnitIdx >= this.state.courseData.units.length) {
                this.renderCourseComplete();
            } else {
                this.renderLesson();
            }
        });
    }

    awardLessonCompletion() {
        const settings = this.state.courseData.settings || {};
        const xpGain = settings.xp_per_lesson || 0;
        const streakBonus = settings.streak_bonus || 0;
        const streakExtended = this.updateStreak();
        const totalGain = xpGain + (streakExtended ? streakBonus : 0);

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
    }

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
    }

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
            window.Leaderboard.submitScore(this.state.currentUser, this.state.xp, this.state.streak, this.state.vibrancy);
        }
    }

    // Ranks by cumulative xp, not a resetting weekly counter - a leader nobody catches
    // up to simply keeps winning the Saturday prize, which is intended now (see
    // checkWeeklyReset()'s comment for the full reasoning).
    syncLeaderboardScore() {
        if (window.Leaderboard && this.state.currentUser) {
            window.Leaderboard.submitScore(this.state.currentUser, this.state.xp, this.state.streak, this.state.vibrancy || 0);
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
    }

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
    }

    async refreshTeddyBears() {
        if (!window.AuthService || !this.state.profile) return;
        const fresh = await window.AuthService.getProfile(this.state.profile.id);
        if (fresh && typeof fresh.teddy_bears === 'number' && fresh.teddy_bears !== this.state.teddyBears) {
            this.state.teddyBears = fresh.teddy_bears;
            this.checkBadges();
        }
    }

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
    }

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
    }

    renderCourseComplete() {
        this.state.stats.courseCompleted = true;
        this.checkBadges();
        this.ui.progress.style.width = '100%';
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character mascot-cheer">🎉</div>
                <h1 style="text-align: center;">Hoàn thành khóa học!</h1>
                <p style="text-align: center; color: #777;">Bạn đã chinh phục toàn bộ bài học. Tuyệt vời lắm!</p>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        this.playTone('cheer');
    }

    // 3 user ranking tabs (XP / Chuỗi / Sôi nổi) sharing one screen, mirroring
    // renderGroupLeaderboards()'s tab pattern, plus a shortcut to the group boards.
    async renderLeaderboard(sortBy = 'xp') {
        if (!this.state.currentUser) {
            alert("Vui lòng đăng nhập trước khi xem bảng xếp hạng!");
            return;
        }
        const tabs = [
            { key: 'xp', label: '⭐ XP' },
            { key: 'streak', label: '🔥 Chuỗi ngày' },
            { key: 'vibrancy', label: '⚡ Sôi nổi' }
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
        if (window.Leaderboard) {
            if (sortBy === 'streak') result = await window.Leaderboard.getStreakLeaderboard(50);
            else if (sortBy === 'vibrancy') result = await window.Leaderboard.getVibrancyLeaderboard(50);
            else result = await window.Leaderboard.fetchTop(50);
        }

        const valueLabel = (entry) => {
            if (sortBy === 'streak') return `🔥 ${entry.streak || 0} ngày`;
            if (sortBy === 'vibrancy') return `⚡ ${entry.vibrancy || 0} điểm`;
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
            bodyHtml = `<p style="text-align: center; color: #777;">Chưa có ai trên bảng xếp hạng. Hãy là người đầu tiên!</p>`;
        } else {
            bodyHtml = `<div class="leaderboard-list">` + result.entries.map((entry, idx) => {
                const rank = idx + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                const isMe = entry.username === this.state.currentUser;
                return `<div class="leaderboard-row ${isMe ? 'me' : ''}">
                            <span class="lb-rank">${medal}</span>
                            <span class="lb-name">${isMe ? this.escapeHtml(entry.username) : this.clickableUsername(null, entry.username)}</span>
                            <span class="lb-xp">${valueLabel(entry)}</span>
                        </div>`;
            }).join('') + `</div>`;
        }

        const footNote = sortBy === 'vibrancy'
            ? '⚡ Điểm Sôi nổi tăng khi bạn hoạt động: học bài, luyện tập, thách đấu, chơi game và trò chuyện cùng cộng đồng.'
            : '🧸 Người dẫn đầu lúc 19h thứ Bảy sẽ được tặng gấu bông! Điểm không bị reset - nếu không ai vượt qua, người dẫn đầu vẫn tiếp tục được thưởng vào tuần sau.';

        this.ui.container.innerHTML = `
            <div class="leaderboard-screen">
                <h2 style="text-align: center;">🏆 Bảng Xếp Hạng</h2>
                <div class="game-picker-list" style="flex-direction:row; justify-content:center; gap:8px; max-width:500px; margin:10px auto;">
                    ${tabs.map(t => `<button class="btn-secondary user-lb-tab-btn ${t.key === sortBy ? 'group-lb-tab-active' : ''}" data-sort="${t.key}" style="padding:8px 14px; font-size:13px;">${t.label}</button>`).join('')}
                </div>
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
    }

    closeLeaderboard() {
        this.renderHomeDashboard();
    }

    returnToApp() {
        const inLimitedMode = ['practice', 'assessment', 'placement'].includes(this.state.mode);
        if (!this.state.currentUser) {
            this.renderAuthScreen();
        } else if (!inLimitedMode && this.state.hearts <= 0) {
            this.renderOutOfHearts();
        } else if (!inLimitedMode && this.state.currentUnitIdx >= this.state.courseData.units.length) {
            this.renderCourseComplete();
        } else {
            this.renderLesson();
        }
    }

    getMsUntilNextHeart() {
        const lastUpdate = this.state.lastHeartUpdate || Date.now();
        const elapsed = Date.now() - lastUpdate;
        return Math.max(0, HEART_REGEN_MS - elapsed);
    }

    updateHeartCountdown() {
        const el = document.getElementById('heart-countdown');
        if (!el) {
            clearInterval(this.heartCountdownInterval);
            return;
        }
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
    }

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
        this.playTone('cry');

        this.updateHeartCountdown();
        clearInterval(this.heartCountdownInterval);
        this.heartCountdownInterval = setInterval(() => this.updateHeartCountdown(), 1000);
    }

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
    }

    launchWordMatchGame() {
        if (window.Games) {
            Games.renderWordMatchGame(this.ui.container, {
                onRoundEnd: (matched, total) => this.applyGameReward(matched, total),
                onExit: () => this.renderGamePicker()
            });
        }
    }

    launchMemoryGame() {
        if (window.Games) {
            const userId = this.state.profile ? this.state.profile.id : 'guest';
            Games.renderMemoryGame(this.ui.container, {
                onRoundEnd: (matched, total) => this.applyGameReward(matched, total),
                onExit: () => this.renderGamePicker()
            }, userId);
        }
    }

    launchOddOneOutGame() {
        if (window.Games) {
            Games.renderOddOneOutGame(this.ui.container, {
                onRoundEnd: (matched, total) => this.applyGameReward(matched, total),
                onExit: () => this.renderGamePicker()
            });
        }
    }

    launchReflexGame() {
        if (window.Games) {
            Games.renderReflexGame(this.ui.container, {
                onRoundEnd: (matched, total) => this.applyGameReward(matched, total),
                onExit: () => this.renderGamePicker()
            });
        }
    }

    launchPictureWordGame() {
        if (window.Games) {
            Games.renderPictureWordGame(this.ui.container, {
                onRoundEnd: (matched, total) => this.applyGameReward(matched, total),
                onExit: () => this.renderGamePicker()
            });
        }
    }

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
            this.ui.hearts.innerText = this.state.hearts;
            this.addVibrancy(3);
            this.saveUserProgress();
            if (actualGained > 0) {
                this.showHeartRewardToast(actualGained);
            }
        }
    }

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
    }

    startPracticeMode() {
        if (!this.state.currentUser) {
            alert("Vui lòng đăng nhập trước khi luyện tập!");
            return;
        }
        if (!window.ExerciseGenerator) return;

        // Rank is the authoritative floor now (it supersedes placementLevel, which is
        // still kept around only as the "has this user ever been placed" flag - see
        // getRankInfo()'s comment) - recommendDifficulty() can still push it higher if
        // the learner's recent accuracy is running ahead of their rank, but never lower,
        // since a rank demotion (see renderDuelResult()/skipCurrentExercise()) should
        // immediately make new exercises easier again without any extra bookkeeping here.
        const baseDifficulty = this.errorTracker ? this.errorTracker.recommendDifficulty() : 1;
        const rankDifficulty = getRankInfo(this.state.xp).difficulty;
        const difficulty = Math.max(baseDifficulty, rankDifficulty);
        const weakKeys = this.errorTracker ? new Set(this.errorTracker.getWeakItems(30)) : new Set();
        // Match ALL_TYPES.length so every exercise type appears at least once per session -
        // generateBatch round-robins by index, so a fixed count smaller than the type list
        // would permanently starve whichever types sit at the tail of ALL_TYPES.
        const batchSize = window.ExerciseGenerator.ALL_TYPES ? window.ExerciseGenerator.ALL_TYPES.length : 10;

        this.state.mode = 'practice';
        this.state.practiceQueue = window.ExerciseGenerator.generateBatch(batchSize, difficulty, weakKeys);
        this.state.practiceIdx = 0;
        this.resetSessionAnswers();
        this.renderLesson();
    }

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
    }

    renderPracticeSummary() {
        this.state.stats.practiceSessions++;
        this.addVibrancy(5);
        this.checkBadges();
        const stats = this.errorTracker ? this.errorTracker.getStats() : null;
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character mascot-cheer">💪</div>
                <h1 style="text-align: center;">Hoàn thành buổi luyện tập!</h1>
                <p style="text-align: center; color: #777;">Bạn đã luyện ${this.state.practiceQueue.length} câu.</p>
                ${stats ? `<p style="text-align: center; color: #777;">Độ chính xác tổng: ${Math.round(stats.accuracy * 100)}%</p>` : ''}
                ${this.sessionSummaryHtml()}
                <button class="btn-primary" id="practice-again" style="display: block; margin: 20px auto; padding: 15px 30px;">LUYỆN THÊM</button>
                <button class="btn-secondary" id="practice-exit" style="display: block; margin: 10px auto; padding: 15px 30px;">VỀ TRANG CHÍNH</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        this.playTone('cheer');
        document.getElementById('practice-again').addEventListener('click', () => this.startPracticeMode());
        document.getElementById('practice-exit').addEventListener('click', () => {
            this.state.mode = 'curriculum';
            this.renderHomeDashboard();
        });
    }

    // ===================== IELTS Practice (Listening + Reading) =====================
    // Approximate band conversion for PRACTICE purposes only - not the official IELTS
    // raw-score table (which is calibrated for exactly 40 questions per skill).
    ieltsScoreToBand(pct) {
        if (pct >= 90) return 8.5;
        if (pct >= 80) return 7.5;
        if (pct >= 70) return 7.0;
        if (pct >= 60) return 6.5;
        if (pct >= 50) return 6.0;
        if (pct >= 40) return 5.5;
        if (pct >= 30) return 5.0;
        return 4.5;
    }

    stopIeltsTimer() {
        if (this.ieltsTimerInterval) {
            clearInterval(this.ieltsTimerInterval);
            this.ieltsTimerInterval = null;
        }
    }

    // Bug fix: none of the active-attempt screens (reading passage, listening section,
    // writing editor, speaking part) had any way back to the main app short of finishing
    // every remaining passage/section or letting the timer run out - the only other exit
    // was the nav "X" button, which fully signs the user out. This gives every active
    // IELTS screen an explicit, non-destructive-to-the-session way out.
    exitIeltsAttempt() {
        if (!confirm('Thoát bài luyện tập? Tiến trình bài này sẽ không được lưu.')) return;
        this.stopIeltsTimer();
        this.state.ielts = null;
        this.state.ieltsSpeaking = null;
        this.state.mode = 'curriculum';
        this.renderHomeDashboard();
    }

    renderIeltsExitButton() {
        return `<div style="text-align:right;"><button class="btn-secondary" id="ielts-exit-btn" style="padding:5px 12px; font-size:12.5px;">✕ Thoát</button></div>`;
    }

    bindIeltsExitButton() {
        const btn = document.getElementById('ielts-exit-btn');
        if (btn) btn.addEventListener('click', () => this.exitIeltsAttempt());
    }

    startIeltsTimer(minutes, onExpire) {
        this.stopIeltsTimer();
        // Deliberately a plain instance field, not nested under this.state.ielts - the
        // timer is shared across Reading/Listening/Writing flows, and Writing never
        // initializes state.ielts (that object is Reading/Listening-specific), so
        // nesting here would throw when starting a Writing session directly.
        this.ieltsTimeLeftSec = minutes * 60;
        const update = () => {
            const el = document.getElementById('ielts-timer');
            if (!el) return;
            const m = Math.floor(this.ieltsTimeLeftSec / 60);
            const s = this.ieltsTimeLeftSec % 60;
            el.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        };
        update();
        this.ieltsTimerInterval = setInterval(() => {
            this.ieltsTimeLeftSec--;
            update();
            if (this.ieltsTimeLeftSec <= 0) {
                this.stopIeltsTimer();
                onExpire();
            }
        }, 1000);
    }

    renderIeltsMenu() {
        if (!this.state.currentUser) {
            alert("Vui lòng đăng nhập trước khi luyện thi IELTS!");
            return;
        }
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">🎓</div>
                <h1 style="text-align: center;">Luyện Thi IELTS</h1>
                <p style="text-align: center; color: #777;">Chọn kỹ năng bạn muốn luyện tập theo đúng định dạng và thời gian thi thật.</p>
                <button class="btn-primary" id="ielts-pick-reading" style="display: block; margin: 15px auto; padding: 15px 30px;">📖 Reading (60 phút)</button>
                <button class="btn-primary" id="ielts-pick-listening" style="display: block; margin: 15px auto; padding: 15px 30px;">🎧 Listening (30 phút)</button>
                <button class="btn-secondary" id="ielts-pick-writing" style="display: block; margin: 15px auto; padding: 15px 30px;">✍️ Writing</button>
                <button class="btn-secondary" id="ielts-pick-speaking" style="display: block; margin: 15px auto; padding: 15px 30px;">🗣️ Speaking</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('ielts-pick-reading').addEventListener('click', () => this.startIeltsReading());
        document.getElementById('ielts-pick-listening').addEventListener('click', () => this.startIeltsListening());
        document.getElementById('ielts-pick-writing').addEventListener('click', () => this.renderIeltsWritingMenu());
        document.getElementById('ielts-pick-speaking').addEventListener('click', () => this.renderIeltsSpeakingMenu());
    }

    startIeltsReading() {
        this.state.mode = 'ielts';
        this.state.ielts = { skill: 'reading', items: IELTS_READING, idx: 0, correctTotal: 0, questionsTotal: 0 };
        this.renderIeltsReadingPassage();
        this.startIeltsTimer(60, () => this.finishIeltsTest());
    }

    renderIeltsReadingPassage() {
        const st = this.state.ielts;
        const passage = st.items[st.idx];
        let html = this.renderIeltsExitButton();
        html += `<div style="text-align:center; margin-bottom:10px;">⏱️ <span id="ielts-timer" style="font-weight:800;"></span> &nbsp;|&nbsp; Đoạn ${st.idx + 1}/${st.items.length}</div>`;
        html += `<h2 style="text-align:center;">${this.escapeHtml(passage.title)}</h2>`;
        html += `<div class="reading-passage">${this.escapeHtml(passage.passage)}</div>`;
        html += this.renderIeltsQuestions(passage.questions);
        html += `<button class="btn-primary" id="ielts-submit" style="display:block; margin:20px auto; padding:15px 30px;">NỘP ĐOẠN NÀY</button>`;
        this.ui.container.innerHTML = html;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        this.bindIeltsQuestionEvents(passage.questions);
        this.bindIeltsExitButton();
        document.getElementById('ielts-submit').addEventListener('click', () => this.submitIeltsSection(passage.questions));
    }

    startIeltsListening() {
        this.state.mode = 'ielts';
        this.state.ielts = { skill: 'listening', items: IELTS_LISTENING, idx: 0, correctTotal: 0, questionsTotal: 0 };
        this.renderIeltsListeningSection();
        this.startIeltsTimer(30, () => this.finishIeltsTest());
    }

    renderIeltsListeningSection() {
        const st = this.state.ielts;
        const section = st.items[st.idx];
        let html = this.renderIeltsExitButton();
        html += `<div style="text-align:center; margin-bottom:10px;">⏱️ <span id="ielts-timer" style="font-weight:800;"></span> &nbsp;|&nbsp; Phần ${st.idx + 1}/${st.items.length}</div>`;
        html += `<h2 style="text-align:center;">${this.escapeHtml(section.title)}</h2>`;
        html += `<div class="pronunciation-controls">
                    <button class="btn-listen" id="listen-btn"><span style="font-size: 32px;">🔊</span><br>Nghe lại</button>
                    <button class="btn-listen" id="listen-slow-btn"><span style="font-size: 32px;">🐢</span><br>Nghe chậm</button>
                 </div>`;
        html += this.renderIeltsQuestions(section.questions);
        html += `<button class="btn-primary" id="ielts-submit" style="display:block; margin:20px auto; padding:15px 30px;">NỘP PHẦN NÀY</button>`;
        this.ui.container.innerHTML = html;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('listen-btn').addEventListener('click', () => this.playAudio(section.audioText));
        document.getElementById('listen-slow-btn').addEventListener('click', () => this.playAudioSlow(section.audioText));
        this.bindIeltsQuestionEvents(section.questions);
        this.bindIeltsExitButton();
        document.getElementById('ielts-submit').addEventListener('click', () => this.submitIeltsSection(section.questions));
        this.playAudio(section.audioText);
    }

    renderIeltsQuestions(questions) {
        let html = '';
        questions.forEach((q, i) => {
            html += `<div class="ielts-question" data-qidx="${i}" style="margin: 20px 0; padding: 15px; border: 2px solid var(--duo-border); border-radius: 12px;">`;
            html += `<p style="font-weight:700;">${i + 1}. ${this.escapeHtml(q.q)}</p>`;
            if (q.type === 'mc') {
                html += `<div class="options-grid">`;
                q.options.forEach((opt, oi) => {
                    html += `<div class="option-card ielts-opt" data-qidx="${i}" data-oidx="${oi}">${this.escapeHtml(opt)}</div>`;
                });
                html += `</div>`;
            } else if (q.type === 'tfng') {
                html += `<div class="options-grid">`;
                ['True', 'False', 'Not Given'].forEach((opt, oi) => {
                    html += `<div class="option-card ielts-opt" data-qidx="${i}" data-oidx="${oi}">${opt}</div>`;
                });
                html += `</div>`;
            } else if (q.type === 'fill') {
                html += `<input type="text" class="input-field dictation-input ielts-fill-input" data-qidx="${i}" placeholder="Nhập câu trả lời...">`;
            }
            html += `</div>`;
        });
        return html;
    }

    bindIeltsQuestionEvents(questions) {
        this.ieltsAnswers = {};
        this.ui.container.querySelectorAll('.ielts-opt').forEach(el => {
            el.addEventListener('click', () => {
                const qidx = el.dataset.qidx;
                this.ui.container.querySelectorAll(`.ielts-opt[data-qidx="${qidx}"]`).forEach(c => c.classList.remove('selected'));
                el.classList.add('selected');
                this.ieltsAnswers[qidx] = parseInt(el.dataset.oidx, 10);
            });
        });
        this.ui.container.querySelectorAll('.ielts-fill-input').forEach(el => {
            el.addEventListener('input', () => {
                this.ieltsAnswers[el.dataset.qidx] = el.value;
            });
        });
    }

    submitIeltsSection(questions) {
        const st = this.state.ielts;
        let correct = 0;
        questions.forEach((q, i) => {
            const answer = this.ieltsAnswers ? this.ieltsAnswers[i] : undefined;
            let isRight = false;
            if (q.type === 'mc') {
                isRight = answer === q.correct;
            } else if (q.type === 'tfng') {
                const map = { 0: 'true', 1: 'false', 2: 'not_given' };
                isRight = map[answer] === q.correct;
            } else if (q.type === 'fill') {
                isRight = this.checkComprehensionAnswer(answer, q.acceptedAnswers);
            }
            if (isRight) correct++;
        });
        st.correctTotal += correct;
        st.questionsTotal += questions.length;
        st.idx++;
        if (st.idx >= st.items.length) {
            this.finishIeltsTest();
        } else if (st.skill === 'reading') {
            this.renderIeltsReadingPassage();
        } else {
            this.renderIeltsListeningSection();
        }
    }

    finishIeltsTest() {
        this.stopIeltsTimer();
        const st = this.state.ielts;
        const pct = st.questionsTotal ? Math.round((st.correctTotal / st.questionsTotal) * 100) : 0;
        const band = this.ieltsScoreToBand(pct);
        const skillLabel = st.skill === 'reading' ? 'Reading' : 'Listening';
        this.playTone(pct >= 60 ? 'cheer' : 'cry');
        this.ui.container.innerHTML = `
            <div class="certificate">
                <div class="certificate-badge">🎓</div>
                <h2>KẾT QUẢ LUYỆN THI IELTS - ${skillLabel.toUpperCase()}</h2>
                <p class="certificate-name">${this.escapeHtml(this.state.currentUser)}</p>
                <p>Trả lời đúng ${st.correctTotal}/${st.questionsTotal} câu (${pct}%)</p>
                <p class="certificate-score">Band điểm ước lượng: ${band.toFixed(1)}</p>
                <p style="font-size: 12px; color: #999;">* Đây là band điểm ước lượng cho mục đích luyện tập, không phải kết quả thi IELTS chính thức.</p>
            </div>
            <button class="btn-primary" id="ielts-done" style="display: block; margin: 20px auto; padding: 15px 30px;">VỀ TRANG CHÍNH</button>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('ielts-done').addEventListener('click', () => {
            this.state.mode = 'curriculum';
            this.renderHomeDashboard();
        });
    }

    // Calls the Supabase Edge Function that grades Writing/Speaking with a real AI
    // model against IELTS band descriptors. Returns { ok: true, data } on success or
    // { ok: false, notConfigured: true } if the function/API key isn't set up yet, or
    // { ok: false, message } for any other failure - never throws.
    async callIeltsGradeFunction(payload) {
        if (!window.SupabaseClient || !window.SupabaseClient.client || !window.SupabaseClient.isConfigured) {
            return { ok: false, notConfigured: true };
        }
        try {
            const { data, error } = await window.SupabaseClient.client.functions.invoke('ielts-grade', { body: payload });
            // Any failure to reach/complete the Edge Function - whether it's not deployed
            // yet, missing its ANTHROPIC_API_KEY secret, or a network error - all mean the
            // same thing to the user: AI grading isn't set up yet. Surface one consistent,
            // actionable message rather than a raw technical error string.
            if (error || (data && data.error)) return { ok: false, notConfigured: true, debug: (error && error.message) || (data && data.message) };
            return { ok: true, data };
        } catch (e) {
            return { ok: false, notConfigured: true, debug: e.message };
        }
    }

    renderIeltsGradeWaiting(title) {
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">🤖</div>
                <h1 style="text-align: center;">${this.escapeHtml(title)}</h1>
                <p style="text-align: center; color: #777;">AI đang chấm bài của bạn, vui lòng đợi trong giây lát...</p>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
    }

    renderIeltsGradeResult(skillLabel, result) {
        if (!result.ok) {
            const msg = result.notConfigured
                ? 'Tính năng chấm điểm AI chưa được cấu hình. Quản trị viên cần thêm ANTHROPIC_API_KEY vào Supabase Edge Function secrets và deploy function "ielts-grade" để kích hoạt chấm điểm thật.'
                : `Đã có lỗi khi chấm điểm: ${this.escapeHtml(result.message || 'Không rõ nguyên nhân')}`;
            this.ui.container.innerHTML = `
                <div class="welcome-screen">
                    <div class="duo-character">⚙️</div>
                    <h1 style="text-align: center;">Chưa thể chấm điểm</h1>
                    <p style="text-align: center; color: #777;">${msg}</p>
                    <button class="btn-primary" id="ielts-grade-done" style="display: block; margin: 20px auto; padding: 15px 30px;">VỀ TRANG CHÍNH</button>
                </div>
            `;
        } else {
            const g = result.data;
            const criteriaHtml = (g.criteria || []).map(c => `
                <div style="margin: 10px 0; padding: 10px; border: 2px solid var(--duo-border); border-radius: 10px;">
                    <strong>${this.escapeHtml(c.name)}: ${c.band}</strong>
                    <p style="color:#777; margin: 5px 0 0;">${this.escapeHtml(c.comment || '')}</p>
                </div>
            `).join('');
            this.ui.container.innerHTML = `
                <div class="certificate">
                    <div class="certificate-badge">🎓</div>
                    <h2>KẾT QUẢ ${skillLabel.toUpperCase()} - CHẤM BỞI AI</h2>
                    <p class="certificate-score">Band tổng: ${g.overallBand}</p>
                </div>
                <div style="max-width: 500px; margin: 20px auto;">${criteriaHtml}</div>
                <p style="max-width: 500px; margin: 10px auto; color:#777;">${this.escapeHtml(g.feedback || '')}</p>
                <button class="btn-primary" id="ielts-grade-done" style="display: block; margin: 20px auto; padding: 15px 30px;">VỀ TRANG CHÍNH</button>
            `;
        }
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('ielts-grade-done').addEventListener('click', () => {
            this.state.mode = 'curriculum';
            this.renderHomeDashboard();
        });
    }

    // ---------- Writing ----------

    renderIeltsWritingMenu() {
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">✍️</div>
                <h1 style="text-align: center;">IELTS Writing</h1>
                <button class="btn-primary" id="ielts-write-task1" style="display: block; margin: 15px auto; padding: 15px 30px;">Task 1 (150 từ / 20 phút)</button>
                <button class="btn-primary" id="ielts-write-task2" style="display: block; margin: 15px auto; padding: 15px 30px;">Task 2 (250 từ / 40 phút)</button>
                <button class="btn-secondary" id="ielts-write-back" style="display: block; margin: 15px auto; padding: 15px 30px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('ielts-write-task1').addEventListener('click', () => this.startIeltsWriting('task1'));
        document.getElementById('ielts-write-task2').addEventListener('click', () => this.startIeltsWriting('task2'));
        document.getElementById('ielts-write-back').addEventListener('click', () => this.renderHomeDashboard());
    }

    startIeltsWriting(taskType) {
        this.state.mode = 'ielts';
        const promptObj = pickRandom(IELTS_WRITING_PROMPTS[taskType]);
        this.ui.container.innerHTML = `
            ${this.renderIeltsExitButton()}
            <div style="text-align:center; margin-bottom:10px;">⏱️ <span id="ielts-timer" style="font-weight:800;"></span></div>
            <div class="reading-passage">${this.escapeHtml(promptObj.prompt)}</div>
            <textarea id="ielts-essay-input" class="input-field" style="width:100%; min-height:220px; padding:15px; font-family:inherit; font-size:16px; box-sizing:border-box;" placeholder="Viết bài của bạn ở đây..."></textarea>
            <p style="text-align:center; color:#777;">Số từ: <span id="ielts-word-count">0</span> / tối thiểu ${promptObj.minWords}</p>
            <button class="btn-primary" id="ielts-write-submit" style="display: block; margin: 20px auto; padding: 15px 30px;">NỘP BÀI</button>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        this.bindIeltsExitButton();
        const input = document.getElementById('ielts-essay-input');
        input.addEventListener('input', () => {
            const words = input.value.trim().split(/\s+/).filter(Boolean).length;
            document.getElementById('ielts-word-count').innerText = words;
        });
        document.getElementById('ielts-write-submit').addEventListener('click', () => this.submitIeltsWriting(taskType, promptObj, input.value));
        this.startIeltsTimer(promptObj.minutes, () => this.submitIeltsWriting(taskType, promptObj, input.value));
    }

    async submitIeltsWriting(taskType, promptObj, essayText) {
        this.stopIeltsTimer();
        if (!essayText || !essayText.trim()) {
            alert('Bạn chưa viết gì để nộp bài.');
            this.startIeltsTimer(promptObj.minutes, () => this.submitIeltsWriting(taskType, promptObj, essayText));
            return;
        }
        this.renderIeltsGradeWaiting('Đang chấm bài Writing...');
        const result = await this.callIeltsGradeFunction({ skill: 'writing', taskType, prompt: promptObj.prompt, userText: essayText });
        this.renderIeltsGradeResult('Writing', result);
    }

    // ---------- Speaking ----------

    renderIeltsSpeakingMenu() {
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">🗣️</div>
                <h1 style="text-align: center;">IELTS Speaking</h1>
                <p style="text-align: center; color: #777;">Gồm 3 phần: giới thiệu bản thân, trình bày cue card, và thảo luận sâu. Trả lời bằng cách ghi âm cho từng phần.</p>
                <button class="btn-primary" id="ielts-speak-start" style="display: block; margin: 15px auto; padding: 15px 30px;">BẮT ĐẦU</button>
                <button class="btn-secondary" id="ielts-speak-back" style="display: block; margin: 15px auto; padding: 15px 30px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('ielts-speak-start').addEventListener('click', () => this.startIeltsSpeaking());
        document.getElementById('ielts-speak-back').addEventListener('click', () => this.renderHomeDashboard());
    }

    startIeltsSpeaking() {
        this.state.mode = 'ielts';
        const promptSet = pickRandom(IELTS_SPEAKING_PROMPTS);
        this.state.ieltsSpeaking = { promptSet, part: 1, transcripts: { part1: '', part2: '', part3: '' } };
        this.renderIeltsSpeakingPart();
    }

    renderIeltsSpeakingPart() {
        const st = this.state.ieltsSpeaking;
        const partNum = st.part;
        let questionsHtml = '';
        if (partNum === 1) {
            questionsHtml = `<ul>${st.promptSet.part1.map(q => `<li>${this.escapeHtml(q)}</li>`).join('')}</ul>`;
        } else if (partNum === 2) {
            const cue = st.promptSet.part2;
            questionsHtml = `<p style="font-weight:700;">${this.escapeHtml(cue.cueCard)}</p><ul>${cue.points.map(p => `<li>${this.escapeHtml(p)}</li>`).join('')}</ul>`;
        } else {
            questionsHtml = `<ul>${st.promptSet.part3.map(q => `<li>${this.escapeHtml(q)}</li>`).join('')}</ul>`;
        }
        this.ui.container.innerHTML = `
            ${this.renderIeltsExitButton()}
            <h2 style="text-align:center;">Part ${partNum} / 3</h2>
            <div class="reading-passage">${questionsHtml}</div>
            <div class="pronunciation-controls">
                <button class="btn-listen" id="mic-btn"><span style="font-size: 32px;">🎤</span><br>Nhấn để nói</button>
            </div>
            <div id="pronunciation-result" class="pronunciation-result"></div>
            <button class="btn-primary" id="ielts-speak-next" style="display: block; margin: 20px auto; padding: 15px 30px;" disabled>${partNum < 3 ? 'PHẦN TIẾP THEO' : 'NỘP BÀI'}</button>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        this.bindIeltsExitButton();
        const nextBtn = document.getElementById('ielts-speak-next');
        document.getElementById('mic-btn').addEventListener('click', () => {
            this.startRecording();
            const checkInterval = setInterval(() => {
                if (this.state.recognizedSpeech) {
                    const key = `part${partNum}`;
                    this.state.ieltsSpeaking.transcripts[key] = this.state.recognizedSpeech;
                    nextBtn.disabled = false;
                    clearInterval(checkInterval);
                }
            }, 300);
        });
        nextBtn.addEventListener('click', () => {
            if (partNum < 3) {
                this.state.ieltsSpeaking.part++;
                this.state.recognizedSpeech = null;
                this.renderIeltsSpeakingPart();
            } else {
                this.submitIeltsSpeaking();
            }
        });
    }

    async submitIeltsSpeaking() {
        const st = this.state.ieltsSpeaking;
        const fullTranscript = `Part 1: ${st.transcripts.part1}\nPart 2 (${st.promptSet.part2.cueCard}): ${st.transcripts.part2}\nPart 3: ${st.transcripts.part3}`;
        this.renderIeltsGradeWaiting('Đang chấm bài Speaking...');
        const result = await this.callIeltsGradeFunction({ skill: 'speaking', taskType: 'full_interview', prompt: st.promptSet.part2.cueCard, userText: fullTranscript });
        this.renderIeltsGradeResult('Speaking', result);
    }

    // ===================== 1v1 Realtime Duel =====================
    // Exercise types deliberately excluded from duels: 'pronunciation'/'dictation'/
    // 'listening_comprehension' speak-mode (speech-recognition quality varies by mic/
    // environment, unfair in a timed race) and 'matching' (slow multi-step drag UI, poor
    // fit for a fast race format). The remaining types are all instant option/word-bank
    // answers already scored by simple equality checks in checkAnswer().
    static get DUEL_SAFE_TYPES() {
        return ['multiple_choice', 'translate', 'ordering', 'fill_blank', 'synonym', 'meaning', 'reading', 'dialogue', 'listening'];
    }

    // Shared display labels for every duels.game_type value - used by the game-type
    // picker, the challenge form's title, and the incoming-invite prompt so a mini-game
    // duel reads as clearly as a lesson duel does.
    static get GAME_TYPE_LABELS() {
        return {
            lesson: '📚 Bài học',
            word_match: '⚡ Ghép Từ Nhanh',
            memory: '🧠 Lật Thẻ Nhớ Từ',
            odd_one_out: '🔎 Từ Lạc Loài',
            reflex: '⚡ Phản Xạ Từ Vựng',
            picture_word: '🖼️ Nhìn Hình Chọn Từ'
        };
    }

    buildDuelQuestions(count, difficulty) {
        const types = DuoClone.DUEL_SAFE_TYPES;
        const qs = [];
        for (let i = 0; i < count; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const ex = window.ExerciseGenerator.generateExercise(type, difficulty, new Set());
            if (ex) qs.push(ex);
        }
        return qs;
    }

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
    }

    injectDuelProgressBar(duelRow, isChallenger) {
        const existing = document.getElementById('duel-progress-bar');
        if (existing) existing.remove();
        const bar = document.createElement('div');
        bar.id = 'duel-progress-bar';
        bar.className = 'duel-progress-bar';
        document.body.appendChild(bar);
        this.renderDuelProgressBar(duelRow, isChallenger);
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

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
    }

    renderGroupChatMessages(messages) {
        const listEl = document.getElementById('group-chat-messages');
        if (!listEl) return;
        listEl.innerHTML = messages.length
            ? messages.map(m => this.groupChatMessageHtml(m)).join('')
            : '<p style="text-align:center; color:#999; font-size:13px;">Chưa có tin nhắn nào trong group.</p>';
        listEl.scrollTop = listEl.scrollHeight;
    }

    appendGroupChatMessage(msg) {
        const listEl = document.getElementById('group-chat-messages');
        if (!listEl) return;
        listEl.insertAdjacentHTML('beforeend', this.groupChatMessageHtml(msg));
        listEl.scrollTop = listEl.scrollHeight;
    }

    cleanupGroupChat() {
        if (this.groupChatUnsub) {
            this.groupChatUnsub();
            this.groupChatUnsub = null;
        }
    }

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
    }

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
    }

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
    }

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
    }

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
    }

    cleanupInboxConversation() {
        if (this.inboxConversationUnsub) {
            this.inboxConversationUnsub();
            this.inboxConversationUnsub = null;
        }
    }

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
    }

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
    }

    async updateInboxBadge() {
        if (!window.Inbox || !this.state.profile || !this.ui.inboxUnreadBadge) return;
        const count = await window.Inbox.getTotalUnreadCount(this.state.profile.id);
        if (count > 0) {
            this.ui.inboxUnreadBadge.textContent = count > 99 ? '99+' : String(count);
            this.ui.inboxUnreadBadge.classList.remove('hidden');
        } else {
            this.ui.inboxUnreadBadge.classList.add('hidden');
        }
    }

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
    }

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
    }

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
    }

    startPlacementTest() {
        this.state.mode = 'placement';
        this.state.practiceQueue = this.buildPlacementQueue();
        this.state.practiceIdx = 0;
        this.state.assessmentCorrect = 0;
        this.resetSessionAnswers();
        this.renderLesson();
    }

    buildPlacementQueue() {
        const types = ['multiple_choice', 'translate', 'ordering', 'fill_blank'];
        const difficulties = [1, 1, 1, 2, 2, 2, 2, 3, 3, 3];
        return difficulties.map((d, i) => window.ExerciseGenerator.generateExercise(types[i % types.length], d, null));
    }

    nextPlacementExercise() {
        this.state.practiceIdx++;
        if (this.state.practiceIdx >= this.state.practiceQueue.length) {
            this.finishPlacementTest();
        } else {
            this.renderLesson();
        }
    }

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
    }

    nextAssessmentExercise() {
        this.state.practiceIdx++;
        if (this.state.practiceIdx >= this.state.practiceQueue.length) {
            this.renderCertificateResult();
        } else {
            this.renderLesson();
        }
    }

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
    }

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
        if (newBadges.length && this.ui.hearts) {
            this.ui.hearts.innerText = this.state.hearts;
        }
        if (newBadges.length) {
            // Persist to Supabase right away - some call sites (e.g. checkAnswer()) already
            // ran saveUserProgress() before checkBadges(), so a newly earned badge would
            // otherwise sit unsaved until some unrelated later save.
            this.state.stats.earnedBadges = this.badgeTracker.earned;
            this.saveUserProgress();
        }
    }

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
    }

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
    }

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
    }

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
    }

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
        if (this.ui.hearts) this.ui.hearts.innerText = this.state.hearts;
        this.saveUserProgress();
        const lastSender = gifts[gifts.length - 1].from_username;
        const label = gifts.length > 1
            ? `🎁 Bạn nhận được ${totalGained} tim từ bạn bè!`
            : `🎁 Bạn nhận được 1 tim từ ${this.escapeHtml(lastSender)}!`;
        this.showHeartGiftToast(label);
    }

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
    }

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
        // Lighter than the signup/level-up confetti bursts below - a badge can be earned
        // fairly often, so a smaller/quicker burst keeps it celebratory without becoming
        // visual noise on every lesson.
        if (window.confetti) {
            confetti({ particleCount: 60, spread: 55, origin: { y: 0.3 } });
        }
    }

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
    }

    updateAvatarDisplay() {
        if (!this.ui.userBadgeAvatar) return;
        this.ui.userBadgeAvatar.innerHTML = this.state.avatarUrl
            ? `<img src="${this.state.avatarUrl}" alt="avatar">`
            : '🙂';
        this.updateRankBadge();
    }

    // Small rank-tier icon overlaid on the avatar corner, like a rank emblem on a
    // profile picture in a competitive game - recomputed from xp every time (see
    // getRankInfo()'s comment on why rank is never stored, only derived).
    updateRankBadge() {
        if (!this.ui.userBadgeRank) return;
        const rankInfo = getRankInfo(this.state.xp);
        this.ui.userBadgeRank.innerText = rankInfo.rankIcon;
        this.ui.userBadgeRank.title = rankInfo.label;
    }

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
    }

    renderAccountSettings() {
        if (!this.state.currentUser) {
            alert("Vui lòng đăng nhập trước khi vào cài đặt tài khoản!");
            return;
        }
        const avatarPreviewHtml = this.state.avatarUrl
            ? `<img src="${this.state.avatarUrl}" alt="avatar">`
            : '🙂';

        const badges = this.badgeTracker
            ? this.badgeTracker.getAllBadgesWithStatus()
            : BADGE_DEFINITIONS.map(b => ({ ...b, earned: false }));
        const earnedBadges = badges.filter(b => b.earned);
        const badgePreviewHtml = earnedBadges.length
            ? earnedBadges.slice(0, 6).map(b => `<span class="settings-badge-chip" title="${this.escapeHtml(b.name)}">${b.icon}</span>`).join('')
            : `<p class="settings-empty-note">Chưa có huy hiệu nào - hoàn thành bài học để mở khóa nhé!</p>`;

        const certificates = this.state.stats.certificates || [];
        const certPreview = certificates.length
            ? `<p class="settings-summary-line">Gần nhất: <strong>${certificates[certificates.length - 1].score}% — ${this.escapeHtml(certificates[certificates.length - 1].level)}</strong></p>`
            : `<p class="settings-empty-note">Chưa có chứng chỉ nào - vượt qua bài kiểm tra đánh giá (≥70%) để nhận chứng chỉ đầu tiên!</p>`;

        const rankInfo = getRankInfo(this.state.xp);
        const nextTier = RANK_TIERS[Math.min(RANK_TIERS.length - 1, rankInfo.rankIndex + 1)];
        const isMaxRank = rankInfo.rankIndex === RANK_TIERS.length - 1;
        const levelProgressPct = Math.round((rankInfo.xpIntoLevel / rankInfo.xpForNextLevel) * 100);

        this.ui.container.innerHTML = `
            <div class="welcome-screen settings-screen">
                <h1 style="text-align:center;">Cài đặt tài khoản</h1>

                <div class="settings-card">
                    <h2>Ảnh đại diện</h2>
                    <div class="settings-avatar-row">
                        <div class="settings-avatar-preview" id="settings-avatar-preview">${avatarPreviewHtml}</div>
                        <div>
                            <input type="file" id="avatar-file-input" accept="image/png,image/jpeg,image/webp" style="display:none;">
                            <button class="btn-secondary" id="avatar-upload-btn" style="padding:10px 18px;">Đổi ảnh đại diện</button>
                            <p id="avatar-upload-status" class="settings-status"></p>
                        </div>
                    </div>
                </div>

                <div class="settings-card">
                    <h2>${rankInfo.rankIcon} Danh hiệu: ${this.escapeHtml(rankInfo.rankName)}</h2>
                    <p class="settings-summary-line">Cấp ${rankInfo.level} (bậc ${rankInfo.levelInRank}/${LEVELS_PER_RANK} trong danh hiệu này) · Tổng ${this.state.xp} XP</p>
                    <div class="rank-progress-track"><div class="rank-progress-fill" style="width:${levelProgressPct}%;"></div></div>
                    <p class="settings-empty-note">${rankInfo.xpIntoLevel}/${rankInfo.xpForNextLevel} XP đến Cấp ${rankInfo.level + 1}${isMaxRank ? '' : ` · Đạt danh hiệu ${nextTier.icon} ${this.escapeHtml(nextTier.name)} ở Cấp ${(rankInfo.rankIndex + 1) * LEVELS_PER_RANK + 1}`}</p>
                </div>

                <div class="settings-card">
                    <h2>🏅 Thành tích của tôi</h2>
                    <p class="settings-summary-line">${earnedBadges.length}/${badges.length} huy hiệu đã đạt được</p>
                    <div class="settings-badge-row">${badgePreviewHtml}</div>
                    <button class="btn-secondary settings-link-btn" id="settings-view-achievements">Xem tất cả thành tích</button>
                </div>

                <div class="settings-card">
                    <h2>🎖️ Chứng chỉ của tôi</h2>
                    <p class="settings-summary-line">${certificates.length} chứng chỉ đã đạt được</p>
                    ${certPreview}
                    <button class="btn-secondary settings-link-btn" id="settings-view-certificates">Xem chứng chỉ</button>
                </div>

                <div class="settings-card">
                    <h2>👤 Tên hiển thị</h2>
                    <input type="text" id="rename-input" class="input-field" maxlength="20" value="${this.escapeHtml(this.state.currentUser)}" placeholder="Tên hiển thị mới (3-20 ký tự)">
                    <p id="rename-status" class="settings-status"></p>
                    <button class="btn-primary" id="rename-btn" style="padding:12px 24px;">ĐỔI TÊN</button>
                </div>

                <div class="settings-card">
                    <h2>Đổi mật khẩu</h2>
                    <input type="password" id="new-password-input" class="input-field" placeholder="Mật khẩu mới (ít nhất 6 ký tự)" style="margin-bottom:10px;">
                    <input type="password" id="confirm-password-input" class="input-field" placeholder="Nhập lại mật khẩu mới">
                    <p id="password-change-status" class="settings-status"></p>
                    <button class="btn-primary" id="change-password-btn" style="padding:12px 24px;">ĐỔI MẬT KHẨU</button>
                </div>

                <div class="settings-card settings-danger-card">
                    <h2>⚠️ Xóa tài khoản</h2>
                    <p class="settings-empty-note">Xóa vĩnh viễn tài khoản cùng toàn bộ tiến trình học, XP, huy hiệu và tin nhắn. Hành động này KHÔNG THỂ hoàn tác.</p>
                    <input type="text" id="delete-account-confirm-input" class="input-field" placeholder='Gõ chính xác tên "${this.escapeHtml(this.state.currentUser)}" để xác nhận'>
                    <p id="delete-account-status" class="settings-status"></p>
                    <button class="btn-secondary settings-delete-account-btn" id="delete-account-btn">XÓA TÀI KHOẢN CỦA TÔI</button>
                </div>

                <button class="btn-secondary" id="settings-back-btn" style="display:block; margin:20px auto 10px; padding:14px 28px;">QUAY LẠI</button>
                <button class="btn-secondary settings-signout-btn" id="settings-signout-btn">🚪 Đăng xuất</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');

        document.getElementById('settings-back-btn').addEventListener('click', () => {
            this.state.mode = 'curriculum';
            this.renderHomeDashboard();
        });
        document.getElementById('settings-signout-btn').addEventListener('click', () => this.handleSignOut());
        document.getElementById('settings-view-achievements').addEventListener('click', () => this.renderAchievements());
        document.getElementById('settings-view-certificates').addEventListener('click', () => this.renderCertificateHistory());

        const fileInput = document.getElementById('avatar-file-input');
        document.getElementById('avatar-upload-btn').addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (file) this.handleAvatarUpload(file);
        });

        document.getElementById('change-password-btn').addEventListener('click', () => this.handleChangePassword());
        document.getElementById('rename-btn').addEventListener('click', () => this.handleRename());
        document.getElementById('delete-account-btn').addEventListener('click', () => this.handleDeleteAccount());
    }

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

    handleDeleteAccount() {
        const statusEl = document.getElementById('delete-account-status');
        const typed = document.getElementById('delete-account-confirm-input').value.trim();
        if (typed !== this.state.currentUser) {
            statusEl.style.color = 'var(--duo-red)';
            statusEl.innerText = `Vui lòng gõ chính xác tên "${this.state.currentUser}" để xác nhận xóa.`;
            return;
        }
        this.showConfirmDialog('Bạn CHẮC CHẮN muốn xóa vĩnh viễn tài khoản? Toàn bộ dữ liệu sẽ mất và không thể khôi phục. Tin nhắn, kết bạn và lịch sử thách đấu giữa bạn và người khác cũng sẽ biến mất ở cả hai phía.', async () => {
            statusEl.style.color = 'var(--duo-dark-grey)';
            statusEl.innerText = 'Đang xóa tài khoản...';
            const result = await window.AuthService.deleteOwnAccount();
            if (result.error) {
                statusEl.style.color = 'var(--duo-red)';
                statusEl.innerText = /delete_own_account/.test(result.error)
                    ? 'Tính năng xóa tài khoản chưa sẵn sàng - quản trị viên cần chạy migration "self_service_inbox_vibrancy.sql" trên Supabase.'
                    : `Xóa tài khoản thất bại: ${result.error}`;
                return;
            }
            if (this.state.profile) {
                localStorage.removeItem(`duo_position_${this.state.profile.id}`);
            }
            alert('Tài khoản của bạn đã được xóa. Tạm biệt và hẹn gặp lại!');
            if (window.AuthService) await window.AuthService.signOut();
            location.reload();
        }, { okLabel: 'XÓA VĨNH VIỄN' });
    }

    async handleAvatarUpload(file) {
        const statusEl = document.getElementById('avatar-upload-status');
        const MAX_BYTES = 2 * 1024 * 1024;
        if (!file.type.startsWith('image/')) {
            statusEl.style.color = 'var(--duo-red)';
            statusEl.innerText = 'Vui lòng chọn 1 tệp hình ảnh.';
            return;
        }
        if (file.size > MAX_BYTES) {
            statusEl.style.color = 'var(--duo-red)';
            statusEl.innerText = 'Ảnh quá lớn, vui lòng chọn ảnh dưới 2MB.';
            return;
        }
        statusEl.style.color = 'var(--duo-dark-grey)';
        statusEl.innerText = 'Đang tải ảnh lên...';

        const result = await window.AuthService.uploadAvatar(this.state.profile.id, file);
        if (result.error) {
            statusEl.style.color = 'var(--duo-red)';
            statusEl.innerText = `Tải ảnh thất bại: ${result.error}. Bảng lưu trữ "avatars" có thể chưa được tạo trên Supabase.`;
            return;
        }

        this.state.avatarUrl = result.url;
        this.updateAvatarDisplay();
        const preview = document.getElementById('settings-avatar-preview');
        if (preview) preview.innerHTML = `<img src="${result.url}" alt="avatar">`;
        await window.AuthService.updateProfile(this.state.profile.id, { avatar_url: result.url });
        statusEl.style.color = 'var(--duo-green)';
        statusEl.innerText = 'Đã cập nhật ảnh đại diện!';
    }

    async handleChangePassword() {
        const statusEl = document.getElementById('password-change-status');
        const newPw = document.getElementById('new-password-input').value;
        const confirmPw = document.getElementById('confirm-password-input').value;

        if (newPw.length < 6) {
            statusEl.style.color = 'var(--duo-red)';
            statusEl.innerText = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
            return;
        }
        if (newPw !== confirmPw) {
            statusEl.style.color = 'var(--duo-red)';
            statusEl.innerText = 'Hai mật khẩu không khớp nhau.';
            return;
        }

        statusEl.style.color = 'var(--duo-dark-grey)';
        statusEl.innerText = 'Đang cập nhật...';
        const result = await window.AuthService.updatePassword(newPw);
        if (result.error) {
            statusEl.style.color = 'var(--duo-red)';
            statusEl.innerText = `Đổi mật khẩu thất bại: ${result.error}`;
            return;
        }
        statusEl.style.color = 'var(--duo-green)';
        statusEl.innerText = 'Đổi mật khẩu thành công!';
        document.getElementById('new-password-input').value = '';
        document.getElementById('confirm-password-input').value = '';
    }

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

    async renderAdminDashboard() {
        if (!this.state.isAdmin) {
            this.returnToApp();
            return;
        }
        this.ui.container.innerHTML = `
            <div class="admin-screen">
                <h2 style="text-align: center;">👑 Quản trị hệ thống</h2>
                <div id="admin-summary" class="admin-summary"><p style="text-align: center; color: #777;">Đang tải...</p></div>
                <div class="admin-controls">
                    <input type="text" id="admin-search" class="input-field admin-search-input" placeholder="Tìm theo tên hoặc email...">
                    <select id="admin-sort" class="input-field admin-sort-select">
                        <option value="created_desc">Mới tham gia nhất</option>
                        <option value="xp_desc">XP cao nhất</option>
                        <option value="streak_desc">Streak cao nhất</option>
                        <option value="teddy_desc">Nhiều gấu bông nhất</option>
                        <option value="name_asc">Tên A-Z</option>
                    </select>
                </div>
                <div id="admin-list"><p style="text-align: center; color: #777;">Đang tải...</p></div>

                <h3 style="text-align: center; margin-top: 30px;">🏆 Quản lý Bảng Xếp Hạng &amp; Vinh Danh</h3>
                <div class="admin-controls" style="justify-content: center;">
                    <button class="btn-secondary admin-action-danger" id="admin-reset-leaderboard">🔄 Xóa Bảng Xếp Hạng</button>
                    <button class="btn-secondary admin-action-danger" id="admin-clear-hof">🧸 Xóa Toàn Bộ Vinh Danh</button>
                </div>
                <div id="admin-hof-list"><p style="text-align: center; color: #777;">Đang tải...</p></div>

                <h3 style="text-align: center; margin-top: 30px;">🏰 Quản lý Group</h3>
                <div class="admin-controls" style="justify-content: center;">
                    <button class="btn-secondary" id="admin-manage-groups">🏰 Xem tất cả Group</button>
                </div>

                <button class="btn-secondary" id="admin-close" style="margin-top: 20px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('admin-close').addEventListener('click', () => this.renderHomeDashboard());

        const allProfiles = await window.AuthService.listAllProfiles();
        this.renderAdminSummary(allProfiles);

        const searchInput = document.getElementById('admin-search');
        const sortSelect = document.getElementById('admin-sort');
        const rerender = () => this.renderAdminList(allProfiles, searchInput.value, sortSelect.value);
        searchInput.addEventListener('input', rerender);
        sortSelect.addEventListener('change', rerender);
        rerender();

        document.getElementById('admin-reset-leaderboard').addEventListener('click', async () => {
            // Leaderboard now ranks by cumulative XP (never reset), so clearing these
            // rows is mostly cosmetic - every user's real total XP re-populates the
            // table again the moment they finish their next lesson or duel.
            const ok = confirm('Xóa toàn bộ danh sách bảng xếp hạng? Lưu ý: XP thật của người dùng không đổi, bảng sẽ tự điền lại ngay khi họ hoàn thành bài học hoặc thi đấu tiếp theo.');
            if (!ok) return;
            await window.Leaderboard.resetLeaderboard();
            this.renderAdminDashboard();
        });
        document.getElementById('admin-clear-hof').addEventListener('click', async () => {
            const ok = confirm('Xóa TOÀN BỘ dữ liệu vinh danh (gấu bông tuần)? Số gấu bông tương ứng của mỗi user cũng sẽ bị trừ lại. Không thể hoàn tác.');
            if (!ok) return;
            await window.Leaderboard.clearHallOfFame();
            this.renderAdminDashboard();
        });
        document.getElementById('admin-manage-groups').addEventListener('click', () => this.renderAdminGroupsList());

        await this.renderAdminHallOfFame();
    }

    async renderAdminHallOfFame() {
        const hofListEl = document.getElementById('admin-hof-list');
        if (!hofListEl || !window.Leaderboard) return;
        const entries = await window.Leaderboard.getHallOfFame(50);
        if (!entries.length) {
            hofListEl.innerHTML = `<p style="text-align: center; color: #777;">Chưa có dữ liệu vinh danh.</p>`;
            return;
        }
        hofListEl.innerHTML = `<div class="admin-table">` + entries.map(h => `
            <div class="admin-row">
                <div class="admin-row-main">
                    <strong>🧸 ${this.escapeHtml(h.username)}</strong>
                    <div class="admin-row-meta">${this.escapeHtml(window.Leaderboard.formatWeekLabel(h.week_id))} · ${h.weekly_xp} XP</div>
                </div>
                <div class="admin-row-actions">
                    <button class="btn-secondary admin-action-btn admin-action-danger" data-action="delete-hof" data-week="${this.escapeHtml(h.week_id)}">Xóa</button>
                </div>
            </div>
        `).join('') + `</div>`;

        hofListEl.querySelectorAll('.admin-action-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const ok = confirm('Xóa dòng vinh danh này? Gấu bông tương ứng của user sẽ bị trừ lại 1.');
                if (!ok) return;
                btn.disabled = true;
                await window.Leaderboard.deleteHallOfFameEntry(btn.dataset.week);
                this.renderAdminDashboard();
            });
        });
    }

    renderAdminSummary(profiles) {
        const el = document.getElementById('admin-summary');
        if (!el) return;

        const totalUsers = profiles.length;
        const totalXp = profiles.reduce((sum, p) => sum + (p.xp || 0), 0);
        const totalBears = profiles.reduce((sum, p) => sum + (p.teddy_bears || 0), 0);
        const oneWeekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const activeThisWeek = profiles.filter(p => {
            if (!p.last_activity_date) return false;
            const t = new Date(p.last_activity_date).getTime();
            return !isNaN(t) && t >= oneWeekAgoMs;
        }).length;

        el.innerHTML = `
            <div class="admin-stat-grid">
                <div class="admin-stat-card">
                    <div class="admin-stat-value">${totalUsers}</div>
                    <div class="admin-stat-label">Tổng người dùng</div>
                </div>
                <div class="admin-stat-card">
                    <div class="admin-stat-value">${totalXp}</div>
                    <div class="admin-stat-label">Tổng XP hệ thống</div>
                </div>
                <div class="admin-stat-card">
                    <div class="admin-stat-value">${activeThisWeek}</div>
                    <div class="admin-stat-label">Hoạt động tuần này</div>
                </div>
                <div class="admin-stat-card">
                    <div class="admin-stat-value">🧸 ${totalBears}</div>
                    <div class="admin-stat-label">Tổng gấu bông</div>
                </div>
            </div>
        `;
    }

    renderAdminList(allProfiles, searchTerm, sortKey) {
        const listEl = document.getElementById('admin-list');
        if (!listEl) return;

        let filtered = allProfiles;
        const term = (searchTerm || '').trim().toLowerCase();
        if (term) {
            filtered = filtered.filter(p =>
                (p.username || '').toLowerCase().includes(term) ||
                (p.email || '').toLowerCase().includes(term)
            );
        }

        const sorters = {
            created_desc: (a, b) => new Date(b.created_at) - new Date(a.created_at),
            xp_desc: (a, b) => (b.xp || 0) - (a.xp || 0),
            streak_desc: (a, b) => (b.streak || 0) - (a.streak || 0),
            teddy_desc: (a, b) => (b.teddy_bears || 0) - (a.teddy_bears || 0),
            name_asc: (a, b) => (a.username || '').localeCompare(b.username || '')
        };
        filtered = filtered.slice().sort(sorters[sortKey] || sorters.created_desc);

        if (!filtered.length) {
            listEl.innerHTML = `<p style="text-align: center; color: #777;">Không tìm thấy người dùng nào.</p>`;
            return;
        }

        listEl.innerHTML = `<div class="admin-table">` + filtered.map(p => {
            const isSelf = this.state.profile && p.id === this.state.profile.id;
            return `
            <div class="admin-row ${p.banned ? 'admin-row-banned' : ''}">
                <div class="admin-row-main">
                    <strong>${this.escapeHtml(p.username)}</strong>
                    ${p.role === 'admin' ? '<span class="admin-badge-tag">👑 Admin</span>' : ''}
                    ${p.banned ? '<span class="admin-badge-tag admin-badge-banned">🚫 Đã khóa</span>' : ''}
                    ${isSelf ? '<span class="admin-badge-tag">Bạn</span>' : ''}
                    <div class="admin-row-meta">${this.escapeHtml(p.email || '(không có email)')}</div>
                    <div class="admin-row-meta">XP: ${p.xp || 0} · Streak: ${p.streak || 0} · Tim: ${p.hearts != null ? p.hearts : 0} · 🧸 ${p.teddy_bears || 0} · Tham gia: ${new Date(p.created_at).toLocaleDateString('vi-VN')}</div>
                </div>
                <div class="admin-row-actions">
                    <button class="btn-secondary admin-action-btn" data-action="reset-hearts" data-id="${p.id}">Reset tim &amp; streak</button>
                    <button class="btn-secondary admin-action-btn" data-action="reset-progress" data-id="${p.id}">Reset tiến trình</button>
                    ${isSelf ? '' : `<button class="btn-secondary admin-action-btn" data-action="toggle-role" data-id="${p.id}" data-role="${p.role}">${p.role === 'admin' ? 'Giáng xuống User' : 'Thăng lên Admin'}</button>`}
                    ${isSelf ? '' : `<button class="btn-secondary admin-action-btn ${p.banned ? '' : 'admin-action-danger'}" data-action="toggle-ban" data-id="${p.id}" data-banned="${p.banned}">${p.banned ? 'Mở khóa' : 'Khóa tài khoản'}</button>`}
                    ${isSelf ? '' : `<button class="btn-secondary admin-action-btn admin-action-danger" data-action="delete-user" data-id="${p.id}">Xóa tài khoản</button>`}
                </div>
            </div>
        `;
        }).join('') + `</div>`;

        listEl.querySelectorAll('.admin-action-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleAdminAction(btn));
        });
    }

    async handleAdminAction(btn) {
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === 'reset-hearts') {
            btn.disabled = true;
            await window.AuthService.updateProfile(id, { hearts: MAX_HEARTS, streak: 0 });
            this.renderAdminDashboard();
            return;
        }

        if (action === 'reset-progress') {
            const ok = confirm('Bạn chắc chắn muốn reset TOÀN BỘ tiến trình của người dùng này (XP, streak, tim)? Không thể hoàn tác.');
            if (!ok) return;
            btn.disabled = true;
            await window.AuthService.updateProfile(id, { xp: 0, weekly_xp: 0, streak: 0, hearts: MAX_HEARTS, stats: {} });
            this.renderAdminDashboard();
            return;
        }

        if (action === 'toggle-role') {
            const newRole = btn.dataset.role === 'admin' ? 'user' : 'admin';
            const ok = confirm(newRole === 'admin' ? 'Thăng người dùng này lên quyền Admin?' : 'Giáng người dùng này xuống quyền User thường?');
            if (!ok) return;
            btn.disabled = true;
            await window.AuthService.updateProfile(id, { role: newRole });
            this.renderAdminDashboard();
            return;
        }

        if (action === 'toggle-ban') {
            const newBanned = btn.dataset.banned !== 'true';
            const ok = confirm(newBanned ? 'Khóa tài khoản này? Người dùng sẽ không thể đăng nhập được nữa.' : 'Mở khóa tài khoản này?');
            if (!ok) return;
            btn.disabled = true;
            await window.AuthService.updateProfile(id, { banned: newBanned });
            this.renderAdminDashboard();
            return;
        }

        if (action === 'delete-user') {
            const ok = confirm('XÓA VĨNH VIỄN hồ sơ này? Toàn bộ XP, streak, gấu bông, tiến trình sẽ mất, không thể hoàn tác.\n\nLưu ý: tài khoản đăng nhập (email/mật khẩu) vẫn còn tồn tại trên hệ thống xác thực — nếu họ đăng nhập lại, một hồ sơ mới trắng sẽ được tạo. Muốn chặn hẳn, dùng "Khóa tài khoản" hoặc xóa tay trong Supabase Dashboard.');
            if (!ok) return;
            btn.disabled = true;
            await window.AuthService.deleteProfile(id);
            this.renderAdminDashboard();
            return;
        }
    }

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
    }

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
    }

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
    }

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
}

const app = new DuoClone();
