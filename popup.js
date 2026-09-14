document.addEventListener('DOMContentLoaded', () => {

    // 1. Get the Global Count
    chrome.runtime.sendMessage({ action: "getGlobalCount" }, (response) => {
        const countElement = document.getElementById('global-count');
        if (!countElement) return;
        if (response !== undefined && response !== null) {
            countElement.innerText = response.toLocaleString();
        } else {
            countElement.innerText = "0";
        }
    });

    // ============================================
    // 🕵️ SINGLE TAB QUERY — restricted-page detection
    // ============================================
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (!currentTab || !currentTab.url) return;
        const url = currentTab.url;

        // Check if we're on our own extension pages (options, welcome)
        const ownExtUrl = chrome.runtime.getURL('');
        const isOwnPage = url.startsWith(ownExtUrl);

        // --- Restricted Page Detection (skip our own extension pages) ---
        const isRestricted = !isOwnPage && (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:'));
        if (isRestricted) {
            const msg = document.getElementById('restricted-page-msg');
            if (msg) msg.style.display = 'block';

        }
    });

    // Link Handlers
    const settingsBtn = document.getElementById('open-settings');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
    }

    // Language switcher. Writes the same targetLanguage key Settings and the
    // welcome page use; content.js listens on storage.onChanged, so open tabs
    // follow without a reload.
    const langSelect = document.getElementById('popup-language');
    if (langSelect) {
        chrome.runtime.sendMessage({ action: 'getLanguages' }, (res) => {
            if (!res || !res.languages) return;
            langSelect.innerHTML = res.languages.map((l) =>
                `<option value="${l.code}">${l.nativeName}${l.nativeName === l.name ? '' : ' — ' + l.name}`
                + `${l.tuned ? '' : '  (community)'}</option>`).join('');
            langSelect.value = res.current;
        });
        langSelect.addEventListener('change', () => {
            chrome.runtime.sendMessage({ action: 'setLanguage', code: langSelect.value });
        });
    }

    // Dynamic version from manifest
    const versionLabel = document.getElementById('version-label');
    if (versionLabel) {
        versionLabel.textContent = 'v' + chrome.runtime.getManifest().version;
    }

});
