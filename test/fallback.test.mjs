let store = {};
globalThis.chrome = { storage: { local: {
  get: async (k) => { if (typeof k === 'string') return { [k]: store[k] };
    const o={}; for (const [key,d] of Object.entries(k)) o[key]=store[key]??d; return o; },
  set: async (o) => Object.assign(store, o),
  remove: async (k) => { for (const key of [].concat(k)) delete store[key]; } } } };
const M = await import('./.generated/fallback.mjs');
let pass=0, fail=0;
const eq=(l,g,w)=>{const ok=JSON.stringify(g)===JSON.stringify(w); ok?pass++:fail++;
  console.log(`  ${ok?'PASS':'FAIL'}  ${l}`); if(!ok){console.log('    got ',JSON.stringify(g));console.log('    want',JSON.stringify(w));}};

console.log('chain construction:');
store = { modelListCache: { models: [
  {id:'gemini-2.5-pro'}, {id:'gemini-3.1-flash-lite'}, {id:'gemini-2.5-flash'},
  {id:'gemini-2.5-flash-lite'}, {id:'gemini-1.5-pro'} ] } };
let chain = await M.buildFallbackChain('gemini-3.1-flash-lite');
eq('primary first, lite before flash, no pro at all', chain,
   ['gemini-3.1-flash-lite','gemini-2.5-flash-lite','gemini-2.5-flash']);
eq('pro models never in the chain', chain.some(m=>m.includes('pro')), false);
eq('no duplicate of the primary', chain.filter(m=>m==='gemini-3.1-flash-lite').length, 1);

chain = await M.buildFallbackChain('gemini-2.5-pro');
eq('a pro primary is honoured but gets lite fallbacks', chain,
   ['gemini-2.5-pro','gemini-3.1-flash-lite','gemini-2.5-flash-lite','gemini-2.5-flash']);

store = {};
eq('no cache -> chain is just the primary', await M.buildFallbackChain('gemini-x'), ['gemini-x']);
store = { modelListCache: { models: [null, {}, {id:''}] } };
eq('malformed cache entries ignored', await M.buildFallbackChain('gemini-x'), ['gemini-x']);

console.log('the chain never falls back onto a model that cannot answer:');
// A cache written before the filter existed still holds these.
store = { modelListCache: { models: ['gemini-2.5-flash-image', 'gemini-2.5-flash-preview-tts', 'gemini-2.5-flash-lite',
  'gemini-2.0-flash-live-001', 'gemini-2.5-flash-native-audio-preview', 'gemini-2.5-flash', 'gemma-3-27b-it'].map((id) => ({ id })) } };
eq('stale cache: image, tts, live, audio and gemma skipped',
   await M.buildFallbackChain('gemini-3.1-flash-lite'), ['gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.5-flash']);

console.log('quota detection:');
eq('429 status', M.isQuotaError({status:429,data:{}}), true);
eq('RESOURCE_EXHAUSTED body', M.isQuotaError({status:200,data:{error:{status:'RESOURCE_EXHAUSTED'}}}), true);
eq('400 invalid arg is not quota', M.isQuotaError({status:400,data:{error:{status:'INVALID_ARGUMENT'}}}), false);
eq('success is not quota', M.isQuotaError({status:200,data:{candidates:[]}}), false);
eq('null', M.isQuotaError(null), false);

console.log('cooldown duration:');
eq('no details -> 60s', M.cooldownFrom({data:{error:{}}}), 60000);
eq("retryDelay '45s'", M.cooldownFrom({data:{error:{details:[{retryDelay:'45s'}]}}}), 45000);
eq('snake_case retry_delay', M.cooldownFrom({data:{error:{details:[{retry_delay:'12s'}]}}}), 12000);
eq('skips detail entries without a delay',
   M.cooldownFrom({data:{error:{details:[{'@type':'x'},{retryDelay:'7s'}]}}}), 7000);
eq('absurd delay capped at 1h', M.cooldownFrom({data:{error:{details:[{retryDelay:'99999s'}]}}}), 3600000);
eq('garbage delay -> default', M.cooldownFrom({data:{error:{details:[{retryDelay:'abc'}]}}}), 60000);
eq('negative delay -> default', M.cooldownFrom({data:{error:{details:[{retryDelay:'-5s'}]}}}), 60000);
eq('malformed response -> default', M.cooldownFrom({}), 60000);

console.log('cooldown store:');
store = {};
await M.noteCooldown('m1', 60000);
eq('records a future expiry', store.modelCooldowns.m1 > Date.now(), true);
store.modelCooldowns.stale = Date.now() - 1000;
await M.noteCooldown('m2', 1000);
eq('expired entries pruned on write', 'stale' in store.modelCooldowns, false);
eq('live entries kept', Object.keys(store.modelCooldowns).sort(), ['m1','m2']);

console.log('attachMeta:');
eq('no fallback -> untouched', M.attachMeta('{"t":"a","d":"b"}', {}), '{"t":"a","d":"b"}');
const withMeta = M.attachMeta('{"t":"රක්ත වගාව","d":"exp"}',
  {model:'gemini-2.5-flash-lite', fellBackFrom:'gemini-3.1-flash-lite', reason:'quota'});
eq('_m added', JSON.parse(withMeta)._m,
   {model:'gemini-2.5-flash-lite', from:'gemini-3.1-flash-lite', reason:'quota'});
eq('t and d preserved', [JSON.parse(withMeta).t, JSON.parse(withMeta).d], ['රක්ත වගාව','exp']);
eq('HTML error card passes through', M.attachMeta('<div>err</div>', {fellBackFrom:'x'}), '<div>err</div>');
eq('unparseable passes through', M.attachMeta('not json', {fellBackFrom:'x'}), 'not json');
eq('JSON array passes through', M.attachMeta('[1,2]', {fellBackFrom:'x'}), '[1,2]');
eq('null meta', M.attachMeta('{"t":"a"}', null), '{"t":"a"}');

console.log('what kind of failure was it (25 Sep: everything but 429 used to read as a bad key):');
{
  const err = (status, code, message) => ({ status: code, data: { error: { status, code, message } } });
  eq('429 is quota', M.classifyError({ status: 429, data: {} }), 'quota');
  eq('RESOURCE_EXHAUSTED is quota', M.classifyError(err('RESOURCE_EXHAUSTED', 429, 'out')), 'quota');
  eq('404 NOT_FOUND is the model, not the key',
     M.classifyError(err('NOT_FOUND', 404, 'models/gemini-3.1-flash-lite is not found for API version v1beta')), 'model');
  eq('INVALID_ARGUMENT about a model is the model',
     M.classifyError(err('INVALID_ARGUMENT', 400, 'Model not supported for generateContent')), 'model');
  eq('PERMISSION_DENIED on a model is the model', M.classifyError(err('PERMISSION_DENIED', 403, 'model is not accessible')), 'model');
  eq('API_KEY_INVALID is the key', M.classifyError(err('INVALID_ARGUMENT', 400, 'API key not valid. Please pass a valid API key.')), 'key');
  eq('UNAUTHENTICATED is the key', M.classifyError(err('UNAUTHENTICATED', 401, 'missing credentials')), 'key');
  eq('PERMISSION_DENIED about the key is the key', M.classifyError(err('PERMISSION_DENIED', 403, 'API key does not have permission')), 'key');
  eq('503 is the server', M.classifyError(err('UNAVAILABLE', 503, 'overloaded')), 'server');
  eq('an answer is ok', M.classifyError({ status: 200, ok: true, data: { candidates: [{}] } }), 'ok');
  eq('no response at all is the network', M.classifyError(null), 'network');

  eq('quota falls over', M.shouldFallOver('quota'), true);
  eq('a missing model falls over — this is the bug Ian hit', M.shouldFallOver('model'), true);
  eq('a server fault falls over', M.shouldFallOver('server'), true);
  eq('a bad key does NOT fall over: no other model would help', M.shouldFallOver('key'), false);
  eq('an answer does not fall over', M.shouldFallOver('ok'), false);
}

console.log('Google renames models; the id is resolved against the live list:');
{
  const avail = ['gemini-3.2-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'];
  eq('an id that exists is left alone', M.resolveModelId('gemini-2.5-flash-lite', avail), { id: 'gemini-2.5-flash-lite', renamed: false });
  eq('a renamed id lands on the newest of its own family',
     M.resolveModelId('gemini-3.1-flash-lite', avail), { id: 'gemini-3.2-flash-lite', renamed: true, from: 'gemini-3.1-flash-lite' });
  eq('flash stays flash, never lite', M.resolveModelId('gemini-3.1-flash', avail).id, 'gemini-2.5-flash');
  eq('no list, no guessing', M.resolveModelId('gemini-3.1-flash-lite', []), { id: 'gemini-3.1-flash-lite', renamed: false });
  // A pro id is only ever resolved when the reader chose one deliberately, so it
  // resolves within its own family. The CHAIN is what must never add a pro model.
  eq('a chosen pro resolves to the newest pro', M.resolveModelId('gemini-9-pro', avail).id, 'gemini-2.5-pro');
  eq('but a renamed lite never becomes pro', M.resolveModelId('gemini-9-flash-lite', avail).id, 'gemini-3.2-flash-lite');
}

console.log('a fallback that worked is kept for a few hours, then lets go:');
{
  store = { modelListCache: { models: [{ id: 'gemini-3.1-flash-lite' }, { id: 'gemini-2.5-flash-lite' }, { id: 'gemini-2.5-flash' }] } };
  eq('nothing remembered at first', await M.getSticky(), null);
  await M.setSticky('gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'model', 'not found for API version v1beta');
  const s1 = await M.getSticky();
  eq('it remembers which model answered', s1.id, 'gemini-2.5-flash-lite');
  eq('and what it replaced, and why', [s1.from, s1.reason], ['gemini-3.1-flash-lite', 'model']);
  eq('for about three hours', Math.round((s1.until - s1.since) / 3600000), 3);
  const chain = await M.buildFallbackChain('gemini-3.1-flash-lite', s1);
  eq('the working model leads the next lookup, the configured one still follows', chain.slice(0, 2),
     ['gemini-2.5-flash-lite', 'gemini-3.1-flash-lite']);
  store.activeModel = Object.assign({}, s1, { until: Date.now() - 1 });
  eq('once it expires it is ignored, so the default is tried again', await M.getSticky(), null);
  await M.setSticky('gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'model', '');
  await M.clearSticky();
  eq('and the default answering clears it', await M.getSticky(), null);
  eq('a missing model rests for hours, not the quota minute', M.MISSING_COOLDOWN_MS > M.MAX_COOLDOWN_MS, true);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
