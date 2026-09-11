document.addEventListener('DOMContentLoaded', () => {

    // 1. WORKER CONFIGURATION
    if (typeof pdfjsLib !== 'undefined') {
        try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.js');
        } catch (e) {
            console.error("Worker config error:", e);
        }
    }

    // 2. DOM ELEMENTS
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const viewer = document.getElementById('viewer-content');
    const loading = document.getElementById('loading-bar');
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-sidebar');
    const mainScroll = document.getElementById('main-scroll');

    // Toolbar elements
    const navControls = document.getElementById('nav-controls');
    const zoomControls = document.getElementById('zoom-controls');
    const controlsDivider = document.getElementById('controls-divider');
    const pageInput = document.getElementById('page-input');
    const pageTotal = document.getElementById('page-total');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomFitBtn = document.getElementById('zoom-fit');
    const zoomLevelLabel = document.getElementById('zoom-level');
    const toggleSearchBtn = document.getElementById('toggle-search');
    const debugToggle = document.getElementById('debug-toggle');

    // Sidebar elements
    const sidebarTabs = document.querySelectorAll('.sidebar-tab');
    const sidebarPanels = document.querySelectorAll('.sidebar-panel');
    const thumbnailGrid = document.getElementById('thumbnail-grid');
    const outlineContent = document.getElementById('outline-content');
    const searchInput = document.getElementById('search-input');
    const searchStatus = document.getElementById('search-status');
    const searchResults = document.getElementById('search-results');

    // 3. STATE
    let pdfDoc = null;
    let totalPages = 0;
    let currentPage = 1;
    let currentScale = 1.5; // base scale for rendering
    const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    let zoomIndex = 4; // starts at 1.5 (index 4 → 150% display since baseScale=1.0 maps to 100%)
    let pageObserver = null;
    let searchTimeout = null;
    let textContentCache = {}; // page number → text items
    let pdfiumReady = false; // PDFium WASM initialized and document loaded

    // 3. EVENT LISTENERS — Upload
    if (uploadZone) {
        uploadZone.addEventListener('click', () => fileInput.click());
        uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.style.borderColor = '#fbbf24'; });
        uploadZone.addEventListener('dragleave', () => { uploadZone.style.borderColor = ''; });
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files[0]) loadFromFile(e.dataTransfer.files[0]);
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) loadFromFile(e.target.files[0]);
        });
    }

    // Sidebar toggle
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            toggleBtn.classList.toggle('active', sidebar.classList.contains('open'));
        });
    }

    // Sidebar tabs
    sidebarTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            sidebarTabs.forEach(t => t.classList.remove('active'));
            sidebarPanels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`panel-${target}`).classList.add('active');

            if (target === 'search') {
                setTimeout(() => searchInput.focus(), 100);
            }
        });
    });

    // Page navigation
    prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
    nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
    pageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const num = parseInt(pageInput.value, 10);
            if (num >= 1 && num <= totalPages) {
                goToPage(num);
            } else {
                pageInput.value = currentPage;
            }
        }
    });
    pageInput.addEventListener('blur', () => {
        pageInput.value = currentPage;
    });

    // Zoom controls
    zoomInBtn.addEventListener('click', () => zoomStep(1));
    zoomOutBtn.addEventListener('click', () => zoomStep(-1));
    zoomFitBtn.addEventListener('click', fitToWidth);

    // Search toggle (header button)
    toggleSearchBtn.addEventListener('click', () => {
        if (!sidebar.classList.contains('open')) {
            sidebar.classList.add('open');
            toggleBtn.classList.add('active');
        }
        // Switch to search tab
        sidebarTabs.forEach(t => t.classList.remove('active'));
        sidebarPanels.forEach(p => p.classList.remove('active'));
        document.querySelector('[data-tab="search"]').classList.add('active');
        document.getElementById('panel-search').classList.add('active');
        setTimeout(() => searchInput.focus(), 150);
    });

    // Search input
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => performSearch(searchInput.value.trim()), 300);
    });

    // Debug toggle
    if (debugToggle) {
        debugToggle.addEventListener('change', () => {
            document.body.classList.toggle('debug-mode', debugToggle.checked);
        });
    }

    // New File button — reset state and show upload zone
    const newFileBtn = document.getElementById('new-file-btn');
    if (newFileBtn) {
        newFileBtn.addEventListener('click', () => {
            // Clear URL param
            history.replaceState(null, '', window.location.pathname);
            // Reset state
            pdfDoc = null;
            totalPages = 0;
            currentPage = 1;
            textContentCache = {};
            if (pageObserver) { pageObserver.disconnect(); pageObserver = null; }
            // Cleanup PDFium
            try { if (typeof PdfiumTextLayer !== 'undefined') PdfiumTextLayer.destroy(); } catch(e) {}
            pdfiumReady = false;
            // Reset UI
            viewer.innerHTML = '';
            if (uploadZone) uploadZone.style.display = '';
            if (loading) loading.style.display = 'none';
            if (navControls) navControls.style.display = 'none';
            if (zoomControls) zoomControls.style.display = 'none';
            if (controlsDivider) controlsDivider.style.display = 'none';
            if (toggleSearchBtn) toggleSearchBtn.style.display = 'none';
            if (thumbnailGrid) thumbnailGrid.innerHTML = '';
            if (outlineContent) outlineContent.innerHTML = '';
            if (sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                toggleBtn.classList.remove('active');
            }
            // Reset file input so same file can be re-selected
            if (fileInput) fileInput.value = '';
        });
    }

    // Auto-load from URL param — hide upload zone immediately to prevent flash
    const urlParams = new URLSearchParams(window.location.search);
    const fileUrl = urlParams.get('file');
    if (fileUrl) {
        if (uploadZone) uploadZone.style.display = 'none';
        if (loading) loading.style.display = 'flex';
        loadFromUrl(fileUrl);
    }


    // === KEYBOARD SHORTCUTS ===
    document.addEventListener('keydown', (e) => {
        if (!pdfDoc) return;

        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modKey = isMac ? e.metaKey : e.ctrlKey;

        // Ctrl/Cmd+F — open search
        if (modKey && e.key === 'f') {
            e.preventDefault();
            toggleSearchBtn.click();
            return;
        }

        // Don't handle shortcuts when typing in inputs or when bubble is active
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        const shadowHost = document.getElementById('smart-reader-shadow-host');
        if (shadowHost) {
            const bubble = shadowHost.shadowRoot?.getElementById('smart-reader-bubble');
            if (bubble && bubble.style.display !== 'none') return;
        }

        // Arrow keys / PageUp/PageDown — navigate pages
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            e.preventDefault();
            goToPage(currentPage - 1);
        } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
            e.preventDefault();
            goToPage(currentPage + 1);
        }

        // +/- — zoom
        if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            zoomStep(1);
        } else if (e.key === '-') {
            e.preventDefault();
            zoomStep(-1);
        }

        // Escape — close sidebar
        if (e.key === 'Escape') {
            if (sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                toggleBtn.classList.remove('active');
            }
        }
    });


    // === CORE LOGIC ===

    async function loadFromFile(blob) {
        if (uploadZone) uploadZone.style.display = 'none';
        const loadingText = document.getElementById('loading-text');
        if (loading) { loading.style.display = 'flex'; if (loadingText) loadingText.textContent = 'Preparing your study material...'; }
        while (viewer.firstChild) viewer.removeChild(viewer.firstChild);
        thumbnailGrid.innerHTML = '';
        textContentCache = {};
        window._pdfTextCache = textContentCache;

        try {
            const buffer = await blob.arrayBuffer();
            // Copy buffer before PDF.js detaches it (PDF.js transfers the ArrayBuffer)
            const pdfiumBuffer = buffer.slice(0);
            const loadingTask = pdfjsLib.getDocument({
                data: new Uint8Array(buffer),
                cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
                cMapPacked: true,
                standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/'
            });
            pdfDoc = await loadingTask.promise;
            totalPages = pdfDoc.numPages;

            // Initialize PDFium WASM for correct Sinhala text extraction
            try {
                if (typeof PdfiumTextLayer !== 'undefined') {
                    await PdfiumTextLayer.init();
                    await PdfiumTextLayer.loadDocument(pdfiumBuffer);
                    pdfiumReady = true;
                }
            } catch (e) {
                console.warn('[PDFium] Failed to init, falling back to PDF.js text layer:', e);
                pdfiumReady = false;
            }

            // Show toolbar controls
            navControls.classList.add('visible');
            zoomControls.classList.add('visible');
            controlsDivider.style.display = '';
            toggleBtn.style.display = '';
            toggleSearchBtn.style.display = '';
            pageTotal.textContent = totalPages;
            pageInput.value = 1;
            updateZoomLabel();

            if (loading) loading.style.display = 'none';

            // Render all pages
            for (let i = 1; i <= totalPages; i++) {
                await renderPage(pdfDoc, i);
            }

            // Setup IntersectionObserver for page tracking
            setupPageObserver();

            // Render thumbnails (in background, non-blocking)
            renderThumbnails(pdfDoc);

            // Render outline
            await renderOutline(pdfDoc);

            // Open sidebar with thumbnails by default
            sidebar.classList.add('open');
            toggleBtn.classList.add('active');

        } catch (error) {
            console.error(error);
            if (loading) loading.innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
        }
    }

    async function renderPage(pdf, pageNumber) {
        const page = await pdf.getPage(pageNumber);

        const viewport = page.getViewport({ scale: currentScale });
        const outputScale = window.devicePixelRatio || 1;

        // Wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'pdf-page-wrapper';
        wrapper.id = `page-${pageNumber}`;
        wrapper.dataset.page = pageNumber;
        wrapper.style.width = `${viewport.width}px`;
        wrapper.style.height = `${viewport.height}px`;
        wrapper.style.setProperty('--scale-factor', currentScale);

        // Canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        wrapper.appendChild(canvas);

        // Text Layer
        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;
        wrapper.appendChild(textLayerDiv);

        viewer.appendChild(wrapper);

        // Page label below page
        const label = document.createElement('div');
        label.className = 'page-label';
        label.textContent = `Page ${pageNumber} of ${totalPages}`;
        viewer.appendChild(label);

        // Render canvas
        const transform = outputScale !== 1
            ? [outputScale, 0, 0, outputScale, 0, 0]
            : null;

        await page.render({
            canvasContext: context,
            viewport: viewport,
            transform: transform
        }).promise;

        // Render text layer
        const textContent = await page.getTextContent({ disableNormalization: false });

        // --- Legacy Sinhala font detection & conversion ---
        const LEGACY_FONT_MAP = [
            { patterns: ['FMAbhaya', 'FM-Abhaya', 'FM Abhaya', 'Abhaya', 'FMAb'], converter: typeof fmAbayaToUnicode === 'function' ? fmAbayaToUnicode : null },
            { patterns: ['DLManel', 'DL-Manel', 'DL Manel', 'Manel'], converter: typeof dlManelToUnicode === 'function' ? dlManelToUnicode : null },
            { patterns: ['Kaputa'], converter: typeof kaputaToUnicode === 'function' ? kaputaToUnicode : null },
            { patterns: ['Bamini'], converter: typeof baminiToUnicode === 'function' ? baminiToUnicode : null },
            { patterns: ['Amalee'], converter: typeof amaleeToUnicode === 'function' ? amaleeToUnicode : null },
            { patterns: ['Thibus'], converter: typeof thibusToUnicode === 'function' ? thibusToUnicode : null },
        ];

        // Build a fontName → converter lookup for this page
        const fontConverterMap = {};
        let hasLegacySinhala = false;

        for (const item of textContent.items) {
            if (!item.fontName || fontConverterMap[item.fontName] !== undefined) continue;

            // Try to get the actual font name from PDF.js common objects
            let actualFontName = item.fontName;
            try {
                const fontObj = page.commonObjs.get(item.fontName);
                if (fontObj && fontObj.name) actualFontName = fontObj.name;
            } catch (e) { /* font object not available, use raw fontName */ }

            // Check against known legacy font patterns
            let matched = null;
            for (const entry of LEGACY_FONT_MAP) {
                if (!entry.converter) continue;
                for (const pattern of entry.patterns) {
                    if (actualFontName.toLowerCase().includes(pattern.toLowerCase())) {
                        matched = entry.converter;
                        break;
                    }
                }
                if (matched) break;
            }
            fontConverterMap[item.fontName] = matched; // null means not legacy
            if (matched) hasLegacySinhala = true;
        }

        // Convert legacy-encoded text items in-place before rendering the text layer
        if (hasLegacySinhala) {
            for (const item of textContent.items) {
                const converter = fontConverterMap[item.fontName];
                if (converter && item.str) {
                    item.str = converter(item.str);
                }
            }
        }

        // Check if page has Sinhala text
        const hasSinhala = textContent.items.some(item => /[\u0D80-\u0DFF]/.test(item.str));

        if (pdfiumReady && (hasSinhala || hasLegacySinhala)) {
            // Use PDFium for correct Sinhala text extraction
            try {
                // Debug: log PDFium vs PDF.js line counts for page 1
                if (pageNumber === 1) {
                    const debugText = PdfiumTextLayer.getPageText(0);
                    const pdfiumLineCount = debugText.split(/\r?\n/).filter(l => l.trim().length > 0).length;
                    console.log(`[PDFium Debug] Page 1: PDFium lines=${pdfiumLineCount}, first 3 lines:`);
                    debugText.split(/\r?\n/).filter(l => l.trim()).slice(0, 3).forEach((l, i) => console.log(`  PDFium[${i}]: "${l.substring(0, 80)}..."`));
                }

                PdfiumTextLayer.buildTextLayer(pageNumber, textLayerDiv, viewport, textContent);

                // Update cache with correct PDFium text for search/study sheet
                const correctText = PdfiumTextLayer.getPageText(pageNumber - 1);
                textContentCache[pageNumber] = {
                    items: correctText.split('\n').filter(l => l.trim()).map(line => ({
                        str: line, dir: 'ltr', width: 0, height: 0,
                        transform: [1,0,0,1,0,0], fontName: '', hasEOL: true
                    })),
                    styles: textContent.styles
                };
                window._pdfTextCache = textContentCache;
            } catch (e) {
                console.warn(`[PDFium] Failed for page ${pageNumber}, falling back:`, e);
                textContentCache[pageNumber] = textContent;
                window._pdfTextCache = textContentCache;
                const textLayerRender = pdfjsLib.renderTextLayer({
                    textContent: textContent,
                    container: textLayerDiv,
                    viewport: viewport,
                    textDivs: []
                });
                await textLayerRender.promise;
            }
        } else {
            // Non-Sinhala pages or PDFium not available: use PDF.js text layer
            textContentCache[pageNumber] = textContent;
            window._pdfTextCache = textContentCache;
            const textLayerRender = pdfjsLib.renderTextLayer({
                textContent: textContent,
                container: textLayerDiv,
                viewport: viewport,
                textDivs: []
            });
            await textLayerRender.promise;
        }

        // Apply Sinhala font to spans — covers both Unicode Sinhala and converted legacy text
        if (hasLegacySinhala) {
            textLayerDiv.querySelectorAll('span').forEach(span => {
                span.style.fontFamily = "'Noto Sans Sinhala', serif, sans-serif";
            });
        } else {
            textLayerDiv.querySelectorAll('span').forEach(span => {
                if (/[\u0D80-\u0DFF]/.test(span.textContent)) {
                    span.style.fontFamily = "'Noto Sans Sinhala', serif, sans-serif";
                }
            });
        }
    }


    // === ZOOM ===

    function zoomStep(direction) {
        const newIndex = zoomIndex + direction;
        if (newIndex < 0 || newIndex >= ZOOM_LEVELS.length) return;
        zoomIndex = newIndex;
        currentScale = ZOOM_LEVELS[zoomIndex];
        updateZoomLabel();
        reRenderAllPages();
    }

    function fitToWidth() {
        if (!pdfDoc) return;
        // Get the first page to calculate fit scale
        pdfDoc.getPage(1).then(page => {
            const unscaledViewport = page.getViewport({ scale: 1.0 });
            const scrollWidth = mainScroll.clientWidth - 68; // account for padding
            const fitScale = scrollWidth / unscaledViewport.width;

            // Find closest zoom level or use exact
            currentScale = fitScale;
            // Find closest index for label display
            let closest = 0;
            let minDiff = Infinity;
            ZOOM_LEVELS.forEach((level, i) => {
                const diff = Math.abs(level - fitScale);
                if (diff < minDiff) { minDiff = diff; closest = i; }
            });
            zoomIndex = closest;
            updateZoomLabel();
            reRenderAllPages();
        });
    }

    function updateZoomLabel() {
        const pct = Math.round(currentScale * 100);
        zoomLevelLabel.textContent = `${pct}%`;
    }

    async function reRenderAllPages() {
        if (!pdfDoc) return;

        // Remember current page position
        const targetPage = currentPage;

        // Show loading during re-render
        const loadingText = document.getElementById('loading-text');
        if (loading) { loading.style.display = 'flex'; if (loadingText) loadingText.textContent = 'Adjusting view...'; }
        viewer.style.opacity = '0.3';

        // Clear viewer children safely
        while (viewer.firstChild) viewer.removeChild(viewer.firstChild);
        textContentCache = {};
        window._pdfTextCache = textContentCache;

        for (let i = 1; i <= totalPages; i++) {
            await renderPage(pdfDoc, i);
        }

        // Hide loading
        if (loading) loading.style.display = 'none';
        viewer.style.opacity = '1';

        // Re-setup observer
        setupPageObserver();

        // Scroll back to the page we were on
        goToPage(targetPage, false);

        // Re-render thumbnails active state
        updateThumbnailActive(targetPage);
    }


    // === PAGE NAVIGATION ===

    function goToPage(num, smooth = true) {
        if (num < 1 || num > totalPages) return;
        const target = document.getElementById(`page-${num}`);
        if (target) {
            target.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'start' });
        }
    }

    function setCurrentPage(num) {
        if (num === currentPage) return;
        currentPage = num;
        pageInput.value = num;
        updateThumbnailActive(num);
    }

    function setupPageObserver() {
        if (pageObserver) pageObserver.disconnect();

        pageObserver = new IntersectionObserver((entries) => {
            // Find the most visible page
            let bestEntry = null;
            let bestRatio = 0;
            entries.forEach(entry => {
                if (entry.intersectionRatio > bestRatio) {
                    bestRatio = entry.intersectionRatio;
                    bestEntry = entry;
                }
            });
            if (bestEntry && bestEntry.isIntersecting) {
                const pageNum = parseInt(bestEntry.target.dataset.page, 10);
                if (pageNum) setCurrentPage(pageNum);
            }
        }, {
            root: mainScroll,
            threshold: [0, 0.25, 0.5, 0.75, 1.0]
        });

        document.querySelectorAll('.pdf-page-wrapper').forEach(el => {
            pageObserver.observe(el);
        });
    }


    // === THUMBNAILS ===

    async function renderThumbnails(pdf) {
        thumbnailGrid.innerHTML = '';

        for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.getPage(i);
            const thumbScale = 0.3; // small preview
            const viewport = page.getViewport({ scale: thumbScale });

            const item = document.createElement('div');
            item.className = 'thumbnail-item';
            if (i === 1) item.classList.add('active');
            item.dataset.page = i;

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            item.appendChild(canvas);

            const label = document.createElement('div');
            label.className = 'thumbnail-label';
            label.textContent = i;
            item.appendChild(label);

            item.addEventListener('click', () => goToPage(i));

            thumbnailGrid.appendChild(item);

            // Render thumbnail canvas
            await page.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;
        }
    }

    function updateThumbnailActive(pageNum) {
        document.querySelectorAll('.thumbnail-item').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.page, 10) === pageNum);
        });

        // Scroll active thumbnail into view in sidebar
        const activeThumb = document.querySelector('.thumbnail-item.active');
        if (activeThumb) {
            activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }


    // === OUTLINE ===

    async function renderOutline(pdf) {
        const outline = await pdf.getOutline();

        if (!outline || outline.length === 0) return;

        // Clear default empty message
        outlineContent.innerHTML = '';

        function buildTree(items, container, level = 0) {
            items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'outline-item';
                div.innerText = item.title;
                div.style.paddingLeft = (15 + (level * 15)) + 'px';

                div.addEventListener('click', async () => {
                    let dest = item.dest;
                    if (typeof dest === 'string') {
                        dest = await pdf.getDestination(dest);
                    }
                    if (dest) {
                        const pageIndex = await pdf.getPageIndex(dest[0]);
                        goToPage(pageIndex + 1);
                    }
                });
                container.appendChild(div);

                if (item.items && item.items.length > 0) {
                    buildTree(item.items, container, level + 1);
                }
            });
        }

        buildTree(outline, outlineContent);
    }


    // === TEXT SEARCH ===

    async function performSearch(query) {
        searchResults.innerHTML = '';
        searchStatus.classList.remove('visible');
        clearSearchHighlights();

        if (!query || query.length < 2 || !pdfDoc) return;

        searchStatus.textContent = 'Searching...';
        searchStatus.classList.add('visible');

        const results = [];
        const lowerQuery = query.toLowerCase();

        for (let i = 1; i <= totalPages; i++) {
            // Get text content (use cache if available)
            let textContent = textContentCache[i];
            if (!textContent) {
                const page = await pdfDoc.getPage(i);
                textContent = await page.getTextContent();
                textContentCache[i] = textContent;
            }

            // Concatenate all text items for this page
            const pageText = textContent.items.map(item => item.str).join(' ');
            const lowerPageText = pageText.toLowerCase();

            // Find all matches on this page
            let searchIdx = 0;
            while (true) {
                const matchIdx = lowerPageText.indexOf(lowerQuery, searchIdx);
                if (matchIdx === -1) break;

                // Extract snippet
                const snippetStart = Math.max(0, matchIdx - 40);
                const snippetEnd = Math.min(pageText.length, matchIdx + query.length + 40);
                let snippet = pageText.substring(snippetStart, snippetEnd);
                if (snippetStart > 0) snippet = '...' + snippet;
                if (snippetEnd < pageText.length) snippet = snippet + '...';

                results.push({
                    page: i,
                    snippet: snippet,
                    matchStart: matchIdx - snippetStart + (snippetStart > 0 ? 3 : 0),
                    query: query
                });

                searchIdx = matchIdx + 1;
            }
        }

        // Display results
        if (results.length === 0) {
            searchStatus.textContent = 'No results found';
            return;
        }

        searchStatus.textContent = `${results.length} result${results.length !== 1 ? 's' : ''} found`;

        results.forEach(result => {
            const item = document.createElement('div');
            item.className = 'search-result-item';

            const pageLabel = document.createElement('div');
            pageLabel.className = 'search-result-page';
            pageLabel.textContent = `Page ${result.page}`;

            const snippetEl = document.createElement('div');
            snippetEl.className = 'search-result-snippet';

            // Highlight the match in snippet
            const escaped = escapeHtml(result.snippet);
            const escapedQuery = escapeHtml(result.query);
            const regex = new RegExp(`(${escapeRegex(escapedQuery)})`, 'gi');
            snippetEl.innerHTML = escaped.replace(regex, '<mark>$1</mark>');

            item.appendChild(pageLabel);
            item.appendChild(snippetEl);

            item.addEventListener('click', () => {
                goToPage(result.page);
            });

            searchResults.appendChild(item);
        });
    }

    function clearSearchHighlights() {
        document.querySelectorAll('.search-match-highlight').forEach(el => el.remove());
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }


    // === LOAD FROM URL ===

    async function loadFromUrl(url) {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            loadFromFile(blob);
        } catch (e) {
            console.error(e);
        }
    }
});
