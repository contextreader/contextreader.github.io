// lib/diff.js — line diff for the prompt history panel.
//
// Hand-rolled because the manifest CSP is `script-src 'self'`: no CDN library
// can load on an extension page, and inlining one would still need a build step
// this repo does not have.
//
// Exposes CRDiff as a global on extension pages, and module.exports under node
// so the tests can reach it.

(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.CRDiff = api;
})(typeof self !== 'undefined' ? self : this, function () {

    // Above this the O(n*m) table is not worth building — prompts are tens of
    // lines, so hitting this means something is wrong with the input, and a
    // whole-block replace is a truthful answer rather than a hang.
    const MAX_CELLS = 4000000;

    function splitLines(text) {
        // A trailing newline should not read as a final empty line changing.
        return String(text == null ? '' : text).replace(/\n$/, '').split('\n');
    }

    // Longest common subsequence over lines, backtracked into a row list.
    function lcsRows(a, b, aOff, bOff) {
        const n = a.length, m = b.length;
        const rows = [];

        if (n === 0 && m === 0) return rows;
        if (n === 0) {
            for (let j = 0; j < m; j++) rows.push({ type: 'add', text: b[j], aLine: null, bLine: bOff + j + 1 });
            return rows;
        }
        if (m === 0) {
            for (let i = 0; i < n; i++) rows.push({ type: 'del', text: a[i], aLine: aOff + i + 1, bLine: null });
            return rows;
        }
        if (n * m > MAX_CELLS) {
            for (let i = 0; i < n; i++) rows.push({ type: 'del', text: a[i], aLine: aOff + i + 1, bLine: null });
            for (let j = 0; j < m; j++) rows.push({ type: 'add', text: b[j], aLine: null, bLine: bOff + j + 1 });
            return rows;
        }

        const dp = new Array(n + 1);
        for (let i = 0; i <= n; i++) dp[i] = new Int32Array(m + 1);
        for (let i = n - 1; i >= 0; i--) {
            for (let j = m - 1; j >= 0; j--) {
                dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1
                                         : Math.max(dp[i + 1][j], dp[i][j + 1]);
            }
        }

        let i = 0, j = 0;
        while (i < n && j < m) {
            if (a[i] === b[j]) {
                rows.push({ type: 'ctx', text: a[i], aLine: aOff + i + 1, bLine: bOff + j + 1 });
                i++; j++;
            } else if (dp[i + 1][j] >= dp[i][j + 1]) {
                rows.push({ type: 'del', text: a[i], aLine: aOff + i + 1, bLine: null });
                i++;
            } else {
                rows.push({ type: 'add', text: b[j], aLine: null, bLine: bOff + j + 1 });
                j++;
            }
        }
        while (i < n) { rows.push({ type: 'del', text: a[i], aLine: aOff + i + 1, bLine: null }); i++; }
        while (j < m) { rows.push({ type: 'add', text: b[j], aLine: null, bLine: bOff + j + 1 }); j++; }
        return rows;
    }

    // Trimming the common head and tail first keeps the table small and, more
    // importantly, stops the LCS from finding a "cheaper" alignment that pairs
    // unrelated lines across the whole prompt.
    function diffLines(oldText, newText) {
        const a = splitLines(oldText), b = splitLines(newText);

        let s = 0;
        while (s < a.length && s < b.length && a[s] === b[s]) s++;

        let ea = a.length, eb = b.length;
        while (ea > s && eb > s && a[ea - 1] === b[eb - 1]) { ea--; eb--; }

        const rows = [];
        for (let i = 0; i < s; i++) {
            rows.push({ type: 'ctx', text: a[i], aLine: i + 1, bLine: i + 1 });
        }
        rows.push.apply(rows, lcsRows(a.slice(s, ea), b.slice(s, eb), s, s));
        for (let i = ea; i < a.length; i++) {
            rows.push({ type: 'ctx', text: a[i], aLine: i + 1, bLine: i - ea + eb + 1 });
        }
        return rows;
    }

    function diffStats(rows) {
        let added = 0, removed = 0;
        for (const r of rows) {
            if (r.type === 'add') added++;
            else if (r.type === 'del') removed++;
        }
        return { added, removed, changed: added + removed };
    }

    // Collapse long unchanged stretches into {type:'gap', count} so a one-line
    // edit to a 40-line prompt renders as an edit, not as the whole prompt.
    function collapse(rows, context) {
        const ctx = context == null ? 2 : context;
        const keep = new Array(rows.length).fill(false);
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].type === 'add' || rows[i].type === 'del') {
                for (let k = Math.max(0, i - ctx); k <= Math.min(rows.length - 1, i + ctx); k++) keep[k] = true;
            }
        }
        const out = [];
        let run = 0;
        for (let i = 0; i < rows.length; i++) {
            if (keep[i]) {
                if (run) { out.push({ type: 'gap', count: run }); run = 0; }
                out.push(rows[i]);
            } else {
                run++;
            }
        }
        if (run) out.push({ type: 'gap', count: run });
        return out;
    }

    return { diffLines, diffStats, collapse, splitLines };
});
