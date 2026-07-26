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
vm.runInContext(fs.readFileSync(path.join(ROOT, 'data/vocab-bank.js'), 'utf8') + ';globalThis.__V=VOCAB_BANK;', sb);
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
    { id: 'gen_food', title: 'Món ăn & Đồ uống', icon: '🍜', groups: ['food', 'drink'], template: 'food' },
    { id: 'gen_clothing', title: 'Quần áo', icon: '👕', groups: ['clothing'], template: 'wear' },
    { id: 'gen_vehicle', title: 'Xe cộ', icon: '🚗', groups: ['vehicle'], template: 'go' },
    { id: 'gen_place', title: 'Nơi chốn', icon: '🏙️', groups: ['place'], template: 'like' },
    { id: 'gen_furniture', title: 'Đồ trong nhà', icon: '🛋️', groups: ['furniture'], template: 'like' },
    { id: 'gen_kitchen', title: 'Nhà bếp', icon: '🍽️', groups: ['kitchen'], template: 'like' },
    { id: 'gen_object', title: 'Đồ vật quanh bé', icon: '🎒', groups: ['object'], template: 'like' },
    { id: 'gen_body', title: 'Cơ thể', icon: '🖐️', groups: ['body'], template: 'like' },
    { id: 'gen_family', title: 'Gia đình', icon: '👪', groups: ['family'], template: 'like' },
    { id: 'gen_jobs', title: 'Nghề nghiệp', icon: '👩‍🏫', groups: ['job'], template: 'like' },
    { id: 'gen_nature', title: 'Thiên nhiên', icon: '🌳', groups: ['nature'], template: 'like' },
    { id: 'gen_sport', title: 'Thể thao', icon: '⚽', groups: ['sport'], template: 'activity' },
    { id: 'gen_music', title: 'Âm nhạc & Nhạc cụ', icon: '🎵', groups: ['music'], template: 'like' },
    { id: 'gen_toys', title: 'Đồ chơi', icon: '🧸', groups: ['toy'], template: 'like' },
    { id: 'gen_countries', title: 'Quốc gia', icon: '🏳️', groups: ['country'], template: 'from' },
];

// Inherent-plural nouns that break singular templates ("This is my pants" / "The noodles is
// good"). They stay in the theme for picture drills but are kept OUT of the sentence slots.
const PLURAL = new Set([
    'pants', 'jeans', 'shorts', 'trousers', 'noodles', 'glasses', 'sunglasses', 'scissors',
    'clothes', 'socks', 'boots', 'gloves', 'chopsticks', 'stairs', 'headphones', 'fries',
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
const TEMPLATES = {
    // sports/activities: no article ("I like swimming", not "the swimming")
    activity: (w) => ({
        phrases: [`I like ${w[0]}.`, `I like ${w[1]}.`, `${cap(w[2])} is fun!`],
        dialogue: {
            lines: ['👧 Mai: What do you like?', `👦 Nam: I like ${w[0]}. And you?`, `👧 Mai: I like ${w[1]}.`, "👦 Nam: That's fun!"],
            question: 'Mai thích môn nào?',
            options: [`${w[1]}`, `${w[0]}`, `${w[2]}`], correct: 0,
        },
    }),
    like: (w) => ({
        phrases: [`I like the ${w[0]}.`, `Look at the ${w[1]}!`, `This is the ${w[2]}.`],
        dialogue: {
            lines: ['👧 Mai: What do you like?', `👦 Nam: I like the ${w[0]}. And you?`, `👧 Mai: I like the ${w[1]}.`, '👦 Nam: Nice!'],
            question: 'Mai thích cái nào?',
            options: [`the ${w[1]}`, `the ${w[0]}`, `the ${w[2]}`], correct: 0,
        },
    }),
    food: (w) => ({
        phrases: [`I like the ${w[0]}.`, `I eat the ${w[1]}.`, `The ${w[2]} is good.`],
        dialogue: {
            lines: ['👦 Nam: I am hungry!', `👧 Mai: Me too. I like the ${w[0]}.`, `👦 Nam: I like the ${w[1]}.`, "👧 Mai: Let's eat together!"],
            question: 'Mai thích món nào?',
            options: [`the ${w[0]}`, `the ${w[1]}`, `the ${w[2]}`], correct: 0,
        },
    }),
    wear: (w) => ({
        phrases: [`I like my ${w[0]}.`, `Look at my ${w[1]}!`, `This is my ${w[2]}.`],
        dialogue: {
            lines: [`👧 Mai: I like my ${w[0]}.`, `👦 Nam: Nice! I like my ${w[1]}.`, `👧 Mai: Cool! And my ${w[2]}?`, '👦 Nam: I like it too!'],
            question: 'Mai thích gì đầu tiên?',
            options: [`my ${w[0]}`, `my ${w[1]}`, `my ${w[2]}`], correct: 0,
        },
    }),
    go: (w) => ({
        phrases: [`I go by ${w[0]}.`, `Look at the ${w[1]}!`, `I like the ${w[2]}.`],
        dialogue: {
            lines: ['👧 Mai: How do you go to school?', `👦 Nam: I go by ${w[0]}. And you?`, `👧 Mai: I go by ${w[1]}.`, "👦 Nam: That's fun!"],
            question: 'Mai đi học bằng gì?',
            options: [`${w[1]}`, `${w[0]}`, `${w[2]}`], correct: 0,
        },
    }),
    from: (w) => ({
        phrases: [`I am from ${w[0]}.`, `This is ${w[1]}.`, `I like ${w[2]}.`],
        dialogue: {
            lines: ['👦 Nam: Where are you from?', `👧 Mai: I am from ${w[0]}. And you?`, `👦 Nam: I am from ${w[1]}.`, '👧 Mai: Nice to meet you!'],
            question: 'Nam đến từ đâu?',
            options: [`${w[1]}`, `${w[0]}`, `${w[2]}`], correct: 0,
        },
    }),
};

function buildTheme(theme) {
    const words = pickWords(theme, 8);
    if (words.length < 6) return { theme, words, skip: true };
    const d = words.map((w) => disp(w, theme.template));
    const t = TEMPLATES[theme.template](d);
    const audio = t.dialogue.lines.map((l) => l.replace(/^.*?:\s*/, '')); // strip "👦 Nam: "
    return {
        theme,
        obj: {
            id: theme.id, title: theme.title, icon: theme.icon,
            words,
            phrases: t.phrases,
            dialogue: {
                lines: t.dialogue.lines, audioLines: audio,
                question: t.dialogue.question, options: t.dialogue.options, correct: t.dialogue.correct,
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
    report.push(`  OK    ${theme.id.padEnd(16)} ${String(r.obj.words.length)} words: ${r.obj.words.map((w) => w.en).join(', ')}`);
}

const header =
    '// AUTO-GENERATED by scripts/build-theme-course.js — do not edit by hand.\n' +
    '// Context-first theme lessons built from the OLD VOCAB_BANK (emoji-verified) + templated\n' +
    '// phrases/dialogue. Same shape as data/theme-lessons.js THEMES; merged in at load time.\n';
const out = header + '(function () {\n  window.ThemeCourse = ' + JSON.stringify(built, null, 1) + ';\n})();\n';
fs.writeFileSync(path.join(ROOT, 'data/theme-course.js'), out);

console.log(report.join('\n'));
console.log(`\nGenerated ${built.length}/${THEMES.length} themes -> data/theme-course.js`);
