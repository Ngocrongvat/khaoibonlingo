// Lazy course-data loader (Foundation GĐ0, Approach A).
//
// Runs BEFORE app.js. Reads the tiny window.COURSE_MANIFEST (titles + lesson counts for
// all units, ~58KB) and synchronously builds window.COURSE_DATA with a full-length units
// array pre-filled with lightweight STUBS ({title, lessons:[], __stub:true}). app.js keeps
// doing `this.state.courseData = COURSE_DATA` unchanged, so `.units.length` (real count),
// `.units.map(u=>u.title)` (the path strip) and `.settings` all work immediately with zero
// bytes of exercise content downloaded.
//
// Full exercise content lives in data/course/chunk-NNN.js (25 units each). window.CourseLoader
// fetches a chunk on demand and hydrates the matching stub slots in place. The app awaits
// CourseLoader.ensure(idx) at its four render gateways (renderHomeDashboard, renderPathMap,
// renderLesson, launchUnitScenario) so a chapter's real content is present before it draws.
// Result: first-ever load drops from ~32MB to <1MB; the Service Worker then caches each
// fetched chunk for instant offline reuse.
(function () {
    'use strict';
    var man = typeof window !== 'undefined' ? window.COURSE_MANIFEST : null;
    if (!man || !Array.isArray(man.units)) {
        // Manifest failed to load (e.g. offline first visit). Leave COURSE_DATA undefined;
        // the app already guards `if (!this.state.courseData)` and shows a friendly notice.
        return;
    }

    var chunkSize = man.chunkSize || 25;
    var version = man.v || '';
    var total = man.unitCount || man.units.length;

    // Pre-fill the units array with stubs so every synchronous consumer keeps working.
    var units = new Array(total);
    for (var i = 0; i < total; i++) {
        units[i] = { title: man.units[i] ? man.units[i].t : '', description: '', lessons: [], __stub: true };
    }
    window.COURSE_DATA = { settings: man.settings || {}, units: units };

    var loadedChunks = {}; // chunkIndex -> true
    var inflight = {}; // chunkIndex -> Promise

    function chunkOf(idx) {
        return Math.floor(idx / chunkSize);
    }

    function hydrate(c) {
        var store = window.COURSE_CHUNKS;
        var arr = store ? store[c] : null;
        if (!arr) return;
        var base = c * chunkSize;
        for (var j = 0; j < arr.length; j++) {
            units[base + j] = arr[j]; // replace the stub with the real, full unit
        }
        delete store[c]; // avoid keeping two references to the same units
    }

    function loadChunk(c) {
        if (loadedChunks[c]) return Promise.resolve();
        if (inflight[c]) return inflight[c];
        var p = new Promise(function (resolve) {
            var s = document.createElement('script');
            s.src = 'data/course/chunk-' + String(c).padStart(3, '0') + '.js' + (version ? '?d=' + version : '');
            s.async = true;
            s.onload = function () {
                hydrate(c);
                loadedChunks[c] = true;
                delete inflight[c];
                resolve();
            };
            s.onerror = function () {
                // Fail soft: the stub stays; a retry can try again. Never reject (a thrown
                // rejection at a render gateway would blank the screen).
                delete inflight[c];
                resolve();
            };
            document.head.appendChild(s);
        });
        inflight[c] = p;
        return p;
    }

    window.CourseLoader = {
        chunkSize: chunkSize,
        unitCount: total,
        // True when idx is out of range (nothing to load) or its chunk is already resident.
        isLoaded: function (idx) {
            if (idx == null || idx < 0 || idx >= total) return true;
            return !!loadedChunks[chunkOf(idx)];
        },
        // Promise that resolves once idx's chunk is resident (immediate if already loaded).
        ensure: function (idx) {
            if (idx == null || idx < 0 || idx >= total) return Promise.resolve();
            return loadChunk(chunkOf(idx));
        },
        // Fire-and-forget: warm the chunk AFTER the one covering idx, so advancing to the
        // next chapter is seamless. Safe no-op at the end of the course.
        prefetch: function (idx) {
            if (idx == null || idx < 0) return;
            var next = (chunkOf(idx) + 1) * chunkSize;
            if (next < total && !this.isLoaded(next)) loadChunk(chunkOf(next));
        },
    };
})();
