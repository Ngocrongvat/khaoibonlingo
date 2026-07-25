// Theme-based, context-first sample lessons (GĐ2 "học tự nhiên qua ngữ cảnh").
// Each theme teaches a small set of real-life words + phrases the child SEES (picture),
// HEARS (TTS), and USES — minimal Vietnamese translation. Pictures reuse the existing SVG
// bank (window.PICTURE_WORD_BANK) for the 5 illustrated themes; the two new emoji themes
// (ẩm thực / cờ quốc gia) carry their own emoji. window.ThemeLessons.build(themeId) returns
// a ready-to-run exercise queue in the app's normal exercise shapes (picture_choice reuses
// the multiple_choice engine — see app-lesson.js render + app-misc.js events).
(function () {
    'use strict';

    // en -> emoji, for themes with no SVG in PICTURE_WORD_BANK.
    var EMOJI = {
        // ẩm thực (dishes)
        rice: '🍚', noodles: '🍜', pizza: '🍕', bread: '🍞', soup: '🍲', cake: '🍰',
        egg: '🥚', chicken: '🍗', 'ice cream': '🍦', fish: '🐟',
        // cờ quốc gia (flags)
        Vietnam: '🇻🇳', America: '🇺🇸', Japan: '🇯🇵', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', France: '🇫🇷',
        Korea: '🇰🇷', China: '🇨🇳', Thailand: '🇹🇭',
    };

    // The 7 sample themes. `words` = what the child learns (en + vi for the answer key +
    // audio); `phrases` = short natural sentences used in context; `emoji:true` = use EMOJI.
    var THEMES = [
        {
            id: 'animals', title: 'Con vật', icon: '🐾', greet: 'Cùng thăm sở thú nào!',
            words: [
                { en: 'cat', vi: 'con mèo' }, { en: 'dog', vi: 'con chó' },
                { en: 'elephant', vi: 'con voi' }, { en: 'lion', vi: 'con sư tử' },
                { en: 'monkey', vi: 'con khỉ' }, { en: 'duck', vi: 'con vịt' },
            ],
            phrases: ['I like the cat.', 'The dog is big.', 'Look at the elephant!'],
        },
        {
            id: 'food', title: 'Trái cây & Rau', icon: '🍎', greet: 'Đi chợ cùng Bé Khoai!',
            words: [
                { en: 'apple', vi: 'quả táo' }, { en: 'banana', vi: 'quả chuối' },
                { en: 'orange', vi: 'quả cam' }, { en: 'carrot', vi: 'củ cà rốt' },
                { en: 'tomato', vi: 'quả cà chua' }, { en: 'corn', vi: 'bắp ngô' },
            ],
            phrases: ['I want an apple.', 'The banana is yellow.', 'I like fruit.'],
        },
        {
            id: 'objects', title: 'Đồ vật quanh bé', icon: '🎒', greet: 'Nhìn quanh phòng nào!',
            words: [
                { en: 'book', vi: 'quyển sách' }, { en: 'chair', vi: 'cái ghế' },
                { en: 'cup', vi: 'cái cốc' }, { en: 'clock', vi: 'đồng hồ' },
                { en: 'ball', vi: 'quả bóng' }, { en: 'key', vi: 'chìa khóa' },
            ],
            phrases: ['This is my book.', 'Where is the ball?', 'I have a cup.'],
        },
        {
            id: 'vehicles', title: 'Xe cộ', icon: '🚗', greet: 'Mình đi đâu đây?',
            words: [
                { en: 'car', vi: 'ô tô' }, { en: 'bus', vi: 'xe buýt' },
                { en: 'bicycle', vi: 'xe đạp' }, { en: 'train', vi: 'tàu hỏa' },
                { en: 'boat', vi: 'thuyền' }, { en: 'airplane', vi: 'máy bay' },
            ],
            phrases: ['I go by bus.', 'The car is red.', 'I like the train.'],
        },
        {
            id: 'weather', title: 'Quần áo & Thời tiết', icon: '☀️', greet: 'Hôm nay trời thế nào?',
            words: [
                { en: 'sun', vi: 'mặt trời' }, { en: 'rain', vi: 'mưa' },
                { en: 'cloud', vi: 'đám mây' }, { en: 'hat', vi: 'cái mũ' },
                { en: 'dress', vi: 'váy' }, { en: 't-shirt', vi: 'áo phông' },
            ],
            phrases: ['It is sunny today.', 'I wear a hat.', 'I like the rain.'],
        },
        {
            id: 'cuisine', title: 'Ẩm thực', icon: '🍜', greet: 'Bé đói bụng chưa?', emoji: true,
            words: [
                { en: 'rice', vi: 'cơm' }, { en: 'noodles', vi: 'mì/phở' },
                { en: 'pizza', vi: 'pizza' }, { en: 'bread', vi: 'bánh mì' },
                { en: 'cake', vi: 'bánh ngọt' }, { en: 'egg', vi: 'trứng' },
            ],
            phrases: ['I like rice.', 'I eat noodles.', 'The cake is sweet.'],
        },
        {
            id: 'flags', title: 'Cờ quốc gia', icon: '🏳️', greet: 'Bé biết nước nào?', emoji: true,
            words: [
                { en: 'Vietnam', vi: 'Việt Nam' }, { en: 'America', vi: 'nước Mỹ' },
                { en: 'Japan', vi: 'Nhật Bản' }, { en: 'France', vi: 'nước Pháp' },
                { en: 'Korea', vi: 'Hàn Quốc' }, { en: 'China', vi: 'Trung Quốc' },
            ],
            phrases: ['I am from Vietnam.', 'This is Japan.', 'I like France.'],
        },
    ];

    // Picture (SVG or emoji span) for an English word, or null if none is available.
    function pic(en, useEmoji) {
        if (useEmoji || EMOJI[en]) {
            var e = EMOJI[en];
            if (e) return '<span class="theme-emoji" role="img" aria-label="' + en + '">' + e + '</span>';
        }
        // PICTURE_WORD_BANK is a `const` global (lexical, NOT window.PICTURE_WORD_BANK), so
        // reference it by bare name like games.js does; fall back to window for the tests.
        var bank =
            typeof PICTURE_WORD_BANK !== 'undefined'
                ? PICTURE_WORD_BANK
                : typeof window !== 'undefined'
                  ? window.PICTURE_WORD_BANK
                  : null;
        if (bank) {
            for (var i = 0; i < bank.length; i++) {
                if (bank[i].en && bank[i].en.toLowerCase() === en.toLowerCase()) return bank[i].svg;
            }
        }
        return null;
    }

    function shuffle(a) {
        a = a.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    var eid = 0;
    function nid() { return 'theme_ex_' + ++eid; }

    // Build a 4-option picture-choice: hear the word (speak) → pick the matching picture.
    function audioToPicture(theme, word) {
        var others = shuffle(theme.words.filter(function (w) { return w.en !== word.en; })).slice(0, 3);
        var pool = shuffle([word].concat(others));
        return {
            id: nid(), type: 'multiple_choice',
            question: '🔊 Nghe rồi chọn đúng tranh:',
            speak: word.en,
            options: pool.map(function (w) { return w.en; }),
            optionPics: pool.map(function (w) { return pic(w.en, theme.emoji) || w.en; }),
            correct: pool.indexOf(word),
        };
    }

    // Build a 4-option: SEE the picture → pick the English word.
    function pictureToWord(theme, word) {
        var others = shuffle(theme.words.filter(function (w) { return w.en !== word.en; })).slice(0, 3);
        var pool = shuffle([word].concat(others));
        return {
            id: nid(), type: 'multiple_choice',
            question: 'Đây là gì? Chọn từ đúng:',
            promptPic: pic(word.en, theme.emoji) || '',
            speak: word.en,
            options: pool.map(function (w) { return w.en; }),
            correct: pool.indexOf(word),
        };
    }

    // Listening in context: hear a short natural phrase → pick it (reinforces the chunk).
    function phraseListen(theme, phrase) {
        var distractors = shuffle(theme.phrases.filter(function (p) { return p !== phrase; }));
        var pool = shuffle([phrase].concat(distractors.slice(0, 2)));
        return {
            id: nid(), type: 'listening',
            question: '🔊 Nghe và chọn câu đúng:',
            options: pool,
            correct: pool.indexOf(phrase),
        };
    }

    // Build the full context-first sequence for one theme.
    function build(themeId) {
        var theme = THEMES.filter(function (t) { return t.id === themeId; })[0];
        if (!theme) return null;
        var w = theme.words;
        var ex = [];
        ex.push(audioToPicture(theme, w[0]));
        ex.push(pictureToWord(theme, w[1]));
        ex.push(audioToPicture(theme, w[2]));
        ex.push(pictureToWord(theme, w[3]));
        ex.push(phraseListen(theme, theme.phrases[0]));
        // Speak a key phrase (context use).
        ex.push({ id: nid(), type: 'pronunciation', question: 'Đọc to câu này nhé:', target: theme.phrases[Math.min(1, theme.phrases.length - 1)] });
        // Review the last two words as pictures.
        ex.push(audioToPicture(theme, w[4]));
        ex.push(pictureToWord(theme, w[5] || w[0]));
        return ex;
    }

    window.ThemeLessons = {
        themes: THEMES.map(function (t) { return { id: t.id, title: t.title, icon: t.icon, greet: t.greet, count: t.words.length }; }),
        build: build,
        picFor: pic,
    };
})();
