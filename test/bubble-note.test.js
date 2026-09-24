// escapeHTML uses document.createElement — shim just that
globalThis.document = { createElement: () => ({
  textContent: '', set _t(v){}, get innerHTML() {
    return String(this.textContent).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;'); } }) };
const M = require('./.generated/bubble-note.cjs');
let pass=0, fail=0;
const ok=(l,c,x)=>{c?pass++:fail++; console.log(`  ${c?'PASS':'FAIL'}  ${l}`); if(!c&&x)console.log('    ',x);};

console.log('fallbackNoteHTML:');
ok('no meta -> empty', M.fallbackNoteHTML(null) === '');
ok('partial meta -> empty', M.fallbackNoteHTML({from:'a'}) === '');
const n = M.fallbackNoteHTML({from:'gemini-3.1-flash-lite', model:'gemini-2.5-flash-lite', reason:'quota'});
ok('renders the note', n.includes('quota reached'), n);
ok('gemini- prefix trimmed for readability', n.includes('3.1-flash-lite') && !n.includes('gemini-3.1'), n);
ok('names the answering model', n.includes('2.5-flash-lite'));
ok('uses the sr-fallback-note class', n.includes('class="sr-fallback-note"'));
ok('has the turnstile arrow', n.includes('↳'), JSON.stringify(n.slice(0,40)));

console.log('the note says why it fell back:');
{
    const note = (reason) => M.fallbackNoteHTML({ from: 'gemini-3.1-flash-lite', model: 'gemini-2.5-flash-lite', reason });
    ok('quota reads as a rate limit', /quota reached/.test(note('quota')), note('quota'));
    ok('a missing model says so, not "quota"', /unavailable on your key/.test(note('model')) && !/quota/.test(note('model')), note('model'));
    ok('a server fault says so', /not responding/.test(note('server')), note('server'));
    ok('an unknown reason still renders something true', /unavailable/.test(note('weird')), note('weird'));
    ok('and always names both models', ['quota','model','server'].every((r) => /3\.1-flash-lite/.test(note(r)) && /2\.5-flash-lite/.test(note(r))));
}

console.log('escaping (model id is data from an API response):');
const eviln = M.fallbackNoteHTML({from:'<img src=x onerror=alert(1)>', model:'b'});
ok('html in a model id is escaped', !eviln.includes('<img'), eviln);
ok('escaped form present', eviln.includes('&lt;img'), eviln);

console.log('buildLookupHTML integration:');
const plain = M.buildLookupHTML('culture', JSON.stringify({t:'රක්ත වගාව', d:'explanation'}));
ok('no note when no fallback', !plain.includes('sr-fallback-note'));
ok('translation rendered', plain.includes('රක්ත වගාව'));
ok('one .sr-section only', (plain.match(/class="sr-section"/g)||[]).length === 1);

const withFb = M.buildLookupHTML('culture', JSON.stringify({
  t:'රක්ත වගාව', d:'explanation',
  _m:{model:'gemini-2.5-flash-lite', from:'gemini-3.1-flash-lite', reason:'quota'}}));
ok('note present when fallback', withFb.includes('sr-fallback-note'));
ok('note is OUTSIDE .sr-body (after its close)',
   withFb.lastIndexOf('sr-fallback-note') > withFb.lastIndexOf('sr-details-placeholder'));
ok('still exactly one .sr-section', (withFb.match(/class="sr-section"/g)||[]).length === 1);
ok('.sr-body child count unchanged', 
   (withFb.match(/sr-details-placeholder/g)||[]).length === (plain.match(/sr-details-placeholder/g)||[]).length);

// the saveWord hazard: note must not become a div inside .sr-body
const bodyStart = withFb.indexOf('<div class="sr-body">');
const bodyEnd   = withFb.lastIndexOf('</div>', withFb.indexOf('sr-fallback-note'));
ok('note not inside the .sr-body block',
   withFb.indexOf('sr-fallback-note') > withFb.indexOf('</div>', bodyStart));

console.log('unicode / weird input:');
ok('sinhala word ok', M.buildLookupHTML('ශ්‍රී', JSON.stringify({t:'x',d:'y'})).includes('ශ්‍රී'));
ok('long word truncated', M.buildLookupHTML('a'.repeat(40), JSON.stringify({t:'x',d:'y'})).includes('...'));
ok('missing d gives the loading placeholder',
   M.buildLookupHTML('w', JSON.stringify({t:'x'})).includes('sr-d-loading'));

console.log('model HTML is sanitised before it reaches the page:');
{
    // Gemini reads the page, so a page can steer what it writes. Every place a
    // background response is assigned to innerHTML must go through sanitizeHTML.
    // (Its behaviour against real attacks is checked in a browser; Node has no
    // DOMParser. This guards the wiring.)
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'content.js'), 'utf8');
    ok('sanitizeHTML exists and parses inertly', /function sanitizeHTML\(html\)[\s\S]{0,200}new DOMParser\(\)\.parseFromString/.test(src));
    ok('the More answer is sanitised', /placeholder\.innerHTML = sanitizeHTML\(response\)/.test(src));
    ok('General and Simple are sanitised', /tempDiv\.innerHTML = sanitizeHTML\(htmlContent\)/.test(src));
    ok('a non-JSON lookup is sanitised', /if \(finalHTML === null\) finalHTML = sanitizeHTML\(response\)/.test(src));
    const raw = src.match(/\.innerHTML = (response|htmlContent)\s*;/g) || [];
    ok('no response is assigned to innerHTML raw', raw.length === 0, raw);
    ok('event handlers and images are not on the allowlist',
       !/SR_SAFE_TAGS = new Set\([^)]*'(img|svg|a|iframe|script)'/.test(src));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
