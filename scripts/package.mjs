// Builds the .zip that goes to the Chrome Web Store.
//
// This exists because a CRX is just a zip of the directory — without an explicit
// file list the PDF reader's 5.6MB ships whether or not the manifest references
// it, which is most of the package for a feature that is turned off.
//
// The list is derived from manifest.json wherever the manifest states it, so
// adding a content script or an options page cannot silently be left out of the
// build. EXTRA covers what the manifest cannot express.

import { readFileSync, existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const out = join(outDir, `contextreader-${manifest.version}.zip`);
mkdirSync(outDir, { recursive: true });
rmSync(out, { force: true });

execFileSync('zip', ['-q', '-X', out, ...list], { cwd: ROOT });

const bytes = execFileSync('wc', ['-c', out]).toString().trim().split(/\s+/)[0];
console.log(`${out.replace(ROOT + '/', '')}  —  ${(bytes / 1024).toFixed(0)} KB, ${list.length} files\n`);
list.forEach((f) => console.log('  ' + f));

// The reason this script exists: fail loudly if the PDF reader creeps back in.
const leaked = list.filter((f) => /^pdf|pdfium|sinhala-unicode/.test(f));
if (leaked.length) {
    console.error('\nPDF reader files are in the package:', leaked.join(', '));
    process.exit(1);
}
