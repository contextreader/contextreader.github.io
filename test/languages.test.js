// The language list: coverage of what Gemini documents, and the integrity of
// every entry — the things a one-line pull request can get wrong.
const L = require('../lib/languages.js');
let pass = 0, fail = 0;
const ok = (l, c, extra) => { c?pass++:fail++; console.log(`  ${c?'PASS':'FAIL'}  ${l}`); if(!c && extra !== undefined) console.log('    ', extra); };

// Google's list, verbatim codes: "All the Gemini models can understand and
// respond in the following languages" — Vertex AI docs, Language support,
// fetched 2026-09-15. `iw` is ours as `he`; `zh` covers Simplified and
// Traditional, which are `zh` and `zh-TW` here.
const GOOGLE = ('af sq am ar hy as az eu be bn bs bg ca ceb zh co hr cs da dv nl en eo et fil fi fr fy gl ka de el '
    + 'gu ht ha haw iw hi hmn hu is ig id ga it ja jv kn kk km ko kri ku ky lo la lv lt lb mk mg ms ml mt mi mr '
    + 'mni-Mtei mn my ne no ny or ps fa pl pt pa ro ru sm gd sr st sn sd si sk sl so es su sw sv tg ta te th tr '
    + 'uk ur ug uz vi cy xh yi yo zu').split(' ');
const OURS = { iw: 'he' };

const codes = Object.keys(L.LANGUAGES);
const langs = L.listLangs();

console.log('coverage:');
const missing = GOOGLE.map((c) => OURS[c] || c).filter((c) => !L.LANGUAGES[c]);
ok(`every language Google lists is offered (${GOOGLE.length})`, missing.length === 0, missing);
ok('Traditional Chinese is its own entry', !!L.LANGUAGES['zh-TW']);
const extra = codes.filter((c) => !GOOGLE.includes(c) && !Object.values(OURS).includes(c) && c !== 'zh-TW');
ok('nothing offered that Google does not list', extra.length === 0, extra);
ok('past 100', codes.length >= 100, codes.length);

console.log('integrity:');
const lower = codes.map((c) => c.toLowerCase());
ok('codes unique, ignoring case', new Set(lower).size === codes.length);
ok('every entry has a name and a native name', langs.every((l) => l.name && l.nativeName));
ok('English names unique', new Set(langs.map((l) => l.name)).size === langs.length);
const undetected = langs.filter((l) => !L.isScript(l.nativeName, l.code)).map((l) => `${l.code}:${l.nativeName}`);
// A native name written in its own script is the cheapest proof the typeset
// is the right one — a Bengali-script language pointed at Devanagari fails here.
ok('each native name is recognised as its own typeset\'s script', undetected.length === 0, undetected);
const used = new Set(Object.values(L.LANGUAGES).map((p) => p.typeset));
ok('no typeset left unused', Object.keys(L.TYPESETS).every((t) => used.has(t)), Object.keys(L.TYPESETS).filter((t) => !used.has(t)));
ok('only en and si are tuned', langs.filter((l) => l.tuned).map((l) => l.code).sort().join() === 'en,si');
ok('no untuned entry smuggles in examples', langs.filter((l) => !l.tuned).every((l) => l.examples.length === 0));

console.log('typesets:');
const RTL = ['arabic', 'hebrew', 'thaana'];
ok('right-to-left is exactly Arabic, Hebrew and Thaana', Object.entries(L.TYPESETS).every(([k, t]) => t.rtl === RTL.includes(k)));
ok('every RTL language is marked rtl', ['ar', 'fa', 'ur', 'ps', 'sd', 'ug', 'he', 'yi', 'dv'].every((c) => L.getLang(c).rtl));
const badFamily = Object.entries(L.TYPESETS).filter(([, t]) =>
    !(t.family === null ? t.font === 'inherit' : /^Noto\+Sans\+[A-Za-z+]+:wght@400;600;800$/.test(t.family)
        && t.font === `'${t.family.split(':')[0].replace(/\+/g, ' ')}', sans-serif`));
// A family name Google does not have is the one thing the css2 API rejects
// (400). All of these were requested live on 15 Sep and returned 200.
ok('every family is a Noto Sans request whose CSS name matches it', badFamily.length === 0, badFamily.map(([k]) => k));
ok('Chinese scripts load different families', L.getLang('zh').family !== L.getLang('zh-TW').family);
ok('scripts using \\p{} carry the u flag', Object.values(L.TYPESETS).every((t) => !/\\p\{/.test(t.script.source) || t.script.flags.includes('u')));
ok('isScript works with a \\p{} typeset', L.isScript('ελληνικά', 'el') && !L.isScript('ελληνικά', 'ru'));
ok('Traditional characters count as the tc typeset', L.isScript('繁體中文', 'zh-TW'));

console.log('Latin script detection covers Latin, not just ASCII:');
// [A-Za-z] said Turkish kıyı and Polish Łódź were not Latin script. Found 16 Sep
// against the real extension.
for (const [text, code] of [['kıyı', 'tr'], ['Işık', 'tr'], ['Łódź', 'pl'], ['café', 'fr'],
                            ['Tiếng Việt', 'vi'], ['Yorùbá', 'yo'], ['Gàidhlig', 'gd'], ['constrained', 'en']])
    ok(`${text} is Latin script`, L.isScript(text, code), L.isScript(text, code));
ok('other scripts are still not Latin', !['පරිසරය', '日本語', 'Привет', 'العربية'].some((t) => L.isScript(t, 'en')));

console.log('browser locale → language:');
for (const [ui, want] of [
    ['zh-TW', 'zh-TW'], ['zh-HK', 'zh-TW'], ['zh-CN', 'zh'], ['zh', 'zh'],
    ['he', 'he'], ['iw', 'he'], ['nb', 'no'], ['fil', 'fil'], ['tl', 'fil'],
    ['pt-BR', 'pt'], ['es-419', 'es'], ['en-GB', 'en'], ['si-LK', 'si'], ['EN-us', 'en'],
    ['mni-Mtei', 'mni-Mtei'], ['xx', 'en'], ['', 'en'], [undefined, 'en'],
]) ok(`${ui} → ${want}`, L.detectDefault(ui) === want, L.detectDefault(ui));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
