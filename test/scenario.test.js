// Cluster D test: coherent, longer chapter scenarios from the chapter's own vocab.
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

const sandbox = {
    window: {},
    document: { createElement: () => ({ style: {}, appendChild() {}, classList: { add() {} } }) },
    console,
    Math,
    Object,
    Array,
    String,
    JSON,
    Date,
    setTimeout: () => 0,
    clearTimeout: () => {},
};
vm.createContext(sandbox);
vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'assets/js/scenarios.js'), 'utf8'),
    sandbox,
    { filename: 'scenarios.js' }
);
const S = sandbox.window.Scenarios;
ok(S && typeof S.buildFromUnit === 'function', 'Scenarios.buildFromUnit exported');

// A unit whose MC exercises teach 3 vocab words (via "How do you say 'X'?").
const mc = (vi, en) => ({
    type: 'multiple_choice',
    question: `How do you say '${vi}'?`,
    options: [en, 'Bye', 'Please', 'Sorry'],
    correct: 0,
});
const unit3 = {
    id: 'u1',
    title: 'Food & Drinks',
    lessons: [
        { exercises: [mc('Xin chào', 'Hello')] },
        { exercises: [mc('Nước', 'Water')] },
        { exercises: [mc('Cơm', 'Rice')] },
    ],
};

console.log('\n== Coherent + longer dialogue ==');
{
    const scn = S.buildFromUnit(unit3, 0);
    ok(scn && Array.isArray(scn.lines), 'scene built with lines');
    ok(scn.lines.length >= 8, `dialogue is longer (>=8 lines): got ${scn.lines.length}`);
    // alternating speakers A,B,A,B... = a real back-and-forth
    const alt = scn.lines.every((l, i) => l.who === (i % 2 === 0 ? 'A' : 'B'));
    ok(alt, 'speakers alternate A/B every line (a real exchange)');
    const allEn = scn.lines.map((l) => l.en).join(' ');
    const allVi = scn.lines.map((l) => l.vi).join(' ');
    ok(
        /Hello/.test(allEn) && /Water/.test(allEn) && /Rice/.test(allEn),
        'weaves in all 3 chapter vocab words'
    );
    ok(
        /Xin chào/.test(allVi) && /Nước/.test(allVi) && /Cơm/.test(allVi),
        'shows the VN meanings in subtitles'
    );
    // coherence markers: an opening greeting/question and a closing thank-you/farewell
    ok(
        /how are you|word game|help me study/i.test(scn.lines[0].en),
        'opens with a real scene starter'
    );
    ok(
        /tomorrow|thank you|game|team/i.test(scn.lines[scn.lines.length - 1].en),
        'ends with a real closing line'
    );
}

console.log('\n== Length scales with vocab (2 words -> 8 lines) ==');
{
    const unit2 = {
        id: 'u2',
        title: 'Greetings',
        lessons: [
            { exercises: [mc('Chào buổi sáng', 'Good morning')] },
            { exercises: [mc('Tạm biệt', 'Goodbye')] },
        ],
    };
    const scn = S.buildFromUnit(unit2, 1);
    ok(
        scn.lines.length === 8,
        `2 vocab -> intro(2)+2*2+outro(2) = 8 lines: got ${scn.lines.length}`
    );
}

console.log('\n== Different chapters rotate the conversation theme ==');
{
    const a = S.buildFromUnit(unit3, 0).lines[0].en;
    const b = S.buildFromUnit(unit3, 1).lines[0].en;
    const c = S.buildFromUnit(unit3, 2).lines[0].en;
    ok(
        new Set([a, b, c]).size === 3,
        'three consecutive chapters open with three different scenes'
    );
}

console.log('\n== "(mở rộng)" chapters also get the coherent scene ==');
{
    const exp = {
        id: 'e1',
        title: 'Danh từ (mở rộng) 5 (Bậc thầy)',
        lessons: [{ exercises: [mc('Cái bàn', 'Table')] }, { exercises: [mc('Cái ghế', 'Chair')] }],
    };
    const scn = S.buildFromUnit(exp, 3);
    ok(scn && scn.lines.length >= 8, 'expansion chapter also gets a longer coherent dialogue');
    ok(
        /Table|Chair/.test(scn.lines.map((l) => l.en).join(' ')),
        'uses the expansion chapter vocab'
    );
}

console.log(`\n=========================================\nRESULT: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
