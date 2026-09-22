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

    // ---- Host access (Firefox can switch it off after install) ----
    const GEMINI_ORIGINS = ['https://generativelanguage.googleapis.com/*'];
    const checkAccess = () => {
        if (!chrome.permissions || !chrome.permissions.contains) return;
        chrome.permissions.contains({ origins: GEMINI_ORIGINS }).then((yes) => {
            const card = $('opt-access');
            if (card) card.hidden = !!yes;
        }).catch(() => {});
    };
    checkAccess();
    // A request needs the click itself as its user gesture, so nothing may be
    // awaited before it.
    on('opt-access-allow', 'click', () => {
        chrome.permissions.request({ origins: GEMINI_ORIGINS }).then((granted) => {
            if (granted) checkAccess();
            else status('opt-access-status', 'Not allowed. Lookups stay off until you allow it.', 'bad');
        }).catch((e) => status('opt-access-status', String(e && e.message || e), 'bad'));
    });
    if (chrome.permissions && chrome.permissions.onRemoved) {
        chrome.permissions.onRemoved.addListener(checkAccess);
        chrome.permissions.onAdded.addListener(checkAccess);
    }

    // ---- About ----
    setText('opt-version', chrome.runtime.getManifest().version);
    setText('opt-ext-id', chrome.runtime.id);

    // ---- Links ----
    // The Privacy Policy link is a plain href in the HTML; nothing to wire.

    // ============================================
    // Gemini API key
    // ============================================
    //
    // The field is never prefilled with the key any more. Showing it in full on
    // every visit put the secret in the DOM for no reason — a mask is enough to
    // tell you which key is loaded.

    let keyState = null;
    let lockMode = null;   // 'enable' | 'unlock' | 'disable'

    const setKeyStatus = (text, tone) => status('opt-key-status', text, tone);

    function renderKeyCard() {
        const s = keyState || { hasKey: false, protection: 'plain', unlocked: false, masked: '' };

        const entry = $('opt-key-entry');
        const saved = $('opt-key-saved');
        if (entry) entry.hidden = s.hasKey;
        if (saved) saved.hidden = !s.hasKey;
        setText('opt-key-masked', s.masked || '—');

        const box = $('opt-lock-box');
        if (box) box.hidden = !s.hasKey;
        if (!s.hasKey) return;

        const actions = $('opt-lock-actions');
        if (s.protection === 'plain') {
            setText('opt-lock-state', 'Stored unencrypted on this device.');
            if (actions) actions.innerHTML =
                '<button id="opt-lock-enable" class="btn btn-sm">Encrypt with a passphrase</button>';
        } else if (s.unlocked) {
            setText('opt-lock-state', 'Encrypted \u00b7 unlocked for this browser session.');
            if (actions) actions.innerHTML =
                '<button id="opt-lock-now" class="btn btn-sm">Lock now</button>'
              + '<button id="opt-lock-off" class="btn btn-sm">Turn off</button>';
        } else {
            setText('opt-lock-state', 'Encrypted \u00b7 locked. Lookups will not run until you unlock.');
            if (actions) actions.innerHTML =
                '<button id="opt-lock-unlock" class="btn btn-primary btn-sm">Unlock</button>';
        }

        on('opt-lock-enable', 'click', () => openLockForm('enable'));
        on('opt-lock-unlock', 'click', () => openLockForm('unlock'));
        on('opt-lock-off',    'click', () => openLockForm('disable'));
        on('opt-lock-now',    'click', async () => {
            await send({ action: 'lockKey' });
            setKeyStatus('Locked.', '');
            await loadKeyState();
        });
    }

    function openLockForm(mode) {
        lockMode = mode;
        const form = $('opt-lock-form');
        const p1 = $('opt-lock-pass'), p2 = $('opt-lock-pass2');
        if (!form) return;
        form.hidden = false;
        if (p1) { p1.value = ''; p1.placeholder = mode === 'enable' ? 'New passphrase' : 'Passphrase'; }
        if (p2) { p2.value = ''; p2.hidden = mode !== 'enable'; }
        setText('opt-lock-hint',
            mode === 'enable'
                ? 'At least 8 characters. It is never stored, so there is no recovery — '
                + 'forgetting it means entering your API key again. Protects against someone '
                + 'reading this browser profile off the disk; not against software already '
                + 'running as you.'
          : mode === 'unlock'
                ? 'Unlocks for this browser session only.'
                : 'Confirms you could read the key anyway before the encryption comes off.');
        if (p1) p1.focus();
    }

    on('opt-lock-cancel', 'click', () => {
        const form = $('opt-lock-form');
        if (form) form.hidden = true;
        lockMode = null;
    });

    on('opt-lock-go', 'click', async () => {
        const p1 = $('opt-lock-pass'), p2 = $('opt-lock-pass2');
        const pass = p1 ? p1.value : '';
        if (!pass) { setKeyStatus('Enter a passphrase.', 'bad'); return; }

        if (lockMode === 'enable') {
            if (!p2 || p2.value !== pass) { setKeyStatus('The two passphrases do not match.', 'bad'); return; }
            const res = await send({ action: 'enablePassphrase', passphrase: pass });
            if (!res || !res.ok) {
                setKeyStatus(res && res.error === 'too_short'
                    ? 'Use at least 8 characters.' : 'Could not encrypt.', 'bad');
                return;
            }
            setKeyStatus('Encrypted. You will be asked for this once per browser session.', 'ok');
        } else if (lockMode === 'unlock') {
            const res = await send({ action: 'unlockKey', passphrase: pass });
            if (!res || !res.ok) { setKeyStatus('That passphrase did not work.', 'bad'); return; }
            setKeyStatus('Unlocked.', 'ok');
        } else if (lockMode === 'disable') {
            const res = await send({ action: 'disablePassphrase', passphrase: pass });
            if (!res || !res.ok) { setKeyStatus('That passphrase did not work.', 'bad'); return; }
            setKeyStatus('Encryption off. The key is stored unencrypted again.', '');
        }

        if (p1) p1.value = '';
        if (p2) p2.value = '';
        const form = $('opt-lock-form');
        if (form) form.hidden = true;
        lockMode = null;
        await loadKeyState();
        refreshModels({ quiet: true });
    });

    on('opt-key-replace', 'click', () => {
        const entry = $('opt-key-entry'), saved = $('opt-key-saved');
        if (entry) entry.hidden = false;
        if (saved) saved.hidden = true;
        const inp = $('opt-api-key');
        if (inp) { inp.value = ''; inp.focus(); }
    });

    on('opt-key-revoke', 'click', async () => {
        await send({ action: 'revokeKey' });
        setKeyStatus('Key removed from this device.', '');
        await loadKeyState();
    });

    on('opt-save-key', 'click', async () => {
        const inp = $('opt-api-key');
        if (!inp) return;
        const key = inp.value.trim();
        if (!key) { setKeyStatus('Paste a key first.', 'bad'); return; }

        // Verify by listing models rather than generating: same proof the key
        // works, no generateContent quota spent, and it fills the dropdown.
        setKeyStatus('Checking\u2026');
        const check = await send({ action: 'listModels', apiKey: key });
        if (!check || !check.ok) {
            setKeyStatus((check && check.message) || 'Could not reach Gemini.', 'bad');
            return;
        }

        const saveRes = await send({ action: 'saveApiKey', key });
        if (!saveRes || !saveRes.ok) {
            if (saveRes && saveRes.error === 'passphrase_required') {
                setKeyStatus('Unlock first — the stored key is encrypted.', 'bad');
            } else {
                setKeyStatus('Could not save.', 'bad');
            }
            return;
        }

        inp.value = '';
        setKeyStatus(`Saved and verified \u2014 ${check.models.length} models available.`, 'ok');
        await chrome.storage.local.set({ modelListCache: { ts: Date.now(), models: check.models } });
        await loadKeyState();
        renderModelOptions(check.models);
    });

    async function loadKeyState() {
        keyState = await send({ action: 'getKeyState' });
        renderKeyCard();
    }

    // ============================================
    // Language
    // ============================================

    let langPicker = null;
    let langList = [];

    // Settings stays open in a tab; the popup can change the language meanwhile.
    if (chrome.storage.onChanged) chrome.storage.onChanged.addListener((changes, area) => {
        const ch = area === 'local' && changes.targetLanguage;
        if (!ch || !langPicker) return;
        // Our own save lands here too; the change handler already did the rest.
        if (ch.newValue === $('opt-language').value) return;
        langPicker.setCurrent(ch.newValue);
        const lang = langList.find((l) => l.code === ch.newValue);
        if (lang) setText('opt-about-language', `${lang.nativeName} — ${lang.name}`);
        loadPrompts();
    });

    async function initLanguage() {
        const sel = $('opt-language');
        if (!sel) return;
        const res = await send({ action: 'getLanguages' });
        if (!res) return;

        // Renders the options and owns the search field and the tuned/community
        // note, so all three picker pages say the same thing; saving stays below.
        langList = res.languages;
        langPicker = CRLangPicker.attach({
            select: sel, input: $('opt-language-search'), status: $('opt-language-count'),
            note: $('opt-language-note'), languages: res.languages, current: res.current,
        });
        const cur = res.languages.find((l) => l.code === res.current);
        if (cur) setText('opt-about-language', `${cur.nativeName} — ${cur.name}`);
    }

    on('opt-language', 'change', async () => {
        const sel = $('opt-language');
        const res = await send({ action: 'setLanguage', code: sel.value });
        if (res && res.lang) {
            setText('opt-about-language', `${res.lang.nativeName} — ${res.lang.name}`);
        }
        // The prompt editor shows the language name inside the locked schema.
        loadPrompts();
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
                status('opt-model-status', (res && res.message) || 'Could not fetch the model list.', 'bad');
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
        if (sys) sys.value = res.prompts.system;

        const contract = $('opt-prompt-contract');
        const schema = $('opt-prompt-schema');
        if (contract) contract.value = (res.locked && res.locked.jsonContract || '').trim();
        if (schema) schema.value = JSON.stringify(res.locked && res.locked.schema, null, 2);

        renderHistory();
    }

    on('opt-prompt-save', 'click', async () => {
        const sys = $('opt-prompt-system');
        if (!sys || !promptState) return;

        // Only the system instruction is editable. The lookup prompt still
        // travels with every save so each history entry stays a complete
        // snapshot and the diff view keeps working.
        status('opt-prompt-status', 'Saving…');
        const res = await send({
            action: 'savePrompts',
            prompts: { system: sys.value, lookup: promptState.prompts.lookup }
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

    // ── hand the prompt to an assistant ──────────────────────────────
    //
    // Editing a system instruction by hand is the kind of thing people paste
    // into ChatGPT or Claude. What an assistant cannot guess is the part that
    // breaks silently: {{langName}} has to survive, sr- class names are matched
    // by the bubble's CSS, and the JSON contract below decides whether the
    // answer parses at all. Both buttons carry that context; the second one also
    // states the rules and the reply format, so what comes back can go straight
    // back into the box.

    function promptBundle() {
        const sys = $('opt-prompt-system');
        const holders = (promptState && promptState.placeholders && promptState.placeholders.system) || ['langName'];
        const contract = (promptState && promptState.locked && promptState.locked.jsonContract || '').trim();
        const schema = JSON.stringify(promptState && promptState.locked && promptState.locked.schema, null, 2);
        return [
            '# Context Reader — the system instruction',
            '',
            'Context Reader is a Chrome extension. Someone highlights a word they are stuck on',
            'while reading, and it explains that word using the sentence around it, in the',
            'language they chose. The text below is the system instruction it sends to Google\'s',
            'Gemini on EVERY call: word lookups and the More, General and Simple panels alike.',
            '',
            'Constraints that are not style preferences:',
            holders.map((h) => `- \`{{${h}}}\` must appear literally. It is substituted before sending; losing it breaks every lookup.`).join('\n'),
            '- Leave any `sr-` class names alone. The bubble\'s CSS matches on them, and the model is asked to emit them as HTML.',
            '- Domain matching is what this instruction is for: the model must pick the sense the sentence\'s field uses, not the first dictionary sense. Weakening that measurably degrades answers.',
            '',
            '## Current system instruction',
            '',
            '```',
            (sys && sys.value) || '',
            '```',
            '',
            '## Locked, for context — not yours to change',
            '',
            'The answer must parse as this JSON, or the bubble shows nothing:',
            '',
            '```',
            contract,
            '```',
            '',
            '```json',
            schema,
            '```',
        ].join('\n');
    }

    const COPY_BRIEF = [
        'You are helping me rewrite the system instruction for a Chrome extension. Read',
        'everything below before answering.',
        '',
        'Rules:',
        '1. Keep every {{placeholder}} exactly as written, in the same spelling.',
        '2. Keep the domain-matching behaviour. It is the point of the instruction.',
        '3. Do not rename or invent `sr-` class names.',
        '4. Do not restate the JSON contract or schema in the instruction. They are sent separately.',
        '5. Write it as an instruction to the model, not as an explanation to me.',
        '',
        'How to reply:',
        '- If what I am asking for is unclear or looks like it would make answers worse, ask me',
        '  your questions first and stop there.',
        '- Otherwise reply with the finished instruction in ONE fenced code block and nothing',
        '  else, so I can paste it straight back into the extension.',
        '',
        '---',
        '',
    ].join('\n');

    async function copyPrompt(text, label) {
        const out = $('opt-prompt-copy-out');
        try {
            await navigator.clipboard.writeText(text);
            status('opt-prompt-copy-status', `${label} copied — paste it into your assistant.`, 'ok');
            if (out) out.hidden = true;
        } catch (e) {
            // Clipboard permission can be refused; show the text rather than fail silently.
            if (out) { out.value = text; out.hidden = false; out.focus(); out.select(); }
            status('opt-prompt-copy-status', 'Could not reach the clipboard — copy it from the box below.', 'bad');
        }
    }

    on('opt-prompt-copy', 'click', () => copyPrompt(promptBundle(), 'Prompt and context'));
    on('opt-prompt-copy-brief', 'click', () =>
        copyPrompt(COPY_BRIEF + promptBundle() + '\n\n## What I want changed\n\n(say it here)\n', 'Prompt, context and instructions'));

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
    loadKeyState();
    initLanguage();
    initModel();
    renderPerf();
    loadPrompts();
});
