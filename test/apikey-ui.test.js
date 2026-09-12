const S = require('./shim.cjs');
const LANGS = require('../lib/languages.js');
let pass=0, fail=0;
const ok=(l,c,x)=>{c?pass++:fail++; console.log(`  ${c?'PASS':'FAIL'}  ${l}`); if(!c&&x)console.log('    ',x);};

let state = { hasKey:false, protection:'plain', unlocked:false, masked:'' };
const calls = [];
S.setResponder((m) => {
  calls.push(m);
  switch (m.action) {
    case 'getKeyState': return state;
    case 'listModels': return { ok:true, models:[{id:'gemini-3.1-flash-lite'}] };
    case 'getModelConfig': return { model:'gemini-3.1-flash-lite', paidPlan:false,
      pref:{selected:'gemini-3.1-flash-lite',custom:'',paidPlan:false}, defaultModel:'gemini-3.1-flash-lite' };
    case 'getLanguages': return { current: 'si', languages: LANGS.listLangs(),
      defaultLang: LANGS.DEFAULT_LANG };
    case 'setLanguage': return { ok: true, lang: LANGS.getLang(m.code) };
    case 'getLatencyDaily': return { daily:{} };
    case 'getPrompts': return { prompts:{system:'s',lookup:'{{word}} {{context}}'},
      defaults:{system:'s',lookup:'{{word}} {{context}}'}, locked:{jsonContract:'c',schema:{}}, history:[] };
    case 'saveApiKey': return { ok:true };
    case 'enablePassphrase': return m.passphrase.length >= 8 ? { ok:true } : { ok:false, error:'too_short' };
    case 'unlockKey': return m.passphrase === 'rightpass' ? { ok:true } : { ok:false, error:'wrong_passphrase' };
    case 'disablePassphrase': return m.passphrase === 'rightpass' ? { ok:true } : { ok:false, error:'wrong_passphrase' };
    default: return { ok:true };
  }
});

(async () => {
  await S.run(); for (let i=0;i<6;i++) await S.flush();
  const E = S.els;

  console.log('no key yet:');
  ok('entry row visible', E['opt-key-entry'].hidden === false);
  ok('saved row hidden', E['opt-key-saved'].hidden === true);
  ok('lock box hidden (nothing to protect)', E['opt-lock-box'].hidden === true);

  console.log('saving a key:');
  E['opt-api-key'].value = '  AIzaSyTESTKEY0123456789abc3f2  ';
  await E['opt-save-key'].click(); for (let i=0;i<6;i++) await S.flush();
  const saveCall = calls.find(c => c.action === 'saveApiKey');
  ok('key is trimmed before saving', saveCall && saveCall.key === 'AIzaSyTESTKEY0123456789abc3f2', saveCall && JSON.stringify(saveCall.key));
  ok('verified via listModels, not generateContent',
     calls.some(c => c.action === 'listModels' && c.apiKey) && !calls.some(c => c.action === 'generateContent'));
  ok('input cleared after save (key not left in the DOM)', E['opt-api-key'].value === '');
  ok('status mentions the model count', /models available/.test(E['opt-key-status'].textContent), E['opt-key-status'].textContent);

  console.log('key present, plain:');
  state = { hasKey:true, protection:'plain', unlocked:true, masked:'AIza…3f2' };
  await S.setResponder, await (async()=>{})();
  // force a re-render through the public path
  await E['opt-key-revoke'] && null;
  state = { hasKey:true, protection:'plain', unlocked:true, masked:'AIza…3f2' };
  await E['opt-key-replace'].click();
  ok('Replace reopens the entry row', E['opt-key-entry'].hidden === false);
  ok('Replace does NOT prefill the key', E['opt-api-key'].value === '');

  // re-run with a key already present
  await S.run(); for (let i=0;i<6;i++) await S.flush();
  ok('masked form shown, not the key', E['opt-key-masked'].textContent === 'AIza…3f2',
     E['opt-key-masked'].textContent);
  ok('never shows the middle of the key', !E['opt-key-masked'].textContent.includes('TESTKEY'));
  ok('lock box now visible', E['opt-lock-box'].hidden === false);
  ok('offers encryption', E['opt-lock-actions'].innerHTML.includes('opt-lock-enable'));
  ok('state text says unencrypted', /unencrypted/.test(E['opt-lock-state'].textContent),
     E['opt-lock-state'].textContent);

  console.log('enabling a passphrase:');
  E['opt-lock-enable'].click();
  ok('form opens', E['opt-lock-form'].hidden === false);
  ok('confirm field shown for enable', E['opt-lock-pass2'].hidden === false);
  ok('hint states there is no recovery', /no recovery/.test(E['opt-lock-hint'].textContent),
     E['opt-lock-hint'].textContent);
  ok('hint is honest about the threat model', /off the disk/.test(E['opt-lock-hint'].textContent));

  E['opt-lock-pass'].value = 'longenough1'; E['opt-lock-pass2'].value = 'different';
  await E['opt-lock-go'].click(); for (let i=0;i<4;i++) await S.flush();
  ok('mismatch refused', /do not match/.test(E['opt-key-status'].textContent), E['opt-key-status'].textContent);
  ok('no enablePassphrase sent on mismatch', !calls.some(c => c.action === 'enablePassphrase'));

  E['opt-lock-pass'].value = 'short'; E['opt-lock-pass2'].value = 'short';
  await E['opt-lock-go'].click(); for (let i=0;i<4;i++) await S.flush();
  ok('too-short reported from the backend', /at least 8/.test(E['opt-key-status'].textContent),
     E['opt-key-status'].textContent);

  console.log('locked state:');
  state = { hasKey:true, protection:'passphrase', unlocked:false, masked:'' };
  await S.run(); for (let i=0;i<6;i++) await S.flush();
  ok('offers Unlock', E['opt-lock-actions'].innerHTML.includes('opt-lock-unlock'));
  ok('warns lookups will not run', /will not run/.test(E['opt-lock-state'].textContent),
     E['opt-lock-state'].textContent);
  E['opt-lock-unlock'].click();
  ok('no confirm field when unlocking', E['opt-lock-pass2'].hidden === true);
  E['opt-lock-pass'].value = 'wrongpass';
  await E['opt-lock-go'].click(); for (let i=0;i<4;i++) await S.flush();
  ok('wrong passphrase reported', /did not work/.test(E['opt-key-status'].textContent),
     E['opt-key-status'].textContent);
  E['opt-lock-pass'].value = 'rightpass';
  await E['opt-lock-go'].click(); for (let i=0;i<4;i++) await S.flush();
  ok('unlock succeeds', /Unlocked/.test(E['opt-key-status'].textContent), E['opt-key-status'].textContent);
  ok('passphrase cleared from the DOM', E['opt-lock-pass'].value === '');

  console.log('unlocked state:');
  state = { hasKey:true, protection:'passphrase', unlocked:true, masked:'AIza…3f2' };
  await S.run(); for (let i=0;i<6;i++) await S.flush();
  ok('offers Lock now and Turn off',
     E['opt-lock-actions'].innerHTML.includes('opt-lock-now') &&
     E['opt-lock-actions'].innerHTML.includes('opt-lock-off'));
  ok('says unlocked for the session', /this browser session/.test(E['opt-lock-state'].textContent));
  E['opt-lock-off'].click();
  ok('turning off asks for the passphrase', E['opt-lock-form'].hidden === false);
  ok('and explains why', /could read the key anyway/.test(E['opt-lock-hint'].textContent),
     E['opt-lock-hint'].textContent);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
})();
