# VIDEO — the launch clip for X

Brief for the session making it. Written 2026-09-24. Read `CLAUDE.md` (the four commitments)
and the **Hard rules** in `LANDING.md` before the first frame.

---

## What it is for

One clip, posted on X with the launch thread in `LAUNCH.md`. It has to make a stranger
understand the product **in the first five seconds**, because that is how long they watch.

**The idea to land, in one line:** a dictionary gives you every meaning of a word; this gives
you the one your sentence is using, in your language.

---

## Hard constraints

1. **Nothing may be faked.** Every answer on screen must have been produced by the real
   extension. Two honest sources exist:
   - `docs/index.html`'s hero demo — its answers are real captures (the `modes:start` block),
     which is why it can be filmed directly;
   - the real extension, which needs Ian's own Gemini key. Ask him; do not invent output.
   No mocked-up bubble, no typed-in "example" answer, no invented speed figure.
2. **No Sinhala-first framing and no country of origin.** Sinhala may appear only as one
   language among others, never as the demo language, never first. The site demo no longer
   offers it at all.
3. **No promises the product does not keep.** It is free because there is no server; it needs
   the reader's own free API key; only English and Sinhala have checked examples. If the clip
   mentions languages, "110 languages" is the true number.
4. **Ian reviews before anything is posted.** Export the file, show him, then he posts.

---

## Shape — about 30 seconds, no voice-over

Captions carry it; most people watch muted. Keep each caption under seven words.

| Time | On screen | Caption |
|---|---|---|
| 0–4s | A paragraph of real text, one word selected, the amber mark appearing | *A word you know. Used differently.* |
| 4–10s | The bubble opening with the real answer for that sentence | *It reads the sentence, not just the word.* |
| 10–16s | The same word, same sentence, answered in another language (Spanish, Hindi, Arabic — the captured demo languages) | *In your language. 110 of them.* |
| 16–22s | **Simple** pressed, the plainest wording appearing | *Still too technical? Ask for simpler.* |
| 22–27s | The Settings language picker, search typed, a language chosen | *Two are tuned. The rest are honest about it.* |
| 27–32s | The mark on a fresh page, then the wordmark and the store line | *Free. Open source. No server, no tracking.* |

End card: **Context Reader — contextreader.github.io** on the site's ground colour, the logo,
and "Chrome · Brave · Edge" (add Firefox the day Mozilla approves it).

---

## How to film it

**Easiest honest route: record the site's own hero demo.** It plays on scroll, with real
captured answers, already designed. A headless Chromium can scroll it and record:
`playwright-core` is at `/Users/ianxavier/Desktop/interactive app/node_modules/playwright-core`
and a context takes `recordVideo: { dir, size }`; scroll in small steps with short waits so
the scene animation keeps up, then convert with ffmpeg if it is installed.

**Better if Ian supplies a key: film the real extension.** Load the unpacked extension in
headed Chromium (it does not load in Chrome-the-channel under automation — use the bundled
chromium), open a real article, select a word, and record the bubble answering for real.
`test/` has the machinery for loading it; `store/` has earlier captures for reference.

**Format for X:** MP4, H.264, square (1080×1080) or 16:9 (1280×720). Square wins more of the
feed on phones. Under 2 minutes 20, well under 512 MB, 30fps. Burn the captions in — X does
not show a caption file by default. No music.

---

## Assets that already exist

| File | What it is |
|---|---|
| `store/2x-a-english.png` … `2x-f-spanish-more.png` | Real captures, 1280×800, the extension answering on an article |
| `store/screenshot-language.png` | The language picker, Tuned vs Community |
| `store/social-1280x640.png` | The social card, good as an end frame |
| `docs/blog/img/*.webp` | The same captures, cropped |
| `docs/icon.svg`, `docs/icon128.png` | The mark |

Type is Inter (in `docs/fonts/`); the accent is `#a84e08` on light, `#fbbf24` for fills; the
ground is `#eef0f3`. The lit-word highlight is the one bold element — use it once.

---

## When it is done

Save as `store/launch-x-<yyyy-mm-dd>.mp4`, tell Ian, and post the first frame as a still so he
can check it reads at a glance. The thread text is in `LAUNCH.md` §4 — the clip goes on post 1.
