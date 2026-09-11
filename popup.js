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
                <div id="file-access-warning" style="background: #fff7ed; border: 1px solid #fdba74; border-radius: 8px; padding: 12px; margin-bottom: 15px; text-align: left;">
                    <div style="font-size: 12px; font-weight: 700; color: #c2410c; margin-bottom: 6px;">⚠️ Setup Required</div>
                    <p style="font-size: 11px; color: #9a3412; margin-bottom: 8px; line-height: 1.4;">
                        To read PDFs saved on your computer, you need to enable file access.
                    </p>
                    <button id="enable-file-access-btn" class="btn" style="background: #ea580c; color: white; border: none; font-size: 12px;">
                        🔧 Enable File Access
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
                studyBtn.innerHTML = '📋 Study Sheet <span style="font-size:10px; background:#fbbf24; color:#78350f; padding:1px 6px; border-radius:4px; margin-left:4px; font-weight:700;">Coming Soon</span>';
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
