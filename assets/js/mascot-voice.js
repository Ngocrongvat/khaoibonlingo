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
    const VOWELS = {
        a: [820, 1200, 2800], // "ah"  (father)
        e: [500, 1900, 2600], // "eh"  (bed) -> leans to a smile
        i: [320, 2500, 3200], // "ee"  (see) -> giggly, bright
        o: [500, 900, 2500],  // "oh"  (go)
        u: [330, 800, 2400],  // "oo"  (boot) -> pouty, sob
    };

    const FORMANT_GAIN = [1.0, 0.55, 0.22]; // F1 loudest, F3 softest
    const clampMul = 0.9; // global headroom so overlapping syllables don't clip

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

        // Schedule one voiced syllable. All timing is absolute (ctx time) so
        // callers can lay syllables out on a timeline.
        syllable(start, o) {
            const ctx = this.ctx;
            const dur = o.dur;
            const end = start + dur;
            const peak = (o.gain != null ? o.gain : 0.7) * clampMul;

            // --- glottal source ---
            const osc = ctx.createOscillator();
            osc.type = o.wave || 'sawtooth';
            osc.frequency.setValueAtTime(o.f0From, start);
            if (o.f0To && o.f0To !== o.f0From) {
                osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f0To), end);
            }
            // a soft sine sub-tone fattens the voice so it isn't thin/buzzy
            const sub = ctx.createOscillator();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(o.f0From, start);
            if (o.f0To && o.f0To !== o.f0From) {
                sub.frequency.exponentialRampToValueAtTime(Math.max(1, o.f0To), end);
            }
            const subGain = ctx.createGain();
            subGain.gain.value = 0.18;
            sub.connect(subGain);

            // --- vibrato (keeps the voice alive/organic) ---
            const vibDepth = o.vibrato || 0;
            if (vibDepth) {
                const lfo = ctx.createOscillator();
                lfo.type = 'sine';
                lfo.frequency.value = o.vibratoHz || 5.5;
                const lfoGain = ctx.createGain();
                lfoGain.gain.value = vibDepth;
                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);
                lfoGain.connect(sub.frequency);
                lfo.start(start);
                lfo.stop(end + 0.05);
            }

            // --- master envelope for this syllable ---
            const amp = ctx.createGain();
            amp.gain.setValueAtTime(0.0001, start);
            amp.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.05, dur * 0.3));
            amp.gain.setValueAtTime(peak, Math.max(start + 0.06, end - dur * 0.4));
            amp.gain.exponentialRampToValueAtTime(0.0001, end);

            // --- tremolo (the "shaky sob" wobble) modulates the envelope ---
            if (o.tremolo) {
                const tlfo = ctx.createOscillator();
                tlfo.type = 'sine';
                tlfo.frequency.value = o.tremoloHz || 7;
                const tgain = ctx.createGain();
                tgain.gain.value = peak * o.tremolo;
                tlfo.connect(tgain);
                tgain.connect(amp.gain);
                tlfo.start(start);
                tlfo.stop(end + 0.05);
            }

            // --- formant bank: morph vowelFrom -> vowelTo across the syllable ---
            const vFrom = VOWELS[o.vowelFrom] || VOWELS.a;
            const vTo = VOWELS[o.vowelTo || o.vowelFrom] || vFrom;
            for (let i = 0; i < 3; i++) {
                const bp = ctx.createBiquadFilter();
                bp.type = 'bandpass';
                bp.Q.value = i === 0 ? 9 : 11;
                bp.frequency.setValueAtTime(vFrom[i], start);
                if (vTo[i] !== vFrom[i]) bp.frequency.linearRampToValueAtTime(vTo[i], end);
                const fg = ctx.createGain();
                fg.gain.value = FORMANT_GAIN[i];
                osc.connect(bp);
                bp.connect(fg);
                fg.connect(amp);
            }
            subGain.connect(amp);
            amp.connect(this.master);

            osc.start(start);
            sub.start(start);
            osc.stop(end + 0.05);
            sub.stop(end + 0.05);
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

        play(type) {
            const ctx = this.ensure();
            if (!ctx) return;
            const t = ctx.currentTime + 0.03;

            switch (type) {
                // Correct answer: a bright, quick "yay!" chirp - happy and short.
                case 'ding':
                case 'correct': {
                    this.syllable(t, { vowelFrom: 'e', vowelTo: 'i', f0From: 440, f0To: 660, dur: 0.26, gain: 0.75, vibrato: 8 });
                    this.twinkle(t + 0.18, [1320, 1760], 0.08);
                    break;
                }

                // Big win (lesson/duel win): a joyful "yaaay!" then a giggle "hee-hee".
                case 'cheer': {
                    this.syllable(t, { vowelFrom: 'e', vowelTo: 'i', f0From: 400, f0To: 680, dur: 0.42, gain: 0.85, vibrato: 14, vibratoHz: 6 });
                    this.syllable(t + 0.50, { vowelFrom: 'i', vowelTo: 'i', f0From: 620, f0To: 560, dur: 0.14, gain: 0.6, vibrato: 6 });
                    this.syllable(t + 0.68, { vowelFrom: 'i', vowelTo: 'i', f0From: 660, f0To: 600, dur: 0.14, gain: 0.6, vibrato: 6 });
                    this.twinkle(t + 0.30, [1046, 1396, 1760], 0.1);
                    break;
                }

                // Course/chapter complete: a triumphant "ta-daaa!" + cheer + sparkle.
                case 'fanfare': {
                    this.breath(t, 0.05, 0.06, 2200);
                    this.syllable(t + 0.02, { vowelFrom: 'a', vowelTo: 'a', f0From: 500, f0To: 520, dur: 0.12, gain: 0.7 });
                    this.syllable(t + 0.16, { vowelFrom: 'a', vowelTo: 'a', f0From: 520, f0To: 720, dur: 0.5, gain: 0.9, vibrato: 16, vibratoHz: 6 });
                    // celebratory giggle tail
                    this.syllable(t + 0.74, { vowelFrom: 'i', vowelTo: 'i', f0From: 640, f0To: 600, dur: 0.13, gain: 0.55, vibrato: 6 });
                    this.syllable(t + 0.90, { vowelFrom: 'i', vowelTo: 'i', f0From: 700, f0To: 640, dur: 0.13, gain: 0.55, vibrato: 6 });
                    this.twinkle(t + 0.5, [1046, 1318, 1760, 2093], 0.11);
                    break;
                }

                // Wrong answer: a cute sympathetic "uh-oh", never a harsh buzzer.
                case 'oops': {
                    this.syllable(t, { vowelFrom: 'a', vowelTo: 'a', f0From: 440, f0To: 400, dur: 0.18, gain: 0.6 });
                    this.syllable(t + 0.22, { vowelFrom: 'o', vowelTo: 'o', f0From: 360, f0To: 300, dur: 0.3, gain: 0.6, vibrato: 5 });
                    break;
                }

                // Real crying: a wailing "waaah" that sags in pitch with a shaky
                // tremolo, a breath catch, then a "hoo-hoo" sob. The star of the
                // "out of hearts / failed" moments.
                case 'cry': {
                    this.breath(t, 0.12, 0.05, 900);
                    this.syllable(t + 0.04, { vowelFrom: 'u', vowelTo: 'a', f0From: 540, f0To: 300, dur: 0.75, gain: 0.8, vibrato: 18, vibratoHz: 5, tremolo: 0.4, tremoloHz: 7.5 });
                    this.breath(t + 0.82, 0.1, 0.06, 1100);
                    this.syllable(t + 0.90, { vowelFrom: 'u', vowelTo: 'o', f0From: 420, f0To: 260, dur: 0.5, gain: 0.7, vibrato: 12, tremolo: 0.45, tremoloHz: 8 });
                    break;
                }

                // Softer self-pity: quiet sniffly "hu... hu..." whimpers. Used for
                // the gentler "didn't quite make it" screens.
                case 'whimper': {
                    this.breath(t, 0.09, 0.05, 1000);
                    this.syllable(t + 0.05, { vowelFrom: 'u', vowelTo: 'u', f0From: 360, f0To: 300, dur: 0.3, gain: 0.42, vibrato: 10, tremolo: 0.5, tremoloHz: 8 });
                    this.breath(t + 0.42, 0.08, 0.05, 1100);
                    this.syllable(t + 0.48, { vowelFrom: 'u', vowelTo: 'o', f0From: 330, f0To: 270, dur: 0.34, gain: 0.38, vibrato: 10, tremolo: 0.5, tremoloHz: 8.5 });
                    break;
                }

                // Badge/reward: a light "ooh!" lift with a shimmer.
                case 'sparkle': {
                    this.syllable(t, { vowelFrom: 'u', vowelTo: 'i', f0From: 560, f0To: 880, dur: 0.26, gain: 0.55, vibrato: 8 });
                    this.twinkle(t + 0.06, [1174, 1568, 2093], 0.12);
                    break;
                }

                default: {
                    // Neutral little "hm?" blip for anything unmapped.
                    this.syllable(t, { vowelFrom: 'o', vowelTo: 'o', f0From: 300, f0To: 260, dur: 0.2, gain: 0.5 });
                }
            }
        }
    }

    window.MascotVoice = new MascotVoice();
})();
