# PORTING — Firefox, Safari, and the other Chromium browsers

Brief for the session doing the ports. Read `CLAUDE.md` first for the four commitments;
they hold in every browser. `HANDOFF.md` is the Chrome build's state.

Written 2026-09-18, while the Chrome listing is in review.

---

## The short version

| Target | Work | Cost | Verdict |
|---|---|---|---|
| Brave, Opera, Vivaldi | **None** | Free | They install from the Chrome Web Store already. Nothing to build, nothing to submit. |
| Edge | Repackage nothing — same zip | Free | Separate store, separate review, same artefact. An hour, mostly forms. |
| Firefox | A second manifest and a build step | Free | Worth doing. The API surface we use is portable; the manifest and the permission model are not. |
| Safari | An Xcode project, wrapped in a macOS app | **99 USD/year** Apple Developer Program | **Not doing it (Ian, 18 Sep).** The analysis below stays for whenever that changes. |

**Status, 22 Sep:** Chrome is live. The Firefox build is done: `npm run package` emits both
zips, `web-ext lint` reports 0 errors, and `FIREFOX_LISTING.md` has every AMO field. Two
things below changed once the facts were checked: the minimum is **Firefox 140**, not 115,
and host access is **granted at install** from 127 on, so the permission card is for a
reader who later switches it off, not for every fresh install.

---

## What the extension actually uses

Counted from the shipping source, and it is a small surface:

```
chrome.storage.local      49   chrome.runtime.getURL         3
chrome.runtime.sendMessage 18  chrome.runtime.openOptionsPage 2
chrome.storage.session    10   chrome.runtime.onMessage       2
chrome.storage.onChanged   5   chrome.runtime.getManifest     2
chrome.tabs.sendMessage    3   chrome.tabs.{query,create}     2
                               chrome.runtime.onInstalled     1
```

No `declarativeNetRequest`, no `scripting`, no `offscreen`, no alarms. Firefox and Safari
both alias `chrome.*`, so **the JavaScript does not need a polyfill or a rewrite**. What
differs is the manifest, the background type, and — in Firefox — when host permissions are
granted.

---

## Firefox

**Manifest differences.** Firefox MV3 does not take `background.service_worker`; it wants an
event page:

```jsonc
"background": { "scripts": ["background.js"] },           // not service_worker
"browser_specific_settings": { "gecko": { "id": "contextreader@contextreader.github.io",
                                          "strict_min_version": "115.0" } }
```

`115` because `storage.session` — which holds the decrypted API key while unlocked — landed
there. Below that the passphrase mode breaks silently, which is the worst way to break.

**The one real behavioural difference: host permissions are optional.** In Firefox MV3 the
Gemini host permission is *requested* at install but **not granted until the user allows it**,
per-site, from the extensions panel. A first lookup can therefore fail with a permission error
on a fresh install even though the manifest is correct. Handle it rather than let it look like
a broken key: check `browser.permissions.contains({origins:[…]})` before the first call, and
if it is false, show a card that says what to click — reusing the "API key needed" card's
shape. **Do not** silently call `permissions.request` from a background script; it needs a
user gesture, so it belongs on a button in Settings or in that card.

**Build.** Don't fork the tree. Extend `scripts/package.mjs` to emit two zips from one source
— `dist/contextreader-chrome-<v>.zip` and `dist/contextreader-firefox-<v>.zip` — by patching
the manifest in memory. Keep one `manifest.json` as the Chrome source of truth and derive the
Firefox one, so a permission added in Chrome cannot be forgotten in Firefox.

**Test with** `web-ext run` (`npx web-ext run --source-dir=dist/firefox`), and
`web-ext lint`, which catches manifest problems AMO will reject. Add a test asserting the
derived Firefox manifest has no `service_worker`, has the gecko id, and lists the same
permissions as Chrome's.

**Submission.** addons.mozilla.org, free. Review is usually days. AMO requires the source if
the code is minified — ours is not, and the repo is public, so this is simple.

---

## Safari — deferred, not rejected

**Ian's call on 18 Sep: Firefox only.** Nothing below is scheduled; it is here so the decision
does not have to be re-derived if Safari readers ever become an audience worth 99 USD a year.

**What it actually involves.** `xcrun safari-web-extension-converter <dir>` generates an Xcode
project wrapping the extension in a macOS app. You then build, sign and ship *an app*, through
App Store Connect, under a paid Apple Developer Program membership (99 USD/year). An iOS build
is a second target with its own review and a much worse story for the API-key step.

**Technically it is the easy one** — Safari 16.4+ supports MV3 service workers and aliases
`chrome.*` — but it is the only target where the work never ends: Xcode upgrades, signing
certificates, and an App Store review for every update.

**Ask Ian before starting.** The cost is not the code; it is 99 USD a year and an app to keep
alive. Worth it only if Safari readers are a real audience for him.

---

## Edge

The Chrome zip uploads as-is to Partner Center. Same manifest, same code. Separate listing
copy (reuse `STORE_LISTING.md`), separate review. Free. The only reason to delay is that a
Chrome review change would have to be re-uploaded twice.

---

## The website's install button

`docs/` belongs to the website session — coordinate rather than edit it. What it needs:

- Detect the browser and offer the right store. Scope as of 18 Sep: **Chrome, Brave and
  Firefox**. Chrome and Brave go to the same Chrome Web Store listing; Firefox goes to AMO.
  Edge would too if that listing ever happens; Safari is not planned.
- **Only show a button for a store that exists.** Until a listing is live, that browser gets
  the "install from GitHub" path, not a dead link or a promise.
- Brave reports itself as Chrome in the UA string; `navigator.brave?.isBrave()` resolves it,
  and it does not matter much because both go to the same store.
- Keep a visible link to every store regardless of detection — people share links, and
  detection is a convenience, not a gate.

---

## What must stay true in every port

The four commitments are not Chrome-specific. Each port keeps: one host permission and
nothing else; no analytics, telemetry or identifiers; the key in local storage, never synced,
optionally encrypted; fonts bundled (the same `fonts/` directory works everywhere); and the
tuned/community distinction shown honestly in the picker.

`npm test` must pass for every target. The tests are browser-agnostic except where they read
`manifest.json` — those are the ones to extend, not to bypass.
