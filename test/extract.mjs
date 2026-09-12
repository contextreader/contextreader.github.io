// Carves testable slices out of background.js and content.js.
//
// background.js is a service worker: it has no module boundaries and calls
// chrome.* at load. Rather than restructure shipping code to suit a test
// runner, this copies the relevant regions into ES modules that the tests
// import against a stubbed chrome. The slices are named by the comment banners
// in the source, so moving a block is fine but renaming a banner will fail
// loudly here rather than silently skip a test.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const bg = readFileSync(join(ROOT, 'background.js'), 'utf8');
const ct = readFileSync(join(ROOT, 'content.js'), 'utf8');

function seg(src, start, end, label) {
    const a = src.indexOf(start);
    if (a < 0) throw new Error(`extract: could not find start of ${label}: ${start}`);
    const b = src.indexOf(end, a);
    if (b < 0) throw new Error(`extract: could not find end of ${label}: ${end}`);
    return src.slice(a, b);
}

const head = seg(bg, 'const DEFAULT_MODEL', '// 🔑 API KEY STORAGE', 'header');

let key = seg(bg, 'const KEY_ENC_VERSION', '// 🧠 MODEL SELECTION', 'key layer');
key = key.slice(0, key.lastIndexOf('// ============================================'));

const model    = seg(bg, 'const CUSTOM_MODEL', '// ============================================\n// ↩️ QUOTA FALLBACK', 'model layer');
const fallback = seg(bg, 'const DEFAULT_COOLDOWN_MS', '// ============================================\n// ⏱️ LATENCY ROLLUP', 'fallback');
const latency  = seg(bg, 'const LATENCY_RETENTION_DAYS', '// HMAC signing is gone', 'latency');
const attach   = seg(bg, 'function attachMeta', '// ── DEFAULT: Single call', 'attachMeta');
const prompts  = seg(bg, 'const PROMPT_HISTORY_CAP', 'function schemaT(', 'prompt layer');
const lookupFn = seg(bg, 'const LOOKUP_PROMPT_FULL', '// Appended to LOOKUP_PROMPT_FULL', 'lookup prompt');
const sysInst  = seg(bg, 'const SYSTEM_INSTRUCTION', 'const LOOKUP_JSON_CONTRACT', 'system instruction');
const contract = seg(bg, 'const LOOKUP_JSON_CONTRACT', '// ============================================\n// ✎ EDITABLE PROMPTS', 'json contract');
const note     = seg(ct, 'function escapeHTML', 'let currentVideoRequestId', 'bubble note');

const out = (name, body) => writeFileSync(join(HERE, '.generated', name), body);

import { mkdirSync } from 'node:fs';
mkdirSync(join(HERE, '.generated'), { recursive: true });

// The model slice reads language packs; give the generated module the real ones
// rather than a stub, so a test cannot pass against a pack shape that no longer
// exists.
const LANG_IMPORT = "import { createRequire as __cr } from 'node:module';\n"
    + "const CRLanguages = __cr(import.meta.url)('../../lib/languages.js');\n";

out('model.mjs', LANG_IMPORT + head + key + model +
  '\nexport { getApiKey, getKeyState, getModelConfig, modelAcceptsThinking, requestGemini, listModels, DEFAULT_MODEL, CUSTOM_MODEL };\n');

out('fallback.mjs', head + fallback + attach +
  '\nexport { buildFallbackChain, isQuotaError, cooldownFrom, noteCooldown, attachMeta, DEFAULT_COOLDOWN_MS, MAX_COOLDOWN_MS };\n');

out('latency.mjs', latency +
  '\nexport { utcDay, pruneLatencyDaily, recordLatency, LATENCY_RETENTION_DAYS };\n');

out('prompts.mjs', lookupFn + sysInst + contract + prompts +
  '\nexport { promptDefaults, renderPrompt, validatePrompt, getPrompts, savePrompts, resetPrompts,'
  + ' restorePromptVersion, pushPromptVersion, ensureBaseVersion, DEFAULT_LOOKUP_TEMPLATE,'
  + ' SYSTEM_INSTRUCTION, PROMPT_HISTORY_CAP, LOOKUP_PROMPT_FULL };\n');

// 600k PBKDF2 iterations is right in production and far too slow to run
// dozens of times in a test. The algorithm under test is unchanged.
out('apikey.mjs', key.replace('PBKDF2_ITERS = 600000', 'PBKDF2_ITERS = 1000') +
  '\nexport { mask, getKeyState, getApiKey, enablePassphrase, unlockKey, lockKey,'
  + ' disablePassphrase, revokeKey, encryptApiKey, decryptApiKey };\n');

out('bubble-note.cjs',
  "const SR_ICONS = { bolt:'<B>', globe:'<G>', sparkle:'<S>' };\n" + note +
  '\nmodule.exports = { buildLookupHTML, fallbackNoteHTML, escapeHTML };\n');

console.log('extracted 6 modules into test/.generated/');
