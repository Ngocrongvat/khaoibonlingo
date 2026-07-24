// Cluster C test: presentResult routing, correctAnswerText, and the catch-mascot flow
// (spawns, hops within viewport, catching calls closeModal) — via a DOM stub.
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

function DuoClone() {}
DuoClone.prototype = {};
let BODY = [];
function el() {
    const listeners = {};
    return {
        _id: '',
        innerHTML: '',
        className: '',
        style: {},
        children: [],
        _listeners: listeners,
        setAttribute(k, v) {
            if (k === 'id') this._id = v;
        },
        getAttribute() {
            return null;
        },
        set id(v) {
            this._id = v;
            BODY.push(this);
        },
        get id() {
            return this._id;
        },
        classList: {
            _s: new Set(),
            add(c) {
                this._s.add(c);
            },
            remove(c) {
                this._s.delete(c);
            },
            toggle(c) {
                this._s.has(c) ? this._s.delete(c) : this._s.add(c);
            },
            contains(c) {
                return this._s.has(c);
            },
        },
        appendChild(c) {
            this.children.push(c);
        },
        remove() {
            BODY = BODY.filter((x) => x !== this);
        },
        addEventListener(ev, fn) {
            listeners[ev] = fn;
        },
        querySelector: () => null,
        querySelectorAll: () => [],
    };
}
const documentStub = {
    createElement: () => el(),
    getElementById: (id) => BODY.find((x) => x._id === id) || null,
    body: {
        appendChild(c) {
            /* element already tracked when id set */ if (!BODY.includes(c)) BODY.push(c);
        },
    },
};
const sandbox = {
    DuoClone,
    getMascotSvg: () => '<svg></svg>',
    pickRandom: (a) => a[0],
    moodParticles: () => [],
    window: { innerWidth: 400, innerHeight: 800, confetti: null },
    document: documentStub,
    setInterval: () => 123,
    clearInterval: () => {},
    setTimeout: (f) => {
        if (typeof f === 'function') f();
        return 0;
    },
    console,
    Math,
    Object,
    Array,
    String,
    JSON,
    Date,
};
vm.createContext(sandbox);
vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'assets/js/app-misc.js'), 'utf8'),
    sandbox,
    { filename: 'app-misc.js' }
);
const P = sandbox.DuoClone.prototype;
ok(
    ['presentResult', 'showCatchResult', 'spawnCatchMascot', 'correctAnswerText'].every(
        (k) => typeof P[k] === 'function'
    ),
    'catch methods attached'
);

function fake(mode, easyMode) {
    return {
        state: { mode, stats: { easyMode: !!easyMode } },
        ui: { modal: el(), modalTitle: { style: {} } },
        _calls: [],
        isBeginnerMode() {
            return false;
        },
        showResultModal() {
            this._calls.push('modal');
        },
        showCatchResult(c) {
            this._calls.push('catch:' + c);
        },
        getCurrentExercise() {
            return this._ex;
        },
        escapeHtml: (s) => String(s),
        closeModal() {
            this._calls.push('closeModal');
        },
        burstCorrect() {
            this._calls.push('burst');
        },
        playTone() {},
        spawnMascotParticles() {},
        presentResult: P.presentResult,
        correctAnswerText: P.correctAnswerText,
    };
}

console.log('\n== presentResult routing ==');
{
    const t = fake('curriculum');
    t.presentResult(true);
    ok(t._calls.includes('catch:true'), 'curriculum -> catch-the-mascot');
    for (const m of ['duel', 'practice', 'assessment', 'gate', 'placement']) {
        const t2 = fake(m);
        t2.presentResult(false);
        ok(t2._calls.includes('modal'), `${m} -> normal modal`);
    }
}

console.log('\n== correctAnswerText ==');
{
    const t = fake('curriculum');
    ok(
        t.correctAnswerText({ type: 'multiple_choice', options: ['Hello', 'Bye'], correct: 0 }) ===
            'Hello',
        'MC -> chosen option text'
    );
    ok(
        t.correctAnswerText({ type: 'translate', correct: ['I', 'am', 'happy'] }) === 'I am happy',
        'translate -> joined words'
    );
    ok(
        t.correctAnswerText({ type: 'dictation', target: 'Good morning' }) === 'Good morning',
        'dictation -> target'
    );
    ok(t.correctAnswerText(null) === '', 'null-safe');
}

console.log('\n== showCatchResult + spawnCatchMascot flow ==');
{
    BODY = [];
    const t = fake('curriculum', true); // kids mode ON
    t._ex = { type: 'multiple_choice', options: ['Hello', 'Bye'], correct: 0 };
    t.showCatchResult = P.showCatchResult;
    t.spawnCatchMascot = P.spawnCatchMascot;
    t.showResultModal = P.showResultModal;
    t.showCatchResult(false);
    ok(
        t.ui.modalTitle.style.color === 'var(--duo-red)',
        'wrong sets modal title red (closeModal detects it)'
    );
    const mascot = BODY.find((x) => x._id === 'catch-mascot');
    const banner = BODY.find((x) => x._id === 'catch-result-banner');
    ok(!!mascot && !!banner, 'catch mascot + verdict banner created');
    ok(
        parseInt(mascot.style.left) >= -90 && !isNaN(parseInt(mascot.style.left)),
        'mascot positioned'
    );
    mascot._listeners.click();
    ok(t._calls.includes('closeModal'), 'catching the mascot proceeds via closeModal');
    ok(mascot.classList.contains('caught'), 'mascot shows caught state');
}

console.log('\n== Answer reveal gated on kids/Easy mode ==');
{
    BODY = [];
    const on = fake('curriculum', true); // kids mode ON
    on._ex = { type: 'multiple_choice', options: ['Hello', 'Bye'], correct: 0 };
    on.showCatchResult = P.showCatchResult;
    on.spawnCatchMascot = P.spawnCatchMascot;
    on.showCatchResult(false);
    const bOn = BODY.find((x) => x._id === 'catch-result-banner');
    ok(
        /Đáp án đúng/.test(bOn.innerHTML) && /Hello/.test(bOn.innerHTML),
        'kids mode ON: wrong answer reveals the correct answer'
    );

    BODY = [];
    const off = fake('curriculum', false); // kids mode OFF (advanced user, toggle off)
    off._ex = { type: 'multiple_choice', options: ['Hello', 'Bye'], correct: 0 };
    off.showCatchResult = P.showCatchResult;
    off.spawnCatchMascot = P.spawnCatchMascot;
    off.showCatchResult(false);
    const bOff = BODY.find((x) => x._id === 'catch-result-banner');
    ok(
        !/Đáp án đúng/.test(bOff.innerHTML),
        'kids mode OFF: wrong answer does NOT reveal the answer'
    );

    BODY = [];
    const beg = fake('curriculum', false);
    beg.isBeginnerMode = () => true; // first-10-chapters zone
    beg._ex = { type: 'multiple_choice', options: ['Hello', 'Bye'], correct: 0 };
    beg.showCatchResult = P.showCatchResult;
    beg.spawnCatchMascot = P.spawnCatchMascot;
    beg.showCatchResult(false);
    const bBeg = BODY.find((x) => x._id === 'catch-result-banner');
    ok(
        /Đáp án đúng/.test(bBeg.innerHTML),
        'beginner zone (auto kids mode): reveals the answer too'
    );
}

console.log(`\n=========================================\nRESULT: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
