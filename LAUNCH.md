# LAUNCH — the posts, ready to send

Written 2026-09-24, the day after the site's first two blog posts went live. Chrome listing is
live; the Firefox add-on is in review at Mozilla. Everything below is Ian's voice: first
person, short sentences, no hype, and it says he built it in the first line every time.

**Rules that apply everywhere.** Say you made it, before anything else. Never post the same
text twice in two places. Answer every reply for the first two days — the replies are worth
more than the post. Do not argue with criticism; the honest parts of the product survive it.

**Order, over about two weeks.** Hacker News first (a Tuesday–Thursday morning US time), then
Reddit two or three days later, one subreddit at a time, then Product Hunt once there are a
few reviews to point at, then the directories, which need no timing.

---

## 1. Hacker News — Show HN

Submit at https://news.ycombinator.com/submit with the URL `https://contextreader.github.io`.

**Title** (80 chars max, no hype words, "Show HN:" required):

```
Show HN: A browser extension that explains a word using the sentence around it
```

**First comment**, posted by you straight after submitting:

```
I built this because a dictionary answers the wrong question. It gives you every meaning of a word; I needed the one my sentence was using.

Select a word on any page and it sends that word plus the paragraph around it to Google's Gemini, then shows the one meaning that fits, in whatever language you chose. In a lab report, "culture" is a sample grown to find bacteria. In a job review, it's how a company works. A dictionary lists both and leaves the choosing to you.

The design decision everything else follows from: there is no server. The extension calls the Gemini API directly from your browser with your own free API key. That costs you a minute of setup, which I know loses people, but it means there is nothing to pay for monthly, nothing to keep running, and nowhere your reading can accumulate. No account, no analytics, no telemetry in the extension — it holds exactly one host permission and the source is public, so that is checkable rather than promised.

It offers 110 languages, but only English and Sinhala ship examples checked by a speaker; the picker says which is which, because the rest are less reliable on specialist terms. Answers are written by a model, so they can be wrong — there's an EN button that shows the same answer in English, which is the fastest way to catch one.

Chrome, Brave and Edge today; the Firefox add-on is in review at Mozilla. MIT licensed.

Source: https://github.com/contextreader/contextreader.github.io
Why translating a single word usually fails: https://contextreader.github.io/blog/why-google-translate-gets-words-wrong

Happy to answer anything, including what it does badly.
```

---

## 2. Reddit

Check each subreddit's rules first; several need a flair, and a few ban links from accounts
with no history. Post in one subreddit per day, not all at once, and use a different text in
each — these are three different posts, not one text pasted three times.

### r/languagelearning

**Title:** `I built a free extension that explains a word using the sentence it's in, not every meaning it has`

```
I read a lot in English, and my problem was never the words I had never seen. Those you look up once. It was the words I already knew, used to mean something else — "positive" in a lab result, "execute" in a contract, "significant" in a study. You read the sentence, it makes sense, and it is not the sense the writer meant.

So I made Context Reader. You select a word on any page, and it sends the paragraph around it too, then gives you the one meaning that fits, in your language. If you are already reading in your own language, it doesn't translate the word into itself — it gives you a simpler word instead.

It's free and open source. There's no server: it calls Google's Gemini API from your browser with your own free key, which takes about a minute to get and needs no card. No account, no tracking.

Honest about the limits: it offers 110 languages, but only English and Sinhala have examples checked by a speaker, and the extension tells you which is which. The answers come from a model, so they can be wrong.

Chrome, Brave and Edge for now, Firefox is in review.

https://contextreader.github.io

If it gets a word wrong in your language, tell me — that's the feedback I actually need.
```

### r/EnglishLearning

**Title:** `The hardest English words aren't the long ones — they're the ordinary words used in a special way`

```
Something that took me too long to work out: reading in English is not hard because of the words you have never seen. It's hard because of words you know, used to mean something else.

In a medical paper, "positive" is usually bad news. In statistics, "significant" doesn't mean big, it means probably not chance. In law, "consideration" is what each side gives, not being thoughtful. Nothing warns you — the sentence reads fine and you have the wrong idea.

Four things that helped me, none of them a tool:
1. Read one sentence further before you stop. Writers explain their own terms more often than you'd think.
2. Don't stop for every unknown word, only the ones the paragraph depends on.
3. Say what the text is about — a trial, a lease, a bug report. Most wrong readings are a word taken out of its field.
4. If you translate, paste the whole sentence, never the word alone. A word alone has no context, so you get its most common meaning.

I also built a free extension that does the same thing in one click: select a word and it reads the paragraph with it, then explains the one meaning that fits, in your language. It's open source and uses your own free API key, so there's no account and no tracking. https://contextreader.github.io

I wrote the longer version here: https://contextreader.github.io/blog/reading-english-second-language
```

### r/chrome_extensions or r/SideProject

**Title:** `Context Reader — explains the word you're stuck on using the sentence around it (free, open source, no server)`

```
A dictionary gives you every meaning of a word. Context Reader gives you the one your sentence is using: select a word, and it sends the paragraph with it, then answers in your language.

The bit other devs might find interesting: there's no backend at all. The extension calls the Gemini API straight from the browser with the user's own key, stored in chrome.storage.local (never sync) and optionally encrypted with a passphrase. That means no server bill, no database of what people read, and one host permission in the manifest, which makes the privacy claim checkable rather than promised.

Other decisions I'd defend:
- One answer first, not a list. More / General / Simple are behind buttons.
- 110 languages, but only 2 ship checked examples, and the picker says which. The alternative was to show 110 equal flags and let people find out.
- Everything the model returns is sanitised before it goes near the page — the model reads the page, so a page can steer what it writes.
- Fonts are bundled (24 variable files), so a strict site's CSP can't drop the bubble to system fonts. Only CJK is fetched, once, with no referrer.

MIT: https://github.com/contextreader/contextreader.github.io
Store: https://contextreader.github.io
```

---

## 3. Product Hunt

Launch on a weekday, 12:01am Pacific. Have the five store screenshots ready (`store/2x-*.png`)
and `store/social-1280x640.png` as the thumbnail.

**Tagline** (60 chars):

```
The word you're stuck on, explained in your language
```

**Description** (260 chars):

```
A dictionary gives you every meaning of a word. Context Reader reads the sentence you're on and gives you the one that fits, in your language. Free and open source, with no server and no tracking: it runs on your own free Gemini API key.
```

**First comment, from you:**

```
Hi — I'm Ian, I built this.

It started with one annoyance: a dictionary answers "what can this word mean", and I needed "what does it mean here". In a lab report, "culture" is a sample grown to find bacteria. In a job review, it's how a company works. Same word, and the paragraph around it decides.

So: select a word on any page, and Context Reader sends the paragraph with it and answers with the meaning that fits, in your language. 110 languages. If you're already reading in your own language, it gives you a simpler word instead of translating the word into itself.

There's no server. It calls Google's Gemini API from your browser with your own free key, which takes about a minute to get. That's a real cost at setup, and it buys: no subscription, no quota of mine, no account, and nowhere your reading can pile up. The extension has no analytics of any kind and holds one host permission — the source is public, so you don't have to take my word for it.

What it does badly: only English and Sinhala ship examples checked by a speaker, so specialist terms in the other 108 are less reliable. The extension says so in the picker. Answers are written by a model and can be wrong; the EN button shows the same answer in English to check.

Chrome, Brave and Edge now; Firefox is in review at Mozilla. Happy to answer anything.
```

---

## 4. X / Twitter thread

Post the first with the social card (`store/social-1280x640.png`); the rest as replies.

```
1/ A dictionary gives you every meaning of a word.

I needed one: the meaning my sentence was using.

So I built Context Reader — select a word on any page, it reads the paragraph around it, and explains the one meaning that fits, in your language. Free, open source.

2/ "The culture came back positive after forty-eight hours."

A dictionary offers art, customs, a lab sample. A translator picks the common one. The words that decide it — ward, antibiotics — are outside the word you selected.

That gap is the whole product.

3/ No server. It calls Google's Gemini API from your browser with your own free key.

That costs a minute of setup. It buys: no subscription, no account, no database of what you read, one host permission, and a privacy claim you can check in the source.

4/ 110 languages — and only two of them ship examples checked by a speaker.

The picker says which is which, because the rest are less reliable on specialist terms. I'd rather say that than show 110 equal flags.

5/ Chrome, Brave and Edge today. Firefox is in review at Mozilla.

Free, MIT, no paid tier planned. If it gets a word wrong in your language, tell me.

https://contextreader.github.io
```

---

## 5. Directories — no writing needed, just submissions

| Where | Notes |
|---|---|
| AlternativeTo | List it as an alternative to Reverso Context and Google Translate. Needs an account. |
| Chrome Web Store categories | Already live; nothing to do. |
| alternativeto, Slant, SaaSHub | Low effort, real links. |
| There's An AI For That | Accepts free tools; has a queue. |
| Mozilla add-ons | Automatic once the review passes. |

---

## 6. Replies you will need (write them once, adapt)

**"Why do I need my own API key?"**
```
Because there's no server. If lookups went through mine, I'd be paying per lookup — which is how free tools become paid ones — and I'd have a record of what you read. Your own key means the request goes from your browser to Google and nowhere else. It takes about a minute at aistudio.google.com/apikey and needs no card.
```

**"How is this different from Google Translate?"**
```
Translation moves a sentence into another language. This explains one word inside it. Paste a word alone into a translator and it has no context, so you get the word's most common meaning — often not the one your page is using. Longer answer: https://contextreader.github.io/blog/why-google-translate-gets-words-wrong
```

**"Isn't this just a ChatGPT prompt?"**
```
Essentially, yes — with the paragraph collected for you, the answer rendered where you're reading, and no tab switch. The work is in the selection handling, the prompt, the fallback when a model is rate-limited, and the fonts bundled for two dozen scripts so the answer renders on a site whose policy blocks font downloads. The model does the thinking; I don't pretend otherwise.
```

**"Will it stay free?"**
```
Yes. There's nothing to charge for: no server, no quota of mine. You pay Google nothing on the free tier, and I pay nothing either. That's the reason it can stay free, not a promise I'm asking you to trust.
```
