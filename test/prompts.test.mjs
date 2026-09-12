let store = {};
globalThis.chrome = { storage: { local: {
  get: async (k) => { if (typeof k === 'string') return { [k]: store[k] };
    const o = {}; for (const [key, d] of Object.entries(k)) o[key] = store[key] ?? d; return o; },
  set: async (o) => Object.assign(store, o) } } };
const M = await import('./.generated/prompts.mjs');
let pass = 0, fail = 0;
const eq = (l, g, w) => { const ok = JSON.stringify(g) === JSON.stringify(w); ok?pass++:fail++;
  console.log(`  ${ok?'PASS':'FAIL'}  ${l}${ok?'':`\n         got  ${JSON.stringify(g)?.slice(0,200)}\n         want ${JSON.stringify(w)?.slice(0,200)}`}`); };

console.log('default template derivation:');
const d = M.promptDefaults();
eq('lookup default has {{word}}', d.lookup.includes('{{word}}'), true);
eq('lookup default has {{context}}', d.lookup.includes('{{context}}'), true);
eq('no leftover ${} interpolation', /\$\{/.test(d.lookup), false);
eq('system default is SYSTEM_INSTRUCTION', d.system === M.SYSTEM_INSTRUCTION, true);
eq('domain rule preserved', d.system.includes('බැංකුව'), true);

console.log('render:');
eq('substitutes both', M.renderPrompt('a {{word}} b {{context}} c', { word: 'X', context: 'Y' }), 'a X b Y c');
eq('all occurrences', M.renderPrompt('{{word}}-{{word}}', { word: 'Z' }), 'Z-Z');
eq('$& in value is literal', M.renderPrompt('[{{word}}]', { word: '$&evil' }), '[$&evil]');
eq('null -> empty', M.renderPrompt('[{{context}}]', { context: null }), '[]');
const rendered = M.renderPrompt(d.lookup, { word: 'culture', context: 'blood culture test' });
eq('real render has no placeholders left', /\{\{/.test(rendered), false);
eq('real render contains the word', rendered.includes('"culture"'), true);

console.log('validation:');
eq('empty rejected', M.validatePrompt('lookup', '  ').error, 'empty');
eq('lookup without {{word}} rejected', M.validatePrompt('lookup', 'hi {{context}}').missing, ['word']);
eq('lookup without {{context}} rejected', M.validatePrompt('lookup', 'hi {{word}}').missing, ['context']);
eq('valid lookup accepted', M.validatePrompt('lookup', '{{word}} {{context}}').ok, true);
eq('system needs no placeholders', M.validatePrompt('system', 'anything').ok, true);

console.log('save / override semantics:');
store = {};
eq('pristine -> defaults', (await M.getPrompts()).system === d.system, true);
eq('pristine -> not customized', (await M.getPrompts()).customized, { system: false, lookup: false });

let r = await M.savePrompts({ system: 'MY SYSTEM', lookup: '{{word}} in {{context}}' }, 'tighten');
eq('save ok', r.ok, true);
eq('override applied', (await M.getPrompts()).system, 'MY SYSTEM');
eq('customized flags', (await M.getPrompts()).customized, { system: true, lookup: true });
eq('base version seeded first', store.promptHistory[0].source, 'default');
eq('base version is the shipped default', store.promptHistory[0].system === d.system, true);
eq('edit appended', store.promptHistory[1].label, 'tighten');
eq('history length 2', store.promptHistory.length, 2);

console.log('saving the default stores null (tracks future default changes):');
await M.savePrompts({ system: d.system, lookup: d.lookup }, 'back to base');
eq('override nulled', store.promptOverrides, { system: null, lookup: null });
eq('getPrompts still returns default', (await M.getPrompts()).system === d.system, true);

console.log('invalid save is refused and changes nothing:');
store = {}; await M.savePrompts({ system: 'S', lookup: '{{word}} {{context}}' });
const before = JSON.stringify(store.promptOverrides);
r = await M.savePrompts({ system: 'S2', lookup: 'no placeholders' });
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
await M.savePrompts({ system: 'V1', lookup: '{{word}} {{context}} one' }, 'v1');
await M.savePrompts({ system: 'V2', lookup: '{{word}} {{context}} two' }, 'v2');
const v1 = store.promptHistory.find(v => v.label === 'v1');
r = await M.restorePromptVersion(v1.id);
eq('restore ok', r.ok, true);
eq('content restored', (await M.getPrompts()).system, 'V1');
eq('restore appended, not truncated', store.promptHistory.length, 4);
eq('restore labelled', store.promptHistory.at(-1).source, 'restore');
eq('v2 still in history', !!store.promptHistory.find(v => v.label === 'v2'), true);
eq('unknown id', (await M.restorePromptVersion('nope')).error, 'not_found');

console.log('history cap keeps the base version:');
store = {};
for (let i = 0; i < 60; i++) await M.savePrompts({ system: 'S'+i, lookup: '{{word}} {{context}} '+i }, 'e'+i);
eq(`capped at ${M.PROMPT_HISTORY_CAP}`, store.promptHistory.length, M.PROMPT_HISTORY_CAP);
eq('index 0 is still the shipped default', store.promptHistory[0].source, 'default');
eq('newest survives', store.promptHistory.at(-1).label, 'e59');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
