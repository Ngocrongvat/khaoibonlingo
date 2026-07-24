// Content-safety filter test: profanity (EN+VI), PII (email/link/phone), spam/length, name
// rules, and — importantly — NO false positives on normal English-learning chat.
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

const sandbox = { window: {}, console, String, RegExp, Object, Array };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets/js/content-safety.js'), 'utf8'), sandbox, { filename: 'content-safety.js' });
const CS = sandbox.window.ContentSafety;
const blocked = (t, o) => CS.check(t, o).ok === false;
const allowed = (t, o) => CS.check(t, o).ok === true;

ok(CS && typeof CS.check === 'function' && typeof CS.checkName === 'function', 'ContentSafety API exposed');

console.log('\n== normal learning chat is allowed (no false positives) ==');
[
    'Hello everyone, how are you today?',
    'I go to class every morning',
    'My assistant helped me',
    'The grass is green and the sky is blue',
    'Xin chào các bạn, hôm nay học vui quá!',
    'Tôi thích học tiếng Anh',
    'Good luck with lesson 8!',
    'Number 12 is my favorite',
    "Let's meet at 3pm for the quiz",
].forEach((t) => ok(allowed(t), 'allowed: "' + t + '"'));

console.log('\n== profanity is blocked (EN + VI) ==');
['you are stupid', 'what the fuck', 'this is shit', 'đồ ngu', 'địt mẹ', 'thằng chó', 'đm quá'].forEach((t) =>
    ok(blocked(t), 'blocked profanity: "' + t + '"')
);
ok(blocked('f u c k you'), 'blocked spaced-out evasion "f u c k"');

console.log('\n== personal contact info is blocked ==');
ok(CS.check('email me at kid@example.com').reason.includes('email'), 'blocks email');
ok(CS.check('add me https://evil.link/x').reason.includes('liên kết'), 'blocks url');
ok(CS.check('go to facebook.com/kid').reason.includes('liên kết'), 'blocks bare domain');
ok(CS.check('call me 0912345678').reason.includes('số điện thoại'), 'blocks VN phone');
ok(CS.check('my number is 0912 345 678').reason.includes('số điện thoại'), 'blocks spaced phone');
ok(allowed('I am number 12 in class'), 'short numbers are fine');

console.log('\n== length, spam, empty ==');
ok(blocked(''), 'empty blocked');
ok(blocked('   '), 'whitespace-only blocked');
ok(blocked('ab'.repeat(300)), 'over max length blocked (600 chars > 500 default)');
ok(blocked('aaaaaaaaaaaaaaa'), 'repeated-char spam blocked');
ok(allowed('ab'.repeat(300), { maxLength: 700 }), 'custom maxLength respected (600 chars, no spam)');

console.log('\n== name rules (stricter) ==');
ok(CS.checkName('CoolKid123').ok === true, 'clean username allowed');
ok(CS.checkName('').ok === false, 'empty name blocked');
ok(CS.checkName('shit_master').ok === false, 'profane username blocked');
ok(CS.checkName('call0912345678').ok === false, 'username with phone blocked');
ok(CS.checkName('visit me at site.com').ok === false, 'username with link blocked');

console.log(`\n=========================================\nRESULT: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
