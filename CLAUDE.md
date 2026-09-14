# Context Reader

> **Read [HANDOFF.md](HANDOFF.md) first.** It carries the current state, the open decisions,
> the browser checks nobody has run, and the traps that have already cost time.

**This is the product, not an experiment.** It began as a fork of the published `sinhala/`
build to test whether a newer model plus a user-supplied key beat the Worker-proxied setup.
It did, and this became the thing that ships: one extension, many languages, free, open
source, no server, no tracking.

**Help someone read something they need to read, in a language that isn't their first.**
Sri Lanka first, then anyone. A dictionary gives every meaning of a word; until recently
nothing could tell you which one *this sentence* means. That is the entire product.

Four commitments that constrain every change:

- **Free permanently.** No plan, no quota. Possible only because there is no server — the
  user brings their own Gemini key.
- **No tracking.** None, not "minimal". One host permission, and it must stay that way.
- **Open source, MIT**, so the privacy claim is checkable.
- **Not a Sinhala product.** Sinhala is one language it happens to be good at. Do not let
  the code, the copy or the artwork drift back toward treating it as the default.

Never rename an `sr-*` class: `background.js` prompt templates hardcode them, Gemini emits
them as literal HTML, and a user's saved prompt override is a third place a stale name can
hide.

## What is different from the published extension

| | Published `sinhala/` | This build |
|---|---|---|
| Request path | extension → Cloudflare Worker → Supabase cache → Gemini | extension → **Gemini, directly** |
| Model | `gemini-2.5-flash-lite` | **user-selectable**, default `gemini-3.1-flash-lite` |
| Auth | HMAC-SHA256 shared secret with the Worker | user's own API key |
| Key storage | Worker env var | `chrome.storage.local`, optionally AES-GCM encrypted |
| Rate limit | 50/day, server-enforced via KV | Google free tier, with automatic fallback down a chain of free models |
| Response cache | Supabase `cache` table | none — every lookup hits Gemini |
| Global counter | Worker KV | local count in `chrome.storage.local` |
| Bubble toolbar | audio, Google, video, save, list, study sheet | Google (with a search dropdown) + a one-shot **EN** button |
| Languages | Sinhala only | **13 packs**, English and Sinhala tuned; same-language input is simplified rather than translated |
| Analytics | GA4 on every lookup | none |

There is **no Worker, no Supabase, and no HMAC secret in this repo**, and no longer any
stub pretending otherwise — `signRequest`, `PROXY_URL` and the dead study-sheet V3 path were
all removed. Lookup modes A and B were deleted; they streamed through the Worker.

## Architecture

```
highlight word → content.js captures word + surrounding context
  → background.js callGemini()
  → POST generativelanguage.googleapis.com/v1beta/models/<selected model>:generateContent
     with system_instruction + prompt + SCHEMA_TD + safetySettings
  → on 429, replays down a chain of free-tier models (unless paidPlan is set)
  → returns {t, d} → content.js buildLookupHTML() → floating bubble
```

### The request shape matters — do not change one part in isolation

`callGemini()` in `background.js` sends four things that were measured together:

1. **`SYSTEM_INSTRUCTION`** — verbatim from the old Worker. 1,004 chars of domain-matching
   rules (`"bank" in finance = බැංකුව, NOT ඉවුර`). Removing it measurably degrades output:
   without it the model returned `වගාව` instead of `රුධිර වගාව` for blood culture.
   **Now the editable default, not a constant** — see Editable prompts below.
2. **`LOOKUP_PROMPT_FULL` + `LOOKUP_JSON_CONTRACT`** — the production prompt plus an
   explicit `{t,d}` contract. The prompt is also editable; the contract is not.
3. **`SCHEMA_TD`** as `responseSchema` — guarantees the JSON shape. Without it, models
   emitted doubled JSON objects and the parse failed (~2 in 5 calls).
4. **`temperature: 0.4, topK: 40, topP: 0.95`** + safety settings — the Worker's defaults,
   which the extension used to inherit server-side.

Plus `thinkingConfig: { thinkingBudget: 0 }` — but only for models that accept it, which
`modelAcceptsThinking()` puts at 2.5 and 3.x. These reason by default and thinking tokens
add seconds to a single-hop lookup, but sending the parameter to a model that does not
know it is a 400 INVALID_ARGUMENT that fails the request. `requestGemini()` retries once
without it if the guess was wrong, so an unknown custom id degrades instead of dying.

(Earlier revisions of this file claimed the `gemini-3*` keying already existed. It did
not — the parameter was sent unconditionally, which was only safe while the model was
hardcoded.)

### Model selection and fallback

`getModelConfig()` resolves the model from `chrome.storage.local`; `DEFAULT_MODEL` in
`background.js` is only the default. The Settings dropdown is populated from a live
`ListModels` call, so it lists what the tester's key can actually reach.

On a 429 the lookup replays down a chain built from that list — the configured model,
then `flash-lite`, then `flash`. **Pro models are never in the chain**: a silent fallback
onto one could cost a tester money on a key they said was free. Exhausted models get a
cooldown in `modelCooldowns`. Setting `paidPlan` disables the whole mechanism, because
someone on a paid key chose their model deliberately.

When a fallback happens the answer carries an `_m` key inside its JSON, and the bubble
renders a note saying which model actually answered. That note is a **sibling** of
`.sr-body`, never a child — `saveWord()` reads `.sr-section:nth-of-type(2)`, and
`:nth-of-type` counts by tag, so a div added inside `.sr-body` silently changes what gets
saved.

### Editable prompts

`getPrompts()` returns overrides from `chrome.storage.local` or the shipped defaults.
Editable: the system instruction and the lookup prompt. Not editable:
`LOOKUP_JSON_CONTRACT` and `SCHEMA_TD`, which control whether the response parses at all.

The lookup default is **derived** — `LOOKUP_PROMPT_FULL('{{word}}', '{{context}}')` — so
the editable default cannot drift from the shipped prompt. `test/prompt-equivalence` holds
that line.

Every save snapshots both prompts into `promptHistory` (capped at 50; index 0 is the
shipped default and is never evicted). Restore appends rather than truncates.

A third place stale `sr-*` class names can now hide is a tester's saved prompt override —
and it is the one place neither grep nor this repo can see.

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
- **lib/lang-picker.js** — the one language picker (Settings, popup, welcome): labels, the
  tuned/community description, and search. Pages keep their own `change` handler for saving;
  a new picker page must load this script before its own and call `CRLangPicker.attach`.

## Setup

1. `chrome://extensions` → Developer mode → Load unpacked → this folder
2. Extension Settings → paste a free key from aistudio.google.com/apikey → Save

Without a key, lookups return a "key needed" card rather than failing silently.

## Conventions

- The API key must never be hardcoded. It lives in `chrome.storage.local` — never
  `chrome.storage.sync`, which replicates to Google's servers — and is read only in the
  service worker, never passed to a content script. Settings shows it masked and never
  prefills it. With a passphrase set it is AES-GCM encrypted at rest and the plaintext
  lives in `chrome.storage.session` (which survives worker eviction; a module variable
  would not). Never add a mode that encrypts with a key the extension also stores.
- Run `npm test` after touching `background.js`, `options.js`, `content.js` or
  `lib/diff.js`. 271 assertions, no dependencies. `node --check` cannot catch the failure
  that matters — all bubble CSS is one template literal, so broken CSS is still valid JS.
- `cloudfareworker*.js`, `wrangler.toml` and `.env` are gitignored — API keys have leaked
  through those files in a sibling repo before.
- `word` in `content.js` is text selected from an arbitrary page. Escape it with
  `escapeHTML()` before it touches `innerHTML`, and `encodeURIComponent()` it in URLs.
