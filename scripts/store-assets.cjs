// Renders Chrome Web Store assets that need no model output:
//   store/promo-440x280.png          small promo tile (brand art)
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
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'store');
const L = require(path.join(ROOT, 'lib/languages.js'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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

    const tile = await browser.newPage({ viewport: { width: 440, height: 280 } });
    await tile.setContent(promoHTML(), { waitUntil: 'load' });
    await tile.waitForTimeout(600);
    await tile.screenshot({ path: path.join(OUT, 'promo-440x280.png') });

    const tmp = path.join(OUT, '.settings-harness.html');
    fs.writeFileSync(tmp, settingsHTML());
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto('file://' + tmp);
    await page.waitForTimeout(1200);
    // Search "si": Sinhala (tuned), Sindhi and Chinese (Simplified) — both groups on screen.
    await page.evaluate(() => {
        const input = document.getElementById('opt-language-search');
        input.value = 'si';
        input.dispatchEvent(new Event('input'));
        // Frame the one card this screenshot is about: the page header and the real
        // Language card, nothing staged. Other cards need a key or measurements.
        const card = input.closest('.card');
        document.querySelectorAll('.card').forEach((c) => { if (c !== card) c.style.display = 'none'; });
        document.querySelectorAll('.container > *').forEach((el) => {
            if (el !== card && !el.classList.contains('header') && !el.contains(card)) el.style.display = 'none';
        });
        document.body.style.paddingTop = '70px';
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, 'screenshot-language.png') });
    fs.unlinkSync(tmp);

    await browser.close();
    console.log('store/promo-440x280.png, store/screenshot-language.png');
})().catch((e) => { console.error(e); process.exit(1); });
