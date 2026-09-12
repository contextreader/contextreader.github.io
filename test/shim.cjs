// Minimal DOM/chrome shim — enough to execute options.js for real.
const fs = require('fs');
const path = require('node:path');
const DIR = path.join(__dirname, '..');

function makeEl(id, tag) {
  const el = {
    id, tagName: tag || 'DIV', _html: '', value: '', textContent: '',
    checked: false, hidden: false, disabled: false,
    style: {}, attrs: {}, listeners: {}, children: [],
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = String(v); },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
    addEventListener(evt, fn) { (this.listeners[evt] = this.listeners[evt] || []).push(fn); },
    querySelectorAll(sel) {
      // parse data-id out of the generated html for .js-* handles
      const cls = sel.replace(/^\./, '');
      const re = new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"[^>]*data-id="([^"]+)"`, 'g');
      const out = []; let m;
      while ((m = re.exec(this._html))) {
        const id = m[1];
        out.push({ getAttribute: () => id, addEventListener: (e, f) => out.push(f) });
      }
      return out;
    },
    focus() { this._focused = true; },
    blur() { this._focused = false; },
    click() { (this.listeners.click || []).forEach(f => f({ stopPropagation(){} })); },
    change() { (this.listeners.change || []).forEach(f => f({})); },
  };
  return el;
}

// harvest real ids from options.html so we only stub what exists
const html = fs.readFileSync(path.join(DIR, 'options.html'), 'utf8');
const ids = [...html.matchAll(/id="([\w-]+)"/g)].map(m => m[1]);
const els = {};
for (const id of ids) els[id] = makeEl(id);
// buttons this page builds with innerHTML rather than declaring in markup
for (const id of ['opt-lock-enable','opt-lock-unlock','opt-lock-off','opt-lock-now'])
  els[id] = makeEl(id);

let domReady = null;
globalThis.document = {
  getElementById: (id) => els[id] || null,
  addEventListener: (evt, fn) => { if (evt === 'DOMContentLoaded') domReady = fn; },
  querySelectorAll: () => [],
};
globalThis.self = globalThis;

let store = {};
let sess = {};
let responder = () => undefined;
globalThis.chrome = {
  runtime: {
    getManifest: () => ({ version: '2.1.0' }),
    id: 'testextensionid',
    sendMessage: (msg, cb) => { const r = responder(msg); if (cb) cb(r); },
  },
  storage: { session: {
    get: (k, cb) => { let o; if (typeof k === 'string') o = { [k]: sess[k] };
      else if (Array.isArray(k)) { o={}; for (const n of k) o[n]=sess[n]; }
      else { o={}; for (const [n,d] of Object.entries(k)) o[n]=sess[n]??d; }
      if (cb) { cb(o); return; } return Promise.resolve(o); },
    set: (o) => { Object.assign(sess, o); return Promise.resolve(); },
    remove: (k) => { for (const n of [].concat(k)) delete sess[n]; return Promise.resolve(); },
  }, local: {
    get: (k, cb) => {
      let o;
      if (typeof k === 'string') o = { [k]: store[k] };
      else { o = {}; for (const [key, d] of Object.entries(k)) o[key] = store[key] ?? d; }
      if (cb) { cb(o); return; } return Promise.resolve(o);
    },
    set: (o, cb) => { Object.assign(store, o); if (cb) cb(); return Promise.resolve(); },
    remove: (k) => { delete store[k]; return Promise.resolve(); },
  } },
};

globalThis.CRDiff = require(path.join(DIR, 'lib/diff.js'));

module.exports = {
  els, store, sess,
  setStore: (s) => { store = s; },
  setResponder: (f) => { responder = f; },
  run: () => { for (const el of Object.values(els)) el.listeners = {};
               delete require.cache[require.resolve(path.join(DIR, 'options.js'))];
               require(path.join(DIR, 'options.js')); return domReady(); },
  flush: () => new Promise(r => setImmediate(r)),
};
