// Regression: IELTS Speaking reuses startRecording(), whose finalize() used to arm the
// footer "KIỂM TRA" button (wired to the main-lesson checkAnswer). Clicking it jumped the
// user into the main lesson. checkAnswer() must now no-op while state.ieltsSpeaking is set.
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');
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
const sandbox = {
    DuoClone,
    shuffleArray: (a) => a.slice(),
    getRankInfo: () => ({ difficulty: 1 }),
    console,
    Math,
    Object,
    Array,
    String,
    JSON,
    Date,
    window: {},
    document: { getElementById: () => null },
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets/js/app-lesson.js'), 'utf8'), sandbox, { filename: 'app-lesson.js' });
const P = sandbox.DuoClone.prototype;
ok(typeof P.checkAnswer === 'function', 'checkAnswer attached');

(async function () {
    console.log('\n== checkAnswer no-ops during IELTS Speaking (no jump to main lesson) ==');
    {
        let exReached = false;
        const t = {
            state: { ieltsSpeaking: { part: 1, transcripts: {} } },
            getCurrentExercise: () => {
                exReached = true;
                return null;
            },
            checkAnswer: P.checkAnswer,
        };
        let threw = false;
        try {
            await t.checkAnswer();
        } catch (e) {
            threw = true;
        }
        ok(!threw, 'checkAnswer does not throw during IELTS speaking');
        ok(exReached === false, 'checkAnswer returns BEFORE touching the lesson (getCurrentExercise never called)');
    }

    console.log('\n== control: without ieltsSpeaking, checkAnswer proceeds into the lesson flow ==');
    {
        let exReached = false;
        const t = {
            state: {},
            getCurrentExercise: () => {
                exReached = true;
                return null; // may throw later on null.type — we only assert it was reached
            },
            checkAnswer: P.checkAnswer,
        };
        try {
            await t.checkAnswer();
        } catch (e) {
            /* expected: null exercise trips later logic; irrelevant to this assertion */
        }
        ok(exReached === true, 'normal context still enters the lesson answer flow');
    }

    console.log(`\n=========================================\nRESULT: ${PASS} passed, ${FAIL} failed`);
    process.exit(FAIL ? 1 : 0);
})();
