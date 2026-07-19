// app-ielts.js — DuoClone methods split out of the former monolithic app.js.
// Attaches to DuoClone.prototype (defined in app.js). Load AFTER app.js and BEFORE
// app-main.js (which instantiates the app). Pure mechanical split - no behavior change.
Object.assign(DuoClone.prototype, {
    // ===================== IELTS Practice (Listening + Reading) =====================
    // Approximate band conversion for PRACTICE purposes only - not the official IELTS
    // raw-score table (which is calibrated for exactly 40 questions per skill).
    ieltsScoreToBand(pct) {
        if (pct >= 90) return 8.5;
        if (pct >= 80) return 7.5;
        if (pct >= 70) return 7.0;
        if (pct >= 60) return 6.5;
        if (pct >= 50) return 6.0;
        if (pct >= 40) return 5.5;
        if (pct >= 30) return 5.0;
        return 4.5;
    },

    stopIeltsTimer() {
        if (this.ieltsTimerInterval) {
            clearInterval(this.ieltsTimerInterval);
            this.ieltsTimerInterval = null;
        }
    },

    // Bug fix: none of the active-attempt screens (reading passage, listening section,
    // writing editor, speaking part) had any way back to the main app short of finishing
    // every remaining passage/section or letting the timer run out - the only other exit
    // was the nav "X" button, which fully signs the user out. This gives every active
    // IELTS screen an explicit, non-destructive-to-the-session way out.
    exitIeltsAttempt() {
        if (!confirm('Thoát bài luyện tập? Tiến trình bài này sẽ không được lưu.')) return;
        this.stopIeltsTimer();
        this.state.ielts = null;
        this.state.ieltsSpeaking = null;
        this.state.mode = 'curriculum';
        this.renderHomeDashboard();
    },

    renderIeltsExitButton() {
        return `<div style="text-align:right;"><button class="btn-secondary" id="ielts-exit-btn" style="padding:5px 12px; font-size:12.5px;">✕ Thoát</button></div>`;
    },

    bindIeltsExitButton() {
        const btn = document.getElementById('ielts-exit-btn');
        if (btn) btn.addEventListener('click', () => this.exitIeltsAttempt());
    },

    startIeltsTimer(minutes, onExpire) {
        this.stopIeltsTimer();
        // Deliberately a plain instance field, not nested under this.state.ielts - the
        // timer is shared across Reading/Listening/Writing flows, and Writing never
        // initializes state.ielts (that object is Reading/Listening-specific), so
        // nesting here would throw when starting a Writing session directly.
        this.ieltsTimeLeftSec = minutes * 60;
        const update = () => {
            const el = document.getElementById('ielts-timer');
            if (!el) return;
            const m = Math.floor(this.ieltsTimeLeftSec / 60);
            const s = this.ieltsTimeLeftSec % 60;
            el.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        };
        update();
        this.ieltsTimerInterval = setInterval(() => {
            this.ieltsTimeLeftSec--;
            update();
            if (this.ieltsTimeLeftSec <= 0) {
                this.stopIeltsTimer();
                onExpire();
            }
        }, 1000);
    },

    renderIeltsMenu() {
        if (!this.state.currentUser) {
            alert("Vui lòng đăng nhập trước khi luyện thi IELTS!");
            return;
        }
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">🎓</div>
                <h1 style="text-align: center;">Luyện Thi IELTS</h1>
                <p style="text-align: center; color: #777;">Chọn kỹ năng bạn muốn luyện tập theo đúng định dạng và thời gian thi thật.</p>
                <button class="btn-primary" id="ielts-pick-reading" style="display: block; margin: 15px auto; padding: 15px 30px;">📖 Reading (60 phút)</button>
                <button class="btn-primary" id="ielts-pick-listening" style="display: block; margin: 15px auto; padding: 15px 30px;">🎧 Listening (30 phút)</button>
                <button class="btn-secondary" id="ielts-pick-writing" style="display: block; margin: 15px auto; padding: 15px 30px;">✍️ Writing</button>
                <button class="btn-secondary" id="ielts-pick-speaking" style="display: block; margin: 15px auto; padding: 15px 30px;">🗣️ Speaking</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('ielts-pick-reading').addEventListener('click', () => this.startIeltsReading());
        document.getElementById('ielts-pick-listening').addEventListener('click', () => this.startIeltsListening());
        document.getElementById('ielts-pick-writing').addEventListener('click', () => this.renderIeltsWritingMenu());
        document.getElementById('ielts-pick-speaking').addEventListener('click', () => this.renderIeltsSpeakingMenu());
    },

    startIeltsReading() {
        this.state.mode = 'ielts';
        this.state.ielts = { skill: 'reading', items: IELTS_READING, idx: 0, correctTotal: 0, questionsTotal: 0 };
        this.renderIeltsReadingPassage();
        this.startIeltsTimer(60, () => this.finishIeltsTest());
    },

    renderIeltsReadingPassage() {
        const st = this.state.ielts;
        const passage = st.items[st.idx];
        let html = this.renderIeltsExitButton();
        html += `<div style="text-align:center; margin-bottom:10px;">⏱️ <span id="ielts-timer" style="font-weight:800;"></span> &nbsp;|&nbsp; Đoạn ${st.idx + 1}/${st.items.length}</div>`;
        html += `<h2 style="text-align:center;">${this.escapeHtml(passage.title)}</h2>`;
        html += `<div class="reading-passage">${this.escapeHtml(passage.passage)}</div>`;
        html += this.renderIeltsQuestions(passage.questions);
        html += `<button class="btn-primary" id="ielts-submit" style="display:block; margin:20px auto; padding:15px 30px;">NỘP ĐOẠN NÀY</button>`;
        this.ui.container.innerHTML = html;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        this.bindIeltsQuestionEvents(passage.questions);
        this.bindIeltsExitButton();
        document.getElementById('ielts-submit').addEventListener('click', () => this.submitIeltsSection(passage.questions));
    },

    startIeltsListening() {
        this.state.mode = 'ielts';
        this.state.ielts = { skill: 'listening', items: IELTS_LISTENING, idx: 0, correctTotal: 0, questionsTotal: 0 };
        this.renderIeltsListeningSection();
        this.startIeltsTimer(30, () => this.finishIeltsTest());
    },

    renderIeltsListeningSection() {
        const st = this.state.ielts;
        const section = st.items[st.idx];
        let html = this.renderIeltsExitButton();
        html += `<div style="text-align:center; margin-bottom:10px;">⏱️ <span id="ielts-timer" style="font-weight:800;"></span> &nbsp;|&nbsp; Phần ${st.idx + 1}/${st.items.length}</div>`;
        html += `<h2 style="text-align:center;">${this.escapeHtml(section.title)}</h2>`;
        html += `<div class="pronunciation-controls">
                    <button class="btn-listen" id="listen-btn"><span style="font-size: 32px;">🔊</span><br>Nghe lại</button>
                    <button class="btn-listen" id="listen-slow-btn"><span style="font-size: 32px;">🐢</span><br>Nghe chậm</button>
                 </div>`;
        html += this.renderIeltsQuestions(section.questions);
        html += `<button class="btn-primary" id="ielts-submit" style="display:block; margin:20px auto; padding:15px 30px;">NỘP PHẦN NÀY</button>`;
        this.ui.container.innerHTML = html;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('listen-btn').addEventListener('click', () => this.playAudio(section.audioText));
        document.getElementById('listen-slow-btn').addEventListener('click', () => this.playAudioSlow(section.audioText));
        this.bindIeltsQuestionEvents(section.questions);
        this.bindIeltsExitButton();
        document.getElementById('ielts-submit').addEventListener('click', () => this.submitIeltsSection(section.questions));
        this.playAudio(section.audioText);
    },

    renderIeltsQuestions(questions) {
        let html = '';
        questions.forEach((q, i) => {
            html += `<div class="ielts-question" data-qidx="${i}" style="margin: 20px 0; padding: 15px; border: 2px solid var(--duo-border); border-radius: 12px;">`;
            html += `<p style="font-weight:700;">${i + 1}. ${this.escapeHtml(q.q)}</p>`;
            if (q.type === 'mc') {
                html += `<div class="options-grid">`;
                q.options.forEach((opt, oi) => {
                    html += `<div class="option-card ielts-opt" data-qidx="${i}" data-oidx="${oi}">${this.escapeHtml(opt)}</div>`;
                });
                html += `</div>`;
            } else if (q.type === 'tfng') {
                html += `<div class="options-grid">`;
                ['True', 'False', 'Not Given'].forEach((opt, oi) => {
                    html += `<div class="option-card ielts-opt" data-qidx="${i}" data-oidx="${oi}">${opt}</div>`;
                });
                html += `</div>`;
            } else if (q.type === 'fill') {
                html += `<input type="text" class="input-field dictation-input ielts-fill-input" data-qidx="${i}" placeholder="Nhập câu trả lời...">`;
            }
            html += `</div>`;
        });
        return html;
    },

    bindIeltsQuestionEvents(questions) {
        this.ieltsAnswers = {};
        this.ui.container.querySelectorAll('.ielts-opt').forEach(el => {
            el.addEventListener('click', () => {
                const qidx = el.dataset.qidx;
                this.ui.container.querySelectorAll(`.ielts-opt[data-qidx="${qidx}"]`).forEach(c => c.classList.remove('selected'));
                el.classList.add('selected');
                this.ieltsAnswers[qidx] = parseInt(el.dataset.oidx, 10);
            });
        });
        this.ui.container.querySelectorAll('.ielts-fill-input').forEach(el => {
            el.addEventListener('input', () => {
                this.ieltsAnswers[el.dataset.qidx] = el.value;
            });
        });
    },

    submitIeltsSection(questions) {
        const st = this.state.ielts;
        let correct = 0;
        questions.forEach((q, i) => {
            const answer = this.ieltsAnswers ? this.ieltsAnswers[i] : undefined;
            let isRight = false;
            if (q.type === 'mc') {
                isRight = answer === q.correct;
            } else if (q.type === 'tfng') {
                const map = { 0: 'true', 1: 'false', 2: 'not_given' };
                isRight = map[answer] === q.correct;
            } else if (q.type === 'fill') {
                isRight = this.checkComprehensionAnswer(answer, q.acceptedAnswers);
            }
            if (isRight) correct++;
        });
        st.correctTotal += correct;
        st.questionsTotal += questions.length;
        st.idx++;
        if (st.idx >= st.items.length) {
            this.finishIeltsTest();
        } else if (st.skill === 'reading') {
            this.renderIeltsReadingPassage();
        } else {
            this.renderIeltsListeningSection();
        }
    },

    finishIeltsTest() {
        this.stopIeltsTimer();
        const st = this.state.ielts;
        const pct = st.questionsTotal ? Math.round((st.correctTotal / st.questionsTotal) * 100) : 0;
        const band = this.ieltsScoreToBand(pct);
        const skillLabel = st.skill === 'reading' ? 'Reading' : 'Listening';
        this.playTone(pct >= 60 ? 'cheer' : 'cry');
        this.ui.container.innerHTML = `
            <div class="certificate">
                <div class="certificate-badge">🎓</div>
                <h2>KẾT QUẢ LUYỆN THI IELTS - ${skillLabel.toUpperCase()}</h2>
                <p class="certificate-name">${this.escapeHtml(this.state.currentUser)}</p>
                <p>Trả lời đúng ${st.correctTotal}/${st.questionsTotal} câu (${pct}%)</p>
                <p class="certificate-score">Band điểm ước lượng: ${band.toFixed(1)}</p>
                <p style="font-size: 12px; color: #999;">* Đây là band điểm ước lượng cho mục đích luyện tập, không phải kết quả thi IELTS chính thức.</p>
            </div>
            <button class="btn-primary" id="ielts-done" style="display: block; margin: 20px auto; padding: 15px 30px;">VỀ TRANG CHÍNH</button>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('ielts-done').addEventListener('click', () => {
            this.state.mode = 'curriculum';
            this.renderHomeDashboard();
        });
    },

    // Calls the Supabase Edge Function that grades Writing/Speaking with a real AI
    // model against IELTS band descriptors. Returns { ok: true, data } on success or
    // { ok: false, notConfigured: true } if the function/API key isn't set up yet, or
    // { ok: false, message } for any other failure - never throws.
    async callIeltsGradeFunction(payload) {
        if (!window.SupabaseClient || !window.SupabaseClient.client || !window.SupabaseClient.isConfigured) {
            return { ok: false, notConfigured: true };
        }
        try {
            const { data, error } = await window.SupabaseClient.client.functions.invoke('ielts-grade', { body: payload });
            // Any failure to reach/complete the Edge Function - whether it's not deployed
            // yet, missing its ANTHROPIC_API_KEY secret, or a network error - all mean the
            // same thing to the user: AI grading isn't set up yet. Surface one consistent,
            // actionable message rather than a raw technical error string.
            if (error || (data && data.error)) return { ok: false, notConfigured: true, debug: (error && error.message) || (data && data.message) };
            return { ok: true, data };
        } catch (e) {
            return { ok: false, notConfigured: true, debug: e.message };
        }
    },

    renderIeltsGradeWaiting(title) {
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">🤖</div>
                <h1 style="text-align: center;">${this.escapeHtml(title)}</h1>
                <p style="text-align: center; color: #777;">AI đang chấm bài của bạn, vui lòng đợi trong giây lát...</p>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
    },

    renderIeltsGradeResult(skillLabel, result) {
        if (!result.ok) {
            const msg = result.notConfigured
                ? 'Tính năng chấm điểm AI chưa được cấu hình. Quản trị viên cần thêm ANTHROPIC_API_KEY vào Supabase Edge Function secrets và deploy function "ielts-grade" để kích hoạt chấm điểm thật.'
                : `Đã có lỗi khi chấm điểm: ${this.escapeHtml(result.message || 'Không rõ nguyên nhân')}`;
            this.ui.container.innerHTML = `
                <div class="welcome-screen">
                    <div class="duo-character">⚙️</div>
                    <h1 style="text-align: center;">Chưa thể chấm điểm</h1>
                    <p style="text-align: center; color: #777;">${msg}</p>
                    <button class="btn-primary" id="ielts-grade-done" style="display: block; margin: 20px auto; padding: 15px 30px;">VỀ TRANG CHÍNH</button>
                </div>
            `;
        } else {
            const g = result.data;
            const criteriaHtml = (g.criteria || []).map(c => `
                <div style="margin: 10px 0; padding: 10px; border: 2px solid var(--duo-border); border-radius: 10px;">
                    <strong>${this.escapeHtml(c.name)}: ${c.band}</strong>
                    <p style="color:#777; margin: 5px 0 0;">${this.escapeHtml(c.comment || '')}</p>
                </div>
            `).join('');
            this.ui.container.innerHTML = `
                <div class="certificate">
                    <div class="certificate-badge">🎓</div>
                    <h2>KẾT QUẢ ${skillLabel.toUpperCase()} - CHẤM BỞI AI</h2>
                    <p class="certificate-score">Band tổng: ${g.overallBand}</p>
                </div>
                <div style="max-width: 500px; margin: 20px auto;">${criteriaHtml}</div>
                <p style="max-width: 500px; margin: 10px auto; color:#777;">${this.escapeHtml(g.feedback || '')}</p>
                <button class="btn-primary" id="ielts-grade-done" style="display: block; margin: 20px auto; padding: 15px 30px;">VỀ TRANG CHÍNH</button>
            `;
        }
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('ielts-grade-done').addEventListener('click', () => {
            this.state.mode = 'curriculum';
            this.renderHomeDashboard();
        });
    },

    // ---------- Writing ----------

    renderIeltsWritingMenu() {
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">✍️</div>
                <h1 style="text-align: center;">IELTS Writing</h1>
                <button class="btn-primary" id="ielts-write-task1" style="display: block; margin: 15px auto; padding: 15px 30px;">Task 1 (150 từ / 20 phút)</button>
                <button class="btn-primary" id="ielts-write-task2" style="display: block; margin: 15px auto; padding: 15px 30px;">Task 2 (250 từ / 40 phút)</button>
                <button class="btn-secondary" id="ielts-write-back" style="display: block; margin: 15px auto; padding: 15px 30px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('ielts-write-task1').addEventListener('click', () => this.startIeltsWriting('task1'));
        document.getElementById('ielts-write-task2').addEventListener('click', () => this.startIeltsWriting('task2'));
        document.getElementById('ielts-write-back').addEventListener('click', () => this.renderHomeDashboard());
    },

    startIeltsWriting(taskType) {
        this.state.mode = 'ielts';
        const promptObj = pickRandom(IELTS_WRITING_PROMPTS[taskType]);
        this.ui.container.innerHTML = `
            ${this.renderIeltsExitButton()}
            <div style="text-align:center; margin-bottom:10px;">⏱️ <span id="ielts-timer" style="font-weight:800;"></span></div>
            <div class="reading-passage">${this.escapeHtml(promptObj.prompt)}</div>
            <textarea id="ielts-essay-input" class="input-field" style="width:100%; min-height:220px; padding:15px; font-family:inherit; font-size:16px; box-sizing:border-box;" placeholder="Viết bài của bạn ở đây..."></textarea>
            <p style="text-align:center; color:#777;">Số từ: <span id="ielts-word-count">0</span> / tối thiểu ${promptObj.minWords}</p>
            <button class="btn-primary" id="ielts-write-submit" style="display: block; margin: 20px auto; padding: 15px 30px;">NỘP BÀI</button>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        this.bindIeltsExitButton();
        const input = document.getElementById('ielts-essay-input');
        input.addEventListener('input', () => {
            const words = input.value.trim().split(/\s+/).filter(Boolean).length;
            document.getElementById('ielts-word-count').innerText = words;
        });
        document.getElementById('ielts-write-submit').addEventListener('click', () => this.submitIeltsWriting(taskType, promptObj, input.value));
        this.startIeltsTimer(promptObj.minutes, () => this.submitIeltsWriting(taskType, promptObj, input.value));
    },

    async submitIeltsWriting(taskType, promptObj, essayText) {
        this.stopIeltsTimer();
        if (!essayText || !essayText.trim()) {
            alert('Bạn chưa viết gì để nộp bài.');
            this.startIeltsTimer(promptObj.minutes, () => this.submitIeltsWriting(taskType, promptObj, essayText));
            return;
        }
        this.renderIeltsGradeWaiting('Đang chấm bài Writing...');
        const result = await this.callIeltsGradeFunction({ skill: 'writing', taskType, prompt: promptObj.prompt, userText: essayText });
        this.renderIeltsGradeResult('Writing', result);
    },

    // ---------- Speaking ----------

    renderIeltsSpeakingMenu() {
        this.ui.container.innerHTML = `
            <div class="welcome-screen">
                <div class="duo-character">🗣️</div>
                <h1 style="text-align: center;">IELTS Speaking</h1>
                <p style="text-align: center; color: #777;">Gồm 3 phần: giới thiệu bản thân, trình bày cue card, và thảo luận sâu. Trả lời bằng cách ghi âm cho từng phần.</p>
                <button class="btn-primary" id="ielts-speak-start" style="display: block; margin: 15px auto; padding: 15px 30px;">BẮT ĐẦU</button>
                <button class="btn-secondary" id="ielts-speak-back" style="display: block; margin: 15px auto; padding: 15px 30px;">QUAY LẠI</button>
            </div>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        document.getElementById('ielts-speak-start').addEventListener('click', () => this.startIeltsSpeaking());
        document.getElementById('ielts-speak-back').addEventListener('click', () => this.renderHomeDashboard());
    },

    startIeltsSpeaking() {
        this.state.mode = 'ielts';
        const promptSet = pickRandom(IELTS_SPEAKING_PROMPTS);
        this.state.ieltsSpeaking = { promptSet, part: 1, transcripts: { part1: '', part2: '', part3: '' } };
        this.renderIeltsSpeakingPart();
    },

    renderIeltsSpeakingPart() {
        const st = this.state.ieltsSpeaking;
        const partNum = st.part;
        let questionsHtml = '';
        if (partNum === 1) {
            questionsHtml = `<ul>${st.promptSet.part1.map(q => `<li>${this.escapeHtml(q)}</li>`).join('')}</ul>`;
        } else if (partNum === 2) {
            const cue = st.promptSet.part2;
            questionsHtml = `<p style="font-weight:700;">${this.escapeHtml(cue.cueCard)}</p><ul>${cue.points.map(p => `<li>${this.escapeHtml(p)}</li>`).join('')}</ul>`;
        } else {
            questionsHtml = `<ul>${st.promptSet.part3.map(q => `<li>${this.escapeHtml(q)}</li>`).join('')}</ul>`;
        }
        this.ui.container.innerHTML = `
            ${this.renderIeltsExitButton()}
            <h2 style="text-align:center;">Part ${partNum} / 3</h2>
            <div class="reading-passage">${questionsHtml}</div>
            <div class="pronunciation-controls">
                <button class="btn-listen" id="mic-btn"><span style="font-size: 32px;">🎤</span><br>Nhấn để nói</button>
            </div>
            <div id="pronunciation-result" class="pronunciation-result"></div>
            <button class="btn-primary" id="ielts-speak-next" style="display: block; margin: 20px auto; padding: 15px 30px;" disabled>${partNum < 3 ? 'PHẦN TIẾP THEO' : 'NỘP BÀI'}</button>
        `;
        this.ui.checkBtn.disabled = true;
        this.ui.checkBtn.classList.remove('active');
        this.bindIeltsExitButton();
        const nextBtn = document.getElementById('ielts-speak-next');
        document.getElementById('mic-btn').addEventListener('click', () => {
            this.startRecording();
            const checkInterval = setInterval(() => {
                if (this.state.recognizedSpeech) {
                    const key = `part${partNum}`;
                    this.state.ieltsSpeaking.transcripts[key] = this.state.recognizedSpeech;
                    nextBtn.disabled = false;
                    clearInterval(checkInterval);
                }
            }, 300);
        });
        nextBtn.addEventListener('click', () => {
            if (partNum < 3) {
                this.state.ieltsSpeaking.part++;
                this.state.recognizedSpeech = null;
                this.renderIeltsSpeakingPart();
            } else {
                this.submitIeltsSpeaking();
            }
        });
    },

    async submitIeltsSpeaking() {
        const st = this.state.ieltsSpeaking;
        const fullTranscript = `Part 1: ${st.transcripts.part1}\nPart 2 (${st.promptSet.part2.cueCard}): ${st.transcripts.part2}\nPart 3: ${st.transcripts.part3}`;
        this.renderIeltsGradeWaiting('Đang chấm bài Speaking...');
        const result = await this.callIeltsGradeFunction({ skill: 'speaking', taskType: 'full_interview', prompt: st.promptSet.part2.cueCard, userText: fullTranscript });
        this.renderIeltsGradeResult('Speaking', result);
    }
});
