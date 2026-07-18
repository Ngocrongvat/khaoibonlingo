// Prototype data for the "Tình huống giao tiếp" animated scenes (see assets/js/
// scenarios.js). Each scenario is a short daily-life skit acted out by the SVG cast
// (recoloured mascots), voiced by TTS, with EN + VI subtitles, key vocabulary, and a
// role the learner plays afterwards. Hand-authored for the prototype; the full version
// will generate one per chapter from that chapter's own vocabulary.
const SCENARIO_BANK = [
    {
        id: 'greet',
        title: 'Làm quen bạn mới',
        bg: 'park',
        cast: {
            A: { name: 'Khoai', hue: 0, badge: '' },
            B: { name: 'Mimi', hue: 135, badge: '🎀' },
        },
        lines: [
            { who: 'A', en: 'Hello! What is your name?', vi: 'Xin chào! Bạn tên là gì?', mood: 'happy' },
            { who: 'B', en: 'Hi! My name is Mimi.', vi: 'Chào! Mình tên là Mimi.', mood: 'giggle' },
            { who: 'A', en: 'Nice to meet you, Mimi!', vi: 'Rất vui được gặp bạn, Mimi!', mood: 'love' },
            { who: 'B', en: 'Nice to meet you too!', vi: 'Mình cũng rất vui được gặp bạn!', mood: 'party' },
        ],
        vocab: [
            { en: 'hello', vi: 'xin chào' },
            { en: 'name', vi: 'tên' },
            { en: 'meet', vi: 'gặp gỡ' },
            { en: 'nice', vi: 'vui, tốt' },
        ],
        playAs: 'B',
    },
    {
        id: 'cafe',
        title: 'Gọi món ở quán',
        bg: 'cafe',
        cast: {
            A: { name: 'Khoai', hue: 0, badge: '' },
            B: { name: 'Cô Bo', hue: 260, badge: '🧑‍🍳' },
        },
        lines: [
            { who: 'B', en: 'Good morning! What would you like?', vi: 'Chào buổi sáng! Em muốn dùng gì?', mood: 'happy' },
            { who: 'A', en: 'Can I have an apple, please?', vi: 'Cho cháu một quả táo được không ạ?', mood: 'excited' },
            { who: 'B', en: 'Sure! Here you are.', vi: 'Được chứ! Của em đây.', mood: 'giggle' },
            { who: 'A', en: 'Thank you very much!', vi: 'Cháu cảm ơn nhiều ạ!', mood: 'love' },
        ],
        vocab: [
            { en: 'apple', vi: 'quả táo' },
            { en: 'please', vi: 'làm ơn' },
            { en: 'thank you', vi: 'cảm ơn' },
            { en: 'morning', vi: 'buổi sáng' },
        ],
        playAs: 'A',
    },
    {
        id: 'school',
        title: 'Ở lớp học',
        bg: 'classroom',
        cast: {
            A: { name: 'Khoai', hue: 0, badge: '' },
            B: { name: 'Cô Lan', hue: 200, badge: '👓' },
        },
        lines: [
            { who: 'A', en: 'Good morning, teacher!', vi: 'Chào buổi sáng cô ạ!', mood: 'happy' },
            { who: 'B', en: 'Good morning! Please sit down.', vi: 'Chào buổi sáng! Em ngồi xuống nào.', mood: 'giggle' },
            { who: 'B', en: 'Open your book, please.', vi: 'Mở sách ra nào các em.', mood: 'happy' },
            { who: 'A', en: 'Yes, teacher!', vi: 'Vâng ạ, thưa cô!', mood: 'excited' },
        ],
        vocab: [
            { en: 'teacher', vi: 'cô giáo, thầy giáo' },
            { en: 'book', vi: 'quyển sách' },
            { en: 'sit down', vi: 'ngồi xuống' },
            { en: 'open', vi: 'mở' },
        ],
        playAs: 'A',
    },
];
