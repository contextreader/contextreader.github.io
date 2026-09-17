# HANDOFF

Last updated 2026-09-14. Read this before changing anything.

**Repo** `contextreader/contextreader.github.io` — private. Was public for about an hour on
14 Sep; assume that window may have been cloned. Nothing sensitive was in it.

**State** 63 commits · `npm test` → 578 assertions · `npm run package` → 1.9 MB ·
110 languages on 29 typesets · 2 permissions · 1 host.

---

## The objective, because the work drifted from it once

**Help someone read something they need to read, in a language that isn't their first.**
Sri Lanka first — people doing work in English — then anyone.

A dictionary gives every meaning of a word. Until recently nothing could tell you *which one
this sentence means*. A model can. That is the whole product.

Four commitments that constrain everything else:

- **Free permanently** — no plan, no quota. Possible because there is no server: the user
  brings their own Gemini key.
- **No tracking** — none, not "minimal". Verifiable: one host permission.
- **Open source, MIT** — so the privacy claim can be checked rather than believed.
- **Not a Sinhala product.** Sinhala is one language it happens to be good at.

---

## The gap that matters

**Almost none of this has been seen in a browser.** Only the Settings page, one lookup, and
the language picker on all three pages (headless Chrome, 14 Sep — see below).
Everything else is logic tested against a stubbed `chrome` and a DOM shim that renders
nothing at all. `npm test` passing means the logic holds; it says nothing about whether the
thing looks right or is readable.

Check these in a real browser, worst-first. **Five of eight were run on 15 Sep** by injecting
the real `content.js` into pages with Playwright (see below); the three left need a real key.

| # | Check | Result |
|---|---|---|
| 1 | A lookup on a **dark page** | ✓ **Was failing: 2.67:1**, measured from pixels. `.sr-header` is now near-opaque milk (0.86→0.80): **4.91:1**. |
| 2 | Target **Hindi**, then **More**, **General**, **Simple** | Needs a real key. Hardcoded-Sinhala fix is covered by tests, never watched running. |
| 3 | Target **English**, look up a hard English word | Needs a real key. Must simplify, not echo the word back. |
| 4 | Target **Sinhala**, `bank` in a finance sentence | Needs a real key. Must give **බැංකුව**, not ඉවුර (the river sense) — that pair already ships as a tuned example in `lib/languages.js`, so it is checkable today without waiting on new judgement. **Not** blood culture: `රුධිර වගාව` and `රෝග කාරක වගාව` were both rejected by Ian, and a medical example is deferred (see below). |
| 5 | A lookup on a **photo-heavy page** | ✓ **Was 3.86:1** over a worst-case striped ground; **5.21:1** with the same header fix. White page 5.49:1. |
| 6 | The **trigger** over busy text | ✓ Now the logo on an amber disc; clearly findable on white, dark and photo. (The white disc before it was weakest on white.) |
| 7 | **Scroll** with the bubble open | Not measured. |
| 8 | **PubMed** | ✓ **Three bugs, fixed.** The × was in the header's flow on *every* page (a later `position:relative` list overrode it); PubMed's `h2` rule set the word in Merriweather; its `button{padding:10px 20px}` left the Google button a 0px content box, so no icon. Re-run **without** `bypassCSP`: PubMed sends no CSP, and Inter and Noto Sans Devanagari both load. |

**Fonts were leaking browsing (found and fixed 15 Sep).** `content.js` runs on every page and
put an `@import` of Inter in its stylesheet at load, plus a Noto `<link>` for non-Latin
targets — so `fonts.googleapis.com` got a request carrying the page's origin as Referer on
**every site visited**, before any lookup. A recorded page load showed it. Fonts now load
only in `showBubble()` via `enableFonts()`, with `referrerPolicy = 'no-referrer'`; the
re-recorded load makes 0 font requests. `test/copy.test.js` holds it. Bundling the fonts
would remove the request entirely and is the open improvement.

**Fonts are bundled (17 Sep).** `fonts/` holds 24 variable `.woff2` files, 1.7 MB: Inter in
Latin, Cyrillic and Greek, and a Noto face for each of the 21 non-CJK typesets.
`scripts/fetch-fonts.mjs` downloads them from the css2 API and generates `lib/fonts.js`
(family, weight range, file, Google's own unicode-range); `content.js` turns that list into
`@font-face` rules pointing at `chrome.runtime.getURL`, and `applyLangFont` fetches nothing
for a typeset marked `bundled`. So **every language except Chinese, Japanese and Korean makes
no font request at all**, on any site.

Verified with the unpacked extension in Chromium on example.com **and github.com** (whose
`font-src github.githubassets.com` refuses Google Fonts): 3 Inter faces plus 21 Noto faces
injected, and `document.fonts.load()` resolving Latin, Cyrillic, Sinhala and Arabic from
`chrome-extension://…`, with no request to Google. Extension-origin fonts are not subject to
the page's CSP, so the bubble now renders correctly on strict sites where it used to fall
back to system faces.

Two traps met on the way: Chrome loads extensions only in **headed** Chromium
(`--load-extension` is ignored in headless; the unpacked id is the sha256 of the absolute
path, first 32 hex digits mapped 0-f → a-p), and the css2 API serves **one variable file for
every weight**, so saving per weight tripled `fonts/` to 5.3 MB before it was noticed.
CJK stays remote: those families are megabytes each and every OS ships good ones.

**A capture harness must reject error cards.** The landing session's rig waited for the panel
to hold more than 30 characters, and a "Gemini error — UNAVAILABLE" card clears that easily —
it reported success on a screenshot of a failure. It now rejects error, UNAVAILABLE, rate-limit
and failed-to-load text and wants 60 characters. Worth knowing for any future capture: an exit
code is not evidence, the frame is. (That 503 also says the free tier is thin.)

**Two bugs the store screenshots found (17 Sep).** Shooting real captures is a check of its
own: (1) the General/Simple panel opened on `rgba(0,0,0,0.5)` with a blur, so a panel *inside*
the bubble darkened the milky surface behind it and read as a rendering fault — it is a light
veil now, and the card is opaque like the search menu; (2) **More and General printed
everything twice for an English reader** — the templates ask for a block and then "the
${langName} version" of it, which is the same text when langName is English. `langVars()` now
returns `bilingual`, and the second block and the translate step are dropped when it is false.
Covered by integration assertions in both directions. A third followed from the re-shoot: the panel card was capped at 400/φ ≈ 247px, so a Sinhala explanation wrapped three words to a line inside a 400px bubble; it takes the bubble's width now.

**How the bubble was measured.** `playwright-core` from `~/Desktop/interactive app/node_modules`
(Chromium is in `~/Library/Caches/ms-playwright`). New page → `addScriptTag` a `window.chrome`
stub, `lib/languages.js`, `content.js` → `setLang(code)` → `showBubble(x, y, buildLookupHTML(word, {t, d}))`
→ screenshot at DPR 2. Contrast: ink = darker half of amber pixels (`r−b > 70`) in
`.sr-translation`'s box, ground = median of the neutral pixels there. For live sites use
`newContext({ bypassCSP: true })` — a content script bypasses page CSP, an injected tag does not.

**Extension pages can be screenshotted without loading the extension.** Read the real
`popup.html`/`welcome.html`/`options.html`, rewrite relative `src`/`href` to absolute
`file://` paths, inject a `window.chrome` stub (answer `getLanguages` from
`CRLanguages.listLangs()`) ahead of the page scripts, then
`"Google Chrome" --headless=new --allow-file-access-from-files --screenshot=… file://…`.
A driver script can read `location.hash` to type into a field. This does **not** cover the
bubble — `content.js` needs a real page and a real selection.

---

## Decided

**The palette (15 Sep).** Amber, one family at two strengths. Ian's brand is "orange"; both
earlier builds used the amber ramp, and the shipping `#a84e08` is the same hue made
text-safe, so the two "candidates" were never two brands.

- `#a84e08` — text, UI state, primary actions (5.12:1 on `#f4f5f7`).
- `#fbbf24` — display only: logo fill, hero shapes. 1.53:1 on the light ground, so never
  text and never a lone shape on light; put dark ink on it (10.63:1) or use it on dark.
- Teal is retired everywhere, the site included. `test/copy.test.js` fails if a page paints
  with a `--teal*` token.

Full tokens in `~/.claude/commands/brand-guide.md`.

---

## Next session's work

1. ~~**Languages past 100.**~~ — done 15 Sep: **110**, exactly the list Google documents
   every Gemini model as able to understand and respond in (Vertex AI docs, "Language
   support"), with Chinese split into Simplified (`zh`) and Traditional (`zh-TW`). 29
   typesets. `getLang()` still returns the old flat shape, and the original 13 were diffed
   against a snapshot and are byte-identical — keep both of those true.
   - **Correction to what this file said on 14 Sep:** the Google Fonts css2 API does *not*
     reject a weight a family lacks (Lobster, 400-only, answers `400;800` with 200). What it
     rejects is a family name that doesn't exist. All 25 Noto families were requested live
     and exist.
   - Only English and Sinhala are tuned. **Do not machine-translate examples** to change that.
   - `sc`/`jp`/`tc` overlap in Han on purpose. Typesets are render bundles, not Unicode
     scripts; don't merge entries because their ranges overlap.
   - Urdu renders in Noto Sans Arabic, not Nastaliq. Readers may notice; Noto Nastaliq Urdu
     is the fix if one says so.
   - Nobody has looked at output quality for any of the 97 new languages. They are labelled
     Community, which is the honest claim; "Translation works" in that label is Google's
     claim, not a measurement of ours.
2. ~~**Search in the language picker**~~ — done 14 Sep. `lib/lang-picker.js` is the one
   picker for Settings, the popup and the welcome page: a search field in front of the native
   `<select>`, which becomes a visible list while searching. Matches code, then name prefix,
   then word prefix — deliberately not mid-word. The tuned/community note follows the
   **highlighted** row while searching, never the saved language — the first version put
   "Tuned —" under a highlighted community language, caught only in a screenshot. Seen
   rendering in headless Chrome. The list is grouped under **Tuned** and **Community**
   headings rather than a "(community)" suffix per row — the suffix was what clipped in the
   300px popup, and would repeat ninety-odd times at 100 languages. Settings and the welcome
   page follow a language changed elsewhere (`setCurrent`, via `storage.onChanged`).
   The welcome page's step 1 was an **empty `<select>` from 13 to 14 Sep** — nothing
   populated it. `test/lang-picker.test.js` checks each page loads and attaches the picker.
3. ~~**New logo.**~~ — done 15 Sep. **Lit Line on amber**: three lines of text on an
   `#fbbf24` tile, the lit word solid ink, the rest ink at 34%. Chosen from five directions
   (review page: https://claude.ai/code/artifact/0fa3acc0-6931-4225-80f9-f82865d75b38).
   `icon.svg` is the source; `icon16/32/48/128.png` are rendered from it (128 is 96px art in
   16px padding, per Web Store guidance). The on-page trigger now draws the same mark on an
   amber disc — it was a white disc, weakest on white pages. No image tooling was needed:
   it is geometry, and SVG renders crisper at 16px than a generated bitmap would.
4. ~~**Rewrite `~/.claude/commands/brand-guide.md`**~~ — done 14 Sep; palette added 15 Sep.
   ~~**Welcome page drift**~~ — rewritten 15 Sep. It promised "30 free lookups per day",
   audio, video clips, saved words and an `Alt+Shift+S` shortcut — none of which this build
   has — showed a 🇱🇰 flag twice, and **never asked for the API key**, so a new user's first
   lookup was a "key needed" card. It now goes language → key (with why) → pin → highlight →
   the two-sentence `culture` demo, lists only what the bubble really has, and shows whether
   a key is set. `test/copy.test.js` holds all of it.
5. **Landing page — handed to its own session (15 Sep).** Everything that session needs is in
   **[LANDING.md](LANDING.md)**: scope (it owns `docs/` only), the hard rules, the decided brand
   system, verified facts, what must survive a redesign, and how to check it. This session
   should not edit `docs/` while that one is working. A first version exists in
   `docs/index.html`; Ian had the Sinhala demo line removed and the language list made
   alphabetical so Sinhala doesn't lead it.
6. **Then publish** — public repo, Pages from `main` `/docs`, store submission. **Needs Ian's
   go-ahead; nothing outward-facing has been done.** Store assets now: the 440×280 promo tile
   and one 1280×800 screenshot (Settings → language picker), from
   `scripts/store-assets.cjs`. Still to capture, from the real extension with a real key:
   the bubble over a real article (the one that sells it) and the model speed table. Do not
   stage those with invented answers or timings.

---

## From the landing session's capture run (15–16 Sep)

It loaded an unpacked build in Playwright, set a real key and target language in
`chrome.storage`, clicked the trigger and read answers out of the real bubble — roughly 700
lookups across 25 languages on `gemini-3.1-flash-lite`. Raw captures with Google responseIds
are in that session's scratchpad (`answers-ext2.json`, `modes-ext.json`).

Fixed here on 16 Sep, each with a test that fails without the fix:

- `lookupDetails` (**More**) told every language "STEP 4 — TRANSLATE TO SINHALA" while the
  rest of its template interpolated `{{langName}}`. Output stayed in the right language, so
  this was one model revision away from mattering.
- `lookupSimple` (**Simple**) answered Urdu in **Roman Urdu** — Latin script — while General
  answered in Urdu script in the same bubble. Its "like texting a friend" register read as
  romanised. The prompt now forbids romanising and names the script.
- `isScript()` said Turkish `kıyı`, `Işık` and Polish `Łódź` were not Latin: the typeset used
  `[A-Za-z]`. It is `\p{Script=Latin}` now.

**Confirmed against the real model after the fix (16 Sep).** The landing session re-captured
25 languages through a build of `23cb579`: Urdu Simple came back in Urdu script first try, no
retries, and **all 25 More answers changed** — the hardcoded "translate to Sinhala" step had
been steering every language, not sitting inert. Their before/after sets are
`modes-ext-oldprompt.json` and the current one in that session's scratchpad.

Still open from that run:

- **A medical Sinhala example — deferred, not blocking (17 Sep).** Ian chose to ship with what is
  there and add one later. Nothing claims a medical Sinhala answer now: the blood-culture target is
  marked disputed wherever it appears, and check 4 uses the finance pair instead. When it is picked
  up: capture a term whose everyday and clinical senses differ (`acute` is half-measured already —
  CLAUDE.md records 3.1 getting it right where 2.5-flash-lite does not), get Ian's yes on the
  Sinhala, then pin it as check 4 and, if he vouches for the pair, add it to the `si` examples.
- **Swahili**: "riverbank" came back as `ubao wa mto` ("plank of the river") twice, where
  `ukingo` is the usual word. A good first example pair if Swahili is ever tuned.
- The four Sinhala example pairs in `lib/languages.js` carry the same "checked by a speaker"
  assumption the disputed target did. Worth having Ian read those four while he is at it.

---

## Traps that have already cost time

1. **`node --check` passes badly broken CSS.** All of `content.js`'s styles are one template
   literal, so broken CSS is still a valid JS string. After any scripted edit take a **fresh**
   selector-set diff and brace count:
   ```
   grep -o 'sr-[a-zA-Z0-9_-]*' content.js | sort -u > /tmp/before.txt
   # edit
   grep -o 'sr-[a-zA-Z0-9_-]*' content.js | sort -u | diff /tmp/before.txt -
   ```
   Take the number fresh. `170/170`, `100/100`, `174/174` and `178/178` have each gone stale.
2. **Never rename an `sr-*` class.** Prompts in `background.js` name them, Gemini emits them
   as literal HTML, and a saved prompt override is a third place a stale name can hide —
   the one place neither grep nor this repo can see.
3. **Test the feature, not the diff.** 327 assertions missed three panels left hardcoded
   Sinhala, because not one of them called a panel function.
4. **`test/extract.mjs` finds code by comment banner.** Renaming a banner makes it throw
   rather than silently skip a test. Deliberate — fix the marker.
5. **Measure contrast against the composited ground, not white.** Two sessions got this wrong
   in opposite directions. The surface is translucent white over a grey page.
6. **`saveWord()` reads `.sr-section:nth-of-type(2)`**, and `:nth-of-type` counts by tag, not
   class. A `div` added inside `.sr-body` silently changes what gets saved.
7. **Another Claude session may be in this repo.** One was, for most of 12–13 Sep. Check
   `git status` before `git add -A` — an earlier one swept its uncommitted work into an
   unrelated commit.

---

## Still true, still not done

- The two retired builds stay private forever. Credentials were committed to one of them
  during development; rotate anything that was ever used there. Details stay out of this
  file now that this repo is public — see the private notes.
- The PDF reader is in the repo and out of the build. `npm run package` fails loudly if a
  `pdf*` file ever reaches the zip.
- Study Sheet is out of 1.0 — hardcoded Sinhala both ways, CEFR levels only as en/si pairs.
