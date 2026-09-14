// extracted from welcome.html — MV3 CSP blocks inline scripts
        document.getElementById('start-btn').addEventListener('click', () => {
   window.close();
        });

// Step 1, the language. onInstalled has already guessed one from the browser's
// UI language; this is where the reader corrects it before their first lookup.
// Same key, messages and wording as Settings and the popup.
(() => {
    const select = document.getElementById('welcome-lang');
    const note = document.getElementById('welcome-lang-note');
    if (!select) return;

    chrome.runtime.sendMessage({ action: 'getLanguages' }, (res) => {
        if (!res || !res.languages) return;
        CRLangPicker.attach({
            select, input: document.getElementById('welcome-lang-search'),
            status: document.getElementById('welcome-lang-count'),
            note, languages: res.languages, current: res.current,
        });
    });

    select.addEventListener('change', () => {
        chrome.runtime.sendMessage({ action: 'setLanguage', code: select.value });
    });
})();

// Step 2, the key. Without one, the first lookup is a "key needed" card — so
// say plainly whether this step is done, and notice when Settings finishes it.
(() => {
    const btn = document.getElementById('welcome-open-settings');
    const status = document.getElementById('welcome-key-status');
    if (!btn || !status) return;

    btn.addEventListener('click', () => chrome.runtime.openOptionsPage());

    function refresh() {
        chrome.runtime.sendMessage({ action: 'getKeyState' }, (ks) => {
            const done = !!(ks && ks.hasKey);
            status.textContent = done ? '✓ Key added. You’re set.' : 'No key yet — lookups will ask for one.';
            status.classList.toggle('ok', done);
        });
    }
    refresh();
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && (changes.geminiApiKey || changes.geminiApiKeyEnc)) refresh();
    });
})();
