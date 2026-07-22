// "Tình huống giao tiếp" — animated communication-scene player (prototype).
//
// A fully SELF-CONTAINED, ADDITIVE layer: it renders into a container handed to it by
// app.js and never touches the lesson / hearts / XP / progress / leaderboard machinery.
// Each scenario is a short daily-life skit acted out by recoloured mascot SVGs, voiced by
// TTS, with EN + VI subtitles and tappable vocabulary, followed by a Quiz and a Role-play.
//
// Public API (window.Scenarios):
//   openMenu(container, onExit)  -> lists the scenarios, then runs a full Watch → Quiz →
//                                   Role-play → Summary flow for the chosen one.
//
// Depends only on globals that already exist and are optional/guarded:
//   getMascotSvg(mood,size)  (app.js)      window.MascotVoice  window.confetti  SCENARIO_BANK
const Scenarios = (() => {
    'use strict';

    const BANK = (typeof SCENARIO_BANK !== 'undefined') ? SCENARIO_BANK : [];

    // ---- small utilities (kept local so the module has no hidden coupling) ----------
    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    function mascot(mood, size) {
        try { return (typeof getMascotSvg === 'function') ? getMascotSvg(mood, size) : '🍠'; }
        catch (e) { return '🍠'; }
    }
    function sound(type) {
        try { if (window.MascotVoice && typeof window.MascotVoice.play === 'function') window.MascotVoice.play(type); }
        catch (e) { /* sound is optional */ }
    }
    function celebrate() {
        try { if (typeof window.confetti === 'function') window.confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } }); }
        catch (e) { /* confetti is optional */ }
    }

    // ---- TTS: speak one English line, resolve when done (with a safety timeout) ------
    let speakTimer = null;
    function speak(text, done) {
        let finished = false;
        const finish = () => { if (finished) return; finished = true; if (speakTimer) clearTimeout(speakTimer); if (done) done(); };
        try {
            if (!('speechSynthesis' in window)) { speakTimer = setTimeout(finish, 900); return; }
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'en-US';
            u.rate = 0.92;
            u.pitch = 1.15;
            u.onend = finish;
            u.onerror = finish;
            window.speechSynthesis.speak(u);
            // Fallback in case onend never fires (some mobile browsers): ~90ms per char.
            speakTimer = setTimeout(finish, 1400 + text.length * 90);
        } catch (e) { speakTimer = setTimeout(finish, 900); }
    }
    function stopSpeak() {
        try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
        if (speakTimer) { clearTimeout(speakTimer); speakTimer = null; }
    }

    // Bold the scenario's vocabulary words inside an English line so learners can see the
    // target words in context (case-insensitive, whole-ish word match).
    function highlightVocab(text, vocab) {
        let out = escapeHtml(text);
        (vocab || []).forEach(v => {
            const w = v.en.trim();
            if (!w) return;
            const re = new RegExp('\\b(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\b', 'ig');
            out = out.replace(re, '<b class="scn-hl">$1</b>');
        });
        return out;
    }

    // A wide VI/EN pool from every scenario, used to build believable quiz distractors.
    function pool() {
        const vi = [], en = [];
        BANK.forEach(s => (s.vocab || []).forEach(v => { vi.push(v.vi); en.push(v.en); }));
        return { vi: [...new Set(vi)], en: [...new Set(en)] };
    }
    // A pool of English lines from the sample scenarios, used as role-play / quiz distractors.
    function bankLinePool() {
        const en = [];
        BANK.forEach(s => s.lines.forEach(l => en.push(l.en)));
        return [...new Set(en)];
    }

    // ================================================================================
    // RUNTIME SCENE GENERATION — build one unique scene per course chapter (unit) from
    // that chapter's OWN vetted content. Zero extra data weight; naturally non-duplicate.
    // ================================================================================
    const VIET_RE = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;
    const hasViet = s => VIET_RE.test(String(s || ''));

    const KID_NAMES = ['Bi', 'Na', 'Bo', 'Ti', 'Mi', 'Su', 'Bơ', 'Nu', 'Kem', 'Tí', 'Bông', 'Cà'];
    const BADGES = ['🎀', '🧢', '👓', '🎩', '🌟', '🍭', '🦕', '🐣', '🎈', '🧣', '👑', '🐥'];
    const BG_POOL = ['park', 'cafe', 'classroom', 'home', 'market', 'playground'];
    // Map chapter theme words to a fitting backdrop; fall back to a rotating pick.
    function pickBg(unit, index) {
        const t = ((unit.title || '') + ' ' + (unit.description || '')).toLowerCase();
        const rules = [
            [/food|eat|drink|fruit|restaurant|meal|cook|coffee|breakfast|lunch|dinner/, 'cafe'],
            [/school|class|study|book|learn|lesson|teacher|student|grammar/, 'classroom'],
            [/family|home|house|room|daily|routine|morning|clean/, 'home'],
            [/shop|buy|market|money|store|price|clothes|sell/, 'market'],
            [/play|sport|game|park|animal|travel|holiday|nature|weather|outdoor/, 'park'],
            [/friend|hobby|fun|music|weekend|city|street/, 'playground'],
        ];
        for (const [re, bg] of rules) { if (re.test(t)) return bg; }
        return BG_POOL[index % BG_POOL.length];
    }

    // Pull EN+VI sentence pairs and EN/VI vocab pairs out of a unit's exercises.
    function collectUnit(unit) {
        const sents = [], vocab = [];
        const seenS = new Set(), seenV = new Set();
        (unit.lessons || []).forEach(L => (L.exercises || []).forEach(x => {
            if (x.type === 'translate' && x.target && x.source) {
                if (!seenS.has(x.target)) { seenS.add(x.target); sents.push({ en: x.target, vi: x.source }); }
            } else if (x.type === 'ordering' && x.sentence && x.source) {
                if (!seenS.has(x.sentence)) { seenS.add(x.sentence); sents.push({ en: x.sentence, vi: x.source }); }
            } else if (x.type === 'multiple_choice' && x.question && x.options) {
                const m = x.question.match(/['"‘’“”]([^'"‘’“”]+)['"‘’“”]/);
                const ans = x.options[x.correct];
                if (m && ans) {
                    const quoted = m[1].trim();
                    let en = null, vi = null;
                    if (!hasViet(quoted) && hasViet(ans)) { en = quoted; vi = ans; }      // "What does 'X' mean?"
                    else if (hasViet(quoted) && !hasViet(ans)) { en = ans; vi = quoted; } // "How do you say 'X'?"
                    if (en && vi && !seenV.has(en.toLowerCase())) { seenV.add(en.toLowerCase()); vocab.push({ en, vi }); }
                }
            }
        }));
        return { sents, vocab };
    }

    // ---- Advanced/expansion chapters -----------------------------------------------
    // The machine-expanded "(mở rộng)" drill chapters have real, useful VOCABULARY but
    // odd drill SENTENCES ("Hug the soap"). For those, we skip the sentences and stage a
    // natural, warm "two friends learning words together" chat built from the chapter's
    // own vocab via hand-written conversation frames — grammatical for any word/POS.
    const cap = w => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w);

    // Frames for TWO vocab words. Each returns 4 alternating lines (A/B). EN lines are kept
    // pure English so TTS stays clean; the Vietnamese meanings ride in the VI subtitle.
    const TWO_WORD_FRAMES = [
        (B, e1, v1, e2, v2) => [
            { who: 'A', mood: 'happy', en: `Hi ${B}! I learned a new word: ${e1}.`, vi: `Chào ${B}! Mình vừa học một từ mới: ${e1}.` },
            { who: 'B', mood: 'excited', en: `Ooh, ${e1}! What does it mean?`, vi: `Ồ, ${e1}! Nó nghĩa là “${v1}” đúng không?` },
            { who: 'A', mood: 'giggle', en: `Yes! And here is another one: ${e2}.`, vi: `Đúng rồi! Và đây là một từ nữa: ${e2}.` },
            { who: 'B', mood: 'love', en: `${cap(e2)}! I like these new words.`, vi: `${e2} nghĩa là “${v2}”! Mình thích mấy từ mới này.` },
        ],
        (B, e1, v1, e2, v2) => [
            { who: 'A', mood: 'happy', en: `Let's play a word game, ${B}!`, vi: `Cùng chơi trò đố từ nào, ${B}!` },
            { who: 'B', mood: 'excited', en: `Okay! Teach me the word ${e1}.`, vi: `Được! Dạy mình từ ${e1} (“${v1}”) đi.` },
            { who: 'A', mood: 'giggle', en: `Sure! And this one too: ${e2}.`, vi: `Chắc rồi! Còn từ này nữa: ${e2}.` },
            { who: 'B', mood: 'love', en: `Nice, ${e1} and ${e2}! I remember now.`, vi: `Hay ghê, ${e1} và ${e2} (“${v2}”)! Mình nhớ rồi.` },
        ],
        (B, e1, v1, e2, v2) => [
            { who: 'A', mood: 'happy', en: `Look ${B}, my new words: ${e1} and ${e2}.`, vi: `Nhìn nè ${B}, từ mới của mình: ${e1} và ${e2}.` },
            { who: 'B', mood: 'excited', en: `Wow! Say ${e1} again, please.`, vi: `Ồ! Nói lại ${e1} (“${v1}”) đi.` },
            { who: 'A', mood: 'giggle', en: `${cap(e1)}! And do not forget ${e2}.`, vi: `${e1}! Và đừng quên ${e2} (“${v2}”) nhé.` },
            { who: 'B', mood: 'love', en: `Got it! ${cap(e1)} and ${e2}.`, vi: `Hiểu rồi! ${e1} và ${e2}.` },
        ],
    ];
    const ONE_WORD_FRAME = (B, e1, v1) => [
        { who: 'A', mood: 'happy', en: `Hi ${B}! I have a new word: ${e1}.`, vi: `Chào ${B}! Mình có một từ mới: ${e1}.` },
        { who: 'B', mood: 'excited', en: `Ooh, ${e1}! What does it mean?`, vi: `Ồ, ${e1}! Nó nghĩa là gì?` },
        { who: 'A', mood: 'giggle', en: `Let me show you what ${e1} is!`, vi: `Để mình chỉ cho bạn ${e1} (“${v1}”) là gì!` },
        { who: 'B', mood: 'love', en: `Thank you! Now I know ${e1}.`, vi: `Cảm ơn nhé! Giờ mình biết ${e1} rồi.` },
    ];

    function dialogueFromVocab(vocab, friendName, index) {
        if (vocab.length >= 2) {
            const frame = TWO_WORD_FRAMES[index % TWO_WORD_FRAMES.length];
            return frame(friendName, vocab[0].en, vocab[0].vi, vocab[1].en, vocab[1].vi);
        }
        if (vocab.length === 1) return ONE_WORD_FRAME(friendName, vocab[0].en, vocab[0].vi);
        return [];
    }

    // Coherent, LONGER chapter dialogue (Cluster D). The old approach strung 4 unrelated
    // curriculum sentences between two characters, which never read as a real conversation.
    // Instead we stage a genuine mini-scene with a beginning → middle → end, weaving the
    // chapter's OWN vocab in one natural exchange per word (so the length scales with the
    // vocab and the chat actually holds together). EN stays clean for TTS; VI meanings ride
    // in the subtitle. Falls back to sentences only when a chapter has no vocab at all.
    const COHERENT_THEMES = [
        { // 1) Two friends meet and share the new words
            intro: (B) => [
                { who: 'A', mood: 'happy', en: `Hi ${B}! How are you today?`, vi: `Chào ${B}! Hôm nay bạn thế nào?` },
                { who: 'B', mood: 'excited', en: `I'm great, Khoai! What did you learn today?`, vi: `Mình khỏe, Khoai! Hôm nay bạn học được gì thế?` },
            ],
            exch: (e, v) => [
                { who: 'A', mood: 'giggle', en: `I learned a new word: ${e}.`, vi: `Mình học một từ mới: ${e}.` },
                { who: 'B', mood: 'love', en: `${cap(e)}! So it means "${v}". I like it!`, vi: `${e}! Vậy nó nghĩa là “${v}”. Mình thích ghê!` },
            ],
            outro: (B) => [
                { who: 'A', mood: 'happy', en: `You learn so fast, ${B}!`, vi: `Bạn học nhanh quá, ${B}!` },
                { who: 'B', mood: 'love', en: `Thank you, Khoai! Let's study again tomorrow.`, vi: `Cảm ơn Khoai! Mai mình học tiếp nhé.` },
            ],
        },
        { // 2) A friendly guessing game
            intro: (B) => [
                { who: 'A', mood: 'happy', en: `Let's play a word game, ${B}!`, vi: `Cùng chơi trò đố từ nào, ${B}!` },
                { who: 'B', mood: 'excited', en: `Yes! I say the meaning, you say the word. Ready!`, vi: `Được! Bạn nói từ, mình nói nghĩa nhé. Sẵn sàng!` },
            ],
            exch: (e, v) => [
                { who: 'A', mood: 'giggle', en: `Okay, here is the word: ${e}.`, vi: `Được, từ đây nè: ${e}.` },
                { who: 'B', mood: 'love', en: `${cap(e)} means "${v}"! Am I right?`, vi: `${e} nghĩa là “${v}”! Đúng không?` },
            ],
            outro: (B) => [
                { who: 'A', mood: 'happy', en: `All correct! You are so clever, ${B}.`, vi: `Đúng hết! Bạn giỏi quá, ${B}.` },
                { who: 'B', mood: 'love', en: `That was fun! One more game soon, Khoai?`, vi: `Vui ghê! Lát chơi ván nữa nha Khoai?` },
            ],
        },
        { // 3) Studying together / helping a friend
            intro: (B) => [
                { who: 'A', mood: 'happy', en: `${B}, can you help me study these words?`, vi: `${B} ơi, giúp mình học mấy từ này với?` },
                { who: 'B', mood: 'excited', en: `Of course, Khoai! Tell me the first one.`, vi: `Tất nhiên rồi, Khoai! Nói từ đầu tiên đi.` },
            ],
            exch: (e, v) => [
                { who: 'A', mood: 'giggle', en: `This word is ${e}. I always forget it.`, vi: `Từ này là ${e}. Mình cứ quên hoài.` },
                { who: 'B', mood: 'love', en: `${cap(e)} means "${v}". Say it with me: ${e}!`, vi: `${e} nghĩa là “${v}”. Đọc cùng mình nào: ${e}!` },
            ],
            outro: (B) => [
                { who: 'A', mood: 'happy', en: `Now I remember them all. Thank you, ${B}!`, vi: `Giờ mình nhớ hết rồi. Cảm ơn ${B}!` },
                { who: 'B', mood: 'love', en: `You did it, Khoai! We make a great team.`, vi: `Bạn làm được mà, Khoai! Đôi mình hợp ghê.` },
            ],
        },
    ];

    function coherentDialogue(B, vocab, index) {
        const words = (vocab || []).filter(w => w && w.en && w.vi).slice(0, 3);
        if (!words.length) return [];
        const t = COHERENT_THEMES[index % COHERENT_THEMES.length];
        let lines = t.intro(B).slice();
        words.forEach(w => { lines = lines.concat(t.exch(w.en, w.vi)); });
        lines = lines.concat(t.outro(B));
        return lines;
    }

    // Coherent scene for chapters that teach SENTENCES but expose no vocab pairs (e.g. the
    // preposition chapters, which have no multiple-choice). Instead of the old 4 unrelated
    // lines, two friends "practice sentences together": Khoai says the chapter's real
    // sentences and the friend reacts naturally, wrapped in a greeting + a warm close.
    function coherentFromSentences(B, sents, index) {
        const score = s => {
            let n = 0;
            if (/\b(i|you|we|he|she|they|it|this|that|my|your|our|his|her)\b/i.test(s.en)) n += 2;
            const w = s.en.split(' ').length;
            if (w >= 3 && w <= 8) n += 2;
            return n;
        };
        const ranked = sents.slice().filter(s => s.en.split(' ').length <= 9).sort((a, b) => score(b) - score(a) || a.en.length - b.en.length).slice(0, 3);
        const list = ranked.length ? ranked : sents.slice(0, 3);
        if (!list.length) return [];
        const reacts = [
            { en: `Nice sentence, Khoai! I understand it.`, vi: `Câu hay đó Khoai! Mình hiểu rồi.` },
            { en: `Got it! Let me remember that one.`, vi: `Hiểu rồi! Để mình ghi nhớ câu đó.` },
            { en: `Ooh, good one! Say it once more?`, vi: `Ồ, hay ghê! Nói lại lần nữa nha?` },
        ];
        const moods = ['happy', 'excited', 'giggle', 'love'];
        const lines = [
            { who: 'A', mood: 'happy', en: `Hi ${B}! Let's practice some sentences together.`, vi: `Chào ${B}! Cùng luyện vài câu với nhau nào.` },
            { who: 'B', mood: 'excited', en: `Great idea, Khoai! You say them, I'll learn.`, vi: `Ý hay đó Khoai! Bạn nói đi, mình học theo.` },
        ];
        list.forEach((s, i) => {
            lines.push({ who: 'A', mood: moods[i % moods.length], en: s.en, vi: s.vi });
            lines.push(Object.assign({ who: 'B', mood: 'love' }, reacts[i % reacts.length]));
        });
        lines.push({ who: 'A', mood: 'happy', en: `You did great, ${B}!`, vi: `Bạn giỏi lắm, ${B}!` });
        lines.push({ who: 'B', mood: 'love', en: `Thanks, Khoai! Let's practice again soon.`, vi: `Cảm ơn Khoai! Lát mình luyện tiếp nhé.` });
        return lines;
    }

    // Pick the most natural, speakable curriculum sentences for a normal chapter.
    function dialogueFromSentences(sents) {
        const PRON = /\b(i|you|we|he|she|they|it|my|your|our|his|her)\b/i;
        const VERB = /\b(is|are|am|like|likes|want|wants|have|has|love|loves|can|do|does|need|would|let)\b/i;
        const score = s => {
            let n = 0;
            if (PRON.test(s.en)) n += 2;
            if (VERB.test(s.en)) n += 1;
            if (/\?$/.test(s.en.trim())) n += 1;
            const w = s.en.split(' ').length;
            if (w >= 3 && w <= 7) n += 1;
            return n;
        };
        const chosen = sents.slice()
            .filter(s => s.en.split(' ').length <= 10)
            .sort((a, b) => score(b) - score(a) || a.en.length - b.en.length)
            .slice(0, 4);
        const picked = chosen.length ? chosen : sents.slice(0, 4);
        const moods = ['happy', 'excited', 'giggle', 'love'];
        return picked.map((s, i) => ({ who: i % 2 === 0 ? 'A' : 'B', en: s.en, vi: s.vi, mood: moods[i % moods.length] }));
    }

    // Assemble a playable scenario object (same schema as SCENARIO_BANK) for a chapter.
    function buildFromUnit(unit, index) {
        if (!unit) return null;
        const { sents, vocab } = collectUnit(unit);
        if (!sents.length && !vocab.length) return null;

        const shortName = KID_NAMES[index % KID_NAMES.length]; // bare name for clean English/TTS
        const friendName = 'Bạn ' + shortName;                 // friendly label under the avatar
        // "(mở rộng)" chapters are the machine-expanded vocab drills — stage a vocab chat
        // instead of surfacing their odd drill sentences. Everything else uses its real
        // (vetted) curriculum sentences, which read naturally as-is.
        // Coherent, longer mini-scene from the chapter's own vocab (Cluster D) for every
        // chapter that has vocab (normal AND "(mở rộng)"). Only chapters with no usable
        // vocab at all fall back to their curriculum sentences.
        let dialogue;
        if (vocab.length >= 1) {
            dialogue = coherentDialogue(shortName, vocab, index);
            if (dialogue.length < 4) dialogue = dialogueFromVocab(vocab, shortName, index);
        } else if (sents.length) {
            dialogue = coherentFromSentences(shortName, sents, index);
        } else {
            dialogue = [];
        }
        if (!dialogue.length) return null;

        const bhue = (index * 53 + 40) % 360;
        return {
            id: 'unit_scene_' + (unit.id || index),
            title: 'Chương ' + (index + 1) + (unit.title ? ': ' + unit.title : ''),
            bg: pickBg(unit, index),
            cast: {
                A: { name: 'Khoai', hue: 0, badge: '' },
                B: { name: friendName, hue: bhue, badge: BADGES[index % BADGES.length] },
            },
            lines: dialogue,
            vocab: vocab.slice(0, 4),
            playAs: 'A',
            __generated: true,
        };
    }

    // ================================================================================
    // Session state
    // ================================================================================
    let S = null; // { scn, root, onExit, phase, idx, quiz, qIdx, qScore, rpIdx }

    function cleanup() { stopSpeak(); }

    // ================================================================================
    // MENU — pick a situation
    // ================================================================================
    function openMenu(container, onExit) {
        cleanup();
        const root = container;
        const cards = BANK.map(s => {
            const a = mascot('happy', 66);
            return `
              <button class="scn-card scn-card--${escapeHtml(s.bg)}" data-id="${escapeHtml(s.id)}">
                <span class="scn-card-stage">
                  <span class="scn-card-actor" style="filter:hue-rotate(${s.cast.A.hue}deg)">${a}</span>
                  <span class="scn-card-actor scn-card-actor--b" style="filter:hue-rotate(${s.cast.B.hue}deg)">${mascot('giggle', 60)}</span>
                  <span class="scn-card-badge">${escapeHtml(s.cast.B.badge || '⭐')}</span>
                </span>
                <span class="scn-card-title">${escapeHtml(s.title)}</span>
                <span class="scn-card-sub">${s.lines.length} lượt thoại · ${s.vocab.length} từ mới</span>
              </button>`;
        }).join('');

        root.innerHTML = `
          <div class="scn-menu">
            <div class="scn-menu-head">
              <div class="scn-menu-emoji">🎬</div>
              <h2 class="scn-menu-title">Tình huống giao tiếp</h2>
              <p class="scn-menu-desc">Xem hoạt cảnh, học từ vựng trong ngữ cảnh, làm quiz rồi <b>đóng vai</b> nhân vật!</p>
            </div>
            <div class="scn-menu-grid">${cards}</div>
            <button class="btn-secondary scn-menu-back">QUAY LẠI</button>
          </div>`;

        root.querySelectorAll('.scn-card').forEach(btn => {
            btn.addEventListener('click', () => startScenario(root, btn.dataset.id, onExit));
        });
        const back = root.querySelector('.scn-menu-back');
        if (back) back.addEventListener('click', () => { cleanup(); if (onExit) onExit(); });
    }

    // ================================================================================
    // STAGE — the animated set, shared by Watch & Role-play
    // ================================================================================
    // Core runner: play any scenario object. `back` = the summary's secondary button
    // ({label, fn}) so chapter scenes can return to the path and menu scenes to the menu.
    function runScenario(root, scn, onExit, back) {
        cleanup();
        if (!scn) { if (onExit) onExit(); return; }
        S = { scn, root, onExit, back: back || null, phase: 'watch', idx: 0, quiz: null, qIdx: 0, qScore: 0, rpIdx: 0 };
        buildStage();
        renderWatchStep();
    }
    function startScenario(root, id, onExit) {
        const scn = BANK.find(x => x.id === id) || BANK[0];
        runScenario(root, scn, onExit, { label: 'Tình huống khác ▶', fn: () => openMenu(root, onExit) });
    }
    // Entry point for chapter-integrated scenes (called from the path map in app.js).
    function openUnit(root, unit, index, onExit) {
        cleanup();
        const scn = buildFromUnit(unit, index);
        if (!scn) {
            root.innerHTML = `<div class="scn-menu"><div class="scn-menu-head"><div class="scn-menu-emoji">🎬</div>
              <h2 class="scn-menu-title">Chưa có tình huống</h2>
              <p class="scn-menu-desc">Chương này chưa đủ nội dung để dựng hoạt cảnh. Thử chương khác nhé!</p></div>
              <button class="btn-secondary scn-menu-back">QUAY LẠI</button></div>`;
            const b = root.querySelector('.scn-menu-back');
            if (b) b.addEventListener('click', () => { if (onExit) onExit(); });
            return;
        }
        runScenario(root, scn, onExit, { label: '⬅ Quay lại lộ trình', fn: () => { if (onExit) onExit(); } });
    }

    function actorHtml(side, cast, mood) {
        return `
          <div class="scn-actor scn-actor--${side}" id="scn-actor-${side}">
            <div class="scn-actor-badge">${escapeHtml(cast.badge || '')}</div>
            <div class="scn-actor-body" style="filter:hue-rotate(${cast.hue}deg) saturate(1.05)">${mascot(mood, 132)}</div>
            <div class="scn-actor-name">${escapeHtml(cast.name)}</div>
          </div>`;
    }

    // Per-background decorative props (pure emoji, animated via CSS).
    function propsFor(bg) {
        const map = {
            park: ['🌳', '🌲', '🌸', '🦋', '🌻'],
            cafe: ['☕', '🥐', '🍎', '🧁', '🪴'],
            classroom: ['📚', '✏️', '🔤', '🎒', '🗺️'],
            home: ['🪴', '🛋️', '🖼️', '🕰️', '🧸'],
            market: ['🍎', '🥕', '🧺', '🍞', '🎈'],
            playground: ['🛝', '🌳', '⚽', '🎈', '🪁'],
        };
        const props = map[bg] || ['⭐', '✨', '🎈'];
        return props.map((p, i) => `<span class="scn-prop scn-prop--${i}">${p}</span>`).join('');
    }

    function buildStage() {
        const scn = S.scn;
        S.root.innerHTML = `
          <div class="scn-play">
            <div class="scn-stage scn-bg--${escapeHtml(scn.bg)}" id="scn-stage">
              <div class="scn-sky"></div>
              <div class="scn-clouds">
                <span class="scn-cloud scn-cloud--1">☁️</span>
                <span class="scn-cloud scn-cloud--2">☁️</span>
                <span class="scn-cloud scn-cloud--3">⛅</span>
              </div>
              <div class="scn-props">${propsFor(scn.bg)}</div>
              <div class="scn-ground"></div>
              ${actorHtml('a', scn.cast.A, 'happy')}
              ${actorHtml('b', scn.cast.B, 'happy')}
              <div class="scn-bubble" id="scn-bubble" aria-live="polite"></div>
              <div class="scn-phase-tag" id="scn-phase-tag">🎬 Xem hoạt cảnh</div>
            </div>
            <div class="scn-panel" id="scn-panel"></div>
          </div>`;
        S.stage = document.getElementById('scn-stage');
        S.bubble = document.getElementById('scn-bubble');
        S.panel = document.getElementById('scn-panel');
        S.tag = document.getElementById('scn-phase-tag');
    }

    function setSpeaking(who) {
        const a = document.getElementById('scn-actor-a');
        const b = document.getElementById('scn-actor-b');
        if (!a || !b) return;
        a.classList.toggle('speaking', who === 'A');
        b.classList.toggle('speaking', who === 'B');
        // "Camera" gently pushes in toward whoever is talking.
        S.stage.classList.toggle('focus-left', who === 'A');
        S.stage.classList.toggle('focus-right', who === 'B');
    }
    function clearSpeaking() {
        const a = document.getElementById('scn-actor-a');
        const b = document.getElementById('scn-actor-b');
        if (a) a.classList.remove('speaking');
        if (b) b.classList.remove('speaking');
        S.stage.classList.remove('focus-left', 'focus-right');
    }

    function showBubble(who, en, vocab) {
        const side = who === 'A' ? 'a' : 'b';
        S.bubble.className = 'scn-bubble show scn-bubble--' + side;
        S.bubble.innerHTML = `<span class="scn-bubble-text">${highlightVocab(en, vocab)}</span>`;
    }
    function hideBubble() { if (S.bubble) S.bubble.className = 'scn-bubble'; }

    // ================================================================================
    // PHASE 1 — WATCH
    // ================================================================================
    function renderWatchStep() {
        const scn = S.scn;
        const line = scn.lines[S.idx];
        S.tag.textContent = '🎬 Xem hoạt cảnh';
        setSpeaking(line.who);
        showBubble(line.who, line.en, scn.vocab);
        // animate the speaking actor's mood
        const actorBody = document.querySelector(`#scn-actor-${line.who === 'A' ? 'a' : 'b'} .scn-actor-body`);
        if (actorBody) actorBody.innerHTML = mascot(line.mood || 'happy', 132);

        const isLast = S.idx === scn.lines.length - 1;
        const dots = scn.lines.map((_, i) =>
            `<span class="scn-dot${i === S.idx ? ' on' : ''}${i < S.idx ? ' done' : ''}"></span>`).join('');
        const chips = scn.vocab.map(v =>
            `<button class="scn-chip" data-vi="${escapeHtml(v.vi)}"><span>${escapeHtml(v.en)}</span></button>`).join('');

        S.panel.innerHTML = `
          <div class="scn-line">
            <div class="scn-line-who">${escapeHtml(scn.cast[line.who].name)}</div>
            <div class="scn-line-en">${highlightVocab(line.en, scn.vocab)}</div>
            <div class="scn-line-vi">${escapeHtml(line.vi)}</div>
          </div>
          <div class="scn-vocab-strip">
            <span class="scn-vocab-label">Từ mới:</span>${chips}
          </div>
          <div class="scn-dots">${dots}</div>
          <div class="scn-controls">
            <button class="btn-secondary scn-replay">🔊 Nghe lại</button>
            <button class="btn-primary scn-next">${isLast ? 'Làm bài tập ▶' : 'Tiếp ▶'}</button>
          </div>`;

        // tap a vocab chip to reveal its meaning
        S.panel.querySelectorAll('.scn-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                if (chip.classList.contains('open')) return;
                chip.classList.add('open');
                chip.innerHTML = `<span>${chip.querySelector('span').textContent}</span><em>${escapeHtml(chip.dataset.vi)}</em>`;
                sound('flip');
            });
        });
        S.panel.querySelector('.scn-replay').addEventListener('click', () => speak(line.en));
        S.panel.querySelector('.scn-next').addEventListener('click', () => {
            if (isLast) { startQuiz(); }
            else { S.idx++; renderWatchStep(); }
        });

        speak(line.en);
    }

    // ================================================================================
    // PHASE 2 — QUIZ  (derived from the scene's own vocab + lines)
    // ================================================================================
    function buildQuiz() {
        const scn = S.scn;
        const p = pool();
        const viPool = [...new Set([...p.vi, ...scn.vocab.map(v => v.vi)])];
        const enPool = [...new Set([...p.en, ...scn.vocab.map(v => v.en)])];
        const linePool = [...new Set([...bankLinePool(), ...scn.lines.map(l => l.en)])];
        const qs = [];
        const esc = w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // 1) Vocabulary-meaning questions (up to 3)
        shuffle(scn.vocab).slice(0, 3).forEach(v => {
            const distract = shuffle(viPool.filter(x => x !== v.vi)).slice(0, 3);
            const options = shuffle([v.vi, ...distract]);
            qs.push({
                q: `Từ “<b>${escapeHtml(v.en)}</b>” nghĩa là gì?`,
                options,
                correct: options.indexOf(v.vi),
            });
        });

        // 2) One fill-the-blank drawn from a real line that contains a vocab word
        const inLine = scn.vocab.filter(v =>
            scn.lines.some(l => new RegExp('\\b' + esc(v.en) + '\\b', 'i').test(l.en)));
        if (inLine.length) {
            const target = shuffle(inLine)[0];
            const line = scn.lines.find(l => new RegExp('\\b' + esc(target.en) + '\\b', 'i').test(l.en));
            const blanked = line.en.replace(new RegExp('\\b' + esc(target.en) + '\\b', 'i'), '____');
            const distract = shuffle(enPool.filter(x => x.toLowerCase() !== target.en.toLowerCase())).slice(0, 3);
            const options = shuffle([target.en, ...distract]);
            qs.push({
                q: `Điền từ đúng:<br><span class="scn-fill">“${escapeHtml(blanked)}”</span>`,
                options,
                correct: options.indexOf(target.en),
            });
        }

        // 3) Pad with "which line means…" questions so every chapter gets a real quiz even
        //    when vocab pairs are sparse (always derivable from the vetted dialogue lines).
        const usedLines = new Set();
        shuffle(scn.lines).forEach(l => {
            if (qs.length >= 4 || usedLines.has(l.en)) return;
            usedLines.add(l.en);
            const distract = shuffle(linePool.filter(x => x !== l.en)).slice(0, 3);
            if (distract.length < 2) return; // not enough to make a fair question
            const options = shuffle([l.en, ...distract]);
            qs.push({
                q: `Câu nào có nghĩa:<br><span class="scn-fill">“${escapeHtml(l.vi)}”</span>`,
                options,
                correct: options.indexOf(l.en),
            });
        });

        return qs;
    }

    function startQuiz() {
        stopSpeak();
        clearSpeaking();
        hideBubble();
        S.phase = 'quiz';
        S.quiz = buildQuiz();
        S.qIdx = 0;
        S.qScore = 0;
        if (S.tag) S.tag.textContent = '📝 Quiz';
        renderQuizStep();
    }

    function renderQuizStep() {
        const total = S.quiz.length;
        if (S.qIdx >= total) { renderQuizDone(); return; }
        const item = S.quiz[S.qIdx];
        // A friendly narrator mascot in the stage during the quiz
        const narratorBody = document.querySelector('#scn-actor-a .scn-actor-body');
        if (narratorBody) narratorBody.innerHTML = mascot('thinking', 132);

        S.panel.innerHTML = `
          <div class="scn-quiz">
            <div class="scn-quiz-progress">Câu ${S.qIdx + 1}/${total}</div>
            <div class="scn-quiz-q">${item.q}</div>
            <div class="scn-quiz-opts">
              ${item.options.map((o, i) => `<button class="scn-opt" data-i="${i}">${escapeHtml(o)}</button>`).join('')}
            </div>
            <div class="scn-quiz-feedback" id="scn-qfb"></div>
          </div>`;

        S.panel.querySelectorAll('.scn-opt').forEach(btn => {
            btn.addEventListener('click', () => onQuizAnswer(parseInt(btn.dataset.i, 10), item), { once: false });
        });
    }

    function onQuizAnswer(choice, item) {
        const opts = S.panel.querySelectorAll('.scn-opt');
        if (opts[0].classList.contains('locked')) return; // already answered
        opts.forEach(o => o.classList.add('locked'));
        const fb = document.getElementById('scn-qfb');
        const correct = choice === item.correct;
        opts[item.correct].classList.add('correct');
        if (!correct) opts[choice].classList.add('wrong');
        if (correct) { S.qScore++; sound('correct'); fb.innerHTML = '<span class="scn-fb-ok">Chính xác! 🎉</span>'; }
        else { sound('wrong'); fb.innerHTML = '<span class="scn-fb-no">Đáp án đúng đã được tô xanh 💡</span>'; }

        const next = document.createElement('button');
        next.className = 'btn-primary scn-quiz-next';
        next.textContent = (S.qIdx === S.quiz.length - 1) ? 'Xem kết quả ▶' : 'Câu tiếp ▶';
        next.addEventListener('click', () => { S.qIdx++; renderQuizStep(); });
        fb.appendChild(next);
    }

    function renderQuizDone() {
        const total = S.quiz.length;
        const good = S.qScore >= Math.ceil(total * 0.6);
        const bodyA = document.querySelector('#scn-actor-a .scn-actor-body');
        if (bodyA) bodyA.innerHTML = mascot(good ? 'party' : 'happy', 132);
        sound(good ? 'cheer1' : 'smile1');
        S.panel.innerHTML = `
          <div class="scn-quiz-done">
            <div class="scn-quiz-score">${S.qScore}/${total}</div>
            <div class="scn-quiz-msg">${good ? 'Tuyệt vời! Giờ mình cùng đóng vai nhé 🎭' : 'Làm tốt lắm! Cùng đóng vai để nhớ lâu hơn nhé 🎭'}</div>
            <button class="btn-primary scn-to-rp">Đóng vai ▶</button>
          </div>`;
        S.panel.querySelector('.scn-to-rp').addEventListener('click', startRoleplay);
    }

    // ================================================================================
    // PHASE 3 — ROLE-PLAY  (learner plays scn.playAs; picks the right line to say)
    // ================================================================================
    function startRoleplay() {
        stopSpeak();
        S.phase = 'roleplay';
        S.rpIdx = 0;
        if (S.tag) S.tag.textContent = '🎭 Đóng vai';
        // reset both actors to neutral happy
        const bodyA = document.querySelector('#scn-actor-a .scn-actor-body');
        const bodyB = document.querySelector('#scn-actor-b .scn-actor-body');
        if (bodyA) bodyA.innerHTML = mascot('happy', 132);
        if (bodyB) bodyB.innerHTML = mascot('happy', 132);
        renderRoleplayStep();
    }

    function roleplayDistractors(correctLine) {
        // Pull other lines the played character could plausibly say, from all scenarios.
        const poolLines = [];
        BANK.forEach(s => s.lines.forEach(l => {
            if (l.en !== correctLine.en) poolLines.push(l.en);
        }));
        return shuffle([...new Set(poolLines)]).slice(0, 2);
    }

    function renderRoleplayStep() {
        const scn = S.scn;
        if (S.rpIdx >= scn.lines.length) { renderSummary(); return; }
        const line = scn.lines[S.rpIdx];
        const mine = line.who === scn.playAs;
        setSpeaking(line.who);

        if (!mine) {
            // The other character speaks automatically.
            const body = document.querySelector(`#scn-actor-${line.who === 'A' ? 'a' : 'b'} .scn-actor-body`);
            if (body) body.innerHTML = mascot(line.mood || 'happy', 132);
            showBubble(line.who, line.en, scn.vocab);
            S.panel.innerHTML = `
              <div class="scn-rp">
                <div class="scn-rp-who">${escapeHtml(scn.cast[line.who].name)} đang nói…</div>
                <div class="scn-rp-partner-line">${highlightVocab(line.en, scn.vocab)}</div>
                <div class="scn-rp-partner-vi">${escapeHtml(line.vi)}</div>
                <button class="btn-primary scn-rp-next">Tiếp ▶</button>
              </div>`;
            speak(line.en);
            S.panel.querySelector('.scn-rp-next').addEventListener('click', () => { S.rpIdx++; renderRoleplayStep(); });
            return;
        }

        // The learner's turn: choose the correct line to say, in context.
        hideBubble();
        const options = shuffle([line.en, ...roleplayDistractors(line)]);
        const you = scn.cast[scn.playAs].name;
        S.panel.innerHTML = `
          <div class="scn-rp">
            <div class="scn-rp-cue">🎭 Lượt của bạn (vai <b>${escapeHtml(you)}</b>) — chọn câu đúng để nói:</div>
            <div class="scn-rp-hint">${escapeHtml(line.vi)}</div>
            <div class="scn-rp-opts">
              ${options.map((o, i) => `<button class="scn-rp-opt" data-i="${i}" data-en="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join('')}
            </div>
            <div class="scn-rp-feedback" id="scn-rpfb"></div>
          </div>`;

        S.panel.querySelectorAll('.scn-rp-opt').forEach(btn => {
            btn.addEventListener('click', () => onRoleplayChoice(btn, line));
        });
    }

    function onRoleplayChoice(btn, line) {
        const chosen = btn.dataset.en;
        const fb = document.getElementById('scn-rpfb');
        if (chosen === line.en) {
            S.panel.querySelectorAll('.scn-rp-opt').forEach(o => { o.classList.add('locked'); if (o.dataset.en === line.en) o.classList.add('correct'); });
            const scn = S.scn;
            const body = document.querySelector(`#scn-actor-${line.who === 'A' ? 'a' : 'b'} .scn-actor-body`);
            if (body) body.innerHTML = mascot(line.mood || 'party', 132);
            showBubble(line.who, line.en, scn.vocab);
            sound('correct');
            fb.innerHTML = '<span class="scn-fb-ok">Chuẩn luôn! 🌟</span>';
            const next = document.createElement('button');
            next.className = 'btn-primary scn-rp-next';
            next.textContent = (S.rpIdx === scn.lines.length - 1) ? 'Hoàn thành 🎉' : 'Tiếp ▶';
            next.addEventListener('click', () => { S.rpIdx++; renderRoleplayStep(); });
            fb.appendChild(next);
            speak(line.en);
        } else {
            btn.classList.add('wrong', 'shake');
            sound('wrong');
            setTimeout(() => btn.classList.remove('shake'), 500);
            fb.innerHTML = '<span class="scn-fb-no">Chưa đúng, thử lại nhé!</span>';
        }
    }

    // ================================================================================
    // SUMMARY
    // ================================================================================
    function renderSummary() {
        stopSpeak();
        clearSpeaking();
        hideBubble();
        if (S.tag) S.tag.textContent = '🏆 Hoàn thành';
        const bodyA = document.querySelector('#scn-actor-a .scn-actor-body');
        const bodyB = document.querySelector('#scn-actor-b .scn-actor-body');
        if (bodyA) bodyA.innerHTML = mascot('party', 132);
        if (bodyB) bodyB.innerHTML = mascot('party', 132);
        S.stage.classList.add('celebrate');
        celebrate();
        sound('complete1');
        const total = S.quiz ? S.quiz.length : 0;
        S.panel.innerHTML = `
          <div class="scn-summary">
            <div class="scn-summary-emoji">🎉</div>
            <h2 class="scn-summary-title">Hoàn thành tình huống!</h2>
            <p class="scn-summary-line">“${escapeHtml(S.scn.title)}”</p>
            <div class="scn-summary-stats">
              <div class="scn-summary-stat"><span>📝</span><b>${S.qScore}/${total}</b><em>Quiz</em></div>
              <div class="scn-summary-stat"><span>🎭</span><b>Xong</b><em>Đóng vai</em></div>
              <div class="scn-summary-stat"><span>📚</span><b>${S.scn.vocab.length}</b><em>Từ mới</em></div>
            </div>
            <div class="scn-summary-btns">
              <button class="btn-secondary scn-again">🔁 Xem lại</button>
              <button class="btn-primary scn-more">${escapeHtml(S.back ? S.back.label : 'Xong ✓')}</button>
            </div>
          </div>`;
        // "Xem lại" replays the SAME scene object (works for generated chapter scenes too,
        // whose id is not in BANK).
        S.panel.querySelector('.scn-again').addEventListener('click', () => runScenario(S.root, S.scn, S.onExit, S.back));
        S.panel.querySelector('.scn-more').addEventListener('click', () => {
            if (S.back && S.back.fn) S.back.fn();
            else if (S.onExit) S.onExit();
        });
    }

    return { openMenu, openUnit, buildFromUnit, list: () => BANK.slice() };
})();
window.Scenarios = Scenarios;
