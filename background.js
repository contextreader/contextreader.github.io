// background.js — DIRECT GEMINI MODE (experiment build)
// No Cloudflare Worker, no Supabase cache, no HMAC, no server-side rate limit.
// Each user supplies their own free Gemini API key in Settings.

// The model is a user setting now (Settings → Model). This is only the
// default, and the head of the fallback chain. Changing it here changes what a
// tester gets before they have ever opened Settings.
const DEFAULT_MODEL = "gemini-3.1-flash-lite";
const GEMINI_BASE   = "https://generativelanguage.googleapis.com/v1beta/models";

// Disabled in this build. Lookup modes A/B and the study sheet went through the
// Worker; LOOKUP_MODE is 'C', which routes entirely through callGemini().
const PROXY_URL = "";

async function getApiKey() {
    const { geminiApiKey } = await chrome.storage.local.get("geminiApiKey");
    return (geminiApiKey || "").trim();
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
        if (d.error) return { ok: false, error: d.error.status || String(d.error.code), models: [] };
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

// 📊 GOOGLE ANALYTICS CONFIG
const GA_MEASUREMENT_ID = "G-B53PH46FKB"; 
const GA_API_SECRET = "0-aHoLvsQyeTKwXSuKDwQQ";
const DEFAULT_SESSION_ID = Date.now();

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
// 📊 ANALYTICS FUNCTIONS
// ============================================

async function getOrCreateClientId() {
    const result = await chrome.storage.local.get('clientId');
    let clientId = result.clientId;
    if (!clientId) {
        clientId = self.crypto.randomUUID();
        await chrome.storage.local.set({ clientId });
    }
    return clientId;
}

async function trackEvent(eventName, params = {}) {
    try {
        const clientId = await getOrCreateClientId();
        
        const message = {
            client_id: clientId,
            events: [{
                name: eventName,
                params: {
                    session_id: DEFAULT_SESSION_ID,
                    engagement_time_msec: 100,
                    ...params
                }
            }]
        };

        await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`, {
            method: "POST",
            body: JSON.stringify(message)
        });
        
    } catch (e) {
        console.error("Analytics Error", e);
    }
}

// ============================================
// 🎯 MESSAGE LISTENERS
// ============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const currentUrl = sender.tab ? sender.tab.url : "Unknown";

    if (request.action === "lookup") {
        const tabId = sender.tab ? sender.tab.id : null;
        const fn = request.lang === 'si' ? lookupContextSinhala : lookupContext;
        fn(request.text, request.context, currentUrl, tabId).then(sendResponse);
        return true;
    }
    if (request.action === "lookupDetails") {
        const fn = request.lang === 'si' ? lookupDetailsSinhala : lookupDetails;
        fn(request.text, request.context, currentUrl).then(sendResponse);
        return true;
    }
    if (request.action === "lookupGeneral") {
        const fn = request.lang === 'si' ? lookupGeneralSinhala : lookupGeneral;
        fn(request.text).then(sendResponse);
        return true;
    }
    if (request.action === "lookupSimple") {
        const fn = request.lang === 'si' ? lookupSimpleSinhala : lookupSimple;
        fn(request.text, request.context).then(sendResponse);
        return true;
    }
    if (request.action === "generateStudySheetV2") {
        const tabId = sender.tab ? sender.tab.id : null;
        generateStudySheetV3(request.chunks, request.level, request.lang, tabId, request.calibrationWords).then(sendResponse);
        return true;
    }
    if (request.action === "fetchVideo") {
        fetchVideoSimple(request.query).then(sendResponse);
        return true;
    }
    
    // 📊 ANALYTICS TRACKING
    if (request.action === "track") {
        trackEvent(request.event, request.params);
        return false;
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

// 🎉 CONSOLIDATED onInstalled: tracking, welcome, installId, context menus
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        trackEvent("extension_installed", {
            version: chrome.runtime.getManifest().version
        });
        // Open welcome page on first install
        chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
        // Open a sample page so user can try highlighting immediately
        chrome.tabs.create({ url: "https://simple.wikipedia.org/wiki/Sri_Lanka", active: false });
    }
    // Set uninstall survey URL
    chrome.runtime.setUninstallURL("https://forms.gle/1uj8V6fZfmCfL65x8");
    // Ensure installId exists (for both install and update)
    chrome.storage.local.get('installId', (result) => {
        if (!result.installId) {
            chrome.storage.local.set({ installId: self.crypto.randomUUID() });
        }
    });
    // Create context menus (removeAll first to prevent duplicates on update)
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "open-in-reader",
            title: "Open with Context Reader PDF",
            contexts: ["link"],
            targetUrlPatterns: ["*://*/*.pdf", "*://*/*.pdf?*", "*://*/*.pdf#*", "file://*/*.pdf"]
        });
        chrome.contextMenus.create({
            id: "generate-study-sheet",
            title: "Generate Study Sheet",
            contexts: ["page", "selection"]
        });
    });
});

async function getInstallId() {
    const result = await chrome.storage.local.get('installId');
    if (result.installId) return result.installId;
    const id = self.crypto.randomUUID();
    await chrome.storage.local.set({ installId: id });
    return id;
}

// HMAC-SHA256 signing
async function signRequest() {
    throw new Error("signRequest: not available in direct mode (no Worker, no shared secret)");
}

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

async function fetchVideoSimple(word) {
    try {
        const searchUrl = `https://getyarn.io/yarn-find?text=${encodeURIComponent(word)}`;
        const response = await fetch(searchUrl);
        const html = await response.text();
        const linkPattern = /href="\/yarn-clip\/([a-z0-9\-]+)"/g;
        const matches = [...html.matchAll(linkPattern)];
        if (matches.length === 0) return { success: false, error: "No clips found." };
        const uniqueIds = [...new Set(matches.map(m => m[1]))];
        const topIds = uniqueIds.slice(0, 10);
        const videos = topIds.map(uuid => ({
            url: `https://y.yarn.co/${uuid}.mp4`,
            poster: `https://y.yarn.co/${uuid}_screenshot.jpg`
        }));
        return { success: true, videos: videos, text: word };
    } catch (e) {
        trackEvent("error_occurred", { error_type: "video_fetch", message: e.message });
        return { success: false, error: "Network error" };
    }
}

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

const LOOKUP_PROMPT_FULL = (word, context) => `TARGET WORD: "${word}"
CONTEXT: "${context}"

STEP 1 — ANALYZE (think, don't write):
- Domain/genre of the text?
- Which SPECIFIC sense of "${word}" is used here?
- What Sinhala register matches this domain?

STEP 2 — TRANSLATE:
- Give the Sinhala word/phrase that fits THIS context only
- Not a generic dictionary translation
- Example: "specimens" in paleontology = නිදර්ශක, NOT සාම්පල
- Example: "bank" in finance = බැංකුව, NOT ඉවුර

STEP 3 — EXPLAIN in casual spoken Sinhala:
- One sentence, like telling a friend what this means in what they're reading
- Connect to the specific situation in the text`;

// Appended to LOOKUP_PROMPT_FULL. This exact prompt+contract combination is the
// one measured across 12 contrastive pairs; responseSchema is deliberately NOT
// used with it, matching how it was validated.
// Verbatim from the Cloudflare Worker (sinhala/cloudfareworker.js).
// The Worker sent this as system_instruction on EVERY call; without it the
// model loses the domain-matching rules and gets e.g. "culture" wrong.
const SYSTEM_INSTRUCTION = `You are a Context-Aware Translation Assistant for Sinhala readers.

BEFORE ANSWERING, ALWAYS DO THIS (think, don't write):
1. What is the domain/genre? (science, history, politics, fiction, technical, etc.)
2. Which SPECIFIC sense of the word is used in THIS context?
3. What Sinhala register matches? (technical context → technical Sinhala, casual → casual)

TRANSLATION RULES:
- Give ONLY the meaning that fits THIS context — never multiple meanings
- Match the domain: "execute" in programming = ධාවනය කරනව, NOT ක්‍රියාත්මක කරනව
- Match the domain: "settlement" in history = ජනාවාසය, NOT පියවීම
- Match the domain: "bank" in finance = බැංකුව, NOT ඉවුර
- If the word is a proper noun or species name, transliterate + briefly identify what it is

EXPLANATION RULES:
- Casual spoken Sinhala — like explaining to a friend, not a textbook
- Connect to what they're reading — help them understand THIS sentence
- No HTML tags in JSON responses. Use HTML only when the prompt explicitly requests HTML output.`;

const LOOKUP_JSON_CONTRACT = `

Output ONLY this JSON: {"t": "<Sinhala translation for THIS context>", "d": "<one casual Sinhala sentence>"}`;

const SCHEMA_T = {
    type: "OBJECT",
    properties: {
        t: { type: "STRING", description: "Context-specific Sinhala translation. Must match the domain — not a generic dictionary word." }
    },
    required: ["t"]
};

const SCHEMA_TD = {
    type: "OBJECT",
    properties: {
        t: { type: "STRING", description: "Context-specific Sinhala translation. Must match the domain — not a generic dictionary word." },
        d: { type: "STRING", description: "One-sentence casual spoken Sinhala explanation of what this word means in THIS text. No HTML tags." }
    },
    required: ["t", "d"]
};

async function lookupContext(word, context, url, tabId) {
    trackEvent("word_lookup", { lang: "en" });
    incrementGlobalCounter();

    // modes A and B removed: they streamed via the Cloudflare Worker
    if (LOOKUP_MODE === 'C') return lookupModeC(word, context, url, tabId);
    return lookupModeDefault(word, context, url, tabId);
}

// ── DEFAULT: Single call, wait for full {t, d} ──
async function lookupModeDefault(word, context, url, tabId) {
    const generationConfig = {
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        responseSchema: SCHEMA_TD   // guarantees {t,d} shape; without it 2.5 emitted doubled JSON
    };
    return await callGemini(
        LOOKUP_PROMPT_FULL(word, context) + LOOKUP_JSON_CONTRACT,
        word, context, url, generationConfig);
}

// ── MODE A: Stream JSON from Gemini, parse t and d as they arrive ──
// ── MODE B: Stream with delimiter (plain text: translation\n---\nexplanation) ──
// ── MODE C: Two sequential calls — t first (fast), then d in background ──
async function lookupModeC(word, context, url, tabId) {
    const t0 = performance.now();

    const tPrompt = LOOKUP_PROMPT_FULL(word, context);
    const tConfig = {
        maxOutputTokens: 128,
        responseMimeType: "application/json",
        responseSchema: SCHEMA_T
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
        `TARGET WORD: "${word}" (Sinhala: "${tData.t}")\nCONTEXT: "${context}"\n\nExplain what "${word}" means in THIS context in one sentence of casual spoken Sinhala. Like telling a friend. No HTML.`,
        word, context, url,
        { maxOutputTokens: 192, responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { d: { type: "STRING", description: "Casual Sinhala explanation" } }, required: ["d"] } }
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
    const prompt = `You are creating immersive learning content for a Sinhala reader who just encountered "${word}" while reading.

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
- Wrap the Sinhala word for "${word}" in <b> tags EVERY TIME it appears
- Match the formality level: formal context = formal Sinhala, casual context = casual Sinhala
- Use vocabulary from the same domain in Sinhala too

Output ONLY this HTML structure (No markdown):
<div class="sr-hook-box" style="animation: fadeIn 0.5s;">
    <span class="sr-label">⚡️ Scenario</span>
    <p class="sr-hook-text">[1-2 sentence scenario that takes place in the SAME world/genre as the context above]</p>
    <p class="sr-sub-text">[Sinhala scenario matching the context's formality, with <b>word</b>]</p>
</div>

<div class="sr-section" style="animation: fadeIn 0.5s 0.1s backwards;">
    <span class="sr-label">💬 Dialogue</span>
    <div class="sr-chat">
        <div class="sr-chat-bubble sr-chat-a"><b>A:</b> [Dialogue line from character that fits this world]</div>
        <div class="sr-chat-bubble sr-chat-b"><b>B:</b> [Response from character B]</div>
    </div>
    <p class="sr-sub-text">[Sinhala dialogue matching tone, with <b>word</b>]</p>
</div>

<details class="sr-details" style="animation: fadeIn 0.5s 0.2s backwards;">
    <summary>📖 Full Story...</summary>
    <div class="sr-full-story">
        <p class="sr-text">[3-4 sentence story extending the scenario in the same world]</p>
        <hr class="sr-divider">
        <p class="sr-sub-text">[Sinhala story with <b>word</b>]</p>
    </div>
</details>
`;
    return await callGemini(prompt, word, context, url);
}

async function lookupGeneral(word) {
    const prompt = `
Target Word: "${word}"

Task:
1. Provide a general, dictionary-style definition.
2. Give 2 OTHER common uses of this word in different contexts.
3. Translate to Sinhala.

CRITICAL: In Sinhala translations, wrap the key Sinhala word in <b> tags.

Output ONLY this HTML (no markdown):
<div class="sr-general-box">
    <p class="sr-def"><b>General Definition:</b> [Broad, general meaning that covers all uses]</p>
    <p class="sr-sub-text">[Sinhala general definition with <b>key word</b>]</p>
    <div style="margin-top:12px;">
        <span class="sr-label">Other Common Uses:</span>
        <ul style="margin:0; padding-left:18px; font-size:13px; color:#374151; line-height:1.8;">
            <li>[Example use in different context 1] - <span class="sr-gen-trans">[Sinhala with <b>word</b>]</span></li>
            <li>[Example use in different context 2] - <span class="sr-gen-trans">[Sinhala with <b>word</b>]</span></li>
        </ul>
    </div>
</div>
`;
    return await callGemini(prompt);
}

async function lookupSimple(word, context) {
    const prompt = `You are a friendly Sinhala teacher explaining to a 13-year-old student.

The student is reading this: "${context}"

They got stuck on the word: "${word}"

YOUR TASK:
1. Explain what "${word}" means IN WHAT THEY'RE READING using super simple Sinhala
2. Start with "ඔයා කියවන දේ අනුව..." (According to what you're reading...) to connect it back
3. Give ONE simple example sentence in Sinhala that a teenager would say
4. Keep it SHORT - total of 3-4 sentences max

IMPORTANT:
- Use the SIMPLEST Sinhala words possible (like texting a friend)
- Don't use formal/literary Sinhala
- Help them understand THIS sentence, not give a general definition

Output ONLY this HTML structure (No markdown):
<div class="sr-simple-box">
    <div style="background:rgba(240,253,244,0.66); border:1px solid rgba(134,239,172,0.45); border-radius:13px; padding:15px; margin-bottom:10px;">
        <div style="font-weight:700; color:#166534; font-size:14px; margin-bottom:5px;">👶 Simple Explanation</div>
        <p style="font-size:14px; color:#14532d; line-height:1.6; font-family:'Noto Sans Sinhala', sans-serif;">
            [Start with "ඔයා කියවන දේ අනුව..." then explain in super simple Sinhala what ${word} means in their context]
        </p>
        <div style="margin-top:10px; border-top:1px dashed #bbf7d0; padding-top:8px;">
            <span style="font-size:11px; font-weight:700; color:#166534; text-transform:uppercase;">Example:</span>
            <p style="font-size:13px; color:#15803d; font-style:italic; margin-top:2px;">[One casual Sinhala sentence a 13-year-old would actually say]</p>
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
    trackEvent("word_lookup", {
        lang: "si"
    });
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

async function generateStudySheetV3(chunks, level, lang, tabId, calibrationWords) {
    const levelInfo = STUDY_LEVELS[level] || STUDY_LEVELS.advanced;
    const allWords = [];
    const failedChunks = [];
    const debugInfo = [];

    const cefrLevel = levelInfo.cefr;
    // Sinhala extension: always translate to Sinhala regardless of source text language
    const langName = 'Sinhala';

    for (let i = 0; i < chunks.length; i++) {
        // Support both old format (string) and new format ({ chunk, context })
        const chunkData = typeof chunks[i] === 'string' ? { chunk: chunks[i], context: chunks[i] } : chunks[i];

        // Progress update
        try {
            chrome.tabs.sendMessage(tabId, {
                action: "studyProgress",
                current: i + 1,
                total: chunks.length,
                phase: "processing",
                wordsFound: allWords.length
            });
        } catch (e) { /* tab may be closed */ }

        // Retry with backoff: up to 2 retries (1s, then 2s delay)
        const MAX_RETRIES = 2;
        let success = false;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                if (attempt > 0) {
                    const backoff = attempt * 1000; // 1s, 2s
                    console.log(`📋 Chunk ${i + 1}: Retry ${attempt}/${MAX_RETRIES} after ${backoff}ms`);
                    await new Promise(r => setTimeout(r, backoff));
                }

                const installId = await getInstallId();
                const extensionId = chrome.runtime.id;
                const { timestamp, signature } = await signRequest(extensionId, installId);

                const response = await fetch(PROXY_URL + "study-v2", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chunk: chunkData.chunk,
                        context: chunkData.context, // Larger 500-word window for translation accuracy
                        level: cefrLevel,
                        lang,
                        langName,
                        calibrationWords,
                        installId,
                        extensionId,
                        timestamp,
                        signature
                    })
                });

                const data = await response.json();

                if (data.error) {
                    console.warn(`📋 Chunk ${i + 1} (attempt ${attempt + 1}): Error — ${data.error}`);
                    if (attempt < MAX_RETRIES) continue; // retry
                    failedChunks.push(i);
                    break;
                }

                if (data.words && data.words.length > 0) {
                    allWords.push(...data.words);
                    success = true;
                } else {
                    console.warn(`📋 Chunk ${i + 1} (attempt ${attempt + 1}): No words returned`);
                    if (attempt < MAX_RETRIES) continue; // retry
                    failedChunks.push(i);
                }

                if (data.debug) {
                    debugInfo.push({ chunk: i + 1, ...data.debug });
                }
                break; // success or final failure — exit retry loop

            } catch (e) {
                console.error(`📋 Chunk ${i + 1} (attempt ${attempt + 1}): Fetch error —`, e.message);
                if (attempt >= MAX_RETRIES) {
                    failedChunks.push(i);
                }
            }
        }

        // Delay between chunks
        if (i < chunks.length - 1) {
            await new Promise(r => setTimeout(r, 800));
        }
    }

    if (debugInfo.length > 0) {
        console.log('📋 Study Sheet V3 Debug:', JSON.stringify(debugInfo, null, 2));
    }

    return { words: allWords, failedChunks, totalChunks: chunks.length, pipelineDebug: debugInfo };
}

// ============================================
// 🌐 GEMINI API CALL
// ============================================

async function callGemini(prompt, word = "", context = "", url = "", generationConfig = null) {
    const t0 = performance.now();
    try {
        const tSign = 0;   // no HMAC in direct mode

        const apiKey = await getApiKey();
        if (!apiKey) {
            return `<div style="text-align:center; padding:20px;">
                <div style="font-size:24px; margin-bottom:10px;">🔑</div>
                <div style="font-weight:700; color:#92400e; margin-bottom:8px;">API key needed</div>
                <p style="font-size:13px; color:#78716c; line-height:1.5;">Open the extension Settings and paste your free Gemini API key.<br>Get one at aistudio.google.com/apikey</p>
            </div>`;
        }

        const { model } = await getModelConfig();

        // The reasoning models think by default, and thinking tokens add seconds
        // to what is a single-hop lookup — so switch it off, but only where the
        // parameter exists. This used to be unconditional, which was safe only
        // while the model was hardcoded.
        // Worker defaults — the extension previously inherited these server-side.
        const genCfg = Object.assign({ temperature: 0.4, topK: 40, topP: 0.95 }, generationConfig || {});
        if (!genCfg.thinkingConfig && modelAcceptsThinking(model)) {
            genCfg.thinkingConfig = { thinkingBudget: 0 };
        }

        const payload = {
            system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: genCfg,
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        };

        console.log(`📤 SENT → word:"${word}" model:${model} prompt:`, prompt.substring(0, 200));
        console.log(`📤 CONFIG →`, JSON.stringify(genCfg));

        const { data, networkMs: tNetwork, parseMs: tParse } =
            await requestGemini(model, payload, apiKey);
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
            trackEvent("error_occurred", {
                error_type: "ai_response",
                message: "No candidates in response"
            });
            return `<div style="text-align:center; padding:15px;">
                <div style="font-size:20px; margin-bottom:8px;">😅</div>
                <div style="font-weight:600; color:#374151; margin-bottom:6px;">AI is temporarily busy</div>
                <p style="font-size:12px; color:#6b7280; margin-bottom:10px;">Try again in a few seconds.</p>
                <button onclick="this.parentElement.innerHTML='<div style=\\'text-align:center;padding:20px;color:#6b7280\\'>Retrying...</div>'" style="background:#2563eb; color:white; border:none; padding:8px 16px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Retry</button>
            </div>`;
        }

        // 📊 Track Usage & Cost
        if (data.usageMetadata) {
            const inputTokens = data.usageMetadata.promptTokenCount || 0;
            const outputTokens = data.usageMetadata.candidatesTokenCount || 0;
            const totalTokens = data.usageMetadata.totalTokenCount || 0;

            const inputCost = (inputTokens / 1000000) * 0.30;
            const outputCost = (outputTokens / 1000000) * 2.50;
            const totalCost = inputCost + outputCost;

            trackEvent("ai_usage", {
                input_tokens: inputTokens,
                output_tokens: outputTokens,
                total_tokens: totalTokens,
                estimated_cost_usd: totalCost.toFixed(7)
            });

        }

        // Save latency log
        const workerTiming = data._timing || {};
        const entry = {
            ts: Date.now(),
            word: word || '(prompt)',
            model,
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
        recordLatency(model, latencyMs);
        console.log(`⏱️ ${word || 'prompt'}: ${latencyMs}ms [sign:${tSign} net:${tNetwork} parse:${tParse} | worker→ hmac:${workerTiming.hmac||'?'} cache:${workerTiming.cache||'?'} gemini:${workerTiming.gemini||'?'}]`);

        return data.candidates[0].content.parts[0].text.replace(/```html/g, "").replace(/```/g, "").trim();

    } catch (e) { 
        console.error("AI Request Failed", e);
        trackEvent("error_occurred", { 
            error_type: "network", 
            message: e.message 
        });
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
    if (info.menuItemId === "open-in-reader" && info.linkUrl) {
        const viewerUrl = chrome.runtime.getURL("pdf-reader.html") + "?file=" + encodeURIComponent(info.linkUrl);
        chrome.tabs.create({ url: viewerUrl });
    }
    if (info.menuItemId === "generate-study-sheet" && tab?.id) {
        chrome.tabs.sendMessage(tab.id, {
            action: "triggerStudySheet",
            hasSelection: !!info.selectionText
        });
    }
});
// ============================================
// 🚨 SMART BADGE (Visual Cue for PDFs)
// ============================================

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check if the page is fully loaded and has a URL
    if (changeInfo.status === 'complete' && tab.url) {

        // Check if it is a PDF (Web or Local)
        let isPdf = false;
        try {
            const parsedUrl = new URL(tab.url);
            isPdf = parsedUrl.pathname.toLowerCase().endsWith('.pdf');
        } catch (e) {
            // Fallback for URLs that can't be parsed
        }
        // Also check the raw URL for file:// paths and simple .pdf endings
        if (!isPdf) {
            const lowerUrl = tab.url.toLowerCase();
            isPdf = lowerUrl.endsWith('.pdf') || (lowerUrl.startsWith('file:') && lowerUrl.includes('.pdf'));
        }
        // Broadest check: .pdf anywhere followed by end, query, or hash
        if (!isPdf) {
            isPdf = /\.pdf([?#]|$)/i.test(tab.url);
        }
        
        if (isPdf) {
            // 1. Set the badge text to "PDF"
            chrome.action.setBadgeText({ text: "PDF", tabId: tabId });
            
            // 2. Make it RED (Eye-catching)
            chrome.action.setBadgeBackgroundColor({ color: "#e11d48", tabId: tabId });
            
            // 3. (Optional) Update title to give instruction
            chrome.action.setTitle({ title: "📄 PDF Detected! Click to translate.", tabId: tabId });
        } else {
            // Clear badge for non-PDF pages
            chrome.action.setBadgeText({ text: "", tabId: tabId });
        }
    }
});