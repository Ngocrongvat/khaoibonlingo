// Cluster A test: presentExercise (word-first decoy strip for beginners, translate->
// dictation 3-phase sprinkle for normal chapters, easyMode override) + isBeginnerMode.
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
vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'assets/js/app-lesson.js'), 'utf8'),
    sandbox,
    { filename: 'app-lesson.js' }
);
const P = sandbox.DuoClone.prototype;
ok(
    typeof P.presentExercise === 'function' &&
        typeof P.isBeginnerMode === 'function' &&
        typeof P.presentedExerciseFor === 'function',
    'methods attached to prototype'
);

function ctx(unitIdx, lessonIdx, easy) {
    return {
        state: {
            currentUnitIdx: unitIdx,
            currentLessonIdx: lessonIdx,
            stats: { easyMode: !!easy },
        },
        isBeginnerMode: P.isBeginnerMode,
        presentExercise: P.presentExercise,
        presentedExerciseFor: P.presentedExerciseFor,
    };
}
const translate = () => ({
    type: 'translate',
    source: 'Tôi là một học sinh',
    target: 'I am a student',
    options: ['I', 'am', 'a', 'student', 'teacher', 'he'],
    correct: ['I', 'am', 'a', 'student'],
});
const ordering = () => ({
    type: 'ordering',
    shuffled: ['meet', 'Nice', 'you', 'to'],
    correct: ['Nice', 'to', 'meet', 'you'],
});
const mc = () => ({
    type: 'multiple_choice',
    question: "How do you say 'Xin chào'?",
    options: ['Hello', 'Bye', 'Please', 'Sorry'],
    correct: 0,
});

console.log('\n== isBeginnerMode: first 10 chapters ==');
ok(ctx(0).isBeginnerMode.call(ctx(0)), 'chapter 1 (unit 0) is beginner');
ok(ctx(9).isBeginnerMode.call(ctx(9)), 'chapter 10 (unit 9) is beginner');
ok(!ctx(10).isBeginnerMode.call(ctx(10)), 'chapter 11 (unit 10) is NOT beginner (auto-graduated)');

console.log('\n== Beginner: translate loses its decoy tiles ==');
{
    const c = ctx(0, 0, false);
    const r = c.presentExercise.call(c, translate(), 1);
    ok(
        r.type === 'translate' && r.options.length === 4,
        'translate keeps type but options trimmed to the 4 needed words'
    );
    ok(
        r.options.slice().sort().join() === ['I', 'am', 'a', 'student'].sort().join(),
        'options are exactly the correct words (no teacher/he decoys)'
    );
    ok(r._beginnerized === true, 'flagged as beginnerized');
    ok(
        JSON.stringify(r.correct) === JSON.stringify(['I', 'am', 'a', 'student']),
        'answer key unchanged (check still works)'
    );
}
console.log('\n== Beginner: MC reduced to 2 options; ordering left alone ==');
{
    const c = ctx(0, 0, false);
    const rm = c.presentExercise.call(c, mc(), 0);
    ok(
        rm.type === 'multiple_choice' && rm.options.length === 2,
        'MC reduced to 2 options (answer + 1 decoy) for kids mode'
    );
    ok(
        rm.options[rm.correct] === 'Hello',
        'correct index remapped to still point at the right answer'
    );
    ok(rm._beginnerized === true, 'reduced MC flagged beginnerized');
    const ro = c.presentExercise.call(c, ordering(), 0);
    ok(ro.type === 'ordering' && !ro._beginnerized, 'ordering unchanged (already decoy-free)');
    // normal mode leaves MC alone (4 options)
    const cn = ctx(20, 0, false);
    ok(
        cn.presentExercise.call(cn, mc(), 1).options.length === 4,
        'normal mode keeps MC at 4 options'
    );
}

console.log('\n== Normal chapters: some translate drills upgrade to 3-phase dictation ==');
{
    const c = ctx(15, 0, false); // not beginner
    // find an exIdx where (15+0+idx)%3===0 -> idx 0,3,6...
    const conv = c.presentExercise.call(c, translate(), 0);
    ok(
        conv.type === 'dictation' && conv._threePhase === true,
        'translate at a %3 slot becomes dictation (keeps target)'
    );
    ok(conv.target === 'I am a student', 'dictation keeps the target sentence');
    const keep = c.presentExercise.call(c, translate(), 1); // (15+0+1)%3=1 -> not converted
    ok(
        keep.type === 'translate' && !keep._threePhase,
        'translate at a non-slot stays a normal translate'
    );
    const shortT = Object.assign(translate(), { target: 'Hi there' }); // 2 words -> not converted even at a slot
    ok(
        c.presentExercise.call(c, shortT, 0).type === 'translate',
        'very short sentence not converted to dictation'
    );
}

console.log('\n== easyMode override forces beginner behaviour past chapter 10 ==');
{
    const c = ctx(15, 0, true); // easyMode on, unit 15
    const r = c.presentExercise.call(c, translate(), 0); // would convert to dictation without easyMode
    ok(
        r.type === 'translate' && r.options.length === 4 && r._beginnerized,
        'easyMode => decoy-strip, no dictation conversion'
    );
}

console.log('\n== presentedExerciseFor caches per lesson (stable tiles) ==');
{
    const c = ctx(0, 0, false);
    const lesson = { exercises: [translate(), mc()] };
    c._presentKey = null;
    c._presentCache = {};
    const a = c.presentedExerciseFor.call(c, lesson, 0);
    const b = c.presentedExerciseFor.call(c, lesson, 0);
    ok(
        a === b,
        'same slot returns the SAME adapted object across calls (no reshuffle mid-exercise)'
    );
}

console.log(`\n=========================================\nRESULT: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
