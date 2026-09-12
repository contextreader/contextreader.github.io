let store = { geminiApiKey: 'AIza-test' };
globalThis.chrome = { storage: { local: {
  get: async (k) => { if (typeof k === 'string') return { [k]: store[k] };
    const o = {}; for (const [key, d] of Object.entries(k)) o[key] = store[key] ?? d; return o; },
  set: async (o) => Object.assign(store, o) } } };

const calls = [];
globalThis.fetch = async (url, opts) => {
  const body = opts?.body ? JSON.parse(opts.body) : null;
  calls.push({ url, body });
  return globalThis.__next(url, body, calls.length);
};
const M = await import('./.generated/model.mjs');
let pass = 0, fail = 0;
const eq = (l, g, w) => { const ok = JSON.stringify(g) === JSON.stringify(w); ok ? pass++ : fail++;
  console.log(`  ${ok?'PASS':'FAIL'}  ${l}${ok?'':`\n         got  ${JSON.stringify(g)}\n         want ${JSON.stringify(w)}`}`); };

const payload = { contents: [], generationConfig: { temperature: 0.4, thinkingConfig: { thinkingBudget: 0 } } };

console.log('requestGemini — happy path:');
calls.length = 0;
globalThis.__next = async () => ({ status: 200, json: async () => ({ candidates: [{ x: 1 }] }) });
let r = await M.requestGemini('gemini-3.1-flash-lite', payload, 'AIza-test');
eq('one call only', calls.length, 1);
eq('status 200', r.status, 200);
eq('thinkingConfig sent', !!calls[0].body.generationConfig.thinkingConfig, true);
eq('model in URL', calls[0].url.includes('/gemini-3.1-flash-lite:generateContent'), true);
eq('key encoded in URL', calls[0].url.includes('key=AIza-test'), true);

console.log('requestGemini — model rejects thinkingConfig:');
calls.length = 0;
globalThis.__next = async (u, b, n) => n === 1
  ? { status: 400, json: async () => ({ error: { code: 400, status: 'INVALID_ARGUMENT',
      message: 'Unknown name "thinkingConfig": Cannot find field.' } }) }
  : { status: 200, json: async () => ({ candidates: [{ ok: true }] }) };
r = await M.requestGemini('gemini-2.0-flash', payload, 'AIza-test');
eq('retried once', calls.length, 2);
eq('retry dropped thinkingConfig', calls[1].body.generationConfig.thinkingConfig, undefined);
eq('retry kept temperature', calls[1].body.generationConfig.temperature, 0.4);
eq('final status 200', r.status, 200);

console.log('requestGemini — 400 unrelated to thinking does NOT retry:');
calls.length = 0;
globalThis.__next = async () => ({ status: 400, json: async () => ({ error: { code: 400, message: 'API key not valid' } }) });
r = await M.requestGemini('gemini-3.1-flash-lite', payload, 'AIza-test');
eq('no retry', calls.length, 1);

console.log('requestGemini — 429 is returned, not retried here:');
calls.length = 0;
globalThis.__next = async () => ({ status: 429, json: async () => ({ error: { status: 'RESOURCE_EXHAUSTED' } }) });
r = await M.requestGemini('gemini-3.1-flash-lite', payload, 'AIza-test');
eq('single call', calls.length, 1);
eq('status surfaced', r.status, 429);

console.log('listModels:');
calls.length = 0;
globalThis.__next = async () => ({ status: 200, json: async () => ({ models: [
  { name: 'models/gemini-3.1-flash-lite', displayName: 'Flash Lite', supportedGenerationMethods: ['generateContent'], inputTokenLimit: 1000 },
  { name: 'models/embedding-001', displayName: 'Embed', supportedGenerationMethods: ['embedContent'] },
  { name: 'models/gemini-2.5-flash', displayName: '2.5 Flash', supportedGenerationMethods: ['generateContent','countTokens'] },
] }) });
let lm = await M.listModels('AIza-test');
eq('url has no double /models', (calls[0].url.match(/\/models/g) || []).length, 1);
eq('ok', lm.ok, true);
eq('filters to generateContent', lm.models.map(m => m.id), ['gemini-3.1-flash-lite','gemini-2.5-flash']);
eq('strips models/ prefix', lm.models[0].id, 'gemini-3.1-flash-lite');

calls.length = 0;
globalThis.__next = async () => ({ status: 400, json: async () => ({ error: { status: 'INVALID_ARGUMENT', code: 400 } }) });
lm = await M.listModels('bad');
eq('bad key -> ok:false', lm.ok, false);
eq('bad key -> error surfaced', lm.error, 'INVALID_ARGUMENT');

store = {};
lm = await M.listModels('');
eq('no key -> no_key', lm.error, 'no_key');


// --- regression: the real error envelope, captured from a live call ---
// Verbatim body of a 400 from GET /v1beta/models with a bad key.
console.log('real INVALID_ARGUMENT envelope:');
calls.length = 0;
globalThis.__next = async () => ({ status: 400, json: async () => ({
  error: { code: 400, message: 'API key not valid. Please pass a valid API key.',
    status: 'INVALID_ARGUMENT',
    details: [
      { '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID',
        domain: 'googleapis.com', metadata: { service: 'generativelanguage.googleapis.com' } },
      { '@type': 'type.googleapis.com/google.rpc.LocalizedMessage', locale: 'en-US',
        message: 'API key not valid. Please pass a valid API key.' } ] } }) });
const bad = await M.listModels('bad-key');
eq('ok:false', bad.ok, false);
eq('enum kept for us', bad.error, 'INVALID_ARGUMENT');
eq('readable message kept for the tester', bad.message, 'API key not valid. Please pass a valid API key.');
eq('no models', bad.models, []);

// details[] entries without a retryDelay must not confuse the cooldown parser
const { cooldownFrom } = await import('./.generated/fallback.mjs');
eq('@type-only details fall back to the default cooldown',
   cooldownFrom({ data: { error: { details: [
     { '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'RATE_LIMIT_EXCEEDED' },
     { '@type': 'type.googleapis.com/google.rpc.LocalizedMessage', locale: 'en-US', message: 'x' } ] } } }),
   60000);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
