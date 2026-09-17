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
// "blood culture" — though Ian, a native speaker, rejected that target on 16 Sep,
// so treat the effect as real and the example as unverified (CLAUDE.md).
// A language with no examples still works — it just does not
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

    // font    — CSS stack applied to text in this typeset
    // family  — Google Fonts family, or null when Inter already covers it
    // bundled — the files ship in fonts/ (see lib/fonts.js), so nothing is
    //           fetched and no page's CSP can refuse them. CJK is not bundled:
    //           those families are megabytes each and every OS ships good ones.
    // script — test for text written in it
    // rtl    — right-to-left
    //
    // These are render bundles, not Unicode scripts. Chinese and Japanese both
    // use Han, but need different Noto families to draw it the way their
    // readers expect — keep `sc` and `jp` apart even though their ranges overlap.
    const TYPESETS = {
        // Inter already ships Latin and Cyrillic, so these load no extra font.
        // \p{Script=Latin}, not [A-Za-z]: the ASCII range answered "no" for
        // Turkish kıyı, Işık and Polish Łódź — Latin-script words in Latin-script
        // languages. Found 16 Sep by the session capturing real answers.
        latin:      { font: 'inherit', family: null, script: /\p{Script=Latin}/u, rtl: false },
        cyrillic:   { font: 'inherit', family: null, script: /[Ѐ-ӿ]/, rtl: false },
        sinhala:    { font: "'Noto Sans Sinhala', sans-serif", family: 'Noto+Sans+Sinhala:wght@400;600;800', script: /[඀-෿]/, bundled: true, rtl: false },
        tamil:      { font: "'Noto Sans Tamil', sans-serif", family: 'Noto+Sans+Tamil:wght@400;600;800', script: /[஀-௿]/, bundled: true, rtl: false },
        devanagari: { font: "'Noto Sans Devanagari', sans-serif", family: 'Noto+Sans+Devanagari:wght@400;600;800', script: /[ऀ-ॿ]/, bundled: true, rtl: false },
        arabic:     { font: "'Noto Sans Arabic', sans-serif", family: 'Noto+Sans+Arabic:wght@400;600;800', script: /[؀-ۿݐ-ݿ]/, bundled: true, rtl: true },
        sc:         { font: "'Noto Sans SC', sans-serif", family: 'Noto+Sans+SC:wght@400;600;800', script: /[一-鿿]/, rtl: false },
        jp:         { font: "'Noto Sans JP', sans-serif", family: 'Noto+Sans+JP:wght@400;600;800', script: /[぀-ヿ一-鿿]/, rtl: false },
        kr:         { font: "'Noto Sans KR', sans-serif", family: 'Noto+Sans+KR:wght@400;600;800', script: /[가-힯ᄀ-ᇿ]/, rtl: false },

        // Added for the Gemini language list (15 Sep). The first nine keep their
        // hand-written ranges, which tests pin; these use Unicode Script
        // properties, which is what the hand ranges were approximating.
        // Inter covers Greek too.
        greek:      { font: 'inherit', family: null, script: /\p{Script=Greek}/u, rtl: false },
        tc:         { font: "'Noto Sans TC', sans-serif", family: 'Noto+Sans+TC:wght@400;600;800', script: /\p{Script=Han}/u, rtl: false },
        armenian:   { font: "'Noto Sans Armenian', sans-serif", family: 'Noto+Sans+Armenian:wght@400;600;800', script: /\p{Script=Armenian}/u, bundled: true, rtl: false },
        georgian:   { font: "'Noto Sans Georgian', sans-serif", family: 'Noto+Sans+Georgian:wght@400;600;800', script: /\p{Script=Georgian}/u, bundled: true, rtl: false },
        hebrew:     { font: "'Noto Sans Hebrew', sans-serif", family: 'Noto+Sans+Hebrew:wght@400;600;800', script: /\p{Script=Hebrew}/u, bundled: true, rtl: true },
        thaana:     { font: "'Noto Sans Thaana', sans-serif", family: 'Noto+Sans+Thaana:wght@400;600;800', script: /\p{Script=Thaana}/u, bundled: true, rtl: true },
        ethiopic:   { font: "'Noto Sans Ethiopic', sans-serif", family: 'Noto+Sans+Ethiopic:wght@400;600;800', script: /\p{Script=Ethiopic}/u, bundled: true, rtl: false },
        bengali:    { font: "'Noto Sans Bengali', sans-serif", family: 'Noto+Sans+Bengali:wght@400;600;800', script: /\p{Script=Bengali}/u, bundled: true, rtl: false },
        gujarati:   { font: "'Noto Sans Gujarati', sans-serif", family: 'Noto+Sans+Gujarati:wght@400;600;800', script: /\p{Script=Gujarati}/u, bundled: true, rtl: false },
        gurmukhi:   { font: "'Noto Sans Gurmukhi', sans-serif", family: 'Noto+Sans+Gurmukhi:wght@400;600;800', script: /\p{Script=Gurmukhi}/u, bundled: true, rtl: false },
        oriya:      { font: "'Noto Sans Oriya', sans-serif", family: 'Noto+Sans+Oriya:wght@400;600;800', script: /\p{Script=Oriya}/u, bundled: true, rtl: false },
        telugu:     { font: "'Noto Sans Telugu', sans-serif", family: 'Noto+Sans+Telugu:wght@400;600;800', script: /\p{Script=Telugu}/u, bundled: true, rtl: false },
        kannada:    { font: "'Noto Sans Kannada', sans-serif", family: 'Noto+Sans+Kannada:wght@400;600;800', script: /\p{Script=Kannada}/u, bundled: true, rtl: false },
        malayalam:  { font: "'Noto Sans Malayalam', sans-serif", family: 'Noto+Sans+Malayalam:wght@400;600;800', script: /\p{Script=Malayalam}/u, bundled: true, rtl: false },
        thai:       { font: "'Noto Sans Thai', sans-serif", family: 'Noto+Sans+Thai:wght@400;600;800', script: /\p{Script=Thai}/u, bundled: true, rtl: false },
        lao:        { font: "'Noto Sans Lao', sans-serif", family: 'Noto+Sans+Lao:wght@400;600;800', script: /\p{Script=Lao}/u, bundled: true, rtl: false },
        khmer:      { font: "'Noto Sans Khmer', sans-serif", family: 'Noto+Sans+Khmer:wght@400;600;800', script: /\p{Script=Khmer}/u, bundled: true, rtl: false },
        myanmar:    { font: "'Noto Sans Myanmar', sans-serif", family: 'Noto+Sans+Myanmar:wght@400;600;800', script: /\p{Script=Myanmar}/u, bundled: true, rtl: false },
        meetei:     { font: "'Noto Sans Meetei Mayek', sans-serif", family: 'Noto+Sans+Meetei+Mayek:wght@400;600;800', script: /\p{Script=Meetei_Mayek}/u, bundled: true, rtl: false },
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

        // The rest of the languages Google documents every Gemini model as able
        // to understand and respond in (Vertex AI "Language support", fetched
        // 15 Sep 2026). None is tuned: no speaker has checked examples for them,
        // and Settings says so. Names keep Google's alternates in brackets so a
        // search for either finds them. Codes follow Chrome's UI locales where
        // Google's differ: `he` not `iw`. Chinese is listed once by Google for
        // both scripts; it is two entries here because it renders as two.
        'zh-TW':    { name: 'Chinese (Traditional)', nativeName: '繁體中文', typeset: 'tc' },
        af:         { name: 'Afrikaans',             nativeName: 'Afrikaans',        typeset: 'latin' },
        sq:         { name: 'Albanian',              nativeName: 'Shqip',            typeset: 'latin' },
        am:         { name: 'Amharic',               nativeName: 'አማርኛ',             typeset: 'ethiopic' },
        hy:         { name: 'Armenian',              nativeName: 'Հայերեն',          typeset: 'armenian' },
        as:         { name: 'Assamese',              nativeName: 'অসমীয়া',            typeset: 'bengali' },
        az:         { name: 'Azerbaijani',           nativeName: 'Azərbaycanca',     typeset: 'latin' },
        eu:         { name: 'Basque',                nativeName: 'Euskara',          typeset: 'latin' },
        be:         { name: 'Belarusian',            nativeName: 'Беларуская',       typeset: 'cyrillic' },
        bn:         { name: 'Bengali',               nativeName: 'বাংলা',             typeset: 'bengali' },
        bs:         { name: 'Bosnian',               nativeName: 'Bosanski',         typeset: 'latin' },
        bg:         { name: 'Bulgarian',             nativeName: 'Български',        typeset: 'cyrillic' },
        ca:         { name: 'Catalan',               nativeName: 'Català',           typeset: 'latin' },
        ceb:        { name: 'Cebuano',               nativeName: 'Cebuano',          typeset: 'latin' },
        co:         { name: 'Corsican',              nativeName: 'Corsu',            typeset: 'latin' },
        hr:         { name: 'Croatian',              nativeName: 'Hrvatski',         typeset: 'latin' },
        cs:         { name: 'Czech',                 nativeName: 'Čeština',          typeset: 'latin' },
        da:         { name: 'Danish',                nativeName: 'Dansk',            typeset: 'latin' },
        dv:         { name: 'Dhivehi',               nativeName: 'ދިވެހި',            typeset: 'thaana' },
        nl:         { name: 'Dutch',                 nativeName: 'Nederlands',       typeset: 'latin' },
        eo:         { name: 'Esperanto',             nativeName: 'Esperanto',        typeset: 'latin' },
        et:         { name: 'Estonian',              nativeName: 'Eesti',            typeset: 'latin' },
        fil:        { name: 'Filipino (Tagalog)',    nativeName: 'Filipino',         typeset: 'latin' },
        fi:         { name: 'Finnish',               nativeName: 'Suomi',            typeset: 'latin' },
        fy:         { name: 'Frisian',               nativeName: 'Frysk',            typeset: 'latin' },
        gl:         { name: 'Galician',              nativeName: 'Galego',           typeset: 'latin' },
        ka:         { name: 'Georgian',              nativeName: 'ქართული',          typeset: 'georgian' },
        el:         { name: 'Greek',                 nativeName: 'Ελληνικά',         typeset: 'greek' },
        gu:         { name: 'Gujarati',              nativeName: 'ગુજરાતી',            typeset: 'gujarati' },
        ht:         { name: 'Haitian Creole',        nativeName: 'Kreyòl ayisyen',   typeset: 'latin' },
        ha:         { name: 'Hausa',                 nativeName: 'Hausa',            typeset: 'latin' },
        haw:        { name: 'Hawaiian',              nativeName: 'ʻŌlelo Hawaiʻi',   typeset: 'latin' },
        he:         { name: 'Hebrew',                nativeName: 'עברית',            typeset: 'hebrew' },
        hmn:        { name: 'Hmong',                 nativeName: 'Hmoob',            typeset: 'latin' },
        hu:         { name: 'Hungarian',             nativeName: 'Magyar',           typeset: 'latin' },
        is:         { name: 'Icelandic',             nativeName: 'Íslenska',         typeset: 'latin' },
        ig:         { name: 'Igbo',                  nativeName: 'Igbo',             typeset: 'latin' },
        id:         { name: 'Indonesian',            nativeName: 'Bahasa Indonesia', typeset: 'latin' },
        ga:         { name: 'Irish',                 nativeName: 'Gaeilge',          typeset: 'latin' },
        it:         { name: 'Italian',               nativeName: 'Italiano',         typeset: 'latin' },
        jv:         { name: 'Javanese',              nativeName: 'Basa Jawa',        typeset: 'latin' },
        kn:         { name: 'Kannada',               nativeName: 'ಕನ್ನಡ',             typeset: 'kannada' },
        kk:         { name: 'Kazakh',                nativeName: 'Қазақ тілі',       typeset: 'cyrillic' },
        km:         { name: 'Khmer',                 nativeName: 'ខ្មែរ',              typeset: 'khmer' },
        kri:        { name: 'Krio',                  nativeName: 'Krio',             typeset: 'latin' },
        ku:         { name: 'Kurdish (Kurmanji)',    nativeName: 'Kurdî',            typeset: 'latin' },
        ky:         { name: 'Kyrgyz',                nativeName: 'Кыргызча',         typeset: 'cyrillic' },
        lo:         { name: 'Lao',                   nativeName: 'ລາວ',              typeset: 'lao' },
        la:         { name: 'Latin',                 nativeName: 'Latina',           typeset: 'latin' },
        lv:         { name: 'Latvian',               nativeName: 'Latviešu',         typeset: 'latin' },
        lt:         { name: 'Lithuanian',            nativeName: 'Lietuvių',         typeset: 'latin' },
        lb:         { name: 'Luxembourgish',         nativeName: 'Lëtzebuergesch',   typeset: 'latin' },
        mk:         { name: 'Macedonian',            nativeName: 'Македонски',       typeset: 'cyrillic' },
        mg:         { name: 'Malagasy',              nativeName: 'Malagasy',         typeset: 'latin' },
        ms:         { name: 'Malay',                 nativeName: 'Bahasa Melayu',    typeset: 'latin' },
        ml:         { name: 'Malayalam',             nativeName: 'മലയാളം',           typeset: 'malayalam' },
        mt:         { name: 'Maltese',               nativeName: 'Malti',            typeset: 'latin' },
        mi:         { name: 'Maori',                 nativeName: 'Māori',            typeset: 'latin' },
        mr:         { name: 'Marathi',               nativeName: 'मराठी',             typeset: 'devanagari' },
        'mni-Mtei': { name: 'Meiteilon (Manipuri)',  nativeName: 'ꯃꯤꯇꯩꯂꯣꯟ',          typeset: 'meetei' },
        mn:         { name: 'Mongolian',             nativeName: 'Монгол',           typeset: 'cyrillic' },
        my:         { name: 'Myanmar (Burmese)',     nativeName: 'မြန်မာ',            typeset: 'myanmar' },
        ne:         { name: 'Nepali',                nativeName: 'नेपाली',             typeset: 'devanagari' },
        no:         { name: 'Norwegian',             nativeName: 'Norsk',            typeset: 'latin' },
        ny:         { name: 'Nyanja (Chichewa)',     nativeName: 'Chichewa',         typeset: 'latin' },
        or:         { name: 'Odia (Oriya)',          nativeName: 'ଓଡ଼ିଆ',              typeset: 'oriya' },
        ps:         { name: 'Pashto',                nativeName: 'پښتو',             typeset: 'arabic' },
        fa:         { name: 'Persian',               nativeName: 'فارسی',            typeset: 'arabic' },
        pl:         { name: 'Polish',                nativeName: 'Polski',           typeset: 'latin' },
        pa:         { name: 'Punjabi',               nativeName: 'ਪੰਜਾਬੀ',             typeset: 'gurmukhi' },
        ro:         { name: 'Romanian',              nativeName: 'Română',           typeset: 'latin' },
        sm:         { name: 'Samoan',                nativeName: 'Gagana Samoa',     typeset: 'latin' },
        gd:         { name: 'Scots Gaelic',          nativeName: 'Gàidhlig',         typeset: 'latin' },
        sr:         { name: 'Serbian',               nativeName: 'Српски',           typeset: 'cyrillic' },
        st:         { name: 'Sesotho',               nativeName: 'Sesotho',          typeset: 'latin' },
        sn:         { name: 'Shona',                 nativeName: 'chiShona',         typeset: 'latin' },
        sd:         { name: 'Sindhi',                nativeName: 'سنڌي',             typeset: 'arabic' },
        sk:         { name: 'Slovak',                nativeName: 'Slovenčina',       typeset: 'latin' },
        sl:         { name: 'Slovenian',             nativeName: 'Slovenščina',      typeset: 'latin' },
        so:         { name: 'Somali',                nativeName: 'Soomaali',         typeset: 'latin' },
        su:         { name: 'Sundanese',             nativeName: 'Basa Sunda',       typeset: 'latin' },
        sw:         { name: 'Swahili',               nativeName: 'Kiswahili',        typeset: 'latin' },
        sv:         { name: 'Swedish',               nativeName: 'Svenska',          typeset: 'latin' },
        tg:         { name: 'Tajik',                 nativeName: 'Тоҷикӣ',           typeset: 'cyrillic' },
        te:         { name: 'Telugu',                nativeName: 'తెలుగు',            typeset: 'telugu' },
        th:         { name: 'Thai',                  nativeName: 'ไทย',              typeset: 'thai' },
        tr:         { name: 'Turkish',               nativeName: 'Türkçe',           typeset: 'latin' },
        uk:         { name: 'Ukrainian',             nativeName: 'Українська',       typeset: 'cyrillic' },
        ur:         { name: 'Urdu',                  nativeName: 'اردو',             typeset: 'arabic' },
        ug:         { name: 'Uyghur',                nativeName: 'ئۇيغۇرچە',         typeset: 'arabic' },
        uz:         { name: 'Uzbek',                 nativeName: 'Oʻzbekcha',        typeset: 'latin' },
        vi:         { name: 'Vietnamese',            nativeName: 'Tiếng Việt',       typeset: 'latin' },
        cy:         { name: 'Welsh',                 nativeName: 'Cymraeg',          typeset: 'latin' },
        xh:         { name: 'Xhosa',                 nativeName: 'isiXhosa',         typeset: 'latin' },
        yi:         { name: 'Yiddish',               nativeName: 'ייִדיש',            typeset: 'hebrew' },
        yo:         { name: 'Yoruba',                nativeName: 'Yorùbá',           typeset: 'latin' },
        zu:         { name: 'Zulu',                  nativeName: 'isiZulu',          typeset: 'latin' },
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
        const { font, family, script, rtl, bundled } = TYPESETS[pack.typeset];
        return {
            code, name: pack.name, nativeName: pack.nativeName,
            font, family, script, rtl, bundled: !!bundled,
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
        // Keep the pattern's own flags: the newer typesets use \p{Script=…},
        // which is a syntax error without `u`.
        const flags = script.flags.includes('g') ? script.flags : script.flags + 'g';
        const hits = (s.match(new RegExp(script.source, flags)) || []).length;
        const letters = (s.match(/[^\s\d\p{P}\p{S}]/gu) || []).length;
        return letters > 0 && hits / letters > 0.5;
    }

    // Chrome UI locales whose code is not ours.
    const LOCALE_ALIASES = {
        iw: 'he', nb: 'no', nn: 'no', tl: 'fil', jw: 'jv',
        'zh-hk': 'zh-TW', 'zh-mo': 'zh-TW', 'zh-hant': 'zh-TW',
        'zh-cn': 'zh', 'zh-sg': 'zh', 'zh-hans': 'zh',
    };

    // Browser UI language -> a pack we actually have, falling back to English.
    // The full locale is tried before its base, so zh-TW lands on Traditional.
    function detectDefault(uiLang) {
        const full = String(uiLang || '').toLowerCase().replace(/_/g, '-');
        const byLower = {};
        for (const c of Object.keys(LANGUAGES)) byLower[c.toLowerCase()] = c;
        for (const k of [full, full.split('-')[0]]) {
            if (!k) continue;
            if (LOCALE_ALIASES[k]) return LOCALE_ALIASES[k];
            if (byLower[k]) return byLower[k];
        }
        return DEFAULT_LANG;
    }

    return { LANGUAGES, TYPESETS, DEFAULT_LANG, getLang, listLangs, examplesBlock, detectDefault, isScript };
});
