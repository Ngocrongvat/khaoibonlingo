// Lazy course-loader test: builds COURSE_DATA from a synthetic manifest (stub array,
// correct length, settings), then drives ensure()/prefetch()/hydrate() by simulating the
// on-demand chunk <script> loads through a document stub. No browser, no deps.
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

const appended = [];
function makeSandbox() {
    const documentStub = {
        createElement: () => ({ onload: null, onerror: null, async: false, src: '' }),
        head: { appendChild: (s) => appended.push(s) },
    };
    const win = {
        COURSE_MANIFEST: {
            v: 'testver',
            chunkSize: 2,
            unitCount: 5,
            settings: { xp_per_lesson: 7 },
            units: [
                { t: 'Alpha', n: 1 },
                { t: 'Beta', n: 2 },
                { t: 'Gamma', n: 1 },
                { t: 'Delta', n: 3 },
                { t: 'Epsilon', n: 1 },
            ],
        },
    };
    const sandbox = { window: win, document: documentStub, Promise, Array, Math, String, Object, JSON, console };
    sandbox.self = sandbox;
    vm.createContext(sandbox);
    return sandbox;
}

// Resolve the last appended <script> as a successful chunk load carrying `unitsForChunk`.
function fireLoad(win, chunkIdx, unitsForChunk) {
    win.COURSE_CHUNKS = win.COURSE_CHUNKS || {};
    win.COURSE_CHUNKS[chunkIdx] = unitsForChunk;
    const s = appended[appended.length - 1];
    s.onload();
}

(async function () {
    const sb = makeSandbox();
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets/js/course-loader.js'), 'utf8'), sb, { filename: 'course-loader.js' });
    const win = sb.window;
    const CL = win.CourseLoader;

    console.log('\n== COURSE_DATA built from manifest (stubs) ==');
    ok(!!win.COURSE_DATA, 'COURSE_DATA created');
    ok(win.COURSE_DATA.units.length === 5, 'units.length === full manifest count (5), not what is loaded');
    ok(win.COURSE_DATA.settings.xp_per_lesson === 7, 'settings carried from manifest');
    ok(win.COURSE_DATA.units[3].title === 'Delta' && win.COURSE_DATA.units[3].__stub === true, 'stub carries title + __stub flag');
    ok(Array.isArray(win.COURSE_DATA.units[0].lessons) && win.COURSE_DATA.units[0].lessons.length === 0, 'stub lessons is an empty array (safe for .map/.length)');
    ok(win.COURSE_DATA.units.map((u) => u.title).join(',') === 'Alpha,Beta,Gamma,Delta,Epsilon', 'path-strip .map(title) works on stubs');

    console.log('\n== isLoaded bounds ==');
    ok(CL.isLoaded(-1) === true && CL.isLoaded(5) === true && CL.isLoaded(99) === true, 'out-of-range treated as loaded (never blocks a render)');
    ok(CL.isLoaded(0) === false && CL.isLoaded(3) === false, 'in-range chunks start not-loaded');

    console.log('\n== ensure() loads the right chunk + hydrates in place ==');
    appended.length = 0;
    const realGamma = { title: 'Gamma REAL', description: 'd', lessons: [{ id: 1 }] };
    const realDelta = { title: 'Delta REAL', description: 'd', lessons: [{ id: 2 }, { id: 3 }, { id: 4 }] };
    const p = CL.ensure(3); // unit 3 -> chunk 1 (units 2,3)
    const p2 = CL.ensure(2); // same chunk 1 -> must dedupe to ONE script
    ok(appended.length === 1, 'two ensures on the same chunk append only one <script> (dedupe)');
    ok(/chunk-001\.js\?d=testver/.test(appended[0].src), 'correct chunk filename + version query');
    fireLoad(win, 1, [realGamma, realDelta]);
    await p;
    await p2;
    ok(win.COURSE_DATA.units[2] === realGamma && win.COURSE_DATA.units[3] === realDelta, 'stubs replaced by real units at the right offset');
    ok(!win.COURSE_DATA.units[3].__stub && win.COURSE_DATA.units[3].lessons.length === 3, 'hydrated unit has real content');
    ok(CL.isLoaded(2) === true && CL.isLoaded(3) === true, 'both units of the chunk now report loaded');
    ok(CL.isLoaded(0) === false, 'a different chunk stays unloaded');
    ok(win.COURSE_CHUNKS[1] === undefined, 'raw chunk store freed after hydration (no double reference)');

    console.log('\n== ensure() on an already-loaded chunk is instant (no new script) ==');
    appended.length = 0;
    await CL.ensure(2);
    ok(appended.length === 0, 'no script appended for an already-resident chunk');

    console.log('\n== prefetch() warms the NEXT chunk ==');
    appended.length = 0;
    CL.prefetch(0); // chunk 0 -> prefetch chunk 1... already loaded, so nothing
    ok(appended.length === 0, 'prefetch skips an already-loaded next chunk');
    CL.prefetch(2); // chunk 1 -> prefetch chunk 2 (unit 4), not loaded
    ok(appended.length === 1 && /chunk-002\.js/.test(appended[0].src), 'prefetch loads the following chunk in the background');

    console.log('\n== ensure() out of range resolves without a script ==');
    appended.length = 0;
    await CL.ensure(999);
    ok(appended.length === 0, 'out-of-range ensure is a no-op');

    console.log(`\n=========================================\nRESULT: ${PASS} passed, ${FAIL} failed`);
    process.exit(FAIL ? 1 : 0);
})();
