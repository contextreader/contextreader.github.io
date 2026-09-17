// Downloads the typefaces the extension ships and writes lib/fonts.js from them.
//
//   node scripts/fetch-fonts.mjs
//
// Why bundle at all: a font fetched from Google Fonts tells Google's servers a
// reader's IP address, and a page's CSP can refuse it outright (GitHub sends
// font-src github.githubassets.com), leaving the bubble in system faces. Shipping
// the files removes both. Everything here is SIL Open Font License 1.1 — see
// NOTICE and docs/fonts/Inter-OFL.txt.
//
// What is NOT bundled: Noto Sans SC / TC / JP / KR. Those are megabytes each, and
// the systems that read them ship good CJK faces anyway. They are still fetched
// on demand, and lib/languages.js marks their typesets `bundled: false`.
//
// Inter needs its three subsets (latin, cyrillic, greek) with the unicode-range
// Google states, or a Cyrillic reader gets a Latin-only file and falls back to a
// system face for their own script.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'fonts');
const L = createRequire(import.meta.url)(join(ROOT, 'lib/languages.js'));

const UA = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36' };
const WEIGHTS = [400, 500, 600, 700, 800];          // Inter: the whole interface
const SCRIPT_WEIGHTS = [400, 600, 800];             // Noto: body, answer line, headword
const INTER_SUBSETS = ['latin', 'cyrillic', 'greek'];

async function css(family, weights) {
    const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${weights.join(';')}&display=swap`;
    const r = await fetch(url, { headers: UA });
    if (!r.ok) throw new Error(`${family}: ${r.status} from the css2 API`);
    return r.text();
}

// /* subset */ @font-face { ... font-weight: N ... src: url(U) ... unicode-range: R }
function faces(sheet) {
    const out = [];
    for (const m of sheet.matchAll(/(?:\/\* ([\w\[\]-]+) \*\/\s*)?@font-face \{([\s\S]*?)\}/g)) {
        const body = m[2];
        const pick = (re) => (body.match(re) || [, ''])[1];
        out.push({
            subset: m[1] || 'default',
            weight: pick(/font-weight:\s*(\d+)/),
            url: pick(/src:\s*url\(([^)]+)\)/),
            range: pick(/unicode-range:\s*([^;]+);/).trim(),
        });
    }
    return out;
}

// Google often serves ONE variable file for every weight of a family. Saving it
// per weight tripled fonts/ (5.3 MB) before this was noticed; now a repeated URL
// is stored once and declared with a weight range, which is what a variable font
// wants anyway.
async function save(name, url) {
    const r = await fetch(url, { headers: UA });
    if (!r.ok) throw new Error(`${name}: ${r.status} fetching the file`);
    const buf = Buffer.from(await r.arrayBuffer());
    writeFileSync(join(OUT, name), buf);
    return buf.length;
}

const declared = [];
let total = 0;

mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith('.woff2')) unlinkSync(join(OUT, f));

// ---- Inter, three subsets ----------------------------------------------
{
    const all = faces(await css('Inter', WEIGHTS));
    for (const subset of INTER_SUBSETS) {
        const picked = WEIGHTS.map((w) => {
            const face = all.find((x) => x.subset === subset && x.weight === String(w));
            if (!face) throw new Error(`Inter: no ${subset} face at weight ${w}`);
            return { w, face };
        });
        const one = new Set(picked.map((x) => x.face.url)).size === 1;
        for (const { w, face } of one ? picked.slice(0, 1) : picked) {
            const file = one ? `inter-${subset}.woff2` : `inter-${subset}-${w}.woff2`;
            total += await save(file, face.url);
            declared.push({ family: 'Inter', weight: one ? `${WEIGHTS[0]} ${WEIGHTS.at(-1)}` : w, file, range: face.range });
        }
    }
}

// ---- one Noto family per bundled typeset --------------------------------
for (const [key, t] of Object.entries(L.TYPESETS)) {
    if (!t.family || !t.bundled) continue;
    const family = t.family.split(':')[0];
    const all = faces(await css(family, SCRIPT_WEIGHTS));
    // The script's own subset, not the latin/cyrillic ones Google bundles along.
    const own = all.filter((x) => !/^(latin|cyrillic|greek|vietnamese)(-ext)?$/.test(x.subset));
    const picked = SCRIPT_WEIGHTS.map((w) => {
        const face = own.find((x) => x.weight === String(w));
        if (!face) throw new Error(`${family}: no face at weight ${w}`);
        return { w, face };
    });
    const one = new Set(picked.map((x) => x.face.url)).size === 1;
    for (const { w, face } of one ? picked.slice(0, 1) : picked) {
        const file = one ? `noto-${key}.woff2` : `noto-${key}-${w}.woff2`;
        total += await save(file, face.url);
        declared.push({ family: family.replace(/\+/g, ' '),
            weight: one ? `${SCRIPT_WEIGHTS[0]} ${SCRIPT_WEIGHTS.at(-1)}` : w, file, range: face.range });
    }
    process.stdout.write(`${key} `);
}

// ---- lib/fonts.js -------------------------------------------------------
const body = declared.map((d) =>
    `        { family: ${JSON.stringify(d.family)}, weight: ${JSON.stringify(String(d.weight))}, file: ${JSON.stringify(d.file)}, range: ${JSON.stringify(d.range)} },`).join('\n');

writeFileSync(join(ROOT, 'lib/fonts.js'), `// lib/fonts.js — GENERATED by scripts/fetch-fonts.mjs. Do not edit by hand.
//
// Every typeface that ships inside the extension: family, weight, the file in
// fonts/, and the unicode-range Google Fonts states for that subset. content.js
// turns these into @font-face rules pointing at chrome.runtime.getURL, so the
// interface needs no network and no page's CSP can refuse it.
//
// Regenerate after changing which typesets are \`bundled\` in lib/languages.js:
//     node scripts/fetch-fonts.mjs

(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.CRFonts = api;
})(typeof self !== 'undefined' ? self : this, function () {
    return {
        FACES: [
${body}
        ],
    };
});
`);

console.log(`\n${declared.length} files, ${(total / 1024 / 1024).toFixed(2)} MB in fonts/, listed in lib/fonts.js`);
