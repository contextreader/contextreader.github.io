// extracted from options.html — MV3 CSP blocks inline scripts
//
// Every DOM lookup is guarded. This file used to be flat top-level with no guards,
// so removing any single element from options.html threw and silently killed every
// line below it — including the API key field, the only load-bearing control here.

document.addEventListener('DOMContentLoaded', () => {

    const $ = (id) => document.getElementById(id);
    const setText = (id, text) => { const el = $(id); if (el) el.textContent = text; };
    const on = (id, evt, fn) => { const el = $(id); if (el) el.addEventListener(evt, fn); };

    // ---- About ----
    setText('opt-version', chrome.runtime.getManifest().version);
    setText('opt-ext-id', chrome.runtime.id);

    // ---- Links ----
    // Privacy Policy and Discord are plain hrefs in the HTML; nothing to wire.

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
