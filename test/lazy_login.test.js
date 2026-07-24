// Regression test for the lazy-load login crash: loadLocalPosition() ran during completeLogin
// BEFORE the current chapter's chunk was fetched, so units[idx] was a stub (lessons:[]) and
// clamping the saved position read `lessons[-1].exercises` -> TypeError -> login hung.
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
const localStore = {};
const sandbox = {
    DuoClone,
    window: {},
    document: { getElementById: () => null },
    localStorage: {
        getItem: (k) => (k in localStore ? localStore[k] : null),
        setItem: (k, v) => {
            localStore[k] = v;
        },
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
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets/js/app-misc.js'), 'utf8'), sandbox, { filename: 'app-misc.js' });
const P = sandbox.DuoClone.prototype;
ok(typeof P.loadLocalPosition === 'function', 'loadLocalPosition attached');

const stub = () => ({ title: 'Stub', lessons: [], __stub: true });
const real = () => ({ title: 'Real', lessons: [{ exercises: [{}, {}, {}] }, { exercises: [{}] }] });

function ctx(units, position) {
    return {
        state: {
            courseData: { units },
            stats: position ? { position } : {},
            currentUnitIdx: 0,
            currentLessonIdx: 0,
            currentExIdx: 0,
            profile: { id: 'u1' },
            reviewQueue: [],
            reviewMode: false,
        },
        loadLocalPosition: P.loadLocalPosition,
        saveLocalPosition() {},
        updateNav() {},
    };
}

console.log('\n== a stub (unloaded) target unit does NOT crash login ==');
{
    const units = [];
    for (let i = 0; i < 10; i++) units.push(stub());
    const t = ctx(units, { u: 5, l: 2, e: 3 }); // server further than 0/0/0
    let threw = false;
    try {
        t.loadLocalPosition('u1');
    } catch (e) {
        threw = true;
        console.log('    threw: ' + e.message);
    }
    ok(!threw, 'loadLocalPosition does not throw on a lazy stub unit (the login-hang bug)');
    ok(t.state.currentUnitIdx === 5, 'adopts the server unit index');
    ok(t.state.currentLessonIdx === 2 && t.state.currentExIdx === 3, 'adopts saved lesson/ex as-is when the unit is an unloaded stub');
}

console.log('\n== a loaded unit still clamps an over-range saved position ==');
{
    const units = [];
    for (let i = 0; i < 10; i++) units.push(stub());
    units[5] = real(); // loaded: 2 lessons, lesson0 has 3 exercises
    const t = ctx(units, { u: 5, l: 9, e: 9 }); // wildly over-range
    t.loadLocalPosition('u1');
    ok(t.state.currentUnitIdx === 5, 'unit adopted');
    ok(t.state.currentLessonIdx === 1, 'lessonIdx clamped to last real lesson (1)');
    ok(t.state.currentExIdx === 0, 'exIdx clamped to last exercise of that lesson (lesson1 has 1 → idx 0)');
}

console.log('\n== no server position: no crash, keeps defaults ==');
{
    const units = [stub(), stub()];
    const t = ctx(units, null);
    let threw = false;
    try {
        t.loadLocalPosition('u1');
    } catch (e) {
        threw = true;
    }
    ok(!threw, 'no-server-position path does not throw');
    ok(t.state.currentUnitIdx === 0, 'stays at default unit');
}

console.log(`\n=========================================\nRESULT: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
