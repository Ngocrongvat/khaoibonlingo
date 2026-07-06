const BADGE_DEFINITIONS = [
    { id: 'streak_7', name: '7 Ngày Liên Tiếp', icon: '🔥', description: 'Học liên tục 7 ngày', check: (s) => s.streak >= 7 },
    { id: 'streak_30', name: '30 Ngày Liên Tiếp', icon: '🔥', description: 'Học liên tục 30 ngày', check: (s) => s.streak >= 30 },
    { id: 'correct_100', name: '100 Câu Đúng', icon: '💯', description: 'Trả lời đúng 100 câu', check: (s) => s.totalCorrect >= 100 },
    { id: 'correct_500', name: '500 Câu Đúng', icon: '🌟', description: 'Trả lời đúng 500 câu', check: (s) => s.totalCorrect >= 500 },
    { id: 'perfect_lesson', name: 'Bài Học Hoàn Hảo', icon: '✨', description: 'Hoàn thành 1 bài không sai câu nào', check: (s) => s.perfectLessons >= 1 },
    { id: 'pronunciation_master', name: 'Chuyên Gia Phát Âm', icon: '🎤', description: 'Phát âm đúng 20 câu', check: (s) => s.pronunciationCorrect >= 20 },
    { id: 'course_complete', name: 'Hoàn Thành Khóa Học', icon: '🎓', description: 'Hoàn thành toàn bộ khóa học', check: (s) => s.courseCompleted },
    { id: 'practice_10', name: 'Chăm Chỉ Luyện Tập', icon: '🏋️', description: 'Hoàn thành 10 buổi luyện tập', check: (s) => s.practiceSessions >= 10 },
    { id: 'teddy_bears_100', name: 'Triệu Phú Gấu Bông', icon: '🧸', description: 'Tích lũy 100 gấu bông từ giải tuần', check: (s) => s.teddyBears >= 100 },
    { id: 'certified', name: 'Đã Nhận Chứng Chỉ', icon: '🏅', description: 'Vượt qua bài kiểm tra đánh giá', check: (s) => s.assessmentsPassed >= 1 },
    { id: 'duelist_5', name: 'Chiến Binh Tập Sự', icon: '⚔️', description: 'Tham gia 5 trận thách đấu', check: (s) => s.duelsPlayed >= 5 },
    { id: 'duelist_20', name: 'Chiến Binh Dày Dạn', icon: '🗡️', description: 'Tham gia 20 trận thách đấu', check: (s) => s.duelsPlayed >= 20 },
    { id: 'duel_champion_5', name: 'Nhà Vô Địch Đấu Trường', icon: '🏆', description: 'Thắng 5 trận thách đấu', check: (s) => s.duelWins >= 5 },
    { id: 'duel_champion_20', name: 'Huyền Thoại Đấu Trường', icon: '👑', description: 'Thắng 20 trận thách đấu', check: (s) => s.duelWins >= 20 }
];

class BadgeTracker {
    constructor(username) {
        this.username = username;
        this.key = `duo_badges_${username}`;
        this.earned = this.load();
    }

    load() {
        const raw = localStorage.getItem(this.key);
        if (!raw) return {};
        try {
            return JSON.parse(raw);
        } catch (e) {
            return {};
        }
    }

    save() {
        localStorage.setItem(this.key, JSON.stringify(this.earned));
    }

    checkAndAward(stats) {
        const newlyEarned = [];
        BADGE_DEFINITIONS.forEach(b => {
            if (!this.earned[b.id] && b.check(stats)) {
                this.earned[b.id] = Date.now();
                newlyEarned.push(b);
            }
        });
        if (newlyEarned.length) this.save();
        return newlyEarned;
    }

    getAllBadgesWithStatus() {
        return BADGE_DEFINITIONS.map(b => ({ ...b, earned: !!this.earned[b.id], earnedAt: this.earned[b.id] || null }));
    }

    // Merges badges already recorded server-side (profiles.stats.earnedBadges) into the
    // local cache, so achievements earned on one device still show up on another - keeps
    // the earliest timestamp per badge if both sides already have it.
    hydrateFromRemote(remoteEarned) {
        if (!remoteEarned) return;
        let changed = false;
        Object.keys(remoteEarned).forEach(id => {
            const remoteTs = remoteEarned[id];
            if (!this.earned[id] || remoteTs < this.earned[id]) {
                this.earned[id] = remoteTs;
                changed = true;
            }
        });
        if (changed) this.save();
    }
}

window.BadgeTracker = BadgeTracker;
window.BADGE_DEFINITIONS = BADGE_DEFINITIONS;
