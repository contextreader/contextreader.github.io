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
    ok('faces are declared from lib/fonts.js and served by the extension',
       /@font-face/.test(src) && /CRFonts\.FACES\.map/.test(src)
       && /chrome\.runtime\.getURL\(`fonts\/\$\{f\.file\}`\)/.test(src)
       && !/googleapis[^`'"]*Inter/.test(src));
    const manifest = JSON.parse(read('manifest.json'));
    const war = (manifest.web_accessible_resources || []).flatMap((r) => r.resources || []);
    const F = require('../lib/fonts.js');
    const L2 = require('../lib/languages.js');
    ok('fonts are web-accessible, or the page cannot use them', war.includes('fonts/*.woff2'));
    ok('lib/fonts.js loads before content.js',
       manifest.content_scripts[0].js.indexOf('lib/fonts.js') < manifest.content_scripts[0].js.indexOf('content.js'));
    const absent = F.FACES.filter((f) => !fs.existsSync(path.join(ROOT, 'fonts', f.file))).map((f) => f.file);
    ok(`every declared face ships (${F.FACES.length})`, absent.length === 0, absent);
    ok('every face states a unicode-range, so subsets do not shadow each other',
       F.FACES.every((f) => /^U\+/.test(f.range)));
    // Inter covers Latin, Cyrillic and Greek; a reader of those makes no font request.
    const interSubsets = F.FACES.filter((f) => f.family === 'Inter').length;
    ok('Inter ships its three subsets', interSubsets === 3, interSubsets);
    const bundledSets = Object.entries(L2.TYPESETS).filter(([, t]) => t.bundled).map(([k]) => k);
    const missingFace = bundledSets.filter((k) => !F.FACES.some((f) => f.file === `noto-${k}.woff2` || f.file.startsWith(`noto-${k}-`)));
    ok(`every bundled typeset has a face (${bundledSets.length})`, missingFace.length === 0, missingFace);
    // CJK is deliberately not bundled: megabytes each, and every OS ships one.
    ok('CJK stays remote', ['sc', 'tc', 'jp', 'kr'].every((k) => !L2.TYPESETS[k].bundled));
    ok('fonts are enabled only from showBubble', (src.match(/enableFonts\(\)/g) || []).length === 2
        && /function showBubble\([^)]*\) \{\s*enableFonts\(\);/.test(src));
    ok('applyLangFont fetches nothing until fonts are on, and never for a bundled script',
       /if \(!srFontsOn \|\| !lang\.family \|\| lang\.bundled\) return;/.test(src));
    const printLinks = src.match(/<link [^>]*fonts\.googleapis\.com/g) || [];
    ok('markup font links in content.js are referrer-free', printLinks.every((l) => /referrerpolicy="no-referrer"/.test(l)), printLinks);
    for (const f of ['popup.html', 'options.html', 'welcome.html']) {
        const links = read(f).match(/<link [^>]*fonts\.googleapis\.com[^>]*>/g) || [];
        ok(`${f} font links are referrer-free`, links.length > 0 && links.every((l) => /referrerpolicy="no-referrer"/.test(l)), links);
    }
}

console.log('the search menu is readable where it overlaps the answer:');
// Seen in a screenshot on 17 Sep: the menu opens on top of the answer and the
// explanation, and it was built from the same 58-66% white glass as everything
// else, so the text underneath read straight through it. Worse, the header is
// its own stacking context, so the menu's z-index could not lift it above the
// body — the explanation painted over the menu.
{
    const css = read('content.js');
    const menu = css.slice(css.indexOf('.sr-g-menu {'), css.indexOf('}', css.indexOf('.sr-g-menu {')));
    ok('the menu surface is opaque', /background: linear-gradient\(180deg, #ffffff/.test(menu) && !/--sr-glass/.test(menu), menu.slice(0, 120));
    ok('the menu does not blur what it covers', !/backdrop-filter/.test(menu));
    ok('the header outranks the body, so the open menu is on top',
       /#smart-reader-bubble > \.sr-header \{ z-index: 3; \}/.test(css));
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
    // Two analytics hosts are allowed, both cookieless, because Ian wants visit
    // numbers for the site. Nothing else may load — and an allowed host still has
    // to be named in the privacy section, or the page would be counting people
    // while telling them it doesn't. The extension takes neither: its "no
    // tracking" claim is absolute and stays that way.
    const ANALYTICS = { 'static.cloudflareinsights.com': 'Cloudflare Web Analytics', 'gc.zgo.at': 'GoatCounter' };
    const allowed = Object.keys(ANALYTICS);
    const host = (u) => (u.match(/^(?:https?:)?\/\/([^/]+)/i) || [, ''])[1].toLowerCase();
    const strangers = external.filter((e) => !allowed.includes(host(e.split(': ')[1] || '')));
    ok('the site loads nothing from a third party, bar analytics', strangers.length === 0, strangers);

    // Look in the prose, not the markup: the <script> tag itself contains the
    // host, so searching the whole file would count the beacon as its own
    // disclosure — which it is not.
    const prose = site.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ');
    const undisclosed = external
        .map((e) => host(e.split(': ')[1] || ''))
        .filter((h) => allowed.includes(h))
        .filter((h) => !new RegExp(ANALYTICS[h].split(' ')[0], 'i').test(prose));
    ok('any analytics the site loads is named in the page itself', undisclosed.length === 0, undisclosed);
    const extension = read('content.js') + read('background.js') + read('popup.html') + read('options.html') + read('welcome.html');
    ok('and none of it is in the extension', !allowed.some((h) => extension.includes(h)));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
