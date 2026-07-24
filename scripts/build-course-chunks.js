#!/usr/bin/env node
// Build step for lazy-loaded course data (Foundation GĐ0, Approach A).
//
// Reads the assembled COURSE_DATA (data.js + course-part1/2/3.js) and emits:
//   data/course/manifest.js   -> window.COURSE_MANIFEST = {v, chunkSize, unitCount,
//                                 settings, units:[{t:title, n:lessonCount}, ...]}  (~small)
//   data/course/chunk-NNN.js  -> (window.COURSE_CHUNKS ||= {})[NNN] = [ ...full units... ]
//
// The client loads manifest.js eagerly (tiny) and fetches only the chunk(s) for the
// chapter the user is actually in — cutting the first-ever download from ~32MB to <1MB.
// The big data/course-part*.js files are left in place (untouched) so nothing else breaks;
// index.html simply stops loading them. Re-run this whenever course content changes.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const OUT = path.join(DATA, 'course');
const CHUNK_SIZE = 25;
const VERSION = process.argv[2] || new Date().toISOString().slice(0, 10).replace(/-/g, '');

function loadCourseData() {
    const sandbox = {};
    vm.createContext(sandbox);
    const src =
        fs.readFileSync(path.join(DATA, 'data.js'), 'utf8') +
        '\n' +
        fs.readFileSync(path.join(DATA, 'course-part1.js'), 'utf8') +
        '\n' +
        fs.readFileSync(path.join(DATA, 'course-part2.js'), 'utf8') +
        '\n' +
        fs.readFileSync(path.join(DATA, 'course-part3.js'), 'utf8') +
        '\n;globalThis.__CD = COURSE_DATA;';
    vm.runInContext(src, sandbox);
    return sandbox.__CD;
}

function main() {
    const CD = loadCourseData();
    if (!CD || !Array.isArray(CD.units)) {
        console.error('Could not read COURSE_DATA.units'); process.exit(1);
    }
    const units = CD.units;
    const total = units.length;
    fs.mkdirSync(OUT, { recursive: true });

    // Clean out any stale chunk files from a previous run so a shrunk course can't leave
    // orphan chunks around.
    for (const f of fs.readdirSync(OUT)) {
        if (/^chunk-\d+\.js$/.test(f)) fs.unlinkSync(path.join(OUT, f));
    }

    const chunkCount = Math.ceil(total / CHUNK_SIZE);
    let bytes = 0;
    for (let c = 0; c < chunkCount; c++) {
        const slice = units.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
        const name = 'chunk-' + String(c).padStart(3, '0') + '.js';
        const body = '(window.COURSE_CHUNKS=window.COURSE_CHUNKS||{})[' + c + ']=' + JSON.stringify(slice) + ';\n';
        fs.writeFileSync(path.join(OUT, name), body);
        bytes += Buffer.byteLength(body);
    }

    const manifest = {
        v: VERSION,
        chunkSize: CHUNK_SIZE,
        unitCount: total,
        settings: CD.settings || {},
        units: units.map((u) => ({ t: u.title || '', n: (u.lessons || []).length })),
    };
    const manBody = 'window.COURSE_MANIFEST=' + JSON.stringify(manifest) + ';\n';
    fs.writeFileSync(path.join(OUT, 'manifest.js'), manBody);

    console.log('Built lazy course data:');
    console.log('  units       : ' + total);
    console.log('  chunks      : ' + chunkCount + ' x ' + CHUNK_SIZE + ' units  (' + (bytes / 1048576).toFixed(1) + ' MB total, unchanged)');
    console.log('  manifest    : ' + (Buffer.byteLength(manBody) / 1024).toFixed(1) + ' KB  (loaded eagerly)');
    console.log('  version     : ' + VERSION);
    console.log('  output      : data/course/');
}

main();
