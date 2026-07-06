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
            achievementsBtn: document.getElementById('achievements-btn'),
            adminBtn: document.getElementById('admin-btn')
        };

        this.init();
        this.startEnergyRegeneration();
        this.resumeSession();
    }

    init() {
        if (!this.state.courseData) {
            this.ui.container.innerHTML = "<h1 style='color:red'>Lỗi load dữ liệu.</h1>";
            return;
        }

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
        const session = await window.AuthService.getSession();
        if (session && session.user) {
            await this.completeLogin(session.user);
        }
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
                    <input type="password" id="password-input" placeholder="Mật khẩu (ít nhất 6 ký tự)..." class="input-field" style="padding: 15px; border: 2px solid #e5e5e5; border-radius: 12px; text-align: center;">
                    <p id="auth-error" style="color: var(--duo-red); text-align: center; font-size: 14px; min-height: 18px; margin: 0;"></p>
                    <button id="login-btn" class="btn-primary" style="padding: 15px; background-color: #58cc02; color: white; border: none; border-radius: 12px; font-weight: 800; cursor: pointer;">ĐĂNG NHẬP</button>
                    <button id="auth-toggle-btn" style="padding: 12px; border-radius: 12px; font-weight: 700; cursor: pointer; background: white; border: 2px solid #e5e5e5; color: #777;">Chưa có tài khoản? Đăng ký</button>
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
            await this.completeLogin(result.user, username);
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

    async completeLogin(user, fallbackUsername) {
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
        // Clamp to MAX_HEARTS on load, not just when awarding - existing accounts from
        // before the 20 -> 10 max-hearts change may still have a stored value above the
        // new cap until this runs once.
        this.state.hearts = Math.min(MAX_HEARTS, typeof profile.hearts === 'number' ? profile.hearts : MAX_HEARTS);
        this.state.xp = profile.xp || 0;
        this.state.weeklyXp = profile.weekly_xp || 0;
        this.state.streak = profile.streak || 0;
        this.state.lastActivityDate = profile.last_activity_date || null;
        this.state.lastWeekId = profile.last_week_id || null;
        this.state.teddyBears = profile.teddy_bears || 0;
        this.state.stats = Object.assign({ ...DEFAULT_STATS }, profile.stats || {});
        this.state.avatarUrl = profile.avatar_url || null;

        if (this.ui.userBadgeName) this.ui.userBadgeName.innerText = this.state.currentUser;
        this.updateAvatarDisplay();
        if (this.ui.adminBtn) {
            this.ui.adminBtn.style.display = this.state.isAdmin ? 'flex' : 'none';
        }

        if (typeof ErrorTracker !== 'undefined') {
            this.errorTracker = new ErrorTracker(profile.id);
        }
        if (typeof BadgeTracker !== 'undefined') {
            this.badgeTracker = new BadgeTracker(profile.id);
            this.badgeTracker.hydrateFromRemote(this.state.stats.earnedBadges || {});
        }

        this.loadLocalPosition(profile.id);
        this.checkWeeklyReset();
        this.setupDuelInviteWatcher();

        const neverPlaced = !this.state.stats.placementLevel;
        const noProgressYet = this.state.xp === 0 && this.state.currentUnitIdx === 0 && this.state.currentLessonIdx === 0 && this.state.currentExIdx === 0;
        if (neverPlaced && noProgressYet && window.ExerciseGenerator) {
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
            window.AuthService.updateProfile(this.state.profile.id, {
                hearts: this.state.hearts,
                xp: this.state.xp,
                weekly_xp: this.state.weeklyXp,
                streak: this.state.streak,
                last_activity_date: this.state.lastActivityDate,
                last_week_id: this.state.lastWeekId,
                stats: this.state.stats
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
        this.state.mode = 'curriculum';
        this.updateNav();
        const unit = this.state.courseData.units[this.state.currentUnitIdx];
        const lesson = unit ? unit.lessons[this.state.currentLessonIdx] : null;

        this.ui.container.innerHTML = `
            <div class="home-dashboard">
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
        // lessons + the current one + a single upcoming preview - the rest stay hidden
        // behind a fog teaser rather than dumping every remaining locked node on screen
        // at once. Each completed lesson pushes the fog boundary one node further,
        // so the visible map literally grows as the player advances.
        const visibleCount = isPastUnit
            ? unit.lessons.length
            : Math.min(this.state.currentLessonIdx + 2, unit.lessons.length);
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
            if (resultEl) resultEl.innerText = `Bạn nói: "${transcript}"`;
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

    normalizeSpeech(text) {
        return (text || '')
            .toLowerCase()
            .replace(/[^\w\s']/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    comparePronunciation(spoken, target) {
        const a = this.normalizeSpeech(spoken);
        const b = this.normalizeSpeech(target);
        if (!a) return false;
        if (a === b) return true;
        const aWords = a.split(' ');
        const bWords = b.split(' ');
        const matches = bWords.filter(w => aWords.includes(w)).length;
        return matches / bWords.length >= 0.8;
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

    // Deliberately does NOT reuse closeModal()'s per-mode branching: that branching
    // decides whether to advance at all based on correctness (e.g. practice mode
    // re-renders the SAME exercise on a wrong answer so the user must retry it) - a skip
    // must always move forward regardless of mode, which is the opposite of that
    // behavior. Costs XP, not a heart, and not offered in duel mode (button is hidden
    // there - see renderLesson()).
    skipCurrentExercise() {
        if (this.state.mode === 'duel') return;
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
        if (!confirm(confirmMsg)) return;

        const rankBefore = getRankInfo(this.state.xp).rankIndex;
        this.state.xp = Math.max(0, this.state.xp - SKIP_XP_PENALTY);
        this.ui.xp.innerText = this.state.xp;
        this.checkRankDemotion(rankBefore);

        const ex = this.getCurrentExercise();
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
            if (isLastBeforeLessonComplete) {
                this.state.reviewQueue.shift();
                this.state.reviewMode = false;
                this.finishLessonCompletion(true);
                return;
            }
            // send to the back of the queue for a later retry, same as a wrong answer during review
            this.state.reviewQueue.push(this.state.reviewQueue.shift());
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
        if (!skippedReward) {
            if (window.confetti) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
            alert("Chúc mừng! Bạn đã hoàn thành bài học!");
            if (this.state.stats.lessonWrongCount === 0) {
                this.state.stats.perfectLessons++;
            }
        } else {
            alert("Bạn đã bỏ qua câu điều kiện của bài học nên không nhận được điểm thưởng lần này. Cố gắng hơn ở bài tiếp theo nhé!");
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

        if (this.state.currentUnitIdx >= this.state.courseData.units.length) {
            this.renderCourseComplete();
        } else {
            this.renderLesson();
        }
    }

    awardLessonCompletion() {
        const settings = this.state.courseData.settings || {};
        const xpGain = settings.xp_per_lesson || 0;
        const streakBonus = settings.streak_bonus || 0;
        const streakExtended = this.updateStreak();
        const totalGain = xpGain + (streakExtended ? streakBonus : 0);

        this.state.xp += totalGain;
        // weeklyXp is no longer independently tracked/reset - it's kept as a mirror of
        // the same cumulative xp purely so the admin dashboard's "XP tuần" column (which
        // reads profiles.weekly_xp) doesn't show a stale, confusing number now that the
        // leaderboard itself ranks by total xp (see syncLeaderboardScore()).
        this.state.weeklyXp = this.state.xp;
        this.ui.xp.innerText = this.state.xp;
        this.ui.streak.innerText = this.state.streak;
        this.syncLeaderboardScore();
    }

    // Ranks by cumulative xp, not a resetting weekly counter - a leader nobody catches
    // up to simply keeps winning the Saturday prize, which is intended now (see
    // checkWeeklyReset()'s comment for the full reasoning).
    syncLeaderboardScore() {
        if (window.Leaderboard && this.state.currentUser) {
            window.Leaderboard.submitScore(this.state.currentUser, this.state.xp, this.state.streak);
            window.Leaderboard.checkAndAwardWeeklyPrize().then(() => this.refreshTeddyBears());
        }
    }

    async refreshTeddyBears() {
        if (!window.AuthService || !this.state.profile) return;
        const fresh = await window.AuthService.getProfile(this.state.profile.id);
        if (fresh && typeof fresh.teddy_bears === 'number' && fresh.teddy_bears !== this.state.teddyBears) {
            this.state.teddyBears = fresh.teddy_bears;
            this.checkBadges();
        }
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

    async renderLeaderboard() {
        if (!this.state.currentUser) {
            alert("Vui lòng đăng nhập trước khi xem bảng xếp hạng!");
            return;
        }
        this.ui.container.innerHTML = `
            <div class="leaderboard-screen">
                <h2 style="text-align: center;">🏆 Bảng Xếp Hạng Tuần Này</h2>
                <p style="text-align: center; color: #777;">Đang tải...</p>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');

        let result = { configured: false, entries: [] };
        if (window.Leaderboard) {
            result = await window.Leaderboard.fetchTop(50);
        }

        let bodyHtml;
        if (!result.configured) {
            bodyHtml = `<p style="text-align: center; color: #777;">Bảng xếp hạng đang được thiết lập, quay lại sau nhé!</p>`;
        } else if (result.error) {
            bodyHtml = `<p style="text-align: center; color: #777;">Không thể tải bảng xếp hạng lúc này. Vui lòng thử lại sau.</p>`;
        } else if (!result.entries.length) {
            bodyHtml = `<p style="text-align: center; color: #777;">Chưa có ai trên bảng xếp hạng. Hãy là người đầu tiên!</p>`;
        } else {
            bodyHtml = `<div class="leaderboard-list">` + result.entries.map((entry, idx) => {
                const rank = idx + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                const isMe = entry.username === this.state.currentUser;
                return `<div class="leaderboard-row ${isMe ? 'me' : ''}">
                            <span class="lb-rank">${medal}</span>
                            <span class="lb-name">${entry.username}</span>
                            <span class="lb-streak">🔥 ${entry.streak || 0}</span>
                            <span class="lb-xp">⭐ ${entry.xp || 0} XP</span>
                        </div>`;
            }).join('') + `</div>`;
        }

        this.ui.container.innerHTML = `
            <div class="leaderboard-screen">
                <h2 style="text-align: center;">🏆 Bảng Xếp Hạng</h2>
                ${bodyHtml}
                <p style="text-align: center; color: #999; font-size: 13px; margin-top: 15px;">🧸 Người dẫn đầu lúc 19h thứ Bảy sẽ được tặng gấu bông! Điểm không bị reset - nếu không ai vượt qua, người dẫn đầu vẫn tiếp tục được thưởng vào tuần sau.</p>
                <button class="btn-primary" style="margin-top: 10px;" onclick="app.closeLeaderboard()">QUAY LẠI</button>
            </div>
        `;
    }

    closeLeaderboard() {
        this.returnToApp();
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
                    <button class="btn-primary game-pick-btn" id="pick-word-match">⚡ Ghép Từ Nhanh</button>
                    <button class="btn-primary game-pick-btn" id="pick-memory">🧠 Lật Thẻ Nhớ Từ</button>
                    <button class="btn-primary game-pick-btn" id="pick-odd-one-out">🔎 Từ Lạc Loài</button>
                    <button class="btn-primary game-pick-btn" id="pick-reflex">⚡ Phản Xạ Từ Vựng</button>
                    <button class="btn-primary game-pick-btn" id="pick-picture-word">🖼️ Nhìn Hình Chọn Từ</button>
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
        document.getElementById('game-picker-close').addEventListener('click', () => this.returnToApp());
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
            this.state.hearts = Math.min(MAX_HEARTS, this.state.hearts + reward);
            const actualGained = this.state.hearts - before;
            this.ui.hearts.innerText = this.state.hearts;
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
        this.renderLesson();
    }

    nextPracticeExercise() {
        this.state.practiceIdx++;
        if (this.state.practiceIdx >= this.state.practiceQueue.length) {
            this.renderPracticeSummary();
        } else {
            this.renderLesson();
        }
    }

    renderPracticeSummary() {
        this.state.stats.practiceSessions++;
        this.checkBadges();
        const stats = this.errorTracker ? this.errorTracker.getStats() : null;
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character mascot-cheer">💪</div>
                <h1 style="text-align: center;">Hoàn thành buổi luyện tập!</h1>
                <p style="text-align: center; color: #777;">Bạn đã luyện ${this.state.practiceQueue.length} câu.</p>
                ${stats ? `<p style="text-align: center; color: #777;">Độ chính xác tổng: ${Math.round(stats.accuracy * 100)}%</p>` : ''}
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
            this.returnToApp();
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
        this.returnToApp();
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
            this.returnToApp();
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
            this.returnToApp();
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
        document.getElementById('ielts-write-back').addEventListener('click', () => this.renderIeltsMenu());
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
        document.getElementById('ielts-speak-back').addEventListener('click', () => this.renderIeltsMenu());
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
                <span class="lb-name">${this.escapeHtml(inv.challenger_username)}</span>
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
                    <span class="lb-name">${this.escapeHtml(e.username)}</span>
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
        document.getElementById('duel-leaderboard-back').addEventListener('click', () => this.renderDuelMenu());
    }

    renderDuelChallengeForm() {
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">⚔️</div>
                <h1 style="text-align: center;">Thách đấu</h1>
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
        document.getElementById('duel-back').addEventListener('click', () => this.renderDuelMenu());
        document.getElementById('duel-send-challenge').addEventListener('click', async () => {
            const target = document.getElementById('duel-target-input').value.trim();
            const errorEl = document.getElementById('duel-challenge-error');
            if (!target) { errorEl.innerText = 'Vui lòng nhập tên người dùng.'; return; }
            const baseDifficulty = this.errorTracker ? this.errorTracker.recommendDifficulty() : 2;
            const difficulty = Math.max(baseDifficulty, getRankInfo(this.state.xp).difficulty);
            const questions = this.buildDuelQuestions(8, difficulty);
            const result = await window.Duel.challengeUser(this.state.profile, target, questions);
            if (result.error) { errorEl.innerText = result.error; return; }
            this.renderDuelWaitingRoom(result.data);
        });
    }

    renderDuelWaitingRoom(duelRow) {
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">⏳</div>
                <h1 style="text-align: center;">Đang chờ ${this.escapeHtml(duelRow.opponent_username)} chấp nhận...</h1>
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
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">⚔️</div>
                <h1 style="text-align: center;">${this.escapeHtml(invite.challenger_username)} đã thách đấu bạn!</h1>
                <p style="text-align: center; color: #777;">Bộ đề gồm ${invite.question_count} câu hỏi. Sẵn sàng chưa?</p>
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
        this.state.duelIdx = isChallenger ? duelRow.challenger_idx : duelRow.opponent_idx;
        this.state.duelCorrect = isChallenger ? duelRow.challenger_correct : duelRow.opponent_correct;
        this.state.duelLastOpponentUpdate = Date.now();
        this.state.duelResultShown = false;

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

        this.renderLesson();
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
                <p style="text-align: center; color: #777;">Bạn trả lời đúng ${this.state.duelCorrect}/${this.state.duelQueue.length} câu.</p>
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

        if (duelRow.status === 'finished') {
            this.renderDuelResult(duelRow);
            return;
        }
        const winnerId = window.Duel.resolveDuelWinner(duelRow);
        await window.Duel.finalizeDuel(duelRow.id, winnerId);
        const finalRow = await window.Duel.getDuel(duelRow.id);
        this.renderDuelResult(finalRow || duelRow);
    }

    renderDuelResult(duelRow) {
        this.cleanupDuelUI();
        const myId = this.state.profile.id;
        const iWon = duelRow.winner_id === myId;
        const isDraw = !duelRow.winner_id;
        const myCorrect = this.state.isDuelChallenger ? duelRow.challenger_correct : duelRow.opponent_correct;
        const oppCorrect = this.state.isDuelChallenger ? duelRow.opponent_correct : duelRow.challenger_correct;
        const oppName = this.state.isDuelChallenger ? duelRow.opponent_username : duelRow.challenger_username;

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

        this.ui.container.innerHTML = `
            <div class="certificate">
                <div class="certificate-badge">${isDraw ? '🤝' : (iWon ? '🏆' : '⚔️')}</div>
                <h2 style="color:${resultColor};">${resultLabel}</h2>
                <p class="certificate-score">Bạn: ${myCorrect} đúng &nbsp;|&nbsp; ${this.escapeHtml(oppName)}: ${oppCorrect} đúng</p>
                ${xpChangeLabel ? `<p style="font-weight:800; color:${xpChangeColor};">${xpChangeLabel}</p>` : ''}
            </div>
            <button class="btn-primary" id="duel-result-done" style="display: block; margin: 20px auto; padding: 15px 30px;">VỀ TRANG CHÍNH</button>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('duel-result-done').addEventListener('click', () => {
            this.state.mode = 'curriculum';
            this.returnToApp();
        });
        this.playTone(iWon ? 'cheer' : (isDraw ? 'correct' : 'cry'));
        this.checkBadges();
        this.saveUserProgress();
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
                <button class="btn-primary" id="cert-done" style="display: block; margin: 20px auto; padding: 15px 30px;">HOÀN TẤT</button>
            `;
        } else {
            this.ui.container.innerHTML = `
                <div class="welcome-screen">
                    <div class="duo-character mascot-cry">📝</div>
                    <h1 style="text-align: center;">Kết quả: ${scorePct}%</h1>
                    <p style="text-align: center; color: #777;">Bạn cần đạt ít nhất 70% để nhận chứng chỉ. Hãy luyện tập thêm rồi thử lại nhé!</p>
                    <button class="btn-primary" id="cert-done" style="display: block; margin: 20px auto; padding: 15px 30px;">VỀ TRANG CHÍNH</button>
                </div>
            `;
        }

        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('cert-done').addEventListener('click', () => {
            this.state.mode = 'curriculum';
            this.returnToApp();
        });

        this.playTone(passed ? 'cheer' : 'cry');
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
            duelWins: this.state.stats.duelWins
        };
        const newBadges = this.badgeTracker.checkAndAward(snapshot);
        newBadges.forEach(b => this.showBadgeToast(b));
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
            <div class="duel-invite-toast-header">⚔️ <strong>${this.escapeHtml(invite.challenger_username)}</strong> đã thách đấu bạn!</div>
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

    showBadgeToast(badge) {
        const toast = document.createElement('div');
        toast.className = 'badge-toast';
        toast.innerHTML = `<span class="badge-toast-icon">${badge.icon}</span><div><strong>Huy hiệu mới!</strong><br>${this.escapeHtml(badge.name)}</div>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3500);
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
                    <h2>Đổi mật khẩu</h2>
                    <input type="password" id="new-password-input" class="input-field" placeholder="Mật khẩu mới (ít nhất 6 ký tự)" style="margin-bottom:10px;">
                    <input type="password" id="confirm-password-input" class="input-field" placeholder="Nhập lại mật khẩu mới">
                    <p id="password-change-status" class="settings-status"></p>
                    <button class="btn-primary" id="change-password-btn" style="padding:12px 24px;">ĐỔI MẬT KHẨU</button>
                </div>

                <button class="btn-secondary" id="settings-back-btn" style="display:block; margin:20px auto 10px; padding:14px 28px;">QUAY LẠI</button>
                <button class="btn-secondary settings-signout-btn" id="settings-signout-btn">🚪 Đăng xuất</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');

        document.getElementById('settings-back-btn').addEventListener('click', () => {
            this.state.mode = 'curriculum';
            this.returnToApp();
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
        document.getElementById('achievements-close').addEventListener('click', () => this.returnToApp());
        document.getElementById('view-certificates').addEventListener('click', () => this.renderCertificateHistory());

        const teddyListEl = document.getElementById('teddy-list');
        if (window.Leaderboard && window.Leaderboard.isConfigured) {
            const winners = await window.Leaderboard.getHallOfFame(10);
            if (teddyListEl) {
                teddyListEl.innerHTML = winners.length ? winners.map(w => `
                    <div class="leaderboard-row">
                        <span class="lb-rank">🧸</span>
                        <span class="lb-name">${this.escapeHtml(w.username)}</span>
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
        document.getElementById('cert-history-close').addEventListener('click', () => this.renderAchievements());
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

                <button class="btn-secondary" id="admin-close" style="margin-top: 20px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('admin-close').addEventListener('click', () => this.returnToApp());

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
}

const app = new DuoClone();
