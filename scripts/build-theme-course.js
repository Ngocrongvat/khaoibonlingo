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

// Everyday kid words that should LEAD a theme (so the sentence slots feel natural — "I go by
// car", not "I go by rocket"). VOCAB difficulty ≠ familiarity, so we float these to the front.
// Exotic words (rocket, ambulance…) still ride along for the picture drills.
const COMMON = new Set([
    // vehicles
    'car',
    'bus',
    'bike',
    'bicycle',
    'train',
    'boat',
    'plane',
    'airplane',
    'taxi',
    'truck',
    'ship',
    // animals
    'dog',
    'cat',
    'lion',
    'tiger',
    'elephant',
    'monkey',
    'bear',
    'rabbit',
    'horse',
    'cow',
    'pig',
    'duck',
    'fox',
    'sheep',
    'goat',
    'deer',
    'panda',
    // birds / sea / insects
    'bird',
    'chicken',
    'owl',
    'parrot',
    'penguin',
    'eagle',
    'fish',
    'shark',
    'whale',
    'dolphin',
    'crab',
    'turtle',
    'bee',
    'ant',
    'butterfly',
    'spider',
    'snail',
    // fruit / vegetable
    'apple',
    'banana',
    'orange',
    'grape',
    'mango',
    'watermelon',
    'strawberry',
    'lemon',
    'peach',
    'carrot',
    'potato',
    'tomato',
    'onion',
    'corn',
    'cucumber',
    'pepper',
    'mushroom',
    // food / drink
    'rice',
    'bread',
    'egg',
    'milk',
    'water',
    'noodles',
    'soup',
    'cake',
    'pizza',
    'juice',
    'tea',
    // clothing
    'shirt',
    'dress',
    'hat',
    'shoes',
    'skirt',
    'jacket',
    'pants',
    'socks',
    'cap',
    'coat',
    // body / family
    'face',
    'hair',
    'eye',
    'ear',
    'nose',
    'mouth',
    'hand',
    'arm',
    'leg',
    'foot',
    'father',
    'mother',
    'brother',
    'sister',
    'baby',
    'family',
    // home / kitchen / objects / place
    'house',
    'door',
    'window',
    'table',
    'chair',
    'bed',
    'lamp',
    'clock',
    'cup',
    'spoon',
    'fork',
    'knife',
    'plate',
    'bowl',
    'book',
    'ball',
    'key',
    'phone',
    'school',
    'park',
    'shop',
    // nature / sport / music / jobs / countries
    'sun',
    'moon',
    'star',
    'tree',
    'flower',
    'rain',
    'cloud',
    'soccer',
    'football',
    'basketball',
    'tennis',
    'swimming',
    'running',
    'guitar',
    'piano',
    'drum',
    'song',
    'teacher',
    'doctor',
    'nurse',
    'farmer',
    'cook',
    'police',
    'vietnam',
    'america',
    'japan',
    'china',
    'korea',
    'france',
    'england',
]);
const isCommon = (en) => COMMON.has(String(en).toLowerCase());

// Lesson size, and the smallest tail worth keeping as its own lesson. A group with 20 usable
// words becomes 2 lessons of 8 + a 4-word tail — that tail is folded back into the previous
// lesson rather than shipped as a stub.
const PER_LESSON = 8;
const MIN_LESSON = 6;

// Split a ranked word list into lesson-sized chunks. Because pickWords() ranks everyday words
// first, chunk 1 is always the most familiar vocabulary and later chunks get progressively more
// exotic — a natural difficulty ramp, for free.
function chunkWords(words) {
    const out = [];
    for (let i = 0; i < words.length; i += PER_LESSON) out.push(words.slice(i, i + PER_LESSON));
    if (out.length > 1 && out[out.length - 1].length < MIN_LESSON) {
        const tail = out.pop();
        out[out.length - 1] = out[out.length - 1].concat(tail);
    }
    return out.filter((c) => c.length >= MIN_LESSON);
}

// ---- word selection: bucket old-vocab words by their emoji group ---------------------------
function pickWords(theme, cap) {
    const groups = new Set(theme.groups);
    const seen = new Set();
    const out = [];
    ALL.filter((w) => groups.has(EmojiMap.groupOf(w.en))) // clean semantic bucket
        .forEach((w) => {
            const key = EmojiMap.resolveKey(w.en); // dedupe by resolved emoji key (bananas==banana)
            if (!key || seen.has(key)) return;
            seen.add(key);
            out.push({ en: w.en, vi: w.vi });
        });
    // Rank: everyday/common words first, then singular before inherent-plural, then by difficulty.
    // This keeps the sentence slots (words[0..2]) natural while exotic words still fill later
    // picture-only slots.
    const rank = (w) => (isCommon(w.en) ? 0 : 100) + (isPlural(w.en) ? 40 : 0);
    return out
        .map((w, idx) => ({ w, idx }))
        .sort((a, b) => rank(a.w) - rank(b.w) || a.idx - b.idx)
        .map((x) => x.w)
        .slice(0, cap);
}

// ---- phrase + dialogue templates (grammar-safe: "the"/"my"/"from"/"by") -------------------
function disp(w, template) {
    // keep proper nouns (countries) capitalised; lowercase common nouns for mid-sentence use
    return template === 'from' ? w.en : w.en.toLowerCase();
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Each template = the sentence pattern it teaches + TWO situations it can be played in.
// A situation carries its own "hoạt cảnh" setting (place emoji + VN caption) so the child sees
// WHERE the conversation happens. buildLesson() picks the situation by lesson part, so
// "Con vật · Phần 1" and "Phần 2" are set in different places instead of repeating one script
// 48 times. Every line is grammar-safe for its word class ("the"/"my"/"from"/"by"/no-article).
const TEMPLATES = {
    // sports/activities: no article ("I like swimming", not "the swimming")
    activity: {
        phrases: (w) => [`I like ${w[0]}.`, `I like ${w[1]}.`, `${cap(w[2])} is fun!`],
        scenes: [
            {
                set: '🏟️',
                cap: 'Ở sân chơi thể thao',
                lines: (w) => [
                    '👧 Mai: Hi Nam! What sport do you like?',
                    `👦 Nam: Hi Mai! I like ${w[0]}. And you?`,
                    `👧 Mai: I like ${w[1]}. It is fun!`,
                    `👦 Nam: Do you like ${w[2]}?`,
                    `👧 Mai: Yes! I like ${w[2]} very much.`,
                    "👦 Nam: Cool! Let's play together.",
                ],
                question: 'Nam thích môn nào?',
                options: (w) => [w[0], w[1], w[2]],
            },
            {
                set: '🏅',
                cap: 'Ngày hội thể thao ở trường',
                lines: (w) => [
                    '👦 Nam: Mai, sports day is tomorrow!',
                    `👧 Mai: I know! I will do ${w[1]}.`,
                    `👦 Nam: Really? I will do ${w[0]}.`,
                    `👧 Mai: My brother is very good at ${w[2]}.`,
                    `👦 Nam: Then he will win the ${w[2]}!`,
                    '👧 Mai: Good luck to everyone!',
                ],
                question: 'Ngày mai Nam thi môn nào?',
                options: (w) => [w[0], w[1], w[2]],
            },
        ],
    },
    like: {
        phrases: (w) => [`I like the ${w[0]}.`, `Look at the ${w[1]}!`, `This is the ${w[2]}.`],
        scenes: [
            {
                set: '💬',
                cap: 'Nam và Mai đang trò chuyện',
                lines: (w) => [
                    '👧 Mai: Hi Nam! What do you like?',
                    `👦 Nam: Hi Mai! I like the ${w[0]}. And you?`,
                    `👧 Mai: I like the ${w[1]}. It is nice.`,
                    `👦 Nam: Look! The ${w[2]} is over there.`,
                    `👧 Mai: Wow! I like the ${w[2]} too.`,
                    "👦 Nam: Me too! Let's look together.",
                ],
                question: 'Mai thích cái nào đầu tiên?',
                options: (w) => [`the ${w[1]}`, `the ${w[0]}`, `the ${w[2]}`],
            },
            {
                set: '🔦',
                cap: 'Đi khám phá cùng nhau',
                lines: (w) => [
                    '👦 Nam: Mai, come and see what I found!',
                    `👧 Mai: Oh! Is that the ${w[0]}?`,
                    `👦 Nam: Yes. And look, there is the ${w[1]} too.`,
                    `👧 Mai: Amazing. Where is the ${w[2]}?`,
                    `👦 Nam: The ${w[2]} is behind the tree.`,
                    '👧 Mai: What a wonderful day!',
                ],
                question: 'Cái gì ở sau gốc cây?',
                options: (w) => [`the ${w[2]}`, `the ${w[0]}`, `the ${w[1]}`],
            },
        ],
    },
    food: {
        phrases: (w) => [`I like the ${w[0]}.`, `I eat the ${w[1]}.`, `The ${w[2]} is good.`],
        scenes: [
            {
                set: '🍽️',
                cap: 'Ở quán ăn',
                lines: (w) => [
                    '👦 Nam: I am so hungry!',
                    `👧 Mai: Me too, Nam. I like the ${w[0]}.`,
                    `👦 Nam: I like the ${w[1]}. It is yummy.`,
                    `👧 Mai: Do you want some ${w[2]}?`,
                    `👦 Nam: Yes, please! The ${w[2]} is good.`,
                    "👧 Mai: Great! Let's eat together.",
                ],
                question: 'Mai thích món nào?',
                options: (w) => [`the ${w[0]}`, `the ${w[1]}`, `the ${w[2]}`],
            },
            {
                set: '🛒',
                cap: 'Đi chợ với mẹ',
                lines: (w) => [
                    '👧 Mai: Nam, my mum is buying food today.',
                    `👦 Nam: Nice! Please buy the ${w[1]}.`,
                    `👧 Mai: OK. We also need the ${w[0]}.`,
                    `👦 Nam: Is the ${w[2]} fresh today?`,
                    `👧 Mai: Yes, the ${w[2]} is very fresh.`,
                    "👦 Nam: Then let's take it home!",
                ],
                question: 'Nam nhờ mua món nào?',
                options: (w) => [`the ${w[1]}`, `the ${w[0]}`, `the ${w[2]}`],
            },
        ],
    },
    wear: {
        phrases: (w) => [`I like my ${w[0]}.`, `Look at my ${w[1]}!`, `This is my ${w[2]}.`],
        scenes: [
            {
                set: '🛍️',
                cap: 'Đi mua sắm quần áo',
                lines: (w) => [
                    `👧 Mai: Nam, look at my new ${w[0]}!`,
                    `👦 Nam: Wow, Mai! I like your ${w[0]}.`,
                    `👧 Mai: Thank you! I like your ${w[1]} too.`,
                    `👦 Nam: This is my favorite ${w[1]}.`,
                    `👧 Mai: And look, my ${w[2]} is new!`,
                    '👦 Nam: It is beautiful. You look great!',
                ],
                question: 'Mai khoe món nào đầu tiên?',
                options: (w) => [w[0], w[1], w[2]],
            },
            {
                set: '🎒',
                cap: 'Chuẩn bị đi học buổi sáng',
                lines: (w) => [
                    '👦 Nam: Mai, we go to school in ten minutes!',
                    `👧 Mai: Wait! Where is my ${w[1]}?`,
                    `👦 Nam: It is here. I have my ${w[0]} already.`,
                    `👧 Mai: Thank you. Is it cold? I need my ${w[2]}.`,
                    `👦 Nam: Yes, take your ${w[2]} with you.`,
                    "👧 Mai: Ready! Let's go.",
                ],
                question: 'Mai tìm món nào?',
                options: (w) => [w[1], w[0], w[2]],
            },
        ],
    },
    go: {
        phrases: (w) => [`I go by ${w[0]}.`, `Look at the ${w[1]}!`, `I like the ${w[2]}.`],
        scenes: [
            {
                set: '🚸',
                cap: 'Trên đường tới trường',
                lines: (w) => [
                    '👧 Mai: Hi Nam! How do you go to school?',
                    `👦 Nam: Hi Mai! I go by ${w[0]}. And you?`,
                    `👧 Mai: I go by ${w[1]}. It is fast.`,
                    `👦 Nam: Look at that big ${w[2]}!`,
                    `👧 Mai: Wow! I like the ${w[2]}.`,
                    '👦 Nam: Me too! See you at school.',
                ],
                question: 'Nam đi học bằng gì?',
                options: (w) => [w[0], w[1], w[2]],
            },
            {
                set: '🗺️',
                cap: 'Lên kế hoạch đi chơi xa',
                lines: (w) => [
                    '👦 Nam: Mai, my family will travel this summer.',
                    `👧 Mai: How nice! Will you go by ${w[0]}?`,
                    `👦 Nam: No, we will go by ${w[1]}. It is far.`,
                    `👧 Mai: I want to see a big ${w[2]} one day.`,
                    `👦 Nam: Me too. The ${w[2]} is amazing.`,
                    '👧 Mai: Have a safe trip!',
                ],
                question: 'Nhà Nam sẽ đi bằng gì?',
                options: (w) => [w[1], w[0], w[2]],
            },
        ],
    },
    from: {
        phrases: (w) => [`I am from ${w[0]}.`, `This is ${w[1]}.`, `I like ${w[2]}.`],
        scenes: [
            {
                set: '🌍',
                cap: 'Gặp gỡ bạn mới',
                lines: (w) => [
                    '👦 Nam: Hello! I am Nam. Where are you from?',
                    `👧 Mai: Hi Nam! I am from ${w[0]}. And you?`,
                    `👦 Nam: I am from ${w[1]}. Nice to meet you!`,
                    `👧 Mai: My friend is from ${w[2]}.`,
                    `👦 Nam: Wonderful! I like ${w[2]}.`,
                    "👧 Mai: Let's be friends!",
                ],
                question: 'Mai đến từ đâu?',
                options: (w) => [w[0], w[1], w[2]],
            },
            {
                set: '✈️',
                cap: 'Ở sân bay',
                lines: (w) => [
                    '👧 Mai: Nam, so many people at the airport today!',
                    `👦 Nam: Yes. That family is from ${w[1]}.`,
                    `👧 Mai: And those students are from ${w[0]}.`,
                    `👦 Nam: One day I want to visit ${w[2]}.`,
                    `👧 Mai: ${cap(w[2])} is beautiful. Let's go together!`,
                    '👦 Nam: It is a promise!',
                ],
                question: 'Nam muốn đi thăm nước nào?',
                options: (w) => [w[2], w[0], w[1]],
            },
        ],
    },
};

// One lesson from one chunk of a theme's words. `part` is 1-based; part 1 keeps the parent
// theme's original id so existing links/saved state stay valid.
function buildLesson(theme, words, part, totalParts) {
    const d = words.map((w) => disp(w, theme.template));
    const t = TEMPLATES[theme.template];
    // Rotate the situation by lesson part, so Phần 1 and Phần 2 of the same theme play out
    // somewhere different instead of replaying one script across all 48 lessons.
    const sc = t.scenes[(part - 1) % t.scenes.length];
    const lines = sc.lines(d);
    const audio = lines.map((l) => l.replace(/^.*?:\s*/, '')); // strip "👦 Nam: "
    // "Hoạt cảnh" scene: setting emoji + the 3 conversation items + the two characters, so the
    // child sees the situation at a glance before reading the dialogue.
    const sceneEmojis = words
        .slice(0, 3)
        .map((w) => EmojiMap.get(w.en))
        .filter(Boolean);
    const scene = (sc.set + ' ' + sceneEmojis.join(' ') + ' 👦👧').trim();
    return {
        theme,
        obj: {
            id: part === 1 ? theme.id : theme.id + '_' + part,
            title: totalParts > 1 ? theme.title + ' · Phần ' + part : theme.title,
            icon: theme.icon,
            words,
            phrases: t.phrases(d),
            dialogue: {
                scene: scene,
                setting: sc.set,
                sceneCaption: sc.cap,
                lines: lines,
                audioLines: audio,
                question: sc.question,
                options: sc.options(d),
                correct: 0,
            },
        },
    };
}

// ---- run ----------------------------------------------------------------------------------
const built = [];
const report = [];
for (const theme of THEMES) {
    // Take EVERY emoji-verified word the group has, not just the first 8. Capping at one
    // lesson per group was leaving 56% of the usable old vocabulary untaught; chunking turns
    // the surplus into follow-on lessons instead of throwing it away.
    const all = pickWords(theme, Infinity);
    const chunks = chunkWords(all);
    if (!chunks.length) {
        report.push(`  SKIP  ${theme.id.padEnd(16)} only ${all.length} emoji words`);
        continue;
    }
    chunks.forEach((words, i) => {
        const r = buildLesson(theme, words, i + 1, chunks.length);
        built.push(r.obj);
        report.push(
            `  OK    ${r.obj.id.padEnd(18)} ${String(words.length).padStart(2)} words: ${words.map((w) => w.en).join(', ')}`
        );
    });
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
