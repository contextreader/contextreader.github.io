// Guards the Sinhala prompt against silent drift.
//
// Sinhala is the only language whose output has actually been measured
// (CLAUDE.md: without the domain rules, "blood culture" came back as වගාව
// instead of රුධිර වගාව). Once prompts became language-parameterised, nothing
// structural stops an edit to the template or the pack from quietly weakening
// that. These assertions are what stands in the way.
//
// NOTE: the multi-language refactor DID change the Sinhala lookup prompt — it
// now carries all four measured contrastive pairs where it previously carried
// two, the other two having lived only in the system instruction. That is a
// superset of what was measured, not a reduction, but it is a change and the
// blood-culture check should be re-run in a browser.

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const L = require('../lib/languages.js');

globalThis.chrome = { storage: { local: { get: async () => ({}), set: async () => {} } } };
const M = await import('./.generated/prompts.mjs');

let pass = 0, fail = 0;
const ok = (l, c, x) => { c ? pass++ : fail++; console.log(`  ${c ? 'PASS' : 'FAIL'}  ${l}`); if (!c && x !== undefined) console.log('    ', x); };

const d = M.promptDefaults();
const render = (tmpl, code, word = 'culture', context = 'blood culture test') =>
    M.renderPrompt(tmpl, { word, context, langName: L.getLang(code).name, examples: L.examplesBlock(code) });

console.log('the four measured Sinhala pairs survive:');
const si = render(d.lookup, 'si') + render(d.system, 'si');
for (const [term, right, wrong] of [
    ['specimens', 'නිදර්ශක', 'සාම්පල'],
    ['bank', 'බැංකුව', 'ඉවුර'],
    ['execute', 'ධාවනය කරනව', 'ක්‍රියාත්මක කරනව'],
    ['settlement', 'ජනාවාසය', 'පියවීම'],
]) {
    ok(`"${term}" pair present`, si.includes(right) && si.includes(wrong), term);
}
ok('names Sinhala as the target', si.includes('Sinhala'));
ok('no placeholders left unrendered', !/\{\{/.test(si), si.match(/\{\{\w+\}\}/g));

console.log('an untuned language gets no examples and no Sinhala:');
const hi = render(d.lookup, 'hi') + render(d.system, 'hi');
ok('names Hindi', hi.includes('Hindi'));
ok('carries no Sinhala script', !/[඀-෿]/.test(hi));
ok('no stray "Sinhala"', !hi.includes('Sinhala'));
ok('no placeholders left', !/\{\{/.test(hi));
ok('no empty bullet left where examples would be', !/\n\n\n/.test(hi), JSON.stringify(hi.slice(0, 200)));

console.log('substitution stays literal (values are arbitrary page text):');
for (const [word, context] of [
    ['quote"inside', 'has "quotes" and $& and ${notATemplate}'],
    ['ශ්‍රී', 'සිංහල context text'],
    ['back\\slash', 'line1\nline2\ttab'],
    ['x', ''],
]) {
    const out = render(d.lookup, 'si', word, context);
    ok(`word ${JSON.stringify(word).slice(0, 18)} appears verbatim`, out.includes(`"${word}"`), out.slice(0, 120));
}

console.log('the contract and schema follow the language too:');
ok('si pack is the only tuned one', L.listLangs().filter((l) => l.tuned).map((l) => l.code).join() === 'si');
ok('every pack has a font and a native name',
   L.listLangs().every((l) => l.font && l.nativeName && typeof l.rtl === 'boolean'));
ok('arabic is the rtl one', L.getLang('ar').rtl === true && L.getLang('si').rtl === false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
