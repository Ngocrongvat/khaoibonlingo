// Error-monitor test: drives the window 'error' / 'unhandledrejection' handlers through a
// stubbed window + fake Supabase client, asserting payload shape, dedupe, rate-limit, and
// that resource-load errors are skipped. No browser, no deps.
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

const SRC = fs.readFileSync(path.join(__dirname, '..', 'assets/js/error-monitor.js'), 'utf8');

// The monitor flushes asynchronously (insert().then re-flushes any queued errors), so let
// the microtask/timer queue drain before counting. Count ROWS across all insert calls, not
// the number of insert calls (errors fired in one tick get batched into fewer inserts).
const drain = () => new Promise((r) => setImmediate(r));
const rowCount = (inserted) => inserted.reduce((n, i) => n + i.rows.length, 0);

function makeEnv(user) {
    const handlers = {};
    const inserted = [];
    const fakeClient = {
        from: function (table) {
            return {
                insert: function (rows) {
                    inserted.push({ table: table, rows: rows });
                    return Promise.resolve({ error: null });
                },
            };
        },
    };
    const win = {
        addEventListener: function (ev, fn) {
            handlers[ev] = fn;
        },
        SupabaseClient: { client: fakeClient },
        app: { state: { currentUser: user || null } },
    };
    const sandbox = {
        window: win,
        location: { href: 'https://khoaibonlingo.example/app' },
        navigator: { userAgent: 'TestUA/1.0' },
        setInterval: function () {
            return 0;
        },
        clearInterval: function () {},
        Promise,
        String,
        Object,
        JSON,
        Date,
        Math,
        console,
    };
    vm.createContext(sandbox);
    vm.runInContext(SRC, sandbox, { filename: 'error-monitor.js' });
    return { win, handlers, inserted };
}

(async function () {
    console.log('\n== handlers installed + API exposed ==');
    {
        const { win, handlers } = makeEnv('alice');
        ok(typeof handlers.error === 'function', "window 'error' handler installed");
        ok(
            typeof handlers.unhandledrejection === 'function',
            "window 'unhandledrejection' handler installed"
        );
        ok(
            win.ErrorMonitor && typeof win.ErrorMonitor.record === 'function',
            'window.ErrorMonitor.record exposed'
        );
    }

    console.log('\n== a JS error is captured with the right payload ==');
    {
        const { handlers, inserted } = makeEnv('alice');
        handlers.error({
            message: 'Boom',
            filename: 'app.js',
            lineno: 12,
            colno: 5,
            error: { stack: 'at foo' },
        });
        await drain();
        ok(
            rowCount(inserted) === 1 && inserted[0].table === 'client_errors',
            'one row inserted into client_errors'
        );
        const row = inserted[0].rows[0];
        ok(
            row.message === 'Boom' &&
                row.source === 'app.js' &&
                row.lineno === 12 &&
                row.colno === 5,
            'message/source/line/col captured'
        );
        ok(
            row.stack === 'at foo' &&
                row.username === 'alice' &&
                row.page_url === 'https://khoaibonlingo.example/app',
            'stack/username/page_url captured'
        );
        ok(typeof row.app_version === 'string' && row.app_version.length > 0, 'app_version tagged');
    }

    console.log('\n== identical errors are de-duplicated; distinct ones are not ==');
    {
        const { handlers, inserted } = makeEnv('bob');
        handlers.error({ message: 'Same', filename: 'a.js', lineno: 1, colno: 1 });
        handlers.error({ message: 'Same', filename: 'a.js', lineno: 1, colno: 1 });
        handlers.error({ message: 'Same', filename: 'a.js', lineno: 1, colno: 1 });
        await drain();
        ok(rowCount(inserted) === 1, 'repeated identical error inserted only once');
        handlers.error({ message: 'Different', filename: 'a.js', lineno: 2, colno: 1 });
        await drain();
        ok(rowCount(inserted) === 2, 'a distinct error is inserted');
    }

    console.log('\n== unhandled promise rejection is captured ==');
    {
        const { handlers, inserted } = makeEnv('carol');
        handlers.unhandledrejection({ reason: new Error('async blew up') });
        await drain();
        ok(
            rowCount(inserted) === 1 && /async blew up/.test(inserted[0].rows[0].message),
            'rejection reason.message captured'
        );
    }

    console.log('\n== resource-load errors are skipped ==');
    {
        const { handlers, inserted } = makeEnv('dave');
        handlers.error({ target: { tagName: 'IMG', src: 'x.png' } }); // resource error: element target, no message
        await drain();
        ok(rowCount(inserted) === 0, 'img/script/css load failure is not logged');
    }

    console.log('\n== rate-limited per session (max 15) ==');
    {
        const { handlers, inserted } = makeEnv('erin');
        for (let i = 0; i < 30; i++)
            handlers.error({ message: 'e' + i, filename: 'a.js', lineno: i, colno: 0 });
        // Multiple flush cycles drain the queue; give it several turns.
        for (let k = 0; k < 5; k++) await drain();
        ok(
            rowCount(inserted) === 15,
            'capped at MAX_PER_SESSION (15) distinct errors, no flooding'
        );
    }

    console.log('\n== never throws when the Supabase client is missing ==');
    {
        const handlers = {};
        const sandbox = {
            window: { addEventListener: (ev, fn) => (handlers[ev] = fn), SupabaseClient: null },
            location: { href: 'x' },
            navigator: { userAgent: 'x' },
            setInterval: () => 0,
            clearInterval: () => {},
            Promise,
            String,
            Object,
            JSON,
            Date,
            Math,
            console,
        };
        vm.createContext(sandbox);
        vm.runInContext(SRC, sandbox, { filename: 'error-monitor.js' });
        let threw = false;
        try {
            handlers.error({ message: 'no client', filename: 'a.js', lineno: 1, colno: 1 });
        } catch (e) {
            threw = true;
        }
        ok(!threw, 'recording an error with no client does not throw (buffered silently)');
    }

    console.log(
        `\n=========================================\nRESULT: ${PASS} passed, ${FAIL} failed`
    );
    process.exit(FAIL ? 1 : 0);
})();
