// Builds the two store zips from one source tree:
//   dist/contextreader-chrome-<v>.zip   → Chrome Web Store (also Brave, Edge)
//   dist/contextreader-firefox-<v>.zip  → addons.mozilla.org
// The Firefox manifest is DERIVED from manifest.json in firefoxManifest() below,
// so a permission added for Chrome cannot be forgotten in Firefox. dist/firefox/
// is left unzipped too, for `npx web-ext run --source-dir=dist/firefox`.
//
// This exists because a CRX is just a zip of the directory — without an explicit
// file list the PDF reader's 5.6MB ships whether or not the manifest references
// it, which is most of the package for a feature that is turned off.
//
// The list is derived from manifest.json wherever the manifest states it, so
// adding a content script or an options page cannot silently be left out of the
// build. EXTRA covers what the manifest cannot express.

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync, cpSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { firefoxManifest } from './firefox-manifest.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));

// Anything an HTML page pulls in that the manifest never names.
const EXTRA = ['lib/diff.js', 'lib/lang-picker.js', 'options.js', 'popup.js', 'welcome.js'];

const files = new Set(['manifest.json', ...EXTRA]);

for (const cs of manifest.content_scripts ?? []) (cs.js ?? []).forEach((f) => files.add(f));
// web_accessible_resources may hold patterns (fonts/*.woff2); expand them, or
// the existence check below rejects a pattern that is not a file.
for (const war of manifest.web_accessible_resources ?? []) for (const res of war.resources ?? []) {
    if (!res.includes('*')) { files.add(res); continue; }
    const dir = dirname(res);
    const suffix = res.slice(res.lastIndexOf('*') + 1);
    const here = join(ROOT, dir);
    if (!existsSync(here)) { console.error(`Refusing to package — ${res} matches nothing:`); process.exit(1); }
    const hits = readdirSync(here).filter((f) => f.endsWith(suffix)).map((f) => join(dir, f));
    if (!hits.length) { console.error(`Refusing to package — ${res} matches nothing.`); process.exit(1); }
    hits.forEach((f) => files.add(f));
}
if (manifest.background?.service_worker) files.add(manifest.background.service_worker);
if (manifest.action?.default_popup) files.add(manifest.action.default_popup);
if (manifest.options_ui?.page) files.add(manifest.options_ui.page);
Object.values(manifest.icons ?? {}).forEach((f) => files.add(f));
// default_icon may be one path or a {size: path} map.
const di = manifest.action?.default_icon;
if (typeof di === 'string') files.add(di);
else if (di) Object.values(di).forEach((f) => files.add(f));

const list = [...files].sort();
const missing = list.filter((f) => !existsSync(join(ROOT, f)));
if (missing.length) {
    console.error('Refusing to package — these are referenced but absent:');
    missing.forEach((f) => console.error('  ' + f));
    process.exit(1);
}

const outDir = join(ROOT, 'dist');
mkdirSync(outDir, { recursive: true });
const kb = (f) => (execFileSync('wc', ['-c', f]).toString().trim().split(/\s+/)[0] / 1024).toFixed(0);

// Chrome: the tree as it is.
const chromeZip = join(outDir, `contextreader-chrome-${manifest.version}.zip`);
rmSync(chromeZip, { force: true });
execFileSync('zip', ['-q', '-X', chromeZip, ...list], { cwd: ROOT });

// Firefox: the same files, with a derived manifest.
const ffDir = join(outDir, 'firefox');
rmSync(ffDir, { recursive: true, force: true });
for (const f of list) cpSync(join(ROOT, f), join(ffDir, f));
writeFileSync(join(ffDir, 'manifest.json'), JSON.stringify(firefoxManifest(manifest), null, 2) + '\n');
const ffZip = join(outDir, `contextreader-firefox-${manifest.version}.zip`);
rmSync(ffZip, { force: true });
execFileSync('zip', ['-q', '-X', ffZip, ...list], { cwd: ffDir });

console.log(`${chromeZip.replace(ROOT + '/', '')}  —  ${kb(chromeZip)} KB, ${list.length} files`);
console.log(`${ffZip.replace(ROOT + '/', '')}  —  ${kb(ffZip)} KB, ${list.length} files\n`);
list.forEach((f) => console.log('  ' + f));

// The reason this script exists: fail loudly if the PDF reader creeps back in.
const leaked = list.filter((f) => /^pdf|pdfium|sinhala-unicode/.test(f));
if (leaked.length) {
    console.error('\nPDF reader files are in the package:', leaked.join(', '));
    process.exit(1);
}

