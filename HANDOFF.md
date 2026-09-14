# HANDOFF

Last updated 2026-09-14. Read this before changing anything.

**Repo** `contextreader/contextreader.github.io` — private. Was public for about an hour on
14 Sep; assume that window may have been cloned. Nothing sensitive was in it.

**State** 45 commits · `npm test` → 443 assertions · `npm run package` → 136 KB ·
13 languages on 9 typesets · 2 permissions · 1 host.

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

Check these in a real browser, worst-first:

| # | Check | Why it is the risk |
|---|---|---|
| 1 | A lookup on a **dark page** | The answer line measures ~2:1 contrast against the composited scrim. That line is the product. This is the one that can invalidate work rather than merely look wrong. |
| 2 | Target **Hindi**, then **More**, **General**, **Simple** | These three were hardcoded Sinhala until 14 Sep while the first bubble was correct. Fixed and covered by tests, but never watched running. |
| 3 | Target **English**, look up a hard English word | The same-language path: it must simplify, not echo the word back. |
| 4 | Target **Sinhala**, `blood culture` | Must give `රුධිර වගාව`, not `වගාව`. The prompt has changed twice; this is the only check standing under it. |
| 5 | A lookup on a **photo-heavy page** | The retune's main claim. Surface is 66/54/58%. If text is hard to read, raise `--sr-glass-top/mid/bot` in `content.js` `:root`. |
| 6 | The **trigger** over busy text | Was the predicted failure of the first glass pass; the fix (most opaque surface rather than least) is untested. |
| 7 | **Scroll** with the bubble open | Repaint cost unmeasured. The lens band was retired, which should have helped. |
| 8 | **PubMed** | CSS-aggressive, and there is no shadow DOM protecting the bubble. |

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

1. **Languages past 100.** The restructure is done (14 Sep): `TYPESETS` holds font, Google
   Fonts family, detection regex and direction once; `LANGUAGES` entries name one. A language
   on an existing typeset is now one line. `getLang()` still returns the old flat shape, so
   no consumer changed — keep it that way. What's left is the data: add the languages, and a
   `TYPESETS` entry per new script. Check as you go:
   - **Every new `family` URL must return 200.** The css2 API rejects a request that asks for
     a weight the family doesn't have, and every entry today asks for `400;600;800` — don't
     assume a new Noto family has all three. `curl -sI` each one.
   - Keep `tuned`/`examples` honest — at that scale it matters more, not less, and only
     English and Sinhala have checked examples. **Do not machine-translate examples.**
   - `sc` and `jp` overlap in Han on purpose. Typesets are render bundles, not Unicode
     scripts; don't merge entries because their ranges overlap.
2. ~~**Search in the language picker**~~ — done 14 Sep. `lib/lang-picker.js` is the one
   picker for Settings, the popup and the welcome page: a search field in front of the native
   `<select>`, which becomes a visible list while searching. Matches code, then name prefix,
   then word prefix — deliberately not mid-word. The tuned/community note follows the
   **highlighted** row while searching, never the saved language — the first version put
   "Tuned —" under a highlighted community language, caught only in a screenshot. Seen
   rendering in headless Chrome. Two things still open:
   - Long labels clip in the 300px popup list (`简体中文 — Chinese (Simplified) (comm…`).
     Longer names arrive with item 1. Don't fix it by dropping the community tag — the UI
     must say which languages are tuned.
   - The welcome page's step 1 was an **empty `<select>` from 13 to 14 Sep** — nothing
     populated it. Fixed; `test/lang-picker.test.js` now checks each page loads and attaches
     the picker. Treat any other markup-only change to `welcome.html` with suspicion.
3. **New logo.** `icon128.png` is puzzle pieces around a **Sinhala glyph**, and mush at the
   32px it mostly lives at. Generate several directions for review first.
   *Blocked:* `MCP_DOCKER` has not connected — no image tooling.
4. ~~**Rewrite `~/.claude/commands/brand-guide.md`**~~ — done 14 Sep; palette added 15 Sep.
   ~~**Welcome page drift**~~ — rewritten 15 Sep. It promised "30 free lookups per day",
   audio, video clips, saved words and an `Alt+Shift+S` shortcut — none of which this build
   has — showed a 🇱🇰 flag twice, and **never asked for the API key**, so a new user's first
   lookup was a "key needed" card. It now goes language → key (with why) → pin → highlight →
   the two-sentence `culture` demo, lists only what the bubble really has, and shows whether
   a key is set. `test/copy.test.js` holds all of it.
5. **Landing page.** `docs/index.html` is the old page and reads as Sinhala-first. A redesign
   exists as a preview but was not committed; it needs the 100+ language treatment and the
   brand colours before it lands.
6. **Then publish** — public repo, Pages from `main` `/docs`, store submission. Screenshots
   (1280×800 plus a 440×280 tile) are the hard blocker; `STORE_LISTING.md` lists the four
   worth taking.

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

- `sinhala/` and `global/` stay private forever. `global/` has a **live Gemini key in
  committed history**, plus a Supabase anon key and an HMAC secret. Rotate all three
  regardless.
- The PDF reader is in the repo and out of the build. `npm run package` fails loudly if a
  `pdf*` file ever reaches the zip.
- Study Sheet is out of 1.0 — hardcoded Sinhala both ways, CEFR levels only as en/si pairs.
