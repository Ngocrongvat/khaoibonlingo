const Games = (() => {
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    // Beginner-friendly difficulty gating (Phase 3): a maxDiff of 1 or 2 keeps only the
    // easier vocab (each word carries a .difficulty 1-3), so young/new players face words
    // like Rice/Bread/Egg instead of advanced ones. maxDiff 3 (or unset) = the full pool,
    // preserving the original behaviour for higher ranks and for duels. Falls back to the
    // full list whenever filtering would leave too few words to build a round.
    function filterDiff(words, maxDiff) {
        if (!maxDiff || maxDiff >= 3) return words;
        const easy = words.filter(w => (w.difficulty || 1) <= maxDiff);
        return easy.length >= 12 ? easy : words;
    }

    function pickPairs(n, maxDiff) {
        const pool = filterDiff([...VOCAB_BANK.nouns, ...VOCAB_BANK.verbs, ...VOCAB_BANK.adjectives], maxDiff);
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

    // Mini-game win/lose sounds now use the same shared sound-effect FILES as the
    // rest of the app (assets/sounds/, via MascotVoice). The old duplicated
    // oscillator synth was removed along with app.js's.
    function playTone(type) {
        if (window.MascotVoice) window.MascotVoice.play(type);
    }

    // Some early vocab-bank batches used working-title topic names (e.g. "Padding Batch
    // Final") as placeholders that were never renamed - harmless for word lookups, but
    // would look broken if ever shown to the user as a category label.
    const PLACEHOLDER_TOPIC_RE = /padding|batch|final|truly|absolute|extra|misc|filler/i;

    function groupNounsByTopic(maxDiff) {
        const build = (list) => {
            const grouped = {};
            list.forEach(n => {
                if (!n.topic || PLACEHOLDER_TOPIC_RE.test(n.topic)) return;
                if (!grouped[n.topic]) grouped[n.topic] = [];
                grouped[n.topic].push(n);
            });
            return grouped;
        };
        if (maxDiff && maxDiff < 3) {
            const easy = build(VOCAB_BANK.nouns.filter(n => (n.difficulty || 1) <= maxDiff));
            // Only use the easy set if it still has enough topics to build a round with.
            if (Object.values(easy).filter(a => a.length >= 4).length >= 3) return easy;
        }
        return build(VOCAB_BANK.nouns);
    }

    // ============================= Word Match Game =============================

    // Pre-generates one round's worth of pairs, for duel mode - both players are handed
    // this exact same array (via the shared `duels.questions` jsonb) instead of each
    // calling pickPairs() themselves and getting different words.
    function generateWordMatchRounds() {
        return pickPairs(6);
    }

    function renderWordMatchGame(container, callbacks, duelRounds) {
        const onRoundEnd = (callbacks && callbacks.onRoundEnd) || function () {};
        const onProgress = (callbacks && callbacks.onProgress) || function () {};
        const onExit = (callbacks && callbacks.onExit) || function () {};

        const maxDiff = (callbacks && callbacks.difficulty) || 3;

        let pairs, leftItems, rightItems, timeLeft, matchedCount, selectedLeft, timerHandle, finished;

        function startRound() {
            pairs = duelRounds || pickPairs(6, maxDiff);
            leftItems = shuffle(pairs.map(p => ({ id: p.id, text: p.en })));
            rightItems = shuffle(pairs.map(p => ({ id: p.id, text: p.vi })));
            // Beginners (difficulty 1) get a much more generous clock so the timer stops
            // being a stress factor.
            timeLeft = maxDiff === 1 ? 75 : 45;
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
                playTone('correct');
                selectedLeft.item.matched = true;
                item.matched = true;
                selectedLeft.el.classList.add('matched');
                el.classList.add('matched');
                drawConnection(selectedLeft.el, el);
                matchedCount++;
                document.getElementById('wm-score').textContent = matchedCount;
                selectedLeft = null;
                onProgress(matchedCount, pairs.length);
                if (matchedCount === pairs.length) {
                    finished = true;
                    clearInterval(timerHandle);
                    setTimeout(() => showResult(true), 350);
                }
            } else {
                playTone('wrong');
                el.classList.add('wrong');
                selectedLeft.el.classList.add('wrong');
                setTimeout(() => {
                    el.classList.remove('wrong');
                    if (selectedLeft) selectedLeft.el.classList.remove('wrong');
                }, 400);
            }
        }

        function showResult(won) {
            playTone(won ? 'cheer' : 'cry');
            onRoundEnd(matchedCount, pairs.length);
            container.innerHTML = `
                <div class="game-screen">
                    <div class="duo-character">${won ? '🏆' : '⏰'}</div>
                    <h2 style="text-align: center;">${won ? 'Xuất sắc!' : 'Hết giờ!'}</h2>
                    <p style="text-align: center; color: #777;">Bạn đã ghép đúng ${matchedCount}/${pairs.length} cặp từ${won ? ` với ${timeLeft} giây còn lại` : ''}.</p>
                    ${duelRounds ? '' : '<p style="text-align: center; font-weight: 700; color: var(--duo-text);">Bạn có muốn chơi tiếp không?</p>'}
                    <div style="display: flex; gap: 15px; justify-content: center; margin-top: 15px;">
                        ${duelRounds ? '' : '<button class="btn-primary" id="wm-again">CHƠI TIẾP</button>'}
                        <button class="btn-secondary" id="wm-exit">${duelRounds ? 'TIẾP TỤC' : 'QUAY LẠI'}</button>
                    </div>
                </div>
            `;
            if (!duelRounds) document.getElementById('wm-again').addEventListener('click', () => startRound());
            document.getElementById('wm-exit').addEventListener('click', () => onExit());
        }

        startRound();
    }

    // ============================= Memory Flip Game =============================

    const MEMORY_CARD_BACK_ICON = '🦉';

    function getMemoryLevelConfig(level) {
        // Pairs now grow across 9 levels (4 -> 12) instead of capping at level 5/8 pairs -
        // more difficulty tiers with genuinely bigger boards, not just the same 8-pair
        // board repeated forever past level 5.
        const pairs = Math.min(4 + (level - 1), 12);
        // Mistakes allowed now INCREASES with level (reversed from before) - a bigger
        // board with more pairs to keep track of deserves more room for slip-ups, not
        // less. Even after pairs cap out at 12 (level 9+), the allowance keeps growing
        // so later levels don't hit a hard difficulty wall.
        const maxMistakes = 6 + (level - 1) * 2;
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

    // Pre-generates one level's worth of cards (already shuffled into their final grid
    // order) for duel mode - both players get the exact same layout, not just the same
    // word pool, since the shuffle order IS part of a memory game's difficulty.
    function generateMemoryRounds(level) {
        const config = getMemoryLevelConfig(level);
        const pairs = pickPairs(config.pairs);
        let cards = [];
        pairs.forEach(p => {
            cards.push({ pairId: p.id, text: p.en, flipped: false, matched: false });
            cards.push({ pairId: p.id, text: p.vi, flipped: false, matched: false });
        });
        cards = shuffle(cards);
        return { level, config, cards };
    }

    function renderMemoryGame(container, callbacks, userId, duelData) {
        const onRoundEnd = (callbacks && callbacks.onRoundEnd) || function () {};
        const onProgress = (callbacks && callbacks.onProgress) || function () {};
        const onExit = (callbacks && callbacks.onExit) || function () {};
        const uid = userId || 'guest';
        const maxDiff = (callbacks && callbacks.difficulty) || 3;

        let level = duelData ? duelData.level : loadMemoryLevel(uid);
        let cards, flippedIndices, moves, mistakes, matchedPairs, locked, config;

        function startLevel() {
            if (duelData) {
                config = duelData.config;
                // Clone each card object rather than reusing duelData.cards directly -
                // this mutates flipped/matched flags in place, and duelData is a plain
                // object handed in from app.js that shouldn't be mutated by reference.
                cards = duelData.cards.map(c => ({ ...c }));
            } else {
                config = getMemoryLevelConfig(level);
                const pairs = pickPairs(config.pairs, maxDiff);
                cards = [];
                pairs.forEach(p => {
                    cards.push({ pairId: p.id, text: p.en, flipped: false, matched: false });
                    cards.push({ pairId: p.id, text: p.vi, flipped: false, matched: false });
                });
                cards = shuffle(cards);
            }

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
            playTone('flip');
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
                    playTone('correct');
                    setTimeout(() => {
                        cards[i1].matched = true;
                        cards[i2].matched = true;
                        matchedPairs++;
                        flippedIndices = [];
                        locked = false;
                        syncCardVisuals();
                        const scoreEl = document.getElementById('mem-score');
                        if (scoreEl) scoreEl.textContent = matchedPairs;
                        onProgress(matchedPairs, config.pairs);
                        if (matchedPairs === config.pairs) {
                            setTimeout(() => showLevelResult(true), 400);
                        }
                    }, 500);
                } else {
                    playTone('wrong');
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
            playTone(won ? 'cheer' : 'cry');
            onRoundEnd(matchedPairs, config.pairs);
            // Solo-mode-only progression - a duel's level is fixed by whoever sent the
            // challenge, not tied to either player's own localStorage level.
            if (won && !duelData) {
                level++;
                saveMemoryLevel(uid, level);
            }
            container.innerHTML = `
                <div class="game-screen">
                    <div class="duo-character">${won ? '🎉' : '💔'}</div>
                    <h2 style="text-align: center;">${won ? (duelData ? 'Hoàn thành!' : `Hoàn thành Cấp ${level - 1}!`) : 'Hết lượt lật sai rồi!'}</h2>
                    <p style="text-align: center; color: #777;">
                        ${won
                            ? `Bạn đã ghép hết ${config.pairs} cặp từ trong ${moves} lượt lật.`
                            : `Bạn đã sai ${mistakes} lần. Ghép được ${matchedPairs}/${config.pairs} cặp.`}
                    </p>
                    ${(won && !duelData) ? `<p style="text-align: center; font-weight: 700; color: var(--duo-green);">🏅 Lên Cấp ${level}!</p>` : ''}
                    <div style="display: flex; gap: 15px; justify-content: center; margin-top: 15px;">
                        ${duelData ? '' : `<button class="btn-primary" id="mem-again">${won ? 'CẤP TIẾP THEO' : 'THỬ LẠI CẤP NÀY'}</button>`}
                        <button class="btn-secondary" id="mem-exit">${duelData ? 'TIẾP TỤC' : 'QUAY LẠI'}</button>
                    </div>
                </div>
            `;
            if (!duelData) document.getElementById('mem-again').addEventListener('click', () => startLevel());
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

    // Pre-generates the full set of rounds for duel mode - both players see the exact
    // same 3-from-topic-plus-1-odd cards in the exact same order.
    function generateOddOneOutRounds() {
        const groupedByTopic = groupNounsByTopic();
        const topics = Object.keys(groupedByTopic).filter(t => groupedByTopic[t].length >= 4);
        const rounds = [];
        for (let i = 0; i < ODD_ONE_OUT_ROUNDS && topics.length >= 2; i++) {
            rounds.push(buildOddOneOutRound(groupedByTopic, topics));
        }
        return rounds;
    }

    function renderOddOneOutGame(container, callbacks, duelRounds) {
        const onRoundEnd = (callbacks && callbacks.onRoundEnd) || function () {};
        const onProgress = (callbacks && callbacks.onProgress) || function () {};
        const onExit = (callbacks && callbacks.onExit) || function () {};
        const maxDiff = (callbacks && callbacks.difficulty) || 3;

        const groupedByTopic = groupNounsByTopic(maxDiff);
        const topics = Object.keys(groupedByTopic).filter(t => groupedByTopic[t].length >= 4);
        const totalRounds = duelRounds ? duelRounds.length : ODD_ONE_OUT_ROUNDS;

        let round, correctCount, current, locked;

        function startGame() {
            round = 0;
            correctCount = 0;
            nextRound();
        }

        function nextRound() {
            if (round >= totalRounds || (!duelRounds && topics.length < 2)) {
                showResult();
                return;
            }
            round++;
            locked = false;
            current = duelRounds ? duelRounds[round - 1] : buildOddOneOutRound(groupedByTopic, topics);
            render();
        }

        function render() {
            container.innerHTML = `
                <div class="game-screen odd-one-out-screen">
                    <h2 style="text-align: center;">🔎 Từ Lạc Loài</h2>
                    <p style="text-align: center; color: #777;">3 từ cùng một chủ đề, 1 từ không cùng nhóm - hãy tìm nó!</p>
                    <div class="game-stats">
                        <span>🎯 Vòng <span id="ooo-round">${round}</span>/${totalRounds}</span>
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
                playTone('correct');
                correctCount++;
                el.classList.add('ooo-correct');
                document.getElementById('ooo-score').textContent = correctCount;
            } else {
                playTone('wrong');
                el.classList.add('ooo-wrong');
                allCards[current.cards.findIndex(c => c.isOdd)].classList.add('ooo-reveal');
            }
            onProgress(round, correctCount);
            setTimeout(nextRound, 850);
        }

        function showResult() {
            const won = correctCount >= totalRounds * 0.5;
            playTone(won ? 'cheer' : 'cry');
            onRoundEnd(correctCount, totalRounds);
            container.innerHTML = `
                <div class="game-screen">
                    <div class="duo-character">${won ? '🧩' : '🤔'}</div>
                    <h2 style="text-align: center;">${won ? 'Bộ não tinh nhạy!' : 'Luyện thêm chút nữa nhé!'}</h2>
                    <p style="text-align: center; color: #777;">Bạn tìm đúng ${correctCount}/${totalRounds} vòng.</p>
                    <div style="display: flex; gap: 15px; justify-content: center; margin-top: 15px;">
                        ${duelRounds ? '' : '<button class="btn-primary" id="ooo-again">CHƠI TIẾP</button>'}
                        <button class="btn-secondary" id="ooo-exit">${duelRounds ? 'TIẾP TỤC' : 'QUAY LẠI'}</button>
                    </div>
                </div>
            `;
            if (!duelRounds) document.getElementById('ooo-again').addEventListener('click', () => startGame());
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

    // Pre-generates the full set of cards for duel mode - both players see the exact
    // same word/proposed-meaning sequence (including which ones are decoys).
    function generateReflexRounds() {
        const pool = [...VOCAB_BANK.nouns, ...VOCAB_BANK.verbs, ...VOCAB_BANK.adjectives];
        const rounds = [];
        for (let i = 0; i < REFLEX_ROUNDS; i++) rounds.push(buildReflexCard(pool));
        return rounds;
    }

    function renderReflexGame(container, callbacks, duelRounds) {
        const onRoundEnd = (callbacks && callbacks.onRoundEnd) || function () {};
        const onProgress = (callbacks && callbacks.onProgress) || function () {};
        const onExit = (callbacks && callbacks.onExit) || function () {};
        const maxDiff = (callbacks && callbacks.difficulty) || 3;
        const pool = filterDiff([...VOCAB_BANK.nouns, ...VOCAB_BANK.verbs, ...VOCAB_BANK.adjectives], maxDiff);
        // Beginners get double the time per card so the reflex game isn't a stress test.
        const secondsPerCard = maxDiff === 1 ? REFLEX_SECONDS_PER_CARD * 2 : REFLEX_SECONDS_PER_CARD;
        const totalRounds = duelRounds ? duelRounds.length : REFLEX_ROUNDS;

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
            if (round >= totalRounds) {
                showResult();
                return;
            }
            round++;
            locked = false;
            current = duelRounds ? duelRounds[round - 1] : buildReflexCard(pool);
            timeLeft = secondsPerCard;
            render();
            timerHandle = setInterval(() => {
                timeLeft -= 0.1;
                const bar = document.getElementById('reflex-timebar');
                if (bar) bar.style.width = `${Math.max(0, (timeLeft / secondsPerCard) * 100)}%`;
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
                        <span>🎯 <span id="reflex-round">${round}</span>/${totalRounds}</span>
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
                playTone('correct');
                correctCount++;
                combo++;
                bestCombo = Math.max(bestCombo, combo);
                if (cardEl) cardEl.classList.add('reflex-correct-flash');
            } else {
                playTone('wrong');
                combo = 0;
                if (cardEl) cardEl.classList.add('reflex-wrong-flash');
            }
            const scoreEl = document.getElementById('reflex-score');
            const comboEl = document.getElementById('reflex-combo');
            if (scoreEl) scoreEl.textContent = correctCount;
            if (comboEl) comboEl.textContent = combo;
            onProgress(round, correctCount);
            setTimeout(nextRound, 500);
        }

        function showResult() {
            const won = correctCount >= totalRounds * 0.5;
            playTone(won ? 'cheer' : 'cry');
            onRoundEnd(correctCount, totalRounds);
            container.innerHTML = `
                <div class="game-screen">
                    <div class="duo-character">${won ? '⚡' : '🐢'}</div>
                    <h2 style="text-align: center;">${won ? 'Phản xạ cực nhanh!' : 'Cố lên, nhanh tay hơn nhé!'}</h2>
                    <p style="text-align: center; color: #777;">Bạn trả lời đúng ${correctCount}/${totalRounds} câu, combo cao nhất: ${bestCombo}.</p>
                    <div style="display: flex; gap: 15px; justify-content: center; margin-top: 15px;">
                        ${duelRounds ? '' : '<button class="btn-primary" id="reflex-again">CHƠI TIẾP</button>'}
                        <button class="btn-secondary" id="reflex-exit">${duelRounds ? 'TIẾP TỤC' : 'QUAY LẠI'}</button>
                    </div>
                </div>
            `;
            if (!duelRounds) document.getElementById('reflex-again').addEventListener('click', () => startGame());
            document.getElementById('reflex-exit').addEventListener('click', () => onExit());
        }

        startGame();
    }

    // ============================= Picture Word Game =============================
    // "Nhìn hình chọn từ đúng" - show one hand-drawn icon (see data/picture-word-bank.js),
    // the learner picks its matching English word from 4 options. Distractors are drawn
    // from the SAME category as the correct answer (e.g. other animals, not a random mix
    // of animals/vehicles/shapes) so the round stays a real vocabulary challenge instead
    // of an easy process-of-elimination-by-picture-type guess.
    const PICTURE_WORD_ROUNDS = 10;

    // Clarity upgrade: the hand-drawn SVG icons were hard to recognise, so the picture
    // is now shown as a big, crisp EMOJI whenever the word has a well-supported one -
    // instantly recognisable and unambiguous. Words WITHOUT a good/standard emoji (rare
    // fruits, colour-distinguished gems, newest-emoji items) keep their SVG so nothing
    // ever renders blank. Only the CORRECT answer's picture is shown, so a shared emoji
    // between same-category words (e.g. leafy greens) is deliberately left as SVG.
    const PW_EMOJI = {
        // animals
        cat: '🐱', dog: '🐶', rabbit: '🐰', elephant: '🐘', lion: '🦁', bear: '🐻', monkey: '🐵',
        cow: '🐮', pig: '🐷', sheep: '🐑', duck: '🦆', frog: '🐸', turtle: '🐢', horse: '🐴',
        bird: '🐦', fish: '🐟', goat: '🐐', deer: '🦌', fox: '🦊', wolf: '🐺', tiger: '🐯',
        zebra: '🦓', giraffe: '🦒', kangaroo: '🦘', koala: '🐨', panda: '🐼', squirrel: '🐿️',
        hedgehog: '🦔', mouse: '🐭', snake: '🐍', owl: '🦉', parrot: '🦜', penguin: '🐧',
        eagle: '🦅', peacock: '🦚', flamingo: '🦩', shark: '🦈', clownfish: '🐠', crab: '🦀', snail: '🐌',
        // fruits
        apple: '🍎', banana: '🍌', orange: '🍊', grape: '🍇', strawberry: '🍓', watermelon: '🍉',
        pineapple: '🍍', cherry: '🍒', lemon: '🍋', mango: '🥭', peach: '🍑', kiwi: '🥝',
        coconut: '🥥', blueberry: '🫐',
        // vegetables
        carrot: '🥕', tomato: '🍅', potato: '🥔', corn: '🌽', broccoli: '🥦', onion: '🧅',
        pepper: '🫑', cucumber: '🥒', eggplant: '🍆', pumpkin: '🎃', garlic: '🧄', mushroom: '🍄',
        // objects
        book: '📖', chair: '🪑', cup: '☕', clock: '⏰', key: '🔑', umbrella: '☂️', ball: '⚽',
        phone: '📱', lamp: '💡', bag: '👜', hat: '🎩', shoe: '👟', glasses: '👓', box: '📦',
        jar: '🫙', basket: '🧺', hammer: '🔨', screwdriver: '🪛', wrench: '🔧', 'scissors tool': '✂️',
        pencil: '✏️', brush: '🖌️', candle: '🕯️', bottle: '🧴', 'gift box': '🎁', suitcase: '🧳',
        backpack: '🎒', wallet: '👛', mirror: '🪞',
        // vehicles
        car: '🚗', bus: '🚌', bicycle: '🚲', airplane: '✈️', boat: '⛵', train: '🚆', truck: '🚚',
        motorcycle: '🏍️', van: '🚐', taxi: '🚕', ambulance: '🚑', scooter: '🛵', tractor: '🚜',
        helicopter: '🚁', rocket: '🚀',
        // weather
        sun: '☀️', cloud: '☁️', rain: '🌧️', snow: '❄️', rainbow: '🌈', lightning: '⚡',
        // shapes
        circle: '🔵', square: '🟦', triangle: '🔺', star: '⭐', heart: '❤️', moon: '🌙', diamond: '🔷', crown: '👑',
        // plants
        tulip: '🌷', rose: '🌹', sunflower: '🌻', daisy: '🌼', lotus: '🪷', cactus: '🌵', tree: '🌳',
        // clothing
        't-shirt': '👕', dress: '👗', jacket: '🧥', jeans: '👖', shorts: '🩳', sock: '🧦', scarf: '🧣',
        // buildings
        house: '🏠', school: '🏫', hospital: '🏥', church: '⛪', castle: '🏰', tower: '🗼',
    };
    function pwPicture(entry) {
        const emoji = PW_EMOJI[entry.en];
        return emoji ? `<span class="pw-emoji" role="img" aria-label="${escapeHtml(entry.en)}">${emoji}</span>` : entry.svg;
    }

    function buildPictureWordRound(usedIds) {
        const availablePool = PICTURE_WORD_BANK.filter(w => !usedIds.has(w.en));
        const pool = availablePool.length ? availablePool : PICTURE_WORD_BANK;
        const correct = pickRandomOne(pool);
        usedIds.add(correct.en);
        const sameCategory = PICTURE_WORD_BANK.filter(w => w.category === correct.category && w.en !== correct.en);
        const distractorPool = sameCategory.length >= 3 ? sameCategory : PICTURE_WORD_BANK.filter(w => w.en !== correct.en);
        const distractors = shuffle(distractorPool).slice(0, 3);
        const options = shuffle([correct, ...distractors]);
        return { correct, options };
    }

    // Pre-generates the full set of rounds for duel mode - both players see the exact
    // same icon-plus-4-options sequence.
    function generatePictureWordRounds() {
        const usedIds = new Set();
        const rounds = [];
        for (let i = 0; i < PICTURE_WORD_ROUNDS; i++) rounds.push(buildPictureWordRound(usedIds));
        return rounds;
    }

    function renderPictureWordGame(container, callbacks, duelRounds) {
        const onRoundEnd = (callbacks && callbacks.onRoundEnd) || function () {};
        const onProgress = (callbacks && callbacks.onProgress) || function () {};
        const onExit = (callbacks && callbacks.onExit) || function () {};
        const totalRounds = duelRounds ? duelRounds.length : PICTURE_WORD_ROUNDS;

        let round, correctCount, current, locked, usedIds;

        function startGame() {
            round = 0;
            correctCount = 0;
            usedIds = new Set();
            nextRound();
        }

        function nextRound() {
            if (round >= totalRounds) {
                showResult();
                return;
            }
            round++;
            locked = false;
            current = duelRounds ? duelRounds[round - 1] : buildPictureWordRound(usedIds);
            render();
        }

        function render() {
            container.innerHTML = `
                <div class="game-screen picture-word-screen">
                    <h2 style="text-align: center;">🖼️ Nhìn Hình Chọn Từ Đúng</h2>
                    <div class="game-stats">
                        <span>🎯 <span id="pw-round">${round}</span>/${totalRounds}</span>
                        <span>✅ <span id="pw-score">${correctCount}</span></span>
                    </div>
                    <div class="picture-word-icon" id="pw-icon">${pwPicture(current.correct)}</div>
                    <div class="picture-word-options">
                        ${current.options.map(o => `<button class="picture-word-option-btn" data-en="${escapeHtml(o.en)}">${escapeHtml(o.en)}</button>`).join('')}
                    </div>
                    <button class="btn-secondary" style="margin-top: 16px;" id="pw-close">QUAY LẠI</button>
                </div>
            `;
            container.querySelectorAll('.picture-word-option-btn').forEach(btn => {
                btn.addEventListener('click', () => answer(btn));
            });
            document.getElementById('pw-close').addEventListener('click', () => onExit());
        }

        function answer(btn) {
            if (locked) return;
            locked = true;
            const isCorrect = btn.dataset.en === current.correct.en;
            if (isCorrect) {
                playTone('correct');
                correctCount++;
                btn.classList.add('picture-word-correct');
            } else {
                playTone('wrong');
                btn.classList.add('picture-word-wrong');
                const correctBtn = [...container.querySelectorAll('.picture-word-option-btn')].find(b => b.dataset.en === current.correct.en);
                if (correctBtn) correctBtn.classList.add('picture-word-correct');
            }
            const scoreEl = document.getElementById('pw-score');
            if (scoreEl) scoreEl.textContent = correctCount;
            onProgress(round, correctCount);
            setTimeout(nextRound, 700);
        }

        function showResult() {
            const won = correctCount >= totalRounds * 0.5;
            playTone(won ? 'cheer' : 'cry');
            onRoundEnd(correctCount, totalRounds);
            container.innerHTML = `
                <div class="game-screen">
                    <div class="duo-character">${won ? '🖼️' : '🤔'}</div>
                    <h2 style="text-align: center;">${won ? 'Mắt tinh, từ giỏi!' : 'Nhìn kỹ hơn nhé!'}</h2>
                    <p style="text-align: center; color: #777;">Bạn chọn đúng ${correctCount}/${totalRounds} hình.</p>
                    <div style="display: flex; gap: 15px; justify-content: center; margin-top: 15px;">
                        ${duelRounds ? '' : '<button class="btn-primary" id="pw-again">CHƠI TIẾP</button>'}
                        <button class="btn-secondary" id="pw-exit">${duelRounds ? 'TIẾP TỤC' : 'QUAY LẠI'}</button>
                    </div>
                </div>
            `;
            if (!duelRounds) document.getElementById('pw-again').addEventListener('click', () => startGame());
            document.getElementById('pw-exit').addEventListener('click', () => onExit());
        }

        startGame();
    }

    return {
        renderWordMatchGame, renderMemoryGame, renderOddOneOutGame, renderReflexGame, renderPictureWordGame,
        generateWordMatchRounds, generateMemoryRounds, generateOddOneOutRounds, generateReflexRounds, generatePictureWordRounds,
        getMemoryLevelConfig
    };
})();

window.Games = Games;
