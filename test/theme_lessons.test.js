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
    'cat', 'dog', 'elephant', 'lion', 'monkey', 'duck', 'apple', 'banana', 'orange', 'carrot',
    'tomato', 'corn', 'book', 'chair', 'cup', 'clock', 'ball', 'key', 'car', 'bus', 'bicycle',
    'train', 'boat', 'airplane', 'sun', 'rain', 'cloud', 'hat', 'dress', 't-shirt',
];
const PICTURE_WORD_BANK = words.map((w) => ({ en: w, vi: w, category: 'x', svg: '<svg data-w="' + w + '"></svg>' }));

const sandbox = { window: { PICTURE_WORD_BANK }, Math, Object, Array, String, JSON };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'data/theme-lessons.js'), 'utf8'), sandbox, { filename: 'theme-lessons.js' });
const TL = sandbox.window.ThemeLessons;

ok(TL && typeof TL.build === 'function', 'window.ThemeLessons.build exposed');
ok(Array.isArray(TL.themes) && TL.themes.length === 7, 'exactly 7 sample themes (incl. ẩm thực + cờ quốc gia)');
ok(TL.themes.some((t) => t.id === 'cuisine') && TL.themes.some((t) => t.id === 'flags'), 'the two new themes are present');

function validExercise(e) {
    if (!e || !e.type) return false;
    if (e.type === 'multiple_choice') {
        if (!Array.isArray(e.options) || e.options.length < 2) return false;
        if (typeof e.correct !== 'number' || e.correct < 0 || e.correct >= e.options.length) return false;
        if (e.options[e.correct] == null) return false;
        return true;
    }
    if (e.type === 'listening') {
        return Array.isArray(e.options) && typeof e.correct === 'number' && e.correct >= 0 && e.correct < e.options.length;
    }
    if (e.type === 'pronunciation') return typeof e.target === 'string' && e.target.length > 0;
    return false;
}

for (const t of TL.themes) {
    const ex = TL.build(t.id);
    console.log('\n== theme "' + t.id + '" ==');
    ok(Array.isArray(ex) && ex.length >= 8, t.id + ': builds >=8 exercises');
    ok(ex.every(validExercise), t.id + ': every exercise is a valid, in-range shape');
    ok(ex.some((e) => Array.isArray(e.optionPics) || e.promptPic), t.id + ': has at least one PICTURE exercise');
    ok(ex.some((e) => e.type === 'pronunciation'), t.id + ': includes a speak (pronunciation) step');
    // every picture-choice picture resolved (no bare word fallback leaking as the only pic)
    const picEx = ex.filter((e) => Array.isArray(e.optionPics));
    ok(picEx.every((e) => e.optionPics.every((p) => typeof p === 'string' && p.length > 0)), t.id + ': all option pictures resolved');
}

console.log('\n== emoji themes use emoji, illustrated themes use SVG ==');
{
    const cuisine = TL.build('cuisine');
    const anyEmoji = cuisine.some((e) => (e.promptPic && e.promptPic.includes('theme-emoji')) || (e.optionPics && e.optionPics.some((p) => p.includes('theme-emoji'))));
    ok(anyEmoji, 'cuisine renders with emoji pictures');
    const animals = TL.build('animals');
    const anySvg = animals.some((e) => (e.promptPic && e.promptPic.includes('<svg')) || (e.optionPics && e.optionPics.some((p) => p.includes('<svg'))));
    ok(anySvg, 'animals renders with SVG pictures from the bank');
}

console.log(`\n=========================================\nRESULT: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
