// Theme-based, context-first sample lessons (GĐ2 "học tự nhiên qua ngữ cảnh").
// Each theme teaches a small set of real-life words + phrases the child SEES (emoji picture),
// HEARS (TTS), USES (a situational dialogue), and speaks — minimal Vietnamese translation.
// PICTURES ARE EMOJI-FIRST (clear + recognizable for kids); the illustrated SVG bank is only
// a fallback for a word with no emoji. window.ThemeLessons.build(themeId) returns a
// ready-to-run exercise queue in the app's normal shapes (picture choices reuse the
// multiple_choice engine; the dialogue reuses the `dialogue` engine — see app-lesson.js).
(function () {
    'use strict';

    // en -> emoji. EMOJI-FIRST for every theme word (kids recognise emoji instantly).
    var EMOJI = {
        // animals
        cat: '🐱', dog: '🐶', elephant: '🐘', lion: '🦁', monkey: '🐵', duck: '🦆',
        // fruits & vegetables
        apple: '🍎', banana: '🍌', orange: '🍊', carrot: '🥕', tomato: '🍅', corn: '🌽',
        // objects
        book: '📖', chair: '🪑', cup: '☕', clock: '⏰', ball: '⚽', key: '🔑',
        // vehicles
        car: '🚗', bus: '🚌', bicycle: '🚲', train: '🚆', boat: '⛵', airplane: '✈️',
        // weather & clothing
        sun: '☀️', rain: '🌧️', cloud: '☁️', hat: '👒', dress: '👗', 't-shirt': '👕',
        // ẩm thực (dishes)
        rice: '🍚', noodles: '🍜', pizza: '🍕', bread: '🍞', cake: '🍰', egg: '🥚',
        // cờ quốc gia (flags)
        Vietnam: '🇻🇳', America: '🇺🇸', Japan: '🇯🇵', France: '🇫🇷', Korea: '🇰🇷', China: '🇨🇳',
    };

    var THEMES = [
        {
            id: 'animals', title: 'Con vật', icon: '🐾',
            words: [
                { en: 'cat', vi: 'con mèo' }, { en: 'dog', vi: 'con chó' },
                { en: 'elephant', vi: 'con voi' }, { en: 'lion', vi: 'con sư tử' },
                { en: 'monkey', vi: 'con khỉ' }, { en: 'duck', vi: 'con vịt' },
            ],
            phrases: ['I like the cat.', 'The dog is big.', 'Look at the elephant!'],
            dialogue: {
                lines: ['👦 Nam: Look! An elephant!', '👧 Mai: Wow, it is so big!', '👦 Nam: I like the monkey too.', '👧 Mai: Me too! It is funny.'],
                audioLines: ['Look! An elephant!', 'Wow, it is so big!', 'I like the monkey too.', 'Me too! It is funny.'],
                question: 'Mai nghĩ con khỉ thế nào?',
                options: ['It is funny.', 'It is big.', 'It is small.'], correct: 0,
            },
        },
        {
            id: 'food', title: 'Trái cây & Rau', icon: '🍎',
            words: [
                { en: 'apple', vi: 'quả táo' }, { en: 'banana', vi: 'quả chuối' },
                { en: 'orange', vi: 'quả cam' }, { en: 'carrot', vi: 'củ cà rốt' },
                { en: 'tomato', vi: 'quả cà chua' }, { en: 'corn', vi: 'bắp ngô' },
            ],
            phrases: ['I want an apple.', 'The banana is yellow.', 'I like fruit.'],
            dialogue: {
                lines: ['👧 Mai: I want an apple, please.', '🧑 Seller: Here you are!', '👧 Mai: And two bananas, please.', '🧑 Seller: OK! Here you go.'],
                audioLines: ['I want an apple, please.', 'Here you are!', 'And two bananas, please.', 'OK! Here you go.'],
                question: 'Mai muốn gì đầu tiên?',
                options: ['An apple.', 'A banana.', 'An orange.'], correct: 0,
            },
        },
        {
            id: 'objects', title: 'Đồ vật quanh bé', icon: '🎒',
            words: [
                { en: 'book', vi: 'quyển sách' }, { en: 'chair', vi: 'cái ghế' },
                { en: 'cup', vi: 'cái cốc' }, { en: 'clock', vi: 'đồng hồ' },
                { en: 'ball', vi: 'quả bóng' }, { en: 'key', vi: 'chìa khóa' },
            ],
            phrases: ['This is my book.', 'Where is the ball?', 'I have a cup.'],
            dialogue: {
                lines: ['👦 Nam: Where is my book?', '👧 Mai: It is on the chair.', '👦 Nam: Oh, thank you!', "👧 Mai: You're welcome."],
                audioLines: ['Where is my book?', 'It is on the chair.', 'Oh, thank you!', "You're welcome."],
                question: 'Quyển sách ở đâu?',
                options: ['On the chair.', 'On the table.', 'In the bag.'], correct: 0,
            },
        },
        {
            id: 'vehicles', title: 'Xe cộ', icon: '🚗',
            words: [
                { en: 'car', vi: 'ô tô' }, { en: 'bus', vi: 'xe buýt' },
                { en: 'bicycle', vi: 'xe đạp' }, { en: 'train', vi: 'tàu hỏa' },
                { en: 'boat', vi: 'thuyền' }, { en: 'airplane', vi: 'máy bay' },
            ],
            phrases: ['I go by bus.', 'The car is red.', 'I like the train.'],
            dialogue: {
                lines: ['👧 Mai: How do you go to school?', '👦 Nam: I go by bus. And you?', '👧 Mai: I go by bicycle.', "👦 Nam: That's fun!"],
                audioLines: ['How do you go to school?', 'I go by bus. And you?', 'I go by bicycle.', "That's fun!"],
                question: 'Nam đi học bằng gì?',
                options: ['By bus.', 'By bicycle.', 'By car.'], correct: 0,
            },
        },
        {
            id: 'weather', title: 'Quần áo & Thời tiết', icon: '☀️',
            words: [
                { en: 'sun', vi: 'mặt trời' }, { en: 'rain', vi: 'mưa' },
                { en: 'cloud', vi: 'đám mây' }, { en: 'hat', vi: 'cái mũ' },
                { en: 'dress', vi: 'váy' }, { en: 't-shirt', vi: 'áo phông' },
            ],
            phrases: ['It is sunny today.', 'I wear a hat.', 'I like the rain.'],
            dialogue: {
                lines: ['👧 Mai: It is sunny today!', '👦 Nam: Yes! I wear a hat.', '👧 Mai: I wear a dress.', "👦 Nam: Let's go to the park!"],
                audioLines: ['It is sunny today!', 'Yes! I wear a hat.', 'I wear a dress.', "Let's go to the park!"],
                question: 'Nam mặc/đội gì?',
                options: ['A hat.', 'A dress.', 'A jacket.'], correct: 0,
            },
        },
        {
            id: 'cuisine', title: 'Ẩm thực', icon: '🍜',
            words: [
                { en: 'rice', vi: 'cơm' }, { en: 'noodles', vi: 'mì/phở' },
                { en: 'pizza', vi: 'pizza' }, { en: 'bread', vi: 'bánh mì' },
                { en: 'cake', vi: 'bánh ngọt' }, { en: 'egg', vi: 'trứng' },
            ],
            phrases: ['I like rice.', 'I eat noodles.', 'The cake is sweet.'],
            dialogue: {
                lines: ['👦 Nam: I am hungry. I like rice.', '👧 Mai: I like noodles!', "👦 Nam: Let's eat together.", '👧 Mai: Yes! And cake after.'],
                audioLines: ['I am hungry. I like rice.', 'I like noodles!', "Let's eat together.", 'Yes! And cake after.'],
                question: 'Mai thích món gì?',
                options: ['Noodles.', 'Rice.', 'Bread.'], correct: 0,
            },
        },
        {
            id: 'flags', title: 'Cờ quốc gia', icon: '🏳️',
            words: [
                { en: 'Vietnam', vi: 'Việt Nam' }, { en: 'America', vi: 'nước Mỹ' },
                { en: 'Japan', vi: 'Nhật Bản' }, { en: 'France', vi: 'nước Pháp' },
                { en: 'Korea', vi: 'Hàn Quốc' }, { en: 'China', vi: 'Trung Quốc' },
            ],
            phrases: ['I am from Vietnam.', 'This is Japan.', 'I like France.'],
            dialogue: {
                lines: ['👦 Nam: I am from Vietnam.', '👧 Emi: I am from Japan!', '👦 Nam: Nice to meet you.', '👧 Emi: Nice to meet you too!'],
                audioLines: ['I am from Vietnam.', 'I am from Japan!', 'Nice to meet you.', 'Nice to meet you too!'],
                question: 'Emi đến từ đâu?',
                options: ['Japan.', 'Vietnam.', 'France.'], correct: 0,
            },
        },
    ];

    // Picture (emoji span first, SVG fallback) for an English word, or the word as last resort.
    function pic(en) {
        var e = EMOJI[en];
        if (e) return '<span class="theme-emoji" role="img" aria-label="' + en + '">' + e + '</span>';
        // Fallback to the illustrated SVG bank (a `const` global, not window.PICTURE_WORD_BANK).
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

    // Hear the word (speak) → pick the matching picture.
    function audioToPicture(theme, word) {
        var others = shuffle(theme.words.filter(function (w) { return w.en !== word.en; })).slice(0, 3);
        var pool = shuffle([word].concat(others));
        return {
            id: nid(), type: 'multiple_choice', question: '🔊 Nghe rồi chọn đúng tranh:',
            speak: word.en,
            options: pool.map(function (w) { return w.en; }),
            optionPics: pool.map(function (w) { return pic(w.en) || w.en; }),
            correct: pool.indexOf(word),
        };
    }

    // SEE the picture → pick the English word.
    function pictureToWord(theme, word) {
        var others = shuffle(theme.words.filter(function (w) { return w.en !== word.en; })).slice(0, 3);
        var pool = shuffle([word].concat(others));
        return {
            id: nid(), type: 'multiple_choice', question: 'Đây là gì? Chọn từ đúng:',
            promptPic: pic(word.en) || '', speak: word.en,
            options: pool.map(function (w) { return w.en; }),
            correct: pool.indexOf(word),
        };
    }

    // Listening in context: hear a short natural phrase → pick it.
    function phraseListen(theme, phrase) {
        var distractors = shuffle(theme.phrases.filter(function (p) { return p !== phrase; }));
        var pool = shuffle([phrase].concat(distractors.slice(0, 2)));
        return {
            id: nid(), type: 'listening', question: '🔊 Nghe và chọn câu đúng:',
            options: pool, correct: pool.indexOf(phrase),
        };
    }

    // Situational dialogue (read + hear the conversation, then a comprehension question).
    function dialogueEx(theme) {
        var d = theme.dialogue;
        return {
            id: nid(), type: 'dialogue', question: d.question,
            lines: d.lines, audioLines: d.audioLines, options: d.options, correct: d.correct,
        };
    }

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
        ex.push(dialogueEx(theme)); // ← situational conversation (context / use)
        ex.push({ id: nid(), type: 'pronunciation', question: 'Đọc to câu này nhé:', target: theme.phrases[Math.min(1, theme.phrases.length - 1)] });
        ex.push(audioToPicture(theme, w[4]));
        ex.push(pictureToWord(theme, w[5] || w[0]));
        return ex;
    }

    window.ThemeLessons = {
        themes: THEMES.map(function (t) { return { id: t.id, title: t.title, icon: t.icon, count: t.words.length }; }),
        build: build,
        picFor: pic,
    };
})();
