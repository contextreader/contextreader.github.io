// Claims the product must not make. Each of these shipped on the welcome page
// in a build that could not back it: a daily quota in a build with no server,
// audio / video / save features that are constructed but never attached, a
// keyboard shortcut the manifest never declares, and a Sri Lankan flag as the
// icon for a feature that works in every language.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ok = (l, c, extra) => { c?pass++:fail++; console.log(`  ${c?'PASS':'FAIL'}  ${l}`); if(!c && extra !== undefined) console.log('    ', extra); };

const PAGES = ['welcome.html', 'popup.html', 'options.html', 'README.md', 'STORE_LISTING.md', 'docs/index.html'];
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const DEAD = [
    [/\b\d+\s+(free\s+)?lookups?\s+(per|a)\s+day|lookups\/day|resets every day/i, 'a daily quota — there is no server to enforce one'],
    [/video clip|see it used in movies/i, 'video clips — not attached in the bubble'],
    [/hear pronunciation|🔊/i, 'an audio button — not attached (Search → Pronounce is what exists)'],
    [/build your vocab list|save words/i, 'a saved-words list — not attached'],
    [/alt\+shift/i, 'a keyboard shortcut — manifest.json declares no commands'],
    [/🇱🇰|&#x1F1F1;&#x1F1F0;/i, 'the Sri Lankan flag — commitment four'],
];

console.log('no page promises something the build does not do:');
for (const f of PAGES) {
    const text = read(f);
    for (const [re, what] of DEAD) {
        const m = text.match(re);
        ok(`${f}: no ${what}`, !m, m && m[0]);
    }
}

console.log('the manifest agrees:');
const manifest = JSON.parse(read('manifest.json'));
ok('no commands declared, so no page may list a shortcut besides Esc', !manifest.commands);

console.log('teal is retired on screen:');
// The variable may linger in :root; what matters is that nothing paints with it.
for (const f of ['popup.html', 'options.html', 'welcome.html']) {
    const uses = (read(f).match(/var\(--teal[\w-]*\)/g) || []);
    ok(`${f} paints nothing with a teal token`, uses.length === 0, uses);
}

console.log('the welcome page covers the step people get stuck on:');
const welcome = read('welcome.html');
ok('asks for the key', /id="welcome-open-settings"/.test(welcome) && /aistudio\.google\.com\/apikey/.test(welcome));
ok('says why it needs one', /no server/i.test(welcome));
ok('key status is wired', /welcome-key-status/.test(read('welcome.js')) && /getKeyState/.test(read('welcome.js')));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
