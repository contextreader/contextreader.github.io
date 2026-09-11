document.addEventListener('DOMContentLoaded', () => {

    // 1. Get the Global Count
    chrome.runtime.sendMessage({ action: "getGlobalCount" }, (response) => {
        const countElement = document.getElementById('global-count');
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

            // Disable study sheet button on restricted pages
            const studyBtn = document.getElementById('study-sheet-btn');
            if (studyBtn) {
                studyBtn.disabled = true;
                studyBtn.style.opacity = '0.5';
                studyBtn.style.cursor = 'not-allowed';
                studyBtn.title = 'Navigate to a webpage first';
            }
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

    // Usage limits display (server-driven)
    const usageText = document.getElementById('usage-text');
    const usageBar = document.getElementById('usage-bar');
    chrome.runtime.sendMessage({ action: "getUsage" }, (response) => {
        if (response && usageText && usageBar) {
            if (response.unlimited) {
                usageText.innerText = 'Unlimited (dev)';
                usageBar.style.width = '0%';
            } else {
                const used = response.used || 0;
                const limit = response.limit || 30;
                const remaining = response.remaining !== undefined ? response.remaining : (limit - used);
                usageText.innerText = `${remaining} / ${limit} remaining`;
                usageBar.style.width = `${Math.min(100, (used / limit) * 100)}%`;
                if (used >= limit) {
                    usageBar.style.background = '#ef4444';
                    usageText.style.color = '#dc2626';
                }
            }
        }
    });

    // Study Sheet button — check access for gating
    const studyBtn = document.getElementById('study-sheet-btn');
    if (studyBtn) {
        chrome.runtime.sendMessage({ action: "getAccessInfo" }, (access) => {
            if (access && !access.studySheet) {
                // Non-dev user: show "Coming Soon" badge
                studyBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1Z"/><path d="M16 5h2a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 18 21H6a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 6 5h2"/><path d="M8.5 11.5h7M8.5 15.5h4.5"/></svg> Study Sheet <span class="badge">Coming Soon</span>`;
                studyBtn.style.opacity = '0.75';
            }
        });

        studyBtn.addEventListener('click', () => {
            if (studyBtn.disabled) return;
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "triggerStudySheet",
                        hasSelection: false
                    });
                    window.close();
                }
            });
        });
    }

    // 2. Link Handlers
    const discordBtn = document.getElementById('join-discord');
    if (discordBtn) {
        discordBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: "https://discord.gg/tdwHWmmC" });
        });
    }

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

    // Feedback link
    const feedbackLink = document.getElementById('feedback-link');
    if (feedbackLink) {
        feedbackLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: "https://forms.gle/1uj8V6fZfmCfL65x8" });
        });
    }
});
