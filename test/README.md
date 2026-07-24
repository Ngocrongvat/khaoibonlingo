# Tests

Logic tests for KhoaiBonlingo. Each `*.test.js` loads a real source module from
`assets/js/` into a Node `vm` sandbox (with lightweight DOM/window/data stubs) and asserts
its behaviour — **no browser, no build, no dependencies** (Node built-ins only).

## Run

```bash
npm test          # runs every *.test.js and prints an aggregate PASS/FAIL table
node test/battle.test.js   # run a single suite directly
```

`npm test` (→ `node test/run-all.js`) exits non-zero if any suite fails or crashes, so it
gates CI (`.github/workflows/ci.yml`).

## Suites

| Suite | Covers |
|-------|--------|
| `battle.test.js` | Group-battle flow: challenge letters, scheduling, pairing/auto-win, forfeit, result DMs (`app-groups2.js`) |
| `cluster_a.test.js` | Beginner exercise adaptation: decoy strip, MC reduction, translate→dictation, easy-mode override (`app-lesson.js`) |
| `gate.test.js` | End-of-chapter gate test: queue build, pass threshold, 2× XP, chapter advance (`app-lesson.js`) |
| `catch.test.js` | Result routing, catch-the-mascot flow, answer reveal gated on kids/Easy mode (`app-misc.js`) |
| `games.test.js` | Difficulty filtering + timers for the mini-games (`games.js`) |
| `scenario.test.js` | Coherent per-chapter dialogue generation (`scenarios.js`) |

## Adding a suite

Drop a `something.test.js` into this folder that prints a final
`RESULT: <n> passed, <m> failed` line and exits non-zero on failure. `run-all.js`
discovers it automatically.
