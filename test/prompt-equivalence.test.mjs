globalThis.chrome = { storage: { local: { get: async () => ({}), set: async () => {} } } };
const M = await import('./.generated/prompts.mjs');
const { LOOKUP_PROMPT_FULL } = M;

let pass = 0, fail = 0;
const eq = (l, g, w) => { const ok = g === w; ok?pass++:fail++;
  console.log(`  ${ok?'PASS':'FAIL'}  ${l}`);
  if (!ok) { console.log('    old:', JSON.stringify(w).slice(0,300)); console.log('    new:', JSON.stringify(g).slice(0,300)); } };

const cases = [
  ['culture', 'The blood culture was positive.'],
  ['acute', 'acute myocardial infarction'],
  ['bank', 'He deposited it at the bank.'],
  ['x', ''],
  ['quote"inside', 'has "quotes" and $& and ${notATemplate}'],
  ['ශ්‍රී', 'සිංහල context text'],
  ['back\\slash', 'line1\nline2\ttab'],
];

console.log('rendered default === original LOOKUP_PROMPT_FULL output:');
for (const [w, c] of cases) {
  eq(`word=${JSON.stringify(w).slice(0,20)} ctx=${JSON.stringify(c).slice(0,24)}`,
     M.renderPrompt(M.DEFAULT_LOOKUP_TEMPLATE, { word: w, context: c }),
     LOOKUP_PROMPT_FULL(w, c));
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
