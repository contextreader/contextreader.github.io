# Contributing

The most useful thing you can contribute is **your language**.

## Add examples for a language

Eleven of the thirteen languages work but are untuned — they have no hand-checked worked
examples, so the model is more likely to give the dictionary sense of a word rather than
the one the sentence calls for.

Fixing that for one language is a single small edit to
[`lib/languages.js`](lib/languages.js).

An example is a contrastive pair: a word, a domain, the right answer, and the plausible
wrong answer a dictionary would give.

```js
ta: {
    name: 'Tamil', nativeName: 'தமிழ்',
    font: "'Noto Sans Tamil', sans-serif", family: 'Noto+Sans+Tamil:wght@400;600;800',
    script: /[஀-௿]/, rtl: false, tuned: true,
    examples: [
        { term: 'bank', domain: 'finance', right: '…', wrong: '…' },
        // three or four more
    ],
},
```

Then set `tuned: true` and open a pull request.

**Please do not machine-translate the examples.** The entire value of a pair is that a
speaker judged the wrong answer to be wrong — that judgement is what the model is being
shown. A translated pair looks the same in the diff and teaches nothing. If you are not
fluent, opening an issue asking for a speaker is a genuinely useful contribution too.

### Choosing good examples

The useful ones are words whose everyday sense and domain sense differ sharply:

- `bank` — finance vs. a river
- `execute` — programming vs. capital punishment
- `culture` — microbiology vs. the arts
- `novel` — science ("new") vs. fiction

Four or five is plenty. They are prepended to every lookup, so more is not better.

## Add a whole language

Same file, same shape. You will also need:

- **`font` / `family`** — a Google Fonts family covering the script, or `'inherit'` and
  `null` if Inter already does (Latin and Cyrillic).
- **`script`** — a regex matching the writing system. It decides whether the language's
  font applies to a word you highlighted, so getting the range right matters.
- **`rtl`** — `true` for right-to-left. The bubble's direction follows it; no code change
  needed.

Start untuned (`tuned: false`, `examples: []`) if you cannot supply examples. That is
honest and the interface labels it.

## Running it

```bash
npm test        # 358 assertions, no dependencies
npm run package # build the shipped zip
```

Load unpacked from `chrome://extensions` with Developer mode on.

**The tests render nothing.** They check logic against a stubbed `chrome` and a small DOM
shim. Anything visual has to be looked at in a browser.

If you touch `content.js`, take a selector-set baseline before and after — all of its CSS
lives in one template literal, so `node --check` will happily pass a badly broken
stylesheet:

```bash
grep -o 'sr-[a-zA-Z0-9_-]*' content.js | sort -u > /tmp/before.txt
# make your change
grep -o 'sr-[a-zA-Z0-9_-]*' content.js | sort -u | diff /tmp/before.txt -
```

Never rename an `sr-*` class. The prompts in `background.js` name them, Gemini emits them
as literal HTML, and a saved prompt override is a third place a stale name can hide.

## What not to add

No analytics, no telemetry, no remote server, no second host permission. The privacy claim
is the product; a pull request that weakens it will be declined however useful the feature.
