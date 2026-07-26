// Data-driven theme-course generator (GĐ2 scale-up).
// Reuses the OLD vocabulary (data/vocab-bank.js) as raw material: for each parent theme it
// pulls emoji-verified words from the matching VOCAB_BANK topics (picture is guaranteed clear),
// takes `vi` straight from the bank, and generates natural phrases + a situational Nam/Mai
// dialogue from a small set of grammar-safe templates. Output objects use the EXACT shape the
// existing data/theme-lessons.js build() already understands, so the lesson engine is reused
// unchanged. Emits data/theme-course.js (window.ThemeCourse = [...]).
'use strict';
const fs = require('path') && require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const EmojiMap = require(path.join(ROOT, 'data/emoji-map.js'));

// ---- load the old vocabulary --------------------------------------------------------------
const sb = {};
vm.createContext(sb);
vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'data/vocab-bank.js'), 'utf8') + ';globalThis.__V=VOCAB_BANK;',
    sb
);
const V = sb.__V;
const ALL = (Array.isArray(V) ? V : Object.values(V).flat()).filter((w) => w && w.en);

// ---- parent-theme taxonomy (clean, kid-first) ---------------------------------------------
// Each theme = one (or a few merged) emoji semantic group(s). Words are SOURCED from the old
// VOCAB_BANK but BUCKETED by clean emoji group, so a word lands in exactly one theme and every
// picture is semantically correct (no bird theme getting lions). template = phrase/dialogue gen.
const THEMES = [
    { id: 'gen_animals', title: 'Con vật', icon: '🐾', groups: ['animals'], template: 'like' },
    { id: 'gen_birds', title: 'Loài chim', icon: '🐦', groups: ['birds'], template: 'like' },
    { id: 'gen_sea', title: 'Sinh vật biển', icon: '🐠', groups: ['sea'], template: 'like' },
    { id: 'gen_insects', title: 'Côn trùng', icon: '🐝', groups: ['insects'], template: 'like' },
    { id: 'gen_fruit', title: 'Trái cây', icon: '🍎', groups: ['fruit'], template: 'food' },
    { id: 'gen_vegetable', title: 'Rau củ', icon: '🥕', groups: ['vegetable'], template: 'food' },
    {
        id: 'gen_food',
        title: 'Món ăn & Đồ uống',
        icon: '🍜',
        groups: ['food', 'drink'],
        template: 'food',
    },
    { id: 'gen_clothing', title: 'Quần áo', icon: '👕', groups: ['clothing'], template: 'wear' },
    { id: 'gen_vehicle', title: 'Xe cộ', icon: '🚗', groups: ['vehicle'], template: 'go' },
    { id: 'gen_place', title: 'Nơi chốn', icon: '🏙️', groups: ['place'], template: 'like' },
    {
        id: 'gen_furniture',
        title: 'Đồ trong nhà',
        icon: '🛋️',
        groups: ['furniture'],
        template: 'like',
    },
    { id: 'gen_kitchen', title: 'Nhà bếp', icon: '🍽️', groups: ['kitchen'], template: 'like' },
    {
        id: 'gen_object',
        title: 'Đồ vật quanh bé',
        icon: '🎒',
        groups: ['object'],
        template: 'like',
    },
    { id: 'gen_body', title: 'Cơ thể', icon: '🖐️', groups: ['body'], template: 'like' },
    { id: 'gen_family', title: 'Gia đình', icon: '👪', groups: ['family'], template: 'like' },
    { id: 'gen_jobs', title: 'Nghề nghiệp', icon: '👩‍🏫', groups: ['job'], template: 'like' },
    { id: 'gen_nature', title: 'Thiên nhiên', icon: '🌳', groups: ['nature'], template: 'like' },
    { id: 'gen_sport', title: 'Thể thao', icon: '⚽', groups: ['sport'], template: 'activity' },
    {
        id: 'gen_music',
        title: 'Âm nhạc & Nhạc cụ',
        icon: '🎵',
        groups: ['music'],
        template: 'like',
    },
    { id: 'gen_toys', title: 'Đồ chơi', icon: '🧸', groups: ['toy'], template: 'like' },
    { id: 'gen_countries', title: 'Quốc gia', icon: '🏳️', groups: ['country'], template: 'from' },
];

// Inherent-plural nouns that break singular templates ("This is my pants" / "The noodles is
// good"). They stay in the theme for picture drills but are kept OUT of the sentence slots.
const PLURAL = new Set([
    'pants',
    'jeans',
    'shorts',
    'trousers',
    'noodles',
    'glasses',
    'sunglasses',
    'scissors',
    'clothes',
    'socks',
    'boots',
    'gloves',
    'chopsticks',
    'stairs',
    'headphones',
    'fries',
]);
const isPlural = (en) => PLURAL.has(String(en).toLowerCase());

// ---- word selection: bucket old-vocab words by their emoji group ---------------------------
function pickWords(theme, cap) {
    const groups = new Set(theme.groups);
    const seen = new Set();
    const out = [];
    ALL.filter((w) => groups.has(EmojiMap.groupOf(w.en))) // clean semantic bucket
        .sort((a, b) => (a.difficulty || 3) - (b.difficulty || 3))
        .forEach((w) => {
            const key = EmojiMap.resolveKey(w.en); // dedupe by resolved emoji key (bananas==banana)
            if (!key || seen.has(key)) return;
            seen.add(key);
            out.push({ en: w.en, vi: w.vi });
        });
    // singular/mass nouns first so the sentence slots (words[0..2]) are grammatical; plurals
    // still ride along for the picture-only drills.
    const singular = out.filter((w) => !isPlural(w.en));
    const plural = out.filter((w) => isPlural(w.en));
    return singular.concat(plural).slice(0, cap);
}

// ---- phrase + dialogue templates (grammar-safe: "the"/"my"/"from"/"by") -------------------
function disp(w, template) {
    // keep proper nouns (countries) capitalised; lowercase common nouns for mid-sentence use
    return template === 'from' ? w.en : w.en.toLowerCase();
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Per-template SETTING for the "hoạt cảnh" scene banner (place emoji + VN caption) so kids
// picture WHERE the conversation happens before they read it.
const SETTINGS = {
    like: { set: '💬', cap: 'Nam và Mai đang trò chuyện' },
    food: { set: '🍽️', cap: 'Ở quán ăn' },
    wear: { set: '🛍️', cap: 'Đi mua sắm quần áo' },
    go: { set: '🚸', cap: 'Trên đường tới trường' },
    from: { set: '🌍', cap: 'Gặp gỡ bạn mới' },
    activity: { set: '🏟️', cap: 'Ở sân chơi thể thao' },
};

// Each template returns a natural, 6-line Nam/Mai conversation (greeting → exchange → detail →
// wrap-up), grammar-safe ("the"/"my"/"from"/"by"/no-article), plus a comprehension question.
const TEMPLATES = {
    // sports/activities: no article ("I like swimming", not "the swimming")
    activity: (w) => ({
        phrases: [`I like ${w[0]}.`, `I like ${w[1]}.`, `${cap(w[2])} is fun!`],
        dialogue: {
            lines: [
                '👧 Mai: Hi Nam! What sport do you like?',
                `👦 Nam: Hi Mai! I like ${w[0]}. And you?`,
                `👧 Mai: I like ${w[1]}. It is fun!`,
                `👦 Nam: Do you like ${w[2]}?`,
                `👧 Mai: Yes! I like ${w[2]} very much.`,
                "👦 Nam: Cool! Let's play together.",
            ],
            question: 'Nam thích môn nào?',
            options: [`${w[0]}`, `${w[1]}`, `${w[2]}`],
            correct: 0,
        },
    }),
    like: (w) => ({
        phrases: [`I like the ${w[0]}.`, `Look at the ${w[1]}!`, `This is the ${w[2]}.`],
        dialogue: {
            lines: [
                '👧 Mai: Hi Nam! What do you like?',
                `👦 Nam: Hi Mai! I like the ${w[0]}. And you?`,
                `👧 Mai: I like the ${w[1]}. It is nice.`,
                `👦 Nam: Look! The ${w[2]} is over there.`,
                `👧 Mai: Wow! I like the ${w[2]} too.`,
                "👦 Nam: Me too! Let's look together.",
            ],
            question: 'Mai thích cái nào đầu tiên?',
            options: [`the ${w[1]}`, `the ${w[0]}`, `the ${w[2]}`],
            correct: 0,
        },
    }),
    food: (w) => ({
        phrases: [`I like the ${w[0]}.`, `I eat the ${w[1]}.`, `The ${w[2]} is good.`],
        dialogue: {
            lines: [
                '👦 Nam: I am so hungry!',
                `👧 Mai: Me too, Nam. I like the ${w[0]}.`,
                `👦 Nam: I like the ${w[1]}. It is yummy.`,
                `👧 Mai: Do you want some ${w[2]}?`,
                `👦 Nam: Yes, please! The ${w[2]} is good.`,
                "👧 Mai: Great! Let's eat together.",
            ],
            question: 'Mai thích món nào?',
            options: [`the ${w[0]}`, `the ${w[1]}`, `the ${w[2]}`],
            correct: 0,
        },
    }),
    wear: (w) => ({
        phrases: [`I like my ${w[0]}.`, `Look at my ${w[1]}!`, `This is my ${w[2]}.`],
        dialogue: {
            lines: [
                `👧 Mai: Nam, look at my new ${w[0]}!`,
                `👦 Nam: Wow, Mai! I like your ${w[0]}.`,
                `👧 Mai: Thank you! I like your ${w[1]} too.`,
                `👦 Nam: This is my favorite ${w[1]}.`,
                `👧 Mai: And look, my ${w[2]} is new!`,
                '👦 Nam: It is beautiful. You look great!',
            ],
            question: 'Mai khoe món nào đầu tiên?',
            options: [`${w[0]}`, `${w[1]}`, `${w[2]}`],
            correct: 0,
        },
    }),
    go: (w) => ({
        phrases: [`I go by ${w[0]}.`, `Look at the ${w[1]}!`, `I like the ${w[2]}.`],
        dialogue: {
            lines: [
                '👧 Mai: Hi Nam! How do you go to school?',
                `👦 Nam: Hi Mai! I go by ${w[0]}. And you?`,
                `👧 Mai: I go by ${w[1]}. It is fast.`,
                `👦 Nam: Look at that big ${w[2]}!`,
                `👧 Mai: Wow! I like the ${w[2]}.`,
                '👦 Nam: Me too! See you at school.',
            ],
            question: 'Nam đi học bằng gì?',
            options: [`${w[0]}`, `${w[1]}`, `${w[2]}`],
            correct: 0,
        },
    }),
    from: (w) => ({
        phrases: [`I am from ${w[0]}.`, `This is ${w[1]}.`, `I like ${w[2]}.`],
        dialogue: {
            lines: [
                '👦 Nam: Hello! I am Nam. Where are you from?',
                `👧 Mai: Hi Nam! I am from ${w[0]}. And you?`,
                `👦 Nam: I am from ${w[1]}. Nice to meet you!`,
                `👧 Mai: My friend is from ${w[2]}.`,
                `👦 Nam: Wonderful! I like ${w[2]}.`,
                "👧 Mai: Let's be friends!",
            ],
            question: 'Mai đến từ đâu?',
            options: [`${w[0]}`, `${w[1]}`, `${w[2]}`],
            correct: 0,
        },
    }),
};

function buildTheme(theme) {
    const words = pickWords(theme, 8);
    if (words.length < 6) return { theme, words, skip: true };
    const d = words.map((w) => disp(w, theme.template));
    const t = TEMPLATES[theme.template](d);
    const audio = t.dialogue.lines.map((l) => l.replace(/^.*?:\s*/, '')); // strip "👦 Nam: "
    // "Hoạt cảnh" scene: setting emoji + the 3 conversation items + the two characters, so the
    // child sees the situation at a glance before reading the dialogue.
    const setting = SETTINGS[theme.template] || { set: '💬', cap: 'Nam và Mai trò chuyện' };
    const sceneEmojis = words
        .slice(0, 3)
        .map((w) => EmojiMap.get(w.en))
        .filter(Boolean);
    const scene = (setting.set + ' ' + sceneEmojis.join(' ') + ' 👦👧').trim();
    return {
        theme,
        obj: {
            id: theme.id,
            title: theme.title,
            icon: theme.icon,
            words,
            phrases: t.phrases,
            dialogue: {
                scene: scene,
                sceneCaption: setting.cap,
                lines: t.dialogue.lines,
                audioLines: audio,
                question: t.dialogue.question,
                options: t.dialogue.options,
                correct: t.dialogue.correct,
            },
        },
    };
}

// ---- run ----------------------------------------------------------------------------------
const built = [];
const report = [];
for (const theme of THEMES) {
    const r = buildTheme(theme);
    if (r.skip) {
        report.push(`  SKIP  ${theme.id.padEnd(16)} only ${r.words.length} emoji words`);
        continue;
    }
    built.push(r.obj);
    report.push(
        `  OK    ${theme.id.padEnd(16)} ${String(r.obj.words.length)} words: ${r.obj.words.map((w) => w.en).join(', ')}`
    );
}

const header =
    '// AUTO-GENERATED by scripts/build-theme-course.js — do not edit by hand.\n' +
    '// Context-first theme lessons built from the OLD VOCAB_BANK (emoji-verified) + templated\n' +
    '// phrases/dialogue. Same shape as data/theme-lessons.js THEMES; merged in at load time.\n';
const out =
    header +
    '(function () {\n  window.ThemeCourse = ' +
    JSON.stringify(built, null, 1) +
    ';\n})();\n';
fs.writeFileSync(path.join(ROOT, 'data/theme-course.js'), out);

console.log(report.join('\n'));
console.log(`\nGenerated ${built.length}/${THEMES.length} themes -> data/theme-course.js`);
