# LANDING — brief for the landing-page session

> **Trigger:** Ian starts this session with **`CR landing`**. The extension session's trigger
> is `CR handoff`; don't mix them.

Written 2026-09-15 for a fresh session whose only job is to design the website. Read this,
then `CLAUDE.md`'s first section for the product's four commitments. You do not need the
rest of `HANDOFF.md` — that is the extension's state, and another session owns it.

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
5. **The site itself makes no third-party requests.** No Google Fonts, no CDN, no analytics,
   no embedded video. Inter is self-hosted in `docs/fonts/`. A privacy product whose website
   phones Google would contradict itself. `test/copy.test.js` fails on a Google Fonts URL.
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
