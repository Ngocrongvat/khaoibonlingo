const MAX_HEARTS = 10;
const HEART_REGEN_MS = 15 * 60 * 1000;

// Streak milestones and their rewards. Reaching one refills hearts to full and
// grants bonus XP (bigger streaks = bigger reward) with a celebratory overlay.
const STREAK_MILESTONES = {
    3: { xp: 20 },
    7: { xp: 50 },
    14: { xp: 80 },
    30: { xp: 150 },
    50: { xp: 250 },
    100: { xp: 500 },
    200: { xp: 1000 },
    365: { xp: 2000 },
};

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
        <g class="m-arm m-arm-l"><ellipse cx="18" cy="118" rx="15" ry="21" fill="#E8935B" transform="rotate(18 18 118)"/></g>
        <g class="m-arm m-arm-r"><ellipse cx="182" cy="118" rx="15" ry="21" fill="#E8935B" transform="rotate(-18 182 118)"/></g>
    `;
    const armHappy = `
        <g class="m-arm m-arm-l"><ellipse cx="20" cy="65" rx="15" ry="21" fill="#E8935B" transform="rotate(55 20 65)"/></g>
        <g class="m-arm m-arm-r"><ellipse cx="180" cy="65" rx="15" ry="21" fill="#E8935B" transform="rotate(-55 180 65)"/></g>
    `;
    // Both arms thrown straight up in a "yay!" — used by the celebratory moods.
    const armCheer = `
        <g class="m-arm m-arm-l"><ellipse cx="30" cy="45" rx="14" ry="22" fill="#E8935B" transform="rotate(28 30 45)"/></g>
        <g class="m-arm m-arm-r"><ellipse cx="170" cy="45" rx="14" ry="22" fill="#E8935B" transform="rotate(-28 170 45)"/></g>
    `;
    // The standard round eyes (default for idle/happy/sad - unchanged from before).
    const defaultEyes = `
        <ellipse cx="76" cy="95" rx="12" ry="15" fill="white"/>
        <ellipse cx="124" cy="95" rx="12" ry="15" fill="white"/>
        <circle cx="78" cy="99" r="6.5" fill="#3B2A22"/>
        <circle cx="126" cy="99" r="6.5" fill="#3B2A22"/>
        <circle cx="81" cy="94" r="2.2" fill="white"/>
        <circle cx="129" cy="94" r="2.2" fill="white"/>
    `;
    // Big sparkly eyes with a bright glint - reads as "wow / so happy".
    const starEyes = `
        <ellipse cx="76" cy="94" rx="13" ry="16" fill="white"/>
        <ellipse cx="124" cy="94" rx="13" ry="16" fill="white"/>
        <circle cx="77" cy="97" r="8" fill="#3B2A22"/>
        <circle cx="125" cy="97" r="8" fill="#3B2A22"/>
        <circle cx="80" cy="92" r="3.2" fill="white"/>
        <circle cx="128" cy="92" r="3.2" fill="white"/>
        <circle cx="74" cy="100" r="1.8" fill="white"/>
        <circle cx="122" cy="100" r="1.8" fill="white"/>
    `;
    // Heart-shaped eyes for perfect/love moments.
    const heartEyes = `
        <path d="M76,88 C71,82 62,85 62,92 C62,99 76,106 76,106 C76,106 90,99 90,92 C90,85 81,82 76,88 Z" fill="#FF5A79"/>
        <path d="M124,88 C119,82 110,85 110,92 C110,99 124,106 124,106 C124,106 138,99 138,92 C138,85 129,82 124,88 Z" fill="#FF5A79"/>
    `;
    // Happy closed "^_^" eyes for a giggling look.
    const happyArcEyes = `
        <path d="M64,96 Q76,84 88,96" stroke="#3B2A22" stroke-width="5" fill="none" stroke-linecap="round"/>
        <path d="M112,96 Q124,84 136,96" stroke="#3B2A22" stroke-width="5" fill="none" stroke-linecap="round"/>
    `;

    let arms = armIdle;
    let eyebrows = '';
    let eyes = defaultEyes;
    let mouth = `<path d="M82,132 Q100,142 118,132" stroke="#3B2A22" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    const bigOpenMouth = `
        <path d="M72,124 Q100,164 128,124 Q100,146 72,124 Z" fill="#8B4A3A"/>
        <path d="M84,134 Q100,150 116,134 Q100,142 84,134 Z" fill="#FF9EB0"/>
    `;

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
    } else if (mood === 'excited') {
        // Big open grin, star eyes, arms up - the "correct answer / celebrate" face.
        arms = armCheer;
        eyes = starEyes;
        mouth = bigOpenMouth;
    } else if (mood === 'love') {
        // Heart eyes + happy arms - perfect lessons / streak milestones.
        arms = armHappy;
        eyes = heartEyes;
        mouth = `
            <path d="M75,126 Q100,158 125,126 Q100,144 75,126 Z" fill="#8B4A3A"/>
            <path d="M85,136 Q100,144 115,136 Q100,140 85,136 Z" fill="#FF9EB0"/>
        `;
    } else if (mood === 'giggle') {
        // Closed ^_^ eyes + open smile - a softer cheerful look.
        arms = armHappy;
        eyes = happyArcEyes;
        mouth = bigOpenMouth;
    } else if (mood === 'surprised') {
        // Gentle "oops" for a wrong answer - small round mouth, raised brows.
        eyebrows = `
            <path d="M64,78 Q76,73 88,78" stroke="#3B2A22" stroke-width="3.5" fill="none" stroke-linecap="round"/>
            <path d="M112,78 Q124,73 136,78" stroke="#3B2A22" stroke-width="3.5" fill="none" stroke-linecap="round"/>
        `;
        mouth = `<ellipse cx="100" cy="136" rx="9" ry="11" fill="#8B4A3A"/>`;
    } else if (mood === 'wink') {
        // Playful one-eye wink + happy arms - a cheeky "nice one!" reaction.
        arms = armHappy;
        eyes = `
            <ellipse cx="76" cy="95" rx="12" ry="15" fill="white"/>
            <circle cx="78" cy="99" r="6.5" fill="#3B2A22"/>
            <circle cx="81" cy="94" r="2.2" fill="white"/>
            <path d="M112,98 Q124,88 136,98" stroke="#3B2A22" stroke-width="5" fill="none" stroke-linecap="round"/>
        `;
        mouth = `
            <path d="M78,128 Q100,152 122,128 Q100,143 78,128 Z" fill="#8B4A3A"/>
            <path d="M88,136 Q100,143 112,136 Q100,140 88,136 Z" fill="#FF9EB0"/>
        `;
    } else if (mood === 'party') {
        // Over-the-top joy: arms up, star eyes, big grin with a little tongue.
        arms = armCheer;
        eyes = starEyes;
        mouth = `
            <path d="M70,122 Q100,168 130,122 Q100,148 70,122 Z" fill="#8B4A3A"/>
            <path d="M90,150 Q100,166 110,150 Q100,156 90,150 Z" fill="#FF7A93"/>
            <path d="M84,132 Q100,150 116,132 Q100,140 84,132 Z" fill="#FF9EB0" opacity="0.7"/>
        `;
    } else if (mood === 'teary') {
        // Full crying face: sad brows, welling tears, open wailing mouth.
        eyebrows = `
            <path d="M66,80 L86,87" stroke="#3B2A22" stroke-width="3.5" stroke-linecap="round"/>
            <path d="M134,80 L114,87" stroke="#3B2A22" stroke-width="3.5" stroke-linecap="round"/>
        `;
        eyes = defaultEyes + `
            <path d="M63,104 C59,112 59,118 63,120 C67,118 67,112 63,104 Z" fill="#7FD0F5"/>
            <path d="M137,104 C133,112 133,118 137,120 C141,118 141,112 137,104 Z" fill="#7FD0F5"/>
        `;
        mouth = `<ellipse cx="100" cy="140" rx="12" ry="14" fill="#8B4A3A"/>`;
    } else if (mood === 'pout') {
        // Sulky self-pity: knitted brows, small pursed frown.
        eyebrows = `
            <path d="M64,84 L86,80" stroke="#3B2A22" stroke-width="3.5" stroke-linecap="round"/>
            <path d="M136,84 L114,80" stroke="#3B2A22" stroke-width="3.5" stroke-linecap="round"/>
        `;
        mouth = `<path d="M88,138 Q100,130 112,138" stroke="#3B2A22" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    } else if (mood === 'laugh') {
        // Belly laugh: squished ^_^ eyes, tears of joy, wide open guffaw.
        arms = armHappy;
        eyes = happyArcEyes + `
            <path d="M58,99 C54,107 54,113 58,115 C62,113 62,107 58,99 Z" fill="#7FD0F5"/>
            <path d="M142,99 C138,107 138,113 142,115 C146,113 146,107 142,99 Z" fill="#7FD0F5"/>
        `;
        mouth = `
            <path d="M68,120 Q100,172 132,120 Q100,150 68,120 Z" fill="#8B4A3A"/>
            <path d="M86,150 Q100,166 114,150 Q100,157 86,150 Z" fill="#FF7A93"/>
        `;
    } else if (mood === 'cool') {
        // Too-cool sunglasses + a little smirk - a confident "nailed it".
        arms = armHappy;
        eyes = `
            <path d="M52,88 L148,88" stroke="#2A2A2A" stroke-width="4" stroke-linecap="round"/>
            <rect x="55" y="87" width="38" height="22" rx="10" fill="#2A2A2A"/>
            <rect x="107" y="87" width="38" height="22" rx="10" fill="#2A2A2A"/>
            <rect x="93" y="93" width="14" height="4" fill="#2A2A2A"/>
            <path d="M61,92 L71,92" stroke="#7d7d7d" stroke-width="3" stroke-linecap="round"/>
            <path d="M113,92 L123,92" stroke="#7d7d7d" stroke-width="3" stroke-linecap="round"/>
        `;
        mouth = `<path d="M80,130 Q100,143 122,127" stroke="#3B2A22" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    } else if (mood === 'blush') {
        // Shy, bashful delight: big rosy cheeks and a tiny modest smile.
        arms = armIdle;
        eyes = defaultEyes + `
            <ellipse cx="57" cy="121" rx="18" ry="12" fill="#FF7A93" opacity="0.75"/>
            <ellipse cx="143" cy="121" rx="18" ry="12" fill="#FF7A93" opacity="0.75"/>
        `;
        mouth = `<path d="M87,133 Q100,141 113,133" stroke="#3B2A22" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    } else if (mood === 'starstruck') {
        // Star-shaped eyes + jaw-drop awe - pure "WOW!".
        arms = armCheer;
        eyes = `
            <path d="M76,82 L79.5,92.5 L90,96 L79.5,99.5 L76,110 L72.5,99.5 L62,96 L72.5,92.5 Z" fill="#FFD34E" stroke="#F5A623" stroke-width="1.2"/>
            <path d="M124,82 L127.5,92.5 L138,96 L127.5,99.5 L124,110 L120.5,99.5 L110,96 L120.5,92.5 Z" fill="#FFD34E" stroke="#F5A623" stroke-width="1.2"/>
        `;
        mouth = bigOpenMouth;
    } else if (mood === 'dizzy') {
        // Comic "@_@" spiral-ish X eyes + wavy mouth - a funny, harmless stumble.
        eyes = `
            <path d="M68,88 L84,104 M84,88 L68,104" stroke="#3B2A22" stroke-width="4" stroke-linecap="round"/>
            <path d="M116,88 L132,104 M132,88 L116,104" stroke="#3B2A22" stroke-width="4" stroke-linecap="round"/>
        `;
        mouth = `<path d="M80,134 q9,-9 18,0 q9,9 18,0" stroke="#3B2A22" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    } else if (mood === 'sob') {
        // Heavy bawling: sad brows, long streaming tears, wide wailing mouth.
        eyebrows = `
            <path d="M66,80 L86,87" stroke="#3B2A22" stroke-width="3.5" stroke-linecap="round"/>
            <path d="M134,80 L114,87" stroke="#3B2A22" stroke-width="3.5" stroke-linecap="round"/>
        `;
        eyes = defaultEyes + `
            <path d="M61,104 C57,120 57,134 61,140 C65,134 65,120 61,104 Z" fill="#7FD0F5"/>
            <path d="M139,104 C135,120 135,134 139,140 C143,134 143,120 139,104 Z" fill="#7FD0F5"/>
        `;
        mouth = `
            <ellipse cx="100" cy="142" rx="15" ry="16" fill="#8B4A3A"/>
            <path d="M87,142 Q100,152 113,142" stroke="#5a2f24" stroke-width="3" fill="none" stroke-linecap="round"/>
        `;
    }

    return `
        <svg width="${size}" height="${Math.round(size * 0.95)}" viewBox="0 0 200 190" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="100" cy="184" rx="60" ry="7" fill="rgba(0,0,0,0.08)"/>
            ${arms}
            <g class="m-leg m-leg-l"><ellipse cx="70" cy="174" rx="18" ry="9" fill="#C97A42"/></g>
            <g class="m-leg m-leg-r"><ellipse cx="130" cy="174" rx="18" ry="9" fill="#C97A42"/></g>
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
            <g class="m-brow">${eyebrows}</g>
            <g class="m-eyes">${eyes}</g>
            <g class="m-mouth">${mouth}</g>
        </svg>
    `;
}

// Floating-particle emoji set that matches a mascot mood, so the burst of
// particles reinforces the face (hearts for love, stars for starstruck, etc.)
// instead of always being the same generic sparkles.
function moodParticles(mood) {
    const MAP = {
        love: ['❤️', '💕', '💖', '💗', '😍'],
        starstruck: ['⭐', '🌟', '✨', '💫', '🤩'],
        laugh: ['😆', '😂', '🤣', '✨', '💛'],
        cool: ['😎', '🕶️', '✨', '💫', '🔥'],
        blush: ['☺️', '💗', '🌸', '✨', '💛'],
        party: ['🎉', '🎊', '🥳', '⭐', '💛'],
        giggle: ['😄', '✨', '💛', '🌟', '💫'],
        wink: ['😉', '⭐', '✨', '💛', '🌟'],
        excited: ['⭐', '🌟', '✨', '🎉', '💛'],
    };
    return MAP[mood] || ['⭐', '🌟', '✨', '🎉', '💛'];
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
}
