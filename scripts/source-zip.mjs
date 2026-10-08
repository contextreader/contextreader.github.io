// The source archive AMO asks for. Chrome must never be given this file: it is
// the whole repository, including docs/, and the website's analytics tags read
// as "remotely hosted code" to a Chrome reviewer. That rejection happened on
// 8 Oct 2026 (violation "Blue Argon") when this zip was uploaded by mistake.
//
// So it is written to dist/mozilla-only/, named for its one purpose.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
const out = join(ROOT, 'dist', 'mozilla-only', `contextreader-source-${version}.zip`);
mkdirSync(dirname(out), { recursive: true });
execFileSync('git', ['archive', '--format=zip', '-o', out, 'HEAD'], { cwd: ROOT });

const kb = (execFileSync('wc', ['-c', out]).toString().trim().split(/\s+/)[0] / 1048576).toFixed(1);
console.log(`\n  ${out.replace(ROOT + '/', '')}  —  ${kb} MB`);
console.log('  For addons.mozilla.org ONLY. Chrome gets dist/contextreader-chrome-' + version + '.zip\n');
