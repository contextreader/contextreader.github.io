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
