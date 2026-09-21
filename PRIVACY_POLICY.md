# Privacy Policy — Context Reader

Last updated: 21 September 2026

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

## About this website

The extension and the website are different things, and only one of them counts anything.

**The extension collects nothing.** No analytics, no telemetry, no account, no identifiers,
no crash reports. That does not change.

**The website counts visits and a few clicks, with two services, and records pages only with your yes.** Cloudflare Web Analytics
counts visits. Umami counts visits and a few clicks: the install and "Get a Gemini key"
buttons (with which browser the page detected), "Copy for LLM" and "View as Markdown", and
the language chosen in the home page's demo, and your answer to the Clarity question below.
Umami's script comes from `cloud.umami.is` and reports to `gateway.umami.is`.

Neither service sets a cookie or stores anything in your browser, and neither follows you
between sites. Between them they record the page, the referrer, the browser, operating system
and device type, and a coarse location (the country) — so we can tell whether anyone is
reading and what leads to an install.

**Microsoft Clarity, only if you allow it.** After you first scroll, the site asks once
whether it may use Microsoft Clarity. If you allow it, Clarity records how the page is used —
scrolling, clicks and mouse movement, replayed to us as a recording and a heatmap — so we can
see where the page loses people. Anything typed into a field is masked and never sent. Clarity
sets its own cookies on the site, and Microsoft sets its `MUID` cookie on `clarity.ms` and
`bing.com`, which Microsoft can recognise across its own sites. We ask Clarity not to use any
of it for advertising. Its scripts come from `www.clarity.ms` and `scripts.clarity.ms` and
report to `clarity.ms`; [Microsoft's privacy statement](https://privacy.microsoft.com/privacystatement)
covers what it does with the data.

If you say no, or never answer, nothing of Clarity loads: no script, no cookie, no request to
Microsoft. A browser that sends Global Privacy Control is never asked. You can change your
answer at any time from the website's privacy page.

Those three are the only things the site loads from anywhere else, and Clarity only with your
yes: no other trackers, no advertising, no embedded video, and the typeface is served from the
site itself.

**The site itself remembers two things,** in your browser's local storage: the language you
pick in the home page's demo, so it is still chosen next time, and your answer to the Clarity
question, so you are asked only once. Neither leaves your device, and clearing the site's data
in your browser removes both.

Nothing about the extension, and nothing you look up, ever reaches the website: a lookup
happens in your browser and never touches this site.

This page is also published at
[contextreader.github.io/privacy](https://contextreader.github.io/privacy). Where the two
differ, this file — which is version-controlled and public — is the one that counts.

## Children

Not directed at children under 13. The extension collects nothing from anyone; the website counts visits as described above.

## Changes

Material changes will be noted in the repository history and the date above updated. The
history of this file is public.

## Contact

Email **contextreader@gmail.com**, or open an issue on the
[project's GitHub repository](https://github.com/contextreader/contextreader.github.io/issues).

Questions about how Google handles the lookups themselves go to Google — this project
never receives them.
