// lib/languages.js — the one definition of what languages exist.
//
// Loaded by the service worker (importScripts), the content script (declared in
// manifest content_scripts ahead of content.js) and the extension pages. There
// is deliberately one copy: the sibling multi-language build duplicated its
// language list across six files and they drifted — one of them still says
// "Chinese" where the others say "Chinese (Simplified)".
//
// `examples` is the part that matters for answer quality. The lookup prompt
// teaches the model to pick the domain-correct sense rather than the dictionary
// one, and it does that with worked contrastive pairs. CLAUDE.md records the
// measurement: without them the model returned වගාව instead of රුධිර වගාව for
// "blood culture". A language with no examples still works — it just does not
// get that correction, which is why `tuned` exists and why Settings says so.
//
// Adding a language is meant to be a small, self-contained pull request:
// one entry here, ideally with four or five examples written by someone who
// actually speaks it. Please do not machine-translate the examples — the whole
// point of them is that a native speaker judged the wrong answer to be wrong.

(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.CRLanguages = api;
})(typeof self !== 'undefined' ? self : this, function () {

    // font  — CSS stack applied to text in this language
    // family— Google Fonts family to load, or null when Inter already covers it
    // rtl   — right-to-left script
    // tuned — has contrastive examples checked by a speaker
    const LANGUAGES = {
        si: {
            name: 'Sinhala', nativeName: 'සිංහල',
            font: "'Noto Sans Sinhala', sans-serif", family: 'Noto+Sans+Sinhala:wght@400;600;800',
            rtl: false, tuned: true,
            examples: [
                { term: 'specimens', domain: 'paleontology', right: 'නිදර්ශක', wrong: 'සාම්පල' },
                { term: 'bank',      domain: 'finance',      right: 'බැංකුව',  wrong: 'ඉවුර' },
                { term: 'execute',   domain: 'programming',  right: 'ධාවනය කරනව', wrong: 'ක්‍රියාත්මක කරනව' },
                { term: 'settlement',domain: 'history',      right: 'ජනාවාසය', wrong: 'පියවීම' },
            ],
        },
        ta: {
            name: 'Tamil', nativeName: 'தமிழ்',
            font: "'Noto Sans Tamil', sans-serif", family: 'Noto+Sans+Tamil:wght@400;600;800',
            rtl: false, tuned: false, examples: [],
        },
        hi: {
            name: 'Hindi', nativeName: 'हिन्दी',
            font: "'Noto Sans Devanagari', sans-serif", family: 'Noto+Sans+Devanagari:wght@400;600;800',
            rtl: false, tuned: false, examples: [],
        },
        ar: {
            name: 'Arabic', nativeName: 'العربية',
            font: "'Noto Sans Arabic', sans-serif", family: 'Noto+Sans+Arabic:wght@400;600;800',
            rtl: true, tuned: false, examples: [],
        },
        zh: {
            name: 'Chinese (Simplified)', nativeName: '简体中文',
            font: "'Noto Sans SC', sans-serif", family: 'Noto+Sans+SC:wght@400;600;800',
            rtl: false, tuned: false, examples: [],
        },
        ja: {
            name: 'Japanese', nativeName: '日本語',
            font: "'Noto Sans JP', sans-serif", family: 'Noto+Sans+JP:wght@400;600;800',
            rtl: false, tuned: false, examples: [],
        },
        ko: {
            name: 'Korean', nativeName: '한국어',
            font: "'Noto Sans KR', sans-serif", family: 'Noto+Sans+KR:wght@400;600;800',
            rtl: false, tuned: false, examples: [],
        },
        // Inter already ships Latin and Cyrillic, so these load no extra font.
        es: { name: 'Spanish',    nativeName: 'Español',   font: 'inherit', family: null, rtl: false, tuned: false, examples: [] },
        fr: { name: 'French',     nativeName: 'Français',  font: 'inherit', family: null, rtl: false, tuned: false, examples: [] },
        pt: { name: 'Portuguese', nativeName: 'Português', font: 'inherit', family: null, rtl: false, tuned: false, examples: [] },
        de: { name: 'German',     nativeName: 'Deutsch',   font: 'inherit', family: null, rtl: false, tuned: false, examples: [] },
        ru: { name: 'Russian',    nativeName: 'Русский',   font: 'inherit', family: null, rtl: false, tuned: false, examples: [] },
    };

    const DEFAULT_LANG = 'si';

    function getLang(code) {
        const pack = LANGUAGES[code];
        if (!pack) return Object.assign({ code: DEFAULT_LANG }, LANGUAGES[DEFAULT_LANG]);
        return Object.assign({ code }, pack);
    }

    // Ordered for the picker: tuned languages first, then alphabetically by
    // English name. A tester should not have to hunt for the one that works best.
    function listLangs() {
        return Object.keys(LANGUAGES)
            .map(getLang)
            .sort((a, b) => (b.tuned - a.tuned) || a.name.localeCompare(b.name));
    }

    // Rendered into the prompt. Empty for an untuned language, which is correct:
    // an empty block is better than invented examples nobody has checked.
    function examplesBlock(code) {
        const { examples, name } = getLang(code);
        if (!examples.length) return '';
        return examples
            .map((e) => `- Match the domain: "${e.term}" in ${e.domain} = ${e.right}, NOT ${e.wrong}`)
            .join('\n');
    }

    // Browser UI language -> a pack we actually have, falling back to Sinhala.
    function detectDefault(uiLang) {
        const code = String(uiLang || '').toLowerCase().split('-')[0];
        return LANGUAGES[code] ? code : DEFAULT_LANG;
    }

    return { LANGUAGES, DEFAULT_LANG, getLang, listLangs, examplesBlock, detectDefault };
});
