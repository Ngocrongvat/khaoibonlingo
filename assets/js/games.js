const Games = (() => {
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function pickPairs(n) {
        const pool = [...VOCAB_BANK.nouns, ...VOCAB_BANK.verbs, ...VOCAB_BANK.adjectives];
        return shuffle(pool).slice(0, n).map((w, i) => ({ id: i, en: w.en, vi: w.vi }));
    }

    function pickRandomOne(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    // Some early vocab-bank batches used working-title topic names (e.g. "Padding Batch
    // Final") as placeholders that were never renamed - harmless for word lookups, but
    // would look broken if ever shown to the user as a category label.
    const PLACEHOLDER_TOPIC_RE = /padding|batch|final|truly|absolute|extra|misc|filler/i;

    function groupNounsByTopic() {
        const grouped = {};
        VOCAB_BANK.nouns.forEach(n => {
            if (!n.topic || PLACEHOLDER_TOPIC_RE.test(n.topic)) return;
            if (!grouped[n.topic]) grouped[n.topic] = [];
            grouped[n.topic].push(n);
        });
        return grouped;
    }

    // ============================= Word Match Game =============================

    function renderWordMatchGame(container, callbacks) {
        const onRoundEnd = (callbacks && callbacks.onRoundEnd) || function () {};
        const onExit = (callbacks && callbacks.onExit) || function () {};

        let pairs, leftItems, rightItems, timeLeft, matchedCount, selectedLeft, timerHandle, finished;

        function startRound() {
            pairs = pickPairs(6);
            leftItems = shuffle(pairs.map(p => ({ id: p.id, text: p.en })));
            rightItems = shuffle(pairs.map(p => ({ id: p.id, text: p.vi })));
            timeLeft = 45;
            matchedCount = 0;
            selectedLeft = null;
            finished = false;
            render();
            clearInterval(timerHandle);
            timerHandle = setInterval(() => {
                timeLeft--;
                const timerEl = document.getElementById('wm-timer');
                if (timerEl) timerEl.textContent = timeLeft;
                if (timeLeft <= 0) {
                    finished = true;
                    clearInterval(timerHandle);
                    showResult(false);
                }
            }, 1000);
        }

        function render() {
            container.innerHTML = `
                <div class="game-screen">
                    <h2 style="text-align: center;">⚡ Ghép Từ Nhanh</h2>
                    <div class="game-stats">
                        <span>⏱️ <span id="wm-timer">${timeLeft}</span>s</span>
                        <span>✅ <span id="wm-score">${matchedCount}</span> / ${pairs.length}</span>
                    </div>
                    <div class="match-game-area" id="wm-area">
                        <svg class="match-lines-svg" id="wm-svg"></svg>
                        <div class="match-game-grid">
                            <div class="match-column" id="wm-left"></div>
                            <div class="match-column" id="wm-right"></div>
                        </div>
                    </div>
                    <button class="btn-secondary" style="margin-top: 20px;" id="wm-close">QUAY LẠI</button>
                </div>
            `;
            const leftCol = document.getElementById('wm-left');
            const rightCol = document.getElementById('wm-right');
            leftItems.forEach(item => {
                const el = document.createElement('div');
                el.className = 'match-card';
                el.dataset.id = item.id;
                el.textContent = item.text;
                el.addEventListener('click', () => onLeftClick(item, el));
                leftCol.appendChild(el);
            });
            rightItems.forEach(item => {
                const el = document.createElement('div');
                el.className = 'match-card';
                el.dataset.id = item.id;
                el.textContent = item.text;
                el.addEventListener('click', () => onRightClick(item, el));
                rightCol.appendChild(el);
            });
            document.getElementById('wm-close').addEventListener('click', () => {
                clearInterval(timerHandle);
                onExit();
            });
        }

        function drawConnection(leftEl, rightEl) {
            const svg = document.getElementById('wm-svg');
            const area = document.getElementById('wm-area');
            if (!svg || !area) return;
            const areaRect = area.getBoundingClientRect();
            svg.setAttribute('viewBox', `0 0 ${areaRect.width} ${areaRect.height}`);

            const leftRect = leftEl.getBoundingClientRect();
            const rightRect = rightEl.getBoundingClientRect();
            const x1 = leftRect.right - areaRect.left;
            const y1 = leftRect.top + leftRect.height / 2 - areaRect.top;
            const x2 = rightRect.left - areaRect.left;
            const y2 = rightRect.top + rightRect.height / 2 - areaRect.top;

            const midX = (x1 + x2) / 2;
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
            path.setAttribute('class', 'match-line');
            svg.appendChild(path);
        }

        function onLeftClick(item, el) {
            if (finished || item.matched) return;
            document.querySelectorAll('#wm-left .match-card').forEach(c => c.classList.remove('selected'));
            selectedLeft = { item, el };
            el.classList.add('selected');
        }

        function onRightClick(item, el) {
            if (finished || item.matched || !selectedLeft) return;
            if (selectedLeft.item.id === item.id) {
                selectedLeft.item.matched = true;
                item.matched = true;
                selectedLeft.el.classList.add('matched');
                el.classList.add('matched');
                drawConnection(selectedLeft.el, el);
                matchedCount++;
                document.getElementById('wm-score').textContent = matchedCount;
                selectedLeft = null;
                if (matchedCount === pairs.length) {
                    finished = true;
                    clearInterval(timerHandle);
                    setTimeout(() => showResult(true), 350);
                }
            } else {
                el.classList.add('wrong');
                selectedLeft.el.classList.add('wrong');
                setTimeout(() => {
                    el.classList.remove('wrong');
                    if (selectedLeft) selectedLeft.el.classList.remove('wrong');
                }, 400);
            }
        }

        function showResult(won) {
            onRoundEnd(matchedCount, pairs.length);
            container.innerHTML = `
                <div class="game-screen">
                    <div class="duo-character">${won ? '🏆' : '⏰'}</div>
                    <h2 style="text-align: center;">${won ? 'Xuất sắc!' : 'Hết giờ!'}</h2>
                    <p style="text-align: center; color: #777;">Bạn đã ghép đúng ${matchedCount}/${pairs.length} cặp từ${won ? ` với ${timeLeft} giây còn lại` : ''}.</p>
                    <p style="text-align: center; font-weight: 700; color: var(--duo-text);">Bạn có muốn chơi tiếp không?</p>
                    <div style="display: flex; gap: 15px; justify-content: center; margin-top: 15px;">
                        <button class="btn-primary" id="wm-again">CHƠI TIẾP</button>
                        <button class="btn-secondary" id="wm-exit">QUAY LẠI</button>
                    </div>
                </div>
            `;
            document.getElementById('wm-again').addEventListener('click', () => startRound());
            document.getElementById('wm-exit').addEventListener('click', () => onExit());
        }

        startRound();
    }

    // ============================= Memory Flip Game =============================

    const MEMORY_CARD_BACK_ICON = '🦉';

    function getMemoryLevelConfig(level) {
        const pairs = Math.min(4 + (level - 1), 8);
        const maxMistakes = Math.max(8 - (level - 1), 3);
        return { pairs, maxMistakes };
    }

    function loadMemoryLevel(userId) {
        const raw = localStorage.getItem(`duo_memory_level_${userId}`);
        const level = raw ? parseInt(raw, 10) : 1;
        return Number.isFinite(level) && level > 0 ? level : 1;
    }

    function saveMemoryLevel(userId, level) {
        localStorage.setItem(`duo_memory_level_${userId}`, String(level));
    }

    function renderMemoryGame(container, callbacks, userId) {
        const onRoundEnd = (callbacks && callbacks.onRoundEnd) || function () {};
        const onExit = (callbacks && callbacks.onExit) || function () {};
        const uid = userId || 'guest';

        let level = loadMemoryLevel(uid);
        let cards, flippedIndices, moves, mistakes, matchedPairs, locked, config;

        function startLevel() {
            config = getMemoryLevelConfig(level);
            const pairs = pickPairs(config.pairs);
            cards = [];
            pairs.forEach(p => {
                cards.push({ pairId: p.id, text: p.en, flipped: false, matched: false });
                cards.push({ pairId: p.id, text: p.vi, flipped: false, matched: false });
            });
            cards = shuffle(cards);

            flippedIndices = [];
            moves = 0;
            mistakes = 0;
            matchedPairs = 0;
            locked = false;
            renderGrid();
        }

        function renderGrid() {
            container.innerHTML = `
                <div class="game-screen">
                    <h2 style="text-align: center;">🧠 Lật Thẻ Nhớ Từ</h2>
                    <div class="game-stats">
                        <span>🏅 Cấp ${level}</span>
                        <span>🔄 <span id="mem-moves">${moves}</span> lượt</span>
                        <span>💔 <span id="mem-mistakes">${mistakes}</span>/${config.maxMistakes}</span>
                        <span>✅ <span id="mem-score">${matchedPairs}</span>/${config.pairs}</span>
                    </div>
                    <div class="memory-grid" id="mem-grid"></div>
                    <button class="btn-secondary" style="margin-top: 20px;" id="mem-close">QUAY LẠI</button>
                </div>
            `;
            const grid = document.getElementById('mem-grid');
            cards.forEach((card, idx) => {
                const el = document.createElement('div');
                el.className = 'memory-card';
                el.dataset.idx = idx;
                el.innerHTML = `
                    <div class="memory-card-inner">
                        <div class="memory-card-face memory-card-back">${MEMORY_CARD_BACK_ICON}</div>
                        <div class="memory-card-face memory-card-front">${escapeHtml(card.text)}</div>
                    </div>
                `;
                el.addEventListener('click', () => onCardClick(idx));
                grid.appendChild(el);
            });
            document.getElementById('mem-close').addEventListener('click', () => onExit());
            syncCardVisuals();
        }

        function syncCardVisuals() {
            cards.forEach((card, idx) => {
                const el = container.querySelector(`.memory-card[data-idx="${idx}"]`);
                if (!el) return;
                el.classList.toggle('flipped', card.flipped);
                el.classList.toggle('matched', card.matched);
            });
        }

        function onCardClick(idx) {
            if (locked) return;
            const card = cards[idx];
            if (card.flipped || card.matched) return;
            card.flipped = true;
            flippedIndices.push(idx);
            syncCardVisuals();

            if (flippedIndices.length === 2) {
                moves++;
                const moveEl = document.getElementById('mem-moves');
                if (moveEl) moveEl.textContent = moves;
                locked = true;
                const [i1, i2] = flippedIndices;

                if (cards[i1].pairId === cards[i2].pairId) {
                    setTimeout(() => {
                        cards[i1].matched = true;
                        cards[i2].matched = true;
                        matchedPairs++;
                        flippedIndices = [];
                        locked = false;
                        syncCardVisuals();
                        const scoreEl = document.getElementById('mem-score');
                        if (scoreEl) scoreEl.textContent = matchedPairs;
                        if (matchedPairs === config.pairs) {
                            setTimeout(() => showLevelResult(true), 400);
                        }
                    }, 500);
                } else {
                    mistakes++;
                    const mistakeEl = document.getElementById('mem-mistakes');
                    if (mistakeEl) mistakeEl.textContent = mistakes;
                    setTimeout(() => {
                        cards[i1].flipped = false;
                        cards[i2].flipped = false;
                        flippedIndices = [];
                        locked = false;
                        syncCardVisuals();
                        if (mistakes >= config.maxMistakes) {
                            setTimeout(() => showLevelResult(false), 300);
                        }
                    }, 900);
                }
            }
        }

        function showLevelResult(won) {
            onRoundEnd(matchedPairs, config.pairs);
            if (won) {
                level++;
                saveMemoryLevel(uid, level);
            }
            container.innerHTML = `
                <div class="game-screen">
                    <div class="duo-character">${won ? '🎉' : '💔'}</div>
                    <h2 style="text-align: center;">${won ? `Hoàn thành Cấp ${level - 1}!` : 'Hết lượt lật sai rồi!'}</h2>
                    <p style="text-align: center; color: #777;">
                        ${won
                            ? `Bạn đã ghép hết ${config.pairs} cặp từ trong ${moves} lượt lật.`
                            : `Bạn đã sai ${mistakes} lần ở Cấp ${level}. Ghép được ${matchedPairs}/${config.pairs} cặp.`}
                    </p>
                    ${won ? `<p style="text-align: center; font-weight: 700; color: var(--duo-green);">🏅 Lên Cấp ${level}!</p>` : ''}
                    <div style="display: flex; gap: 15px; justify-content: center; margin-top: 15px;">
                        <button class="btn-primary" id="mem-again">${won ? 'CẤP TIẾP THEO' : 'THỬ LẠI CẤP NÀY'}</button>
                        <button class="btn-secondary" id="mem-exit">QUAY LẠI</button>
                    </div>
                </div>
            `;
            document.getElementById('mem-again').addEventListener('click', () => startLevel());
            document.getElementById('mem-exit').addEventListener('click', () => onExit());
        }

        startLevel();
    }

    // ============================= Odd One Out Game =============================
    // Brain-training pattern recognition: 3 of the 4 cards share a real vocab topic
    // (e.g. "Fruits & Vegetables"), one doesn't - find the one that doesn't belong.

    const ODD_ONE_OUT_ROUNDS = 8;

    function buildOddOneOutRound(groupedByTopic, topics) {
        const mainTopic = pickRandomOne(topics);
        const oddTopic = pickRandomOne(topics.filter(t => t !== mainTopic));
        const threeFromMain = shuffle(groupedByTopic[mainTopic]).slice(0, 3);
        const oddOne = pickRandomOne(groupedByTopic[oddTopic]);
        const cards = shuffle([
            ...threeFromMain.map(n => ({ en: n.en, vi: n.vi, isOdd: false })),
            { en: oddOne.en, vi: oddOne.vi, isOdd: true }
        ]);
        return { cards, mainTopic };
    }

    function renderOddOneOutGame(container, callbacks) {
        const onRoundEnd = (callbacks && callbacks.onRoundEnd) || function () {};
        const onExit = (callbacks && callbacks.onExit) || function () {};

        const groupedByTopic = groupNounsByTopic();
        const topics = Object.keys(groupedByTopic).filter(t => groupedByTopic[t].length >= 4);

        let round, correctCount, current, locked;

        function startGame() {
            round = 0;
            correctCount = 0;
            nextRound();
        }

        function nextRound() {
            if (round >= ODD_ONE_OUT_ROUNDS || topics.length < 2) {
                showResult();
                return;
            }
            round++;
            locked = false;
            current = buildOddOneOutRound(groupedByTopic, topics);
            render();
        }

        function render() {
            container.innerHTML = `
                <div class="game-screen odd-one-out-screen">
                    <h2 style="text-align: center;">🔎 Từ Lạc Loài</h2>
                    <p style="text-align: center; color: #777;">3 từ cùng một chủ đề, 1 từ không cùng nhóm - hãy tìm nó!</p>
                    <div class="game-stats">
                        <span>🎯 Vòng <span id="ooo-round">${round}</span>/${ODD_ONE_OUT_ROUNDS}</span>
                        <span>✅ <span id="ooo-score">${correctCount}</span></span>
                    </div>
                    <div class="odd-one-out-grid" id="ooo-grid"></div>
                    <button class="btn-secondary" style="margin-top: 20px;" id="ooo-close">QUAY LẠI</button>
                </div>
            `;
            const grid = document.getElementById('ooo-grid');
            current.cards.forEach((card, idx) => {
                const el = document.createElement('div');
                el.className = 'odd-one-out-card';
                el.dataset.idx = idx;
                el.innerHTML = `<div class="ooo-en">${escapeHtml(card.en)}</div><div class="ooo-vi">${escapeHtml(card.vi)}</div>`;
                el.addEventListener('click', () => onCardClick(idx, el));
                grid.appendChild(el);
            });
            document.getElementById('ooo-close').addEventListener('click', () => onExit());
        }

        function onCardClick(idx, el) {
            if (locked) return;
            locked = true;
            const card = current.cards[idx];
            const allCards = container.querySelectorAll('.odd-one-out-card');
            if (card.isOdd) {
                correctCount++;
                el.classList.add('ooo-correct');
                document.getElementById('ooo-score').textContent = correctCount;
            } else {
                el.classList.add('ooo-wrong');
                allCards[current.cards.findIndex(c => c.isOdd)].classList.add('ooo-reveal');
            }
            setTimeout(nextRound, 850);
        }

        function showResult() {
            onRoundEnd(correctCount, ODD_ONE_OUT_ROUNDS);
            const won = correctCount >= ODD_ONE_OUT_ROUNDS * 0.5;
            container.innerHTML = `
                <div class="game-screen">
                    <div class="duo-character">${won ? '🧩' : '🤔'}</div>
                    <h2 style="text-align: center;">${won ? 'Bộ não tinh nhạy!' : 'Luyện thêm chút nữa nhé!'}</h2>
                    <p style="text-align: center; color: #777;">Bạn tìm đúng ${correctCount}/${ODD_ONE_OUT_ROUNDS} vòng.</p>
                    <div style="display: flex; gap: 15px; justify-content: center; margin-top: 15px;">
                        <button class="btn-primary" id="ooo-again">CHƠI TIẾP</button>
                        <button class="btn-secondary" id="ooo-exit">QUAY LẠI</button>
                    </div>
                </div>
            `;
            document.getElementById('ooo-again').addEventListener('click', () => startGame());
            document.getElementById('ooo-exit').addEventListener('click', () => onExit());
        }

        startGame();
    }

    // ============================= Vocabulary Reflex Game =============================
    // Brain-training reaction speed: an English word + a proposed Vietnamese meaning
    // flash up (correct about half the time) - tap ĐÚNG/SAI before the beat runs out.
    // Builds a combo streak for correct answers in a row, reset by any miss or timeout.

    const REFLEX_ROUNDS = 12;
    const REFLEX_SECONDS_PER_CARD = 3;

    function buildReflexCard(pool) {
        const word = pickRandomOne(pool);
        const showCorrect = Math.random() < 0.5;
        let shownVi = word.vi;
        if (!showCorrect) {
            const decoy = pickRandomOne(pool.filter(w => w.vi !== word.vi));
            shownVi = decoy ? decoy.vi : word.vi;
        }
        return { en: word.en, vi: shownVi, isCorrect: shownVi === word.vi };
    }

    function renderReflexGame(container, callbacks) {
        const onRoundEnd = (callbacks && callbacks.onRoundEnd) || function () {};
        const onExit = (callbacks && callbacks.onExit) || function () {};
        const pool = [...VOCAB_BANK.nouns, ...VOCAB_BANK.verbs, ...VOCAB_BANK.adjectives];

        let round, correctCount, combo, bestCombo, current, locked, timeLeft, timerHandle;

        function startGame() {
            round = 0;
            correctCount = 0;
            combo = 0;
            bestCombo = 0;
            nextRound();
        }

        function nextRound() {
            clearInterval(timerHandle);
            if (round >= REFLEX_ROUNDS) {
                showResult();
                return;
            }
            round++;
            locked = false;
            current = buildReflexCard(pool);
            timeLeft = REFLEX_SECONDS_PER_CARD;
            render();
            timerHandle = setInterval(() => {
                timeLeft -= 0.1;
                const bar = document.getElementById('reflex-timebar');
                if (bar) bar.style.width = `${Math.max(0, (timeLeft / REFLEX_SECONDS_PER_CARD) * 100)}%`;
                if (timeLeft <= 0) {
                    clearInterval(timerHandle);
                    answer(null);
                }
            }, 100);
        }

        function render() {
            container.innerHTML = `
                <div class="game-screen reflex-screen">
                    <h2 style="text-align: center;">⚡ Phản Xạ Từ Vựng</h2>
                    <div class="game-stats">
                        <span>🎯 <span id="reflex-round">${round}</span>/${REFLEX_ROUNDS}</span>
                        <span>✅ <span id="reflex-score">${correctCount}</span></span>
                        <span>🔥 Combo <span id="reflex-combo">${combo}</span></span>
                    </div>
                    <div class="reflex-timebar-track"><div class="reflex-timebar" id="reflex-timebar"></div></div>
                    <div class="reflex-card" id="reflex-card">
                        <div class="reflex-en">${escapeHtml(current.en)}</div>
                        <div class="reflex-vi">${escapeHtml(current.vi)}</div>
                    </div>
                    <div class="reflex-actions">
                        <button class="btn-secondary reflex-btn reflex-btn-no" id="reflex-sai">✗ SAI</button>
                        <button class="btn-primary reflex-btn reflex-btn-yes" id="reflex-dung">✓ ĐÚNG</button>
                    </div>
                    <button class="btn-secondary" style="margin-top: 16px;" id="reflex-close">QUAY LẠI</button>
                </div>
            `;
            document.getElementById('reflex-dung').addEventListener('click', () => answer(true));
            document.getElementById('reflex-sai').addEventListener('click', () => answer(false));
            document.getElementById('reflex-close').addEventListener('click', () => { clearInterval(timerHandle); onExit(); });
        }

        function answer(userSaysCorrect) {
            if (locked) return;
            locked = true;
            clearInterval(timerHandle);
            const cardEl = document.getElementById('reflex-card');
            const gotItRight = userSaysCorrect !== null && userSaysCorrect === current.isCorrect;
            if (gotItRight) {
                correctCount++;
                combo++;
                bestCombo = Math.max(bestCombo, combo);
                if (cardEl) cardEl.classList.add('reflex-correct-flash');
            } else {
                combo = 0;
                if (cardEl) cardEl.classList.add('reflex-wrong-flash');
            }
            const scoreEl = document.getElementById('reflex-score');
            const comboEl = document.getElementById('reflex-combo');
            if (scoreEl) scoreEl.textContent = correctCount;
            if (comboEl) comboEl.textContent = combo;
            setTimeout(nextRound, 500);
        }

        function showResult() {
            onRoundEnd(correctCount, REFLEX_ROUNDS);
            const won = correctCount >= REFLEX_ROUNDS * 0.5;
            container.innerHTML = `
                <div class="game-screen">
                    <div class="duo-character">${won ? '⚡' : '🐢'}</div>
                    <h2 style="text-align: center;">${won ? 'Phản xạ cực nhanh!' : 'Cố lên, nhanh tay hơn nhé!'}</h2>
                    <p style="text-align: center; color: #777;">Bạn trả lời đúng ${correctCount}/${REFLEX_ROUNDS} câu, combo cao nhất: ${bestCombo}.</p>
                    <div style="display: flex; gap: 15px; justify-content: center; margin-top: 15px;">
                        <button class="btn-primary" id="reflex-again">CHƠI TIẾP</button>
                        <button class="btn-secondary" id="reflex-exit">QUAY LẠI</button>
                    </div>
                </div>
            `;
            document.getElementById('reflex-again').addEventListener('click', () => startGame());
            document.getElementById('reflex-exit').addEventListener('click', () => onExit());
        }

        startGame();
    }

    return { renderWordMatchGame, renderMemoryGame, renderOddOneOutGame, renderReflexGame };
})();

window.Games = Games;
