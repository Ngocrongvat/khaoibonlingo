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
    function startScenario(root, id, onExit) {
        cleanup();
        const scn = BANK.find(x => x.id === id) || BANK[0];
        if (!scn) { if (onExit) onExit(); return; }
        S = { scn, root, onExit, phase: 'watch', idx: 0, quiz: null, qIdx: 0, qScore: 0, rpIdx: 0 };
        buildStage();
        renderWatchStep();
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
        const qs = [];

        // Vocabulary-meaning questions (up to 3)
        shuffle(scn.vocab).slice(0, 3).forEach(v => {
            const distract = shuffle(p.vi.filter(x => x !== v.vi)).slice(0, 3);
            const options = shuffle([v.vi, ...distract]);
            qs.push({
                q: `Từ “<b>${escapeHtml(v.en)}</b>” nghĩa là gì?`,
                options,
                correct: options.indexOf(v.vi),
            });
        });

        // One fill-the-blank drawn from a real line that contains a vocab word
        const inLine = scn.vocab.filter(v =>
            scn.lines.some(l => new RegExp('\\b' + v.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(l.en)));
        if (inLine.length) {
            const target = shuffle(inLine)[0];
            const line = scn.lines.find(l => new RegExp('\\b' + target.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(l.en));
            const blanked = line.en.replace(new RegExp('\\b' + target.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'), '____');
            const distract = shuffle(p.en.filter(x => x.toLowerCase() !== target.en.toLowerCase())).slice(0, 3);
            const options = shuffle([target.en, ...distract]);
            qs.push({
                q: `Điền từ đúng:<br><span class="scn-fill">“${escapeHtml(blanked)}”</span>`,
                options,
                correct: options.indexOf(target.en),
            });
        }
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
              <button class="btn-primary scn-more">Tình huống khác ▶</button>
            </div>
          </div>`;
        S.panel.querySelector('.scn-again').addEventListener('click', () => startScenario(S.root, S.scn.id, S.onExit));
        S.panel.querySelector('.scn-more').addEventListener('click', () => openMenu(S.root, S.onExit));
    }

    return { openMenu, list: () => BANK.slice() };
})();
window.Scenarios = Scenarios;
