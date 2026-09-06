// Data-driven CONTEXT-theme generator (GĐ2 scale-up, Step 3.1).
//
// Sibling of build-theme-course.js. That one covers the PICTURE bucket (concrete nouns with a
// literal emoji). THIS one covers the CONTEXT bucket from the topic classification — the kid
// concepts that aren't concrete objects: numbers, colours, feelings, shapes, school, seasons,
// weekdays, months, times of day, celebrations.
//
// They were originally filed as "no picture", but that was an artefact of the emoji dictionary
// not knowing these words. data/emoji-map.js now carries `number`/`emotion`/`shape`/`school`/
// `season`/`weekday`/`month`/`time`/`celebration` groups, so every concept here still SHOWS
// something (weekdays + months use a mnemonic anchor rather than a literal picture).
//
// Vietnamese comes from the OLD VOCAB_BANK wherever the word exists there (that is the whole
// point of the reconciliation plan — reuse, don't discard); a curated fallback covers the few
// concepts the bank never had.
//
// Emits data/context-course.js (window.ContextCourse = [...]). Each theme carries
// `kind: 'context'` so data/theme-lessons.js builds it with the livelier context queue
// (matching + fill-in-the-blank on top of the picture/listening/dialogue drills).
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const EmojiMap = require(path.join(ROOT, 'data/emoji-map.js'));

// ---- load the old vocabulary (for `vi`) -----------------------------------------------------
const sb = {};
vm.createContext(sb);
vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'data/vocab-bank.js'), 'utf8') + ';globalThis.__V=VOCAB_BANK;',
    sb
);
const V = sb.__V;
const BANK = new Map();
(Array.isArray(V) ? V : Object.values(V).flat())
    .filter((w) => w && w.en && w.vi)
    .forEach((w) => {
        const k = String(w.en).toLowerCase().trim();
        if (!BANK.has(k)) BANK.set(k, w.vi);
    });

// Vietnamese for the handful of concepts the old bank never carried.
const VI_FALLBACK = {
    pencil: 'bút chì',
    rain: 'mưa',
    morning: 'buổi sáng',
    noon: 'buổi trưa',
    afternoon: 'buổi chiều',
    evening: 'buổi tối',
    night: 'ban đêm',
};

// HOMOGRAPH GUARD. A few bank glosses are correct for the word in general but WRONG for the
// sense this theme teaches — "square" is filed as "Quảng trường" (a town plaza), which would
// teach the child the wrong meaning in a shapes lesson. Theme-scoped overrides win over the
// bank, same principle as the tap-word gloss rules.
const VI_OVERRIDE = {
    ctx_shapes: {
        square: 'Hình vuông',
        heart: 'Hình trái tim',
        star: 'Hình ngôi sao',
        line: 'Đường thẳng',
        point: 'Điểm (chấm)',
    },
};

function viOf(en, themeId) {
    const k = String(en).toLowerCase().trim();
    const over = VI_OVERRIDE[themeId];
    if (over && over[k]) return over[k];
    return BANK.get(k) || VI_FALLBACK[k] || k;
}

const cap = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

// ---- theme taxonomy -------------------------------------------------------------------------
// `concepts` are listed in TEACHING order: the first three fill the sentence slots, so they must
// be the ones the templates read naturally with. `proper` capitalises names (weekdays, months).
const THEMES = [
    {
        id: 'ctx_numbers',
        title: 'Số đếm',
        icon: '🔢',
        template: 'count',
        concepts: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'],
    },
    {
        id: 'ctx_colors',
        title: 'Màu sắc',
        icon: '🎨',
        template: 'color',
        concepts: ['red', 'blue', 'green', 'yellow', 'black', 'white', 'purple', 'brown'],
    },
    {
        id: 'ctx_emotions',
        title: 'Cảm xúc',
        icon: '😊',
        template: 'feel',
        concepts: ['happy', 'sad', 'tired', 'scared', 'surprised', 'excited', 'proud', 'shy'],
    },
    {
        id: 'ctx_shapes',
        title: 'Hình khối',
        icon: '🔺',
        template: 'shape',
        concepts: ['circle', 'square', 'triangle', 'star', 'heart', 'line', 'rectangle', 'point'],
    },
    {
        id: 'ctx_school',
        title: 'Trường lớp',
        icon: '🏫',
        template: 'schoolday',
        concepts: [
            'textbook',
            'homework',
            'school',
            'teacher',
            'student',
            'backpack',
            'library',
            'ruler',
        ],
    },
    {
        id: 'ctx_seasons',
        title: 'Mùa & Thời tiết',
        icon: '🌤️',
        template: 'season',
        concepts: ['spring', 'summer', 'autumn', 'winter', 'sun', 'rain', 'snow', 'wind'],
    },
    {
        id: 'ctx_weekdays',
        title: 'Thứ trong tuần',
        icon: '📅',
        template: 'weekday',
        proper: true,
        concepts: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
    {
        id: 'ctx_months',
        title: 'Tháng trong năm',
        icon: '🗓️',
        template: 'month',
        proper: true,
        // Chronological on purpose — the order IS part of what the child is learning. The
        // template picks the months it needs by index (MONTH_SLOT) instead of relying on
        // position, so teaching order and sentence naturalness don't fight each other.
        concepts: [
            'january',
            'february',
            'march',
            'april',
            'may',
            'june',
            'july',
            'august',
            'september',
            'october',
            'november',
            'december',
        ],
    },
    {
        id: 'ctx_daytime',
        title: 'Buổi trong ngày',
        icon: '🌅',
        template: 'daytime',
        concepts: ['morning', 'afternoon', 'evening', 'night', 'noon', 'hour', 'minute', 'week'],
    },
    {
        id: 'ctx_celebration',
        title: 'Lễ hội & Sinh nhật',
        icon: '🎂',
        template: 'celebrate',
        concepts: [
            'birthday',
            'cake',
            'gift',
            'balloon',
            'party',
            'fireworks',
            'candle',
            'festival',
        ],
    },
];

// ---- scene settings (drives the animated "hoạt cảnh" stage) ---------------------------------
const SETTINGS = {
    count: { set: '🧮', cap: 'Đếm đồ cùng nhau' },
    color: { set: '🖍️', cap: 'Trong giờ vẽ' },
    feel: { set: '🏡', cap: 'Chào nhau buổi sáng' },
    shape: { set: '📐', cap: 'Giờ học hình khối' },
    schoolday: { set: '🏫', cap: 'Một ngày ở trường' },
    season: { set: '🌦️', cap: 'Nói về thời tiết' },
    weekday: { set: '📅', cap: 'Lên kế hoạch cả tuần' },
    month: { set: '🗓️', cap: 'Nói về ngày sinh nhật' },
    daytime: { set: '🌅', cap: 'Một ngày của bé' },
    celebrate: { set: '🎉', cap: 'Tiệc sinh nhật' },
};

// ---- templates ------------------------------------------------------------------------------
// Each returns { phrases[3], dialogue{lines[6], question, options[3], correct}, fills[2] }.
// Every sentence is grammar-checked for the word class it teaches (no article before a season,
// "at night" not "in the night", plural agreement after a count word, etc).
const TEMPLATES = {
    count: (w) => ({
        phrases: [
            `${cap(w[0])}, ${w[1]}, ${w[2]}!`,
            `I have ${w[2]} apples.`,
            `I can count to ${w[4]}.`,
        ],
        dialogue: {
            lines: [
                '👧 Mai: Nam, can you count with me?',
                `👦 Nam: Yes! ${cap(w[0])}, ${w[1]}, ${w[2]}.`,
                `👧 Mai: Very good. I have ${w[2]} apples.`,
                `👦 Nam: And I have ${w[4]} apples!`,
                `👧 Mai: Wow! Can you count to ${w[9]}?`,
                `👦 Nam: Yes — ${w[0]}, ${w[1]}, ${w[2]} ... ${w[9]}!`,
            ],
            question: 'Nam có mấy quả táo?',
            options: [w[4], w[2], w[9]],
            correct: 0,
        },
        fills: [
            { sentence: `I have ${w[2]} apples.`, blank: w[2], distract: [w[0], w[4]] },
            { sentence: `I can count to ${w[9]}.`, blank: w[9], distract: [w[1], w[3]] },
        ],
    }),
    color: (w) => ({
        phrases: [`The ball is ${w[0]}.`, `I like ${w[1]}.`, `My bag is ${w[2]}.`],
        dialogue: {
            lines: [
                '👧 Mai: Nam, what color do you like?',
                `👦 Nam: I like ${w[1]}. And you?`,
                `👧 Mai: I like ${w[0]}! My bag is ${w[0]}.`,
                `👦 Nam: Look, the ball is ${w[2]}!`,
                `👧 Mai: Yes. And that flower is ${w[3]}.`,
                "👦 Nam: Let's draw with all the colors!",
            ],
            question: 'Nam thích màu gì?',
            options: [w[1], w[0], w[2]],
            correct: 0,
        },
        fills: [
            { sentence: `My bag is ${w[0]}.`, blank: w[0], distract: [w[1], w[2]] },
            { sentence: `The leaf is ${w[2]}.`, blank: w[2], distract: [w[3], w[4]] },
        ],
    }),
    feel: (w) => ({
        phrases: [`I am ${w[0]} today.`, `Are you ${w[1]}?`, `My friend is ${w[5]}.`],
        dialogue: {
            lines: [
                '👦 Nam: Good morning, Mai! How are you?',
                `👧 Mai: I am ${w[0]} today! And you?`,
                `👦 Nam: I am ${w[2]}. I slept late.`,
                `👧 Mai: Oh no. Are you ${w[1]}?`,
                `👦 Nam: No, I am fine. Now I am ${w[5]}!`,
                "👧 Mai: Good! Let's play together.",
            ],
            question: 'Hôm nay Mai cảm thấy thế nào?',
            options: [w[0], w[2], w[1]],
            correct: 0,
        },
        fills: [
            { sentence: `I am ${w[0]} today.`, blank: w[0], distract: [w[1], w[2]] },
            { sentence: `Nam is ${w[2]}. He slept late.`, blank: w[2], distract: [w[0], w[5]] },
        ],
    }),
    shape: (w) => ({
        phrases: [`This is a ${w[0]}.`, `I can draw a ${w[1]}.`, `The ${w[2]} is big.`],
        dialogue: {
            lines: [
                '👩‍🏫 Cô giáo: Today we draw shapes!',
                `👦 Nam: I can draw a ${w[0]}.`,
                `👧 Mai: Look! This is a ${w[1]}.`,
                `👦 Nam: Your ${w[2]} is very big.`,
                `👧 Mai: Thank you! I like the ${w[3]} too.`,
                '👦 Nam: Let us draw one more!',
            ],
            question: 'Nam vẽ hình gì?',
            options: [`a ${w[0]}`, `a ${w[1]}`, `a ${w[2]}`],
            correct: 0,
        },
        fills: [
            { sentence: `This is a ${w[0]}.`, blank: w[0], distract: [w[1], w[2]] },
            { sentence: `I can draw a ${w[1]}.`, blank: w[1], distract: [w[0], w[3]] },
        ],
    }),
    schoolday: (w) => ({
        phrases: [`This is my ${w[0]}.`, `I do my ${w[1]}.`, `Our ${w[2]} is big.`],
        dialogue: {
            lines: [
                '👧 Mai: Nam, do you have your ${w0}?',
                `👦 Nam: Yes, this is my ${w[0]}.`,
                `👧 Mai: Good. Did you do your ${w[1]}?`,
                `👦 Nam: Yes, I did it at home.`,
                `👧 Mai: Our ${w[2]} is very big and bright.`,
                '👦 Nam: I like our school!',
            ],
            question: 'Nam làm bài tập ở đâu?',
            options: ['At home.', 'At school.', 'In the library.'],
            correct: 0,
        },
        fills: [
            { sentence: `This is my ${w[0]}.`, blank: w[0], distract: [w[1], w[2]] },
            { sentence: `I do my ${w[1]} at home.`, blank: w[1], distract: [w[0], w[6]] },
        ],
    }),
    season: (w) => ({
        phrases: [`I like ${w[0]}.`, `It is warm in ${w[1]}.`, `${cap(w[3])} is cold.`],
        dialogue: {
            lines: [
                '👦 Nam: Mai, what season do you like?',
                `👧 Mai: I like ${w[0]}. The flowers are beautiful.`,
                `👦 Nam: I like ${w[1]}. It is warm.`,
                `👧 Mai: But ${w[3]} is very cold!`,
                `👦 Nam: Yes. In ${w[2]} the leaves fall down.`,
                '👧 Mai: I love every season!',
            ],
            question: 'Mai thích mùa nào?',
            options: [w[0], w[1], w[3]],
            correct: 0,
        },
        fills: [
            { sentence: `It is warm in ${w[1]}.`, blank: w[1], distract: [w[3], w[0]] },
            {
                sentence: `${cap(w[3])} is very cold.`,
                blank: cap(w[3]),
                distract: [cap(w[1]), cap(w[0])],
            },
        ],
    }),
    weekday: (w) => ({
        phrases: [`I go to school on ${w[0]}.`, `I play soccer on ${w[5]}.`, `I rest on ${w[6]}.`],
        dialogue: {
            lines: [
                '👧 Mai: Nam, what do you do on ${w0}?',
                `👦 Nam: On ${w[0]} I go to school.`,
                `👧 Mai: And on ${w[5]}?`,
                `👦 Nam: On ${w[5]} I play soccer with my friends.`,
                `👧 Mai: Nice! I rest on ${w[6]}.`,
                '👦 Nam: Me too. See you at school!',
            ],
            question: 'Nam chơi bóng đá vào thứ mấy?',
            options: [w[5], w[0], w[6]],
            correct: 0,
        },
        fills: [
            { sentence: `I go to school on ${w[0]}.`, blank: w[0], distract: [w[5], w[6]] },
            { sentence: `I play soccer on ${w[5]}.`, blank: w[5], distract: [w[0], w[1]] },
        ],
    }),
    // Months stay in calendar order in `concepts`; the sentences pick the ones that read
    // naturally (a May birthday, a hot June, school starting in September, a December holiday).
    month: (all) => {
        const w = [all[4], all[5], all[8], all[11]]; // May, June, September, December
        return {
            phrases: [
                `My birthday is in ${w[0]}.`,
                `It is hot in ${w[1]}.`,
                `School starts in ${w[2]}.`,
            ],
            dialogue: {
                lines: [
                    '👦 Nam: Mai, when is your birthday?',
                    `👧 Mai: My birthday is in ${w[0]}. And yours?`,
                    `👦 Nam: Mine is in ${w[1]}. It is hot then!`,
                    `👧 Mai: School starts in ${w[2]}, right?`,
                    `👦 Nam: Yes. And we have a holiday in ${w[3]}.`,
                    "👧 Mai: I can't wait!",
                ],
                question: 'Sinh nhật Mai vào tháng nào?',
                options: [w[0], w[1], w[2]],
                correct: 0,
            },
            fills: [
                { sentence: `My birthday is in ${w[0]}.`, blank: w[0], distract: [w[1], w[2]] },
                { sentence: `School starts in ${w[2]}.`, blank: w[2], distract: [w[3], w[0]] },
            ],
        };
    },
    daytime: (w) => ({
        phrases: [`I get up in the ${w[0]}.`, `I play in the ${w[1]}.`, `I read in the ${w[2]}.`],
        dialogue: {
            lines: [
                '👧 Mai: Nam, what do you do in the ${w0}?',
                `👦 Nam: In the ${w[0]} I get up and eat breakfast.`,
                `👧 Mai: And in the ${w[1]}?`,
                `👦 Nam: In the ${w[1]} I play with my friends.`,
                `👧 Mai: I read a book in the ${w[2]}.`,
                '👦 Nam: And at night we sleep. Good night!',
            ],
            question: 'Buổi chiều Nam làm gì?',
            options: ['He plays with his friends.', 'He gets up.', 'He reads a book.'],
            correct: 0,
        },
        fills: [
            { sentence: `I get up in the ${w[0]}.`, blank: w[0], distract: [w[1], w[2]] },
            { sentence: `I play in the ${w[1]}.`, blank: w[1], distract: [w[0], w[2]] },
        ],
    }),
    celebrate: (w) => ({
        phrases: [`Happy ${w[0]}!`, `I like the ${w[1]}.`, `Look at the ${w[3]}!`],
        dialogue: {
            lines: [
                `👧 Mai: Happy ${w[0]}, Nam!`,
                `👦 Nam: Thank you, Mai! Look at my ${w[1]}.`,
                `👧 Mai: It is beautiful! Here is a ${w[2]} for you.`,
                `👦 Nam: Thank you so much! I love the ${w[3]}s too.`,
                `👧 Mai: Let's sing a song at the ${w[4]}!`,
                '👦 Nam: Yes! This is the best day.',
            ],
            question: 'Mai tặng Nam cái gì?',
            options: [`A ${w[2]}.`, `A ${w[1]}.`, `A ${w[3]}.`],
            correct: 0,
        },
        fills: [
            { sentence: `I like the ${w[1]}.`, blank: w[1], distract: [w[2], w[3]] },
            { sentence: `Here is a ${w[2]} for you.`, blank: w[2], distract: [w[1], w[4]] },
        ],
    }),
};

// ---- build ----------------------------------------------------------------------------------
function wordsOf(theme) {
    // Every concept must resolve to an emoji, otherwise the picture drills would show a bare
    // word — the exact thing that made these topics look "no picture" in the first place.
    return theme.concepts
        .filter((c) => EmojiMap.has(c))
        .map((c) => ({ en: theme.proper ? cap(c) : c, vi: viOf(c, theme.id) }));
}

function buildTheme(theme) {
    const words = wordsOf(theme);
    if (words.length < 6) return { theme, words, skip: true };
    const slots = words.map((w) => w.en); // already cased for the template
    const t = TEMPLATES[theme.template](slots);
    // The schoolday/weekday/daytime openers use a literal ${w0} marker so the opening question
    // names the same word the answer does; substitute it here.
    const lines = t.dialogue.lines.map((l) => l.replace(/\$\{w0\}/g, slots[0]));
    const audio = lines.map((l) => l.replace(/^.*?:\s*/, ''));
    const setting = SETTINGS[theme.template] || { set: '💬', cap: 'Nam và Mai trò chuyện' };
    return {
        theme,
        obj: {
            id: theme.id,
            title: theme.title,
            icon: theme.icon,
            kind: 'context', // ← theme-lessons.js builds these with the livelier context queue
            words,
            phrases: t.phrases,
            fills: t.fills.map((f) => ({
                sentence: f.sentence.replace(f.blank, '___'),
                answer: f.blank,
                distract: f.distract,
            })),
            dialogue: {
                setting: setting.set,
                sceneCaption: setting.cap,
                lines,
                audioLines: audio,
                question: t.dialogue.question,
                options: t.dialogue.options,
                correct: t.dialogue.correct,
            },
        },
    };
}

const built = [];
const report = [];
for (const theme of THEMES) {
    const r = buildTheme(theme);
    if (r.skip) {
        report.push(`  SKIP  ${theme.id.padEnd(18)} only ${r.words.length} emoji concepts`);
        continue;
    }
    built.push(r.obj);
    report.push(
        `  OK    ${theme.id.padEnd(18)} ${r.obj.words.length} words: ${r.obj.words
            .map((w) => w.en + EmojiMap.get(w.en))
            .join(' ')}`
    );
}

const header =
    '// AUTO-GENERATED by scripts/build-context-course.js — do not edit by hand.\n' +
    '// CONTEXT-bucket theme lessons (numbers, colours, feelings, shapes, school, seasons,\n' +
    '// weekdays, months, times of day, celebrations) built from the OLD VOCAB_BANK.\n' +
    '// kind:"context" makes data/theme-lessons.js use the livelier queue (matching + fill-blank).\n';
fs.writeFileSync(
    path.join(ROOT, 'data/context-course.js'),
    header +
        '(function () {\n  window.ContextCourse = ' +
        JSON.stringify(built, null, 1) +
        ';\n})();\n'
);

console.log(report.join('\n'));
console.log(
    `\nGenerated ${built.length}/${THEMES.length} context themes -> data/context-course.js`
);
