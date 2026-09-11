# HANDOFF — UX pass is INCOMPLETE

Tagged `ux-wip-2026-09-12`. The Liquid Glass work is written, verified structurally,
and pushed — but **it has never been looked at in a browser.** Treat every visual claim
below as unconfirmed.

Read `CLAUDE.md` first for how the build works. This file is only about what is unfinished.

---

## Verify before anything else

Load unpacked (`chrome://extensions` → Developer mode → `sinhala-direct/`), add a Gemini
key in Settings, then look at a lookup on each of these. The design was written blind.

| # | Check | Why it's the risk |
|---|---|---|
| 1 | A lookup on a **white article** (Wikipedia) | Baseline. The refractive edge should be visible as a bright halo at the bubble border. If the border looks like a flat white line, `mask-composite` didn't apply and the lens is dead. |
| 2 | A lookup on a **photo-heavy page** | The deliberate tradeoff. Tint is 38/26/30% — very clear. If Sinhala text is hard to read here, raise `--sr-glass-top/mid/bot` (`content.js`, `:root`) by ~0.1 each. One place, three numbers. |
| 3 | A lookup on a **dark page** / the extension's PDF reader | `brightness(1.14) contrast(0.88)` is meant to normalise a dark backdrop upward. Unverified. |
| 4 | **Scroll** while the bubble is open | Two nested `backdrop-filter`s per surface (body + lens). Repaint cost is unmeasured. If it janks, drop `saturate()` from `--sr-fx-body` first. |
| 5 | The **trigger** over text | It is now clear glass with ink-coloured rods. On a busy background it may disappear — that is the most likely failure in the whole pass. |
| 6 | Click **More**, then **General**, then **Simple** | Gemini generates this markup. The panels got CSS for the first time; the prompts were edited in lockstep. Mismatch here means the two drifted. |
| 7 | Sinhala → Sinhala lookup | Confirms the `@import` still loads Noto Sans Sinhala. Note: **the toolbar is hidden entirely for Sinhala words** (the Google chip is inside `if (!isSinhala)`). Intentional or not is undecided. |
| 8 | **PubMed** | CSS-aggressive, and this build has no shadow DOM to protect it. |

---

## Known-incomplete, by area

### Visual
- **Nothing has been seen rendered.** All of the above.
- The `artifact-design` pass produced a trigger-mark study at
  `https://claude.ai/code/artifact/29ccb8bd-7250-49c7-9e1d-aaa7337432a9` —
  **Focus Brackets** is the chosen alternate if Lit Line reads as a text-formatting
  control once it's been used for a while.
- `welcome.html` and `pdf-reader.html` were never redesigned. They still use the old
  flat style and now clash with the bubble, popup and Settings.
- The printable study-sheet document (`content.js`, its own standalone stylesheet near
  the end of the file) shares no tokens with anything and is untouched.

### Code hygiene
- **`--space-xs` … `--space-2xl` are not namespaced** and are injected into the host
  page's `:root`. On a site that defines its own `--space-*`, ours win and can visibly
  break their layout. Pre-existing, widened by one token this session. Prefix them `--sr-`.
- `escapeHTML` is declared twice in `content.js`. Harmless (hoisting makes the second
  win) but it should be one.
- `GA_API_SECRET` is still hardcoded in `background.js`. It ships in the published
  extension too, so it is not a new exposure — but analytics is probably not wanted in
  a 10-person test build. Deleting that line is the whole fix.
- Five icon buttons (audio, video, save, list, study) are still *constructed* in
  `injectControls()` but never appended. Other code holds references to them
  (`saveWord()` reads `#sr-save-btn`), so they cannot simply be deleted.

### Security — not done, raised repeatedly
- **Rotate `AIzaSyAL_rAV…`** — the live Global Worker key, committed to
  `Context-Reader-Global` history across 4 files including `cloudfareworker-global.js`.
  Repo is private, so not an active leak, but history is permanent.
  Then: `wrangler secret put GOOGLE_API_KEY`, read `env.GOOGLE_API_KEY`, and add
  `cloudfareworker-global.js` to that repo's `.gitignore` (the Sinhala worker is
  already ignored there — the pattern didn't carry over when it was forked).
- **Rotate the `AQ.…` key** that was pasted into the session transcript.

---

## Open product questions, unresolved

**Latency vs. correctness.** The lookup is one call returning `{t,d}` together, because
splitting it (the published extension's MODE C) makes the model give the dictionary sense
instead of the contextual one — `culture` in a blood-culture context returned
`සංස්කෘතිය` when asked for the translation alone, `රක්ත වගාව` when asked for translation
plus explanation. The cost is MODE C's ~1s first paint; total is now 1.4–4.3s.

The fix is **not** to re-split. It is to stream the single call and render `t` the moment
it parses. `lookupModeA` had exactly that machinery and was deleted this session because
it streamed through the Worker — recover it from git history and point it at the direct
endpoint. This is the highest-value remaining change.

**The published extension has a real bug.** `gemini-2.5-flash-lite` returns `තියුණු`
("sharp") for clinical *acute*, in both the medical and geometry contexts — no
discrimination at all. Reproduced in four configurations. It affects the live Chrome Web
Store extension and is unfixed there.

Switching production to 3.1 **without also** moving to the single-call + `SCHEMA_TD`
shape makes things worse: under production's `t`-alone config, 3.1 overruns
`maxOutputTokens` writing paragraphs into the headline slot and truncates into invalid
JSON. Model and call shape have to change together.

**The 2.5 baseline is n=8, not n=24.** Its daily free-tier quota ran out mid-run. The
`acute` failure reproduced in both runs so that finding is solid; everything else about
2.5 is undersampled.

---

## Things that will bite whoever edits this next

1. **Gemini writes some of the HTML.** Prompt templates in `background.js` hardcode
   `sr-*` class names — the model emits `.sr-hook-box`, `.sr-chat`, `.sr-def-label`, and a
   second copy of the action-pill row. **Never rename an `sr-*` class**, and never delete
   `@keyframes fadeIn`. `normalizeActionPills()` in `content.js` exists because the model
   cannot reliably reproduce inline SVG.

2. **All bubble CSS is one template literal** (`const styles` in `content.js`).
   `node --check` passes on a badly damaged stylesheet, because broken CSS is still a
   valid JS string. It happened once this session: a `s.index('url("data:image/svg+xml…')`
   matched the bubble's grain texture instead of the trigger's mark and ~116 brace pairs
   were overwritten. **After any scripted edit, assert the brace count** — currently
   170/170 — and that a few known selectors survive. That check is the only thing that
   catches it.

3. **The `@import` must stay the first statement** in that literal. Prepend anything and
   Noto Sans Sinhala silently stops loading.

4. **`saveWord()` uses `.sr-section:nth-of-type(2)`.** Wrapping, reordering or nesting
   `.sr-section` silently saves the wrong text.

5. **No shadow DOM.** Styles go to `document.head` and the bubble is `overflow: hidden`,
   so absolutely-positioned children get clipped at its edges — that is why the Google
   dropdown is right-anchored.
