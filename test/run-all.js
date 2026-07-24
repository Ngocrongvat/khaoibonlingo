#!/usr/bin/env node
// Test runner: discovers every *.test.js in this folder, runs each in its own Node
// process (isolation — a crash or global leak in one suite can't corrupt another), and
// aggregates the "RESULT: N passed, M failed" line each suite prints. Exits non-zero if
// any suite fails or crashes, so `npm test` gates CI. Zero external dependencies.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const dir = __dirname;
const suites = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.test.js'))
    .sort();

if (suites.length === 0) {
    console.error('No *.test.js suites found in ' + dir);
    process.exit(1);
}

let totalPassed = 0;
let totalFailed = 0;
let brokenSuites = 0;
const rows = [];

for (const file of suites) {
    const res = spawnSync(process.execPath, [path.join(dir, file)], { encoding: 'utf8' });
    const out = (res.stdout || '') + (res.stderr || '');
    const m = out.match(/RESULT:\s*(\d+)\s*passed,\s*(\d+)\s*failed/);
    const passed = m ? parseInt(m[1], 10) : 0;
    const failed = m ? parseInt(m[2], 10) : 0;
    const crashed = res.status !== 0 && !m;

    if (crashed) brokenSuites++;
    totalPassed += passed;
    totalFailed += failed;

    const ok = res.status === 0 && failed === 0 && !crashed;
    rows.push({ file, passed, failed, ok, crashed });
    if (!ok) {
        // Surface the failing suite's own output so CI logs show exactly what broke.
        console.log('\n----- ' + file + ' output -----');
        console.log(out.trim());
    }
}

console.log('\n=========================================');
console.log('  KhoaiBonlingo test suites');
console.log('=========================================');
for (const r of rows) {
    const status = r.crashed ? 'CRASH' : r.ok ? ' PASS' : ' FAIL';
    console.log(`  [${status}] ${r.file.padEnd(20)} ${r.passed} passed, ${r.failed} failed`);
}
console.log('-----------------------------------------');
console.log(
    `  TOTAL: ${totalPassed} passed, ${totalFailed} failed` +
        (brokenSuites ? `, ${brokenSuites} crashed` : '')
);
console.log('=========================================');

process.exit(totalFailed > 0 || brokenSuites > 0 ? 1 : 0);
