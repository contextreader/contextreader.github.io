// The language picker: matching, and the search → list → choose behaviour.
// The DOM here is a fake select that understands <option> markup well enough
// to hold a value and a selectedIndex — it renders nothing, so this proves the
// logic, not the look. The look needs a browser (HANDOFF).
const P = require('../lib/lang-picker.js');
const L = require('../lib/languages.js');
let pass = 0, fail = 0;
const ok = (l, c, extra) => { c?pass++:fail++; console.log(`  ${c?'PASS':'FAIL'}  ${l}`); if(!c && extra !== undefined) console.log('    ', extra); };

const LANGS = L.listLangs();
const codes = (q) => P.filterLangs(LANGS, q).map((l) => l.code);

console.log('matching:');
ok('empty query keeps every language in order', codes('').join() === LANGS.map((l) => l.code).join());
ok('whitespace query is empty', codes('   ').length === LANGS.length);
ok('English name finds a native-script language', codes('hindi')[0] === 'hi', codes('hindi'));
ok('prefix of English name', codes('hin')[0] === 'hi', codes('hin'));
ok('native name', codes('සිංහල')[0] === 'si', codes('සිංහල'));
ok('native prefix', codes('සිං')[0] === 'si', codes('සිං'));
ok('code, exact', codes('ja')[0] === 'ja', codes('ja'));
ok('case-insensitive', codes('GERMAN')[0] === 'de', codes('GERMAN'));
ok('accents ignored: espanol → es', codes('espanol')[0] === 'es', codes('espanol'));
ok('accents ignored: francais → fr', codes('francais')[0] === 'fr', codes('francais'));
ok('word inside a name: simplified → zh', codes('simplified')[0] === 'zh', codes('simplified'));
ok('nonsense matches nothing', codes('qqqq').length === 0);
ok('not mid-word: "hin" does not match Chinese', !codes('hin').includes('zh'), codes('hin'));
ok('exact code outranks a name prefix ("de" → German before anything else)', codes('de')[0] === 'de', codes('de'));
// Sinhala vowel signs are combining marks; stripping them would make සි match ස.
ok('non-Latin combining marks are kept', P.fold('සි') !== P.fold('ස'));

console.log('labels and description:');
ok('native and English name', P.label(L.getLang('hi')) === 'हिन्दी — Hindi  (community)', P.label(L.getLang('hi')));
ok('no "English — English"', P.label(L.getLang('en')) === 'English', P.label(L.getLang('en')));
ok('tuned has no community tag', !/community/.test(P.label(L.getLang('si'))));
ok('tuned description', /worked examples/.test(P.describe(L.getLang('si'))));
ok('community description', /Community language/.test(P.describe(L.getLang('ta'))));
ok('no language, no description', P.describe(undefined) === '');

// ---- fake DOM -------------------------------------------------------------
function fakeEl(id) {
    return {
        id, attrs: {}, listeners: {}, hidden: false, value: '', textContent: '',
        setAttribute(k, v) { this.attrs[k] = String(v); },
        removeAttribute(k) { delete this.attrs[k]; },
        addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
        dispatchEvent(e) { (this.listeners[e.type] || []).forEach((f) => f(e)); },
    };
}
function fakeSelect(id) {
    const el = fakeEl(id);
    let html = '', idx = -1;
    const opts = () => [...html.matchAll(/<option value="([^"]*)">/g)].map((m) => ({ value: m[1] }));
    Object.defineProperties(el, {
        innerHTML: { get: () => html, set: (v) => { html = String(v); idx = opts().length ? 0 : -1; } },
        options: { get: opts },
        selectedIndex: { get: () => idx, set: (i) => { idx = i; } },
        value: { get: () => (opts()[idx] || { value: '' }).value,
                 set: (v) => { idx = opts().findIndex((o) => o.value === v); } },
    });
    return el;
}
const key = (el, k) => { let prevented = false;
    el.dispatchEvent({ type: 'keydown', key: k, preventDefault() { prevented = true; } }); return prevented; };
const type = (el, v) => { el.value = v; el.dispatchEvent({ type: 'input' }); };

function setup(current = 'si') {
    const select = fakeSelect('sel'), input = fakeEl('in'), status = fakeEl('st');
    const saved = [];
    select.addEventListener('change', () => saved.push(select.value));   // the page's handler
    const picker = P.attach({ select, input, status, languages: LANGS, current });
    return { select, input, status, saved, picker };
}

console.log('attach — idle:');
{
    const { select, input, status, saved } = setup('si');
    ok('renders every language', select.options.length === LANGS.length, select.options.length);
    ok('current language selected', select.value === 'si', select.value);
    ok('dropdown, not a list', !('size' in select.attrs));
    ok('no status text', status.textContent === '');
    ok('search field points at the select', input.attrs['aria-controls'] === 'sel');
    ok('status is announced', status.attrs['aria-live'] === 'polite');
    ok('nothing saved on attach', saved.length === 0);
    ok('arrow keys left alone when not searching', key(input, 'ArrowDown') === false);
}

console.log('attach — search and choose with Enter:');
{
    const { select, input, status, saved } = setup('si');
    type(input, 'hin');
    ok('becomes a list', select.attrs.size === '2', select.attrs.size);
    ok('only the match', select.options.map((o) => o.value).join() === 'hi', select.options.map((o) => o.value));
    ok('first match highlighted', select.value === 'hi');
    ok('status counts', status.textContent === `1 of ${LANGS.length} · Enter to choose`, status.textContent);
    ok('typing saves nothing', saved.length === 0);
    ok('Enter is handled', key(input, 'Enter') === true);
    ok('Enter saves exactly once', saved.join() === 'hi', saved);
    ok('collapses back to a dropdown', !('size' in select.attrs) && select.options.length === LANGS.length);
    ok('chosen language stays selected', select.value === 'hi', select.value);
    ok('search field cleared', input.value === '');
    ok('status cleared', status.textContent === '');
}

console.log('attach — arrows, Escape, no match:');
{
    const { select, input, status, saved } = setup('si');
    type(input, 's');    // Sinhala, Spanish, Chinese (Simplified)
    const n = select.options.length;
    ok('several matches listed', n > 2, n);
    ok('list height capped', Number(select.attrs.size) <= 6, select.attrs.size);
    key(input, 'ArrowDown');
    ok('ArrowDown moves the highlight', select.selectedIndex === 1, select.selectedIndex);
    key(input, 'ArrowUp'); key(input, 'ArrowUp');
    ok('ArrowUp wraps to the last', select.selectedIndex === n - 1, select.selectedIndex);
    ok('arrows save nothing', saved.length === 0);
    key(input, 'Escape');
    ok('Escape collapses', !('size' in select.attrs));
    ok('Escape keeps the current language', select.value === 'si', select.value);
    ok('Escape saves nothing', saved.length === 0);

    type(input, 'qqqq');
    ok('no match hides the list', select.hidden === true);
    ok('no match says so', /No language matches/.test(status.textContent), status.textContent);
    ok('Enter with no match does nothing', (key(input, 'Enter'), saved.length === 0));
    type(input, '');
    ok('clearing the field restores the dropdown', select.hidden === false && !('size' in select.attrs) && select.value === 'si');
}

console.log('attach — click in the list:');
{
    const { select, input, saved } = setup('si');
    type(input, 'jap');
    select.value = 'ja';
    select.dispatchEvent({ type: 'change' });   // what the browser fires on a click
    ok('click saves exactly once (no second change fired)', saved.join() === 'ja', saved);
    ok('click collapses and keeps the choice', !('size' in select.attrs) && select.value === 'ja', select.value);
    ok('click clears the search', input.value === '');
    type(input, 'x'); key(input, 'Escape');
    ok('Escape afterwards returns to the clicked language, not the original', select.value === 'ja', select.value);
}

console.log('attach — plain dropdown change and setCurrent:');
{
    const { select, input, saved, picker } = setup('si');
    select.value = 'fr'; select.dispatchEvent({ type: 'change' });
    type(input, 'ger'); key(input, 'Escape');
    ok('dropdown choice becomes the one Escape returns to', select.value === 'fr', select.value);
    picker.setCurrent('ko');
    ok('setCurrent selects when idle', select.value === 'ko', select.value);
    type(input, 'ger'); picker.setCurrent('ar');
    ok('setCurrent does not disturb an active search', select.options.map((o) => o.value).join() === 'de');
    key(input, 'Escape');
    ok('…but applies once it ends', select.value === 'ar', select.value);
    ok('only the explicit dropdown change was saved', saved.join() === 'fr', saved);
}

console.log('every page that picks a language is wired:');
// Only Settings runs under a DOM shim. The popup and the welcome page do not,
// and the welcome picker shipped as an empty <select> for a day because
// nothing loaded it — so at least hold the script order and the ids.
{
    const fs = require('fs');
    const path = require('path');
    const ROOT = path.join(__dirname, '..');
    const pages = {
        'options.html': { js: 'options.js', ids: ['opt-language', 'opt-language-search', 'opt-language-count'] },
        'popup.html':   { js: 'popup.js',   ids: ['popup-language', 'popup-language-search', 'popup-language-count'] },
        'welcome.html': { js: 'welcome.js', ids: ['welcome-lang', 'welcome-lang-search', 'welcome-lang-count', 'welcome-lang-note'] },
    };
    for (const [page, { js, ids }] of Object.entries(pages)) {
        const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
        const src = fs.readFileSync(path.join(ROOT, js), 'utf8');
        const picker = html.indexOf('src="lib/lang-picker.js"'), own = html.indexOf(`src="${js}"`);
        ok(`${page} loads the picker before ${js}`, picker !== -1 && own !== -1 && picker < own);
        ok(`${js} attaches the picker`, /CRLangPicker\.attach\(/.test(src));
        const missing = ids.filter((id) => !html.includes(`id="${id}"`) || !src.includes(`'${id}'`));
        ok(`${page} and ${js} agree on ids`, missing.length === 0, missing);
    }
    const pkg = fs.readFileSync(path.join(ROOT, 'scripts/package.mjs'), 'utf8');
    ok('the package includes the picker', pkg.includes("'lib/lang-picker.js'"));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
