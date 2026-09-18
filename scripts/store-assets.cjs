// Renders Chrome Web Store assets that need no model output:
//   store/promo-440x280.png          small promo tile (brand art)
//   store/marquee-1400x560.png       marquee tile, for the featured shelves
//   store/social-1280x640.png        GitHub social preview / link unfurls
//   store/screenshot-language.png    Settings → language picker, 1280×800
//
// Screenshots that show an ANSWER (the bubble over an article) or measured
// speeds (the model table) are deliberately not rendered here: they must be
// captured from the real extension with a real key, not staged.
//
// Needs playwright-core, which this repo does not depend on:
//   PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core node scripts/store-assets.cjs

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'store');
const L = require(path.join(ROOT, 'lib/languages.js'));

// The store takes 1280×800, but rendering at 1× gives soft text. Shoot at 2×
// and downsample: every glyph is then averaged from four pixels instead of
// guessed from one, which is the difference between "screenshot" and "blurry
// screenshot" on the listing page.
function halve(file) {
    execFileSync('python3', ['-c', `from PIL import Image
im = Image.open(${JSON.stringify(file)})
im.resize((im.width // 2, im.height // 2), Image.LANCZOS).convert('RGB').save(${JSON.stringify(file)})`]);
}

// Small tile and marquee share their parts; only the proportions differ. The
// marquee is wide and short, so the mark and the wordmark sit left and the
// claim runs beside them rather than under.
function marqueeHTML() {
    const svg = fs.readFileSync(path.join(ROOT, 'icon.svg'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    const font = (w) => `@font-face{font-family:Inter;font-weight:${w};src:url("file://${ROOT}/docs/fonts/inter-latin-${w}.woff2")}`;
    return `<!doctype html><html><head><style>
      ${font(400)}${font(600)}${font(800)}
      html,body{margin:0}
      body{width:1400px;height:560px;overflow:hidden;background:#eef0f3;color:#111827;
           font-family:Inter,sans-serif;display:grid;grid-template-columns:auto 1fr;
           align-items:center;gap:72px;padding:0 96px;box-sizing:border-box}
      .mark svg{width:232px;height:232px;display:block}
      .mark .name{margin-top:26px;font-size:30px;font-weight:800;letter-spacing:-.02em}
      h1{margin:0;font-size:62px;line-height:1.08;font-weight:800;letter-spacing:-.035em;max-width:14ch}
      .lit{background:#fbbf24;border-radius:.26em;padding:0 .12em;margin:0 -.03em;-webkit-box-decoration-break:clone}
      p{margin:26px 0 0;font-size:24px;line-height:1.5;color:#374151;max-width:30ch}
      .foot{margin-top:26px;font-size:18px;font-weight:600;color:#5b6472}
    </style></head><body>
      <div class="mark">${svg}<div class="name">Context Reader</div></div>
      <div>
        <h1>The word you’re <span class="lit">stuck on</span>, in your language.</h1>
        <p>It reads the sentence around the word first, so you get the meaning that fits — not every meaning it has.</p>
        <div class="foot">${L.listLangs().length} languages · free · open source · no tracking</div>
      </div>
    </body></html>`;
}

// What Twitter, Slack, Discord and LinkedIn show when the repo link is pasted.
// GitHub asks for 1280×640 and crops the edges on some surfaces, so nothing that
// matters goes near them.
function socialHTML() {
    const svg = fs.readFileSync(path.join(ROOT, 'icon.svg'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    const font = (w) => `@font-face{font-family:Inter;font-weight:${w};src:url("file://${ROOT}/docs/fonts/inter-latin-${w}.woff2")}`;
    return `<!doctype html><html><head><style>
      ${font(400)}${font(600)}${font(800)}
      html,body{margin:0}
      body{width:1280px;height:640px;overflow:hidden;background:#eef0f3;color:#111827;
           font-family:Inter,sans-serif;display:flex;flex-direction:column;justify-content:center;
           gap:30px;padding:0 104px;box-sizing:border-box}
      .top{display:flex;align-items:center;gap:22px}
      .top svg{width:88px;height:88px}
      .top span{font-size:34px;font-weight:800;letter-spacing:-.02em}
      h1{margin:0;font-size:68px;line-height:1.06;font-weight:800;letter-spacing:-.035em;max-width:17ch}
      .lit{background:#fbbf24;border-radius:.26em;padding:0 .12em;margin:0 -.03em;-webkit-box-decoration-break:clone}
      p{margin:0;font-size:26px;line-height:1.5;color:#374151;max-width:34ch}
      .foot{font-size:19px;font-weight:600;color:#5b6472}
    </style></head><body>
      <div class="top">${svg}<span>Context Reader</span></div>
      <h1>The word you’re <span class="lit">stuck on</span>, in your language.</h1>
      <p>It reads the sentence around the word first, so you get the meaning that fits.</p>
      <div class="foot">${L.listLangs().length} languages · free · open source · no tracking</div>
    </body></html>`;
}

function promoHTML() {
    const svg = fs.readFileSync(path.join(ROOT, 'icon.svg'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    const font = (w) => `@font-face{font-family:Inter;font-weight:${w};src:url("file://${ROOT}/docs/fonts/inter-latin-${w}.woff2")}`;
    return `<!doctype html><html><head><style>
      ${font(400)}${font(600)}${font(800)}
      html,body{margin:0}
      body{width:440px;height:280px;overflow:hidden;background:#eef0f3;font-family:Inter,sans-serif;color:#111827;
           display:grid;grid-template-rows:auto 1fr auto;padding:26px 28px 22px;box-sizing:border-box}
      .top{display:flex;align-items:center;gap:10px;font-weight:800;font-size:17px;letter-spacing:-.01em}
      .top svg{width:34px;height:34px}
      h1{align-self:center;margin:0;font-size:38px;line-height:1.05;font-weight:800;letter-spacing:-.035em}
      .lit{background:#fbbf24;border-radius:.28em;padding:0 .14em;margin:0 -.03em;-webkit-box-decoration-break:clone}
      .foot{font-size:13px;font-weight:600;color:#5b6472}
      .foot b{color:#111827}
    </style></head><body>
      <div class="top">${svg}Context Reader</div>
      <h1>The word you’re <span class="lit">stuck on</span>, in your language.</h1>
      <div class="foot"><b>${L.listLangs().length} languages</b> · free · open source · no tracking</div>
    </body></html>`;
}

// The real options.html, with a chrome.* stub that answers from the real language list.
function settingsHTML() {
    let html = fs.readFileSync(path.join(ROOT, 'options.html'), 'utf8');
    html = html.replace(/(src|href)="(?!https?:|data:|#)([^"]+)"/g, (m, a, p) => `${a}="file://${ROOT}/${p}"`);
    const stub = `<script src="file://${ROOT}/lib/languages.js"></script><script>
      window.chrome = {
        runtime: { id: 'x', getManifest: () => ({ version: '1.0.0' }), getURL: (p) => p, openOptionsPage() {},
          sendMessage(msg, cb) {
            const r = ({
              getLanguages: { current: 'si', languages: CRLanguages.listLangs(), defaultLang: 'en' },
              setLanguage: { ok: true, lang: CRLanguages.getLang(msg.code) },
              getKeyState: { hasKey: true, protection: 'plain', unlocked: true, masked: 'AIza…k3Q' },
            })[msg.action] || { ok: true };
            if (cb) { setTimeout(() => cb(r), 0); return; }
            return Promise.resolve(r);
          } },
        storage: { local: { get: (k, cb) => { cb && cb({}); return Promise.resolve({}); }, set: (o, cb) => { cb && cb(); return Promise.resolve(); } },
                   session: { get: (k, cb) => { cb && cb({}); return Promise.resolve({}); }, set: () => Promise.resolve() },
                   onChanged: { addListener() {} } },
      };</script>`;
    return html.replace('<head>', '<head>' + stub);
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch();

    const tile = await browser.newPage({ viewport: { width: 440, height: 280 }, deviceScaleFactor: 2 });
    await tile.setContent(promoHTML(), { waitUntil: 'load' });
    await tile.waitForTimeout(600);
    await tile.screenshot({ path: path.join(OUT, 'promo-440x280.png') });
    halve(path.join(OUT, 'promo-440x280.png'));

    const tmp = path.join(OUT, '.settings-harness.html');
    fs.writeFileSync(tmp, settingsHTML());
    const social = await browser.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 2 });
    await social.setContent(socialHTML(), { waitUntil: 'load' });
    await social.waitForTimeout(600);
    await social.screenshot({ path: path.join(OUT, 'social-1280x640.png') });
    halve(path.join(OUT, 'social-1280x640.png'));

    const marquee = await browser.newPage({ viewport: { width: 1400, height: 560 }, deviceScaleFactor: 2 });
    await marquee.setContent(marqueeHTML(), { waitUntil: 'load' });
    await marquee.waitForTimeout(600);
    await marquee.screenshot({ path: path.join(OUT, 'marquee-1400x560.png') });
    halve(path.join(OUT, 'marquee-1400x560.png'));

    // 1000×625 at 2.56× is 2560×1600, which halves to the 1280×800 the store wants.
    // The viewport sets how large the UI reads: 1280 left the card adrift in an
    // empty page, 800 cropped it. 1000 fits the whole card with room around it.
    const page = await browser.newPage({ viewport: { width: 1000, height: 625 }, deviceScaleFactor: 2.56 });
    await page.goto('file://' + tmp);
    await page.waitForTimeout(1200);
    // Search "e": English (tuned) with Basque, Esperanto, Estonian and Spanish —
    // both groups on screen, and no one language put first. Sinhala is one of the
    // 110, not the product's face.
    await page.evaluate(() => {
        const input = document.getElementById('opt-language-search');
        input.value = 'e';
        input.dispatchEvent(new Event('input'));
        // Frame the one card this screenshot is about: the page header and the real
        // Language card, nothing staged. Other cards need a key or measurements.
        const card = input.closest('.card');
        document.querySelectorAll('.card').forEach((c) => { if (c !== card) c.style.display = 'none'; });
        document.querySelectorAll('.container > *').forEach((el) => {
            if (el !== card && !el.classList.contains('header') && !el.contains(card)) el.style.display = 'none';
        });
        document.body.style.paddingTop = '26px';
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, 'screenshot-language.png') });
    halve(path.join(OUT, 'screenshot-language.png'));
    fs.unlinkSync(tmp);

    await browser.close();
    console.log('store/promo-440x280.png, store/marquee-1400x560.png, store/social-1280x640.png, store/screenshot-language.png');
})().catch((e) => { console.error(e); process.exit(1); });
