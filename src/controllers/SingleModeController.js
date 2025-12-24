import { loadHandSignalsData } from '../data/signals.js';
import { MediaVariantRegistry } from '../data/SignalsDatabase.js';
import { SingleModeView } from '../views/SingleModeView.js';

export class SingleModeController {
  constructor() {
    this.signals = [];
    this.seen = new Set();
    this.view = new SingleModeView({
      onReset: () => this.reset(),
      onCheck: () => this.checkAndNext(),
      onNext: () => this.next(),
      onPrev: () => this.prev(),
      onFlip: () => this.flip(),
      onToggleSymbolsFirst: () => this.toggleSymbolsFirst(),
      onEnterReview: () => this.enterReviewMode(),
      onExitReview: () => this.exitReviewMode(),
      onShuffle: () => this.shuffle(),
    });
    this.indices = [];
    this.current = 0;
    this.flipped = false; // false = show signal, true = show symbol
    this.advanceFrontOnce = false; // one-shot: advance media variant when rendering front next time
    this.mirror = new Map(); // per-id mirror flag for single-variant alternation
    this.symbolsFirst = false; // deck mode: start each card on symbol side
    this.deletedCount = 0; // track how many cards have been deleted
    this.deletedIndices = []; // track which cards have been deleted for review mode
    this.reviewMode = false; // whether we're in review mode
    this.savedIndices = []; // saved main deck indices when entering review mode
    this.savedCurrent = 0; // saved position when entering review mode
    try {
      window.addEventListener('symbols-first-toggle', () => this.toggleSymbolsFirst());
    } catch {}
  }
  _prefetchAhead(count = 12) {
    try {
      const ids = [];
      for (let k = 1; k <= count && k < this.indices.length; k++) {
        const idx = this.indices[(this.current + k) % this.indices.length];
        const id = this.signals[idx]?.id;
        if (id) ids.push(id);
      }
      let delay = 0;
      for (const id of ids) {
        // For ahead items, allow discovery of up to 2 variants so carousel is ready
        setTimeout(() => { try { MediaVariantRegistry.ensure(id, { max: 2, timeoutMs: 900 }); } catch {} }, delay);
        delay += 50;
      }
    } catch {}
  }
  async start() {
    // Show immediate loading skeleton while data is fetched
    this.view.renderLoading();
    // Prefer the app-level DB which was initialized with the active pack (base|bonus)
    try {
      const appRef = (typeof window !== 'undefined' && window.app) ? window.app : null;
      if (appRef && appRef.db && Array.isArray(appRef.db.getAll())) {
        const fromDb = appRef.db.getAll();
        if (Array.isArray(fromDb) && fromDb.length) {
          this.signals = fromDb;
        }
      }
      // Fallback: if DB not ready or empty, load based on activePack
      if (!Array.isArray(this.signals) || this.signals.length === 0) {
        const pack = (appRef && appRef.activePack) ? appRef.activePack : 'base';
        if (pack === 'bonus') {
          const mod = await import('../data/signals.js');
          this.signals = await mod.loadBonusSignalsData();
        } else {
          this.signals = await loadHandSignalsData();
        }
      }
    } catch {
      // Last resort: base
      this.signals = await loadHandSignalsData();
    }
    this.indices = this._shuffledIndices(this.signals.length);
    this.current = 0;
    this.flipped = !!this.symbolsFirst;
    this.render();
    // Warm first base GIFs (non-blocking, limited concurrency)
    try {
      const firstIds = this.indices.slice(0, 12).map((i) => this.signals[i]?.id).filter(Boolean);
      setTimeout(() => MediaVariantRegistry.prefetchBaseConcurrent(firstIds, { timeoutMs: 1100, concurrency: 3 }), 0);
    } catch {}
    this._prefetchAhead(12);
  }
  render() {
    if (this.indices.length === 0) {
      this.view.renderEmpty();
      return;
    }
    const item = this.signals[this.indices[this.current]];
    const id = item?.id;
    // On first encounter of this id in this session, randomize initial mirror once (50/50)
    if (id && !this.seen.has(id) && !this.mirror.has(id)) {
      this.mirror.set(id, Math.random() < 0.5);
    }
    const preferBase = !this.seen.has(id); // first time only
    const advanceNow = this.advanceFrontOnce || (!this.flipped && this.seen.has(id));
    if (advanceNow && id) {
      this.mirror.set(id, !this.mirror.get(id));
    }
    const mirrorFlag = id ? !!this.mirror.get(id) : false;
    this.view.render(item, { showSignal: !this.flipped, showSymbol: this.flipped, advanceFront: advanceNow, preferBase, mirror: mirrorFlag, symbolsFirst: !!this.symbolsFirst, deletedCount: this.deletedCount, reviewMode: this.reviewMode });
    this.advanceFrontOnce = false;
    if (id) this.seen.add(id);
    // For the current item, discover a few variants in the background now that it has been shown once
    try { if (id) setTimeout(() => MediaVariantRegistry.ensure(id, { max: 3, timeoutMs: 1000 }), 0); } catch {}
    this._prefetchAhead(12);
  }
  flip() {
    this.flipped = !this.flipped;
    // If we are flipping back to front (signal), advance the media variant once
    if (!this.flipped) this.advanceFrontOnce = true;
    // Animate flip without full re-render
    if (this.view.setFlipped) {
      this.view.setFlipped(this.flipped);
    } else {
      this.render();
    }
  }
  reset() {
    if (this.reviewMode) {
      // In review mode, reset empties the review bucket and returns to main deck
      this.deletedIndices = [];
      this.deletedCount = 0;
      this.exitReviewMode();
      return;
    }
    this.indices = this._shuffledIndices(this.signals.length);
    this.current = 0;
    this.flipped = !!this.symbolsFirst;
    this.deletedCount = 0;
    this.deletedIndices = [];
    this.render();
  }
  next() {
    if (this.indices.length === 0) return;
    this.current = (this.current + 1) % this.indices.length;
    this.flipped = !!this.symbolsFirst;
    this.render();
  }
  prev() {
    if (this.indices.length === 0) return;
    this.current = (this.current - 1 + this.indices.length) % this.indices.length;
    this.flipped = !!this.symbolsFirst;
    this.render();
  }
  checkAndNext() {
    // Remove current item from carousel and move on
    if (this.indices.length === 0) return;
    const removedIdx = this.indices.splice(this.current, 1)[0];
    if (!this.reviewMode) {
      // Only track deleted cards when not in review mode
      this.deletedIndices.push(removedIdx);
      this.deletedCount++;
    }
    if (this.indices.length === 0) {
      // Do not auto-restart; show completion until user resets
      this.flipped = false;
      this.render();
      return;
    }
    if (this.current >= this.indices.length) {
      this.current = 0;
    }
    this.flipped = !!this.symbolsFirst;
    this.render();
  }
  _shuffledIndices(n) {
    // Shuffle order every start/reset (Fisher–Yates)
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  shuffle() {
    // Shuffle remaining cards in current deck
    if (this.indices.length <= 1) return;
    // Fisher-Yates shuffle on current indices
    for (let i = this.indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.indices[i], this.indices[j]] = [this.indices[j], this.indices[i]];
    }
    this.current = 0;
    this.flipped = !!this.symbolsFirst;
    this.render();
  }

  toggleSymbolsFirst() {
    this.symbolsFirst = !this.symbolsFirst;
    // Re-render current card starting on the selected face
    this.flipped = !!this.symbolsFirst;
    this.render();
  }

  enterReviewMode() {
    if (this.deletedIndices.length === 0) return;
    // Save current deck state
    this.savedIndices = [...this.indices];
    this.savedCurrent = this.current;
    // Switch to review deck
    this.indices = [...this.deletedIndices];
    this.current = 0;
    this.reviewMode = true;
    this.flipped = !!this.symbolsFirst;
    this.render();
  }

  exitReviewMode() {
    // Restore main deck state
    this.indices = this.savedIndices.length > 0 ? [...this.savedIndices] : this._shuffledIndices(this.signals.length);
    this.current = Math.min(this.savedCurrent, this.indices.length - 1);
    if (this.current < 0) this.current = 0;
    this.reviewMode = false;
    this.flipped = !!this.symbolsFirst;
    this.render();
  }
}
