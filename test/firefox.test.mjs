// The Firefox manifest is derived from manifest.json, never hand-kept, so a
// permission added for Chrome cannot be forgotten (or smuggled in) for Firefox.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { firefoxManifest } from '../scripts/firefox-manifest.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const chrome = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
const ff = firefoxManifest(chrome);
let pass = 0, fail = 0;
const ok = (l, c, x) => { c ? pass++ : fail++; console.log(`  ${c ? 'PASS' : 'FAIL'}  ${l}`); if (!c && x !== undefined) console.log('    ', x); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log('the Firefox manifest, derived:');
ok('no service worker (Firefox MV3 wants an event page)', !ff.background.service_worker);
ok('background loads the language table before the worker script',
   same(ff.background.scripts, ['lib/languages.js', chrome.background.service_worker]), ff.background);
ok('has the gecko id AMO requires, and it never changes',
   ff.browser_specific_settings?.gecko?.id === 'contextreader@contextreader.github.io');
ok('needs Firefox 140+ (data consent; host access granted at install)',
   parseFloat(ff.browser_specific_settings.gecko.strict_min_version) >= 140);
ok('declares that page text leaves the device, and nothing more',
   same(ff.browser_specific_settings.gecko.data_collection_permissions, { required: ['websiteContent'] }));
ok('same permissions as Chrome', same(ff.permissions, chrome.permissions));
ok('same single host permission as Chrome',
   same(ff.host_permissions, chrome.host_permissions) && ff.host_permissions.length === 1);
ok('same content scripts, CSP and web-accessible resources',
   same(ff.content_scripts, chrome.content_scripts) && same(ff.content_security_policy, chrome.content_security_policy)
   && same(ff.web_accessible_resources, chrome.web_accessible_resources));
ok('same version as Chrome', ff.version === chrome.version);
ok('Chrome manifest untouched by the derivation', !!chrome.background.service_worker && !chrome.browser_specific_settings);
ok('background.js survives having no importScripts', /if \(typeof importScripts === 'function'\) importScripts/.test(readFileSync(join(ROOT, 'background.js'), 'utf8')));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
