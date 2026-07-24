// Moderation test: block/unblock/isBlocked, idempotent ensureLoaded, and reportContent —
// driven through a stubbed chainable Supabase client. No browser, no deps.
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

// Chainable mock: select()/eq() build a query resolved via then(); insert() resolves
// immediately; delete().eq()... resolves via then().
function makeStore() {
    return { inserts: [], deletes: 0, blocksData: [], selectCount: 0, insertError: null };
}
function makeClient(store) {
    function q(table) {
        const o = {
            _kind: null,
            table,
            select() {
                this._kind = 'select';
                return this;
            },
            eq() {
                return this;
            },
            insert(row) {
                store.inserts.push({ table, row });
                return Promise.resolve({ error: store.insertError || null });
            },
            delete() {
                this._kind = 'delete';
                store.deletes++;
                return this;
            },
            then(resolve, reject) {
                let res;
                if (this._kind === 'select') {
                    store.selectCount++;
                    res = { data: store.blocksData, error: null };
                } else {
                    res = { error: null };
                }
                return Promise.resolve(res).then(resolve, reject);
            },
        };
        return o;
    }
    return { from: (t) => q(t) };
}

function load(store) {
    const sandbox = { window: { SupabaseClient: { client: makeClient(store) } }, console, Set, Promise, String, Object, Array };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets/js/moderation.js'), 'utf8'), sandbox, { filename: 'moderation.js' });
    return sandbox.window.Moderation;
}

const me = { id: 'me', username: 'Me' };

(async function () {
    ok(typeof load(makeStore()).blockUser === 'function', 'Moderation API exposed');

    console.log('\n== ensureLoaded caches the block set (idempotent) ==');
    {
        const store = makeStore();
        store.blocksData = [{ blocked_id: 'u2' }, { blocked_id: 'u3' }];
        const M = load(store);
        await M.ensureLoaded('me');
        ok(M.isBlocked('u2') && M.isBlocked('u3'), 'loaded blocks reported as blocked');
        ok(!M.isBlocked('u9'), 'a non-blocked user is not blocked');
        await M.ensureLoaded('me');
        await M.ensureLoaded('me');
        ok(store.selectCount === 1, 'ensureLoaded queries the DB only once per user');
    }

    console.log('\n== blockUser / unblockUser update the cache + DB ==');
    {
        const store = makeStore();
        const M = load(store);
        await M.ensureLoaded('me');
        const r = await M.blockUser(me, 'u9', 'NineUser');
        ok(!r.error && M.isBlocked('u9'), 'blockUser inserts + marks blocked');
        ok(store.inserts.some((i) => i.table === 'user_blocks' && i.row.blocked_id === 'u9' && i.row.blocker_id === 'me'), 'insert row shape correct');
        const u = await M.unblockUser(me, 'u9');
        ok(!u.error && !M.isBlocked('u9') && store.deletes === 1, 'unblockUser deletes + clears cache');
    }

    console.log('\n== self-block is refused ==');
    {
        const M = load(makeStore());
        const r = await M.blockUser(me, 'me', 'Me');
        ok(r.error && !M.isBlocked('me'), 'cannot block yourself');
    }

    console.log('\n== duplicate block (23505) is treated as success ==');
    {
        const store = makeStore();
        store.insertError = { code: '23505', message: 'duplicate' };
        const M = load(store);
        const r = await M.blockUser(me, 'u5', 'Five');
        ok(!r.error && M.isBlocked('u5'), 'already-blocked insert is not an error');
    }

    console.log('\n== reportContent inserts a report ==');
    {
        const store = makeStore();
        const M = load(store);
        const r = await M.reportContent(me, { reportedUserId: 'bad', reportedUsername: 'BadKid', context: 'global_chat', messageText: 'nasty', reason: 'abuse' });
        ok(!r.error, 'report succeeds');
        const row = (store.inserts.find((i) => i.table === 'content_reports') || {}).row;
        ok(row && row.reporter_id === 'me' && row.reported_user_id === 'bad' && row.context === 'global_chat' && row.message_text === 'nasty', 'report row shape correct');
    }

    console.log(`\n=========================================\nRESULT: ${PASS} passed, ${FAIL} failed`);
    process.exit(FAIL ? 1 : 0);
})();
