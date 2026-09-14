// lib/lang-picker.js — the one language picker: Settings, the popup and the
// welcome page.
//
// Past a dozen languages a plain <select> stops working: Chrome's type-ahead
// matches the start of the label, and every label starts with the NATIVE name,
// so typing "hindi" never reaches हिन्दी. This puts a search field in front of
// the native select rather than replacing it — the select keeps its own
// keyboard and screen-reader behaviour, and every page's existing `change`
// handler still does the saving.
//
// Behaviour:
//   empty search  — the select is an ordinary dropdown showing the current language
//   typing        — the select becomes a short visible list of matches, first one
//                   highlighted; nothing is saved yet
//   ↑/↓ in field  — move the highlight
//   Enter / click — choose: the list collapses back and `change` fires once
//   Escape        — clear the search, current language unchanged
//
// Not used in the bubble: that is overflow:hidden with no shadow DOM, and it
// only offers a one-shot EN button anyway.

(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.CRLangPicker = api;
})(typeof self !== 'undefined' ? self : this, function () {

    const MAX_ROWS = 8;   // rows including group headings

    const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);

    // Case- and accent-insensitive, so "espanol" finds Español. Only the Latin
    // combining accents (U+0300–036F) are stripped: Sinhala and Devanagari
    // vowel signs are combining marks too, and removing those would change
    // which word was typed, not how it was accented.
    function fold(s) {
        return String(s == null ? '' : s).normalize('NFD')
            .replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    }

    // Lower is better; -1 is no match. Exact code first ("ja"), then a name
    // that starts with the query, then a word inside a name ("simplified").
    // Deliberately not "anywhere": at a hundred languages, "hin" matching
    // Chinese and "an" matching half the list is noise, not recall.
    function score(lang, query) {
        const q = fold(query);
        if (!q) return 0;
        if (fold(lang.code) === q) return 0;
        const names = [fold(lang.name), fold(lang.nativeName)];
        if (names.some((n) => n.startsWith(q))) return 1;
        if (names.some((n) => n.split(/[\s()\-—]+/).some((w) => w.startsWith(q)))) return 2;
        return -1;
    }

    // Keeps the incoming order (tuned first, then by name) within each rank.
    function filterLangs(langs, query) {
        return langs
            .map((l, i) => ({ l, i, s: score(l, query) }))
            .filter((x) => x.s >= 0)
            .sort((a, b) => (a.s - b.s) || (a.i - b.i))
            .map((x) => x.l);
    }

    // One label everywhere. "English — English" says nothing twice. Whether a
    // language is tuned is said by the group its option sits in, not a suffix:
    // at a hundred languages "(community)" would repeat ninety-odd times, and
    // it was exactly the part that clipped in the 300px popup.
    function label(l) {
        return l.nativeName + (l.nativeName === l.name ? '' : ' — ' + l.name);
    }

    // Said the same way wherever someone picks a language. The distinction is
    // the honest part: a tuned pack ships examples a speaker checked.
    function describe(lang) {
        if (!lang) return '';
        return lang.tuned
            ? 'Tuned — ships worked examples checked by a speaker, which is what '
              + 'makes the model pick the domain-correct sense.'
            : 'Community language. Translation works, but there are no hand-checked '
              + 'examples yet, so domain-specific senses may be less accurate. '
              + 'Adding them is a small pull request.';
    }

    const GROUPS = [['Tuned', true], ['Community', false]];

    // Tuned first, then community, keeping the incoming order inside each —
    // for a search that order is the match rank. The select's option indices
    // follow this order, so anything indexing by selectedIndex must use it too.
    function grouped(langs) {
        return GROUPS.flatMap(([, tuned]) => langs.filter((l) => !!l.tuned === tuned));
    }

    function options(langs) {
        return GROUPS.map(([name, tuned]) => {
            const rows = langs.filter((l) => !!l.tuned === tuned);
            if (!rows.length) return '';
            return `<optgroup label="${name}">`
                + rows.map((l) => `<option value="${esc(l.code)}">${esc(label(l))}</option>`).join('')
                + '</optgroup>';
        }).join('');
    }

    // select, input — required elements. status — optional line for the match
    // count. note — optional line for the tuned/community description.
    // languages — listLangs() output. current — selected code.
    function attach({ select, input, status, note, languages, current }) {
        let cur = current;
        let listing = false;
        let shown = grouped(languages);
        const byCode = Object.fromEntries(languages.map((l) => [l.code, l]));

        function setStatus(text) { if (status) status.textContent = text; }

        // The note describes the language on screen, not the one saved. While
        // searching that is the highlighted row: a community language must never
        // sit above a "Tuned" description because something else is saved.
        // Read through `shown` rather than select.value so it follows the
        // highlight the moment selectedIndex moves.
        function showNote() {
            if (!note) return;
            const lang = listing ? shown[select.selectedIndex] : byCode[cur];
            note.textContent = describe(lang);
        }

        function collapse() {
            listing = false;
            select.removeAttribute('size');
            select.hidden = false;
            select.innerHTML = options(languages);
            shown = grouped(languages);
            select.value = cur;
            setStatus('');
            showNote();
        }

        function list(query) {
            const matches = filterLangs(languages, query);
            listing = true;
            shown = grouped(matches);
            select.innerHTML = options(matches);
            select.hidden = matches.length === 0;
            // Group headings take a row each in a listbox, so count them or the
            // last matches scroll out of sight. size 1 renders as a dropdown
            // again, hence the floor of two.
            const headings = GROUPS.filter(([, t]) => matches.some((l) => !!l.tuned === t)).length;
            select.setAttribute('size', String(Math.max(2, Math.min(MAX_ROWS, matches.length + headings))));
            select.selectedIndex = matches.length ? 0 : -1;
            setStatus(matches.length
                ? `${matches.length} of ${languages.length} · Enter to choose`
                : `No language matches “${String(query).trim()}”`);
            showNote();
        }

        // Enter from the search field. There is no native change event for a
        // highlight moved from the field, so fire one for the page's handler —
        // after collapse, so select.value already reads the chosen code.
        function choose(code) {
            cur = code;
            input.value = '';
            collapse();
            select.dispatchEvent(new Event('change'));
        }

        input.addEventListener('input', () => {
            if (fold(input.value)) list(input.value);
            else collapse();
        });

        input.addEventListener('keydown', (e) => {
            if (!listing) return;
            const n = select.options ? select.options.length : 0;
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (!n) return;
                const step = e.key === 'ArrowDown' ? 1 : -1;
                select.selectedIndex = (Math.max(0, select.selectedIndex) + step + n) % n;
                showNote();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (n && select.selectedIndex >= 0) choose(select.value);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                input.value = '';
                collapse();
            }
        });

        // A click inside the visible list is already a real change event on its
        // way to the page's handler, so only collapse — firing another would
        // save twice. collapse() restores select.value, so it does not matter
        // whether this listener runs before or after the page's.
        select.addEventListener('change', () => {
            cur = select.value;
            if (listing) { input.value = ''; collapse(); }
            else showNote();
        });

        input.setAttribute('aria-controls', select.id);
        if (status) status.setAttribute('aria-live', 'polite');
        collapse();

        return {
            // The language was changed somewhere else — the popup while Settings
            // is open, say. Follow it, but never yank the list out from under
            // an active search: it applies when that search ends.
            setCurrent(code) {
                if (!byCode[code]) return;
                cur = code;
                if (!listing) { select.value = code; showNote(); }
            },
        };
    }

    return { fold, score, filterLangs, label, describe, attach };
});
