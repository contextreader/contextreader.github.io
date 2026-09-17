# Privacy Policy — Context Reader

Last updated: 14 September 2026

Context Reader has no server. There is no account, no sign-in, and no backend belonging to
this project. Everything below can be checked against the source in this repository.

## What the extension collects

**Nothing.** No analytics, no telemetry, no usage statistics, no error or crash reporting.
No identifier is generated for you, and nothing is sent to the developer — there is nowhere
for it to be sent to.

## What leaves your device, and where it goes

### To Google, when you look up a word

The word you selected and the sentence around it are sent to the Google Gemini API using
**your own API key**. This is the entire function of the extension.

Google is the data controller for that request. Its handling is governed by the terms you
accepted when you created the key:

- [Gemini API Additional Terms of Service](https://ai.google.dev/gemini-api/terms)
- [Google Privacy Policy](https://policies.google.com/privacy)

Note that the free tier of the Gemini API and the paid tier differ in whether your prompts
may be used to improve Google's models. Which applies to you depends on your own key, not
on this extension. If that matters to you, read the terms above before choosing a plan.

### To Google Fonts — only for Chinese, Japanese and Korean

Every typeface the bubble uses ships **inside the extension** as of 17 September 2026:
Inter for the interface, in Latin, Cyrillic and Greek, and a Noto face for each of the 21
other scripts. Nothing is fetched for them, ever, on any site.

The exception is Chinese, Japanese and Korean. Those families are megabytes each, so they
are still requested from `fonts.googleapis.com` and `fonts.gstatic.com` — **only when you
open a bubble** on a page, and **with no referrer**, so Google's font servers see your IP
address and that a font was requested, but not which page or site you were on. **No word
you look up and no page content is included.** Every other language fetches nothing.

Before 15 September 2026 this was worse: fonts were requested on every page load, with the
page's origin attached. That was fixed as soon as it was measured, and bundling removed the
rest.

### Nowhere else

`manifest.json` grants exactly one host permission:
`https://generativelanguage.googleapis.com/*`. Chrome enforces that list. The extension
cannot contact any other server for data, and there is no code in it that tries.

## What is stored on your device

All of this stays in your browser's local extension storage. None of it is transmitted.

| Stored | What it is |
|---|---|
| `geminiApiKey` *or* `geminiApiKeyEnc` | Your API key — plain, or encrypted if you set a passphrase |
| `targetLanguage` | The language you chose |
| `modelPref`, `modelListCache`, `modelCooldowns` | Which Gemini model to use, and which are rate-limited |
| `promptOverrides`, `promptHistory` | Prompts you edited, and their version history |
| `savedWords` | Words you explicitly saved |
| `localLookupCount` | A counter shown in the popup |
| `latencyLog`, `latencyDaily` | Response times per model, for the speed table in Settings |

The latency records deliberately do **not** include the words you looked up. They hold a
model name, a timestamp and a duration.

Uninstalling the extension deletes all of it. You can also clear the key at any time with
**Revoke** in Settings.

## Your API key

- Stored with `chrome.storage.local`, never `chrome.storage.sync` — `sync` would replicate
  it to Google's servers.
- Read only inside the extension's service worker. It is never handed to a content script,
  so no web page can reach it.
- Shown masked in Settings (`AIza…3f2`) after saving, never in full.
- Never written to logs.
- Optionally encrypted at rest with AES-GCM, using a key derived from a passphrase via
  PBKDF2. The passphrase is never stored, so there is no recovery — forgetting it means
  entering the API key again.

Being straight about the limit of this: hardening protects against page scripts and
accidental exposure. Only the passphrase option protects against someone who can read your
browser profile off the disk. An extension cannot hide a key from software already running
as you, and we will not claim otherwise.

## Children

Not directed at children under 13 and collects nothing from anyone.

## Changes

Material changes will be noted in the repository history and the date above updated. The
history of this file is public.

## Contact

Email **contextreader@gmail.com**, or open an issue on the
[project's GitHub repository](https://github.com/contextreader/contextreader.github.io/issues).

Questions about how Google handles the lookups themselves go to Google — this project
never receives them.
