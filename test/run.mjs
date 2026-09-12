// Runs every *.test.* file and sums the assertions.
// Regenerates the extracted modules first, so a stale slice can never be the
// reason a test passes.

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

execFileSync(process.execPath, [join(HERE, 'extract.mjs')], { stdio: 'inherit' });

const files = readdirSync(HERE).filter((f) => /\.test\.(m?js)$/.test(f)).sort();
let total = 0, failedFiles = [];

for (const f of files) {
    let out = '';
    let failed = false;
    try {
        out = execFileSync(process.execPath, [join(HERE, f)], { encoding: 'utf8' });
    } catch (e) {
        out = (e.stdout || '') + (e.stderr || '');
        failed = true;
    }
    const m = out.match(/(\d+) passed, (\d+) failed/);
    const passed = m ? Number(m[1]) : 0;
    const nfail = m ? Number(m[2]) : NaN;
    total += passed;
    if (failed || nfail !== 0) {
        failedFiles.push(f);
        console.log(`FAIL  ${f}`);
        console.log(out.split('\n').filter((l) => /FAIL|Error|error/.test(l)).slice(0, 8).join('\n'));
    } else {
        console.log(`ok    ${f.padEnd(30)} ${passed} assertions`);
    }
}

console.log(`\n${total} assertions across ${files.length} files`);
if (failedFiles.length) {
    console.log(`FAILED: ${failedFiles.join(', ')}`);
    process.exit(1);
}
console.log('all passing');
