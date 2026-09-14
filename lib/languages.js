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
// Two tables. TYPESETS holds how a writing system is rendered and recognised —
// font, Google Fonts family, detection range, direction — defined once.
// LANGUAGES holds what is specific to a language and names its typeset. The
// values in LANGUAGES are therefore NOT getLang-shaped: always read a language
// through getLang(), which merges the two.
//
// Adding a language is meant to be a small, self-contained pull request.
// Usually it is one line in LANGUAGES naming an existing typeset; a writing
// system not listed yet needs one TYPESETS entry as well. Ideally it comes with
// four or five examples written by someone who actually speaks it. Please do
// not machine-translate the examples — the whole point of them is that a native
// speaker judged the wrong answer to be wrong.

(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.CRLanguages = api;
})(typeof self !== 'undefined' ? self : this, function () {

    // font   — CSS stack applied to text in this typeset
    // family — Google Fonts family to load, or null when Inter already covers it
    // script — test for text written in it
    // rtl    — right-to-left
    //
    // These are render bundles, not Unicode scripts. Chinese and Japanese both
    // use Han, but need different Noto families to draw it the way their
    // readers expect — keep `sc` and `jp` apart even though their ranges overlap.
    const TYPESETS = {
        // Inter already ships Latin and Cyrillic, so these load no extra font.
        latin:      { font: 'inherit', family: null, script: /[A-Za-z]/, rtl: false },
        cyrillic:   { font: 'inherit', family: null, script: /[Ѐ-ӿ]/, rtl: false },
        sinhala:    { font: "'Noto Sans Sinhala', sans-serif", family: 'Noto+Sans+Sinhala:wght@400;600;800', script: /[඀-෿]/, rtl: false },
        tamil:      { font: "'Noto Sans Tamil', sans-serif", family: 'Noto+Sans+Tamil:wght@400;600;800', script: /[஀-௿]/, rtl: false },
        devanagari: { font: "'Noto Sans Devanagari', sans-serif", family: 'Noto+Sans+Devanagari:wght@400;600;800', script: /[ऀ-ॿ]/, rtl: false },
        arabic:     { font: "'Noto Sans Arabic', sans-serif", family: 'Noto+Sans+Arabic:wght@400;600;800', script: /[؀-ۿݐ-ݿ]/, rtl: true },
        sc:         { font: "'Noto Sans SC', sans-serif", family: 'Noto+Sans+SC:wght@400;600;800', script: /[一-鿿]/, rtl: false },
        jp:         { font: "'Noto Sans JP', sans-serif", family: 'Noto+Sans+JP:wght@400;600;800', script: /[぀-ヿ一-鿿]/, rtl: false },
        kr:         { font: "'Noto Sans KR', sans-serif", family: 'Noto+Sans+KR:wght@400;600;800', script: /[가-힯ᄀ-ᇿ]/, rtl: false },
    };

    // typeset — key into TYPESETS
    // tuned   — has contrastive examples checked by a speaker (default false)
    // examples— those examples (default none)
    const LANGUAGES = {
        si: {
            name: 'Sinhala', nativeName: 'සිංහල', typeset: 'sinhala', tuned: true,
            examples: [
                { term: 'specimens', domain: 'paleontology', right: 'නිදර්ශක', wrong: 'සාම්පල' },
                { term: 'bank',      domain: 'finance',      right: 'බැංකුව',  wrong: 'ඉවුර' },
                { term: 'execute',   domain: 'programming',  right: 'ධාවනය කරනව', wrong: 'ක්‍රියාත්මක කරනව' },
                { term: 'settlement',domain: 'history',      right: 'ජනාවාසය', wrong: 'පියවීම' },
            ],
        },
        // English is a target in its own right: a reader stuck on a hard English
        // word wants it in plainer English, not translated. Its examples are
        // about picking the right SENSE, which is the same job the other packs
        // do across languages. Note `tuned` means "has examples a speaker
        // checked" — only Sinhala's have been measured against model output.
        en: {
            name: 'English', nativeName: 'English', typeset: 'latin', tuned: true,
            examples: [
                { term: 'bank',     domain: 'finance',      right: 'a financial institution', wrong: 'the edge of a river' },
                { term: 'execute',  domain: 'programming',  right: 'run a program',           wrong: 'put someone to death' },
                { term: 'culture',  domain: 'microbiology', right: 'a growth of microorganisms grown in a lab', wrong: 'the arts and customs of a society' },
                { term: 'novel',    domain: 'science',      right: 'new, not seen before',    wrong: 'a long work of fiction' },
            ],
        },
        ta: { name: 'Tamil',                nativeName: 'தமிழ்',     typeset: 'tamil' },
        hi: { name: 'Hindi',                nativeName: 'हिन्दी',     typeset: 'devanagari' },
        ar: { name: 'Arabic',               nativeName: 'العربية',   typeset: 'arabic' },
        zh: { name: 'Chinese (Simplified)', nativeName: '简体中文',   typeset: 'sc' },
        ja: { name: 'Japanese',             nativeName: '日本語',     typeset: 'jp' },
        ko: { name: 'Korean',               nativeName: '한국어',     typeset: 'kr' },
        es: { name: 'Spanish',              nativeName: 'Español',   typeset: 'latin' },
        fr: { name: 'French',               nativeName: 'Français',  typeset: 'latin' },
        pt: { name: 'Portuguese',           nativeName: 'Português', typeset: 'latin' },
        de: { name: 'German',               nativeName: 'Deutsch',   typeset: 'latin' },
        ru: { name: 'Russian',              nativeName: 'Русский',   typeset: 'cyrillic' },
    };

    // English, not Sinhala: a browser whose locale we have no pack for should
    // land somewhere readable rather than in a language it cannot read. The
    // welcome page asks on first run regardless.
    const DEFAULT_LANG = 'en';

    // The one place the two tables meet. Both branches go through here — the
    // fallback must not hand back a raw LANGUAGES entry, which has a typeset
    // name where callers expect a font.
    function getLang(code) {
        if (!LANGUAGES[code]) code = DEFAULT_LANG;
        const pack = LANGUAGES[code];
        const { font, family, script, rtl } = TYPESETS[pack.typeset];
        return {
            code, name: pack.name, nativeName: pack.nativeName,
            font, family, script, rtl,
            tuned: !!pack.tuned, examples: pack.examples || [],
        };
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

    // Is this text written in the pack's script? Used to decide whether the
    // language's font applies to a piece of SOURCE text — the target-language
    // output always gets it, but the word the reader highlighted might be in
    // any script at all.
    function isScript(text, code) {
        const { script } = getLang(code);
        if (!script) return false;
        const s = String(text || '');
        if (!s) return false;
        const hits = (s.match(new RegExp(script.source, 'g')) || []).length;
        const letters = (s.match(/[^\s\d\p{P}\p{S}]/gu) || []).length;
        return letters > 0 && hits / letters > 0.5;
    }

    // Browser UI language -> a pack we actually have, falling back to English.
    function detectDefault(uiLang) {
        const code = String(uiLang || '').toLowerCase().split('-')[0];
        return LANGUAGES[code] ? code : DEFAULT_LANG;
    }

    return { LANGUAGES, TYPESETS, DEFAULT_LANG, getLang, listLangs, examplesBlock, detectDefault, isScript };
});
