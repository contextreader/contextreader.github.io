// node 24 provides globalThis.crypto (WebCrypto) already
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');

let local = {}, session = {};
const mk = (bag) => ({
  get: async (k) => { if (typeof k === 'string') return { [k]: bag[k] };
    if (Array.isArray(k)) { const o={}; for (const n of k) o[n]=bag[n]; return o; }
    const o={}; for (const [n,d] of Object.entries(k)) o[n]=bag[n]??d; return o; },
  set: async (o) => Object.assign(bag, o),
  remove: async (k) => { for (const n of [].concat(k)) delete bag[n]; },
});
globalThis.chrome = { storage: { local: mk(local), session: mk(session) } };
const M = await import('./.generated/apikey.mjs');
let pass=0, fail=0;
const eq=(l,g,w)=>{const ok=JSON.stringify(g)===JSON.stringify(w); ok?pass++:fail++;
  console.log(`  ${ok?'PASS':'FAIL'}  ${l}`); if(!ok){console.log('    got ',JSON.stringify(g));console.log('    want',JSON.stringify(w));}};
const reset = () => { for(const k of Object.keys(local)) delete local[k];
                      for(const k of Object.keys(session)) delete session[k]; };

const KEY = 'AIzaSyTESTKEY0123456789abc3f2';

console.log('mask:');
eq('long key', M.mask(KEY), 'AIza…3f2');
eq('short key', M.mask('abc'), 'ab…');
eq('empty', M.mask(''), '');
eq('never reveals the middle', M.mask(KEY).includes('TESTKEY'), false);

console.log('plain mode:');
reset(); await chrome.storage.local.set({ geminiApiKey: KEY });
eq('getApiKey returns it', await M.getApiKey(), KEY);
eq('state', await M.getKeyState(), {hasKey:true, protection:'plain', unlocked:true, masked:'AIza…3f2'});
eq('never written to sync', 'sync' in (globalThis.chrome.storage), false);

console.log('crypto round trip:');
const blob = await M.encryptApiKey(KEY, 'correct horse battery');
eq('versioned', blob.v, 1);
eq('ciphertext is not the key', blob.ct.includes('AIza'), false);
eq('salt and iv present and distinct', blob.salt !== blob.iv, true);
eq('decrypts with the right passphrase', await M.decryptApiKey(blob, 'correct horse battery'), KEY);
eq('wrong passphrase -> null, not garbage', await M.decryptApiKey(blob, 'wrong'), null);
const blob2 = await M.encryptApiKey(KEY, 'correct horse battery');
eq('same key+passphrase gives different ciphertext (fresh salt/iv)', blob.ct !== blob2.ct, true);

console.log('enable passphrase:');
reset(); await chrome.storage.local.set({ geminiApiKey: KEY });
eq('short passphrase refused', (await M.enablePassphrase('abc')).error, 'too_short');
eq('key still in plain after refusal', local.geminiApiKey, KEY);
eq('enable ok', (await M.enablePassphrase('a-good-passphrase')).ok, true);
eq('plaintext key removed from local', 'geminiApiKey' in local, false);
eq('ciphertext stored', !!local.geminiApiKeyEnc, true);
eq('stays unlocked immediately after enabling', await M.getApiKey(), KEY);
eq('state reports passphrase+unlocked', (await M.getKeyState()).protection, 'passphrase');

console.log('lock / unlock:');
await M.lockKey();
eq('locked -> getApiKey empty', await M.getApiKey(), '');
eq('locked state', await M.getKeyState(), {hasKey:true, protection:'passphrase', unlocked:false, masked:''});
eq('wrong passphrase refused', (await M.unlockKey('nope')).error, 'wrong_passphrase');
eq('still locked after a bad attempt', await M.getApiKey(), '');
eq('unlock ok', (await M.unlockKey('a-good-passphrase')).ok, true);
eq('key available again', await M.getApiKey(), KEY);

console.log('service-worker eviction (session survives, module vars would not):');
eq('plaintext lives in session storage', session.apiKeyPlain, KEY);
eq('and NOT in local storage', Object.keys(local).includes('geminiApiKey'), false);

console.log('disable passphrase requires it:');
eq('wrong passphrase cannot strip protection', (await M.disablePassphrase('nope')).error, 'wrong_passphrase');
eq('still encrypted', !!local.geminiApiKeyEnc, true);
eq('correct passphrase disables', (await M.disablePassphrase('a-good-passphrase')).ok, true);
eq('back to plain', local.geminiApiKey, KEY);
eq('ciphertext gone', 'geminiApiKeyEnc' in local, false);
eq('session cleared', 'apiKeyPlain' in session, false);

console.log('enable with no key:');
reset();
eq('refused', (await M.enablePassphrase('a-good-passphrase')).error, 'no_key');

console.log('revoke:');
reset(); await chrome.storage.local.set({ geminiApiKey: KEY });
await M.enablePassphrase('a-good-passphrase');
await M.revokeKey();
eq('everything gone', [Object.keys(local).length, Object.keys(session).length], [0,0]);
eq('state has no key', (await M.getKeyState()).hasKey, false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
