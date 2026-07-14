/*
 * MascotVoice - plays the mascot's reaction SOUND EFFECTS from audio files in
 * assets/sounds/. Each reaction has SEVERAL numbered variants (correct1.mp3,
 * correct2.mp3, ...) and we pick one at random each time (never the same one
 * twice in a row) so the mascot never sounds repetitive.
 *
 * The API (window.MascotVoice.play(type), .jingle()) is unchanged, so nothing
 * else in the app had to change.
 *
 * Robust by design:
 *   - a fresh Audio element per play lets rapid reactions overlap;
 *   - a missing file or a blocked autoplay just stays silent (never throws).
 *
 * To add more variants later: drop e.g. correct3.mp3 in assets/sounds/ and bump
 * the number in VARIANTS below.
 */
(function () {
    'use strict';

    const BASE = 'assets/sounds/';

    // reaction/file group -> how many numbered variants exist (name1..nameN).
    const VARIANTS = {
        correct: 2,   // correct1.mp3, correct2.mp3
        wrong: 4,
        cheer: 1,
        complete: 3,
        cry: 3,
        whimper: 3,
        sparkle: 2,
        smile: 9,     // laughs / cheers used by the home-screen "play with me" taps
    };

    // reaction TYPE (what the app calls playTone with) -> { file group, volume }.
    const REACTIONS = {
        correct: { file: 'correct', vol: 0.8 },
        ding: { file: 'correct', vol: 0.8 },
        oops: { file: 'wrong', vol: 0.8 },
        wrong: { file: 'wrong', vol: 0.8 },   // games.js uses 'wrong'
        cheer: { file: 'cheer', vol: 0.9 },
        fanfare: { file: 'complete', vol: 0.95 },
        cry: { file: 'cry', vol: 0.85 },
        whimper: { file: 'whimper', vol: 0.8 },
        sparkle: { file: 'sparkle', vol: 0.85 },
        smile: { file: 'smile', vol: 0.9 },
        // 'flip' (memory-game card flip) intentionally has no sound - a click on
        // every card flip would be spammy. Drop a flip.mp3 + add it here to enable.
    };

    class MascotVoice {
        constructor() {
            this.base = BASE;
            this.muted = false;
            this._last = {};   // last variant index played per file group (avoid repeats)
        }

        // Pick a random 1-based variant index for a group, avoiding an immediate repeat.
        _pick(group) {
            const n = VARIANTS[group] || 1;
            if (n <= 1) return 1;
            let i, guard = 0;
            do { i = 1 + Math.floor(Math.random() * n); guard++; } while (i === this._last[group] && guard < 8);
            this._last[group] = i;
            return i;
        }

        play(type) {
            if (this.muted) return;
            const r = REACTIONS[type];
            if (!r) return;
            try {
                const src = this.base + r.file + this._pick(r.file) + '.mp3';
                const a = new Audio(src);
                a.volume = r.vol;
                const p = a.play();
                if (p && p.catch) p.catch(() => { });
            } catch (e) { /* stay silent */ }
        }

        // Completion music is carried by the 'complete' sound effect (fired via
        // playTone('fanfare')), so the separate jingle is a no-op.
        jingle() { }
    }

    window.MascotVoice = new MascotVoice();
})();
