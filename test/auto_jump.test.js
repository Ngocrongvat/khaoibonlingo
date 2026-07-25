// Regression tests for two "don't yank the user around" fixes:
//  1) stopBattleBoardLive() must clear the realtime channel AND _battleBoardGroupId so a
//     background battle update can't re-render the board after the user navigated away.
//  2) handleSessionLost() must flag + reload exactly once (bounce to login on lost session).
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

console.log('\n== stopBattleBoardLive clears channel + board id (auto-jump fix) ==');
{
    const removed = [];
    const client = { removeChannel: (ch) => removed.push(ch) };
    function DuoClone() {}
    DuoClone.prototype = {};
    const sandbox = {
        window: { SupabaseClient: { client } },
        document: { addEventListener() {} },
        DuoClone,
        console,
        setTimeout,
        clearTimeout,
        Date,
        Math,
        Object,
        Array,
        String,
        JSON,
        Promise,
        parseInt,
    };
    vm.createContext(sandbox);
    vm.runInContext(
        fs.readFileSync(path.join(__dirname, '..', 'assets/js/app-groups2.js'), 'utf8'),
        sandbox,
        { filename: 'app-groups2.js' }
    );
    const P = sandbox.DuoClone.prototype;
    ok(typeof P.stopBattleBoardLive === 'function', 'stopBattleBoardLive attached');

    const t = {
        _battleBoardChannel: { id: 'ch1' },
        _battleBoardGroupId: 'g1',
        _boardReloadT: setTimeout(() => {}, 99999),
        stopBattleBoardLive: P.stopBattleBoardLive,
    };
    t.stopBattleBoardLive();
    ok(t._battleBoardChannel === null, 'realtime channel reference cleared');
    ok(
        t._battleBoardGroupId === null,
        'board group id cleared — stray countdown-refresh cannot re-open the board'
    );
    ok(removed.length === 1, 'removeChannel() called on the live channel');
}

console.log('\n== handleSessionLost flags + reloads once (session-expiry fix) ==');
{
    function DuoClone() {}
    DuoClone.prototype = {};
    const ss = {
        _d: {},
        getItem(k) {
            return k in this._d ? this._d[k] : null;
        },
        setItem(k, v) {
            this._d[k] = String(v);
        },
        removeItem(k) {
            delete this._d[k];
        },
    };
    const loc = {
        count: 0,
        reload() {
            this.count++;
        },
    };
    const sandbox = {
        DuoClone,
        window: {},
        document: { getElementById: () => null },
        localStorage: { getItem: () => null, setItem: () => {} },
        sessionStorage: ss,
        location: loc,
        console,
        Math,
        Object,
        Array,
        String,
        JSON,
        Date,
    };
    vm.createContext(sandbox);
    vm.runInContext(
        fs.readFileSync(path.join(__dirname, '..', 'assets/js/app-misc.js'), 'utf8'),
        sandbox,
        { filename: 'app-misc.js' }
    );
    const P = sandbox.DuoClone.prototype;
    ok(typeof P.handleSessionLost === 'function', 'handleSessionLost attached');

    const t = { handleSessionLost: P.handleSessionLost };
    t.handleSessionLost();
    ok(ss.getItem('khoai_session_expired') === '1', 'sets the session-expired notice flag');
    ok(loc.count === 1, 'hard-reloads to bounce to the login screen');
    t.handleSessionLost();
    ok(loc.count === 1, 'double-fire guarded (still exactly one reload)');
}

console.log(`\n=========================================\nRESULT: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
