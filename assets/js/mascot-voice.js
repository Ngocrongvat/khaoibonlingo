/*
 * MascotVoice - plays the mascot's reaction SOUND EFFECTS from audio files.
 *
 * (This replaces the old Web-Audio "synth voice" engine. Real cute/funny sound
 * effects live as files in assets/sounds/ - drop them in and they just work.
 * See assets/sounds/README.md for the exact filenames and what each one is for.)
 *
 * Every reaction the app fires - playTone('correct' | 'cheer' | ...) - maps to
 * one sound file here. The API (window.MascotVoice.play(type), .jingle()) is
 * unchanged, so nothing else in the app had to change.
 *
 * Robust by design:
 *   - each type maps to a file name; we try .mp3 first, then .wav, so whatever
 *     format you drop in works;
 *   - a fresh Audio element per play lets rapid reactions overlap instead of
 *     cutting each other off;
 *   - a missing file or a blocked autoplay just stays silent (never throws).
 */
(function () {
    'use strict';

    const BASE = 'assets/sounds/';

    // reaction type -> { file (basename in assets/sounds/), vol }.
    // Several answer aliases share one file (e.g. 'ding' and 'correct').
    const REACTIONS = {
        correct: { file: 'correct', vol: 0.75 },
        ding: { file: 'correct', vol: 0.75 },
        oops: { file: 'wrong', vol: 0.75 },
        cheer: { file: 'cheer', vol: 0.85 },
        fanfare: { file: 'complete', vol: 0.9 },
        cry: { file: 'cry', vol: 0.8 },
        whimper: { file: 'whimper', vol: 0.7 },
        sparkle: { file: 'sparkle', vol: 0.75 },
    };

    class MascotVoice {
        constructor() {
            this.base = BASE;
            this.muted = false;
        }

        play(type) {
            if (this.muted) return;
            const r = REACTIONS[type];
            if (!r) return;
            try {
                const a = new Audio();
                a.volume = r.vol;
                // Try .mp3 first; on load failure fall back once to .wav so the
                // mascot still speaks whatever format you exported.
                a.addEventListener('error', () => {
                    if (a.dataset.fallback !== '1') {
                        a.dataset.fallback = '1';
                        a.src = this.base + r.file + '.wav';
                        const p = a.play();
                        if (p && p.catch) p.catch(() => { });
                    }
                });
                a.src = this.base + r.file + '.mp3';
                const p = a.play();
                if (p && p.catch) p.catch(() => { });
            } catch (e) { /* stay silent */ }
        }

        // Completion music is now carried by the 'complete' sound effect itself
        // (fired via playTone('fanfare')), so the separate jingle is a no-op.
        jingle() { }
    }

    window.MascotVoice = new MascotVoice();
})();
