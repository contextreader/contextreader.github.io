let store = {};
globalThis.chrome = { storage: { local: {
  get: async (k) => { if (typeof k === 'string') return { [k]: store[k] };
    const o={}; for (const [key,d] of Object.entries(k)) o[key]=store[key]??d; return o; },
  set: async (o) => Object.assign(store, o) } } };
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
