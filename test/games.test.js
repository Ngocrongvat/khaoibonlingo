// Headless test for Phase 3: level-aware games. Loads games.js with a DOM stub that
// funnels ALL rendered text into a shared sink, renders each game at difficulty 1
// (beginner) vs 3, and checks beginners never see "hard" (difficulty-3) words + get
// relaxed timers.
'use strict';
const fs = require('fs'),
    vm = require('vm'),
    path = require('path');
let PASS = 0,
    FAIL = 0;
const ok = (c, m) => {
    if (c) PASS++;
    else {
        FAIL++;
        console.log('  ✗ FAIL: ' + m);
    }
};

function mkWords(prefix, diff, n, topic) {
    return Array.from({ length: n }, (_, i) => ({
        en: `${prefix}_${i}`,
        vi: `${prefix}vi_${i}`,
        difficulty: diff,
        topic,
    }));
}
const VOCAB_BANK = {
    nouns: [
        ...mkWords('zeasy', 1, 6, 'Food'),
        ...mkWords('zeasyA', 1, 6, 'Animals'),
        ...mkWords('zeasyC', 1, 6, 'Colors'),
        ...mkWords('zhard', 3, 6, 'Business'),
        ...mkWords('zhardX', 3, 6, 'Science'),
        ...mkWords('zhardY', 3, 6, 'Law'),
    ],
    verbs: [...mkWords('veasy', 1, 8, 'Verbs'), ...mkWords('vhard', 3, 8, 'Verbs')],
    adjectives: [...mkWords('aeasy', 1, 8, 'Adj'), ...mkWords('ahard', 3, 8, 'Adj')],
    adverbs: [],
    pronouns: [],
    connectors: [],
    synonyms: [],
};

let SINK = [];
function makeEl() {
    const el = {
        _h: '',
        set innerHTML(v) {
            this._h = String(v);
            SINK.push(String(v));
        },
        get innerHTML() {
            return this._h;
        },
        set textContent(v) {
            this._h = String(v);
            SINK.push(String(v));
        },
        get textContent() {
            return this._h;
        },
        querySelectorAll: () => [],
        querySelector: () => makeEl(),
        addEventListener() {},
        classList: {
            add() {},
            remove() {},
            contains() {
                return false;
            },
        },
        style: {},
        dataset: {},
        appendChild() {},
        removeAttribute() {},
        setAttribute() {},
        focus() {},
    };
    return el;
}
const documentStub = {
    createElement: () => makeEl(),
    getElementById: () => makeEl(),
    querySelector: () => makeEl(),
    querySelectorAll: () => [],
    addEventListener() {},
};
const sandbox = {
    VOCAB_BANK,
    PICTURE_WORD_BANK: [],
    document: documentStub,
    window: { MascotVoice: { play() {} } },
    setInterval: () => 0,
    clearInterval: () => {},
    setTimeout: () => 0,
    console,
    Math,
    Object,
    Array,
    String,
    JSON,
    Date,
    parseInt,
    isNaN,
    Number,
};
vm.createContext(sandbox);
const src = fs.readFileSync(path.join(__dirname, '..', 'assets/js/games.js'), 'utf8');
vm.runInContext(src, sandbox, { filename: 'games.js' });
const Games = vm.runInContext('Games', sandbox);

function renderText(fn, difficulty) {
    SINK = [];
    const c = makeEl();
    let err = null;
    try {
        fn(c, { onRoundEnd() {}, onProgress() {}, onExit() {}, difficulty });
    } catch (e) {
        err = e.message;
    }
    return { err, html: c._h + ' ' + SINK.join(' ') };
}

console.log('== Games module loads ==');
ok(Games && typeof Games.renderWordMatchGame === 'function', 'Games IIFE exposes render functions');

console.log('\n== Beginner (difficulty 1) sees NO hard words ==');
for (const [name, fn] of [
    ['WordMatch', Games.renderWordMatchGame],
    ['OddOneOut', Games.renderOddOneOutGame],
    ['Reflex', Games.renderReflexGame],
]) {
    const r = renderText(fn, 1);
    ok(!r.err, `${name} renders at difficulty 1 without error${r.err ? ' (' + r.err + ')' : ''}`);
    ok(/zeasy|veasy|aeasy/.test(r.html), `${name}: does show easy words`);
    ok(
        !/zhard|vhard|ahard/.test(r.html),
        `${name}: NO hard (difficulty-3) words shown to a beginner`
    );
}

console.log('\n== Non-beginner (difficulty 3) uses the full pool ==');
let sawHard = false;
for (let i = 0; i < 20 && !sawHard; i++) {
    if (/zhard|vhard|ahard/.test(renderText(Games.renderWordMatchGame, 3).html)) sawHard = true;
}
ok(sawHard, 'WordMatch at difficulty 3 draws from the full pool (hard words can appear)');

console.log('\n== Relaxed timers for beginners ==');
ok(
    /wm-timer">\s*75/.test(renderText(Games.renderWordMatchGame, 1).html),
    'WordMatch beginner clock is 75s'
);
ok(
    /wm-timer">\s*45/.test(renderText(Games.renderWordMatchGame, 3).html),
    'WordMatch normal clock is 45s'
);

console.log('\n== filterDiff fallback: tiny easy pool falls back to full ==');
const tinyBank = {
    nouns: [...mkWords('zeasy', 1, 3, 'Food'), ...mkWords('zhard', 3, 30, 'Biz')],
    verbs: [],
    adjectives: [],
    adverbs: [],
    pronouns: [],
    connectors: [],
    synonyms: [],
};
const sb2 = Object.assign({}, sandbox, { VOCAB_BANK: tinyBank });
vm.createContext(sb2);
vm.runInContext(src, sb2, { filename: 'games.js' });
SINK = [];
const c2 = makeEl();
let crashed = false;
try {
    vm.runInContext('Games', sb2).renderWordMatchGame(c2, {
        onRoundEnd() {},
        onProgress() {},
        onExit() {},
        difficulty: 1,
    });
} catch (e) {
    crashed = true;
}
const fbHtml = c2._h + ' ' + SINK.join(' ');
ok(!crashed, 'WordMatch still builds a round when the easy pool is too small (fallback works)');
ok(/zeasy|zhard/.test(fbHtml), 'a full round is still rendered via fallback (board not empty)');

console.log(`\n=========================================\nRESULT: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
