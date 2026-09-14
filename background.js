importScripts('lib/languages.js');

// background.js — DIRECT GEMINI MODE (experiment build)
// No Cloudflare Worker, no Supabase cache, no HMAC, no server-side rate limit.
// Each user supplies their own free Gemini API key in Settings.

// The model is a user setting now (Settings → Model). This is only the
// default, and the head of the fallback chain. Changing it here changes what a
// tester gets before they have ever opened Settings.
const DEFAULT_MODEL = "gemini-3.1-flash-lite";
const GEMINI_BASE   = "https://generativelanguage.googleapis.com/v1beta/models";

// ============================================
// 🔑 API KEY STORAGE
// ============================================
//
// Two modes, both honest about what they protect against.
//
//   plain      — chrome.storage.local, never .sync (.sync replicates to
//                Google's servers). Read only here in the service worker,
//                never handed to a content script, masked in Settings, never
//                logged. Stops page scripts and accidental leaks. Does NOT
//                stop someone who can read the browser profile off disk.
//
//   passphrase — AES-GCM, key derived by PBKDF2 from a passphrase the
//                extension never stores. Ciphertext at rest; plaintext lives
//                in chrome.storage.session while unlocked. This is the only
//                mode that survives profile theft, and the cost is real: a
//                forgotten passphrase means re-entering the API key, because
//                there is nothing to recover it from.
//
// Encrypting with a key the extension also stores would be theatre — both
// halves would sit side by side — so that option is deliberately absent.

const KEY_ENC_VERSION = 1;
const PBKDF2_ITERS = 600000;   // OWASP's 2023 floor for PBKDF2-SHA256

const b64 = (buf) => btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(passphrase, salt) {
    const material = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: PBKDF2_ITERS, hash: "SHA-256" },
        material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function encryptApiKey(plain, passphrase) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase, salt);
    const ct = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
    return { v: KEY_ENC_VERSION, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}

// Returns null on a wrong passphrase: AES-GCM authenticates, so a bad key
// fails the tag check rather than yielding garbage.
async function decryptApiKey(blob, passphrase) {
    try {
        const key = await deriveKey(passphrase, unb64(blob.salt));
        const pt = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: unb64(blob.iv) }, key, unb64(blob.ct));
        return new TextDecoder().decode(pt);
    } catch (e) {
        return null;
    }
}

async function getKeyState() {
    const { geminiApiKey, geminiApiKeyEnc } =
        await chrome.storage.local.get(["geminiApiKey", "geminiApiKeyEnc"]);
    if (geminiApiKeyEnc) {
        const { apiKeyPlain } = await chrome.storage.session.get("apiKeyPlain");
        const plain = (apiKeyPlain || "").trim();
        return { hasKey: true, protection: "passphrase", unlocked: !!plain, masked: mask(plain) };
    }
    const plain = (geminiApiKey || "").trim();
    return { hasKey: !!plain, protection: "plain", unlocked: !!plain, masked: mask(plain) };
}

// Enough to recognise which key is loaded, not enough to use it.
function mask(key) {
    const k = String(key || "");
    if (!k) return "";
    if (k.length <= 10) return k.slice(0, 2) + "\u2026";
    return k.slice(0, 4) + "\u2026" + k.slice(-3);
}

// chrome.storage.session, not a module variable: the MV3 service worker is
// evicted between calls, which would drop an in-memory key and force a
// re-unlock on every lookup.
async function getApiKey() {
    const { geminiApiKey, geminiApiKeyEnc } =
        await chrome.storage.local.get(["geminiApiKey", "geminiApiKeyEnc"]);
    if (geminiApiKeyEnc) {
        const { apiKeyPlain } = await chrome.storage.session.get("apiKeyPlain");
        return (apiKeyPlain || "").trim();
    }
    return (geminiApiKey || "").trim();
}

async function enablePassphrase(passphrase) {
    if (!passphrase || String(passphrase).length < 8) {
        return { ok: false, error: "too_short" };
    }
    const plain = await getApiKey();
    if (!plain) return { ok: false, error: "no_key" };
    const blob = await encryptApiKey(plain, passphrase);
    await chrome.storage.local.set({ geminiApiKeyEnc: blob });
    await chrome.storage.local.remove("geminiApiKey");
    await chrome.storage.session.set({ apiKeyPlain: plain });   // stay unlocked now
    return { ok: true };
}

async function unlockKey(passphrase) {
    const { geminiApiKeyEnc } = await chrome.storage.local.get("geminiApiKeyEnc");
    if (!geminiApiKeyEnc) return { ok: false, error: "not_encrypted" };
    const plain = await decryptApiKey(geminiApiKeyEnc, passphrase || "");
    if (!plain) return { ok: false, error: "wrong_passphrase" };
    await chrome.storage.session.set({ apiKeyPlain: plain });
    return { ok: true };
}

async function lockKey() {
    await chrome.storage.session.remove("apiKeyPlain");
    return { ok: true };
}

// Needs the passphrase: turning encryption off must prove you could have read
// the key anyway, otherwise it is a way to strip protection without it.
async function disablePassphrase(passphrase) {
    const { geminiApiKeyEnc } = await chrome.storage.local.get("geminiApiKeyEnc");
    if (!geminiApiKeyEnc) return { ok: false, error: "not_encrypted" };
    const plain = await decryptApiKey(geminiApiKeyEnc, passphrase || "");
    if (!plain) return { ok: false, error: "wrong_passphrase" };
    await chrome.storage.local.set({ geminiApiKey: plain });
    await chrome.storage.local.remove("geminiApiKeyEnc");
    await chrome.storage.session.remove("apiKeyPlain");
    return { ok: true };
}

async function revokeKey() {
    await chrome.storage.local.remove(["geminiApiKey", "geminiApiKeyEnc"]);
    await chrome.storage.session.remove("apiKeyPlain");
    return { ok: true };
}

// ============================================
// 🧠 MODEL SELECTION
// ============================================

// Sentinel for "the tester typed their own model id".
const CUSTOM_MODEL = "__custom__";

const MODEL_PREF_DEFAULTS = {
    selected: DEFAULT_MODEL,
    custom:   "",      // used only when selected === CUSTOM_MODEL
    paidPlan: false    // set by the tester; suppresses automatic model switching
};

// The language the reader wants explanations in. Packs live in lib/languages.js.
async function getTargetLanguage() {
    const { targetLanguage } = await chrome.storage.local.get('targetLanguage');
    return CRLanguages.getLang(targetLanguage || CRLanguages.DEFAULT_LANG);
}

// Everything a prompt template needs to know about the target language.
async function langVars() {
    const lang = await getTargetLanguage();
    return { langName: lang.name, examples: CRLanguages.examplesBlock(lang.code) };
}

async function getModelConfig() {
    const { modelPref } = await chrome.storage.local.get("modelPref");
    const pref = Object.assign({}, MODEL_PREF_DEFAULTS, modelPref || {});
    const picked = pref.selected === CUSTOM_MODEL ? pref.custom : pref.selected;
    const model = String(picked || "").trim() || DEFAULT_MODEL;
    return { model, paidPlan: !!pref.paidPlan, pref };
}

// thinkingConfig is understood only by the reasoning models — 2.5 and 3.x.
// Sending it anywhere else is a 400 INVALID_ARGUMENT that fails the whole
// request, so this cannot stay unconditional once the tester can pick a model.
// Unknown ids get the benefit of the doubt and are rescued by the retry in
// requestGemini() when the guess is wrong.
function modelAcceptsThinking(model) {
    const m = String(model);
    if (/^gemini-2\.5/.test(m)) return true;
    if (/^gemini-([3-9]|\d{2,})/.test(m)) return true;
    return false;
}

// Ask Google which models this key can actually reach, rather than shipping a
// hardcoded list that goes stale. Also doubles as key verification: it fails
// loudly on a bad key and costs no generateContent quota.
async function listModels(apiKey) {
    const key = (apiKey || await getApiKey()).trim();
    if (!key) return { ok: false, error: "no_key", models: [] };
    try {
        const r = await fetch(`${GEMINI_BASE.replace(/\/models$/, "")}/models?key=${encodeURIComponent(key)}&pageSize=200`);
        const d = await r.json();
        if (d.error) {
            // Google sends a readable sentence; the enum is for us, not the
            // tester. Verified against a real INVALID_ARGUMENT response.
            return {
                ok: false,
                error: d.error.status || String(d.error.code),
                message: d.error.message || "",
                models: []
            };
        }
        const models = (d.models || [])
            .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
            .map(m => ({
                id: String(m.name || "").replace(/^models\//, ""),
                label: m.displayName || "",
                inputTokenLimit: m.inputTokenLimit || 0
            }))
            .filter(m => m.id);
        return { ok: true, models };
    } catch (e) {
        return { ok: false, error: e.message, models: [] };
    }
}

// One HTTP round trip. Returns { status, data, networkMs, parseMs } and never
// throws on an API-level error — callers read data.error. Split out of
// callGemini() so a fallback chain can replay the same payload on another model.
async function requestGemini(model, payload, apiKey) {
    const send = async (body) => {
        const t0 = performance.now();
        const r = await fetch(
            `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
        const networkMs = Math.round(performance.now() - t0);
        const t1 = performance.now();
        const data = await r.json();
        return { status: r.status, data, networkMs, parseMs: Math.round(performance.now() - t1) };
    };

    let res = await send(payload);

    // The modelAcceptsThinking() guess was wrong for this id. Retry once without
    // it instead of failing the lookup — custom ids are the main beneficiary.
    if (res.status === 400 &&
        payload.generationConfig?.thinkingConfig &&
        /thinking/i.test(res.data?.error?.message || "")) {
        console.warn(`↻ ${model} rejected thinkingConfig — retrying without it`);
        const { thinkingConfig, ...genRest } = payload.generationConfig;
        res = await send({ ...payload, generationConfig: genRest });
    }

    return res;
}

// ============================================
// ↩️ QUOTA FALLBACK
// ============================================

const DEFAULT_COOLDOWN_MS = 60000;
const MAX_COOLDOWN_MS = 3600000;

// Only the light models. A fallback that lands on a pro model could cost a
// tester real money on a key they told us is free — worse than a failed lookup.
async function buildFallbackChain(primary) {
    const { modelListCache } = await chrome.storage.local.get('modelListCache');
    const avail = ((modelListCache && modelListCache.models) || [])
        .map(m => m && m.id).filter(Boolean);
    const lite  = avail.filter(id => id.includes('flash-lite'));
    const flash = avail.filter(id => id.includes('flash') && !id.includes('flash-lite'));
    const chain = [primary];
    for (const id of lite.concat(flash)) if (!chain.includes(id)) chain.push(id);
    return chain;
}

function isQuotaError(res) {
    if (!res) return false;
    if (res.status === 429) return true;
    const st = res.data && res.data.error && res.data.error.status;
    return st === "RESOURCE_EXHAUSTED";
}

// Google may name its own retry delay in the error details. Prefer it over a
// guess; fall back to a minute, which covers the per-minute limit.
// NOTE: derived from the documented shape, not from an observed 429 body.
function cooldownFrom(res) {
    try {
        const details = (res.data.error.details || []);
        for (const d of details) {
            const raw = d.retryDelay || d.retry_delay;
            if (!raw) continue;
            const secs = parseFloat(String(raw).replace(/s$/, ''));
            if (Number.isFinite(secs) && secs > 0) {
                return Math.min(MAX_COOLDOWN_MS, Math.round(secs * 1000));
            }
        }
    } catch (e) { /* fall through to the default */ }
    return DEFAULT_COOLDOWN_MS;
}

async function noteCooldown(model, ms) {
    const { modelCooldowns } = await chrome.storage.local.get({ modelCooldowns: {} });
    const cd = modelCooldowns || {};
    const now = Date.now();
    for (const k of Object.keys(cd)) if (!(cd[k] > now)) delete cd[k];
    cd[model] = now + ms;
    await chrome.storage.local.set({ modelCooldowns: cd });
}

// ============================================
// ⏱️ LATENCY ROLLUP
// ============================================

// latencyLog keeps the last 200 individual calls — roughly four days at fifty
// lookups a day — so the 30-day per-model averages in Settings cannot be
// derived from it. This is a parallel, permanently-small rollup:
//   latencyDaily: { "YYYY-MM-DD": { "<model>": { count, sumMs } } }
// Two numbers per model per day, pruned at 30 days.
const LATENCY_RETENTION_DAYS = 30;

function utcDay(ts) {
    return new Date(ts).toISOString().slice(0, 10);
}

function pruneLatencyDaily(daily, now = Date.now()) {
    const cutoff = utcDay(now - LATENCY_RETENTION_DAYS * 86400000);
    for (const day of Object.keys(daily)) {
        // ISO dates compare correctly as strings
        if (day < cutoff) delete daily[day];
    }
    return daily;
}

function recordLatency(model, ms, now = Date.now()) {
    if (!model || !Number.isFinite(ms)) return;
    const day = utcDay(now);
    chrome.storage.local.get({ latencyDaily: {} }, (res) => {
        const daily = res.latencyDaily || {};
        if (!daily[day]) daily[day] = {};
        const cell = daily[day][model] || (daily[day][model] = { count: 0, sumMs: 0 });
        cell.count += 1;
        cell.sumMs += ms;
        pruneLatencyDaily(daily, now);
        chrome.storage.local.set({ latencyDaily: daily });
    });
}

// HMAC signing is gone in direct mode — the shared secret belonged to the
// Cloudflare Worker and is deliberately NOT present in this build.

// Cached access info from /access endpoint
let _accessCache = null;

// ============================================
// 🌍 GLOBAL COUNTER (Community Stats)
// ============================================
// Direct mode: the global counter lived on the Worker. Count locally instead.
async function incrementGlobalCounter() {
    const { localLookupCount = 0 } = await chrome.storage.local.get("localLookupCount");
    const total = localLookupCount + 1;
    await chrome.storage.local.set({ localLookupCount: total });
    return total;
}

async function getGlobalCounter() {
    const { localLookupCount = 0 } = await chrome.storage.local.get("localLookupCount");
    return localLookupCount;
}

// ============================================
// 🎯 MESSAGE LISTENERS
// ============================================

// The *Sinhala lookups are not "translate into Sinhala" — they are a monolingual
// mode that rewrites a hard Sinhala word into easier Sinhala. Their section
// labels and mandated openers are literal Sinhala strings, so they only make
// sense when Sinhala is BOTH the source and the target. Selecting Sinhala text
// while reading in Hindi must not route here.
async function useMonolingual(requestLang) {
    if (requestLang !== 'si') return false;
    const lang = await getTargetLanguage();
    return lang.code === 'si';
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const currentUrl = sender.tab ? sender.tab.url : "Unknown";

    if (request.action === "lookup") {
        const tabId = sender.tab ? sender.tab.id : null;
        useMonolingual(request.lang).then((mono) => {
            const fn = mono ? lookupContextSinhala : lookupContext;
            fn(request.text, request.context, currentUrl, tabId).then(sendResponse);
        });
        return true;
    }
    if (request.action === "lookupDetails") {
        useMonolingual(request.lang).then((mono) => {
            const fn = mono ? lookupDetailsSinhala : lookupDetails;
            fn(request.text, request.context, currentUrl).then(sendResponse);
        });
        return true;
    }
    if (request.action === "lookupGeneral") {
        useMonolingual(request.lang).then((mono) => {
            const fn = mono ? lookupGeneralSinhala : lookupGeneral;
            fn(request.text).then(sendResponse);
        });
        return true;
    }
    if (request.action === "lookupSimple") {
        useMonolingual(request.lang).then((mono) => {
            const fn = mono ? lookupSimpleSinhala : lookupSimple;
            fn(request.text, request.context).then(sendResponse);
        });
        return true;
    }
    if (request.action === "generateStudySheetV2") {
        const tabId = sender.tab ? sender.tab.id : null;
        generateStudySheetV2(request.chunks, request.level, request.lang, tabId, request.calibrationWords).then(sendResponse);
        return true;
    }
    
    // 🌍 GLOBAL COUNTER
    if (request.action === "getGlobalCount") {
        getGlobalCounter().then(sendResponse);
        return true;
    }
    if (request.action === "incrementGlobalCount") {
        incrementGlobalCounter().then(sendResponse);
        return true;
    }

    // 📊 USAGE LIMITS
    if (request.action === "getUsage") {
        // Direct mode: no server-side counter.
        sendResponse({ used: 0, limit: 0, remaining: 0, unlimited: true });
        return false;
    }

    // 🔑 ACCESS INFO (permissions, limits)
    if (request.action === "getAccessInfo") {
        getAccessInfo().then(sendResponse);
        return true;
    }

    // 🔄 CLEAR ACCESS CACHE (for refresh button)
    if (request.action === "clearAccessCache") {
        _accessCache = null;
        sendResponse({ ok: true });
        return false;
    }

    // ⏱️ LATENCY LOG (for testing)
    if (request.action === "getLatencyLog") {
        chrome.storage.local.get({ latencyLog: [] }, (res) => sendResponse(res.latencyLog));
        return true;
    }
    if (request.action === "getLatencyDaily") {
        chrome.storage.local.get({ latencyDaily: {} }, (res) =>
            sendResponse({ daily: pruneLatencyDaily(res.latencyDaily || {}), retentionDays: LATENCY_RETENTION_DAYS }));
        return true;
    }
    if (request.action === "clearLatencyDaily") {
        chrome.storage.local.set({ latencyDaily: {} }, () => sendResponse({ ok: true }));
        return true;
    }
    if (request.action === "clearLatencyLog") {
        chrome.storage.local.set({ latencyLog: [] }, () => sendResponse({ ok: true }));
        return true;
    }

    // ---- API key (Settings) ----
    if (request.action === "getKeyState") {
        getKeyState().then(sendResponse);
        return true;
    }
    if (request.action === "saveApiKey") {
        (async () => {
            const key = String(request.key || "").trim();
            if (!key) return { ok: false, error: "empty" };
            const { geminiApiKeyEnc } = await chrome.storage.local.get("geminiApiKeyEnc");
            if (geminiApiKeyEnc) {
                // Already in passphrase mode — re-encrypt under the same one.
                if (!request.passphrase) return { ok: false, error: "passphrase_required" };
                const blob = await encryptApiKey(key, request.passphrase);
                await chrome.storage.local.set({ geminiApiKeyEnc: blob });
                await chrome.storage.session.set({ apiKeyPlain: key });
                return { ok: true };
            }
            await chrome.storage.local.set({ geminiApiKey: key });
            return { ok: true };
        })().then(sendResponse);
        return true;
    }
    if (request.action === "revokeKey")       { revokeKey().then(sendResponse); return true; }
    if (request.action === "enablePassphrase"){ enablePassphrase(request.passphrase).then(sendResponse); return true; }
    if (request.action === "disablePassphrase"){ disablePassphrase(request.passphrase).then(sendResponse); return true; }
    if (request.action === "unlockKey")       { unlockKey(request.passphrase).then(sendResponse); return true; }
    if (request.action === "lockKey")         { lockKey().then(sendResponse); return true; }

    // ---- target language (Settings + welcome) ----
    if (request.action === "getLanguages") {
        getTargetLanguage().then((lang) => sendResponse({
            current: lang.code,
            languages: CRLanguages.listLangs(),
            defaultLang: CRLanguages.DEFAULT_LANG
        }));
        return true;
    }
    if (request.action === "setLanguage") {
        const code = CRLanguages.LANGUAGES[request.code] ? request.code : CRLanguages.DEFAULT_LANG;
        chrome.storage.local.set({ targetLanguage: code }, () =>
            sendResponse({ ok: true, lang: CRLanguages.getLang(code) }));
        return true;
    }

    // ---- editable prompts (Settings) ----
    if (request.action === "getPrompts") {
        Promise.all([getPrompts(), chrome.storage.local.get({ promptHistory: [] }), getTargetLanguage()])
            .then(([p, { promptHistory }, lang]) => sendResponse({
                prompts: p,
                defaults: promptDefaults(),
                locked: { jsonContract: LOOKUP_JSON_CONTRACT, schema: schemaTD(lang.name) },
                history: promptHistory || [],
                placeholders: REQUIRED_PLACEHOLDERS
            }));
        return true;
    }
    if (request.action === "savePrompts") {
        savePrompts(request.prompts, request.label).then(sendResponse);
        return true;
    }
    if (request.action === "resetPrompts") {
        resetPrompts().then(sendResponse);
        return true;
    }
    if (request.action === "restorePromptVersion") {
        restorePromptVersion(request.id).then(sendResponse);
        return true;
    }

    // ---- model selection (Settings) ----
    if (request.action === "getModelConfig") {
        getModelConfig().then(({ model, paidPlan, pref }) =>
            sendResponse({ model, paidPlan, pref, defaultModel: DEFAULT_MODEL }));
        return true;
    }
    if (request.action === "setModelConfig") {
        const pref = Object.assign({}, MODEL_PREF_DEFAULTS, request.pref || {});
        chrome.storage.local.set({ modelPref: pref }, () => sendResponse({ ok: true, pref }));
        return true;
    }
    // The key stays in the service worker — Settings asks for the list, it never
    // reads the key itself.
    if (request.action === "listModels") {
        listModels(request.apiKey).then(sendResponse);
        return true;
    }
});

// onInstalled: welcome page + context menus. No uninstall ping, no install id —
// there is nothing to correlate an install with and nothing listening.
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        // Guess from the browser's UI language; the welcome page asks anyway.
        chrome.storage.local.set({
            targetLanguage: CRLanguages.detectDefault(chrome.i18n.getUILanguage())
        });
        chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
    }
    // Create context menus (removeAll first to prevent duplicates on update)
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "generate-study-sheet",
            title: "Generate Study Sheet",
            contexts: ["page", "selection"]
        });
    });
});

// Fetch and cache access info from /access endpoint
async function getAccessInfo() {
    // Direct mode: no server, so no gating. Limits are whatever Google's free tier gives.
    if (_accessCache) return _accessCache;
    _accessCache = { unlimited: true, studySheet: false, dailyLimit: 0, used: 0, remaining: 0 };
    return _accessCache;
}

// ============================================
// 🎬 VIDEO FETCHING (YARN)
// ============================================

// ============================================
// 🤖 AI LOOKUP FUNCTIONS
// ============================================

// ============================================
// LOOKUP MODE: 'A' = stream JSON, 'B' = stream delimiter, 'C' = two calls, 'default' = single call
// ============================================
// 'default' = one call returning {t,d} together.
// Measured: splitting them (MODE C) makes the model give the dictionary sense
// instead of the contextual one — "culture" in microbiology returned
// සංස්කෘතිය (Culture) when asked for t alone, but රක්ත වගාව when asked for t+d.
// Writing the explanation forces it to commit to the domain. Do not split.
const LOOKUP_MODE = 'default';

// {{examples}} expands to the language pack's contrastive pairs, or to nothing
// for a language nobody has tuned yet. An empty block is the honest outcome —
// better than inventing examples in a language we cannot check.
const LOOKUP_PROMPT_FULL = `TARGET WORD: "{{word}}"
CONTEXT: "{{context}}"

STEP 1 — ANALYZE (think, don't write):
- Domain/genre of the text?
- Which SPECIFIC sense of "{{word}}" is used here?
- What {{langName}} register matches this domain?

STEP 2 — TRANSLATE:
- Give the {{langName}} word/phrase that fits THIS context only
- Not a generic dictionary translation
{{examples}}

STEP 3 — EXPLAIN in casual spoken {{langName}}:
- One sentence, like telling a friend what this means in what they're reading
- Connect to the specific situation in the text`;

// Appended to LOOKUP_PROMPT_FULL. This exact prompt+contract combination is the
// one measured across 12 contrastive pairs; responseSchema is deliberately NOT
// used with it, matching how it was validated.
// Verbatim from the Cloudflare Worker (sinhala/cloudfareworker.js).
// The Worker sent this as system_instruction on EVERY call; without it the
// model loses the domain-matching rules and gets e.g. "culture" wrong.
const SYSTEM_INSTRUCTION = `You are a Context-Aware Translation Assistant for {{langName}} readers.

BEFORE ANSWERING, ALWAYS DO THIS (think, don't write):
1. What is the domain/genre? (science, history, politics, fiction, technical, etc.)
2. Which SPECIFIC sense of the word is used in THIS context?
3. What {{langName}} register matches? (technical context → technical {{langName}}, casual → casual)

TRANSLATION RULES:
- Give ONLY the meaning that fits THIS context — never multiple meanings
{{examples}}
- If the word is a proper noun or species name, transliterate + briefly identify what it is

EXPLANATION RULES:
- Casual spoken {{langName}} — like explaining to a friend, not a textbook
- Connect to what they're reading — help them understand THIS sentence
- No HTML tags in JSON responses. Use HTML only when the prompt explicitly requests HTML output.`;

const LOOKUP_JSON_CONTRACT = `

Output ONLY this JSON: {"t": "<{{langName}} translation for THIS context>", "d": "<one casual {{langName}} sentence>"}`;

// ============================================
// ✎ EDITABLE PROMPTS
// ============================================
//
// The system instruction and the lookup prompt are user-editable in Settings.
// The JSON contract above and the response schema below are deliberately NOT: editing
// those breaks response parsing rather than answer quality.
//
// Why history exists. The Worker-era measurement recorded in CLAUDE.md is that
// weakening SYSTEM_INSTRUCTION degrades output — without its domain-matching
// rules the model returned වගාව instead of රුධිර වගාව for "blood culture". An
// editable prompt with no way back would put that regression one keystroke
// away, so every save snapshots both prompts and any snapshot can be restored.
//
// Note SYSTEM_INSTRUCTION is sent on EVERY call — the lookup, the
// More/General/Simple panels and the study-sheet builders alike. Settings says
// so next to the editor; editing it is not scoped to word lookups.

const PROMPT_HISTORY_CAP = 50;

// The shipped prompt IS the editable default — one string, so the two cannot
// drift apart.
const DEFAULT_LOOKUP_TEMPLATE = LOOKUP_PROMPT_FULL;

// Bumped whenever the default templates gain a placeholder. A saved override
// from an older version cannot know about the new one, so it is set aside
// rather than applied — see getPrompts().
const PROMPT_SCHEMA_VERSION = 2;

function promptDefaults() {
    return { system: SYSTEM_INSTRUCTION, lookup: DEFAULT_LOOKUP_TEMPLATE };
}

// split/join rather than a regex: the substituted values are arbitrary page
// text, and $& in a replacement string would corrupt the prompt.
function renderPrompt(tmpl, vars) {
    let out = String(tmpl);
    for (const [k, v] of Object.entries(vars)) {
        out = out.split('{{' + k + '}}').join(v == null ? '' : String(v));
    }
    // {{examples}} is empty for a language nobody has tuned, which leaves the
    // line it sat on blank and opens a gap mid-prompt. Nothing here wants three
    // consecutive newlines, so collapse them.
    return out.replace(/\n{3,}/g, '\n\n');
}

// A lookup prompt missing {{word}} asks the model about nothing, on every call,
// silently. Refuse the save rather than let a tester find out days later.
const REQUIRED_PLACEHOLDERS = { lookup: ['word', 'context', 'langName'], system: ['langName'] };

function validatePrompt(kind, text) {
    const s = String(text == null ? '' : text);
    if (!s.trim()) return { ok: false, error: 'empty' };
    const missing = (REQUIRED_PLACEHOLDERS[kind] || []).filter(p => !s.includes('{{' + p + '}}'));
    if (missing.length) return { ok: false, error: 'missing_placeholders', missing };
    return { ok: true };
}

async function getPrompts() {
    const { promptOverrides } = await chrome.storage.local.get('promptOverrides');
    const d = promptDefaults();
    const o = promptOverrides || {};

    // An override saved before languages existed has no {{langName}}, so
    // applying it would silently answer in Sinhala for someone who chose Hindi.
    // Set it aside and report it, rather than honouring it or deleting it.
    const stale = (o.system || o.lookup) && (o.v || 0) < PROMPT_SCHEMA_VERSION;
    const src = stale ? {} : o;

    const use = (kind) => (typeof src[kind] === 'string' && src[kind].trim()) ? src[kind] : d[kind];
    return {
        system: use('system'),
        lookup: use('lookup'),
        stale: !!stale,
        customized: {
            system: use('system') !== d.system,
            lookup: use('lookup') !== d.lookup
        }
    };
}

async function pushPromptVersion(entry) {
    const { promptHistory } = await chrome.storage.local.get({ promptHistory: [] });
    const hist = Array.isArray(promptHistory) ? promptHistory : [];
    hist.push(Object.assign({
        id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
        ts: Date.now()
    }, entry));
    // Index 0 is the shipped default. It is the floor of every diff and the
    // target of "reset", so it is never the entry that gets dropped.
    if (hist.length > PROMPT_HISTORY_CAP) hist.splice(1, hist.length - PROMPT_HISTORY_CAP);
    await chrome.storage.local.set({ promptHistory: hist });
    return hist;
}

async function ensureBaseVersion() {
    const { promptHistory } = await chrome.storage.local.get({ promptHistory: [] });
    if (Array.isArray(promptHistory) && promptHistory.length) return promptHistory;
    const d = promptDefaults();
    return await pushPromptVersion({ label: 'Default', source: 'default', system: d.system, lookup: d.lookup });
}

async function savePrompts(next, label, source) {
    const system = next && next.system;
    const lookup = next && next.lookup;
    for (const [kind, text] of [['system', system], ['lookup', lookup]]) {
        const v = validatePrompt(kind, text);
        if (!v.ok) return Object.assign({ ok: false, kind }, v);
    }
    await ensureBaseVersion();
    const d = promptDefaults();
    // null means "track the default", so a future change to the shipped prompt
    // reaches testers who never edited that field.
    await chrome.storage.local.set({
        promptOverrides: {
            v: PROMPT_SCHEMA_VERSION,
            system: system === d.system ? null : system,
            lookup: lookup === d.lookup ? null : lookup
        }
    });
    const history = await pushPromptVersion({
        label: label || 'Edited', source: source || 'edit', system, lookup
    });
    return { ok: true, history };
}

async function resetPrompts() {
    const d = promptDefaults();
    return await savePrompts(d, 'Reset to default', 'default');
}

// Restoring pushes a new version rather than truncating, so walking back is
// itself reversible.
async function restorePromptVersion(id) {
    const { promptHistory } = await chrome.storage.local.get({ promptHistory: [] });
    const found = (promptHistory || []).find(v => v.id === id);
    if (!found) return { ok: false, error: 'not_found' };
    return await savePrompts({ system: found.system, lookup: found.lookup },
                             'Restored ' + (found.label || 'version'), 'restore');
}

// The schema descriptions are part of the instruction the model reads, so they
// name the target language too.
function schemaT(langName) {
    return {
        type: "OBJECT",
        properties: {
            t: { type: "STRING", description: `Context-specific ${langName} translation. Must match the domain — not a generic dictionary word.` }
        },
        required: ["t"]
    };
}

function schemaTD(langName) {
    return {
        type: "OBJECT",
        properties: {
            t: { type: "STRING", description: `Context-specific ${langName} translation. Must match the domain — not a generic dictionary word.` },
            d: { type: "STRING", description: `One-sentence casual spoken ${langName} explanation of what this word means in THIS text. No HTML tags.` }
        },
        required: ["t", "d"]
    };
}

async function lookupContext(word, context, url, tabId) {
    incrementGlobalCounter();

    // modes A and B removed: they streamed via the Cloudflare Worker
    if (LOOKUP_MODE === 'C') return lookupModeC(word, context, url, tabId);
    return lookupModeDefault(word, context, url, tabId);
}

// The lookup response is a JSON string that content.js parses for {t,d}.
// Fallback information rides along inside it as _m rather than changing the
// message shape, so the existing sendMessage call sites keep working unchanged
// and an older content.js simply ignores the extra key.
function attachMeta(raw, meta) {
    if (!meta || !meta.fellBackFrom) return raw;
    if (typeof raw !== "string" || raw.startsWith("<")) return raw;   // error card
    try {
        const obj = JSON.parse(raw);
        if (!obj || typeof obj !== "object" || Array.isArray(obj)) return raw;
        obj._m = { model: meta.model, from: meta.fellBackFrom, reason: meta.reason };
        return JSON.stringify(obj);
    } catch (e) {
        return raw;
    }
}

// ── DEFAULT: Single call, wait for full {t, d} ──
async function lookupModeDefault(word, context, url, tabId) {
    const lv = await langVars();
    const generationConfig = {
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        responseSchema: schemaTD(lv.langName)   // guarantees {t,d} shape; without it 2.5 emitted doubled JSON
    };
    const { lookup: lookupTemplate } = await getPrompts();
    const meta = {};
    const raw = await callGemini(
        renderPrompt(lookupTemplate + LOOKUP_JSON_CONTRACT, Object.assign({ word, context }, lv)),
        word, context, url, generationConfig, meta);
    return attachMeta(raw, meta);
}

// ── MODE A: Stream JSON from Gemini, parse t and d as they arrive ──
// ── MODE B: Stream with delimiter (plain text: translation\n---\nexplanation) ──
// ── MODE C: Two sequential calls — t first (fast), then d in background ──
async function lookupModeC(word, context, url, tabId) {
    const t0 = performance.now();

    const lv = await langVars();
    const tPrompt = renderPrompt((await getPrompts()).lookup, Object.assign({ word, context }, lv));
    const tConfig = {
        maxOutputTokens: 128,
        responseMimeType: "application/json",
        responseSchema: schemaT(lv.langName)
    };

    const tRaw = await callGemini(tPrompt, word, context, url, tConfig);
    const tTime = Math.round(performance.now() - t0);

    // Check if callGemini returned an HTML error
    if (tRaw.startsWith('<')) {
        console.warn(`⚠️ MODE C ${word}: t call failed, returning error`);
        return tRaw;
    }

    let tData;
    try { tData = JSON.parse(tRaw); } catch { tData = { t: tRaw }; }

    console.log(`⏱️ MODE C ${word}: t="${tData.t}" at ${tTime}ms`);

    // Fire d call in background — don't block the response
    callGemini(
        `TARGET WORD: "${word}" (${lv.langName}: "${tData.t}")\nCONTEXT: "${context}"\n\nExplain what "${word}" means in THIS context in one sentence of casual spoken ${lv.langName}. Like telling a friend. No HTML.`,
        word, context, url,
        { maxOutputTokens: 192, responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { d: { type: "STRING", description: `Casual ${lv.langName} explanation` } }, required: ["d"] } }
    ).then(dRaw => {
        const totalTime = Math.round(performance.now() - t0);
        if (dRaw.startsWith('<')) {
            console.warn(`⚠️ MODE C ${word}: d call failed`);
            return;
        }
        let dData;
        try { dData = JSON.parse(dRaw); } catch { return; }

        if (tabId && dData.d) {
            chrome.tabs.sendMessage(tabId, {
                action: "lookupUpdate",
                d: dData.d,
                timing: { mode: 'C', tTime, totalTime }
            });
        }
        console.log(`⏱️ MODE C ${word}: d="${(dData.d || '').substring(0, 50)}..." total=${totalTime}ms`);
    });

    // Return immediately with just t
    return JSON.stringify({ t: tData.t, d: null });
}

async function lookupDetails(word, context, url) {
    const lv = await langVars();
    const prompt = `You are creating immersive learning content for a ${lv.langName} reader who just encountered "${word}" while reading.

TARGET WORD: "${word}"

CONTEXT THEY'RE READING:
"${context}"

YOUR MISSION:
The reader has a "mental movie" playing in their head based on what they've been reading. Your job is to EXTEND that movie with scenarios, dialogue, and stories that belong in the SAME WORLD.

CRITICAL INSTRUCTION: DO NOT create random, unrelated scenarios. Everything you create must match the genre, setting, and tone of the context above.

STEP 1 - DETECT THE WORLD (Think but don't write):
- What's the domain/genre? (sci-fi, business, everyday life, history, technology, nature, etc.)
- What's the tone? (serious, casual, dramatic, technical, conversational, etc.)
- What's the time period/setting? (modern, historical, futuristic, fantasy, etc.)
- What vocabulary/jargon appears? (technical terms, formal language, slang, etc.)

STEP 2 - MATCH THE WORLD IN YOUR CONTENT:

Examples of GOOD matching:
✅ Context: "The spacecraft's engine failed mid-flight"
   Word: "malfunction"
   Scenario: "The robotic arm in the space station started to malfunction during a repair mission"
   (CORRECT: Stays in sci-fi/space world)

✅ Context: "The CEO announced the merger to shareholders"
   Word: "merger"
   Scenario: "When two tech companies decided on a merger, their employees worried about job security"
   (CORRECT: Stays in business/corporate world)

Examples of BAD matching:
❌ Context: "The spacecraft's engine failed mid-flight"
   Word: "malfunction"
   Scenario: "My coffee maker malfunctioned this morning"
   (WRONG: Goes from sci-fi to kitchen - breaks the mental movie!)

❌ Context: "The CEO announced the merger to shareholders"
   Word: "merger"
   Scenario: "Two rivers merge at the valley"
   (WRONG: Different meaning of merge + wrong world)

STEP 3 - CREATE MATCHING CONTENT:

1. **Scenario** (1-2 sentences):
   - Must take place in the SAME world/setting as the context
   - Should feel like it could be the next paragraph of what they're reading
   - Must use "${word}" naturally

2. **Dialogue** (A/B format):
   - Characters should fit the context's world (if tech context = tech workers, if history = historical figures, etc.)
   - Conversation tone should match context (formal context = formal dialogue)
   - Must include "${word}" naturally

3. **Story** (3-4 sentences):
   - Expands the scenario in the same world
   - Should feel like "bonus content" from the same article/book/text
   - Must use "${word}" naturally

STEP 4 - TRANSLATE TO SINHALA:
- Wrap the ${lv.langName} word for "${word}" in <b> tags EVERY TIME it appears
- Match the formality level: formal context = formal ${lv.langName}, casual context = casual ${lv.langName}
- Use vocabulary from the same domain in ${lv.langName} too

Output ONLY this HTML structure (No markdown):
<div class="sr-hook-box" style="animation: fadeIn 0.5s;">
    <span class="sr-label">⚡️ Scenario</span>
    <p class="sr-hook-text">[1-2 sentence scenario that takes place in the SAME world/genre as the context above]</p>
    <p class="sr-sub-text">[${lv.langName} scenario matching the context's formality, with <b>word</b>]</p>
</div>

<div class="sr-section" style="animation: fadeIn 0.5s 0.1s backwards;">
    <span class="sr-label">💬 Dialogue</span>
    <div class="sr-chat">
        <div class="sr-chat-bubble sr-chat-a"><b>A:</b> [Dialogue line from character that fits this world]</div>
        <div class="sr-chat-bubble sr-chat-b"><b>B:</b> [Response from character B]</div>
    </div>
    <p class="sr-sub-text">[${lv.langName} dialogue matching tone, with <b>word</b>]</p>
</div>

<details class="sr-details" style="animation: fadeIn 0.5s 0.2s backwards;">
    <summary>📖 Full Story...</summary>
    <div class="sr-full-story">
        <p class="sr-text">[3-4 sentence story extending the scenario in the same world]</p>
        <hr class="sr-divider">
        <p class="sr-sub-text">[${lv.langName} story with <b>word</b>]</p>
    </div>
</details>
`;
    return await callGemini(prompt, word, context, url);
}

async function lookupGeneral(word) {
    const lv = await langVars();
    const prompt = `
Target Word: "${word}"

Task:
1. Provide a general, dictionary-style definition.
2. Give 2 OTHER common uses of this word in different contexts.
3. Translate to ${lv.langName}.

CRITICAL: In ${lv.langName} translations, wrap the key ${lv.langName} word in <b> tags.

Output ONLY this HTML (no markdown):
<div class="sr-general-box">
    <p class="sr-def"><b>General Definition:</b> [Broad, general meaning that covers all uses]</p>
    <p class="sr-sub-text">[${lv.langName} general definition with <b>key word</b>]</p>
    <div style="margin-top:12px;">
        <span class="sr-label">Other Common Uses:</span>
        <ul style="margin:0; padding-left:18px; font-size:13px; color:#374151; line-height:1.8;">
            <li>[Example use in different context 1] - <span class="sr-gen-trans">[${lv.langName} with <b>word</b>]</span></li>
            <li>[Example use in different context 2] - <span class="sr-gen-trans">[${lv.langName} with <b>word</b>]</span></li>
        </ul>
    </div>
</div>
`;
    return await callGemini(prompt);
}

async function lookupSimple(word, context) {
    const lv = await langVars();
    const prompt = `You are a friendly ${lv.langName} teacher explaining to a 13-year-old student.

The student is reading this: "${context}"

They got stuck on the word: "${word}"

YOUR TASK:
1. Explain what "${word}" means IN WHAT THEY'RE READING using super simple ${lv.langName}
2. Open by connecting it back to the sentence they are reading
3. Give ONE simple example sentence in ${lv.langName} that a teenager would say
4. Keep it SHORT - total of 3-4 sentences max

IMPORTANT:
- Use the SIMPLEST ${lv.langName} words possible (like texting a friend)
- Don't use formal/literary ${lv.langName}
- Help them understand THIS sentence, not give a general definition

Output ONLY this HTML structure (No markdown):
<div class="sr-simple-box">
    <div style="background:rgba(240,253,244,0.66); border:1px solid rgba(134,239,172,0.45); border-radius:13px; padding:15px; margin-bottom:10px;">
        <div style="font-weight:700; color:#166534; font-size:14px; margin-bottom:5px;">👶 Simple Explanation</div>
        <p style="font-size:14px; color:#14532d; line-height:1.6; font-family:var(--sr-lang-font, sans-serif);">
            [Explain in super simple ${lv.langName} what ${word} means in their context]
        </p>
        <div style="margin-top:10px; border-top:1px dashed #bbf7d0; padding-top:8px;">
            <span style="font-size:11px; font-weight:700; color:#166534; text-transform:uppercase;">Example:</span>
            <p style="font-size:13px; color:#15803d; font-style:italic; margin-top:2px;">[One casual ${lv.langName} sentence a 13-year-old would actually say]</p>
        </div>
    </div>
</div>
`;
    return await callGemini(prompt, word, context);
}

// ============================================
// 🇱🇰 SINHALA-TO-SINHALA LOOKUP FUNCTIONS
// ============================================

async function lookupContextSinhala(word, context, url) {
    incrementGlobalCounter();

    const prompt = `You are a Sinhala Language Assistant helping a reader understand a difficult Sinhala word in context.

READER'S SITUATION:
The reader encountered the Sinhala word "${word}" while reading and needs it explained in simpler everyday Sinhala. They understand basic Sinhala but this word is too formal, literary, or domain-specific.

TARGET WORD: "${word}"

SURROUNDING CONTEXT (what they're reading):
"${context}"

YOUR TASK - FOLLOW THESE STEPS IN ORDER:

STEP 1 - ANALYZE THE CONTEXT (Think but don't write):
- What is the domain? (news, literature, academic, legal, religious, political, etc.)
- What register is used? (formal/literary/archaic vs spoken/modern)
- What other vocabulary appears? (technical terms, literary words, etc.)

STEP 2 - IDENTIFY THE SPECIFIC MEANING:
- Which sense of "${word}" is being used in this context?
- Is this word being used in a specialized way for this domain?

STEP 3 - EXPLAIN IN SIMPLER SINHALA:
- Give the meaning in everyday spoken Sinhala that anyone would understand
- Connect it to the context — help them understand THIS sentence

STEP 4 - PROVIDE FORMAL/ACADEMIC DEFINITION:
- Give the formal Sinhala definition with any relevant grammatical/etymological notes
- Wrap the simplified key word in <b> tags

Output ONLY this HTML structure (no markdown, no extra text):
<div class="sr-header">
    <div class="sr-header-top"><h2 class="sr-word">${word}</h2></div>
    <div class="sr-translation">[Simple everyday Sinhala meaning — 1-3 words max]</div>
</div>

<div class="sr-body">
    <div class="sr-section">
        <p class="sr-def"><span class="sr-def-label">සන්දර්භය</span>[Context-specific explanation in clear, simple Sinhala — what does this word mean in what they're reading?]</p>
        <p class="sr-sub-text" style="font-family:'Noto Sans Sinhala', sans-serif; line-height:1.6;">[Formal/academic Sinhala definition with etymological or grammatical notes, with <b>key term</b> in bold]</p>

        <div id="sr-general-btn-area" style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
            <button id="sr-load-more" class="sr-secondary-btn sr-btn-primary" style="flex:1; min-width:90px;">
                ⚡ More
            </button>
            <button id="sr-load-general" class="sr-secondary-btn" style="flex:1; min-width:80px;">
                🌐 General
            </button>
            <button id="sr-load-simple" class="sr-secondary-btn" style="flex:1; min-width:80px;">
                👶 Simple
            </button>
        </div>
    </div>

    <div id="sr-details-placeholder"></div>
</div>
`;
    return await callGemini(prompt, word, context, url);
}

async function lookupDetailsSinhala(word, context, url) {
    const prompt = `You are creating immersive Sinhala learning content for a reader who encountered the difficult Sinhala word "${word}" while reading.

TARGET WORD: "${word}"

CONTEXT THEY'RE READING:
"${context}"

YOUR MISSION:
Create scenarios, dialogue, and a story ENTIRELY IN SINHALA that help the reader deeply understand "${word}". All content must match the genre, domain, and register of the context above.

STEP 1 - DETECT THE WORLD (Think but don't write):
- What's the domain? (news, literature, academic, legal, religious, etc.)
- What's the tone? (formal, literary, conversational, dramatic, etc.)
- What vocabulary/register is used?

STEP 2 - CREATE MATCHING CONTENT (ALL IN SINHALA):

1. **සිදුවීම (Scenario)** (1-2 sentences in Sinhala):
   - Must take place in the SAME world/domain as the context
   - Must use "${word}" naturally

2. **සංවාදය (Dialogue)** (A/B format, entirely in Sinhala):
   - Characters should fit the context's world
   - Conversation tone should match context formality
   - Must include "${word}" naturally

3. **කතාව (Story)** (3-4 sentences in Sinhala):
   - Expands the scenario in the same world
   - Must use "${word}" naturally

IMPORTANT: Wrap "${word}" in <b> tags EVERY TIME it appears.

Output ONLY this HTML structure (No markdown):
<div class="sr-hook-box" style="animation: fadeIn 0.5s;">
    <span class="sr-label">⚡️ සිදුවීම</span>
    <p class="sr-hook-text" style="font-family:'Noto Sans Sinhala', sans-serif;">[1-2 sentence Sinhala scenario in the SAME domain as the context, using <b>${word}</b>]</p>
</div>

<div class="sr-section" style="animation: fadeIn 0.5s 0.1s backwards;">
    <span class="sr-label">💬 සංවාදය</span>
    <div class="sr-chat">
        <div class="sr-chat-bubble sr-chat-a" style="font-family:'Noto Sans Sinhala', sans-serif;"><b>A:</b> [Sinhala dialogue line]</div>
        <div class="sr-chat-bubble sr-chat-b" style="font-family:'Noto Sans Sinhala', sans-serif;"><b>B:</b> [Sinhala response using <b>${word}</b>]</div>
    </div>
</div>

<details class="sr-details" style="animation: fadeIn 0.5s 0.2s backwards;">
    <summary>📖 සම්පූර්ණ කතාව...</summary>
    <div class="sr-full-story">
        <p class="sr-text" style="font-family:'Noto Sans Sinhala', sans-serif;">[3-4 sentence Sinhala story using <b>${word}</b>]</p>
    </div>
</details>
`;
    return await callGemini(prompt, word, context, url);
}

async function lookupGeneralSinhala(word) {
    const prompt = `
Target Sinhala Word: "${word}"

Task (respond entirely in Sinhala):
1. Provide a comprehensive Sinhala dictionary-style definition covering all major meanings.
2. Give etymology/root word information if relevant (e.g., Pali/Sanskrit origins).
3. Provide 2 example usages in different contexts, each showing a different meaning or register.

CRITICAL: Wrap "${word}" in <b> tags every time it appears.

Output ONLY this HTML (no markdown):
<div class="sr-general-box">
    <p class="sr-def" style="font-family:'Noto Sans Sinhala', sans-serif;"><b>සම්පූර්ණ අර්ථ දැක්වීම:</b> [Comprehensive Sinhala definition covering all major senses]</p>
    <p class="sr-sub-text" style="font-family:'Noto Sans Sinhala', sans-serif;">[Etymology/root word info — e.g., පාලි/සංස්කෘත මූලය, with <b>${word}</b>]</p>
    <div style="margin-top:12px;">
        <span class="sr-label">වෙනත් භාවිත:</span>
        <ul style="margin:0; padding-left:18px; font-size:13px; color:#374151; line-height:1.8; font-family:'Noto Sans Sinhala', sans-serif;">
            <li>[Sinhala example usage 1 in one context] - <span class="sr-gen-trans">[brief meaning note with <b>${word}</b>]</span></li>
            <li>[Sinhala example usage 2 in different context] - <span class="sr-gen-trans">[brief meaning note with <b>${word}</b>]</span></li>
        </ul>
    </div>
</div>
`;
    return await callGemini(prompt);
}

async function lookupSimpleSinhala(word, context) {
    const prompt = `You are a friendly Sinhala teacher explaining a difficult Sinhala word to someone who speaks basic Sinhala.

The student is reading this: "${context}"

They got stuck on the word: "${word}"

YOUR TASK:
1. Explain what "${word}" means in WHAT THEY'RE READING using super simple spoken Sinhala
2. Start with "මේ වචනේ තේරුම..." (This word means...)
3. Give ONE simple example sentence using "${word}" in everyday spoken Sinhala
4. Keep it SHORT - 3-4 sentences max

IMPORTANT:
- Use the SIMPLEST spoken Sinhala possible (like explaining to a child)
- Don't use formal/literary Sinhala
- Help them understand THIS sentence, not give an academic definition

Output ONLY this HTML structure (No markdown):
<div class="sr-simple-box">
    <div style="background:rgba(240,253,244,0.66); border:1px solid rgba(134,239,172,0.45); border-radius:13px; padding:15px; margin-bottom:10px;">
        <div style="font-weight:700; color:#166534; font-size:14px; margin-bottom:5px;">👶 සරල පැහැදිලි කිරීම</div>
        <p style="font-size:14px; color:#14532d; line-height:1.6; font-family:'Noto Sans Sinhala', sans-serif;">
            [Start with "මේ වචනේ තේරුම..." then explain in super simple spoken Sinhala what ${word} means in their context]
        </p>
        <div style="margin-top:10px; border-top:1px dashed #bbf7d0; padding-top:8px;">
            <span style="font-size:11px; font-weight:700; color:#166534; text-transform:uppercase;">උදාහරණය:</span>
            <p style="font-size:13px; color:#15803d; font-style:italic; margin-top:2px; font-family:'Noto Sans Sinhala', sans-serif;">[One casual Sinhala sentence using <b>${word}</b>]</p>
        </div>
    </div>
</div>
`;
    return await callGemini(prompt, word, context);
}

// ============================================
// 📋 STUDY SHEET — Level Definitions
// ============================================

const STUDY_LEVELS_BASE = {
    basic: {
        cefr: 'A1-A2',
        desc: 'basic survival vocabulary — common everyday words that a beginner would not know',
        enExamples: 'environment, government, describe, explain, various, significant, opportunity, individual',
        enCriteria: 'Words a beginner wouldn\'t know but are essential for daily life. In the Oxford 3000 list but NOT in the most basic 500 words. Common nouns (environment, government, community), basic verbs (describe, explain, provide), simple adjectives (various, significant, available).',
        siExamples: 'සාමාන්‍ය, ප්‍රමාණවත්, අවස්ථාව, ප්‍රයෝජනවත්, පරිසරය, සේවය',
        siCriteria: 'කථන සිංහලයෙන් භාවිත නොකරන නමුත් ලේඛන සිංහලයේ බහුලව යෙදෙන මූලික වචන. උදා: "පරිසරය" (environment), "සේවය" (service) වැනි විධිමත් රූප.'
    },
    intermediate: {
        cefr: 'B1-B2',
        desc: 'working vocabulary — words needed for expressing opinions, work, and social situations',
        enExamples: 'consequence, perspective, implement, facilitate, comprehensive, substantial, inevitable, hierarchy',
        enCriteria: 'Words used in work, opinion, and academic contexts. Abstract nouns (consequence, perspective, paradigm), formal verbs (implement, facilitate, emphasize), academic adjectives (comprehensive, substantial, inevitable). Oxford 5000 level.',
        siExamples: 'ප්‍රතිපාදන, අභිමතාර්ථය, ක්‍රියාත්මක, ප්‍රතිපත්ති, සාධාරණීකරණය, විවේචනය',
        siCriteria: 'පුවත්පත්, රජයේ ලේඛන, හා කාර්යාලීය භාෂාවේ යෙදෙන වචන. උදා: "ප්‍රතිපාදන" (provisions), "ප්‍රතිපත්ති" (policies) — එදිනෙදා කථනයේ නොයෙදෙන නමුත් ප්‍රවෘත්ති හා විධිමත් ලේඛනවල බහුලව යෙදෙන වචන.'
    },
    advanced: {
        cefr: 'C1-C2',
        desc: 'academic and rare vocabulary — specialized, literary, or technical words',
        enExamples: 'elucidate, juxtapose, ubiquitous, paradigm, quintessential, exacerbate, surreptitious, ameliorate',
        enCriteria: 'Rare, academic, or literary words that even educated native speakers may not use daily. Words like elucidate (explain), juxtapose (compare side by side), ubiquitous (everywhere), paradigm (model/framework), surreptitious (secretive). Also domain-specific jargon.',
        siExamples: 'අභිනිෂ්ක්‍රමණය, ප්‍රත්‍යවමර්ශනය, අනුශාසනය, ඓතිහාසික, නිරවද්‍ය, ප්‍රාග්ධන',
        siCriteria: 'සාහිත්‍යමය, ප්‍රාචීන, හෝ ඉතා විශේෂිත වචන. ශාස්ත්‍රීය ග්‍රන්ථ, උසස් පෙළ පාඨමාලා, හෝ නීති/වෛද්‍ය ක්ෂේත්‍රයේ භාවිත වන අමාරු වචන. එදිනෙදා සිංහලයෙන් කිසිවිටෙක භාවිත නොවන වචන.'
    }
};

// Composite levels: cumulative CEFR ranges for the redesigned Study Sheet
const STUDY_LEVELS = {
    ...STUDY_LEVELS_BASE,
    basic_all: {
        cefr: 'A1-C2',
        desc: 'ALL vocabulary levels — basic, intermediate, AND advanced words',
        enExamples: [STUDY_LEVELS_BASE.basic.enExamples, STUDY_LEVELS_BASE.intermediate.enExamples, STUDY_LEVELS_BASE.advanced.enExamples].join(', '),
        enCriteria: `Include words from ALL difficulty levels:\n\nBASIC (A1-A2): ${STUDY_LEVELS_BASE.basic.enCriteria}\n\nINTERMEDIATE (B1-B2): ${STUDY_LEVELS_BASE.intermediate.enCriteria}\n\nADVANCED (C1-C2): ${STUDY_LEVELS_BASE.advanced.enCriteria}`,
        siExamples: [STUDY_LEVELS_BASE.basic.siExamples, STUDY_LEVELS_BASE.intermediate.siExamples, STUDY_LEVELS_BASE.advanced.siExamples].join(', '),
        siCriteria: `සියලුම මට්ටම් ඇතුළත්:\n\nමූලික (A1-A2): ${STUDY_LEVELS_BASE.basic.siCriteria}\n\nමධ්‍යම (B1-B2): ${STUDY_LEVELS_BASE.intermediate.siCriteria}\n\nඋසස් (C1-C2): ${STUDY_LEVELS_BASE.advanced.siCriteria}`
    },
    intermediate_up: {
        cefr: 'B1-C2',
        desc: 'intermediate AND advanced vocabulary — working, academic, and rare words',
        enExamples: [STUDY_LEVELS_BASE.intermediate.enExamples, STUDY_LEVELS_BASE.advanced.enExamples].join(', '),
        enCriteria: `Include words from INTERMEDIATE and ADVANCED levels:\n\nINTERMEDIATE (B1-B2): ${STUDY_LEVELS_BASE.intermediate.enCriteria}\n\nADVANCED (C1-C2): ${STUDY_LEVELS_BASE.advanced.enCriteria}`,
        siExamples: [STUDY_LEVELS_BASE.intermediate.siExamples, STUDY_LEVELS_BASE.advanced.siExamples].join(', '),
        siCriteria: `මධ්‍යම හා උසස් මට්ටම් ඇතුළත්:\n\nමධ්‍යම (B1-B2): ${STUDY_LEVELS_BASE.intermediate.siCriteria}\n\nඋසස් (C1-C2): ${STUDY_LEVELS_BASE.advanced.siCriteria}`
    }
};

// Parse pipe-delimited study response: "word | translation | definition" per line
function parseStudyResponse(raw) {
    if (!raw || raw === "Error: AI Busy." || raw === "Net Error") return [];
    const lines = raw.split('\n').filter(line => line.includes('|'));
    const words = [];
    for (const line of lines) {
        // Skip lines that look like HTML (AI sometimes outputs HTML instead of pipe format)
        if (line.includes('<') && line.includes('>')) {
            console.warn('📋 Skipping HTML line in study response:', line.substring(0, 80));
            continue;
        }
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
            if (parts[0].toLowerCase() === 'word' || parts[0].toLowerCase() === 'වචනය') continue;
            if (parts[0].match(/^-+$/)) continue;
            // Trim BOM characters
            const word = parts[0].replace(/^\uFEFF/, '');
            if (word.length === 0) continue;
            words.push({ word: word, translation: parts[1], definition: parts[2] });
        } else if (parts.length >= 3) {
            console.warn('📋 Skipping malformed line:', line.substring(0, 100));
        }
    }
    return words;
}

// Parse simple explanation response: "word | simple explanation" per line → map
function parseSimpleResponse(raw) {
    if (!raw || raw === "Error: AI Busy." || raw === "Net Error") return {};
    const lines = raw.split('\n').filter(line => line.includes('|'));
    const map = {};
    for (const line of lines) {
        if (line.includes('<') && line.includes('>')) continue;
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 2 && parts[0] && parts[1]) {
            if (parts[0].toLowerCase() === 'word' || parts[0].toLowerCase() === 'වචනය') continue;
            if (parts[0].match(/^-+$/)) continue;
            const word = parts[0].replace(/^\uFEFF/, '');
            if (word.length === 0) continue;
            map[word.toLowerCase()] = parts[1];
        }
    }
    return map;
}


// ============================================
// 📋 STUDY SHEET V2 — Prompt Builders
// ============================================

function buildStudyContextualPromptEN(chunkText, levelInfo, calibrationWords) {
    let calibrationSection = '';
    if (calibrationWords && calibrationWords.length > 0) {
        const wordLines = calibrationWords.map(w => `- "${w.word}" (context: "${w.context.substring(0, 100)}")`).join('\n');
        calibrationSection = `
DIFFICULTY ANCHOR — USER'S MARKED WORDS (PRIMARY SIGNAL):
The user clicked these words as unknown. Use them as your PRIMARY difficulty anchor — they reveal exactly what this user finds hard.
${wordLines}

MANDATORY: You MUST return at least ${Math.max(calibrationWords.length * 3, 15)} words total. For each marked word, find 2-3 OTHER words in the text at the SAME difficulty level or harder. The CEFR criteria below is a rough guide, but the marked words are the ground truth for what this user finds difficult.

`;
    }

    return `You are a Context-Aware Translation Assistant helping a Sinhala reader study English vocabulary.

TASK: Analyze this English text and extract ALL vocabulary words at CEFR ${levelInfo.cefr} level. For each word, provide a context-specific Sinhala translation and definition.

${calibrationSection}CEFR ${levelInfo.cefr} CRITERIA:
${levelInfo.enCriteria}

${!calibrationWords || calibrationWords.length === 0 ? `CALIBRATION EXAMPLES (do NOT output these unless they appear in the text):
${levelInfo.enExamples}

` : ''}CRITICAL INSTRUCTIONS:
1. ANALYZE the domain, tone, and setting of the text FIRST
2. For EACH word, identify which specific meaning is used in THIS context
3. Give the Sinhala translation that matches THIS SPECIFIC CONTEXT, not a generic dictionary translation
4. The definition must explain what the word means in THIS passage only — not multiple meanings

TEXT:
${chunkText}

OUTPUT FORMAT — One word per line, pipe-separated, no header row:
word | Sinhala translation (1-3 words) | contextual Sinhala explanation (under 15 words)

RULES:
- Only words that appear in the text above
- Find ALL words matching CEFR ${levelInfo.cefr} level — do not limit the count
- The third column MUST be in Sinhala — a contextual explanation specific to this text
- Order by appearance in text
- Output ONLY the word lines, nothing else`;
}

function buildStudyContextualPromptSI(chunkText, levelInfo, calibrationWords) {
    let calibrationSection = '';
    if (calibrationWords && calibrationWords.length > 0) {
        const wordLines = calibrationWords.map(w => `- "${w.word}" (සන්දර්භය: "${w.context.substring(0, 100)}")`).join('\n');
        calibrationSection = `
අමාරුතා මට්ටම — පරිශීලකයාගේ සලකුණු කළ වචන (ප්‍රාථමික සංඥාව):
පරිශීලකයා මේ වචන නොදන්නා බව සලකුණු කළා. මේවා ඔබේ ප්‍රාථමික අමාරුතා නිර්ණායකයයි.
${wordLines}

අනිවාර්ය: ඔබ අවම වශයෙන් වචන ${Math.max(calibrationWords.length * 3, 15)}ක් ලබා දිය යුතුය. සලකුණු කළ සෑම වචනයකටම, පාඨයේ එම අමාරුතා මට්ටමේ හෝ ඉහළ වචන 2-3ක් සොයන්න.

`;
    }

    return `ඔබ සිංහල පාඨකයෙකුට අමාරු සිංහල වචන තේරුම් ගැනීමට උදව් කරන භාෂා සහකාරයෙකි.

කාර්යය: පහත සිංහල පාඨයේ CEFR ${levelInfo.cefr} මට්ටමේ සියලුම අමාරු/විධිමත් වචන හඳුනාගෙන, සරල සිංහලෙන් තේරුම් දෙන්න.

${calibrationSection}CEFR ${levelInfo.cefr} නිර්ණායක:
${levelInfo.siCriteria}

${!calibrationWords || calibrationWords.length === 0 ? `සැසඳීම සඳහා උදාහරණ වචන (පාඨයේ නැත්නම් ඇතුළත් නොකරන්න):
${levelInfo.siExamples}

` : ''}වැදගත්:
1. පාඨයේ ක්ෂේත්‍රය, ස්වරය හඳුනාගන්න
2. සෑම වචනයකටම මේ සන්දර්භයට ගැලපෙන නිශ්චිත අර්ථය දෙන්න
3. සාමාන්‍ය ශබ්දකෝෂ අර්ථයක් නොව, මේ පාඨයට විශේෂිත අර්ථය දෙන්න

පාඨය:
${chunkText}

ප්‍රතිදාන ආකෘතිය — එක් වචනයකට එක් පේළියක්, pipe-වලින් වෙන් කරන්න:
වචනය | සරල තේරුම (වචන 1-3) | සන්දර්භයට විශේෂිත සරල පැහැදිලි කිරීම (වචන 15ට අඩු)

නීති:
- පාඨයේ ඇති වචන පමණක්
- CEFR ${levelInfo.cefr} මට්ටමේ සියලුම වචන — සංඛ්‍යාව සීමා නොකරන්න
- අර්ථ දැක්වීම සරල කථන සිංහලෙන්
- පාඨයේ පිළිවෙලට
- වචන පේළි පමණක් ලියන්න`;
}

function buildStudySimplePromptEN(wordList, chunkText, levelInfo) {
    return `You are a friendly Sinhala teacher explaining English words to a 13-year-old student.

The student found these words while reading. Explain each one in super simple, casual spoken Sinhala — like texting a friend. Connect each explanation to what they're reading.

WORDS TO EXPLAIN:
${wordList.join(', ')}

CONTEXT THEY'RE READING:
${chunkText.substring(0, 3000)}

YOUR TASK:
For each word, give a casual Sinhala explanation (2-3 sentences max):
- Start with what it means in what they're reading
- Use the SIMPLEST Sinhala possible — no formal/literary language
- Like a cool older sibling explaining, not a textbook

OUTPUT FORMAT — One word per line, pipe-separated:
word | casual Sinhala explanation (2-3 short sentences)

EXAMPLE:
scrutinize | හොඳට හොඳට බලනවා කියන එක. ඔයා කියවන තැන කියන්නේ ඒක ගොඩක් carefully බලනවා කියලා
hierarchy | උඩට පහළට order එකක් තියෙනවා. Boss ඉස්සරහින්, ඊට පස්සේ managers, ඊට පස්සේ අනිත් අය

RULES:
- Explain ALL words in the list
- Keep each explanation under 30 words
- Use casual/spoken Sinhala only
- Output ONLY the word lines, nothing else`;
}

function buildStudySimplePromptSI(wordList, chunkText, levelInfo) {
    return `ඔබ 13 හැවිරිදි ශිෂ්‍යයෙකුට අමාරු සිංහල වචන පැහැදිලි කරන මිත්‍රශීලී ගුරුවරයෙකි.

ශිෂ්‍යයා කියවන අතරතුර මේ වචන හමු වුණා. සෑම එකක්ම ඉතාමත් සරලව, කථන සිංහලෙන් පැහැදිලි කරන්න.

පැහැදිලි කළ යුතු වචන:
${wordList.join(', ')}

ඔවුන් කියවන සන්දර්භය:
${chunkText.substring(0, 3000)}

ඔබේ කාර්යය:
සෑම වචනයකටම සරල පැහැදිලි කිරීමක් (වාක්‍ය 2-3ක්):
- ඔවුන් කියවන දේට සම්බන්ධ කරන්න
- හැකි තරම් සරල වචන පාවිච්චි කරන්න
- පොතක් වගේ නෙවෙයි, යාළුවෙකුට කියනවා වගේ

ප්‍රතිදාන ආකෘතිය — එක් වචනයකට එක් පේළියක්, pipe-වලින් වෙන් කරන්න:
වචනය | සරල පැහැදිලි කිරීම (කෙටි වාක්‍ය 2-3ක්)

නීති:
- ලැයිස්තුවේ සියලුම වචන පැහැදිලි කරන්න
- සෑම පැහැදිලි කිරීමක්ම වචන 30කට අඩු
- කථන සිංහල පමණක්
- වචන පේළි පමණක් ලියන්න`;
}

// ============================================
// 📋 STUDY SHEET V2 — Chunk Processor
// ============================================

async function generateStudySheetV2(chunks, level, lang, tabId, calibrationWords) {
    const levelInfo = STUDY_LEVELS[level] || STUDY_LEVELS.advanced;
    const allWords = [];
    const failedChunks = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        // Phase 1: Contextual extraction
        try {
            chrome.tabs.sendMessage(tabId, {
                action: "studyProgress",
                current: i + 1,
                total: chunks.length,
                phase: "contextual",
                wordsFound: allWords.length
            });
        } catch (e) { /* tab may be closed */ }

        const contextualPrompt = lang === 'si'
            ? buildStudyContextualPromptSI(chunk, levelInfo, calibrationWords)
            : buildStudyContextualPromptEN(chunk, levelInfo, calibrationWords);

        let contextualRaw = await callGemini(contextualPrompt, "study_v2", "", "study_v2");
        let contextualWords = parseStudyResponse(contextualRaw);

        // Retry once on failure
        if (contextualWords.length === 0) {
            console.warn(`📋 Chunk ${i + 1}: No words on first try, retrying in 2s...`);
            await new Promise(r => setTimeout(r, 2000));
            contextualRaw = await callGemini(contextualPrompt, "study_v2", "", "study_v2");
            contextualWords = parseStudyResponse(contextualRaw);
        }

        if (contextualWords.length === 0) {
            console.warn(`📋 Chunk ${i + 1}: Failed after retry`);
            failedChunks.push(i);
            continue;
        }


        // Phase 2: Simple explanations for extracted words
        try {
            chrome.tabs.sendMessage(tabId, {
                action: "studyProgress",
                current: i + 1,
                total: chunks.length,
                phase: "simple",
                wordsFound: allWords.length + contextualWords.length
            });
        } catch (e) { /* tab may be closed */ }

        const wordList = contextualWords.map(w => w.word);
        const simplePrompt = lang === 'si'
            ? buildStudySimplePromptSI(wordList, chunk, levelInfo)
            : buildStudySimplePromptEN(wordList, chunk, levelInfo);

        const simpleRaw = await callGemini(simplePrompt, "study_v2_simple", "", "study_v2");
        const simpleMap = parseSimpleResponse(simpleRaw);

        // Merge: each word gets {word, translation, definition, simple}
        for (const w of contextualWords) {
            w.simple = simpleMap[w.word.toLowerCase()] || '';
            allWords.push(w);
        }

        // Delay between chunks to avoid rate limiting
        if (i < chunks.length - 1) {
            await new Promise(r => setTimeout(r, 800));
        }
    }

    return { words: allWords, failedChunks, totalChunks: chunks.length };
}

// ============================================
// 📋 STUDY SHEET V3 — Hybrid Pipeline (Worker-side)
// ============================================

// ============================================
// 🌐 GEMINI API CALL
// ============================================

async function callGemini(prompt, word = "", context = "", url = "", generationConfig = null, metaOut = null) {
    const t0 = performance.now();
    try {
        const tSign = 0;   // no HMAC in direct mode

        const apiKey = await getApiKey();
        if (!apiKey) {
            // Locked is a different problem from missing, and telling someone to
            // go and get a key they already have is the wrong instruction.
            const ks = await getKeyState();
            if (ks.protection === "passphrase" && !ks.unlocked) {
                return `<div style="text-align:center; padding:20px;">
                    <div style="font-size:24px; margin-bottom:10px;">🔒</div>
                    <div style="font-weight:700; color:#92400e; margin-bottom:8px;">Key locked</div>
                    <p style="font-size:13px; color:#78716c; line-height:1.5;">Your API key is encrypted. Open Settings and enter your passphrase to unlock it for this browser session.</p>
                </div>`;
            }
            return `<div style="text-align:center; padding:20px;">
                <div style="font-size:24px; margin-bottom:10px;">🔑</div>
                <div style="font-weight:700; color:#92400e; margin-bottom:8px;">API key needed</div>
                <p style="font-size:13px; color:#78716c; line-height:1.5;">Open the extension Settings and paste your free Gemini API key.<br>Get one at aistudio.google.com/apikey</p>
            </div>`;
        }

        const { model, paidPlan } = await getModelConfig();

        // The reasoning models think by default, and thinking tokens add seconds
        // to what is a single-hop lookup — so switch it off, but only where the
        // parameter exists. This used to be unconditional, which was safe only
        // while the model was hardcoded.
        // Worker defaults — the extension previously inherited these server-side.
        const genCfg = Object.assign({ temperature: 0.4, topK: 40, topP: 0.95 }, generationConfig || {});
        if (!genCfg.thinkingConfig && modelAcceptsThinking(model)) {
            genCfg.thinkingConfig = { thinkingBudget: 0 };
        }

        const { system: systemTemplate } = await getPrompts();
        const systemInstruction = renderPrompt(systemTemplate, await langVars());

        const payload = {
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: genCfg,
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        };

        console.log(`📤 SENT → word:"${word}" model:${model}${paidPlan ? ' (paid, no fallback)' : ''} prompt:`, prompt.substring(0, 200));
        console.log(`📤 CONFIG →`, JSON.stringify(genCfg));

        // Walk a chain of free-tier models so a quota wall does not end the
        // lookup. A tester on a paid key opted out of this: they picked a model
        // deliberately and a silent downgrade would corrupt their comparison.
        const chain = paidPlan ? [model] : await buildFallbackChain(model);
        const cooldowns = paidPlan ? {} : (await chrome.storage.local.get({ modelCooldowns: {} })).modelCooldowns || {};
        const nowTs = Date.now();

        let res = null, usedModel = model;
        for (let i = 0; i < chain.length; i++) {
            const candidate = chain[i];
            const isLast = i === chain.length - 1;
            // Skip a model we already know is limited — unless it is all we have.
            if (!isLast && cooldowns[candidate] > nowTs) continue;

            const cfg = Object.assign({}, genCfg);
            if (!modelAcceptsThinking(candidate)) delete cfg.thinkingConfig;
            else if (!cfg.thinkingConfig) cfg.thinkingConfig = { thinkingBudget: 0 };

            res = await requestGemini(candidate, Object.assign({}, payload, { generationConfig: cfg }), apiKey);
            usedModel = candidate;

            if (!isQuotaError(res)) break;
            await noteCooldown(candidate, cooldownFrom(res));
            console.warn(`⏳ ${candidate} quota reached`);
            if (isLast) break;
        }

        if (metaOut) {
            metaOut.model = usedModel;
            // Any answer that did not come from the configured model is a
            // fallback worth surfacing — including one where the primary was
            // skipped outright because a previous call had already cooled it.
            if (usedModel !== model) {
                metaOut.fellBackFrom = model;
                metaOut.reason = 'quota';
            }
        }

        const data = res.data;
        const tNetwork = res.networkMs;
        const tParse = res.parseMs;
        const latencyMs = Math.round(performance.now() - t0);

        // Debug: log raw Gemini response
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log(`📥 RECEIVED ← raw:`, rawText);
        if (data._timing) console.log(`📥 WORKER TIMING ←`, JSON.stringify(data._timing));

        // Gemini returns { error: { code, status, message } } — quota, bad key, etc.
        if (data.error && typeof data.error === "object") {
            const st = data.error.status || "";
            console.error(`❌ GEMINI ERROR`, data.error.code, st, (data.error.message || "").substring(0, 200));
            if (st === "RESOURCE_EXHAUSTED") {
                return `<div style="text-align:center; padding:20px;">
                    <div style="font-size:24px; margin-bottom:10px;">⏳</div>
                    <div style="font-weight:700; color:#92400e; margin-bottom:8px;">Rate limit</div>
                    <p style="font-size:13px; color:#78716c; line-height:1.5;">Free tier allows 20 requests per minute.<br>Wait a moment and try again.</p>
                </div>`;
            }
            return `<div style="text-align:center; padding:20px;">
                <div style="font-size:24px; margin-bottom:10px;">⚠️</div>
                <div style="font-weight:700; color:#991b1b; margin-bottom:8px;">Gemini error</div>
                <p style="font-size:13px; color:#78716c; line-height:1.5;">${st || data.error.code || "Unknown"}<br>Check your API key in Settings.</p>
            </div>`;
        }

        // Handle rate limit (legacy Worker response — unused in direct mode)
        if (data.error === "limit_reached") {
            return `<div style="text-align:center; padding:20px;">
                <div style="font-size:24px; margin-bottom:10px;">⏳</div>
                <div style="font-weight:700; color:#92400e; margin-bottom:8px;">Daily Limit Reached</div>
                <p style="font-size:13px; color:#78716c; line-height:1.5;">You've used all ${data.limit} lookups for today.<br>Come back tomorrow for more!</p>
                <div style="margin-top:12px; font-size:12px; color:#a8a29e;">Resets at midnight IST</div>
            </div>`;
        }

        // Handle study sheet gating
        if (data.error === "feature_gated") {
            return "FEATURE_GATED";
        }

        if (!data.candidates) {
            console.error(`❌ NO CANDIDATES — full response:`, JSON.stringify(data).substring(0, 500));
            return `<div style="text-align:center; padding:15px;">
                <div style="font-size:20px; margin-bottom:8px;">😅</div>
                <div style="font-weight:600; color:#374151; margin-bottom:6px;">AI is temporarily busy</div>
                <p style="font-size:12px; color:#6b7280; margin-bottom:10px;">Try again in a few seconds.</p>
                <button onclick="this.parentElement.innerHTML='<div style=\\'text-align:center;padding:20px;color:#6b7280\\'>Retrying...</div>'" style="background:#2563eb; color:white; border:none; padding:8px 16px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Retry</button>
            </div>`;
        }

        // Save latency log
        const workerTiming = data._timing || {};
        const entry = {
            ts: Date.now(),
            model: usedModel,
            total: latencyMs,
            sign: tSign,
            network: tNetwork,
            parse: tParse,
            w_hmac: workerTiming.hmac || 0,
            w_cache: workerTiming.cache || 0,
            w_gemini: workerTiming.gemini || 0,
            w_total: workerTiming.total || 0,
            inputTokens: data.usageMetadata?.promptTokenCount || 0,
            outputTokens: data.usageMetadata?.candidatesTokenCount || 0
        };
        chrome.storage.local.get({ latencyLog: [] }, (res) => {
            const log = res.latencyLog;
            log.push(entry);
            if (log.length > 200) log.splice(0, log.length - 200);
            chrome.storage.local.set({ latencyLog: log });
        });
        recordLatency(usedModel, latencyMs);
        console.log(`⏱️ ${word || 'prompt'}: ${latencyMs}ms [sign:${tSign} net:${tNetwork} parse:${tParse} | worker→ hmac:${workerTiming.hmac||'?'} cache:${workerTiming.cache||'?'} gemini:${workerTiming.gemini||'?'}]`);

        return data.candidates[0].content.parts[0].text.replace(/```html/g, "").replace(/```/g, "").trim();

    } catch (e) { 
        console.error("AI Request Failed", e);
        return `<div style="text-align:center; padding:15px;">
            <div style="font-size:20px; margin-bottom:8px;">📡</div>
            <div style="font-weight:600; color:#374151; margin-bottom:6px;">Connection failed</div>
            <p style="font-size:12px; color:#6b7280; margin-bottom:10px;">Check your internet connection and try again.</p>
            <button onclick="this.parentElement.innerHTML='<div style=\\'text-align:center;padding:20px;color:#6b7280\\'>Retrying...</div>'" style="background:#2563eb; color:white; border:none; padding:8px 16px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Retry</button>
        </div>`;
    }
}
// ============================================
// 🖱️ CONTEXT MENU (Right-Click)
// ============================================

// Context menus are created in the consolidated onInstalled listener above

// 2. Handle the click
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "generate-study-sheet" && tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
            action: "triggerStudySheet",
            hasSelection: !!info.selectionText
        });
    }
});
