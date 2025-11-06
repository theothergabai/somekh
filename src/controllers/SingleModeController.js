import { loadHandSignalsData } from '../data/signals.js';
import { SingleModeView } from '../views/SingleModeView.js';

export class SingleModeController {
  constructor() {
    this.signals = [];
    this.view = new SingleModeView({
      onReset: () => this.reset(),
      onCheck: () => this.checkAndNext(),
      onNext: () => this.next(),
      onFlip: () => this.flip(),
    });
    this.indices = [];
    this.current = 0;
    this.flipped = false; // false = show signal, true = show symbol
  }
  async start() {
    this.signals = await loadHandSignalsData();
    this.indices = this._shuffledIndices(this.signals.length);
    this.current = 0;
    this.flipped = false;
    this.render();
  }
  render() {
    if (this.indices.length === 0) {
      this.view.renderEmpty();
      return;
    }
    const item = this.signals[this.indices[this.current]];
    this.view.render(item, { showSignal: !this.flipped, showSymbol: this.flipped });
  }
  flip() {
    this.flipped = !this.flipped;
    // Toggle class on existing flip-inner to animate instead of full re-render
    if (this.view && typeof this.view.setFlipped === 'function') {
      this.view.setFlipped(this.flipped);
    } else {
      // Fallback: re-render if method not available
      this.render();
    }
  }
  reset() {
    this.indices = this._shuffledIndices(this.signals.length);
    this.current = 0;
    this.flipped = false;
    this.render();
  }
  next() {
    if (this.indices.length === 0) return;
    this.current = (this.current + 1) % this.indices.length;
    this.flipped = false;
    this.render();
  }
  checkAndNext() {
    // Remove current item from carousel and move on
    if (this.indices.length === 0) return;
    this.indices.splice(this.current, 1);
    if (this.indices.length === 0) {
      // Do not auto-restart; show completion until user resets
      this.flipped = false;
      this.render();
      return;
    }
    if (this.current >= this.indices.length) {
      this.current = 0;
    }
    this.flipped = false;
    this.render();
  }
  _shuffledIndices(n) {
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
