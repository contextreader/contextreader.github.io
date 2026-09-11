// extracted from options.html — MV3 CSP blocks inline scripts

// Populate version and ID
document.getElementById('opt-version').textContent = chrome.runtime.getManifest().version;
document.getElementById('opt-ext-id').textContent = chrome.runtime.id;

// Customize shortcuts link
document.getElementById('opt-customize-shortcuts').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

// Rate link
document.getElementById('opt-rate-link').href =
    `https://chromewebstore.google.com/detail/${chrome.runtime.id}`;

// Feedback link
document.getElementById('opt-feedback-link').href = 'https://discord.gg/tdwHWmmC';

// Fetch usage (server-driven)
chrome.runtime.sendMessage({ action: "getUsage" }, (response) => {
    if (response) {
        if (response.unlimited) {
            document.getElementById('opt-remaining').textContent = '\u221E';
            document.getElementById('opt-usage-label').textContent = 'Unlimited lookups (developer)';
            document.getElementById('opt-usage-bar').style.width = '0%';
            document.querySelector('.usage-circle').style.borderColor = '#22c55e';
            document.querySelector('.usage-circle .num').style.color = '#16a34a';
        } else {
            const used = response.used || 0;
            const limit = response.limit || 20;
            const remaining = Math.max(0, limit - used);

            document.getElementById('opt-remaining').textContent = remaining;
            document.getElementById('opt-usage-label').textContent =
                `${used} of ${limit} lookups used today`;
            document.getElementById('opt-usage-bar').style.width =
                `${Math.min(100, (used / limit) * 100)}%`;

            if (used >= limit) {
                document.getElementById('opt-usage-bar').style.background = '#ef4444';
                document.querySelector('.usage-circle').style.borderColor = '#ef4444';
                document.querySelector('.usage-circle .num').style.color = '#dc2626';
            }
        }
    } else {
        document.getElementById('opt-usage-label').textContent = 'Could not load usage data';
    }
});

// Refresh button — clears cached access info and re-fetches usage
document.getElementById('opt-refresh-usage').addEventListener('click', () => {
    // Clear server-side access cache in background.js
    chrome.runtime.sendMessage({ action: "clearAccessCache" });
    // Re-fetch usage
    document.getElementById('opt-usage-label').textContent = 'Refreshing...';
    chrome.runtime.sendMessage({ action: "getUsage" }, (response) => {
        if (response) {
            if (response.unlimited) {
                document.getElementById('opt-remaining').textContent = '\u221E';
                document.getElementById('opt-usage-label').textContent = 'Unlimited lookups (developer)';
                document.getElementById('opt-usage-bar').style.width = '0%';
            } else {
                const used = response.used || 0;
                const limit = response.limit || 20;
                const remaining = Math.max(0, limit - used);
                document.getElementById('opt-remaining').textContent = remaining;
                document.getElementById('opt-usage-label').textContent = `${used} of ${limit} lookups used today`;
                document.getElementById('opt-usage-bar').style.width = `${Math.min(100, (used / limit) * 100)}%`;
            }
        } else {
            document.getElementById('opt-usage-label').textContent = 'Could not load usage data';
        }
    });
});
// ---- Gemini API key (direct mode) ----
const keyInput  = document.getElementById('opt-api-key');
const keyStatus = document.getElementById('opt-key-status');

chrome.storage.local.get('geminiApiKey', ({ geminiApiKey }) => {
    if (geminiApiKey) {
        keyInput.value = geminiApiKey;
        keyStatus.textContent = 'Key saved.';
        keyStatus.style.color = '#16a34a';
    }
});

document.getElementById('opt-save-key').addEventListener('click', async () => {
    const key = keyInput.value.trim();
    if (!key) {
        chrome.storage.local.remove('geminiApiKey');
        keyStatus.textContent = 'Key cleared.';
        keyStatus.style.color = '#78716c';
        return;
    }
    keyStatus.textContent = 'Checking\u2026';
    keyStatus.style.color = '#78716c';
    try {
        const r = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key='
            + encodeURIComponent(key),
            { method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }],
                                     generationConfig: { maxOutputTokens: 5 } }) });
        const d = await r.json();
        if (d.error) {
            keyStatus.textContent = 'Rejected: ' + (d.error.status || d.error.code);
            keyStatus.style.color = '#dc2626';
            return;
        }
        await chrome.storage.local.set({ geminiApiKey: key });
        keyStatus.textContent = 'Key saved and verified.';
        keyStatus.style.color = '#16a34a';
    } catch (e) {
        keyStatus.textContent = 'Could not reach Gemini: ' + e.message;
        keyStatus.style.color = '#dc2626';
    }
});
