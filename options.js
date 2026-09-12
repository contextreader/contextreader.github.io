// extracted from options.html — MV3 CSP blocks inline scripts
//
// Every DOM lookup is guarded. This file used to be flat top-level with no
// guards, so removing any single element from options.html threw and silently
// killed every line below it — including the API key field, the only
// load-bearing control here.

document.addEventListener('DOMContentLoaded', () => {

    const $       = (id) => document.getElementById(id);
    const setText = (id, text) => { const el = $(id); if (el) el.textContent = text; };
    const on      = (id, evt, fn) => { const el = $(id); if (el) el.addEventListener(evt, fn); };

    const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);

    const send = (msg) => new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));

    const status = (id, text, tone) => {
        const el = $(id);
        if (!el) return;
        el.textContent = text;
        el.style.color = tone === 'ok'   ? 'var(--green)'
                       : tone === 'bad'  ? 'var(--red)'
                       : 'var(--ink-mute)';
    };

    const CUSTOM_MODEL = '__custom__';

    // ---- About ----
    setText('opt-version', chrome.runtime.getManifest().version);
    setText('opt-ext-id', chrome.runtime.id);

    // ---- Links ----
    // Privacy Policy and Discord are plain hrefs in the HTML; nothing to wire.

    // ============================================
    // Gemini API key
    // ============================================
    const keyInput = $('opt-api-key');

    const setKeyStatus = (text, tone) => status('opt-key-status', text, tone);

    if (keyInput) {
        chrome.storage.local.get('geminiApiKey', ({ geminiApiKey }) => {
            if (geminiApiKey) {
                keyInput.value = geminiApiKey;
                setKeyStatus('Key saved.', 'ok');
            }
        });
    }

    on('opt-save-key', 'click', async () => {
        if (!keyInput) return;
        const key = keyInput.value.trim();

        if (!key) {
            chrome.storage.local.remove('geminiApiKey');
            setKeyStatus('Key cleared.');
            return;
        }

        // Verify by listing models rather than generating: it proves the key
        // works, costs no generateContent quota, and fills the dropdown.
        setKeyStatus('Checking…');
        const res = await send({ action: 'listModels', apiKey: key });
        if (!res || !res.ok) {
            setKeyStatus('Rejected: ' + ((res && res.error) || 'unreachable'), 'bad');
            return;
        }
        await chrome.storage.local.set({ geminiApiKey: key });
        setKeyStatus(`Key saved and verified — ${res.models.length} models available.`, 'ok');
        renderModelOptions(res.models);
    });

    // ============================================
    // Model
    // ============================================
    let modelPref = null;

    // flash-lite first, then flash, then the rest. Google does not report which
    // models are on a given key's free tier, so this is an ordering hint, not a
    // claim about tiers.
    function modelRank(id) {
        if (id.includes('flash-lite')) return 0;
        if (id.includes('flash')) return 1;
        return 2;
    }

    function renderModelOptions(models) {
        const sel = $('opt-model');
        if (!sel) return;

        const current = modelPref ? modelPref.selected : '';
        const list = (models || []).slice().sort((a, b) =>
            modelRank(a.id) - modelRank(b.id) || a.id.localeCompare(b.id));

        let html = '';
        for (const m of list) {
            const isDefault = m.id === (modelPref && modelPref.defaultModel);
            html += `<option value="${esc(m.id)}">${esc(m.id)}${isDefault ? '  (default)' : ''}</option>`;
        }
        // A previously-chosen model that this key can no longer reach must stay
        // visible, or opening Settings would silently reassign it.
        if (current && current !== CUSTOM_MODEL && !list.some((m) => m.id === current)) {
            html += `<option value="${esc(current)}">${esc(current)}  (unavailable)</option>`;
        }
        html += `<option value="${CUSTOM_MODEL}">Custom…</option>`;

        sel.innerHTML = html;
        sel.value = current || (modelPref && modelPref.defaultModel) || '';
        syncCustomRow();
    }

    function syncCustomRow() {
        const sel = $('opt-model');
        const row = $('opt-model-custom-row');
        if (sel && row) row.hidden = sel.value !== CUSTOM_MODEL;
    }

    async function persistModel() {
        const sel = $('opt-model');
        const custom = $('opt-model-custom');
        const paid = $('opt-paid-plan');
        if (!sel) return;

        const pref = {
            selected: sel.value,
            custom: custom ? custom.value.trim() : '',
            paidPlan: !!(paid && paid.checked)
        };
        if (pref.selected === CUSTOM_MODEL && !pref.custom) {
            status('opt-model-status', 'Enter a model id.', 'bad');
            return;
        }
        await send({ action: 'setModelConfig', pref });
        const cfg = await send({ action: 'getModelConfig' });
        if (cfg) {
            modelPref = Object.assign({}, cfg.pref, { defaultModel: cfg.defaultModel });
            setText('opt-about-model', cfg.model);
            status('opt-model-status', `Using ${cfg.model}.`, 'ok');
        }
        renderPerf();
    }

    async function initModel() {
        const cfg = await send({ action: 'getModelConfig' });
        if (!cfg) return;
        modelPref = Object.assign({}, cfg.pref, { defaultModel: cfg.defaultModel });

        setText('opt-about-model', cfg.model);
        const paid = $('opt-paid-plan');
        if (paid) paid.checked = !!cfg.paidPlan;
        const custom = $('opt-model-custom');
        if (custom) custom.value = cfg.pref.custom || '';

        // Show something immediately from cache; refresh in the background.
        const { modelListCache } = await chrome.storage.local.get('modelListCache');
        if (modelListCache && Array.isArray(modelListCache.models) && modelListCache.models.length) {
            renderModelOptions(modelListCache.models);
        } else {
            renderModelOptions([{ id: cfg.model }]);
        }
        refreshModels({ quiet: true });
    }

    async function refreshModels(opts) {
        const quiet = opts && opts.quiet;
        if (!quiet) status('opt-model-status', 'Fetching…');
        const res = await send({ action: 'listModels' });
        if (!res || !res.ok) {
            if (res && res.error === 'no_key') {
                status('opt-model-status', 'Add an API key to load the model list.', quiet ? '' : 'bad');
            } else if (!quiet) {
                status('opt-model-status', 'Could not fetch: ' + ((res && res.error) || 'unreachable'), 'bad');
            }
            return;
        }
        await chrome.storage.local.set({ modelListCache: { ts: Date.now(), models: res.models } });
        renderModelOptions(res.models);
        status('opt-model-status', `${res.models.length} models available.`, quiet ? '' : 'ok');
    }

    on('opt-model', 'change', () => { syncCustomRow(); persistModel(); });
    on('opt-model-custom', 'change', persistModel);
    on('opt-paid-plan', 'change', persistModel);
    on('opt-model-refresh', 'click', () => refreshModels({}));

    // ============================================
    // Model performance
    // ============================================
    let perfDays = 7;

    function setRange(days) {
        perfDays = days;
        const b7 = $('opt-perf-7'), b30 = $('opt-perf-30');
        if (b7)  b7.setAttribute('aria-pressed', String(days === 7));
        if (b30) b30.setAttribute('aria-pressed', String(days === 30));
        renderPerf();
    }

    on('opt-perf-7', 'click', () => setRange(7));
    on('opt-perf-30', 'click', () => setRange(30));

    function dayKeys(n) {
        const out = [];
        const now = Date.now();
        for (let i = n - 1; i >= 0; i--) {
            out.push(new Date(now - i * 86400000).toISOString().slice(0, 10));
        }
        return out;
    }

    async function renderPerf() {
        const body = $('opt-perf-body');
        if (!body) return;

        const res = await send({ action: 'getLatencyDaily' });
        const daily = (res && res.daily) || {};
        const days = dayKeys(perfDays);

        // one row per model that has data anywhere in the window
        const models = new Set();
        for (const d of days) for (const m of Object.keys(daily[d] || {})) models.add(m);

        if (!models.size) {
            body.innerHTML = '<div class="empty-note">No lookups recorded yet. '
                           + 'Run a few and this fills in.</div>';
            return;
        }

        const rows = [];
        for (const m of models) {
            let count = 0, sum = 0;
            const perDay = days.map((d) => {
                const c = (daily[d] || {})[m];
                if (!c || !c.count) return null;
                count += c.count; sum += c.sumMs;
                return c.sumMs / c.count;
            });
            if (!count) continue;
            rows.push({ model: m, avg: sum / count, count, perDay });
        }
        if (!rows.length) {
            body.innerHTML = '<div class="empty-note">No lookups in the last '
                           + perfDays + ' days.</div>';
            return;
        }

        rows.sort((a, b) => a.avg - b.avg);
        // Scale every sparkline to the same ceiling, so bar heights are
        // comparable between rows rather than each row self-normalising.
        const ceiling = Math.max.apply(null, rows.flatMap(
            (r) => r.perDay.filter((v) => v != null)));

        let html = '';
        for (const r of rows) {
            const bars = r.perDay.map((v) => v == null
                ? '<i class="empty" style="height:2px"></i>'
                : `<i style="height:${Math.max(2, Math.round((v / ceiling) * 18))}px"></i>`).join('');
            html += `<div class="perf-row">
                <div class="perf-name" title="${esc(r.model)}">${esc(r.model)}</div>
                <div class="perf-avg">${(r.avg / 1000).toFixed(2)}s</div>
                <div class="spark">${bars}</div>
                <div class="perf-n">${r.count}</div>
            </div>`;
        }
        if (rows.length > 1) {
            html += `<div class="perf-best">Fastest: ${esc(rows[0].model)}</div>`;
        }
        body.innerHTML = html;
    }

    // ============================================
    // Prompts
    // ============================================
    let promptState = null;
    const expanded = new Set();

    function relTime(ts) {
        const s = Math.round((Date.now() - ts) / 1000);
        if (s < 60) return 'just now';
        if (s < 3600) return Math.floor(s / 60) + 'm ago';
        if (s < 86400) return Math.floor(s / 3600) + 'h ago';
        if (s < 2592000) return Math.floor(s / 86400) + 'd ago';
        return new Date(ts).toISOString().slice(0, 10);
    }

    function renderDiff(oldText, newText) {
        if (typeof CRDiff === 'undefined') return '';
        const rows = CRDiff.collapse(CRDiff.diffLines(oldText, newText), 2);
        const stats = CRDiff.diffStats(CRDiff.diffLines(oldText, newText));
        if (!stats.changed) return '';
        let html = '<div class="diff">';
        for (const r of rows) {
            if (r.type === 'gap') {
                html += `<div class="gap">⋯ ${r.count} unchanged line${r.count === 1 ? '' : 's'}</div>`;
            } else {
                const cls = r.type === 'add' ? 'add' : r.type === 'del' ? 'del' : 'ctx';
                const mark = r.type === 'add' ? '+' : r.type === 'del' ? '-' : ' ';
                html += `<div class="${cls}">${esc(mark + ' ' + r.text)}</div>`;
            }
        }
        return html + '</div>';
    }

    function renderHistory() {
        const box = $('opt-prompt-history');
        if (!box || !promptState) return;

        const hist = promptState.history || [];
        setText('opt-hist-count', hist.length
            ? hist.length + (hist.length === 1 ? ' version' : ' versions') : '');

        if (!hist.length) {
            box.innerHTML = '<div class="empty-note">No saves yet. '
                          + 'Editing a prompt records a version you can come back to.</div>';
            return;
        }

        let html = '';
        // newest first; each version diffs against the one before it
        for (let i = hist.length - 1; i >= 0; i--) {
            const v = hist[i];
            const prev = i > 0 ? hist[i - 1] : null;
            const isCurrent = i === hist.length - 1;
            const open = expanded.has(v.id);

            let stat = '';
            let bodyHtml = '';
            if (prev && typeof CRDiff !== 'undefined') {
                const sysStats = CRDiff.diffStats(CRDiff.diffLines(prev.system, v.system));
                const lkpStats = CRDiff.diffStats(CRDiff.diffLines(prev.lookup, v.lookup));
                const added = sysStats.added + lkpStats.added;
                const removed = sysStats.removed + lkpStats.removed;
                stat = `<span class="hist-stat"><span class="p">+${added}</span> `
                     + `<span class="m">-${removed}</span></span>`;
                if (open) {
                    const sd = renderDiff(prev.system, v.system);
                    const ld = renderDiff(prev.lookup, v.lookup);
                    if (sd) bodyHtml += '<div class="diff-title">System instruction</div>' + sd;
                    if (ld) bodyHtml += '<div class="diff-title">Lookup prompt</div>' + ld;
                    if (!sd && !ld) bodyHtml += '<div class="empty-note">No textual change.</div>';
                }
            } else if (open) {
                bodyHtml += '<div class="empty-note">The shipped default — '
                          + 'this is the floor every later version is compared against.</div>';
            }

            if (open && !isCurrent) {
                bodyHtml += `<div class="hist-actions">
                    <button class="btn btn-sm js-restore" data-id="${esc(v.id)}">Restore this version</button>
                </div>`;
            }

            html += `<div class="hist-item">
                <div class="hist-head js-toggle" data-id="${esc(v.id)}">
                    <span class="hist-when">${esc(relTime(v.ts))}</span>
                    <span class="hist-label">${esc(v.label || '')}</span>
                    ${i === 0 ? '<span class="tag">base</span>' : ''}
                    ${isCurrent ? '<span class="tag cur">current</span>' : ''}
                    ${stat}
                </div>
                ${open ? `<div class="hist-body">${bodyHtml}</div>` : ''}
            </div>`;
        }
        box.innerHTML = html;

        box.querySelectorAll('.js-toggle').forEach((el) => {
            el.addEventListener('click', () => {
                const id = el.getAttribute('data-id');
                if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
                renderHistory();
            });
        });
        box.querySelectorAll('.js-restore').forEach((el) => {
            el.addEventListener('click', async (e) => {
                e.stopPropagation();
                const res = await send({ action: 'restorePromptVersion', id: el.getAttribute('data-id') });
                if (!res || !res.ok) {
                    status('opt-prompt-status', 'Could not restore.', 'bad');
                    return;
                }
                status('opt-prompt-status', 'Restored.', 'ok');
                await loadPrompts();
            });
        });
    }

    async function loadPrompts() {
        const res = await send({ action: 'getPrompts' });
        if (!res) return;
        promptState = res;

        const sys = $('opt-prompt-system');
        const lkp = $('opt-prompt-lookup');
        if (sys) sys.value = res.prompts.system;
        if (lkp) lkp.value = res.prompts.lookup;

        const contract = $('opt-prompt-contract');
        const schema = $('opt-prompt-schema');
        if (contract) contract.value = (res.locked && res.locked.jsonContract || '').trim();
        if (schema) schema.value = JSON.stringify(res.locked && res.locked.schema, null, 2);

        renderHistory();
    }

    on('opt-prompt-save', 'click', async () => {
        const sys = $('opt-prompt-system');
        const lkp = $('opt-prompt-lookup');
        if (!sys || !lkp) return;

        status('opt-prompt-status', 'Saving…');
        const res = await send({
            action: 'savePrompts',
            prompts: { system: sys.value, lookup: lkp.value }
        });

        if (!res || !res.ok) {
            const which = res && res.kind === 'system' ? 'System instruction' : 'Lookup prompt';
            if (res && res.error === 'missing_placeholders') {
                status('opt-prompt-status',
                    `${which} is missing ${res.missing.map((p) => '{{' + p + '}}').join(' and ')}.`, 'bad');
            } else if (res && res.error === 'empty') {
                status('opt-prompt-status', `${which} cannot be empty.`, 'bad');
            } else {
                status('opt-prompt-status', 'Could not save.', 'bad');
            }
            return;
        }
        status('opt-prompt-status', 'Saved.', 'ok');
        await loadPrompts();
    });

    on('opt-prompt-reset', 'click', async () => {
        const res = await send({ action: 'resetPrompts' });
        if (!res || !res.ok) {
            status('opt-prompt-status', 'Could not reset.', 'bad');
            return;
        }
        status('opt-prompt-status', 'Back to the shipped defaults.', 'ok');
        await loadPrompts();
    });

    // ---- go ----
    initModel();
    renderPerf();
    loadPrompts();
});
