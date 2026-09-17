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

{
    const src = read('content.js');
    const teal = src.match(/#0891b2|#0e7490|rgba\(8,\s*145,\s*178/gi) || [];
    ok('content.js paints nothing teal (the --sr-teal-* names resolve to ink)', teal.length === 0, teal);
}

console.log('fonts do not tell Google which sites someone visits:');
// Until 15 Sep, content.js @imported Inter in its stylesheet at load, so every page
// visited sent fonts.googleapis.com a request carrying that page's origin. A
// recorded page load showed it; these hold the fix in place.
{
    const src = read('content.js');
    const css = src.slice(src.indexOf('const styles = `'), src.indexOf('`;', src.indexOf('const styles = `')));
    ok('the bubble stylesheet has no @import', !/@import/.test(css));
    const creates = (src.match(/createElement\(['"]link['"]\)/g) || []).length;
    const noRef = (src.match(/referrerPolicy = 'no-referrer'/g) || []).length;
    ok('every font <link> content.js creates is referrer-free', creates === 1 && noRef === 1, { creates, noRef });
    // Inter ships in the extension: no request for it, and nothing for a page's
    // CSP to refuse. Verified 17 Sep with the unpacked extension on github.com,
    // which refuses Google Fonts but serves chrome-extension:// fonts fine.
    ok('Inter is bundled, not fetched', /@font-face/.test(src) && /chrome\.runtime\.getURL\(`fonts\/inter-/.test(src)
        && !/googleapis[^`'"]*Inter/.test(src));
    const manifest = JSON.parse(read('manifest.json'));
    const war = (manifest.web_accessible_resources || []).flatMap((r) => r.resources || []);
    const weights = [400, 500, 600, 700, 800];
    ok('every bundled weight exists and is web-accessible',
       weights.every((w) => war.includes(`fonts/inter-${w}.woff2`) && fs.existsSync(path.join(ROOT, `fonts/inter-${w}.woff2`))),
       war.filter((r) => r.startsWith('fonts/')));
    ok('fonts are enabled only from showBubble', (src.match(/enableFonts\(\)/g) || []).length === 2
        && /function showBubble\([^)]*\) \{\s*enableFonts\(\);/.test(src));
    ok('applyLangFont fetches nothing until fonts are on', /if \(!srFontsOn \|\| !lang\.family\) return;/.test(src));
    const printLinks = src.match(/<link [^>]*fonts\.googleapis\.com/g) || [];
    ok('markup font links in content.js are referrer-free', printLinks.every((l) => /referrerpolicy="no-referrer"/.test(l)), printLinks);
    for (const f of ['popup.html', 'options.html', 'welcome.html']) {
        const links = read(f).match(/<link [^>]*fonts\.googleapis\.com[^>]*>/g) || [];
        ok(`${f} font links are referrer-free`, links.length > 0 && links.every((l) => /referrerpolicy="no-referrer"/.test(l)), links);
    }
}

console.log('the welcome page covers the step people get stuck on:');
const welcome = read('welcome.html');
ok('asks for the key', /id="welcome-open-settings"/.test(welcome) && /aistudio\.google\.com\/apikey/.test(welcome));
ok('says why it needs one', /no server/i.test(welcome));
ok('key status is wired', /welcome-key-status/.test(read('welcome.js')) && /getKeyState/.test(read('welcome.js')));
// The privacy policy has always said the free and paid Gemini tiers differ in whether
// prompts may train Google's models; the page a new user actually reads did not.
ok('says the free/paid tiers differ on training, as the policy does',
   /free and paid tiers[^<]*Gemini API differ in whether/i.test(welcome.replace(/\s+/g, ' ')) && /gemini-api\/terms/.test(welcome));

console.log('the site tells the truth about languages, however it presents them:');
{
    const L = require('../lib/languages.js');
    const site = read('docs/index.html');
    const n = L.listLangs().length;
    const tuned = L.listLangs().filter((x) => x.tuned);

    // The page may print the whole list or explain coverage in prose — that is the
    // landing session's call. What it may not do is state a stale count, hide the
    // tuned/community distinction, or drift from lib/languages.js where it does list.
    ok(`the site names the right count (${n})`, new RegExp(`\\b${n}\\b`).test(site) && !/\b13 languages\b/.test(site));
    // Any wording is fine — "community", "without them", "not tuned" — as long as
    // the page says the others do not carry checked examples. Claiming parity is
    // the thing that would be false.
    ok('the site keeps the tuned / not-tuned distinction',
       /tuned/i.test(site) && /communit|without them|no hand-checked|not tuned|less reliable/i.test(site));
    const namesTuned = tuned.every((l) => site.includes(l.name));
    ok('and names which languages are tuned', namesTuned, tuned.map((l) => l.name));

    const hasList = site.includes('<!-- languages:start') && site.includes('<!-- languages:end');
    if (hasList) {
        const block = site.slice(site.indexOf('<!-- languages:start'), site.indexOf('<!-- languages:end'));
        const missing = L.listLangs().filter((l) => !block.includes(`lang="${l.code}"`)).map((l) => l.code);
        const listed = (block.match(/<li[ >]/g) || []).length;
        ok('the printed list is every language and nothing extra', missing.length === 0 && listed === n, { missing, listed });
    } else {
        // Regenerate with scripts/site-languages.mjs if a list comes back.
        ok('no printed list, so nothing can drift from lib/languages.js', true);
    }
    // The rule is that the page LOADS nothing from anywhere else — not that it
    // never says the words. Naming the hosts is what makes the privacy claim
    // checkable: "a font request goes to fonts.googleapis.com, with no referrer"
    // is worth more to a reader than hiding it. So this looks at subresources
    // only: <link href>, src/srcset, CSS url(), @import. <a href> is a link a
    // person clicks, not a request the page makes.
    const external = [];
    const scan = (re, what) => {
        for (const m of site.matchAll(re)) {
            const url = (m[1] || '').trim();
            if (/^(https?:)?\/\//i.test(url)) external.push(`${what}: ${url.slice(0, 60)}`);
        }
    };
    // rel=canonical and rel=alternate name a URL, they don't fetch one;
    // preconnect and dns-prefetch DO open a connection, so they count.
    for (const m of site.matchAll(/<link\b([^>]*)>/gi)) {
        const tag = m[1];
        const rel = (tag.match(/\brel\s*=\s*["']([^"']+)/i) || [, ''])[1].toLowerCase();
        if (/canonical|alternate/.test(rel)) continue;
        const href = (tag.match(/\bhref\s*=\s*["']([^"']+)/i) || [, ''])[1].trim();
        if (/^(https?:)?\/\//i.test(href)) external.push(`link rel=${rel || '?'}: ${href.slice(0, 60)}`);
    }
    scan(/\b(?:src|srcset)\s*=\s*["']([^"',]+)/gi, 'src');
    scan(/url\(\s*["']?([^"')]+)/gi, 'css url()');
    scan(/@import\s+(?:url\()?\s*["']?([^"');]+)/gi, '@import');
    ok('the site loads nothing from a third party', external.length === 0, external);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
