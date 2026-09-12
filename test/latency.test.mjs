let store = {};
globalThis.chrome = { storage: { local: {
  get: (k, cb) => { const o = {}; for (const [key, d] of Object.entries(k)) o[key] = store[key] ?? d; cb(o); },
  set: (o) => Object.assign(store, o) } } };
const M = await import('./.generated/latency.mjs');
let pass = 0, fail = 0;
const eq = (l, g, w) => { const ok = JSON.stringify(g) === JSON.stringify(w); ok?pass++:fail++;
  console.log(`  ${ok?'PASS':'FAIL'}  ${l}${ok?'':`\n         got  ${JSON.stringify(g)}\n         want ${JSON.stringify(w)}`}`); };

const DAY = 86400000;
const T = Date.parse('2026-09-12T10:00:00Z');

console.log('accumulation:');
store = {};
M.recordLatency('gemini-3.1-flash-lite', 1900, T);
M.recordLatency('gemini-3.1-flash-lite', 2100, T);
M.recordLatency('gemini-2.5-flash-lite', 1400, T);
eq('two models on one day', Object.keys(store.latencyDaily['2026-09-12']).sort(),
   ['gemini-2.5-flash-lite','gemini-3.1-flash-lite']);
eq('count accumulates', store.latencyDaily['2026-09-12']['gemini-3.1-flash-lite'].count, 2);
eq('sum accumulates', store.latencyDaily['2026-09-12']['gemini-3.1-flash-lite'].sumMs, 4000);
const c = store.latencyDaily['2026-09-12']['gemini-3.1-flash-lite'];
eq('average is 2000ms', Math.round(c.sumMs / c.count), 2000);

console.log('separate days:');
M.recordLatency('gemini-3.1-flash-lite', 1000, T + DAY);
eq('new day is its own bucket', Object.keys(store.latencyDaily).sort(), ['2026-09-12','2026-09-13']);

console.log('pruning at 30 days:');
const daily = {};
for (let i = 0; i < 40; i++) daily[M.utcDay(T - i * DAY)] = { m: { count: 1, sumMs: 1 } };
eq('40 days before prune', Object.keys(daily).length, 40);
M.pruneLatencyDaily(daily, T);
const kept = Object.keys(daily).sort();
eq('<= 31 buckets kept', kept.length <= 31, true);
eq('today kept', kept.includes('2026-09-12'), true);
eq('day 29 kept', kept.includes(M.utcDay(T - 29 * DAY)), true);
eq('day 40 pruned', kept.includes(M.utcDay(T - 40 * DAY)), false);

console.log('guards:');
store = {};
M.recordLatency('', 100, T);
M.recordLatency('m', NaN, T);
M.recordLatency('m', undefined, T);
eq('bad input writes nothing', store.latencyDaily, undefined);

console.log('storage size sanity (3 models x 30 days):');
const big = {};
for (let i = 0; i < 30; i++) { const d = M.utcDay(T - i*DAY); big[d] = {};
  for (const m of ['gemini-3.1-flash-lite','gemini-2.5-flash-lite','gemini-3.1-flash']) big[d][m] = { count: 99, sumMs: 198000 }; }
const bytes = JSON.stringify(big).length;
eq(`${bytes} bytes < 20KB`, bytes < 20000, true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
