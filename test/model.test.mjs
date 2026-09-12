let store = {};
globalThis.chrome = {
  storage: { local: {
    get: async (k) => {
      if (typeof k === 'string') return { [k]: store[k] };
      const out = {}; for (const [key, dflt] of Object.entries(k)) out[key] = store[key] ?? dflt; return out;
    },
    set: async (o) => Object.assign(store, o)
  } }
};
const M = await import('./.generated/model.mjs');

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
};

console.log('modelAcceptsThinking:');
for (const [m, want] of [
  ['gemini-3.1-flash-lite', true], ['gemini-2.5-flash-lite', true], ['gemini-2.5-flash', true],
  ['gemini-2.0-flash', false], ['gemini-1.5-flash', false], ['gemini-2.0-flash-lite', false],
  ['gemini-4-pro', true], ['gemini-10-flash', true], ['some-other-model', false],
]) eq(`${m} -> ${want}`, M.modelAcceptsThinking(m), want);

console.log('getModelConfig:');
store = {};
eq('empty storage -> default', (await M.getModelConfig()).model, M.DEFAULT_MODEL);
store = { modelPref: { selected: 'gemini-2.5-flash-lite' } };
eq('explicit selection', (await M.getModelConfig()).model, 'gemini-2.5-flash-lite');
store = { modelPref: { selected: M.CUSTOM_MODEL, custom: '  gemini-x-test  ' } };
eq('custom is trimmed', (await M.getModelConfig()).model, 'gemini-x-test');
store = { modelPref: { selected: M.CUSTOM_MODEL, custom: '   ' } };
eq('blank custom falls back to default', (await M.getModelConfig()).model, M.DEFAULT_MODEL);
store = { modelPref: { selected: '' } };
eq('blank selection falls back', (await M.getModelConfig()).model, M.DEFAULT_MODEL);
store = { modelPref: { selected: 'gemini-2.5-flash', paidPlan: true } };
eq('paidPlan carried', (await M.getModelConfig()).paidPlan, true);
store = {};
eq('paidPlan defaults false', (await M.getModelConfig()).paidPlan, false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
