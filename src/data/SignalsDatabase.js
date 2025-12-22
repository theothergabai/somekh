import { loadHandSignalsData, loadBonusSignalsData } from './signals.js';

// Probes and caches available media variants per signal id
export const MediaVariantRegistry = {
  _map: new Map(),
  _source: [],
  _baseStatus: new Map(), // id -> true (exists) | false (missing)
  _lastRootsKey: null,
  _fixedRoots: null,
  _assetRoots() {
    if (Array.isArray(this._fixedRoots) && this._fixedRoots.length) return this._fixedRoots;
    // Manual overrides: URL ?opt=1|0 or #...opt=1|0, or localStorage 'prefAssets' = 'opt'|'full'
    const parseOptFlag = () => {
      try {
        const q = new URLSearchParams(window.location.search);
        if (q.has('opt')) return q.get('opt') === '1';
      } catch {}
      try {
        const hash = window.location.hash || '';
        const m = hash.match(/(?:[?#&])opt=(0|1)/);
        if (m) return m[1] === '1';
      } catch {}
      try {
        const ls = localStorage.getItem('prefAssets');
        if (ls === 'opt') return true;
        if (ls === 'full') return false;
      } catch {}
      return null;
    };
    const manual = parseOptFlag();

    let preferOpt = false;
    if (manual != null) {
      preferOpt = manual;
    } else {
      try {
        const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const save = !!(c && c.saveData);
        const eff = (c && c.effectiveType) || '';
        const slow = /(^|-)2g$/.test(eff) || eff === 'slow-2g' || (c && typeof c.downlink === 'number' && c.downlink < 1.5);
        preferOpt = save || slow;
      } catch {}
    }
    const ordered = preferOpt ? ['./assets/signals_opt', './assets/signals'] : ['./assets/signals', './assets/signals_opt'];
    const unique = Array.from(new Set(ordered));
    const key = unique.join('|');
    // Freeze roots for this session to avoid mid-session flips causing mismatched URLs
    this._lastRootsKey = key;
    this._fixedRoots = unique;
    return this._fixedRoots;
  },
  assetBase() { return this._assetRoots()[0]; },
  setSource(signals) { this._source = Array.isArray(signals) ? signals : []; },
  get(id) { return this._map.get(id); },
  hasBase(id) { return this._baseStatus.has(id) ? this._baseStatus.get(id) : undefined; },
  async ensure(id, { max = 5, timeoutMs = 1200 } = {}) {
    if (!id || this._map.has(id)) return;
    const s = (this._source || []).find((x) => x?.id === id);
    if (!s) return;
    const probe = (url) => new Promise((resolve) => {
      const timer = setTimeout(() => { resolve(false); }, timeoutMs);
      const finish = (ok) => { clearTimeout(timer); resolve(ok); };
      if (/\.mp4(?:[?#].*)?$/i.test(url)) {
        // Use fetch to test mp4 availability
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), timeoutMs);
          fetch(url, { method: 'GET', cache: 'no-store', signal: ctrl.signal })
            .then((r) => { clearTimeout(t); finish(!!r && r.ok); })
            .catch(() => { clearTimeout(t); finish(false); });
        } catch { finish(false); }
      } else {
        // Image probe for GIF
        try {
          const img = new Image();
          const done = (ok) => { img.onload = img.onerror = null; finish(ok); };
          img.onload = () => done(true);
          img.onerror = () => done(false);
          img.src = url;
        } catch { finish(false); }
      }
    });
    let list = [];
    const roots = this._assetRoots();
    let base = null;
    let baseOk = false;
    let baseRootUsed = null;
    for (const r of roots) {
      const mp4 = `${r}/${id}.mp4`;
      const gif = `${r}/${id}.gif`;
      if (await probe(mp4)) { base = mp4; baseOk = true; baseRootUsed = r; break; }
      if (await probe(gif)) { base = gif; baseOk = true; baseRootUsed = r; break; }
    }
    if (baseOk) this._baseStatus.set(id, true);
    // If there were predeclared variants, keep only those from the same root as base
    if (Array.isArray(s.mediaVariants) && baseRootUsed) {
      for (const v of s.mediaVariants) {
        if (typeof v === 'string' && v.startsWith(baseRootUsed + '/')) list.push(v);
      }
    }
    if (baseOk && base && !list.includes(base)) list.unshift(base);
    // Defer numbered GIFs as optional later work (not during first-run), only from the chosen root
    for (let n = 1; n <= max; n++) {
      if (!baseRootUsed) break;
      const mp4 = `${baseRootUsed}/${id}-${n}.mp4`;
      const gif = `${baseRootUsed}/${id}-${n}.gif`;
      if (!list.includes(mp4) && await probe(mp4)) list.push(mp4);
      else if (!list.includes(gif) && await probe(gif)) list.push(gif);
    }
    this._map.set(id, list);
  },
  async prefetchBaseSequential(orderIds = [], { timeoutMs = 1500, delayMs = 0 } = {}) {
    if (!Array.isArray(orderIds)) return;
    for (const id of orderIds) {
      try { await this.ensure(id, { max: 0, timeoutMs }); } catch {}
      if (delayMs > 0) { await new Promise((r) => setTimeout(r, delayMs)); }
    }
  },
  async prefetchBaseConcurrent(orderIds = [], { timeoutMs = 1000, concurrency = 2 } = {}) {
    if (!Array.isArray(orderIds) || orderIds.length === 0) return;
    const ids = orderIds.slice();
    let index = 0;
    const worker = async () => {
      while (index < ids.length) {
        const id = ids[index++];
        try { await this.ensure(id, { max: 0, timeoutMs }); } catch {}
      }
    };
    const workers = Array.from({ length: Math.min(concurrency, ids.length) }, () => worker());
    await Promise.all(workers);
  },
  async init(signals, { max = 5, timeoutMs = 1200 } = {}) {
    const probe = (url) => new Promise((resolve) => {
      const img = new Image();
      const done = (ok) => { img.onload = img.onerror = null; resolve(ok); };
      img.onload = () => done(true);
      img.onerror = () => done(false);
      img.src = url;
    });
    const tasks = [];
    for (const s of signals) {
      const id = s?.id;
      if (!id) continue;
      const list = [];
      if (Array.isArray(s.mediaVariants)) {
        for (const v of s.mediaVariants) if (typeof v === 'string') list.push(v);
      }
      const candidates = [];
      candidates.push(`./assets/signals/${id}.gif`);
      for (let n = 1; n <= max; n++) {
        candidates.push(`./assets/signals/${id}-${n}.gif`);
      }
      const unique = Array.from(new Set(candidates.filter((u) => !list.includes(u))));
      const perIdTask = (async () => {
        for (const url of unique) {
          const ok = await probe(url);
          if (ok) {
            if (url.endsWith(`${id}.gif`)) this._baseStatus.set(id, true);
            list.push(url);
          }
        }
        this._map.set(id, list);
      })();
      tasks.push(perIdTask);
    }
    await Promise.all(tasks);
  }
};

export class SignalsDatabase {
  constructor() {
    this.signals = [];
  }
  async loadFromFile(pack = 'base') {
    // Bonus pack temporarily disabled
    this.signals = await loadHandSignalsData();
    return this.signals;
  }
  getAll() {
    return this.signals;
  }
}
