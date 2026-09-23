# SEARCH — what people look for, and which pages answer it

Written 2026-09-21 from two sources: a Google Keyword Planner export (1,154 terms, Sep 2025 –
Aug 2026) and live searches run the same day. Read `LANDING.md` for the site's rules first —
this file decides *what* to write, that one decides *how*.

---

## What the Keyword Planner export actually says

**The head terms are unwinnable, and they are the wrong intent anyway.** "translate english to
hindi", "google translate", "deepl" — 5 million a month each. Those are people who want a
sentence translated *now*, and Google Translate owns that intent completely. Ignore them.

**The export has zero "meaning" searches.** Not low — none. Keyword Planner returns terms near
the seeds it was given, and the seeds were about translation. The product's own intent — *what
does this word mean in this sentence* — is not in this file. **Pull again** with the seeds
listed at the bottom before trusting any volume below as "our market".

What the file does show, usefully:

| Cluster | Terms | Searches/mo | What it is |
|---|---|---|---|
| Reverso Context | 46 | 582,000 | The direct competitor. Nearly all brand navigation — but its long tail is comparison intent: "reverso context for chrome", "reverso context download", "reverso translate and learn". |
| Translate in context | 5 | ~20,000 | "translate in context", "context translation", "english in context", 5,000 each, **low competition**. Our exact positioning, in the searcher's words. |
| Translate extension | 11 | ~150,000 | "google translate extension" 50k, "translate extension" 50k, "translate extension chrome" 5k. Tool intent, dominated by Google's own extension — winnable only as a comparison. |
| "english to X words" | 12 | ~865,000 | Single-word lookups in one language: Tagalog, Hindi, Kannada, Tamil, Telugu, Marathi at 50k–500k. Closest match in the file to what the product does. |
| "ai translator" | 1 | 500,000 | Medium competition, far too broad. Skip. |

**By language**, the volume in this file is overwhelmingly South Asian and Filipino: Hindi,
Spanish, Tamil, Marathi, Urdu, Tagalog, Telugu, Arabic, Malayalam, Bengali, Kannada. That shapes
which language pages are worth writing — not which language leads the site. The site stays
language-neutral; see LANDING.md.

---

## What the live searches showed

- **"chrome extension explain word in context"** is already contested: Explain Selected, Explain
  AI, Word Context and QuickDef rank, plus listicles on Guiding Tech and MakeUseOf, and QuickDef's
  own "best Chrome extensions for word definitions" post. The home page will not outrank these.
  **The way in is being named in those roundups**, and publishing an honest comparison of our own.
  LLMs recommend what the listicles name.
- **"how to know which meaning of a word is used in a sentence"** is held by teaching pages
  (Study.com, Albert), not tools. A useful explainer that answers first and mentions the tool
  second can compete. A Quora question asks outright "is there a tool that can assist?" —
  answer it there.
- **Reading medical English as a non-native speaker** returns academic papers and no practical
  guide. **This is the clearest gap on the list**, and its readers are the core users.

---

## Google autocomplete, 22 Sep — what people actually type

Pulled from Google's suggest endpoint for 22 seed phrases (a suggestion only appears when
enough people type it; no volumes). Article topics it supports, strongest first:

1. **Why Google Translate gets words wrong** — *why is google translate wrong / so inaccurate /
   always wrong / how often is google translate wrong*. Six variants of one frustration, and the
   answer is the product: a translator picks a sense without reading the sentence.
2. **How to read a medical paper** — *how to read a medical paper / medical journal article /
   medical journals for free*. Confirms page 3 below; add the second-language angle.
3. **How to find a word's meaning from context** — *how to find word meaning in context /
   using context clues / word meaning in context examples*. Explainer first, tool last.
4. **Best dictionary extensions for Chrome** — *best dictionary extension for chrome / chrome
   extension for word meaning / ai dictionary chrome extension*. Honest roundup that names
   itself as ours; roundups are what LLMs cite.
5. **Medical terms explained** — *what do these medical terms mean / how to read medical terms /
   how to understand medical terminology*. Pairs with 2.
6. **Reverso alternatives** — *reverso alternatives / reverso context alternative*: already
   `/vs-reverso`; link it from the others.

Skip: "context clues anchor chart 3rd grade", worksheets — primary-school teachers, not our
reader. Raw suggestions: re-pull with
`https://suggestqueries.google.com/complete/search?client=firefox&hl=en&q=<phrase>`.

Other sources, in order of value once traffic exists: Search Console → Queries (weekly);
Bing Webmaster Tools → Keyword Research (free volumes, site already verified); Reddit and
Quora questions in r/languagelearning, r/EnglishLearning, r/medicalschool.

---

## The pages, in the order worth writing them

Each page answers one question, in the searcher's words, in its first two sentences — search
engines and LLMs both lift the first clear answer they find.

1. **Home: tune for "translate in context".** Title, description and H1 should use the phrase
   people actually type — "translate in context", "word meaning in context" — naturally, once.
   Cheapest change on the list, and it is the one query cluster that is ours by definition.
2. **"Context Reader vs Reverso Context".** An honest comparison: Reverso shows many example
   sentences from a corpus; Context Reader reads *your* sentence and answers for it. Say where
   Reverso is better (idiom examples, bilingual concordance). Captures "reverso alternative",
   "reverso for chrome", "reverso context download".
3. **"How to read a medical paper when English isn't your first language."** The clearest gap.
   Practical first — strategies, what trips people up — then where the tool fits.
4. **"How to tell which meaning of a word a sentence uses."** Explainer, tool second.
5. **"Google Translate extension vs a context-aware lookup."** Why translating a sentence and
   explaining a word are different jobs. Tool intent at 150k/month, won only by comparison.
6. **Language pages — three or four, never a hundred.** Only where a page can say something true
   and specific: a real captured answer in that language, what the tuned/community label means
   for it, and the language-pair query people type ("english to tamil words"). Candidates by
   volume: Hindi, Tamil, Tagalog, Spanish. **Generating 110 of these from a template is a
   doorway-page pattern; Google demotes the whole site for it, and it breaks the site's promise
   to say only true things.**

---

## Off the site — where authority actually comes from

A site a week old ranks for nothing on its own merits. Links and mentions move it:

- Pitch the roundups for their next update: Guiding Tech, MakeUseOf, QuickDef's list.
- Answer the Quora thread and relevant Reddit threads (r/languagelearning, r/medicalschool,
  r/GradSchool, ESL forums) — genuinely, with the tool as one line, not the post.
- Product Hunt and Hacker News at launch.
- The Chrome Web Store listing's first two lines: use "meaning", "definition", "translate" and
  "in context" naturally there — the store is a search engine too.
- A custom domain before links accumulate (see the domain note in the session log:
  `contextreader.org` was free on 19 Sep).

---

## LLM visibility (ChatGPT, Gemini, Perplexity, Copilot)

None of them publish query logs. So:

- **Probe monthly.** Ask each the questions a reader would: "is there a Chrome extension that
  explains a word using the sentence it's in?", "free alternative to Reverso Context", "how can I
  read medical papers in English". Record what each recommends and **which sources it cites** —
  the cited sources are where a mention matters.
- **Bing is the lever for ChatGPT search and Copilot.** The site is verified there already.
- Keep `docs/llms.txt` and the FAQ structured data saying exactly what the pages say.

---

## The loop

Collect questions → pick one → write or revise the page → wait 2–4 weeks → check Search Console
and Bing for that query, and re-ask the LLMs → keep or rewrite.

Track it in one sheet: *question · source · page · published · Google position · Bing position ·
ChatGPT / Gemini / Perplexity mention (y/n)*.

---

## Next Keyword Planner pull

Seed it with the product's own intent, not translation's:

`word meaning in context` · `what does this word mean` · `meaning of word in sentence` ·
`context clues` · `explain word` · `definition extension chrome` · `dictionary extension` ·
`reverso context alternative` · `read research papers english` · `medical terms explained` ·
`english for non native speakers` · `vocabulary in context`

Set location to the countries you want first, and export again. That file will say far more
about this product than the current one does.
