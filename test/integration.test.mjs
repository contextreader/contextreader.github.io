// Loads the WHOLE background.js against stubbed chrome/fetch and drives the
// real lookup path. The other tests slice functions out; this one proves the
// seams between them — specifically that a quota fallback actually reaches the
// bubble as _m, which every unit test above takes on faith.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// background.js logs every request; silence it so the assertions are readable.
const realLog = console.log, realWarn = console.warn, realErr = console.error;
const quiet = () => { console.log = () => {}; console.warn = () => {}; console.error = () => {}; };
const loud  = () => { console.log = realLog; console.warn = realWarn; console.error = realErr; };
const say   = (...a) => { loud(); realLog(...a); quiet(); };
const ROOT = join(HERE, '..');

let local = {}, session = {};
// Real chrome.storage accepts BOTH a callback and a promise. recordLatency
// uses the callback form, so a promise-only stub silently skips it.
const bag = (b) => {
    const read = (k) => {
        if (typeof k === 'string') return { [k]: b[k] };
        if (Array.isArray(k)) { const o = {}; for (const n of k) o[n] = b[n]; return o; }
        const o = {}; for (const [n, d] of Object.entries(k)) o[n] = b[n] ?? d; return o;
    };
    return {
        get: (k, cb) => { const v = read(k); if (cb) { cb(v); return; } return Promise.resolve(v); },
        set: (o, cb) => { Object.assign(b, o); if (cb) { cb(); return; } return Promise.resolve(); },
        remove: (k, cb) => { for (const n of [].concat(k)) delete b[n];
                             if (cb) { cb(); return; } return Promise.resolve(); },
    };
};

globalThis.self = globalThis;   // service-worker global

// background.js opens with importScripts('lib/languages.js'). Node has no such
// function, so provide one that actually loads the real module — a stub here
// would let a test pass against a language pack shape that no longer exists.
const { createRequire } = await import('node:module');
const req = createRequire(import.meta.url);
globalThis.importScripts = (...paths) => {
    for (const p of paths) Object.assign(globalThis, { CRLanguages: req(join(ROOT, p)) });
};

const noop = { addListener() {} };
globalThis.chrome = {
    runtime: { onMessage: noop, onInstalled: noop, id: 'testid',
               getManifest: () => ({ version: '2.1.0' }), sendMessage() {}, getURL: (p) => p },
    storage: { local: bag(local), session: bag(session) },
    contextMenus: { onClicked: noop, create() {}, removeAll() {} },
    tabs: { onUpdated: noop, sendMessage() {}, query() {} },
    action: { setBadgeText() {}, setBadgeBackgroundColor() {} },
    alarms: { onAlarm: noop, create() {} },
};

const fetchLog = [];
let fetchPlan = [];
globalThis.fetch = async (url, opts) => {
    // swallow the analytics beacon
    if (String(url).includes('google-analytics')) return { ok: true, json: async () => ({}) };
    fetchLog.push({ url: String(url), body: opts && opts.body ? JSON.parse(opts.body) : null });
    const next = fetchPlan.shift() || { status: 200, body: { candidates: [{ content: { parts: [{ text: '{}' }] } }] } };
    return { status: next.status, ok: next.status < 400, json: async () => next.body };
};

// background.js is a service worker with no exports; append some.
mkdirSync(join(HERE, '.generated'), { recursive: true });
const src = readFileSync(join(ROOT, 'background.js'), 'utf8');
const mod = join(HERE, '.generated', 'background.full.mjs');
writeFileSync(mod, src + '\nexport { lookupModeDefault, attachMeta, callGemini, getModelConfig,'
    + ' lookupDetails, lookupGeneral, lookupSimple, lookupContextSinhala };\n');
quiet();
const BG = await import(mod);

let pass = 0, fail = 0;
const ok = (l, c, x) => { c ? pass++ : fail++; say(`  ${c ? 'PASS' : 'FAIL'}  ${l}`); if (!c && x !== undefined) say('    ', x); };
const reset = () => {
    for (const k of Object.keys(local)) delete local[k];
    for (const k of Object.keys(session)) delete session[k];
    fetchLog.length = 0; fetchPlan = [];
};
const answer = (t, d) => ({ status: 200,
    body: { candidates: [{ content: { parts: [{ text: JSON.stringify({ t, d }) }] } }],
            usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 } } });
const quota = () => ({ status: 429, body: { error: { code: 429, status: 'RESOURCE_EXHAUSTED',
            message: 'Quota exceeded', details: [{ retryDelay: '30s' }] } } });

say('happy path — no fallback, no _m:');
reset();
Object.assign(local, { geminiApiKey: 'AIza-test' });
fetchPlan = [answer('රක්ත වගාව', 'explanation')];
let out = await BG.lookupModeDefault('culture', 'blood culture test', 'http://x', 1);
ok('returns a JSON string', typeof out === 'string' && out.startsWith('{'), out);
let parsed = JSON.parse(out);
ok('t survives', parsed.t === 'රක්ත වගාව', parsed.t);
ok('no _m when nothing fell back', parsed._m === undefined, JSON.stringify(parsed._m));
ok('one request only', fetchLog.length === 1, fetchLog.length);
ok('used the default model', fetchLog[0].url.includes('gemini-3.1-flash-lite'), fetchLog[0].url);

say('quota on the primary -> falls back AND reports it:');
reset();
Object.assign(local, {
    geminiApiKey: 'AIza-test',
    modelListCache: { ts: Date.now(), models: [
        { id: 'gemini-3.1-flash-lite' }, { id: 'gemini-2.5-flash-lite' }, { id: 'gemini-2.5-pro' }] },
});
fetchPlan = [quota(), answer('රක්ත වගාව', 'explanation')];
out = await BG.lookupModeDefault('culture', 'blood culture test', 'http://x', 1);
parsed = JSON.parse(out);
ok('two requests were made', fetchLog.length === 2, fetchLog.length);
ok('first hit the configured model', fetchLog[0].url.includes('gemini-3.1-flash-lite'));
ok('second hit the fallback', fetchLog[1].url.includes('gemini-2.5-flash-lite'), fetchLog[1].url);
ok('never tried a pro model', !fetchLog.some(f => f.url.includes('pro')));
ok('THE SEAM: _m reached the response', !!parsed._m, JSON.stringify(parsed));
ok('_m names the model that answered', parsed._m && parsed._m.model === 'gemini-2.5-flash-lite', JSON.stringify(parsed._m));
ok('_m names what fell back', parsed._m && parsed._m.from === 'gemini-3.1-flash-lite');
ok('t still survives alongside _m', parsed.t === 'රක්ත වගාව');
ok('cooldown recorded from retryDelay (30s)',
   local.modelCooldowns && local.modelCooldowns['gemini-3.1-flash-lite'] > Date.now() + 25000, 
   JSON.stringify(local.modelCooldowns));
ok('latency rollup credited the model that answered',
   !!(local.latencyDaily && Object.values(local.latencyDaily)[0]['gemini-2.5-flash-lite']),
   JSON.stringify(local.latencyDaily));

say('the note then renders from that exact string:');
const NOTE = (await import('./.generated/bubble-note.cjs', { with: { type: 'commonjs' } }).catch(async () => {
    const { createRequire } = await import('node:module');
    return { default: createRequire(import.meta.url)('./.generated/bubble-note.cjs') };
})).default;
globalThis.document = { createElement: () => ({ textContent: '',
    get innerHTML() { return String(this.textContent).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); } }) };
const html = NOTE.buildLookupHTML('culture', out);
ok('END TO END: bubble shows the fallback note', html.includes('sr-fallback-note'), html.slice(-300));
ok('note names both models', html.includes('3.1-flash-lite') && html.includes('2.5-flash-lite'));
ok('note sits outside .sr-body', html.lastIndexOf('sr-fallback-note') > html.lastIndexOf('sr-details-placeholder'));

say('paid plan opts out entirely:');
reset();
Object.assign(local, { geminiApiKey: 'AIza-test',
    modelPref: { selected: 'gemini-3.1-flash-lite', custom: '', paidPlan: true },
    modelListCache: { ts: Date.now(), models: [{ id: 'gemini-2.5-flash-lite' }] } });
fetchPlan = [quota()];
out = await BG.lookupModeDefault('culture', 'ctx', 'http://x', 1);
ok('only the configured model was tried', fetchLog.length === 1, fetchLog.length);
ok('surfaces the quota error instead of falling back', out.includes('Rate limit') || out.startsWith('<'), out.slice(0, 120));

say('locked key blocks the lookup with the right card:');
reset();
Object.assign(local, { geminiApiKeyEnc: { v: 1, salt: 'x', iv: 'y', ct: 'z' } });
out = await BG.lookupModeDefault('culture', 'ctx', 'http://x', 1);
ok('no network call attempted', fetchLog.length === 0, fetchLog.length);
ok('says locked, not "get a key"', out.includes('Key locked'), out.slice(0, 160));

say('editable prompt actually reaches the wire:');
reset();
Object.assign(local, { geminiApiKey: 'AIza-test',
    promptOverrides: { v: 2, system: 'CUSTOM RULES for {{langName}}',
                       lookup: 'WORD={{word}} CTX={{context}} LANG={{langName}}' } });
fetchPlan = [answer('x', 'y')];
await BG.lookupModeDefault('culture', 'blood culture', 'http://x', 1);
ok('custom system instruction sent, language filled in',
   fetchLog[0].body.system_instruction.parts[0].text === 'CUSTOM RULES for Sinhala',
   fetchLog[0].body.system_instruction.parts[0].text);
ok('custom lookup prompt sent with placeholders filled',
   fetchLog[0].body.contents[0].parts[0].text.startsWith('WORD=culture CTX=blood culture LANG=Sinhala'),
   fetchLog[0].body.contents[0].parts[0].text.slice(0, 80));

say('an override from before languages existed is set aside, not applied:');
reset();
Object.assign(local, { geminiApiKey: 'AIza-test',
    promptOverrides: { system: 'OLD SINHALA-ONLY RULES', lookup: 'WORD={{word}} CTX={{context}}' } });
fetchPlan = [answer('x', 'y')];
await BG.lookupModeDefault('culture', 'blood culture', 'http://x', 1);
ok('stale override NOT sent', fetchLog[0].body.system_instruction.parts[0].text !== 'OLD SINHALA-ONLY RULES');
ok('default used instead, with the language applied',
   fetchLog[0].body.system_instruction.parts[0].text.includes('Sinhala readers'),
   fetchLog[0].body.system_instruction.parts[0].text.slice(0, 90));
ok('the stale override is kept, not deleted', local.promptOverrides.system === 'OLD SINHALA-ONLY RULES');

say('the chosen language reaches the prompt:');
reset();
Object.assign(local, { geminiApiKey: 'AIza-test', targetLanguage: 'hi' });
fetchPlan = [answer('x', 'y')];
await BG.lookupModeDefault('culture', 'blood culture', 'http://x', 1);
const sys = fetchLog[0].body.system_instruction.parts[0].text;
const usr = fetchLog[0].body.contents[0].parts[0].text;
ok('system names Hindi', sys.includes('Hindi'));
ok('no Sinhala examples leak into Hindi', !/[\u0D80-\u0DFF]/.test(sys + usr), sys.slice(0, 120));
ok('response schema names Hindi',
   JSON.stringify(fetchLog[0].body.generationConfig.responseSchema).includes('Hindi'));

say('EVERY panel follows the language, not just the first bubble:');
// This is the regression that shipped in Phase 2a: lookupContext was
// parameterised and the three panels were not, so a Hindi reader got a correct
// bubble and then three panels arguing with their own system instruction.
for (const [label, call] of [
    ['More',    () => BG.lookupDetails('culture', 'blood culture test', 'http://x')],
    ['General', () => BG.lookupGeneral('culture')],
    ['Simple',  () => BG.lookupSimple('culture', 'blood culture test')],
]) {
    reset();
    Object.assign(local, { geminiApiKey: 'AIza-test', targetLanguage: 'hi' });
    fetchPlan = [{ status: 200, body: { candidates: [{ content: { parts: [{ text: '<div>ok</div>' }] } }] } }];
    await call();
    const sent = fetchLog[0].body.contents[0].parts[0].text;
    const sys = fetchLog[0].body.system_instruction.parts[0].text;
    ok(`${label}: prompt names Hindi`, sent.includes('Hindi'), sent.slice(0, 100));
    ok(`${label}: no "Sinhala" in the prompt`, !sent.includes('Sinhala'),
       (sent.match(/.{0,40}Sinhala.{0,40}/) || [''])[0]);
    ok(`${label}: no Sinhala script in the prompt`, !/[\u0D80-\u0DFF]/.test(sent));
    ok(`${label}: agrees with its system instruction`, sys.includes('Hindi') && !sys.includes('Sinhala'));
}

say('the Sinhala monolingual family is untouched and still Sinhala:');
reset();
Object.assign(local, { geminiApiKey: 'AIza-test', targetLanguage: 'si' });
fetchPlan = [{ status: 200, body: { candidates: [{ content: { parts: [{ text: '<div>ok</div>' }] } }] } }];
await BG.lookupContextSinhala('\u0db4\u0dbb\u0dd2\u0dc3\u0dbb\u0dba', 'ctx', 'http://x');
const mono = fetchLog[0].body.contents[0].parts[0].text;
ok('monolingual prompt still speaks Sinhala', mono.includes('Sinhala'));
ok('and still carries its Sinhala section labels', /[\u0D80-\u0DFF]/.test(mono));

loud();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
