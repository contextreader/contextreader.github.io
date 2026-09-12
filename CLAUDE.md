# Context Reader (Direct) — Sinhala

> **⚠️ UX pass: direction settled, browser check outstanding — see [HANDOFF.md](HANDOFF.md).**
> The first Liquid Glass pass was rejected for being chromatic and loud. It has been
> retuned to a calm monochrome frost with amber kept only where it carries meaning, chosen
> from a rendered preview. The **extension itself still has not been loaded in a browser** —
> verify before building on top. Never rename an `sr-*` class: `background.js` prompt
> templates hardcode them and Gemini emits them as literal HTML.

Experiment build. Forked from the published `sinhala/` v2.1.0 extension to answer one
question: **is a newer Gemini model plus a user-supplied API key better than the
Worker-proxied setup?**

Not for the Chrome Web Store. For ~10 testers, each using their own free Gemini key.

## What is different from the published extension

| | Published `sinhala/` | This build |
|---|---|---|
| Request path | extension → Cloudflare Worker → Supabase cache → Gemini | extension → **Gemini, directly** |
| Model | `gemini-2.5-flash-lite` | **`gemini-3.1-flash-lite`** |
| Auth | HMAC-SHA256 shared secret with the Worker | user's own API key |
| Key storage | Worker env var | `chrome.storage.local`, entered in Settings |
| Rate limit | 50/day, server-enforced via KV | Google free tier (20 RPM per model) |
| Response cache | Supabase `cache` table | none — every lookup hits Gemini |
| Global counter | Worker KV | local count in `chrome.storage.local` |
| Bubble toolbar | audio, Google, video, save, list, study sheet | **Google only** (with a search dropdown) |

There is **no Worker, no Supabase, and no HMAC secret in this repo.** `signRequest()` is a
stub that throws. Lookup modes A and B were deleted — they streamed through the Worker.

## Architecture

```
highlight word → content.js captures word + surrounding context
  → background.js callGemini()
  → POST generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent
     with system_instruction + prompt + SCHEMA_TD + safetySettings
  → returns {t, d} → content.js buildLookupHTML() → floating bubble
```

### The request shape matters — do not change one part in isolation

`callGemini()` in `background.js` sends four things that were measured together:

1. **`SYSTEM_INSTRUCTION`** — verbatim from the old Worker. 1,004 chars of domain-matching
   rules (`"bank" in finance = බැංකුව, NOT ඉවුර`). Removing it measurably degrades output:
   without it the model returned `වගාව` instead of `රුධිර වගාව` for blood culture.
2. **`LOOKUP_PROMPT_FULL` + `LOOKUP_JSON_CONTRACT`** — the production prompt plus an
   explicit `{t,d}` contract.
3. **`SCHEMA_TD`** as `responseSchema` — guarantees the JSON shape. Without it, models
   emitted doubled JSON objects and the parse failed (~2 in 5 calls).
4. **`temperature: 0.4, topK: 40, topP: 0.95`** + safety settings — the Worker's defaults,
   which the extension used to inherit server-side.

Plus `thinkingConfig: { thinkingBudget: 0 }` for any `gemini-3*` model. These reason by
default; thinking tokens add seconds to what is a single-hop lookup.

### One call, not two — this is deliberate

`LOOKUP_MODE = 'default'` sends one request returning `{t, d}` together.

The published extension uses `MODE C`, which splits this: one call for the translation
(fast first paint), a second for the explanation. **That split causes wrong answers.**
Asking for the translation alone lets the model fall back to the dictionary sense;
requiring the explanation in the same response forces it to commit to the domain.

Measured, same model, same prompt:

| | `t` alone (MODE C) | `t`+`d` together |
|---|---|---|
| `culture` (blood culture) | `සංස්කෘතිය (Culture)` ✗ | `රක්ත වගාව` ✓ |

Cost of the single call: ~1.4–4.3s to full result, versus MODE C painting the word at ~1s.
The fix is **not** to re-split — it is to stream the single call and render `t` as soon as
it parses. Not yet implemented.

### Known issue in the published extension

`gemini-2.5-flash-lite` returns `තියුණු` ("sharp") for clinical *acute*, in both the
medical and geometry contexts — no discrimination. Reproduced in four configurations,
with and without the system instruction. `gemini-3.1-flash-lite` returns `හදිසි`/`උග්‍ර`
correctly. This affects the live Chrome Web Store extension and is unfixed there.

Note that switching the published extension to 3.1 **without** also moving to the single
call + `SCHEMA_TD` shape makes things worse: under production's `t`-alone config, 3.1
overruns `maxOutputTokens` writing paragraphs into the headline slot and truncates into
invalid JSON.

## Key files

- **background.js** — service worker. `callGemini()` is the whole network layer.
  `getApiKey()` reads `geminiApiKey` from `chrome.storage.local`. `getAccessInfo()` is
  stubbed to unlimited (no server to ask).
- **content.js** — injected everywhere. Bubble UI, selection handling, the Google search
  dropdown (`.sr-g-menu`). Styles go to `document.head` — there is no shadow DOM in this
  version, so the bubble's `overflow: hidden` clips absolutely-positioned children; the
  dropdown is right-anchored for that reason.
- **options.html / options.js** — settings, including the API key field. The key is
  verified with a live Gemini call before it is saved. Script is external because MV3
  `script-src 'self'` blocks inline scripts on extension pages.
- **welcome.html / welcome.js** — onboarding. Same inline-script constraint.

## Setup

1. `chrome://extensions` → Developer mode → Load unpacked → this folder
2. Extension Settings → paste a free key from aistudio.google.com/apikey → Save

Without a key, lookups return a "key needed" card rather than failing silently.

## Conventions

- The API key must never be hardcoded. It lives in `chrome.storage.local`, nowhere else.
- `cloudfareworker*.js`, `wrangler.toml` and `.env` are gitignored — API keys have leaked
  through those files in a sibling repo before.
- `word` in `content.js` is text selected from an arbitrary page. Escape it with
  `escapeHTML()` before it touches `innerHTML`, and `encodeURIComponent()` it in URLs.
