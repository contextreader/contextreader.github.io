# LANDING — brief for the landing-page session

> **Trigger:** Ian starts this session with **`CR landing`**. The extension session's trigger
> is `CR handoff`; don't mix them.

Written 2026-09-15 for a fresh session whose only job is to design the website. Read this,
then `CLAUDE.md`'s first section for the product's four commitments. You do not need the
rest of `HANDOFF.md` — that is the extension's state, and another session owns it.

---

## Start here — the current job (21 Sep)

The site is built, live and verified. The job now is **search**: making the pages answer what
people actually type. **Read [SEARCH.md](SEARCH.md) first** — it has the keyword data, the
competitors, and six pages in priority order. Do the first two, then check in with Ian:

1. **Tune the home page for "translate in context".** Title, meta description and H1 should use
   the phrase people type — "translate in context", "word meaning in context" — naturally, once
   each. It is the one query cluster that is ours by definition (5,000/mo each, low
   competition). Keep the description under 160 characters: Bing flags longer ones.
2. **Write "Context Reader vs Reverso Context"** as a new page, e.g. `docs/vs-reverso.html` and
   `/vs-reverso` in the sitemap. Reverso Context is the direct competitor (582,000 searches/mo,
   almost all its brand name). Be genuinely fair: Reverso shows many example sentences from a
   corpus and is better for idioms and bilingual concordance; Context Reader reads *your*
   sentence and answers for it. **A comparison that concedes nothing reads as an ad and ranks
   like one.** Name only facts you can check: Reverso's current features and pricing from its
   own site, fetched the day you write.

Both pages sit under the same rules as every other page: `npm test` walks every
`docs/*.html`, and a claim the build cannot back fails it. Link the new page from the home
page and from `llms.txt`.

**Done 21 Sep (both, reviewed by Ian and shipped; next pages wait for him):**
- Home: title "Context Reader — translate in context, in your language"; description (151
  chars) carries "the word’s meaning in context". The H1 stays "The word you’re stuck on, in
  your language." — Ian rejected "translated in context": the extension doesn't translate for
  same-language readers, and the H1 is the brand line on the store tiles and social preview.
  The title carries the search phrase. Footer and noscript link to the comparison.
- `docs/vs-reverso.html`: answer-first lede, where Reverso is better (idioms, real bilingual
  examples, learning tools, subtitles/apps, no setup), where Context Reader differs, a table,
  which-to-use, and a 4-question FAQ mirrored in FAQPage JSON-LD. Every Reverso fact was read off
  Reverso’s own pages on 21 Sep (sources listed in the page's head comment): 28 languages
  (extension page), 100,000+ expressions, Premium $9.99/mo or $77.88/yr, 75% off for students
  and teachers. WebFetch gets 403 from reverso.net; a headless Chromium with a desktop UA works.
  The DEAD regexes in `test/copy.test.js` can't tell whose feature a sentence names, so
  Reverso's features are worded around them ("pronunciation", "favourites").
  In the sitemap and llms.txt; `test/copy.test.js` now checks its install script too.

**Pull before you start** — the extension session pushes to `main` too. Stage only `docs/`,
`LANDING.md` and anything under it; never `git add -A`.

---

## Scope — what this session may touch

| Yours | Not yours — another session owns these |
|---|---|
| `docs/` (the whole site: `index.html`, `fonts/`, `icon.svg`, `icon128.png`, `llms.txt`, `sitemap.xml`, `robots.txt`) | `content.js`, `background.js`, `options.*`, `popup.*`, `welcome.*`, `lib/`, `manifest.json` |
| `LANDING.md` (keep it current as you decide things) | `HANDOFF.md`, `CLAUDE.md`, `STORE_LISTING.md`, `PRIVACY_POLICY.md` |
| `scripts/site-languages.mjs` | `test/` — except you may *add* site checks to `test/copy.test.js` |

**Before every commit run `git status`.** Two sessions share this working copy. Stage only
your own paths (`git add docs/ LANDING.md …`), never `git add -A`. An earlier session once
swept another's uncommitted work into an unrelated commit.

**Do not push, make the repo public, or enable GitHub Pages.** Ian decides that. Commit locally.

---

## The product, in one breath

Context Reader is a free, open-source Chrome extension. Highlight a word you're stuck on;
it reads the sentence around it and explains the **one meaning that fits**, in the language
you choose. A dictionary gives every meaning; a model can pick the one *this sentence*
means. That is the whole product.

**Objective:** help someone read something they need to read, in a language that isn't
their first — anyone, anywhere.

**Audience:** people reading in a second language, or in a register they don't use — a
medical term, a legal phrase, an academic sentence. Students and working people.

**The site's single job:** make someone understand that in five seconds, trust it, and
install it — including the one-minute cost of getting a free Gemini API key.

---

## Ian's direction (15 Sep)

**"This should look like a premium design."** Not a template, not a developer README with
a gradient. Think of the restraint of a well-made product page: confident type, generous
space, a few exact details, and one memorable moment — the lit word — instead of many
competing ones. Premium here should come from precision and calm rather than decoration,
which is consistent with the yardstick below (legibility first, calm second, decoration
last). Show him a direction early (a private Artifact preview works on his phone) before
building every section.

## Hard rules (these have each gone wrong before)

1. **Not a Sinhala product — and no Sri Lanka framing.** No Sinhala-first framing, examples,
   glyphs or artwork, and no country of origin. Ian
   removed a Sinhala answer from the demo and asked for Sinhala not to lead the language
   list — both on 15 Sep. Sinhala appears only where it is simply one of the facts: in the
   alphabetical language list, and in "English and Sinhala are tuned". This has had to be
   undone three times; treat it as settled.
2. **Never fabricate product output.** Don't show a model answer, a speed figure or a
   screenshot of the bubble unless it was captured from the real extension with a real key.
   The current demo's English glosses are *illustrative copy written by us*, not captured
   output — fine as explanation, not as a screenshot. If you want a real bubble image, say so
   and leave a placeholder; Ian captures it.
3. **No quota, no "free tier".** It's free because there's no server. "50 lookups/day" and
   "30 free lookups per day" are dead lines from older products; `test/copy.test.js` fails on
   them.
4. **Privacy claims must match the code, precisely.**
   - True: the extension holds **exactly one host permission** (Google's Gemini API); no
     analytics, telemetry, account or identifiers; the key stays on the device.
   - True: the bubble's fonts load from Google Fonts **only when a bubble opens**, with **no
     referrer**. Say so if you describe what leaves the machine.
   - False: "it can only contact one host" / "Chrome enforces that it talks to one server".
     Fonts are page-context requests the permission doesn't govern. This was corrected on
     15 Sep in three documents; don't reintroduce it.
5. **The site loads exactly two third-party scripts, and nothing else.** Cloudflare Web
   Analytics (17 Sep) counts visits; Umami (21 Sep) counts visits and the clicks tagged
   `data-umami-event`. Both are cookieless, both are named in the page's own prose, and
   `test/copy.test.js` enforces both halves: an unlisted host fails, and so does an allowed
   one the page does not name. Everything else still holds — no Google Fonts, no CDN, no
   embedded video, Inter self-hosted in `docs/fonts/` — and **the extension takes neither**:
   its "no tracking" is absolute. Microsoft Clarity was tried on 21 Sep behind a consent card
   and removed on 22 Sep; do not re-add anything that is not cookieless.
   *(This rule said "no analytics" until 24 Sep, which stopped being true on the 17th — the
   video session caught it. Say what the site does, not what it used to.)*
6. **Say which languages are tuned.** 110 languages; only English and Sinhala carry
   speaker-checked examples. Presenting them as equal would be false. Never imply more tuned
   languages than there are.
7. **Don't open with "AI-powered".** Lead with the problem; show, don't claim.

---

## Brand system (decided — don't re-ask)

Full guide: `~/.claude/commands/brand-guide.md` (also the `/brand-guide` skill).

**Colour — amber at two strengths, ink, a milky neutral.**

```
--ink          #111827   text
--ink-soft     #374151   body
--mute         #5b6472   secondary (AA on the ground)
--ground       #eef0f3   milky neutral page       dark: #101317
--paper        #fbfbfc   raised surfaces           dark: #171b21
--accent       #a84e08   amber-deep: links, answers, primary emphasis — 5.12:1 on #f4f5f7
--glow         #fbbf24   amber-glow: DISPLAY ONLY — always a fill with #111827 ink on it
                         (10.63:1), or on a dark ground. 1.53:1 on light: never text,
                         never a lone shape on a light ground.
--green        #166534   "tuned"                   dark: #4ade80
teal #0891b2             retired. Nowhere.
```

In dark theme, `--accent` becomes `#fbbf24` (it is text-safe on dark).

**Measure contrast against the composited ground, not white.** Two sessions shipped failing
colours by measuring against the wrong ground.

**Type.** Inter (self-hosted: 400, 600, 800, Latin subset — `docs/fonts/`). Article-like
specimen text currently uses a system serif stack (Iowan Old Style, Charter, Georgia). If
you want another face, self-host it (OFL/Apache only) and add it to `NOTICE`.

**Logo — Lit Line on amber.** `docs/icon.svg`: an amber-glow tile, three lines of text,
the one word that matters in solid ink and the rest faded. Idea: *reading, and one word
singled out*. The on-page trigger button in the extension draws the same mark on an amber
disc. Review page of the five directions it beat:
https://claude.ai/code/artifact/0fa3acc0-6931-4225-80f9-f82865d75b38

**The signature device** is the logo's *lit word*: `#fbbf24` fill behind ink text, used on a
word. It's the site's one bold element; keep everything else quiet. Priorities, from
`contextreader-ux-yardstick`: **legibility first, calm second, decoration last.** Ian
rejected an earlier "Liquid Glass" pass for looking impressive instead of calm.

**Spacing/timing** are Fibonacci / φ in the extension (3 5 8 13 21 34 55 89 px; 0.236 /
0.382 / 0.618 s; line-height 1.618). The site may borrow them.

---

## Facts the page can use

| Fact | Source |
|---|---|
| 110 languages — exactly the list Google documents every Gemini model as understanding and responding in, with Chinese split into Simplified and Traditional | `lib/languages.js`; Vertex AI docs "Language support" |
| English and Sinhala are tuned (speaker-checked worked examples); 108 are community | `lib/languages.js` |
| Same-language input is simplified, not translated into itself | extension behaviour |
| In the bubble: **More** (fuller explanation tied to the sentence), **General** (the word's other meanings), **Simple** (plainer words), **EN** (this one answer in English; the setting stays), **Search** (pronounce / look up on Google), **Esc** closes | `content.js` — audio, video and saved words are *not* attached; don't list them |
| Free permanently, no account, open source (MIT) | `LICENSE` |
| One host permission: `generativelanguage.googleapis.com` | `manifest.json` |
| Key stored on-device, read only by the service worker, optional AES-GCM passphrase | `background.js` |
| Getting a key takes about a minute, no card | Google AI Studio |
| Default model `gemini-3.1-flash-lite`; user-selectable; free-tier fallback never lands on a Pro model | `background.js` |
| Real examples for "one word, right meaning": *culture* (blood culture vs company culture), *bank* (finance vs river), *execute* (programming vs death), *novel* (science vs fiction), *acute* (clinical vs geometry) | brand guide, `lib/languages.js` |

**Links** — repo `https://github.com/contextreader/contextreader.github.io` (private for now);
site `https://contextreader.github.io` (Pages off); contact `contextreader@gmail.com`;
privacy policy and contributing guide are in the repo. There is no Chrome Web Store listing
yet — don't link to one or promise a date. Old links (`contextreader.pages.dev`,
`Context-Reader-Global`, the old store listing) belong to the previous product.

**No Sri Lanka mention either.** Ian removed "Made in Sri Lanka" from the footer on 15 Sep.
No country of origin, no flag, no "built in" line anywhere on the site.

---

## What exists now

`docs/index.html` is the page built across 15–17 Sep in this session. Seven sections, each one
scroll-driven — the visual pins and scrolling scrubs it, rather than a timed loop:

1. **Try it** — five everyday documents (travel journal, landlord's text, court report, English
   homework, tenancy agreement) where a word is selected, the trigger clicked and the bubble
   answers. **In the visitor's own language**, picked from their browser languages, then their
   timezone, then English. A switcher lets them change it; the choice is remembered.
2. **Why it exists** — four beats on *significant* in a research paper: stuck on one word →
   Google Translate (in Google's blue, with its real captured output) → a dictionary → Context
   Reader. Sourced from Ian's own interview notes; no Sri Lanka framing.
3. **In the bubble** — More, General and Simple clicked in turn on the real bubble.
4. **Get started** — the three real setup steps played in a small browser window, ending on
   Settings' own "Saved and verified", then "why a key, not an account".
5. **Languages** — the same sentence answered in one captured language after another, and an
   explanation of how the model handles languages **quoting Gemini itself**, unedited and dated.
   No wall of 110 names: Ian dropped it on 16 Sep.
6. **Privacy** — a request log that fills as you scroll: the lookup, and a font file for
   Chinese, Japanese and Korean only. Plus what the site itself does (see analytics below).
7. **The end** — a last invitation, links, and the colophon.

**Every answer shown anywhere was captured through the real extension** (`ext-run.cjs` and
`ext-modes.cjs` in the session scratchpad: unpacked build in Chromium, word double-clicked,
trigger clicked, bubble read, with Google's responseId recorded). 25 languages. Nothing on the
page is written by us in a reader's language.

Also on the page: a **contents index** in the right margin (a Contents button under 1100px);
**Copy for LLM / View as Markdown**, which build the page as text in the browser, including that
visitor's answers; **JSON-LD** (SoftwareApplication + a 5-question FAQPage); and a **noscript**
text version, because every demo is JS-driven and a crawler without JS would otherwise see nothing.

**Analytics (17 Sep).** The site counts visits with Cloudflare Web Analytics, cookieless, token
in the page. The extension collects nothing, and the page states both plainly rather than blurring
them — in the privacy section, the footer, the Markdown template and the noscript fallback.
GoatCounter was considered and dropped. Search Console needs a **URL-prefix** property (a domain
property can't work: github.io's DNS isn't ours); `port-head.html` carries the meta tag, and the
value may need replacing with the one Google issues for the HTML-tag method.

**Umami (21 Sep).** Added alongside Cloudflare (Ian kept both), to count clicks. Website ID
`583c9618-5c32-40a5-b0dd-33b2d8f7048d`, free Hobby plan. Events, via `data-umami-event`
attributes: `install-click` (props `place`, `browser`, `to` = store|github — the last two set
by the install script), `get-key-click` (`place`), `copy-for-llm`, `view-markdown`, and
`demo-language` (`language`, `was`, `guessed`), which is sent from the picker's change handler
with `umami.track`. The tracker loads from cloud.umami.is and posts to gateway.umami.is; it sets
no cookie and writes nothing to storage (read on 21 Sep from the script itself). Every
disclosure names both services. Google Analytics is deferred until Ian runs Google Ads.

**Microsoft Clarity (21–22 Sep): tried and removed.** It ran for a day behind a consent card
(project `ylv5kj8w7i`) and Ian removed it on 22 Sep. It is **not** cookieless: tested in a real
browser, its loader fires a sync pixel that sets Microsoft's `MUID` on clarity.ms and bing.com on
every load, whatever the project's cookie setting. Do not re-add it, or anything like it, without
a consent step; `test/copy.test.js` fails if clarity.ms appears on any page.

**Bing (18 Sep).** Bing Webmaster Tools is verified by **importing from Google Search Console**
(Ian's account, Administrator role): no BingSiteAuth.xml, no msvalidate.01 tag, and none needed.
The sitemap came across with the import. **IndexNow is not set up**, on purpose: three rarely
changing pages, and the sitemap already covers them. Bing's site scan wants meta descriptions of
160 characters or fewer, so keep each page's description under that. It also reports "alt
attribute missing" for the brand-mark `<img alt="">`s; the empty alt is deliberate (decorative,
next to the visible name) and stays.

### Things that must survive any redesign

- The two marker comments around the language list — `<!-- languages:start … -->` and
  `<!-- languages:end -->`. Regenerate the list with **`node scripts/site-languages.mjs`**
  (alphabetical by English name; `li.tuned` marks the two tuned ones; each native name has
  its `lang` and, for RTL scripts, `dir="rtl"`). Style `ul.langs` however you like.
- The `<title>`, meta description, canonical, Open Graph tags and the JSON-LD block in
  `<head>` (SEO). Update `docs/sitemap.xml` `lastmod` when you ship.
- `docs/llms.txt` states the same facts for crawlers; keep it consistent with the page.
- A visible "tuned" distinction, the key-setup cost, and the privacy table's accuracy.

---

## Checks

```bash
npm test                          # includes test/copy.test.js site checks:
                                  #  - every language on the site, none extra, right count
                                  #  - no fonts.googleapis.com / gstatic on the site
                                  #  - no dead claims (daily quota, video, audio, Alt+Shift, 🇱🇰)
node scripts/site-languages.mjs   # after touching the list markup
```

**Seeing it.** `open docs/index.html`. For screenshots at real sizes and to prove zero
external requests, Playwright's Chromium is installed via another project:

```js
// node shot.cjs  — full-page screenshots, light desktop and dark phone, and external-request count
const { chromium } = require('/Users/ianxavier/Desktop/interactive app/node_modules/playwright-core');
(async () => {
  const b = await chromium.launch();
  for (const [name, vp, scheme] of [['desk', { width: 1280, height: 900 }, 'light'], ['phone', { width: 390, height: 844 }, 'dark']]) {
    const p = await b.newPage({ viewport: vp, colorScheme: scheme });
    const ext = []; p.on('request', (q) => { if (!q.url().startsWith('file:')) ext.push(q.url()); });
    await p.goto('file:///Users/ianxavier/Desktop/Archived%20Files/ContextReader/sinhala-direct/docs/index.html');
    await p.waitForTimeout(800);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    await p.screenshot({ path: `site-${name}.png`, fullPage: true });
    console.log(name, 'external requests:', ext.length, 'horizontal overflow:', overflow);
  }
  await b.close();
})();
```

Keep screenshots in the session scratchpad, not in the repo.

To share a preview with Ian on his phone before Pages is on, publish a private Artifact
(multi-file: `index.html` plus `fonts/*` and `icon.svg`).

---

## When done

1. `npm test` passes; zero external requests; no horizontal overflow at 390px; both themes.
2. Update this file's "What exists now" with what you built and why.
3. Commit only your paths, with a message saying what changed and what was verified.
4. Tell Ian it's ready; he returns to the extension session afterwards. Don't push.
