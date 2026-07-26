// Theme-lessons builder test: every sample theme produces a valid, playable exercise queue
// (correct shapes + in-range answer keys + pictures resolved), and the two emoji themes use
// emoji while the illustrated themes pull SVGs from the picture bank.
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

// Stub picture bank covering every word used by the 5 illustrated themes.
const words = [
    'cat',
    'dog',
    'elephant',
    'lion',
    'monkey',
    'duck',
    'apple',
    'banana',
    'orange',
    'carrot',
    'tomato',
    'corn',
    'book',
    'chair',
    'cup',
    'clock',
    'ball',
    'key',
    'car',
    'bus',
    'bicycle',
    'train',
    'boat',
    'airplane',
    'sun',
    'rain',
    'cloud',
    'hat',
    'dress',
    't-shirt',
];
const PICTURE_WORD_BANK = words.map((w) => ({
    en: w,
    vi: w,
    category: 'x',
    svg: '<svg data-w="' + w + '"></svg>',
}));

const sandbox = { window: { PICTURE_WORD_BANK }, Math, Object, Array, String, JSON };
vm.createContext(sandbox);
// Load emoji-map (window.EmojiMap) + generated theme-course (window.ThemeCourse) FIRST, exactly
// like index.html's load order, so theme-lessons.js merges the data-driven themes.
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'data/emoji-map.js'), 'utf8'), sandbox, {
    filename: 'emoji-map.js',
});
vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'data/theme-course.js'), 'utf8'),
    sandbox,
    { filename: 'theme-course.js' }
);
vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'data/theme-lessons.js'), 'utf8'),
    sandbox,
    { filename: 'theme-lessons.js' }
);
const TL = sandbox.window.ThemeLessons;
const GEN = sandbox.window.ThemeCourse;

ok(TL && typeof TL.build === 'function', 'window.ThemeLessons.build exposed');
ok(
    TL.themes.some((t) => t.id === 'cuisine') && TL.themes.some((t) => t.id === 'flags'),
    'the two hand-authored themes (ẩm thực + cờ quốc gia) are present'
);
ok(Array.isArray(GEN) && GEN.length >= 15, 'data-driven course generated >=15 themes');
ok(
    GEN.every((t) => TL.themes.some((x) => x.id === t.id)),
    'every generated theme is merged into ThemeLessons.themes'
);
// Every generated theme picture must resolve to an EMOJI (no bare-word fallback), and its
// dialogue must be a valid, in-range shape with both a male and a female voice.
for (const t of GEN) {
    const ex = TL.build(t.id);
    ok(Array.isArray(ex) && ex.length >= 8, 'gen ' + t.id + ': builds >=8 exercises');
    const picEx = ex.filter((e) => Array.isArray(e.optionPics) || e.promptPic);
    ok(
        picEx.length > 0 &&
            picEx.every((e) =>
                (e.optionPics || [])
                    .concat(e.promptPic ? [e.promptPic] : [])
                    .every((p) => typeof p === 'string' && p.includes('theme-emoji'))
            ),
        'gen ' + t.id + ': every picture resolves to a clear emoji'
    );
    // longer, professional dialogue (6 lines) with an ANIMATED stage ("hoạt cảnh động")
    const dlg = ex.find((e) => e.type === 'dialogue');
    ok(dlg && dlg.lines.length >= 6, 'gen ' + t.id + ': dialogue is a longer 6-line conversation');
    ok(
        dlg && typeof dlg.setting === 'string' && dlg.setting.length > 0 && !!dlg.sceneCaption,
        'gen ' + t.id + ': dialogue has a setting + caption'
    );
    // per-line steps drive the animation: one aligned to each line, actors incl. male+female,
    // and at least one line pops a context-matched object emoji
    ok(
        dlg && Array.isArray(dlg.sceneSteps) && dlg.sceneSteps.length === dlg.lines.length,
        'gen ' + t.id + ': sceneSteps aligned to every line'
    );
    ok(
        dlg &&
            dlg.sceneSteps.some((s) => s.actor === 'male') &&
            dlg.sceneSteps.some((s) => s.actor === 'female'),
        'gen ' + t.id + ': scene has both a male + a female speaker'
    );
    ok(
        dlg && dlg.sceneSteps.some((s) => s.emoji && s.emoji.length > 0),
        'gen ' + t.id + ': at least one line pops a context-matched object'
    );
}
// every theme (incl. the 7 hand-authored) gets an animated stage via dialogueEx
for (const meta of TL.themes) {
    const dlg = TL.build(meta.id).find((e) => e.type === 'dialogue');
    ok(
        dlg && typeof dlg.setting === 'string' && Array.isArray(dlg.sceneSteps),
        meta.id + ': dialogue exposes an animated stage (setting + sceneSteps)'
    );
}

function validExercise(e) {
    if (!e || !e.type) return false;
    if (e.type === 'multiple_choice') {
        if (!Array.isArray(e.options) || e.options.length < 2) return false;
        if (typeof e.correct !== 'number' || e.correct < 0 || e.correct >= e.options.length)
            return false;
        if (e.options[e.correct] == null) return false;
        return true;
    }
    if (e.type === 'listening') {
        return (
            Array.isArray(e.options) &&
            typeof e.correct === 'number' &&
            e.correct >= 0 &&
            e.correct < e.options.length
        );
    }
    if (e.type === 'pronunciation') return typeof e.target === 'string' && e.target.length > 0;
    if (e.type === 'dialogue') {
        return (
            Array.isArray(e.lines) &&
            e.lines.length >= 2 &&
            Array.isArray(e.audioLines) &&
            Array.isArray(e.options) &&
            typeof e.correct === 'number' &&
            e.correct >= 0 &&
            e.correct < e.options.length
        );
    }
    return false;
}

for (const t of TL.themes) {
    const ex = TL.build(t.id);
    console.log('\n== theme "' + t.id + '" ==');
    ok(Array.isArray(ex) && ex.length >= 8, t.id + ': builds >=8 exercises');
    ok(ex.every(validExercise), t.id + ': every exercise is a valid, in-range shape');
    ok(
        ex.some((e) => Array.isArray(e.optionPics) || e.promptPic),
        t.id + ': has at least one PICTURE exercise'
    );
    ok(
        ex.some((e) => e.type === 'pronunciation'),
        t.id + ': includes a speak (pronunciation) step'
    );
    const dlg = ex.find((e) => e.type === 'dialogue');
    ok(dlg && dlg.lines.length >= 3, t.id + ': includes a situational dialogue (>=3 lines)');
    ok(
        dlg && dlg.audioLines.every((l) => !/[👦👧🧑]/.test(l)),
        t.id + ': dialogue audioLines are speaker-free (clean TTS)'
    );
    ok(
        dlg && Array.isArray(dlg.voices) && dlg.voices.length === dlg.audioLines.length,
        t.id + ': dialogue has a per-line voices array aligned to audioLines'
    );
    ok(
        dlg && dlg.voices.includes('male') && dlg.voices.includes('female'),
        t.id + ': dialogue voices distinguish a male + a female speaker'
    );
    // every picture-choice picture resolved (no bare word fallback leaking as the only pic)
    const picEx = ex.filter((e) => Array.isArray(e.optionPics));
    ok(
        picEx.every((e) => e.optionPics.every((p) => typeof p === 'string' && p.length > 0)),
        t.id + ': all option pictures resolved'
    );
}

console.log('\n== every theme is emoji-first (clear pictures, no unclear SVG) ==');
{
    for (const t of TL.themes) {
        const ex = TL.build(t.id);
        const picEx = ex.filter((e) => Array.isArray(e.optionPics) || e.promptPic);
        const allEmoji = picEx.every((e) => {
            const pics = (e.optionPics || []).concat(e.promptPic ? [e.promptPic] : []);
            return pics.every((p) => typeof p === 'string' && p.includes('theme-emoji'));
        });
        ok(allEmoji, t.id + ': every picture is an emoji (no unclear SVG)');
    }
}

console.log(`\n=========================================\nRESULT: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
