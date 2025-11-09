import { loadHandSignalsData } from './signals.js';

// Probes and caches available media variants per signal id
export const MediaVariantRegistry = {
  _map: new Map(),
  get(id) { return this._map.get(id); },
  async init(signals, { max = 5 } = {}) {
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
      candidates.push(`./assets/signals/${id}.gif`, `./assets/signals/${id}.png`);
      for (let n = 1; n <= max; n++) {
        candidates.push(`./assets/signals/${id}-${n}.gif`);
        candidates.push(`./assets/signals/${id}-${n}.png`);
      }
      const unique = Array.from(new Set(candidates.filter((u) => !list.includes(u))));
      const perIdTask = (async () => {
        for (const url of unique) {
          const ok = await probe(url);
          if (ok) list.push(url);
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
  async loadFromFile() {
    this.signals = await loadHandSignalsData();
    return this.signals;
  }
  getAll() {
    return this.signals;
  }
}
