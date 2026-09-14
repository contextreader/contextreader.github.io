const S = require('./shim.cjs');
const LANGS = require('../lib/languages.js');
let pass = 0, fail = 0;
const ok = (l, c, extra) => { c?pass++:fail++; console.log(`  ${c?'PASS':'FAIL'}  ${l}`); if(!c && extra) console.log('    ', extra); };

const DAY = 86400000;
const today = new Date().toISOString().slice(0,10);
const yday  = new Date(Date.now()-DAY).toISOString().slice(0,10);
const old40 = new Date(Date.now()-40*DAY).toISOString().slice(0,10);

const defaults = { system: 'SYS line1\nSYS line2', lookup: 'TARGET "{{word}}"\nCTX "{{context}}"' };
const hist = [
  { id:'v0', ts: Date.now()-3*DAY, label:'Default', source:'default', ...defaults },
  { id:'v1', ts: Date.now()-2*DAY, label:'tighten domain rules', source:'edit',
    system:'SYS line1\nSYS line2 CHANGED', lookup: defaults.lookup },
];

S.setResponder((msg) => {
  switch (msg.action) {
    case 'getModelConfig': return { model:'gemini-3.1-flash-lite', paidPlan:false,
      pref:{selected:'gemini-3.1-flash-lite',custom:'',paidPlan:false}, defaultModel:'gemini-3.1-flash-lite' };
    case 'listModels': return { ok:true, models:[
      {id:'gemini-2.5-pro'},{id:'gemini-3.1-flash-lite'},{id:'gemini-2.5-flash'},{id:'gemini-2.5-flash-lite'}] };
    case 'getLanguages': return { current: 'si', languages: LANGS.listLangs(),
      defaultLang: LANGS.DEFAULT_LANG };
    case 'setLanguage': return { ok: true, lang: LANGS.getLang(msg.code) };
    case 'getLatencyDaily': return { daily: {
      [today]: { 'gemini-3.1-flash-lite': {count:10,sumMs:19000}, 'gemini-2.5-flash-lite': {count:5,sumMs:7000} },
      [yday]:  { 'gemini-3.1-flash-lite': {count:4, sumMs:8800} },
      [old40]: { 'gemini-ancient': {count:3, sumMs:9000} },
    }, retentionDays: 30 };
    case 'getPrompts': return { prompts:{...defaults, customized:{system:false,lookup:false}},
      defaults, locked:{ jsonContract:'\nOutput ONLY this JSON: {...}', schema:{type:'OBJECT'} },
      history: hist, placeholders:{lookup:['word','context'],system:[]} };
    default: return { ok:true };
  }
});

(async () => {
  await S.run();
  await S.flush(); await S.flush(); await S.flush();

  console.log('model dropdown:');
  const sel = S.els['opt-model'];
  ok('populated', sel.innerHTML.includes('gemini-3.1-flash-lite'), sel.innerHTML.slice(0,120));
  ok('flash-lite ranked above pro',
     sel.innerHTML.indexOf('flash-lite') < sel.innerHTML.indexOf('gemini-2.5-pro'));
  ok('default is marked', sel.innerHTML.includes('(default)'));
  ok('Custom… option present', sel.innerHTML.includes('__custom__'));
  ok('custom row hidden initially', S.els['opt-model-custom-row'].hidden === true);
  ok('About row shows the model', S.els['opt-about-model'].textContent === 'gemini-3.1-flash-lite',
     S.els['opt-about-model'].textContent);

  console.log('custom row toggles:');
  sel.value = '__custom__'; sel.change(); await S.flush();
  ok('custom row shown when Custom… picked', S.els['opt-model-custom-row'].hidden === false);

  console.log('performance table:');
  const perf = S.els['opt-perf-body'].innerHTML;
  ok('renders a row per model', (perf.match(/perf-row/g)||[]).length === 2, perf.slice(0,200));
  ok('3.1 avg = (19000+8800)/14 = 1.99s', perf.includes('1.99s'), perf.match(/[\d.]+s/g));
  ok('2.5 avg = 7000/5 = 1.40s', perf.includes('1.40s'));
  ok('faster model sorted first', perf.indexOf('gemini-2.5-flash-lite') < perf.indexOf('gemini-3.1-flash-lite'));
  ok('call counts shown', perf.includes('>14<') && perf.includes('>5<'));
  ok('names the fastest', perf.includes('Fastest: gemini-2.5-flash-lite'));
  ok('40-day-old model excluded from 7d', !perf.includes('gemini-ancient'));
  ok('sparkline bars drawn', (perf.match(/<i /g)||[]).length === 14, (perf.match(/<i /g)||[]).length);
  ok('no NaN in bar heights', !/NaN/.test(perf));

  console.log('30d range:');
  S.els['opt-perf-30'].click(); await S.flush(); await S.flush();
  const perf30 = S.els['opt-perf-body'].innerHTML;
  ok('aria-pressed moved', S.els['opt-perf-30'].getAttribute('aria-pressed') === 'true'
     && S.els['opt-perf-7'].getAttribute('aria-pressed') === 'false');
  ok('30 bars per row', (perf30.match(/<i /g)||[]).length === 60, (perf30.match(/<i /g)||[]).length);
  ok('still excludes the 40-day-old model', !perf30.includes('gemini-ancient'));

  console.log('prompts:');
  ok('system textarea filled', S.els['opt-prompt-system'].value === defaults.system);
  ok('lookup prompt is NOT exposed for editing', S.els['opt-prompt-lookup'] === null ||
     S.els['opt-prompt-lookup'] === undefined);
  ok('locked contract shown', S.els['opt-prompt-contract'].value.includes('Output ONLY this JSON'));
  ok('locked schema pretty-printed', S.els['opt-prompt-schema'].value.includes('"type": "OBJECT"'));

  console.log('history:');
  const h = S.els['opt-prompt-history'].innerHTML;
  ok('one item per version', (h.match(/hist-item/g)||[]).length === 2);
  ok('newest first', h.indexOf('tighten domain rules') < h.indexOf('Default'));
  ok('base tag on v0', h.includes('>base<'));
  ok('current tag on newest', h.includes('>current<'));
  ok('+/- stats shown', h.includes('+1') && h.includes('-1'), h.match(/[+-]\d+/g));
  ok('collapsed by default (no diff yet)', !h.includes('class="diff"'));
  ok('version count label', S.els['opt-hist-count'].textContent === '2 versions',
     S.els['opt-hist-count'].textContent);

  console.log('language picker:');
  const lsel = S.els['opt-language'];
  ok('populated from the real packs', lsel.innerHTML.includes('සිංහල') && lsel.innerHTML.includes('Sinhala'),
     lsel.innerHTML.slice(0, 120));
  ok('tuned languages grouped under Tuned', /<optgroup label="Tuned">[^]*?සිංහල[^]*?<\/optgroup>/.test(lsel.innerHTML));
  ok('untuned languages grouped under Community', /<optgroup label="Community">[^]*?Tamil[^]*?<\/optgroup>/.test(lsel.innerHTML));
  ok('current selection applied', lsel.value === 'si', lsel.value);
  ok('note explains what tuned means', /worked examples/.test(S.els['opt-language-note'].textContent),
     S.els['opt-language-note'].textContent);

  console.log('language search (through options.js, not the module alone):');
  const lsearch = S.els['opt-language-search'];
  ok('search field is wired', (lsearch.listeners.input || []).length === 1 && (lsearch.listeners.keydown || []).length === 1);
  lsearch.value = 'hindi'; lsearch.listeners.input.forEach((f) => f({}));
  ok('typing filters the real select', /Hindi/.test(lsel.innerHTML) && !/සිංහල/.test(lsel.innerHTML), lsel.innerHTML);
  ok('and turns it into a list', lsel.attrs.size === '2', lsel.attrs.size);
  ok('count shown', /^1 of \d+/.test(S.els['opt-language-count'].textContent), S.els['opt-language-count'].textContent);
  lsearch.listeners.keydown.forEach((f) => f({ key: 'Escape', preventDefault() {} }));
  ok('Escape restores the full list', /සිංහල/.test(lsel.innerHTML) && !('size' in lsel.attrs));
  ok('Escape keeps the saved language', lsel.value === 'si', lsel.value);

  lsel.value = 'hi';
  await lsel.change(); for (let i=0;i<4;i++) await S.flush();
  ok('switching language updates the note',
     /Community language/.test(S.els['opt-language-note'].textContent),
     S.els['opt-language-note'].textContent);

  console.log('Settings follows a language changed in the popup:');
  // hi (community) -> en (tuned), so a note that did not move would fail.
  S.fireStorageChange({ targetLanguage: { oldValue: 'hi', newValue: 'en' } });
  ok('select follows', lsel.value === 'en', lsel.value);
  ok('About row follows', /English/.test(S.els['opt-about-language'].textContent), S.els['opt-about-language'].textContent);
  ok('note follows, community to tuned', /^Tuned/.test(S.els['opt-language-note'].textContent), S.els['opt-language-note'].textContent);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
