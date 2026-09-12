# Tests

```
npm test
```

No dependencies and no test framework — plain `node`, so it runs on a clean
checkout.

## Why the extraction step

`background.js` is a service worker. It has no module boundaries and it touches
`chrome.*` at load time, so it cannot simply be imported. `extract.mjs` copies
the regions under test into ES modules in `test/.generated/` (gitignored,
rebuilt on every run), and the tests import those against a stubbed `chrome`.

Slices are located by the comment banners in the source. Moving a block is
fine; renaming a banner makes `extract.mjs` throw rather than silently skip a
test — which is the failure mode worth avoiding.

`test/.generated/apikey.mjs` is the one slice that is altered: PBKDF2 drops from
600,000 iterations to 1,000. Production wants the real number; a test suite
cannot afford it dozens of times over. The algorithm is unchanged.

## The DOM shim

`shim.cjs` is ~80 lines of fake DOM — enough to actually execute `options.js`
rather than assert about its source text. It harvests the real element ids out
of `options.html`, so a test cannot pass against an element that no longer
exists in the markup.

It is not a browser. It does not lay anything out, compute a style, or render.
Everything visual still has to be checked by loading the extension — see
`HANDOFF.md`.

## What is covered

| File | Covers |
|---|---|
| `model.test.mjs` | model resolution from storage, the thinkingConfig gate |
| `request.test.mjs` | the request round trip, thinkingConfig retry, ListModels parsing |
| `fallback.test.mjs` | chain construction, quota detection, cooldowns, response meta |
| `latency.test.mjs` | daily rollup, the 30-day prune boundary, storage size |
| `prompts.test.mjs` | override semantics, validation, history cap, restore |
| `prompt-equivalence.test.mjs` | the rendered default is byte-identical to the original prompt |
| `diff.test.js` | the line diff: line numbers, collapse, unicode, adversarial input |
| `apikey.test.mjs` | encryption round trip, lock/unlock, refusal paths |
| `settings-ui.test.js` | model dropdown, latency table, prompt history rendering |
| `apikey-ui.test.js` | the key card state machine across all four states |
| `bubble-note.test.js` | the fallback note, escaping, and the `saveWord()` placement hazard |
| `integration.test.mjs` | loads the whole `background.js` and drives the real lookup path |

`integration.test.mjs` is the one that covers the seams. Every other file slices
a function out and tests it in isolation, which can leave a feature where each
half works and nothing connects them — the fallback note was exactly that risk:
the renderer was tested with a hand-made `_m` and nothing proved the pipeline
ever produced one. It loads the whole service worker against a stubbed
`chrome`/`fetch` and asserts the full path, including that the editable prompt
reaches the wire and that a locked key stops the request.

Note that `chrome.storage` accepts both a callback and a promise. `recordLatency`
uses the callback form, so a promise-only stub silently skips it and the test
passes for the wrong reason. The shim in `integration.test.mjs` supports both.

`prompt-equivalence` and the placement assertion in `bubble-note` are the two
worth keeping if anything is ever trimmed. The first catches silent prompt
drift, which changes answer quality. The second catches a change to
`.sr-section:nth-of-type(2)`, which makes `saveWord()` save the wrong text
without any visible error.
