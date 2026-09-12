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
    // 🕵️ SINGLE TAB QUERY — PDF Detection + Restricted Page + Study Sheet
    // ============================================
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (!currentTab || !currentTab.url) return;
        const url = currentTab.url;
        const lowerUrl = url.toLowerCase();

        // Check if we're on our own extension pages (PDF reader, options, welcome)
        const ownExtUrl = chrome.runtime.getURL('');
        const isOwnPage = url.startsWith(ownExtUrl);

        // --- PDF Detection (skip if already on our PDF reader) ---
        if (!isOwnPage) {
            let isPdf = false;
            try {
                const parsedUrl = new URL(lowerUrl);
                isPdf = parsedUrl.pathname.endsWith('.pdf');
            } catch (e) {
                // URL parsing failed
            }
            // Fallback: check raw URL string
            if (!isPdf) {
                isPdf = lowerUrl.endsWith('.pdf') || (lowerUrl.startsWith('file:') && lowerUrl.includes('.pdf'));
            }
            // Extra fallback: .pdf followed by query/hash/end
            if (!isPdf) {
                isPdf = /\.pdf([?#]|$)/i.test(lowerUrl);
            }

            if (isPdf) {
                const pdfBox = document.getElementById('pdf-alert-box');
                const openBtn = document.getElementById('open-pdf-btn');

                if (pdfBox) pdfBox.style.display = "block";

                if (openBtn) {
                    openBtn.addEventListener('click', () => {
                        const viewerUrl = chrome.runtime.getURL("pdf-reader.html") + "?file=" + encodeURIComponent(currentTab.url);
                        chrome.tabs.create({ url: viewerUrl });
                    });
                }
            }
        }

        // --- Restricted Page Detection (skip our own extension pages) ---
        const isRestricted = !isOwnPage && (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:'));
        if (isRestricted) {
            const msg = document.getElementById('restricted-page-msg');
            if (msg) msg.style.display = 'block';

        }
    });

    // ============================================
    // ⚠️ CHECK FILE ACCESS (For Local PDFs)
    // ============================================
    chrome.extension.isAllowedFileSchemeAccess((isAllowed) => {
        if (!isAllowed) {
            const warningHTML = `
                <div id="file-access-warning" class="notice" style="background: rgba(255,247,237,0.78); border: 1px solid rgba(253,186,116,0.85);">
                    <div class="notice-title" style="color:#c2410c;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.9 18.2A1.5 1.5 0 0 0 3.2 20.5h17.6a1.5 1.5 0 0 0 1.3-2.3L13.7 3.9a1.5 1.5 0 0 0-2.6 0Z"/><path d="M12 9.5v4M12 17h.01"/></svg>
                        Setup Required
                    </div>
                    <p style="color:#9a3412; margin:0 0 8px;">
                        To read PDFs saved on your computer, you need to enable file access.
                    </p>
                    <button id="enable-file-access-btn" class="btn btn-primary" style="font-size:12px;">
                        Enable File Access
                    </button>
                </div>
            `;

            const container = document.querySelector('.counter-card');
            if (container) {
                container.insertAdjacentHTML('beforebegin', warningHTML);
            }

            setTimeout(() => {
                const enableBtn = document.getElementById('enable-file-access-btn');
                if (enableBtn) {
                    enableBtn.addEventListener('click', () => {
                        chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
                    });
                }
            }, 100);
        }
    });

    // Link Handlers
    const settingsBtn = document.getElementById('open-settings');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
    }

    // Dynamic version from manifest
    const versionLabel = document.getElementById('version-label');
    if (versionLabel) {
        versionLabel.textContent = 'v' + chrome.runtime.getManifest().version;
    }

});
