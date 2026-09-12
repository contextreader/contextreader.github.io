// extracted from options.html — MV3 CSP blocks inline scripts
//
// Every DOM lookup is guarded. This file used to be flat top-level with no guards,
// so removing any single element from options.html threw and silently killed every
// line below it — including the API key field, the only load-bearing control here.

document.addEventListener('DOMContentLoaded', () => {

    const $ = (id) => document.getElementById(id);
    const setText = (id, text) => { const el = $(id); if (el) el.textContent = text; };
    const on = (id, evt, fn) => { const el = $(id); if (el) el.addEventListener(evt, fn); };
    const setHref = (id, url) => { const el = $(id); if (el) el.href = url; };

    // ---- About ----
    setText('opt-version', chrome.runtime.getManifest().version);
    setText('opt-ext-id', chrome.runtime.id);

    // ---- Links ----
    on('opt-customize-shortcuts', 'click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });

    setHref('opt-rate-link', `https://chromewebstore.google.com/detail/${chrome.runtime.id}`);
    setHref('opt-feedback-link', 'https://discord.gg/tdwHWmmC');

    // ---- Usage ----
    // getUsage in background.js is a hardcoded stub that always answers
    // { unlimited: true } — there is no server in this build. Only the unlimited
    // branch below can ever run.
    function renderUsage(response) {
        if (!response) {
            setText('opt-usage-label', 'Could not load usage data');
            return;
        }

        const bar    = $('opt-usage-bar');
        const circle = document.querySelector('.usage-circle');
        const num    = document.querySelector('.usage-circle .num');

        if (response.unlimited) {
            setText('opt-remaining', '∞');
            setText('opt-usage-label', 'Unlimited lookups (developer)');
            if (bar) bar.style.width = '0%';
            if (circle) circle.style.borderColor = '#22c55e';
            if (num) num.style.color = '#16a34a';
            return;
        }

        const used      = response.used || 0;
        const limit     = response.limit || 20;
        const remaining = Math.max(0, limit - used);

        setText('opt-remaining', remaining);
        setText('opt-usage-label', `${used} of ${limit} lookups used today`);
        if (bar) bar.style.width = `${Math.min(100, (used / limit) * 100)}%`;

        if (used >= limit) {
            if (bar) bar.style.background = '#ef4444';
            if (circle) circle.style.borderColor = '#ef4444';
            if (num) num.style.color = '#dc2626';
        }
    }

    chrome.runtime.sendMessage({ action: 'getUsage' }, renderUsage);

    // Refresh — clears cached access info and re-fetches usage
    on('opt-refresh-usage', 'click', () => {
        chrome.runtime.sendMessage({ action: 'clearAccessCache' });
        setText('opt-usage-label', 'Refreshing...');
        chrome.runtime.sendMessage({ action: 'getUsage' }, renderUsage);
    });

    // ---- Gemini API key (direct mode) ----
    const keyInput  = $('opt-api-key');
    const keyStatus = $('opt-key-status');

    const setKeyStatus = (text, color) => {
        if (!keyStatus) return;
        keyStatus.textContent = text;
        keyStatus.style.color = color;
    };

    if (keyInput) {
        chrome.storage.local.get('geminiApiKey', ({ geminiApiKey }) => {
            if (geminiApiKey) {
                keyInput.value = geminiApiKey;
                setKeyStatus('Key saved.', '#16a34a');
            }
        });
    }

    on('opt-save-key', 'click', async () => {
        if (!keyInput) return;
        const key = keyInput.value.trim();

        if (!key) {
            chrome.storage.local.remove('geminiApiKey');
            setKeyStatus('Key cleared.', '#78716c');
            return;
        }

        setKeyStatus('Checking…', '#78716c');
        try {
            const r = await fetch(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key='
                + encodeURIComponent(key),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: 'hi' }] }],
                        generationConfig: { maxOutputTokens: 5 }
                    })
                });
            const d = await r.json();
            if (d.error) {
                setKeyStatus('Rejected: ' + (d.error.status || d.error.code), '#dc2626');
                return;
            }
            await chrome.storage.local.set({ geminiApiKey: key });
            setKeyStatus('Key saved and verified.', '#16a34a');
        } catch (e) {
            setKeyStatus('Could not reach Gemini: ' + e.message, '#dc2626');
        }
    });

});
