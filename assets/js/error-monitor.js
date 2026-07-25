// Client-side error monitoring (Foundation GĐ0, item 4). Self-hosted to Supabase — no
// third-party vendor, so no user data leaves your own backend (better for a children's app
// and the later compliance track). Captures uncaught JS errors + unhandled promise
// rejections and inserts them into public.client_errors (see migration
// supabase/migrations/client_error_log.sql — reads are dashboard/service-role only).
//
// Loaded AFTER supabase-client.js and BEFORE app.js so its handlers are installed before the
// app runs. The monitor must NEVER throw or surface its own failures to the user, and it
// dedupes + rate-limits so a render loop can't flood the table.
(function () {
    'use strict';

    var APP_VERSION = '20260745';
    var MAX_PER_SESSION = 15; // hard cap so a tight error loop can't spam the DB
    var seen = {}; // signature -> true (collapse identical repeats)
    var sent = 0;
    var queue = []; // records buffered until the Supabase client is ready
    var flushing = false;

    function client() {
        return (window.SupabaseClient && window.SupabaseClient.client) || null;
    }

    function currentUser() {
        try {
            return (window.app && window.app.state && window.app.state.currentUser) || null;
        } catch (e) {
            return null;
        }
    }

    function signature(r) {
        return (
            (r.message || '') +
            '@' +
            (r.source || '') +
            ':' +
            (r.lineno || 0) +
            ':' +
            (r.colno || 0)
        );
    }

    function flush() {
        if (flushing) return;
        var c = client();
        if (!c || !queue.length) return;
        flushing = true;
        var batch = queue.slice();
        queue = [];
        try {
            c.from('client_errors')
                .insert(batch)
                .then(
                    function () {
                        flushing = false;
                        if (queue.length) flush();
                    },
                    function () {
                        // Insert failed (table missing / RLS / offline). Drop silently — the
                        // monitor never retries forever or shows its own errors.
                        flushing = false;
                    }
                );
        } catch (e) {
            flushing = false;
        }
    }

    function record(partial) {
        try {
            if (sent >= MAX_PER_SESSION) return;
            var r = {
                message: String(partial.message || 'Unknown error').slice(0, 500),
                source: partial.source ? String(partial.source).slice(0, 300) : null,
                lineno: partial.lineno || null,
                colno: partial.colno || null,
                stack: partial.stack ? String(partial.stack).slice(0, 2000) : null,
                page_url: String(location.href).slice(0, 300),
                user_agent: String(navigator.userAgent || '').slice(0, 300),
                username: currentUser(),
                app_version: APP_VERSION,
            };
            var s = signature(r);
            if (seen[s]) return; // already reported this exact error this session
            seen[s] = true;
            sent++;
            queue.push(r);
            flush();
        } catch (e) {
            /* the monitor must never throw */
        }
    }

    window.addEventListener('error', function (e) {
        if (!e) return;
        // Resource-load failures (img/script/css) fire here with an element target and no
        // e.error — skip them; they're noisy and the SW/caching layer owns asset delivery.
        if (e.target && e.target !== window && e.target.tagName) return;
        record({
            message: e.message || (e.error && e.error.message) || 'Unknown error',
            source: e.filename,
            lineno: e.lineno,
            colno: e.colno,
            stack: e.error && e.error.stack,
        });
    });

    window.addEventListener('unhandledrejection', function (e) {
        var reason = e && e.reason;
        record({
            message:
                (reason && (reason.message || String(reason))) || 'Unhandled promise rejection',
            stack: reason && reason.stack,
        });
    });

    // If early errors were buffered before the Supabase client finished initialising, drain
    // them once it appears (then stop — no perpetual timer).
    var tries = 0;
    var iv = setInterval(function () {
        tries++;
        if (queue.length && client()) flush();
        if (tries >= 15 || (!queue.length && client())) clearInterval(iv);
    }, 1000);

    // Exposed so app code can log a handled-but-notable problem: window.ErrorMonitor.record({message}).
    window.ErrorMonitor = { record: record };
})();
