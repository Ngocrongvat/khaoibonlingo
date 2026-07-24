// Content safety for user-generated text (Compliance & Child-Safety phase). A children's app
// must never let kids post profanity or share personal contact info. window.ContentSafety
// gates every UGC write — global chat, DMs, group chat, usernames, group names — BEFORE it
// reaches Supabase. Client-side is the first line (a report/block layer + server rules back
// it up); it blocks with a kid-friendly Vietnamese reason instead of silently mangling text.
(function () {
    'use strict';

    // Modest, exton-demand profanity list (Vietnamese + English). Matched on whole tokens so
    // innocent words aren't caught (e.g. "class" must not trip "ass"). Keep lowercase.
    var PROFANITY = [
        // English
        'fuck',
        'fucking',
        'fuk',
        'shit',
        'bitch',
        'bastard',
        'asshole',
        'dick',
        'pussy',
        'cunt',
        'slut',
        'whore',
        'fag',
        'faggot',
        'nigger',
        'motherfucker',
        'cock',
        'jerk',
        'damn',
        'crap',
        'retard',
        'idiot',
        'stupid',
        // Vietnamese (common vulgar terms / insults)
        'đụ',
        'địt',
        'đéo',
        'lồn',
        'cặc',
        'buồi',
        'đĩ',
        'điếm',
        'đm',
        'đmm',
        'vcl',
        'vl',
        'cc',
        'cứt',
        'đù',
        'đù má',
        'đm',
        'đcm',
        'clm',
        'cmm',
        'cmn',
        'súc vật',
        'chó chết',
        'ngu',
        'óc chó',
        'mẹ mày',
        'con mẹ',
        'thằng chó',
        'đồ ngu',
        'khốn nạn',
        'mất dạy',
    ];
    // A few strongly-offensive fragments safe to match as substrings (evasion-resistant).
    var PROFANITY_SUBSTR = ['fuck', 'nigger', 'faggot', 'địt', 'lồn', 'cặc'];

    var PROFANITY_SET = {};
    for (var i = 0; i < PROFANITY.length; i++) PROFANITY_SET[PROFANITY[i]] = true;

    function normalize(s) {
        return String(s == null ? '' : s).toLowerCase();
    }

    // Tokenise on anything that isn't a letter/number (keeps Vietnamese diacritics).
    function tokens(s) {
        return normalize(s)
            .split(/[^0-9a-zà-ỹ]+/i)
            .filter(Boolean);
    }

    function hasProfanity(text) {
        var norm = normalize(text);
        // collapse simple letter-spacing evasion ("f u c k" / "l.ồ.n") for the substring pass
        var collapsed = norm.replace(/[\s._\-*]+/g, '');
        for (var k = 0; k < PROFANITY_SUBSTR.length; k++) {
            if (collapsed.indexOf(PROFANITY_SUBSTR[k]) !== -1) return true;
        }
        var toks = tokens(text);
        for (var t = 0; t < toks.length; t++) {
            if (PROFANITY_SET[toks[t]]) return true;
        }
        // multi-word Vietnamese phrases
        for (var p = 0; p < PROFANITY.length; p++) {
            if (PROFANITY[p].indexOf(' ') !== -1 && norm.indexOf(PROFANITY[p]) !== -1) return true;
        }
        return false;
    }

    // Detects personal contact info a child should never share. Returns a Vietnamese label
    // for the kind found, or null.
    function findPII(text) {
        var t = String(text == null ? '' : text);
        if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(t)) return 'địa chỉ email';
        if (/(https?:\/\/|www\.)/i.test(t)) return 'liên kết';
        if (/\b[a-z0-9-]{2,}\.(com|net|org|vn|io|xyz|info|me|link|shop|app|co|tv)\b/i.test(t))
            return 'liên kết';
        // phone / long digit run (>= 9 digits, ignoring common separators)
        var digits = t.replace(/[\s().\-+]/g, '');
        if (/\d{9,}/.test(digits)) return 'số điện thoại';
        if (/(^|\D)(\+?84|0)\d[\d\s.\-]{7,}\d/.test(t)) return 'số điện thoại';
        return null;
    }

    // Gate a chat/DM message. Returns { ok:true } or { ok:false, reason:'<kid-friendly VI>' }.
    function check(text, opts) {
        opts = opts || {};
        var raw = String(text == null ? '' : text);
        var trimmed = raw.trim();
        if (!trimmed) return { ok: false, reason: 'Bạn chưa nhập nội dung.' };
        var max = opts.maxLength || 500;
        if (raw.length > max)
            return { ok: false, reason: 'Nội dung quá dài (tối đa ' + max + ' ký tự).' };
        // simple spam guard: a single character repeated many times
        if (/(.)\1{9,}/.test(raw))
            return { ok: false, reason: 'Tin nhắn nhìn giống spam, hãy viết lại nhé.' };
        if (hasProfanity(raw))
            return {
                ok: false,
                reason: 'Tin nhắn có từ ngữ không phù hợp. Hãy viết lại lịch sự nhé! 😊',
            };
        var pii = findPII(raw);
        if (pii)
            return {
                ok: false,
                reason: 'Để an toàn, đừng chia sẻ ' + pii + ' nhé. Tin nhắn chưa được gửi.',
            };
        return { ok: true };
    }

    // Stricter gate for names (usernames, group names): no profanity, no contact info.
    function checkName(name, opts) {
        opts = opts || {};
        var t = String(name == null ? '' : name).trim();
        if (!t) return { ok: false, reason: 'Tên không được để trống.' };
        if (t.length > (opts.maxLength || 40)) return { ok: false, reason: 'Tên quá dài.' };
        if (hasProfanity(t))
            return { ok: false, reason: 'Tên có từ ngữ không phù hợp, hãy chọn tên khác nhé.' };
        if (findPII(t))
            return { ok: false, reason: 'Tên không được chứa email, số điện thoại hay liên kết.' };
        return { ok: true };
    }

    window.ContentSafety = {
        check: check,
        checkName: checkName,
        hasProfanity: hasProfanity,
        findPII: findPII,
    };
})();
