let store = {};
globalThis.chrome = { storage: { local: {
  get: async (k) => { if (typeof k === 'string') return { [k]: store[k] };
    const o = {}; for (const [key, d] of Object.entries(k)) o[key] = store[key] ?? d; return o; },
  set: async (o) => Object.assign(store, o) } } };
const M = await import('./.generated/prompts.mjs');
let pass = 0, fail = 0;
const eq = (l, g, w) => { const ok = JSON.stringify(g) === JSON.stringify(w); ok?pass++:fail++;
  console.log(`  ${ok?'PASS':'FAIL'}  ${l}${ok?'':`\n         got  ${JSON.stringify(g)?.slice(0,200)}\n         want ${JSON.stringify(w)?.slice(0,200)}`}`); };

console.log('no panel hardcodes Sinhala outside the Sinhala-only functions:');
// lookupDetails told EVERY language "STEP 4 - TRANSLATE TO SINHALA" while the rest of
// its template interpolated ${lv.langName}. Found 16 Sep by the session capturing real
// answers through the unpacked extension. The Sinhala-to-Sinhala functions below that
// banner are allowed to say Sinhala — that is their whole job.
{
  const { readFileSync } = await import('node:fs');
  const bg = readFileSync(new URL('../background.js', import.meta.url), 'utf8');
  // Each shared lookup's own body — not comments, and not the lookup*Sinhala
  // routing names, which are how the monolingual mode is reached.
  const body = (name) => {
    const a = bg.indexOf(`async function ${name}(`);
    if (a < 0) throw new Error(`prompts test: ${name} is gone — rename the test with it`);
    return bg.slice(a, bg.indexOf('\n}', a)).replace(/^\s*\/\/.*$/gm, '');
  };
  for (const fn of ['lookupContext', 'lookupDetails', 'lookupGeneral', 'lookupSimple'])
    eq(`${fn} names no language of its own`, (body(fn).match(/Sinhala/gi) || []), []);
  eq('the Sinhala-only section still exists', bg.includes('SINHALA-TO-SINHALA'), true);
}

console.log('Simple mode must answer in the reader\'s own script:');
// For Urdu, Simple returned Roman Urdu ("Yahan significant ka matlab hai…") while General
// returned proper Urdu script — the "like texting a friend" register reads as romanised.
{
  const { readFileSync } = await import('node:fs');
  const bg = readFileSync(new URL('../background.js', import.meta.url), 'utf8');
  const simple = bg.slice(bg.indexOf('async function lookupSimple('), bg.indexOf('async function lookupSimple(') + 2000);
  eq('lookupSimple forbids romanising', /[Nn]ever romanise|[Nn]ever romanize/.test(simple), true);
  eq('…and says to use the language\'s own script', /own script/.test(simple), true);
}

console.log('default template derivation:');
const d = M.promptDefaults();
eq('lookup default has {{word}}', d.lookup.includes('{{word}}'), true);
eq('lookup default has {{context}}', d.lookup.includes('{{context}}'), true);
eq('no leftover ${} interpolation', /\$\{/.test(d.lookup), false);
eq('system default is SYSTEM_INSTRUCTION', d.system === M.SYSTEM_INSTRUCTION, true);
eq('system carries the examples placeholder', d.system.includes('{{examples}}'), true);
eq('system is language-parameterised', d.system.includes('{{langName}}'), true);
eq('no language is hardcoded in the default', /බැංකුව|Sinhala/.test(d.system), false);

console.log('render:');
eq('substitutes both', M.renderPrompt('a {{word}} b {{context}} c', { word: 'X', context: 'Y' }), 'a X b Y c');
eq('all occurrences', M.renderPrompt('{{word}}-{{word}}', { word: 'Z' }), 'Z-Z');
eq('$& in value is literal', M.renderPrompt('[{{word}}]', { word: '$&evil' }), '[$&evil]');
eq('null -> empty', M.renderPrompt('[{{context}}]', { context: null }), '[]');
const rendered = M.renderPrompt(d.lookup, { word: 'culture', context: 'blood culture test', langName: 'Sinhala', examples: '- x' });
eq('real render has no placeholders left', /\{\{/.test(rendered), false);
eq('real render contains the word', rendered.includes('"culture"'), true);

console.log('validation:');
eq('empty rejected', M.validatePrompt('lookup', '  ').error, 'empty');
eq('lookup without {{word}} rejected', M.validatePrompt('lookup', 'hi {{context}} {{langName}}').missing, ['word']);
eq('lookup without {{context}} rejected', M.validatePrompt('lookup', 'hi {{word}} {{langName}}').missing, ['context']);
eq('lookup without {{langName}} rejected', M.validatePrompt('lookup', '{{word}} {{context}}').missing, ['langName']);
eq('valid lookup accepted', M.validatePrompt('lookup', '{{word}} {{context}} {{langName}}').ok, true);
eq('system needs {{langName}}', M.validatePrompt('system', 'anything').missing, ['langName']);

console.log('save / override semantics:');
store = {};
eq('pristine -> defaults', (await M.getPrompts()).system === d.system, true);
eq('pristine -> not customized', (await M.getPrompts()).customized, { system: false, lookup: false });

let r = await M.savePrompts({ system: 'MY SYSTEM {{langName}}', lookup: '{{word}} in {{context}} ({{langName}})' }, 'tighten');
eq('save ok', r.ok, true);
eq('override applied', (await M.getPrompts()).system, 'MY SYSTEM {{langName}}');
eq('customized flags', (await M.getPrompts()).customized, { system: true, lookup: true });
eq('base version seeded first', store.promptHistory[0].source, 'default');
eq('base version is the shipped default', store.promptHistory[0].system === d.system, true);
eq('edit appended', store.promptHistory[1].label, 'tighten');
eq('history length 2', store.promptHistory.length, 2);

console.log('saving the default stores null (tracks future default changes):');
await M.savePrompts({ system: d.system, lookup: d.lookup }, 'back to base');
eq('override nulled', { system: store.promptOverrides.system, lookup: store.promptOverrides.lookup },
   { system: null, lookup: null });
eq('and version-stamped', store.promptOverrides.v, 2);
eq('getPrompts still returns default', (await M.getPrompts()).system === d.system, true);

console.log('invalid save is refused and changes nothing:');
store = {}; await M.savePrompts({ system: 'S {{langName}}', lookup: '{{word}} {{context}} {{langName}}' });
const before = JSON.stringify(store.promptOverrides);
r = await M.savePrompts({ system: 'S2 {{langName}}', lookup: 'no placeholders' });
eq('refused', r.ok, false);
eq('reports kind', r.kind, 'lookup');
eq('storage untouched', JSON.stringify(store.promptOverrides), before);

console.log('reset:');
r = await M.resetPrompts();
eq('reset ok', r.ok, true);
eq('back to default', (await M.getPrompts()).lookup === d.lookup, true);
eq('reset recorded in history', store.promptHistory.at(-1).source, 'default');

console.log('restore:');
store = {};
await M.savePrompts({ system: 'V1 {{langName}}', lookup: '{{word}} {{context}} {{langName}} one' }, 'v1');
await M.savePrompts({ system: 'V2 {{langName}}', lookup: '{{word}} {{context}} {{langName}} two' }, 'v2');
const v1 = store.promptHistory.find(v => v.label === 'v1');
r = await M.restorePromptVersion(v1.id);
eq('restore ok', r.ok, true);
eq('content restored', (await M.getPrompts()).system, 'V1 {{langName}}');
eq('restore appended, not truncated', store.promptHistory.length, 4);
eq('restore labelled', store.promptHistory.at(-1).source, 'restore');
eq('v2 still in history', !!store.promptHistory.find(v => v.label === 'v2'), true);
eq('unknown id', (await M.restorePromptVersion('nope')).error, 'not_found');

console.log('history cap keeps the base version:');
store = {};
for (let i = 0; i < 60; i++) await M.savePrompts({ system: 'S{{langName}}'+i, lookup: '{{word}} {{context}} {{langName}} '+i }, 'e'+i);
eq(`capped at ${M.PROMPT_HISTORY_CAP}`, store.promptHistory.length, M.PROMPT_HISTORY_CAP);
eq('index 0 is still the shipped default', store.promptHistory[0].source, 'default');
eq('newest survives', store.promptHistory.at(-1).label, 'e59');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
