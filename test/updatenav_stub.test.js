// Regression: updateNav() also read a stub unit's lesson.exercises during login (called at
// the tail of loadLocalPosition), crashing right after the loadLocalPosition fix. It must
// tolerate a lazy stub unit and show a neutral progress bar until the chunk loads.
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
const sandbox = { DuoClone, document: { getElementById: () => null, querySelector: () => null }, console, Math, Object, Array, String, Date };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets/js/app-home.js'), 'utf8'), sandbox, { filename: 'app-home.js' });
const P = sandbox.DuoClone.prototype;
ok(typeof P.updateNav === 'function', 'updateNav attached');

function ctx(unit) {
    return {
        state: { mode: 'curriculum', currentUnitIdx: 5, currentLessonIdx: 2, currentExIdx: 1, hearts: 10, streak: 0, xp: 0, courseData: { units: { 5: unit, length: 10 } } },
        ui: { progress: { style: {} }, hearts: {}, streak: {}, xp: {} },
        updateNav: P.updateNav,
        updateRankBadge() {},
        refreshHomeGreeting() {},
    };
}

console.log('\n== updateNav does not crash on a lazy stub unit ==');
{
    const t = ctx({ title: 'Stub', lessons: [], __stub: true });
    let threw = false;
    try {
        t.updateNav();
    } catch (e) {
        threw = true;
        console.log('    threw: ' + e.message);
    }
    ok(!threw, 'updateNav tolerates a stub unit (the second login-hang crash)');
    ok(t.ui.progress.style.width === '0%', 'stub → neutral 0% progress bar');
    ok(t.ui.xp.innerText === 0 && t.ui.hearts.innerText === 10, 'still updates hearts/xp/streak');
}

console.log('\n== updateNav computes real progress once the unit is loaded ==');
{
    // ctx uses currentLessonIdx 2, currentExIdx 1 → need lesson index 2 with 4 exercises.
    const t = ctx({ title: 'Real', lessons: [{ exercises: [{}] }, { exercises: [{}] }, { exercises: [{}, {}, {}, {}] }] });
    t.updateNav();
    ok(t.ui.progress.style.width === '25%', 'currentExIdx 1 of 4 → 25% progress'); // current/total = 1/4
}

console.log('\n== a missing unit (past course end) → full bar, no crash ==');
{
    const t = ctx(undefined);
    let threw = false;
    try {
        t.updateNav();
    } catch (e) {
        threw = true;
    }
    ok(!threw && t.ui.progress.style.width === '100%', 'missing unit → 100%, no crash');
}

console.log(`\n=========================================\nRESULT: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
