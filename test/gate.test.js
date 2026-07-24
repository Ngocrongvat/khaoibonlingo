// Cluster B test: chapter gate test logic (aggregate queue, pass/fail XP + advance,
// routing via continueAfterLesson).
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
const el = () => ({
    addEventListener() {},
    innerHTML: '',
    classList: { add() {}, remove() {} },
    style: {},
});
const sandbox = {
    DuoClone,
    shuffleArray: (a) => a.slice(),
    getRankInfo: () => ({ difficulty: 1 }),
    getMascotSvg: () => '<svg>',
    console,
    Math,
    Object,
    Array,
    String,
    JSON,
    Date,
    window: {},
    document: { getElementById: () => el() },
};
vm.createContext(sandbox);
vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'assets/js/app-lesson.js'), 'utf8'),
    sandbox,
    { filename: 'app-lesson.js' }
);
const P = sandbox.DuoClone.prototype;
ok(
    [
        'buildChapterGateQueue',
        'startChapterGate',
        'finishChapterGate',
        'nextGateExercise',
        'continueAfterLesson',
        'advanceChapterAfterGate',
    ].every((k) => typeof P[k] === 'function'),
    'all gate methods attached'
);

function fake(over) {
    const t = {
        state: {
            currentUnitIdx: 2,
            currentLessonIdx: 4,
            currentExIdx: 0,
            xp: 100,
            weeklyXp: 100,
            pendingChapterGate: 2,
            mode: 'curriculum',
            practiceQueue: [],
            gateCorrect: 0,
            stats: {},
            courseData: {
                settings: { xp_per_lesson: 10 },
                units: new Array(50).fill({ lessons: [] }),
            },
        },
        ui: {
            container: el(),
            checkBtn: { disabled: false, classList: { add() {}, remove() {} } },
            skipBtn: { style: {} },
        },
        bigCelebrateMascotHtml: () => '<m>',
        playBigCelebration() {},
        syncLeaderboardScore() {},
        checkBadges() {},
        renderLesson() {
            this._calls = this._calls || [];
            this._calls.push('renderLesson');
        },
        renderCourseComplete() {
            (this._calls = this._calls || []).push('courseComplete');
        },
        renderHomeDashboard() {},
        resetSessionAnswers() {},
        saveUserProgress() {},
        startChapterGate() {
            (this._calls = this._calls || []).push('startGate');
        },
        // real methods under test:
        finishChapterGate: P.finishChapterGate,
        advanceChapterAfterGate: P.advanceChapterAfterGate,
        continueAfterLesson: P.continueAfterLesson,
        buildChapterGateQueue: P.buildChapterGateQueue,
        nextGateExercise: P.nextGateExercise,
    };
    Object.assign(t.state, (over && over.state) || {});
    return t;
}

console.log('\n== buildChapterGateQueue: aggregate + dedupe + cap 12 ==');
{
    const t = fake();
    // 5 lessons each yielding 5 review items; some duplicates across lessons.
    t.buildLessonReviewQueue = (unit, i) =>
        Array.from({ length: 5 }, (_, k) => ({
            type: 'multiple_choice',
            question: `q${(i * 5 + k) % 20}`,
        }));
    const unit = { lessons: new Array(5).fill({}) };
    const q = t.buildChapterGateQueue(unit);
    ok(q.length === 12, `capped at 12 (got ${q.length})`);
    const qs = new Set(q.map((x) => x.question));
    ok(qs.size === q.length, 'no duplicate questions in the gate queue');
}

console.log('\n== finishChapterGate PASS (>=70%) ==');
{
    const t = fake({
        state: {
            practiceQueue: new Array(10).fill({}),
            gateCorrect: 8,
            currentUnitIdx: 2,
            xp: 100,
            weeklyXp: 100,
        },
    });
    t.finishChapterGate();
    ok(t.state.xp === 120, `pass awards double lesson XP (+20): xp=${t.state.xp}`);
    ok(t.state.weeklyXp === 120, 'weekly XP also +20');
    ok(t.state.currentUnitIdx === 3, `chapter advanced (2 -> ${t.state.currentUnitIdx})`);
    ok(t.state.pendingChapterGate === null, 'pending gate cleared on pass');
    ok(
        t.state.currentLessonIdx === 0 && t.state.currentExIdx === 0,
        'new chapter starts at lesson 1'
    );
    ok(t.state.mode === 'curriculum', 'back to curriculum mode');
}

console.log('\n== finishChapterGate FAIL (<70%) ==');
{
    const t = fake({
        state: {
            practiceQueue: new Array(10).fill({}),
            gateCorrect: 6,
            currentUnitIdx: 2,
            xp: 100,
        },
    });
    t.finishChapterGate();
    ok(t.state.xp === 100, 'fail awards no XP');
    ok(t.state.currentUnitIdx === 2, 'chapter NOT advanced on fail');
    ok(t.state.pendingChapterGate === 2, 'pending gate stays (must retry)');
}

console.log('\n== boundary: exactly 70% passes ==');
{
    const t = fake({
        state: { practiceQueue: new Array(10).fill({}), gateCorrect: 7, currentUnitIdx: 2, xp: 0 },
    });
    t.finishChapterGate();
    ok(t.state.currentUnitIdx === 3 && t.state.xp === 20, '70% passes and awards +20');
}

console.log('\n== continueAfterLesson routes to the gate when pending ==');
{
    const t = fake({ state: { pendingChapterGate: 2 } });
    t.continueAfterLesson();
    ok((t._calls || []).includes('startGate'), 'pending gate -> startChapterGate');
    const t2 = fake({ state: { pendingChapterGate: null, currentUnitIdx: 3 } });
    t2.continueAfterLesson();
    ok((t2._calls || []).includes('renderLesson'), 'no pending gate -> next lesson');
}

console.log('\n== nextGateExercise advances then finalizes ==');
{
    const t = fake({
        state: { practiceQueue: [{}, {}], practiceIdx: 0, gateCorrect: 2, currentUnitIdx: 2 },
    });
    t.renderLesson = function () {
        (this._calls = this._calls || []).push('renderLesson');
    };
    t.nextGateExercise(); // idx 0 -> 1, still in range
    ok(
        t.state.practiceIdx === 1 && (t._calls || []).includes('renderLesson'),
        'mid-gate advances to next question'
    );
    t.nextGateExercise(); // idx 1 -> 2, end -> finishChapterGate (pass, 2/2)
    ok(t.state.currentUnitIdx === 3, 'last question finalizes the gate (passed 2/2 -> advanced)');
}

console.log(`\n=========================================\nRESULT: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
