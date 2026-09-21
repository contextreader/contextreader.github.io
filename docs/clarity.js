/* Microsoft Clarity, only on a yes.
 *
 * Clarity gives heatmaps and page recordings, which Umami and Cloudflare
 * cannot. It is not cookieless like them: tested 21 Sep, its loader fires a
 * sync pixel that sets Microsoft's MUID cookie on clarity.ms and bing.com on
 * every load, whatever the project's cookie setting. So nothing of Clarity is
 * fetched until the visitor says yes here (Ian chose this, 21 Sep).
 *
 * - Asked once, after the first scroll, in a small card; both answers are the
 *   same size, because saying no must be as easy as saying yes.
 * - The answer is kept in localStorage ("cr-clarity": "yes" | "no"). If storage
 *   is blocked, the answer holds for this page only.
 * - A browser sending Global Privacy Control is never asked and never loads it.
 * - Any element with data-clarity-choice (the privacy page has one) reopens
 *   the question and withdraws a yes: Clarity is told, its first-party cookies
 *   are cleared, and the page reloads without it.
 *
 * The site's test (test/copy.test.js) requires every page to load this file
 * and to name Clarity in its prose. Nothing else may load www.clarity.ms.
 */
(function () {
  var KEY = 'cr-clarity';
  var PROJECT = 'ylv5kj8w7i';

  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function write(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function forget() { try { localStorage.removeItem(KEY); } catch (e) {} }
  function count(answer) { try { if (window.umami) umami.track('clarity-choice', { answer: answer }); } catch (e) {} }

  var gpc = navigator.globalPrivacyControl === true;

  function load() {
    if (window.clarity) return;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', PROJECT);
    // Analytics yes, advertising no: the visitor agreed to a recording, not to ads.
    window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
  }

  var css =
    '.cr-consent{position:fixed;z-index:50;right:21px;bottom:21px;max-width:380px;padding:16px 18px;' +
    'background:var(--paper,#fbfbfc);color:var(--ink-soft,#374151);border:1px solid var(--rule,#d9dde3);border-radius:13px;' +
    'box-shadow:0 1px 2px rgba(17,24,39,.06),0 13px 34px -13px rgba(17,24,39,.34);font:400 14px/1.55 var(--sans,system-ui,sans-serif);' +
    'opacity:0;transform:translateY(8px);transition:opacity .382s cubic-bezier(.16,1,.3,1),transform .382s cubic-bezier(.16,1,.3,1)}' +
    '.cr-consent.on{opacity:1;transform:none}' +
    '.cr-consent p{margin:0}' +
    '.cr-consent strong{color:var(--ink,#111827);font-weight:600}' +
    '.cr-consent a{color:inherit;text-underline-offset:2px}' +
    '.cr-consent .acts{display:flex;gap:8px;margin-top:13px}' +
    '.cr-consent button{flex:1;min-height:38px;margin:0;padding:0 16px;border-radius:999px;cursor:pointer;' +
    'font:600 14px/1 var(--sans,system-ui,sans-serif);background:transparent;color:var(--ink,#111827);border:1px solid var(--rule,#d9dde3)}' +
    '.cr-consent button:hover{border-color:var(--ink,#111827)}' +
    '.cr-consent button:focus-visible{outline:2px solid var(--accent,#a84e08);outline-offset:3px}' +
    '@media (max-width:520px){.cr-consent{left:16px;right:16px;bottom:16px;max-width:none}}' +
    '@media (prefers-reduced-motion:reduce){.cr-consent{transition:none;transform:none}}';

  var card = null;
  function ask() {
    if (card) return;
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    card = document.createElement('div');
    card.className = 'cr-consent';
    card.setAttribute('role', 'region');
    card.setAttribute('aria-label', 'Recording consent');
    card.innerHTML =
      '<p><strong>Help improve this site?</strong> If you allow it, Microsoft Clarity records how this page is used, ' +
      'scrolling and clicks but never what you type, and sets Microsoft’s cookies. ' +
      '<a href="/privacy#clarity">Details</a></p>' +
      '<div class="acts"><button type="button" data-a="no">No thanks</button><button type="button" data-a="yes">Allow</button></div>';
    card.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var yes = b.getAttribute('data-a') === 'yes';
      write(yes ? 'yes' : 'no');
      count(yes ? 'yes' : 'no');
      if (yes) load();
      card.remove(); card = null;
    });
    document.body.appendChild(card);
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (card) card.classList.add('on'); }); });
  }

  function askAfterScroll() {
    function once() { window.removeEventListener('scroll', once); ask(); }
    window.addEventListener('scroll', once, { passive: true });
  }

  function reopen(e) {
    e.preventDefault();
    if (gpc) return;
    var was = read();
    forget();
    if (was === 'yes' || window.clarity) {
      try { window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' }); } catch (x) {}
      ['_clck', '_clsk'].forEach(function (n) {
        document.cookie = n + '=; Max-Age=0; path=/';
        document.cookie = n + '=; Max-Age=0; path=/; domain=.' + location.hostname;
      });
      location.reload();
      return;
    }
    ask();
  }

  function start() {
    var choices = document.querySelectorAll('[data-clarity-choice]');
    for (var i = 0; i < choices.length; i++) {
      if (gpc) choices[i].hidden = true;
      else choices[i].addEventListener('click', reopen);
    }
    if (gpc) return;
    var answer = read();
    if (answer === 'yes') load();
    else if (answer !== 'no') askAfterScroll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
