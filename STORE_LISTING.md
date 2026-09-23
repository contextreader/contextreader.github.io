# Chrome Web Store listing

Copy for the submission form. Keep in sync with `manifest.json` — the permission
justifications below are what review actually reads, and a mismatch is the most common
cause of rejection.

---

## Name

`Context Reader`

## Short description (132 characters max)

> The word you're stuck on, explained in your language — using the sentence around it. Free, open source, no tracking.

*(116 characters)*

## Category

**Productivity → Education.**

The dashboard groups categories now: Productivity is a heading, not a choice, and its leaves
are Communication, Developer Tools, Education, Tools and Workflow & Planning. Education,
because the product exists to help someone read something in a language that isn't their
first, and its readers are students and working people. Tools is the fallback if discovery
by general-utility browsing ever matters more; Communication is wrong — that is chat and
mail. The category can be changed later without a re-review.

## Language

English

---

## Detailed description

**Understand the word, not just its definition.**

A dictionary gives you every meaning of "culture". Context Reader reads the sentence
you're actually looking at, works out that you're reading a lab report, and gives you
the one that fits.

Select a word on any page. You get the meaning that matches the context, in your
language, in about two seconds.

**110 languages**
Every language Google lists Gemini as supporting, from Afrikaans to Zulu — සිංහල, தமிழ்,
हिन्दी, বাংলা, اردو, العربية, 简体中文, 繁體中文, 日本語, 한국어, Español, Français, Kiswahili
and the rest. English and Sinhala are tuned with checked examples; the extension tells you
which languages are and which aren't.

**Already reading in your own language?** It won't translate a word into itself — it
gives you a simpler word for the one you're stuck on.

**Go deeper when you need to.** Three further views on any word: a worked scenario, a
dictionary-style entry, and a plain explanation pitched at a thirteen-year-old.

**Free, and built to stay that way.**
Context Reader has no server. It calls Google's Gemini API directly from your browser
using your own free API key, which takes about a minute to create. Because nobody is
paying per-lookup costs, there is no subscription, no quota and no reason to ever start
charging.

**No tracking. Verifiably.**
No analytics. No telemetry. No account. No identifiers. The extension holds permission
for exactly one API — Google's Gemini — and your lookups go nowhere else. (Its typefaces
ship inside the extension for every language except Chinese, Japanese and Korean; those
three fetch one font file when a bubble opens, with no page address attached.) The entire
source is public, so you don't have to take our word for it.

Your API key is stored on your device, read only by the extension's background worker,
and can be encrypted with a passphrase.

**Open source (MIT).** Adding examples for your language is a few lines in one file.

Source and privacy policy: https://github.com/contextreader/contextreader.github.io
Questions: contextreader@gmail.com

---

## Single purpose

Context Reader has one purpose: to explain a word the user selects on a web page, using
the surrounding sentence as context, in the user's chosen language.

---

## Permission justifications

**`storage`**
Stores the user's settings on their own device: their chosen language, their Gemini API
key, which model to use, any prompt edits, and words they explicitly saved. Nothing is
transmitted anywhere. No remote storage is used — `chrome.storage.sync` is deliberately
avoided so the API key is never replicated off the device.

**`activeTab`**
Reads the text the user has selected on the page they are currently viewing, and the
sentence around it, so the word can be explained in context. Granted only when the user
invokes the extension. No page content is read otherwise, stored, or transmitted anywhere
except in the lookup request described below.

**Host permission — `https://generativelanguage.googleapis.com/*`**
The extension's single function is answering lookups with Google's Gemini API. The
selected word and its surrounding sentence are sent to this host, authenticated with the
user's own API key, and the explanation is returned. This is the only host permission the
extension holds, and lookups are sent nowhere else.

**Content script on `<all_urls>`**
The extension must work on whatever page the user is reading — a news article, a PDF, a
university course page — so the script that detects a selection and renders the
explanation has to be able to run anywhere. It performs no action until the user selects
text and clicks.

---

## Data usage disclosures

| Question | Answer |
|---|---|
| Personally identifiable information | No |
| Health information | No |
| Financial information | No |
| Authentication information | No — the user's own API key is stored locally and never transmitted to the developer |
| Personal communications | No |
| Location | No |
| Web history | No |
| User activity | No |
| Website content | **Yes** — the selected word and its surrounding sentence are sent to the Google Gemini API to generate the explanation. This is the extension's sole function. Nothing is sent to the developer, and nothing is retained by the extension beyond the user's own device. |

**Certifications**
- Not being sold to third parties ✅
- Not being used or transferred for purposes unrelated to the item's single purpose ✅
- Not being used or transferred to determine creditworthiness or for lending purposes ✅

---

## Additional fields

| Field | Value |
|---|---|
| Official URL | `contextreader.github.io` — the dropdown lists sites verified in Search Console under the **same Google account as the developer account**. If it isn't there, "Add a new site" and verify; if Search Console is on another account, leave it None and rely on Homepage URL. |
| Homepage URL | `https://contextreader.github.io` |
| Support URL | `https://github.com/contextreader/contextreader.github.io/issues` — public and trackable, unlike an inbox |
| Mature content | Off |

**Search Console verification files** in `docs/`, one per owner — the site can have several,
and each account collects its own search data:

| File | Account |
|---|---|
| `googlecce9067cb0fa1b40.html` | the first account |
| `google804277d37a9b5b86new.html` | the second, added 18 Sep so Official URL could offer the site |
| `google804277d37a9b5b86.html` | the same token without the `new` suffix, kept until it is clear which name Google issued |

Google checks only the filename it issued to that account and ignores the rest, so a spare
costs nothing. Each file's single line must match its own filename.

## Support contact

`contextreader@gmail.com`

Also used as the organisation contact on GitHub. The listing's "Support" tab should point
here; the privacy policy names the same address so the two agree.

---

## Assets still required

- [x] Screenshots, 1280×800 — the store takes five. Upload in this order, all from `store/`:
  1. `2x-a-english.png` — the lead. The bubble over an article, English: "significant" in
     "the difference was not significant", answered "statistically meaningful".
  2. `2x-b-spanish.png` — the same word and sentence, Spanish.
  3. `2x-c-arabic.png` — Arabic. The bubble is genuinely mirrored, not just right-aligned:
     answer to the right, CONTEXT pill on the right of its line, action row reversed. The one
     image that argues this is not an English-only product.
  4. `2x-e-hindi-simple.png` — the Simple panel open in Hindi, full-width card.
  5. `screenshot-language.png` — Settings, the language picker mid-search: English under
     Tuned, Basque, Esperanto, Estonian and Spanish under Community.

  All four bubble shots are real model output, captured through the unpacked extension with a
  real key on a plain article written for the purpose — shot at 2560×1600 and downsampled, so
  the small type and the amber trigger stay crisp.

  Alternates in `store/`: `2x-d-japanese.png` (dense script), `2x-f-spanish-more.png` (the More
  panel in a Latin script), and the earlier 1× Sinhala captures.

- [x] Small promo tile, 440×280 — `store/promo-440x280.png`

`node scripts/store-assets.cjs` re-renders both (needs `PLAYWRIGHT_CORE`, see its header).
- [x] Icon 128×128 — `icon128.png`, rendered from `icon.svg` (96px art, 16px padding)

Suggested screenshots, in order:
1. The bubble over a real article — the core moment
2. Settings, showing the language picker with the tuned / community labels
3. Settings, showing the model picker and the per-model speed table
4. The prompt editor with its version history and diff

---

## Review rejection, 23 Sep 2026 — and what to send back

**Rejected:** 1.0.1, "Inaccurate Description – Non functional", reference *Red Potassium*:
"Api key fill in optional page" could not be reproduced. 1.0.0 stayed live; users were
unaffected.

**Cause (found by running the build in Chromium):** Settings verified a key with a live
`listModels` call and **refused to save it unless that call succeeded** (`options.js`). A
reviewer whose network blocks generativelanguage.googleapis.com, whose key is rate-limited,
or whose project has the Generative Language API switched off would paste a key, see an
error and have nothing saved — a field that looks broken. A key Google actively refuses
returns "API key not valid"; every other failure was indistinguishable from it.

**Fixed in 1.0.2:** when the check cannot run, Settings now offers **Save without checking**
and stores the key, saying it was not verified. A key Google refuses does not get the offer.
Covered by `test/settings-ui.test.js`.

**Testing instructions** (Privacy practices tab → *Testing instructions*, so the reviewer is
not blocked again). Create a throwaway key at aistudio.google.com/apikey, paste it below, and
delete it once the review passes:

```
The extension needs a free Google Gemini API key (no card, no account on our side). To test:
1. Right-click the extension icon > Options (or the welcome page's "Open Settings").
2. Paste this test key into "Gemini API Key" and click Save: <PASTE TEMP KEY>
   It is verified with a models.list call; if your network cannot reach
   generativelanguage.googleapis.com, click "Save without checking" and continue.
3. Open any article, select a word (for example "significant" in a medical article) and click
   the small amber mark that appears. The bubble explains that word in the chosen language.
4. More / General / Simple in the bubble give further explanations. EN answers once in English.
Settings also lets you change the language (110), the model, and the prompts.
```

**Then:** upload `dist/contextreader-chrome-1.0.2.zip` and submit. Appeal only if it is
rejected again with the same reference, quoting this section.

