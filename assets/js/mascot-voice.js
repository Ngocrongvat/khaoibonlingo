/*
 * MascotVoice - a tiny, dependency-free "cartoon voice" engine for the mascot.
 *
 * The old reactions were single-oscillator melodies (a "beep" for correct, a
 * descending buzz for wrong). This replaces them with *vocalisations*: giggles,
 * cheers, sobs and self-pity whimpers that sound like a little character is
 * actually reacting - closer to voice-over than to a game chime.
 *
 * How it works (formant synthesis, 100% offline, no audio files):
 *   - a buzzy glottal SOURCE (sawtooth at a childlike fundamental f0), plus a
 *     gentle vibrato so it never sounds robotic;
 *   - three parallel bandpass FORMANT filters tuned to a vowel ("a", "ee", "oo"
 *     ...). Sweeping their frequencies morphs one vowel into another, which is
 *     what makes "wa->ah" (crying) or "ee->ah" (laughing) read as speech;
 *   - a per-syllable amplitude ENVELOPE carves the buzz into syllables
 *     (ha-ha-ha, boo-hoo, yaaay), with an optional tremolo LFO for the shaky
 *     "sniffling" quality of a cry;
 *   - a touch of breath NOISE for sobs/sniffles.
 *
 * Public API: window.MascotVoice.play('cheer' | 'cry' | 'ding' | ...).
 * It owns a single lazily-created AudioContext and self-resumes after the first
 * user gesture, so callers just fire and forget.
 */
(function () {
    'use strict';

    // Vowel formant tables [F1, F2, F3] in Hz. Higher F1 => more "open" (ah),
    // higher F2 => more "front" (ee). These are nudged brighter than an adult
    // voice so the mascot reads as small and cute.
    // Formants nudged up ~12% vs an adult voice: a small child's vocal tract sits
    // higher, which is a big part of reading as "cute kid" rather than "grown-up".
    const VOWELS = {
        a: [920, 1400, 3100], // "ah"  (father)
        e: [560, 2150, 2950], // "eh"  (bed) -> leans to a smile
        i: [360, 2800, 3500], // "ee"  (see) -> giggly, bright
        o: [560, 1010, 2800], // "oh"  (go)
        u: [370, 900, 2700],  // "oo"  (boot) -> pouty, sob
    };

    const FORMANT_GAIN = [1.0, 0.55, 0.22]; // F1 loudest, F3 softest
    const clampMul = 0.9; // global headroom so overlapping syllables don't clip

    const rand = (a, b) => a + Math.random() * (b - a);
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    class MascotVoice {
        constructor() {
            this.ctx = null;
            this.master = null;
        }

        // Lazily build the context + a shared limiter. Safe to call every time.
        ensure() {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return null;
            if (!this.ctx) {
                this.ctx = new AudioCtx();
                const comp = this.ctx.createDynamicsCompressor();
                comp.threshold.value = -14;
                comp.ratio.value = 12;
                comp.attack.value = 0.003;
                comp.release.value = 0.18;
                comp.connect(this.ctx.destination);
                this.master = comp;
            }
            if (this.ctx.state === 'suspended') this.ctx.resume();
            return this.ctx;
        }

        // A block of white noise, `dur` seconds long (for breath/sniffle layers).
        noiseBuf(dur) {
            const ctx = this.ctx;
            const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
            const b = ctx.createBuffer(1, n, ctx.sampleRate);
            const d = b.getChannelData(0);
            for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
            return b;
        }

        // Schedule one voiced syllable. All timing is absolute (ctx time) so
        // callers can lay syllables out on a timeline. The voice is built to sound
        // like a small child, not a beep:
        //   - pitched up into a child register (CHILD);
        //   - two DETUNED saws + a triangle (a chorused, living tone - never a pure
        //     sine "beep");
        //   - a formant bank that shapes it into an actual vowel;
        //   - a breath-noise layer for airy softness;
        //   - vibrato + fast micro-jitter so the pitch never sits dead-still.
        syllable(start, o) {
            const ctx = this.ctx;
            const dur = o.dur;
            const end = start + dur;
            const peak = (o.gain != null ? o.gain : 0.7) * clampMul;
            const pm = this.pitchMul || 1;
            const CHILD = 1.22;                                   // small-child register
            const f0From = o.f0From * pm * CHILD;
            const f0To = (o.f0To || o.f0From) * pm * CHILD;

            if (o.cons) this.consonant(start, o.cons);

            // --- per-syllable amplitude envelope ---
            const amp = ctx.createGain();
            const atk = Math.min(0.05, dur * 0.28);
            amp.gain.setValueAtTime(0.0001, start);
            amp.gain.exponentialRampToValueAtTime(peak, start + atk);
            amp.gain.setValueAtTime(peak, Math.max(start + atk + 0.01, end - dur * 0.4));
            amp.gain.exponentialRampToValueAtTime(0.0001, end);
            if (o.tremolo) {
                const tlfo = ctx.createOscillator(); tlfo.type = 'sine';
                tlfo.frequency.value = o.tremoloHz || 7;
                const tg = ctx.createGain(); tg.gain.value = peak * o.tremolo;
                tlfo.connect(tg); tg.connect(amp.gain);
                tlfo.start(start); tlfo.stop(end + 0.05);
            }

            // --- pitch modulation hub: vibrato + organic jitter, fanned to all oscs ---
            const mods = [];
            if (o.vibrato) {
                const lfo = ctx.createOscillator(); lfo.type = 'sine';
                lfo.frequency.value = o.vibratoHz || 5.5;
                const lg = ctx.createGain(); lg.gain.value = o.vibrato;
                lfo.connect(lg); mods.push({ n: lfo, g: lg });
            }
            const jit = ctx.createOscillator(); jit.type = 'triangle';
            jit.frequency.value = 10 + Math.random() * 7;
            const jg = ctx.createGain(); jg.gain.value = f0From * 0.008 + 1;
            jit.connect(jg); mods.push({ n: jit, g: jg });

            // --- voiced source: two detuned saws (chorus) + a soft triangle body ---
            const voice = ctx.createGain(); voice.gain.value = 1;
            const mkOsc = (type, detune, g) => {
                const osc = ctx.createOscillator(); osc.type = type;
                osc.frequency.setValueAtTime(f0From, start);
                if (f0To !== f0From) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f0To), end);
                osc.detune.value = detune;
                for (const m of mods) m.g.connect(osc.frequency);
                const og = ctx.createGain(); og.gain.value = g;
                osc.connect(og); og.connect(voice);
                osc.start(start); osc.stop(end + 0.05);
            };
            mkOsc('sawtooth', -7, 0.5);
            mkOsc('sawtooth', 7, 0.5);
            mkOsc('triangle', 0, 0.28);
            for (const m of mods) { m.n.start(start); m.n.stop(end + 0.05); }

            // --- formant bank: morph vowelFrom -> vowelTo across the syllable ---
            const vFrom = VOWELS[o.vowelFrom] || VOWELS.a;
            const vTo = VOWELS[o.vowelTo || o.vowelFrom] || vFrom;
            for (let i = 0; i < 3; i++) {
                const bp = ctx.createBiquadFilter();
                bp.type = 'bandpass';
                bp.Q.value = i === 0 ? 6 : 8;                     // lower Q => vowel, not whistle
                bp.frequency.setValueAtTime(vFrom[i], start);
                if (vTo[i] !== vFrom[i]) bp.frequency.linearRampToValueAtTime(vTo[i], end);
                const fg = ctx.createGain();
                fg.gain.value = FORMANT_GAIN[i];
                voice.connect(bp); bp.connect(fg); fg.connect(amp);
            }

            // --- breathiness: a little airy noise shaped by the mouth (vowel F2) ---
            const nsrc = ctx.createBufferSource(); nsrc.buffer = this.noiseBuf(dur + 0.05);
            const nbp = ctx.createBiquadFilter(); nbp.type = 'bandpass';
            nbp.frequency.value = (vFrom[1] + vTo[1]) / 2; nbp.Q.value = 1.4;
            const ng = ctx.createGain(); ng.gain.value = 0.05;
            nsrc.connect(nbp); nbp.connect(ng); ng.connect(amp);
            nsrc.start(start); nsrc.stop(end + 0.05);

            amp.connect(this.master);
        }

        // A short filtered-noise burst: breath for "h" onsets and wet sniffles.
        breath(start, dur, gain, tone) {
            const ctx = this.ctx;
            const frames = Math.floor(ctx.sampleRate * dur);
            const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < frames; i++) d[i] = (Math.random() * 2 - 1);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = tone || 1400;
            bp.Q.value = 0.8;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, start);
            g.gain.exponentialRampToValueAtTime(gain, start + dur * 0.3);
            g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
            src.connect(bp); bp.connect(g); g.connect(this.master);
            src.start(start); src.stop(start + dur + 0.02);
        }

        // A very short consonant transient at a syllable onset. 'h' is an airy
        // breath; the rest are plosive "clicks" at different spectral centres so
        // t/p/k/d/b/g read distinctly and the speech sounds articulated.
        consonant(start, type) {
            if (type === 'h') { this.breath(Math.max(0, start - 0.015), 0.055, 0.045, 2200); return; }
            const ctx = this.ctx;
            const CENTRE = { t: 3200, k: 1900, p: 800, d: 1600, b: 500, g: 1200 };
            const f = CENTRE[type] || 2200;
            const dur = 0.014;
            const frames = Math.floor(ctx.sampleRate * dur);
            const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < frames; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / frames);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = f;
            bp.Q.value = 1.1;
            const g = ctx.createGain();
            g.gain.value = 0.09;
            src.connect(bp); bp.connect(g); g.connect(this.master);
            src.start(start); src.stop(start + dur + 0.01);
        }

        // Pure-sine sparkle shimmer to sprinkle on top of celebratory voices.
        twinkle(start, freqs, gain) {
            const ctx = this.ctx;
            freqs.forEach((f, i) => {
                const t = start + i * 0.05;
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = f;
                g.gain.setValueAtTime(0.0001, t);
                g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
                g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
                osc.connect(g); g.connect(this.master);
                osc.start(t); osc.stop(t + 0.18);
            });
        }

        // Play a "phrase": a list of timed events (voiced syllables `k:'syl'`,
        // breaths `k:'breath'`, sparkle runs `k:'tw'`) laid out on one timeline.
        speak(events) {
            const ctx = this.ensure();
            if (!ctx || !events || !events.length) return;
            const t = ctx.currentTime + 0.04;
            events.forEach((e) => {
                if (e.k === 'breath') this.breath(t + e.at, e.dur, e.gain, e.tone);
                else if (e.k === 'tw') this.twinkle(t + e.at, e.freqs, e.gain);
                else this.syllable(t + e.at, e);
            });
        }

        play(type) {
            // Roll a fresh "voice personality" (pitch colour) for this reaction.
            this.pitchMul = rand(0.9, 1.16);
            this.speak(buildPhrase(type));
        }

        // A short, cheerful music-box jingle (~2.2s) played UNDER the fanfare
        // voice on big completions - kept low in the mix so the voice sits on top.
        jingle() {
            const ctx = this.ensure();
            if (!ctx) return;
            const t0 = ctx.currentTime + 0.05;
            const note = (freq, at, dur, gain, type) => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = type || 'triangle';
                osc.frequency.value = freq;
                const s = t0 + at;
                g.gain.setValueAtTime(0.0001, s);
                g.gain.exponentialRampToValueAtTime(gain, s + 0.02);
                g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
                osc.connect(g); g.connect(this.master);
                osc.start(s); osc.stop(s + dur + 0.03);
            };
            // A rising, bouncy motif in C major - two variants for variety.
            const melodies = [
                [[523.25, 0, 0.22], [659.25, 0.16, 0.22], [783.99, 0.32, 0.22], [1046.5, 0.48, 0.34], [1318.5, 0.72, 0.26], [1046.5, 0.96, 0.5]],
                [[659.25, 0, 0.22], [783.99, 0.16, 0.22], [1046.5, 0.32, 0.34], [783.99, 0.56, 0.22], [1046.5, 0.72, 0.22], [1318.5, 0.88, 0.5]],
            ];
            pick(melodies).forEach(([f, at, d]) => note(f, at, d, 0.09, 'triangle'));
            // warm sustained major chord pad underneath
            [261.63, 329.63, 392.0].forEach((f) => note(f, 0, 2.0, 0.035, 'sine'));
            this.twinkle(t0 + 1.2, [1568, 2093, 2637], 0.06);
        }
    }

    // --- reusable phrase fragments (each returns {ev, end}) ------------------

    // "hee-hee-hee(-haa)" giggle run - breathy 'h' onsets, pitch drifting up,
    // and a chance of a cute nose-snort at the end.
    function giggle(start, f0, n) {
        const ev = []; let at = start;
        for (let i = 0; i < n; i++) {
            const p = f0 + i * rand(14, 38) + rand(-12, 12);
            const last = i === n - 1;
            ev.push({ at, cons: 'h', vowelFrom: 'i', vowelTo: last ? 'e' : 'i', f0From: p, f0To: p - rand(30, 60), dur: rand(0.11, 0.17), gain: rand(0.5, 0.68), vibrato: 6, vibratoHz: rand(5, 7) });
            at += rand(0.14, 0.21);
        }
        if (Math.random() < 0.35) { // little "snrk!" snort
            ev.push({ k: 'breath', at: at - 0.02, dur: 0.09, gain: 0.06, tone: rand(500, 800) });
            ev.push({ at, vowelFrom: 'u', vowelTo: 'i', f0From: f0 * 0.8, f0To: f0 * 1.1, dur: 0.12, gain: 0.45, vibrato: 8 });
            at += 0.16;
        }
        return { ev, end: at };
    }

    // "hoo-hoo-hoo" falling sobs, each with a breath catch and a shaky tremolo.
    function sobs(start, f0, n, gainBase) {
        const ev = []; let at = start;
        for (let i = 0; i < n; i++) {
            const p = f0 - i * rand(14, 34);
            ev.push({ k: 'breath', at: at - 0.03, dur: 0.08, gain: 0.05, tone: rand(900, 1300) });
            ev.push({ at, cons: 'h', vowelFrom: 'u', vowelTo: i % 2 ? 'o' : 'u', f0From: p, f0To: p - rand(30, 60), dur: rand(0.24, 0.34), gain: (gainBase || 0.55) + rand(-0.06, 0.06), vibrato: rand(10, 18), vibratoHz: rand(4.5, 6), tremolo: rand(0.4, 0.55), tremoloHz: rand(7, 9) });
            at += rand(0.3, 0.44);
        }
        return { ev, end: at };
    }

    // A cute rubbery "boing" - a fast pitch spring, great after a bouncy win.
    function boing(start, f0) {
        return { ev: [{ at: start, vowelFrom: 'o', vowelTo: 'u', f0From: f0, f0To: f0 * 1.9, dur: 0.09, gain: 0.4 },
                      { at: start + 0.09, vowelFrom: 'u', vowelTo: 'o', f0From: f0 * 1.9, f0To: f0 * 0.9, dur: 0.13, gain: 0.4, vibrato: 14, vibratoHz: 9 }], end: start + 0.24 };
    }

    // --- per-emotion phrase builders: each type has several variants so the
    //     mascot's reactions stay lively and never repeat identically. --------

    function buildPhrase(type) {
        const ev = [];
        const add = (frag) => { ev.push(...frag.ev); return frag.end; };

        switch (type) {
            case 'ding':
            case 'correct': {
                // Short-but-varied happy acknowledgements (~0.5-0.9s).
                pick([
                    () => { // "yay!"
                        ev.push({ at: 0, vowelFrom: 'e', vowelTo: 'i', f0From: rand(410, 450), f0To: rand(620, 700), dur: rand(0.34, 0.44), gain: 0.78, vibrato: 9, vibratoHz: 6 });
                        ev.push({ k: 'tw', at: 0.22, freqs: [1320, 1760], gain: 0.08 });
                    },
                    () => { // "woo-hoo!"
                        ev.push({ at: 0, vowelFrom: 'u', vowelTo: 'u', f0From: 360, f0To: 320, dur: 0.2, gain: 0.6 });
                        ev.push({ at: 0.26, cons: 'h', vowelFrom: 'u', vowelTo: 'i', f0From: 380, f0To: 640, dur: 0.4, gain: 0.78, vibrato: 10 });
                        ev.push({ k: 'tw', at: 0.5, freqs: [1568, 2093], gain: 0.08 });
                    },
                    () => { // "yip-pee!"
                        ev.push({ at: 0, vowelFrom: 'i', vowelTo: 'i', f0From: 520, f0To: 470, dur: 0.14, gain: 0.65 });
                        ev.push({ at: 0.2, cons: 'p', vowelFrom: 'i', vowelTo: 'e', f0From: 500, f0To: 700, dur: 0.4, gain: 0.8, vibrato: 10 });
                        ev.push({ k: 'tw', at: 0.4, freqs: [1760, 2093], gain: 0.08 });
                    },
                    () => { // "ta-daa!"
                        ev.push({ at: 0, cons: 't', vowelFrom: 'a', vowelTo: 'a', f0From: 460, f0To: 470, dur: 0.13, gain: 0.66 });
                        ev.push({ at: 0.17, cons: 'd', vowelFrom: 'a', vowelTo: 'a', f0From: 470, f0To: 640, dur: 0.45, gain: 0.82, vibrato: 12, vibratoHz: 6 });
                        ev.push({ k: 'tw', at: 0.4, freqs: [1568, 2093], gain: 0.09 });
                    },
                    () => { // "hoo-ray!"
                        ev.push({ at: 0, cons: 'h', vowelFrom: 'u', vowelTo: 'u', f0From: 380, f0To: 420, dur: 0.18, gain: 0.68 });
                        ev.push({ at: 0.22, vowelFrom: 'e', vowelTo: 'i', f0From: 440, f0To: 700, dur: 0.42, gain: 0.82, vibrato: 12, vibratoHz: 6 });
                        ev.push({ k: 'tw', at: 0.45, freqs: [1568, 2093, 2637], gain: 0.09 });
                    },
                    () => { // "ta-da!" + a bouncy boing
                        ev.push({ at: 0, cons: 't', vowelFrom: 'a', vowelTo: 'i', f0From: 470, f0To: 660, dur: 0.34, gain: 0.8, vibrato: 10 });
                        add(boing(0.36, 480));
                    },
                ])();
                break;
            }

            case 'cheer': {
                // Big, joyful, LONG celebrations (~1.4-2.0s).
                pick([
                    () => { // "yaaay!" + giggle
                        ev.push({ at: 0, vowelFrom: 'e', vowelTo: 'i', f0From: rand(390, 420), f0To: rand(660, 720), dur: rand(0.5, 0.62), gain: 0.85, vibrato: 15, vibratoHz: 6 });
                        add(giggle(0.72, rand(580, 640), 3 + (Math.random() < 0.5 ? 0 : 1)));
                        ev.push({ k: 'tw', at: 0.35, freqs: [1046, 1396, 1760], gain: 0.1 });
                    },
                    () => { // "woo-hoo-hoo!" rising triplet + "yaaay"
                        let at = 0;
                        for (let i = 0; i < 3; i++) { ev.push({ at, vowelFrom: 'u', vowelTo: i === 2 ? 'i' : 'u', f0From: 360 + i * 70, f0To: 400 + i * 80, dur: 0.22, gain: 0.72, vibrato: 8 }); at += 0.26; }
                        ev.push({ at: at + 0.05, vowelFrom: 'e', vowelTo: 'i', f0From: 520, f0To: 720, dur: 0.5, gain: 0.85, vibrato: 15 });
                        ev.push({ k: 'tw', at: at + 0.2, freqs: [1396, 1760, 2093], gain: 0.1 });
                    },
                    () => { // "wheee!" long glide + giggle
                        ev.push({ at: 0, vowelFrom: 'u', vowelTo: 'i', f0From: 440, f0To: 780, dur: 0.6, gain: 0.85, vibrato: 16, vibratoHz: 6.5 });
                        add(giggle(0.75, 640, 4));
                        ev.push({ k: 'tw', at: 0.4, freqs: [1174, 1568, 2093], gain: 0.1 });
                    },
                    () => { // "hip-hip-hoo-ray!"
                        ev.push({ at: 0, cons: 'h', vowelFrom: 'i', vowelTo: 'i', f0From: 520, f0To: 480, dur: 0.16, gain: 0.72 });
                        ev.push({ at: 0.24, cons: 'h', vowelFrom: 'i', vowelTo: 'i', f0From: 540, f0To: 500, dur: 0.16, gain: 0.72 });
                        ev.push({ at: 0.5, cons: 'h', vowelFrom: 'u', vowelTo: 'u', f0From: 460, f0To: 500, dur: 0.16, gain: 0.75 });
                        ev.push({ at: 0.7, vowelFrom: 'e', vowelTo: 'i', f0From: 500, f0To: 760, dur: 0.52, gain: 0.88, vibrato: 16, vibratoHz: 6 });
                        ev.push({ k: 'tw', at: 0.72, freqs: [1396, 1760, 2349], gain: 0.11 });
                    },
                    () => { // "ya-hoo!" long + giggle + boing
                        ev.push({ at: 0, vowelFrom: 'a', vowelTo: 'u', f0From: 440, f0To: 560, dur: 0.24, gain: 0.8 });
                        ev.push({ at: 0.26, cons: 'h', vowelFrom: 'u', vowelTo: 'i', f0From: 520, f0To: 760, dur: 0.5, gain: 0.88, vibrato: 16 });
                        add(boing(0.8, 520));
                        add(giggle(1.06, 620, 3));
                        ev.push({ k: 'tw', at: 0.5, freqs: [1318, 1760, 2093], gain: 0.1 });
                    },
                ])();
                break;
            }

            case 'fanfare': {
                // The biggest, longest moment (~2.2-3.0s): "ta-daaaa!" + cheer +
                // a long giggle + sparkle showers.
                pick([
                    () => {
                        ev.push({ k: 'breath', at: 0, dur: 0.05, gain: 0.06, tone: 2200 });
                        ev.push({ at: 0.03, vowelFrom: 'a', vowelTo: 'a', f0From: 500, f0To: 520, dur: 0.14, gain: 0.72 });
                        ev.push({ at: 0.2, vowelFrom: 'a', vowelTo: 'i', f0From: 520, f0To: 760, dur: 0.62, gain: 0.92, vibrato: 18, vibratoHz: 6 });
                        ev.push({ at: 0.9, vowelFrom: 'e', vowelTo: 'i', f0From: 600, f0To: 720, dur: 0.4, gain: 0.8, vibrato: 12 });
                        add(giggle(1.4, 660, 4 + (Math.random() < 0.5 ? 0 : 1)));
                        ev.push({ k: 'tw', at: 0.5, freqs: [1046, 1318, 1760, 2093], gain: 0.11 });
                        ev.push({ k: 'tw', at: 1.35, freqs: [1568, 2093, 2637], gain: 0.1 });
                    },
                    () => {
                        let at = 0;
                        for (let i = 0; i < 3; i++) { ev.push({ at, vowelFrom: 'u', vowelTo: i === 2 ? 'i' : 'u', f0From: 360 + i * 80, f0To: 420 + i * 90, dur: 0.24, gain: 0.75, vibrato: 9 }); at += 0.28; }
                        ev.push({ at: at + 0.05, vowelFrom: 'e', vowelTo: 'i', f0From: 560, f0To: 780, dur: 0.62, gain: 0.92, vibrato: 18 });
                        add(giggle(at + 0.8, 680, 4));
                        ev.push({ k: 'tw', at: at + 0.25, freqs: [1318, 1760, 2093], gain: 0.11 });
                        ev.push({ k: 'tw', at: at + 0.9, freqs: [1760, 2093, 2637], gain: 0.1 });
                    },
                ])();
                break;
            }

            case 'oops': {
                // Cute sympathetic wrong-answer sounds (~0.5-0.8s), never harsh.
                pick([
                    () => { // "uh-oh"
                        ev.push({ at: 0, vowelFrom: 'a', vowelTo: 'a', f0From: 440, f0To: 400, dur: 0.2, gain: 0.6 });
                        ev.push({ at: 0.26, vowelFrom: 'o', vowelTo: 'o', f0From: 360, f0To: 290, dur: 0.34, gain: 0.6, vibrato: 5 });
                    },
                    () => { // "aww"
                        ev.push({ at: 0, vowelFrom: 'a', vowelTo: 'o', f0From: 420, f0To: 300, dur: 0.5, gain: 0.6, vibrato: 8, vibratoHz: 5 });
                    },
                    () => { // "oo-ps"
                        ev.push({ at: 0, vowelFrom: 'u', vowelTo: 'o', f0From: 400, f0To: 330, dur: 0.28, gain: 0.6, vibrato: 6 });
                        ev.push({ k: 'breath', at: 0.32, dur: 0.12, gain: 0.06, tone: 2600 });
                    },
                    () => { // questioning "hmm?"
                        ev.push({ at: 0, vowelFrom: 'o', vowelTo: 'u', f0From: 330, f0To: 300, dur: 0.22, gain: 0.5 });
                        ev.push({ at: 0.26, vowelFrom: 'o', vowelTo: 'e', f0From: 320, f0To: 430, dur: 0.34, gain: 0.55, vibrato: 6 });
                    },
                    () => { // "whoops!"
                        ev.push({ at: 0, cons: 'h', vowelFrom: 'u', vowelTo: 'o', f0From: 430, f0To: 340, dur: 0.36, gain: 0.6, vibrato: 7 });
                        ev.push({ k: 'breath', at: 0.4, dur: 0.11, gain: 0.06, tone: 2600 });
                    },
                    () => { // "oh-no-oo"
                        ev.push({ at: 0, vowelFrom: 'o', vowelTo: 'o', f0From: 400, f0To: 360, dur: 0.22, gain: 0.58 });
                        ev.push({ at: 0.28, vowelFrom: 'o', vowelTo: 'u', f0From: 360, f0To: 290, dur: 0.4, gain: 0.58, vibrato: 8, vibratoHz: 5 });
                    },
                ])();
                break;
            }

            case 'cry': {
                // Full, long sobbing (~2.0-2.8s): a wail then a run of sobs.
                pick([
                    () => { // "waaaah..." + sobs
                        ev.push({ k: 'breath', at: 0, dur: 0.12, gain: 0.05, tone: 900 });
                        ev.push({ at: 0.04, vowelFrom: 'u', vowelTo: 'a', f0From: 540, f0To: 300, dur: 0.85, gain: 0.82, vibrato: 20, vibratoHz: 5, tremolo: 0.42, tremoloHz: 7.5 });
                        add(sobs(1.0, 420, 3 + (Math.random() < 0.5 ? 0 : 1), 0.6));
                    },
                    () => { // "boo-hoo-hoo-hooo"
                        add(sobs(0, 500, 4 + (Math.random() < 0.5 ? 0 : 1), 0.62));
                    },
                    () => { // rising wail "wheee-huuu" then sobs
                        ev.push({ k: 'breath', at: 0, dur: 0.1, gain: 0.05, tone: 1000 });
                        ev.push({ at: 0.03, vowelFrom: 'i', vowelTo: 'u', f0From: 620, f0To: 360, dur: 0.9, gain: 0.8, vibrato: 22, vibratoHz: 5.5, tremolo: 0.45, tremoloHz: 8 });
                        add(sobs(1.05, 380, 3, 0.55));
                    },
                    () => { // hiccuppy cry: wail, *hic!*, then sobs
                        ev.push({ at: 0, cons: 'h', vowelFrom: 'u', vowelTo: 'a', f0From: 520, f0To: 320, dur: 0.7, gain: 0.8, vibrato: 20, vibratoHz: 5, tremolo: 0.42, tremoloHz: 7.5 });
                        ev.push({ k: 'breath', at: 0.78, dur: 0.05, gain: 0.07, tone: 1800 }); // sharp inhale
                        ev.push({ at: 0.82, cons: 'k', vowelFrom: 'i', vowelTo: 'i', f0From: 560, f0To: 460, dur: 0.1, gain: 0.5 }); // *hic!*
                        add(sobs(1.02, 400, 3, 0.55));
                    },
                ])();
                break;
            }

            case 'whimper': {
                // Soft, longer self-pity sniffles (~1.4-2.0s), quiet and quivery.
                pick([
                    () => add(sobs(0, 360, 3 + (Math.random() < 0.5 ? 0 : 1), 0.4)),
                    () => { // sniff... "mmm-hmm"... sniff
                        ev.push({ k: 'breath', at: 0, dur: 0.1, gain: 0.06, tone: 1200 });
                        ev.push({ at: 0.12, vowelFrom: 'u', vowelTo: 'u', f0From: 350, f0To: 310, dur: 0.34, gain: 0.4, vibrato: 12, tremolo: 0.5, tremoloHz: 8 });
                        ev.push({ k: 'breath', at: 0.5, dur: 0.1, gain: 0.06, tone: 1300 });
                        ev.push({ at: 0.62, vowelFrom: 'u', vowelTo: 'o', f0From: 330, f0To: 280, dur: 0.4, gain: 0.38, vibrato: 12, tremolo: 0.5, tremoloHz: 8.5 });
                        ev.push({ at: 1.1, vowelFrom: 'u', vowelTo: 'u', f0From: 310, f0To: 270, dur: 0.34, gain: 0.34, vibrato: 12, tremolo: 0.5, tremoloHz: 8 });
                    },
                ])();
                break;
            }

            case 'sparkle': {
                pick([
                    () => { ev.push({ at: 0, vowelFrom: 'u', vowelTo: 'i', f0From: 560, f0To: 900, dur: 0.34, gain: 0.55, vibrato: 8 }); ev.push({ k: 'tw', at: 0.08, freqs: [1174, 1568, 2093], gain: 0.12 }); },
                    () => { ev.push({ at: 0, vowelFrom: 'a', vowelTo: 'u', f0From: 500, f0To: 640, dur: 0.4, gain: 0.55, vibrato: 8 }); ev.push({ k: 'tw', at: 0.1, freqs: [1318, 1760, 2349], gain: 0.12 }); }, // "wow!"
                ])();
                break;
            }

            default:
                ev.push({ at: 0, vowelFrom: 'o', vowelTo: 'o', f0From: 300, f0To: 260, dur: 0.22, gain: 0.5 });
        }

        return ev;
    }

    window.MascotVoice = new MascotVoice();
})();
