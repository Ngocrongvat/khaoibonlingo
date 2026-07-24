// Headless logic test for the group-battle upgrades. Loads assets/js/app-groups2.js
// against an in-memory Supabase mock and drives the full letter->schedule->approve->
// pair->finalize flow plus the phase-aware render methods. No browser needed.
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

let PASS = 0,
    FAIL = 0;
const ok = (cond, msg) => {
    if (cond) {
        PASS++;
    } else {
        FAIL++;
        console.log('  ✗ FAIL: ' + msg);
    }
};
const section = (s) => console.log('\n== ' + s + ' ==');

// ---------------- In-memory Supabase mock ----------------
let idc = 1;
const nid = () => 'id' + idc++;
function makeDB() {
    return {
        groups: [
            {
                id: 'G1',
                name: 'Rồng Lửa',
                owner_id: 'u1',
                owner_username: 'u1',
                vibrancy_score: 500,
                battles_initiated: 0,
                battle_wins: 0,
                battle_losses: 0,
            },
            {
                id: 'G2',
                name: 'Hổ Mang Chúa Sơn Lâm',
                owner_id: 'u2',
                owner_username: 'u2',
                vibrancy_score: 300,
                battles_initiated: 0,
                battle_wins: 0,
                battle_losses: 0,
            },
        ],
        group_members: [
            {
                id: nid(),
                group_id: 'G1',
                user_id: 'u1',
                username: 'u1',
                role: 'owner',
                status: 'active',
            },
            {
                id: nid(),
                group_id: 'G1',
                user_id: 'u3',
                username: 'u3',
                role: 'member',
                status: 'active',
            },
            {
                id: nid(),
                group_id: 'G2',
                user_id: 'u2',
                username: 'u2',
                role: 'owner',
                status: 'active',
            },
            {
                id: nid(),
                group_id: 'G2',
                user_id: 'u4',
                username: 'u4',
                role: 'member',
                status: 'active',
            },
        ],
        group_battles: [],
        group_battle_pairs: [],
        group_battle_chat: [],
        direct_messages: [],
        profiles: [
            { id: 'u1', username: 'u1', xp: 1000 },
            { id: 'u2', username: 'u2', xp: 800 },
            { id: 'u3', username: 'u3', xp: 500 },
            { id: 'u4', username: 'u4', xp: 400 },
        ],
        duels: [],
    };
}

function matches(row, filters) {
    return filters.every((f) => {
        if (f.t === 'eq') return row[f.c] === f.v;
        if (f.t === 'neq') return row[f.c] !== f.v;
        if (f.t === 'not_is_null') return row[f.c] !== null && row[f.c] !== undefined;
        if (f.t === 'is_null') return row[f.c] === null || row[f.c] === undefined;
        if (f.t === 'in') return f.v.includes(row[f.c]);
        if (f.t === 'or') return f.v.some(({ c, v }) => row[c] === v);
        return true;
    });
}

function makeClient(db, opts = {}) {
    class QB {
        constructor(table) {
            this.table = table;
            this.filters = [];
            this.op = 'select';
            this.payload = null;
            this._single = false;
            this._maybe = false;
            this._order = null;
            this._limit = null;
        }
        insert(rows) {
            this.op = 'insert';
            this.payload = rows;
            return this;
        }
        update(fields) {
            this.op = 'update';
            this.payload = fields;
            return this;
        }
        delete() {
            this.op = 'delete';
            return this;
        }
        select() {
            return this;
        }
        eq(c, v) {
            this.filters.push({ t: 'eq', c, v });
            return this;
        }
        neq(c, v) {
            this.filters.push({ t: 'neq', c, v });
            return this;
        }
        not(c, _op, _v) {
            this.filters.push({ t: 'not_is_null', c });
            return this;
        }
        is(c, v) {
            this.filters.push(v === null ? { t: 'is_null', c } : { t: 'eq', c, v });
            return this;
        }
        in(c, v) {
            this.filters.push({ t: 'in', c, v });
            return this;
        }
        ilike(c, v) {
            this.filters.push({ t: 'eq', c, v: v.replace(/%/g, '') });
            return this;
        }
        or(str) {
            const parts = str.split(',').map((s) => {
                const [c, , v] = s.split('.');
                return { c, v };
            });
            this.filters.push({ t: 'or', v: parts });
            return this;
        }
        order(c, o) {
            this._order = { c, asc: !o || o.ascending !== false };
            return this;
        }
        limit(n) {
            this._limit = n;
            return this;
        }
        single() {
            this._single = true;
            return this;
        }
        maybeSingle() {
            this._maybe = true;
            return this;
        }
        _resolve() {
            if (opts.throwOn && opts.throwOn.table === this.table && opts.throwOn.op === this.op) {
                return { data: null, error: { message: opts.throwOn.message } };
            }
            const arr = db[this.table] || (db[this.table] = []);
            if (this.op === 'insert') {
                const defaults =
                    {
                        group_battles: {
                            status: 'pending',
                            invite_accepted: false,
                            wager_xp: 0,
                            window_min: 30,
                            schedule_change_count: 0,
                            schedule_approved: false,
                            rewards_applied: false,
                            group_a_wins: 0,
                            group_b_wins: 0,
                            scheduled_at: null,
                            winner_group_id: null,
                            finished_at: null,
                        },
                        group_battle_pairs: {
                            joined_a_at: null,
                            joined_b_at: null,
                            winner: null,
                            decided_at: null,
                        },
                    }[this.table] || {};
                const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
                const inserted = rows.map((r) =>
                    Object.assign({ id: nid(), created_at: new Date().toISOString() }, defaults, r)
                );
                arr.push(...inserted);
                return { data: this._single ? inserted[0] : inserted, error: null };
            }
            let sel = arr.filter((r) => matches(r, this.filters));
            if (this.op === 'update') {
                sel.forEach((r) => Object.assign(r, this.payload));
                return {
                    data: this._single ? sel[0] || null : this._maybe ? sel[0] || null : sel,
                    error: null,
                };
            }
            if (this.op === 'delete') {
                const removed = arr.filter((r) => matches(r, this.filters));
                // opts.blockDelete simulates a missing RLS delete policy: the row is NOT removed
                // and 0 rows come back (the exact "treo" condition the delete-policy fixes).
                if (opts.blockDelete) return { data: [], error: null };
                db[this.table] = arr.filter((r) => !matches(r, this.filters));
                return { data: removed, error: null };
            }
            if (this._order)
                sel = sel
                    .slice()
                    .sort(
                        (a, b) =>
                            (a[this._order.c] > b[this._order.c] ? 1 : -1) *
                            (this._order.asc ? 1 : -1)
                    );
            if (this._limit != null) sel = sel.slice(0, this._limit);
            if (this._single)
                return { data: sel[0] || null, error: sel.length ? null : { message: 'no rows' } };
            if (this._maybe) return { data: sel[0] || null, error: null };
            return { data: sel, error: null };
        }
        then(res, rej) {
            try {
                const out = this._resolve();
                // Real Supabase returns detached copies, never live table references.
                const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
                const detached = { data: clone(out.data), error: out.error };
                return Promise.resolve(detached).then(res, rej);
            } catch (e) {
                return Promise.resolve({ data: null, error: { message: e.message } }).then(
                    res,
                    rej
                );
            }
        }
    }
    return {
        from: (t) => new QB(t),
        rpc: (name, params) => {
            // opts.realRpc runs a faithful JS port of finalize_scheduled_group_battle so the
            // reward math (wager transfer + zero-sum 10% XP steal), the relaxed early-finish
            // guard, and forfeit outcomes can all be exercised. Default: RPC "not installed"
            // (drives the graceful client fallback path).
            if (opts.realRpc && name === 'finalize_scheduled_group_battle') {
                return Promise.resolve({
                    data: finalizeInMock(db, params.p_battle_id),
                    error: null,
                });
            }
            return Promise.resolve({
                data: null,
                error: { message: 'function public.' + name + ' does not exist' },
            });
        },
    };
}

// Faithful port of the finalize RPC (see group_battle_realtime.sql) for the harness.
function finalizeInMock(db, battleId) {
    const b = db.group_battles.find((x) => x.id === battleId);
    if (!b) return null;
    if (b.status === 'finished' || b.rewards_applied) return b;
    if (b.status !== 'active' || !b.scheduled_at) return b;
    const windowEnd = new Date(b.scheduled_at).getTime() + (b.window_min || 30) * 60000;
    const pairs = db.group_battle_pairs.filter((p) => p.battle_id === battleId);
    if (Date.now() < windowEnd && pairs.some((p) => !p.winner)) return b; // relaxed guard
    for (const p of pairs) {
        if (p.winner) continue;
        let w;
        if (p.joined_a_at && p.joined_b_at) {
            const duel = db.duels.find(
                (d) =>
                    d.group_battle_id === battleId &&
                    d.status === 'finished' &&
                    d.winner_id &&
                    [p.user_a_id, p.user_b_id].includes(d.challenger_id) &&
                    [p.user_a_id, p.user_b_id].includes(d.opponent_id)
            );
            w = duel ? (duel.winner_id === p.user_a_id ? 'a' : 'b') : 'draw';
        } else if (p.joined_a_at) w = 'a';
        else if (p.joined_b_at) w = 'b';
        else w = 'draw';
        p.winner = w;
        p.decided_at = new Date().toISOString();
    }
    const winsA = pairs.filter((p) => p.winner === 'a').length,
        winsB = pairs.filter((p) => p.winner === 'b').length;
    const winnerGroup = winsA > winsB ? b.group_a_id : winsB > winsA ? b.group_b_id : null;
    const loserGroup = winnerGroup
        ? winnerGroup === b.group_a_id
            ? b.group_b_id
            : b.group_a_id
        : null;
    b.status = 'finished';
    b.group_a_wins = winsA;
    b.group_b_wins = winsB;
    b.winner_group_id = winnerGroup;
    b.finished_at = new Date().toISOString();
    b.rewards_applied = true;
    const wager = Math.max(0, b.wager_xp || 0);
    const ga = db.groups.find((g) => g.id === b.group_a_id),
        gb = db.groups.find((g) => g.id === b.group_b_id);
    if (winnerGroup) {
        const wg = db.groups.find((g) => g.id === winnerGroup),
            lg = db.groups.find((g) => g.id === loserGroup);
        if (wg) {
            wg.vibrancy_score += wager;
            wg.battle_wins = (wg.battle_wins || 0) + 1;
        }
        if (lg) {
            lg.vibrancy_score = Math.max(0, lg.vibrancy_score - wager);
            lg.battle_losses = (lg.battle_losses || 0) + 1;
        }
    }
    // Port of _battle_result_dm: one recipient's message from their group's perspective.
    const dmText = (winG, myGroup, myName, oppName, myW, oppW, wg, delta, iForfeit) => {
        let head;
        if (winG == null)
            head = `🤝 Trận đấu group giữa "${myName}" và "${oppName}" đã kết thúc HÒA ${myW}-${oppW}. `;
        else if (winG === myGroup)
            head =
                `🏆 CHÚC MỪNG CHIẾN THẮNG! Group "${myName}" của bạn đã THẮNG group "${oppName}" với tỉ số ${myW}-${oppW}. ` +
                (wg > 0 ? `Group được +${wg} EXP tiền cược. ` : '');
        else
            head =
                (iForfeit
                    ? `🏳️ Group "${myName}" của bạn đã bỏ cuộc nên bị xử THUA trước group "${oppName}". `
                    : `💪 Cố lên nhé! Group "${myName}" của bạn đã thua group "${oppName}" với tỉ số ${myW}-${oppW}. `) +
                (wg > 0 ? `Group mất ${wg} EXP tiền cược. ` : '');
        const tail =
            delta > 0
                ? `Cá nhân bạn đã CƯỚP được +${delta} XP của đối thủ ghép cặp! 🗡️`
                : delta < 0
                  ? `Cá nhân bạn bị đối thủ cướp mất ${Math.abs(delta)} XP. 😣 Luyện tập thêm rồi phục thù nhé!`
                  : 'XP cá nhân của bạn không thay đổi lần này.';
        return head + tail;
    };
    const sendDm = (fromId, fromName, toId, toName, msg) => {
        if (!fromId || fromId === toId) return;
        db.direct_messages.push({
            id: nid(),
            sender_id: fromId,
            sender_username: fromName || 'Trọng tài',
            recipient_id: toId,
            recipient_username: toName,
            message: msg,
            read: false,
        });
    };
    for (const p of pairs) {
        let dA = 0,
            dB = 0;
        if (winnerGroup === b.group_a_id && p.joined_a_at) {
            const lp = db.profiles.find((x) => x.id === p.user_b_id),
                wp = db.profiles.find((x) => x.id === p.user_a_id);
            const steal = Math.max(0, Math.floor(((lp && lp.xp) || 0) * 0.1));
            if (steal > 0) {
                lp.xp = Math.max(0, lp.xp - steal);
                wp.xp += steal;
                dA = steal;
                dB = -steal;
            }
        } else if (winnerGroup === b.group_b_id && p.joined_b_at) {
            const lp = db.profiles.find((x) => x.id === p.user_a_id),
                wp = db.profiles.find((x) => x.id === p.user_b_id);
            const steal = Math.max(0, Math.floor(((lp && lp.xp) || 0) * 0.1));
            if (steal > 0) {
                lp.xp = Math.max(0, lp.xp - steal);
                wp.xp += steal;
                dB = steal;
                dA = -steal;
            }
        }
        const sA = p.user_a_id !== ga.owner_id ? ga.owner_id : gb.owner_id;
        const sAn = p.user_a_id !== ga.owner_id ? ga.owner_username : gb.owner_username;
        sendDm(
            sA,
            sAn,
            p.user_a_id,
            p.username_a,
            dmText(
                winnerGroup,
                b.group_a_id,
                ga.name,
                gb.name,
                winsA,
                winsB,
                wager,
                dA,
                b.forfeited_by_group_id === b.group_a_id
            )
        );
        const sB = p.user_b_id !== gb.owner_id ? gb.owner_id : ga.owner_id;
        const sBn = p.user_b_id !== gb.owner_id ? gb.owner_username : ga.owner_username;
        sendDm(
            sB,
            sBn,
            p.user_b_id,
            p.username_b,
            dmText(
                winnerGroup,
                b.group_b_id,
                gb.name,
                ga.name,
                winsB,
                winsA,
                wager,
                dB,
                b.forfeited_by_group_id === b.group_b_id
            )
        );
    }
    return b;
}

// ---------------- Groups / Inbox mocks ----------------
function makeGroups(db) {
    return {
        MAX_MEMBERS: 30,
        searchGroupByName: async (n) =>
            db.groups.find((g) => g.name.toLowerCase().includes(n.trim().toLowerCase())) || null,
        getGroupById: async (id) => db.groups.find((g) => g.id === id) || null,
        getGroupMembers: async (id) =>
            db.group_members.filter((m) => m.group_id === id && m.status === 'active'),
        getBattleDuels: async (bid) => db.duels.filter((d) => d.group_battle_id === bid),
    };
}
function makeInbox(db) {
    return {
        sendDirectMessageToId: async (me, rid, run, text) => {
            db.direct_messages.push({
                id: nid(),
                sender_id: me.id,
                recipient_id: rid,
                message: text,
            });
            return { data: true };
        },
    };
}

// ---------------- Load app-groups2.js in a sandbox ----------------
const db = makeDB();
const client = makeClient(db);
const win = { SupabaseClient: { client }, Groups: makeGroups(db), Inbox: makeInbox(db) };
const proto = {};
function DuoClone() {}
DuoClone.prototype = proto;
const sandbox = {
    window: win,
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
    getGroupLevelInfo: (v) => ({ label: 'Cấp ' + Math.floor((v || 0) / 100) }),
};
vm.createContext(sandbox);
const src = fs.readFileSync(path.join(__dirname, '..', 'assets/js/app-groups2.js'), 'utf8');
vm.runInContext(src, sandbox, { filename: 'app-groups2.js' });
const S = win.GroupBattleSchedule;

// Fresh, isolated module instance over a given db (helpers capture their client at load).
function loadModule(freshDb, clientOpts = {}) {
    const c = makeClient(freshDb, clientOpts);
    const w = {
        SupabaseClient: { client: c },
        Groups: makeGroups(freshDb),
        Inbox: makeInbox(freshDb),
        ActivityFeed: { postEvent: async () => ({ data: true }) },
    };
    function DC() {}
    DC.prototype = {};
    const sb = Object.assign({}, sandbox, { window: w, DuoClone: DC });
    vm.createContext(sb);
    vm.runInContext(src, sb, { filename: 'app-groups2.js' });
    return { S: w.GroupBattleSchedule, proto: DC.prototype, win: w, client: c, db: freshDb };
}

(async () => {
    section('DB helpers exist');
    [
        'sendChallengeLetter',
        'acceptInvite',
        'declineInvite',
        'setSchedule',
        'approveSchedule',
        'getBattle',
        'getBattlesFor',
        'getRecentFinishedFor',
        'getBattleChat',
        'sendBattleChat',
        'ensurePairsAndActivate',
        'finalizeScheduledBattle',
    ].forEach((k) => ok(typeof S[k] === 'function', 'helper ' + k));

    section('Flow: letter -> accept -> schedule (cap 3) -> approve');
    const u1 = { id: 'u1', username: 'u1' },
        u2 = { id: 'u2', username: 'u2' };
    let r = await S.sendChallengeLetter('G1', 'Hổ Mang', u1);
    ok(!r.error && r.data, 'letter sent');
    ok(
        db.group_battles.length === 1 && db.group_battles[0].invite_accepted === false,
        'battle pending, invite not accepted'
    );
    ok(db.groups.find((g) => g.id === 'G1').battles_initiated === 1, 'battles_initiated bumped');
    ok(
        db.direct_messages.some((m) => m.recipient_id === 'u2'),
        'opponent owner notified'
    );
    let battle = db.group_battles[0];

    // duplicate challenge blocked
    const dup = await S.sendChallengeLetter('G1', 'Hổ Mang', u1);
    ok(!!dup.error, 'duplicate challenge blocked');

    r = await S.acceptInvite(battle, u2);
    ok(!r.error && (await S.getBattle(battle.id)).invite_accepted === true, 'invite accepted');
    ok(
        db.direct_messages.some((m) => m.recipient_id === 'u1'),
        'challenger owner notified on accept'
    );

    const future = new Date(Date.now() + 3600000).toISOString();
    battle = await S.getBattle(battle.id);
    r = await S.setSchedule(battle, future, 30, 100, u1);
    ok(!r.error, 'first schedule set (free, not a change)');
    battle = await S.getBattle(battle.id);
    ok(
        battle.schedule_change_count === 0 &&
            battle.wager_xp === 100 &&
            battle.schedule_approved === false,
        'first set: count 0, wager 100, approval reset'
    );

    for (let i = 1; i <= 3; i++) {
        battle = await S.getBattle(battle.id);
        r = await S.setSchedule(battle, future, 30, 100 + i, u1);
        ok(!r.error, 'schedule change #' + i + ' allowed');
    }
    battle = await S.getBattle(battle.id);
    ok(battle.schedule_change_count === 3, 'change count capped counter = 3');
    r = await S.setSchedule(battle, future, 30, 200, u1);
    ok(!!r.error && /3 lần/.test(r.error), '4th change rejected with "tối đa 3 lần"');

    r = await S.approveSchedule(battle, u2);
    ok(!r.error && (await S.getBattle(battle.id)).schedule_approved === true, 'schedule approved');

    section('Auto-pair at window open (single-claim, no dup)');
    // Move the scheduled time into the past so the window is open.
    const past = new Date(Date.now() - 60000).toISOString();
    await client.from('group_battles').update({ scheduled_at: past }).eq('id', battle.id);
    // Two viewers both hold a STALE pending snapshot and race to activate (the real race).
    const staleBattle = await S.getBattle(battle.id);
    const a1 = await S.ensurePairsAndActivate(staleBattle);
    ok(a1.pairs === 2, 'seeded 2 pairs (min roster = 2)');
    ok((await S.getBattle(battle.id)).status === 'active', 'battle now active');
    const a2 = await S.ensurePairsAndActivate(staleBattle); // same stale snapshot
    ok(a2.already === true, 'second activate loses the claim (no-op)');
    ok(
        db.group_battle_pairs.filter((p) => p.battle_id === battle.id).length === 2,
        'no duplicate pairs after racing activations'
    );
    battle = await S.getBattle(battle.id);

    section('Owner chat');
    r = await S.sendBattleChat(battle.id, u1, 'Chuẩn bị nhé!');
    ok(!r.error, 'chat message sent');
    const chat = await S.getBattleChat(battle.id);
    ok(chat.length === 1 && chat[0].message === 'Chuẩn bị nhé!', 'chat message stored & fetched');
    const emptyChat = await S.sendBattleChat(battle.id, u1, '   ');
    ok(!!emptyChat.error, 'blank chat rejected');

    section('Join + finalize (RPC-missing fallback)');
    let pairs = await S.getPairs(battle.id);
    // u3 (side a) and u4 (side b) are in one pair; join both so it is contested, leave other pair with only side-a joined.
    const p0 = pairs[0],
        p1 = pairs[1];
    await S.joinPair({ id: p0.id }, p0.user_a_id === 'u3' ? 'a' : 'b'); // a participant joins
    await S.joinPair({ id: p0.id }, p0.user_a_id === 'u3' ? 'b' : 'a'); // opponent joins too
    await S.joinPair({ id: p1.id }, 'a'); // only side a shows up in the other pair
    // Close the window.
    const closed = new Date(Date.now() - 31 * 60000).toISOString();
    await client.from('group_battles').update({ scheduled_at: closed }).eq('id', battle.id);
    battle = await S.getBattle(battle.id);
    const fin = await S.finalizeScheduledBattle(battle.id);
    ok(fin && fin.fallback === true, 'finalize used graceful fallback (RPC not installed)');
    battle = await S.getBattle(battle.id);
    ok(battle.status === 'finished', 'battle finished after fallback finalize');
    pairs = await S.getPairs(battle.id);
    ok(
        pairs.every((p) => p.winner),
        'every pair resolved to a winner/draw'
    );

    section('Graceful degradation when migration absent');
    const db2 = makeDB();
    const client2 = makeClient(db2, {
        throwOn: {
            table: 'group_battles',
            op: 'insert',
            message: 'column "invite_accepted" does not exist',
        },
    });
    win.SupabaseClient.client = client2; // note: helpers captured client at load; test via a fresh load
    const win2 = {
        SupabaseClient: { client: client2 },
        Groups: makeGroups(db2),
        Inbox: makeInbox(db2),
    };
    const sb2 = Object.assign({}, sandbox, { window: win2, DuoClone: function () {} });
    sb2.DuoClone.prototype = {};
    vm.createContext(sb2);
    vm.runInContext(src, sb2, { filename: 'app-groups2.js' });
    const badLetter = await sb2.window.GroupBattleSchedule.sendChallengeLetter('G1', 'Hổ Mang', u1);
    ok(
        !!badLetter.error && /group_battle_upgrades\.sql/.test(badLetter.error),
        'missing-migration message shown on letter send'
    );

    // ---------------- Render method assertions ----------------
    section('Render: phase-aware battle cards');
    win.SupabaseClient.client = client; // restore
    const fake = {
        escapeHtml: (s) => String(s == null ? '' : s),
        clickableGroupName: (id, n) => `GN(${n})`,
        calendarIconHtml: () => '',
        state: { profile: { id: 'u3' } },
    };
    [
        'renderBattleCard',
        'renderPairRows',
        'renderBattleChat',
        'renderFinishedBattleCard',
        'scoreboardHtml',
    ].forEach((m) => {
        fake[m] = proto[m];
    });
    const nameOf = async (id) => (id === 'G1' ? 'Rồng Lửa' : 'Hổ Mang Chúa Sơn Lâm');
    // stub chat/pairs for isolated render
    const realGetChat = S.getBattleChat,
        realGetPairs = S.getPairs;
    S.getBattleChat = async () => [];
    S.getPairs = async () => [
        {
            id: 'p',
            user_a_id: 'u3',
            user_b_id: 'u4',
            username_a: 'u3',
            username_b: 'u4',
            joined_a_at: null,
            joined_b_at: null,
            winner: null,
        },
    ];

    // letter phase, opponent admin (myGroupId G2)
    let html = await fake.renderBattleCard(
        { id: 'b', group_a_id: 'G1', group_b_id: 'G2', status: 'pending', invite_accepted: false },
        'G2',
        true,
        nameOf
    );
    ok(
        /NHẬN LỜI/.test(html) && /bb-accept-letter/.test(html) && /bb-decline-letter/.test(html),
        'letter phase (opponent admin) shows accept/decline'
    );

    // letter phase, challenger admin
    html = await fake.renderBattleCard(
        { id: 'b', group_a_id: 'G1', group_b_id: 'G2', status: 'pending', invite_accepted: false },
        'G1',
        true,
        nameOf
    );
    ok(/Đã gửi thư/.test(html), 'letter phase (challenger) shows waiting');

    // scheduling, challenger admin, no schedule yet -> set button
    html = await fake.renderBattleCard(
        {
            id: 'b',
            group_a_id: 'G1',
            group_b_id: 'G2',
            status: 'pending',
            invite_accepted: true,
            schedule_approved: false,
            scheduled_at: null,
        },
        'G1',
        true,
        nameOf
    );
    ok(
        /bb-set-schedule/.test(html) && /Đặt lịch & cược/.test(html),
        'scheduling (challenger) shows set-schedule'
    );
    ok(/bb-chat-send/.test(html), 'owner chat present for admin');

    // scheduling, opponent admin, schedule set + wager -> approve button + wager line
    html = await fake.renderBattleCard(
        {
            id: 'b',
            group_a_id: 'G1',
            group_b_id: 'G2',
            status: 'pending',
            invite_accepted: true,
            schedule_approved: false,
            scheduled_at: future,
            window_min: 30,
            wager_xp: 150,
        },
        'G2',
        true,
        nameOf
    );
    ok(/bb-approve/.test(html) && /CHẤP THUẬN/.test(html), 'scheduling (opponent) shows approve');
    ok(/💰 Cược: <b>150<\/b>/.test(html), 'wager line shown');

    // active window with pairs, viewer u3 is in the pair -> VÀO TRẬN
    html = await fake.renderBattleCard(
        {
            id: 'b',
            group_a_id: 'G1',
            group_b_id: 'G2',
            status: 'active',
            invite_accepted: true,
            schedule_approved: true,
            scheduled_at: new Date(Date.now() - 60000).toISOString(),
            window_min: 30,
        },
        'G1',
        true,
        nameOf
    );
    ok(/VÀO TRẬN/.test(html), 'active window shows join button for a participant');

    // non-admin viewer sees no chat / no action buttons in scheduling
    html = await fake.renderBattleCard(
        {
            id: 'b',
            group_a_id: 'G1',
            group_b_id: 'G2',
            status: 'pending',
            invite_accepted: true,
            schedule_approved: false,
            scheduled_at: future,
            window_min: 30,
            wager_xp: 0,
        },
        null,
        false,
        nameOf
    );
    ok(
        !/bb-chat-send/.test(html) && !/bb-approve/.test(html) && !/bb-set-schedule/.test(html),
        'non-admin sees no admin controls/chat'
    );

    // finished card: scoreboard + outcome + wager + steal + per-pair details
    S.getPairs = async () => [
        {
            id: 'p',
            user_a_id: 'u3',
            user_b_id: 'u4',
            username_a: 'u3',
            username_b: 'u4',
            winner: 'a',
        },
    ];
    html = await fake.renderFinishedBattleCard(
        {
            group_a_id: 'G1',
            group_b_id: 'G2',
            winner_group_id: 'G1',
            group_a_wins: 2,
            group_b_wins: 0,
            wager_xp: 100,
        },
        'G1',
        nameOf
    );
    ok(
        /🏆/.test(html) &&
            /group bạn/.test(html) &&
            /100<\/b> EXP/.test(html) &&
            /cướp 10% XP/.test(html),
        'finished card shows winner + wager + steal note'
    );
    ok(
        /bb-scoreboard/.test(html) && /Chi tiết từng cặp/.test(html),
        'finished card shows scoreboard + per-pair details'
    );
    // forfeit note appears when forfeited_by is set
    const fhtml = await fake.renderFinishedBattleCard(
        {
            group_a_id: 'G1',
            group_b_id: 'G2',
            winner_group_id: 'G1',
            group_a_wins: 1,
            group_b_wins: 0,
            forfeited_by_group_id: 'G2',
        },
        'G1',
        nameOf
    );
    ok(/bỏ cuộc/.test(fhtml), 'finished card shows forfeit note when a group quit');

    S.getBattleChat = realGetChat;
    S.getPairs = realGetPairs;

    // ================= New upgrade tests (realtime/forfeit/pairing/rewards) =================
    const online = () => new Date().toISOString();
    const offline = () => new Date(Date.now() - 10 * 60000).toISOString();

    section('Dedup fix: old-flow battle must NOT block a new challenge');
    {
        const d = makeDB();
        // An OLD "ĐẤU GROUP" battle (challenge_kind null) between G1 & G2, not finished.
        d.group_battles.push({
            id: nid(),
            group_a_id: 'G1',
            group_b_id: 'G2',
            initiated_by_group_id: 'G1',
            status: 'active',
            challenge_kind: null,
            invite_accepted: false,
            scheduled_at: null,
        });
        const m = loadModule(d);
        const r1 = await m.S.sendChallengeLetter('G1', 'Hổ Mang', u1);
        ok(!r1.error && r1.data, 'new letter succeeds despite an old-flow battle present');
        const r2 = await m.S.sendChallengeLetter('G1', 'Hổ Mang', u1);
        ok(
            !!r2.error && /đang có một lời thách đấu/.test(r2.error),
            'a second NEW letter is blocked (dedup on challenge_kind=letter)'
        );
        ok(
            m.db.group_battles.filter((b) => b.challenge_kind === 'letter').length === 1,
            'exactly one letter row created'
        );
    }

    section('Withdraw a pending letter, then re-challenge');
    {
        const d = makeDB();
        const m = loadModule(d);
        await m.S.sendChallengeLetter('G1', 'Hổ Mang', u1);
        const letter = m.db.group_battles.find((b) => b.challenge_kind === 'letter');
        const w = await m.S.withdrawBattle(letter.id);
        ok(!w.error, 'withdraw succeeds on a pending letter');
        ok(!m.db.group_battles.find((b) => b.id === letter.id), 'letter row removed');
        const again = await m.S.sendChallengeLetter('G1', 'Hổ Mang', u1);
        ok(!again.error && again.data, 're-challenge succeeds after withdraw');
        // withdraw must refuse an ACTIVE battle
        const act = m.db.group_battles.find((b) => b.challenge_kind === 'letter');
        act.status = 'active';
        const wa = await m.S.withdrawBattle(act.id);
        ok(
            m.db.group_battles.find((b) => b.id === act.id),
            'withdraw refuses to delete an ACTIVE battle'
        );
    }

    section('Decline / withdraw actually remove the letter (anti-"treo")');
    {
        const d = makeDB();
        const m = loadModule(d);
        await m.S.sendChallengeLetter('G1', 'Hổ Mang', u1);
        let letter = m.db.group_battles.find((b) => b.challenge_kind === 'letter');
        const dec = await m.S.declineInvite(letter.id);
        ok(!dec.error, 'declineInvite succeeds when the delete goes through');
        ok(
            !m.db.group_battles.find((b) => b.id === letter.id),
            'the letter row is actually removed on decline'
        );

        await m.S.sendChallengeLetter('G1', 'Hổ Mang', u1);
        letter = m.db.group_battles.find((b) => b.challenge_kind === 'letter');
        const wd = await m.S.withdrawBattle(letter.id);
        ok(!wd.error, 'withdrawBattle succeeds when the delete goes through');
        ok(
            !m.db.group_battles.find((b) => b.id === letter.id),
            'the letter row is actually removed on withdraw'
        );
    }

    section('Missing delete policy -> clear error, not a silent hang');
    {
        const d = makeDB();
        const m = loadModule(d, { blockDelete: true }); // RLS silently deletes 0 rows
        await m.S.sendChallengeLetter('G1', 'Hổ Mang', u1);
        const letter = m.db.group_battles.find((b) => b.challenge_kind === 'letter');
        const dec = await m.S.declineInvite(letter.id);
        ok(
            !!dec.error && /group_battle_delete_policy/.test(dec.error),
            'decline surfaces the migration message on a 0-row delete'
        );
        ok(
            !!m.db.group_battles.find((b) => b.id === letter.id),
            'letter still present (delete was blocked) — but user is told, not left hanging'
        );
        const wd = await m.S.withdrawBattle(letter.id);
        ok(
            !!wd.error && /group_battle_delete_policy/.test(wd.error),
            'withdraw surfaces the migration message on a 0-row delete'
        );
    }

    section('Online-priority pairing + one-sided auto-win (1-0)');
    {
        const d = makeDB();
        // G1: u1 online, u3 online. G2: u2 online, u4 OFFLINE.
        d.group_members = [
            {
                id: nid(),
                group_id: 'G1',
                user_id: 'u1',
                username: 'u1',
                role: 'owner',
                status: 'active',
                last_active_at: online(),
            },
            {
                id: nid(),
                group_id: 'G1',
                user_id: 'u3',
                username: 'u3',
                role: 'member',
                status: 'active',
                last_active_at: online(),
            },
            {
                id: nid(),
                group_id: 'G2',
                user_id: 'u2',
                username: 'u2',
                role: 'owner',
                status: 'active',
                last_active_at: online(),
            },
            {
                id: nid(),
                group_id: 'G2',
                user_id: 'u4',
                username: 'u4',
                role: 'member',
                status: 'active',
                last_active_at: offline(),
            },
        ];
        const m = loadModule(d, { realRpc: true });
        const past = new Date(Date.now() - 60000).toISOString();
        const battle = {
            id: nid(),
            group_a_id: 'G1',
            group_b_id: 'G2',
            initiated_by_group_id: 'G1',
            status: 'pending',
            schedule_approved: true,
            scheduled_at: past,
            window_min: 30,
            wager_xp: 0,
        };
        d.group_battles.push(battle);
        const r = await m.S.ensurePairsAndActivate(await m.S.getBattle(battle.id));
        ok(r.pairs === 2, 'two pairs seeded');
        ok(
            r.decidedAtKickoff === 1,
            'exactly one pair auto-decided at kickoff (the online-vs-offline one)'
        );
        const pairs = await m.S.getPairs(battle.id);
        const decided = pairs.find((p) => p.winner),
            undecidedP = pairs.find((p) => !p.winner);
        // The auto-decided pair pairs an online member vs offline u4, won by the online side.
        ok(
            decided &&
                (decided.user_a_id === 'u4' ? decided.winner === 'b' : decided.winner === 'a'),
            'auto-win goes to the ONLINE side (offline u4 loses)'
        );
        ok(
            undecidedP && undecidedP.user_a_id !== 'u4' && undecidedP.user_b_id !== 'u4',
            'the undecided pair is the online-vs-online one'
        );
    }

    section('Forfeit: quitting group is judged the loser + rewards apply');
    {
        const d = makeDB();
        const m = loadModule(d, { realRpc: true });
        // Active battle, window still OPEN, two undecided pairs. G1 forfeits -> G2 wins.
        const future = new Date(Date.now() + 20 * 60000).toISOString();
        const battle = {
            id: nid(),
            group_a_id: 'G1',
            group_b_id: 'G2',
            initiated_by_group_id: 'G1',
            status: 'active',
            schedule_approved: true,
            scheduled_at: future,
            window_min: 30,
            wager_xp: 100,
            rewards_applied: false,
            group_a_wins: 0,
            group_b_wins: 0,
        };
        d.group_battles.push(battle);
        d.group_battle_pairs.push(
            {
                id: nid(),
                battle_id: battle.id,
                user_a_id: 'u1',
                username_a: 'u1',
                user_b_id: 'u2',
                username_b: 'u2',
                winner: null,
                joined_a_at: null,
                joined_b_at: null,
            },
            {
                id: nid(),
                battle_id: battle.id,
                user_a_id: 'u3',
                username_a: 'u3',
                user_b_id: 'u4',
                username_b: 'u4',
                winner: null,
                joined_a_at: null,
                joined_b_at: null,
            }
        );
        const g2before = d.groups.find((g) => g.id === 'G2').vibrancy_score;
        const g1before = d.groups.find((g) => g.id === 'G1').vibrancy_score;
        const r = await m.S.forfeitBattle(await m.S.getBattle(battle.id), 'G1', u1);
        ok(r.forfeited === true && !r.error, 'forfeit executed');
        const after = await m.S.getBattle(battle.id);
        ok(
            after.status === 'finished',
            'battle finished immediately on forfeit (window still open)'
        );
        ok(after.winner_group_id === 'G2', 'the NON-forfeiting group (G2) is the winner');
        ok(after.forfeited_by_group_id === 'G1', 'forfeited_by records the quitting group');
        ok(
            d.groups.find((g) => g.id === 'G2').vibrancy_score === g2before + 100,
            'winner gains the 100 EXP wager'
        );
        ok(
            d.groups.find((g) => g.id === 'G1').vibrancy_score === g1before - 100,
            'forfeiter loses the 100 EXP wager'
        );
    }

    section('Rewards: zero-sum 10% XP steal for participating winners');
    {
        const d = makeDB();
        // u4 (loser side, joined) has 400 xp -> 40 stolen; u3 (winner side, joined) +40.
        d.profiles = [
            { id: 'u1', username: 'u1', xp: 1000 },
            { id: 'u2', username: 'u2', xp: 800 },
            { id: 'u3', username: 'u3', xp: 500 },
            { id: 'u4', username: 'u4', xp: 400 },
        ];
        const m = loadModule(d, { realRpc: true });
        const closed = new Date(Date.now() - 40 * 60000).toISOString();
        const battle = {
            id: nid(),
            group_a_id: 'G1',
            group_b_id: 'G2',
            initiated_by_group_id: 'G1',
            status: 'active',
            schedule_approved: true,
            scheduled_at: closed,
            window_min: 30,
            wager_xp: 0,
            rewards_applied: false,
            group_a_wins: 0,
            group_b_wins: 0,
        };
        d.group_battles.push(battle);
        // Pair: u3 (A, joined & won) vs u4 (B, joined). A wins the group.
        d.group_battle_pairs.push({
            id: nid(),
            battle_id: battle.id,
            user_a_id: 'u3',
            username_a: 'u3',
            user_b_id: 'u4',
            username_b: 'u4',
            winner: 'a',
            decided_at: closed,
            joined_a_at: closed,
            joined_b_at: closed,
        });
        await m.S.finalizeScheduledBattle(battle.id);
        ok(d.profiles.find((p) => p.id === 'u4').xp === 360, 'loser u4 lost 10% (400 -> 360)');
        ok(
            d.profiles.find((p) => p.id === 'u3').xp === 540,
            'winner u3 gained the same 40 (500 -> 540) — zero-sum'
        );
    }

    section('End-of-arena inbox summary sent to each paired user');
    {
        const d = makeDB();
        d.profiles = [
            { id: 'u1', username: 'u1', xp: 1000 },
            { id: 'u2', username: 'u2', xp: 800 },
            { id: 'u3', username: 'u3', xp: 500 },
            { id: 'u4', username: 'u4', xp: 400 },
        ];
        const m = loadModule(d, { realRpc: true });
        const closed = new Date(Date.now() - 40 * 60000).toISOString();
        const battle = {
            id: nid(),
            group_a_id: 'G1',
            group_b_id: 'G2',
            initiated_by_group_id: 'G1',
            status: 'active',
            schedule_approved: true,
            scheduled_at: closed,
            window_min: 30,
            wager_xp: 100,
            rewards_applied: false,
            group_a_wins: 0,
            group_b_wins: 0,
        };
        d.group_battles.push(battle);
        // u3 (G1, joined, wins) vs u4 (G2, joined). G1 wins the battle.
        d.group_battle_pairs.push({
            id: nid(),
            battle_id: battle.id,
            user_a_id: 'u3',
            username_a: 'u3',
            user_b_id: 'u4',
            username_b: 'u4',
            winner: 'a',
            decided_at: closed,
            joined_a_at: closed,
            joined_b_at: closed,
        });
        await m.S.finalizeScheduledBattle(battle.id);
        const msgs = d.direct_messages;
        const toU3 = msgs.find((x) => x.recipient_id === 'u3'),
            toU4 = msgs.find((x) => x.recipient_id === 'u4');
        ok(msgs.length === 2, 'exactly one inbox message per paired user (2 total)');
        ok(
            toU3 &&
                /CHÚC MỪNG CHIẾN THẮNG/.test(toU3.message) &&
                /CƯỚP được \+40 XP/.test(toU3.message),
            'winner u3 gets a congrats + "+40 XP stolen" summary'
        );
        ok(
            toU4 && /đã thua/.test(toU4.message) && /cướp mất 40 XP/.test(toU4.message),
            'loser u4 gets a condolence + "-40 XP" summary'
        );
        ok(
            toU3 && toU3.sender_id === 'u1',
            "u3's summary is sent by their own captain (G1 owner u1)"
        );
        ok(
            toU4 && toU4.sender_id === 'u2',
            "u4's summary is sent by their own captain (G2 owner u2)"
        );
        ok(
            /Group được \+100 EXP tiền cược/.test(toU3.message) &&
                /Group mất 100 EXP tiền cược/.test(toU4.message),
            'wager movement noted for both sides'
        );
    }

    section('End-of-arena DM: draw case = "HÒA" + XP unchanged');
    {
        const d = makeDB();
        const m = loadModule(d, { realRpc: true });
        const closed = new Date(Date.now() - 40 * 60000).toISOString();
        const battle = {
            id: nid(),
            group_a_id: 'G1',
            group_b_id: 'G2',
            initiated_by_group_id: 'G1',
            status: 'active',
            schedule_approved: true,
            scheduled_at: closed,
            window_min: 30,
            wager_xp: 0,
            rewards_applied: false,
            group_a_wins: 0,
            group_b_wins: 0,
        };
        d.group_battles.push(battle);
        // Neither joined -> pair draws.
        d.group_battle_pairs.push({
            id: nid(),
            battle_id: battle.id,
            user_a_id: 'u3',
            username_a: 'u3',
            user_b_id: 'u4',
            username_b: 'u4',
            winner: null,
            joined_a_at: null,
            joined_b_at: null,
        });
        await m.S.finalizeScheduledBattle(battle.id);
        const toU3 = d.direct_messages.find((x) => x.recipient_id === 'u3');
        ok(
            toU3 && /HÒA/.test(toU3.message) && /không thay đổi/.test(toU3.message),
            'draw summary: HÒA + XP không thay đổi'
        );
    }

    section('syncScheduledBattle finalizes early once all pairs decided');
    {
        const d = makeDB();
        const m = loadModule(d, { realRpc: true });
        const future = new Date(Date.now() + 20 * 60000).toISOString(); // window still open
        const battle = {
            id: nid(),
            group_a_id: 'G1',
            group_b_id: 'G2',
            initiated_by_group_id: 'G1',
            status: 'active',
            schedule_approved: true,
            scheduled_at: future,
            window_min: 30,
            wager_xp: 0,
            rewards_applied: false,
            group_a_wins: 0,
            group_b_wins: 0,
        };
        d.group_battles.push(battle);
        d.group_battle_pairs.push(
            {
                id: nid(),
                battle_id: battle.id,
                user_a_id: 'u1',
                username_a: 'u1',
                user_b_id: 'u2',
                username_b: 'u2',
                winner: 'a',
                joined_a_at: future,
                joined_b_at: null,
            },
            {
                id: nid(),
                battle_id: battle.id,
                user_a_id: 'u3',
                username_a: 'u3',
                user_b_id: 'u4',
                username_b: 'u4',
                winner: 'a',
                joined_a_at: future,
                joined_b_at: null,
            }
        );
        await m.S.syncScheduledBattle(await m.S.getBattle(battle.id));
        const after = await m.S.getBattle(battle.id);
        ok(
            after.status === 'finished',
            'all-decided active battle finalizes before the window closes'
        );
        ok(after.winner_group_id === 'G1', 'winner tallied correctly (2-0 G1)');
    }

    console.log('\n=========================================');
    console.log(`RESULT: ${PASS} passed, ${FAIL} failed`);
    process.exit(FAIL ? 1 : 0);
})().catch((e) => {
    console.error('TEST CRASH:', e);
    process.exit(2);
});
