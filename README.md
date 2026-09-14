# Context Reader

A Chrome extension that explains the word you're stuck on, in your language, using the
sentence around it.

Not a dictionary. A dictionary gives you every meaning of *culture*; Context Reader reads
the sentence, works out that you're looking at a lab report, and gives you the one that
fits.

**Free. Open source. No server. No tracking. No account.**

[contextreader site](https://contextreader.github.io/) · [Privacy](PRIVACY_POLICY.md) · [Contributing](CONTRIBUTING.md)

---

## Why it works this way

It calls Google's Gemini API directly from your browser, with **your own free API key**.

That one decision explains most of the design. There is no server in the middle, so there
is nothing to pay for, nothing to keep running, and nowhere for your reading history to
accumulate. It also means the privacy claim is checkable rather than promised — the whole
extension is in this repo, and `host_permissions` in `manifest.json` lists exactly one
host it is permitted to contact.

The cost is real: you have to get a key before your first lookup. It takes about a minute
and it's free.

## Install

1. Get a free Gemini API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Install the extension
3. Pick your language and paste the key when the welcome page opens

**From source:** clone this repo, open `chrome://extensions`, turn on Developer mode,
choose *Load unpacked*, and select the folder.

## Use

- **Select a word** on any page — a small mark appears; click it.
- **Already in your language?** It won't translate a word into itself. It gives you a
  simpler word for the one you're stuck on.
- **More / General / Simple** — three deeper takes: a worked scenario, a dictionary-style
  entry, and a plain explanation pitched at a thirteen-year-old.
- **EN** — one-shot English, for when you want the English sense too. Your language setting
  doesn't change.

## Languages

**110** — every language Google documents all Gemini models as able to understand and
respond in, with Chinese split into Simplified and Traditional.

<details><summary>The full list</summary>

English · සිංහල Sinhala · Afrikaans · Shqip Albanian · አማርኛ Amharic · العربية Arabic · Հայերեն Armenian · অসমীয়া Assamese · Azərbaycanca Azerbaijani · Euskara Basque · Беларуская Belarusian · বাংলা Bengali · Bosanski Bosnian · Български Bulgarian · Català Catalan · Cebuano · 简体中文 Chinese (Simplified) · 繁體中文 Chinese (Traditional) · Corsu Corsican · Hrvatski Croatian · Čeština Czech · Dansk Danish · ދިވެހި Dhivehi · Nederlands Dutch · Esperanto · Eesti Estonian · Filipino Filipino (Tagalog) · Suomi Finnish · Français French · Frysk Frisian · Galego Galician · ქართული Georgian · Deutsch German · Ελληνικά Greek · ગુજરાતી Gujarati · Kreyòl ayisyen Haitian Creole · Hausa · ʻŌlelo Hawaiʻi Hawaiian · עברית Hebrew · हिन्दी Hindi · Hmoob Hmong · Magyar Hungarian · Íslenska Icelandic · Igbo · Bahasa Indonesia Indonesian · Gaeilge Irish · Italiano Italian · 日本語 Japanese · Basa Jawa Javanese · ಕನ್ನಡ Kannada · Қазақ тілі Kazakh · ខ្មែរ Khmer · 한국어 Korean · Krio · Kurdî Kurdish (Kurmanji) · Кыргызча Kyrgyz · ລາວ Lao · Latina Latin · Latviešu Latvian · Lietuvių Lithuanian · Lëtzebuergesch Luxembourgish · Македонски Macedonian · Malagasy · Bahasa Melayu Malay · മലയാളം Malayalam · Malti Maltese · Māori Maori · मराठी Marathi · ꯃꯤꯇꯩꯂꯣꯟ Meiteilon (Manipuri) · Монгол Mongolian · မြန်မာ Myanmar (Burmese) · नेपाली Nepali · Norsk Norwegian · Chichewa Nyanja (Chichewa) · ଓଡ଼ିଆ Odia (Oriya) · پښتو Pashto · فارسی Persian · Polski Polish · Português Portuguese · ਪੰਜਾਬੀ Punjabi · Română Romanian · Русский Russian · Gagana Samoa Samoan · Gàidhlig Scots Gaelic · Српски Serbian · Sesotho · chiShona Shona · سنڌي Sindhi · Slovenčina Slovak · Slovenščina Slovenian · Soomaali Somali · Español Spanish · Basa Sunda Sundanese · Kiswahili Swahili · Svenska Swedish · Тоҷикӣ Tajik · தமிழ் Tamil · తెలుగు Telugu · ไทย Thai · Türkçe Turkish · Українська Ukrainian · اردو Urdu · ئۇيغۇرچە Uyghur · Oʻzbekcha Uzbek · Tiếng Việt Vietnamese · Cymraeg Welsh · isiXhosa Xhosa · ייִדיש Yiddish · Yorùbá Yoruba · isiZulu Zulu

</details>

**English and Sinhala are tuned.** A tuned language ships worked examples — contrastive
pairs like *"bank" in finance is a financial institution, not the edge of a river* — that
teach the model to pick the sense that matches the domain. Sinhala's are the measured set:
without them the model returned වගාව instead of රුධිර වගාව for *blood culture*.

The other 108 work, but have no hand-checked examples yet, so domain-specific senses may
be less accurate. The interface says so rather than pretending otherwise.

**Adding examples for your language is the most useful contribution you can make**, and it
is a small one — see [CONTRIBUTING.md](CONTRIBUTING.md).

## What leaves your machine

| Goes out | To | When |
|---|---|---|
| The word and its surrounding sentence | Google Gemini, with your key | Each lookup |
| Nothing else | — | — |

Your API key is stored locally and read only by the extension's service worker. It is never
sent anywhere but Google. Optionally you can encrypt it at rest with a passphrase.

There is no analytics, no telemetry, no error reporting, no crash reporting, no server.

Two honest caveats: the interface loads fonts from Google Fonts, so `fonts.googleapis.com`
sees that you loaded a page; and Google sees your lookups, because it is the one answering
them. Full detail in [PRIVACY_POLICY.md](PRIVACY_POLICY.md).

## Permissions

| Permission | Why |
|---|---|
| `storage` | Your language, key and settings, on your device |
| `activeTab` | Read the selected text on the page you're looking at |
| `generativelanguage.googleapis.com` | The only host it may contact |

## Development

```bash
npm test        # 358 assertions, no dependencies, no framework
npm run package # builds dist/context-reader-<version>.zip
```

`npm test` runs on a clean checkout — plain `node`, nothing to install. See
[test/README.md](test/README.md) for why there is an extraction step and what the DOM shim
is not.

`npm run package` builds the zip from an explicit file list derived from `manifest.json`.
It exists because a CRX is a zip of the whole directory, and the repo also contains a PDF
reader that is **not** part of the shipped extension — it is in development and would
otherwise add 5.6 MB.

Everything visual still needs a browser. The tests check logic; they render nothing.

## Licence

[MIT](LICENSE). Bundled third-party code keeps its own licences — see [NOTICE](NOTICE).
