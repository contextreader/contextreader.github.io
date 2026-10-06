# VIDEO-SCRIPT — the store film and the X cut

Written 2026-09-27. Two videos from one recording session:

| Where | Shape | Length | How it is seen |
|---|---|---|---|
| **Chrome Web Store** | 16:9, 1920×1080 | 45 to 60 seconds | A YouTube link on the listing. Sound allowed, most people still watch muted |
| **X** | 9:16, 1080×1920 | 25 to 32 seconds | In the feed, muted, on a phone |

Record once, in 16:9. The X cut is made from the same take afterwards.

The existing files in `store/` were built from the website's demo. This one is different:
it is the **real extension, on a real page**, recorded by Ian. That is what a store video has
to be, and it is more convincing than any animation.

---

## Before you record: the machine

**The browser profile.** Make a clean one, do not use your daily profile.
Chrome menu → your avatar → **Add** → name it "Recording", no sync, no account.

1. **Install Context Reader in it** from the store, and paste your key in Settings.
2. **Pin it**: puzzle icon in the toolbar, pin next to Context Reader. Nothing else pinned.
3. **Hide the bookmarks bar**: `⌘⇧B` (Mac) or `Ctrl+Shift+B`. Check it is gone.
4. **One window, one tab.** No second tab, no tab groups.
5. **Zoom at 100%**: `⌘0`. Check the zoom indicator is not in the address bar.
6. **Light mode**, so the bubble reads the way the screenshots do.
7. Set the window to a clean size. In DevTools console (then close DevTools):
   `window.resizeTo(1440, 900)` — or just make it roughly 3/4 of the screen and keep it still.

**The system.**

- **Do Not Disturb on.** One notification banner ruins a take.
- **Hide the dock**: System Settings → Desktop & Dock → Automatically hide.
- **Hide desktop icons**: `defaults write com.apple.finder CreateDesktop false; killall Finder`
  (put it back afterwards with `true`).
- **Menu bar**: either hide it (Desktop & Dock → Automatically hide the menu bar) or keep the
  recording to the browser window only.
- **Close everything else**, especially messaging apps.
- Check the address bar has no personal suggestions: a fresh profile has none.

**Recording.** `⌘⇧5` → **Record Selected Portion** → drag around the browser window only,
so the desktop never appears. Options → Show mouse clicks: **on**. Save to Desktop.
Or QuickTime → File → New Screen Recording. Either gives 60fps on a Mac.

**The page you record on.** Use a real article, not a mock-up. Good choices:

- a PubMed abstract, or a paper on a university page — matches the audience;
- a news article with a specialist word;
- anything with the word **significant**, **culture**, **acute**, **positive** or **execute**
  in a sentence where the everyday meaning is wrong.

Avoid anything with your name, your email, a paywall banner, or a cookie pop-up. Dismiss the
cookie banner before you start recording.

**Two rules that do not bend.** Only real answers from the real extension appear on screen,
and no Sinhala as the demo language. Pick Spanish, Hindi, Arabic or Portuguese.

---

## The store film — screenplay, 55 seconds

Sound: none needed. Captions carry it. If you do record voice, read the caption lines, slower
than feels natural, and leave the captions in anyway.

**SHOT 1 — the problem (0:00–0:07)**

> *Screen:* the article, scrolled so one paragraph fills the middle. The cursor moves to the
> word **significant** and stops.
> *Caption:* **You know this word.**
> *Then:* **In a paper it means something else.**

Do nothing for a beat. Let a viewer read the sentence.

**SHOT 2 — the selection (0:07–0:12)**

> *Screen:* double-click the word. The small amber mark appears beside it. Cursor moves to it.
> *Caption:* **Select it. One click.**

**SHOT 3 — the answer (0:12–0:22)**

> *Screen:* click the mark. The bubble opens and the answer arrives. Hold still while it types
> out. Do not move the mouse.
> *Caption:* **The meaning for this sentence, not every meaning.**

This is the shot the whole film exists for. Let it breathe for a full three seconds after the
answer lands.

**SHOT 4 — in your language (0:22–0:32)**

> *Screen:* the same lookup with a different language already chosen, or open Settings and pick
> one, then repeat the lookup on the same word.
> *Caption:* **In your language. 110 of them.**

If switching on camera is fiddly, record two takes and cut between them. Do not fake it in an
editor.

**SHOT 5 — simpler (0:32–0:40)**

> *Screen:* click **Simple** in the bubble. The plain-words version appears.
> *Caption:* **Still too technical? Ask for simpler.**

**SHOT 6 — honesty (0:40–0:47)**

> *Screen:* Settings, the language picker open with the search box, showing **Tuned** and
> **Community** headings.
> *Caption:* **Two languages are tuned. The rest say so.**

**SHOT 7 — the close (0:47–0:55)**

> *Screen:* back on the article, select a second word, answer appears, then fade to the end card.
> *End card:* the logo, then
> **Context Reader**
> **Free. Open source. No server.**
> **The extension collects nothing.**
> **contextreader.github.io**

---

## The X cut — 28 seconds, vertical

Same footage, tighter, and it must work at arm's length on a phone.

| Time | From | Caption |
|---|---|---|
| 0:00–0:05 | Shot 1, cropped to the paragraph | **A word you know. Used differently.** |
| 0:05–0:12 | Shots 2 and 3, the click and the answer | **It reads the sentence, not just the word.** |
| 0:12–0:18 | Shot 4 | **In your language. 110 of them.** |
| 0:18–0:23 | Shot 5 | **Or ask for it simpler.** |
| 0:23–0:28 | End card | **Free. Open source. No server.** |

Crop to 9:16 around the bubble, not the whole window: on a phone the browser frame is wasted
space. Keep the important part between the top 10% and the bottom 15%, which is where X puts
the avatar and the buttons.

---

## Captions: the exact lines

Keep them under seven words. These are the ones, in order, for both cuts:

```
You know this word.
In a paper it means something else.
Select it. One click.
The meaning for this sentence, not every meaning.
In your language. 110 of them.
Still too technical? Ask for simpler.
Two languages are tuned. The rest say so.
Free. Open source. No server.
The extension collects nothing.
```

Style: Inter, bold, white on a dark strip or ink on the page's own grey. No drop shadows, no
animation beyond a simple fade. The amber is used once, on the lit word, and nowhere else.

---

## After the recording

1. **Trim** the dead air at both ends, and any moment where the cursor wanders.
2. **Burn the captions in.** X shows no caption file by default, and store viewers are muted.
3. **Export** twice: 1920×1080 H.264 for YouTube, 1080×1920 for X. 30fps is enough.
4. **Upload the 16:9 to YouTube**, public or unlisted, titled *Context Reader: the word you're
   stuck on, in your language*. The Chrome Web Store takes a YouTube link, not a file.
5. **Paste the link** in the Developer Dashboard under Store listing → Video, and save.
6. Post the vertical one as post 1 of the X thread in `LAUNCH.md`.

**Firefox note.** AMO has no video field, so the same YouTube link goes in the add-on's
description instead.

---

## What makes this film work, and what would kill it

**Works:** one idea, said once. A real page. A real answer, arriving at its real speed. Nothing
sped up, because two seconds is already fast.

**Kills it:** a stock-photo intro, music that fights the captions, a cursor that never stops
moving, a fake "typing" animation, any answer that did not come from the extension, and
anything that dresses up the waiting. If a lookup takes three seconds, show three seconds.

---

# The setup tutorial (added 1 Oct)

A separate, more important film than the launch one. The dashboard says 3 of the first 18
installs were removed, and the only hard step in the product is getting an API key. A real
screen recording of that step is worth more than any animation, because people need to see
**Google's actual screens**, not a drawing of them.

**Length:** 75 to 95 seconds. **Shape:** 16:9, 1280×800 window.

## Before you record: protect yourself

1. **Make a throwaway key for the film, and delete it afterwards.** Create a new key at
   aistudio.google.com/apikey, record with it, then delete that key in AI Studio the moment
   you finish. Then the key visible on screen is dead, and nothing has to be blurred.
2. **Account name and avatar.** AI Studio shows your Google account at the top right. Either
   record in a Chrome profile signed into a throwaway Google account, or set the capture
   rectangle to exclude the top-right corner. Decide before you start, not in editing.
3. Everything from the browser setup section above still applies: separate profile, bookmarks
   bar hidden with `⌘⇧B`, one tab, Do Not Disturb on, dock and desktop icons hidden.
4. **Move slowly.** Pause about a second before each click. What feels painfully slow while
   recording reads as calm on playback.

## The shot list

| Time | What you do | Caption |
|---|---|---|
| 0:00 | Static title over the extension's welcome page | **Setting up takes about a minute** |
| 0:05 | Open `aistudio.google.com/apikey` | **1. Get a free key from Google** |
| 0:12 | Click **Create API key**. Wait for it. Click **Copy** | **No card. No account with us.** |
| 0:28 | Right-click the extension icon → **Options** | **2. Open Settings** |
| 0:36 | Paste into the key field, click **Save**, wait for *Saved and verified* | **3. Paste it and save** |
| 0:48 | Puzzle icon in the toolbar → pin Context Reader | **4. Pin it, so the language switch is one click away** |
| 0:58 | Open a real article. Select a word. The amber mark appears | **5. Select any word** |
| 1:06 | Click the mark. The answer arrives. **Hold still** | **The meaning for that sentence, in your language** |
| 1:18 | Click **Simple** once | **Too technical? Ask for it simpler** |
| 1:26 | End card | **That is the whole setup. Free, no account, nothing stored.** |

Do not cut the waiting. If the key takes four seconds to create, show four seconds. A tutorial
that hides the waiting makes people think something is wrong when it happens to them.

## Where it goes

| Place | How |
|---|---|
| **The site**, a new `/setup` page | The MP4 hosted on our own domain, in a `<video controls>` tag. No YouTube embed: the site promises no third-party requests and `test/copy.test.js` enforces it |
| **The welcome page**, which opens on install | A link to `/setup`, right at the top. An extension page cannot embed YouTube either, because its own content-security policy forbids it |
| **The support page** | The same link, under "Getting started" |
| **The Chrome Web Store listing** | A YouTube copy. The store accepts a link only, and that is Google's page, not ours |

So: one recording, two homes. The self-hosted copy keeps every promise the site makes; the
YouTube copy exists because the store will not take a file.

## What I do with the recording

Send me the raw file and I will trim the dead ends, burn in the captions above, add a poster
frame, export it web-optimised (faststart, about 5 to 8 MB at 1280×720), build the `/setup`
page around it with a written version of the same steps underneath for people who do not play
videos, and wire the links from the welcome and support pages.

**The written steps matter as much as the film.** Search engines and language models read text,
not video, and "how do I get a Gemini API key" is a real search.
