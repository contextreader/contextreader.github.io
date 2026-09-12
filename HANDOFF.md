# HANDOFF — UX pass: direction settled, browser check still outstanding

The first Liquid Glass pass (tag `ux-wip-2026-09-12`) was **rejected on sight**: it was
chromatic and loud where the reference is monochrome and calm. It has been retuned.

**What changed, 2026-09-12 (second pass):**

| | First pass | Now |
|---|---|---|
| Ambient light | `0 0 55px` amber bloom on bubble, popup, Settings | none — no coloured light in any scene |
| Edge | `--sr-rim`, 5-stop amber↔teal iridescent | neutral, directional: bright white top-left → faint dark bottom-right |
| Refraction | `--sr-fx-lens: blur(4px) brightness(1.32) saturate(1.75)` | `--sr-fx-lens: none` — lens band retired everywhere |
| Body filter | `saturate(170%) brightness(1.10) contrast(0.94)` | `saturate(105%) brightness(1.06) contrast(0.97)` |
| Surface | `0.38 / 0.26 / 0.30` — near-transparent | `0.66 / 0.54 / 0.58` — milky |
| Depth | six insets, all white | dual-tone: light top-left **and a dark bottom-right** |
| Trigger | clear glass, ink rods | the most opaque surface in the extension (0.80/0.68/0.72) |
| Accent | amber fills, glows and gradients throughout | amber only where it carries meaning |

The direction was chosen from a rendered preview rather than written blind:
<https://claude.ai/code/artifact/3a28358e-9a63-41b1-b466-e642eb1a00cf> — variant A
(neutral glass, amber on the word), at surface 0.66/0.54/0.58, blur 20px, lens off.

**Where amber survives, deliberately:** the Sinhala translation line (`.sr-translation`),
the trigger's lit rod, the usage bar (quantity), step numbers on welcome (a real
sequence), and primary actions — which are now primary *by weight and hue, not by fill*.
`--sr-amber-deep` moved `#d97706` → `#b45309`: the old value was ~3.0:1 on the milkier
surface and failed AA at 16px.

**Not touched, deliberately:** the three-panel colour coding (contextual / General teal /
Simple green) is carrying information — it tells you which of the three explanations you
are reading — so it stays.

Read `CLAUDE.md` first for how the build works.

---

## Still unverified — this is the gap

The retune was checked structurally — `node --check` passes, the set of `sr-*` names is
byte-identical to `HEAD`'s (nothing lost, nothing invented), braces balance, all three
`@keyframes` survive, and the `@import` is still the first statement in the literal — and
the direction was judged against a rendered preview. But the **extension itself has still
not been loaded in a browser.** The preview could only answer checks #1 and part of #2; its "dark
page" is an authored panel, not the PDF reader, and its triggers sit over authored text.

Load unpacked (`chrome://extensions` → Developer mode → `sinhala-direct/`), add a Gemini
key in Settings, then look at a lookup on each of these.

| # | Check | Why it's the risk |
|---|---|---|
| 1 | A lookup on a **white article** (Wikipedia) | Baseline. The refractive edge should be visible as a bright halo at the bubble border. If the border looks like a flat white line, `mask-composite` didn't apply and the lens is dead. |
| 2 | A lookup on a **photo-heavy page** | The retune's main claim. Tint is now 66/54/58%. If Sinhala is still hard to read, raise `--sr-glass-top/mid/bot` (`content.js`, `:root`). One place, three numbers. |
| 3 | A lookup on a **dark page** / the extension's PDF reader | `brightness(1.14) contrast(0.88)` is meant to normalise a dark backdrop upward. Unverified. |
| 4 | **Scroll** while the bubble is open | Two nested `backdrop-filter`s per surface (body + lens). Repaint cost is unmeasured. If it janks, drop `saturate()` from `--sr-fx-body` first. |
| 5 | The **trigger** over text | Was the predicted failure, and was addressed: it is now the most opaque surface in the extension rather than the least. Confirm it actually holds on a busy background. |
| 6 | Click **More**, then **General**, then **Simple** | Gemini generates this markup. The panels got CSS for the first time; the prompts were edited in lockstep. Mismatch here means the two drifted. |
| 7 | Sinhala → Sinhala lookup | Confirms the `@import` still loads Noto Sans Sinhala. Note: **the toolbar is hidden entirely for Sinhala words** (the Google chip is inside `if (!isSinhala)`). Intentional or not is undecided. |
| 8 | **PubMed** | CSS-aggressive, and this build has no shadow DOM to protect it. |

---

## Known-incomplete, by area

### Visual
- **The extension has not been seen rendered.** All of the above.
- The `artifact-design` pass produced a trigger-mark study at
  `https://claude.ai/code/artifact/29ccb8bd-7250-49c7-9e1d-aaa7337432a9` —
  **Focus Brackets** is the chosen alternate if Lit Line reads as a text-formatting
  control once it's been used for a while.
- `welcome.html` and `pdf-reader.html` are now on the shared tokens. welcome's stylesheet
  was replaced wholesale (every class name preserved). pdf-reader is a *reading* surface,
  so its page stays flat and white and only the toolbar — which genuinely floats over the
  document — takes frost; its palette moved into the same neutral family.
- The printable study sheet (`content.js`, standalone stylesheet near the end) keeps white
  paper, since it exists to be printed; only its surround and the Save button moved.

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
   were overwritten. **Take your own brace-count baseline before editing and assert it
   after** — do not trust a number written down here, it moves every time a rule is added.
   (It was 170/170 when this file was written; 172/172 after the retune.) Pair it with a
   selector check, which is the stronger guard:

   ```sh
   # before, then again after — the set of names must be identical
   git show HEAD:content.js | grep -o 'sr-[a-zA-Z0-9_-]*' | sort -u > /tmp/before.txt
   grep -o 'sr-[a-zA-Z0-9_-]*' content.js | sort -u | diff /tmp/before.txt -
   ```

   Not line-anchored on purpose: a `^\s*[.#]` pattern misses `#smart-reader-bubble::before`,
   `> *` descendant rules and multi-selector lines — exactly what a mass overwrite destroys.

3. **The `@import` must stay the first statement** in that literal. Prepend anything and
   Noto Sans Sinhala silently stops loading.

4. **`saveWord()` uses `.sr-section:nth-of-type(2)`.** Wrapping, reordering or nesting
   `.sr-section` silently saves the wrong text.

5. **No shadow DOM.** Styles go to `document.head` and the bubble is `overflow: hidden`,
   so absolutely-positioned children get clipped at its edges — that is why the Google
   dropdown is right-anchored.
