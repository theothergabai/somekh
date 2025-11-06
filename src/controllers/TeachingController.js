import { loadHandSignalsData } from '../data/signals.js';
import { SignalRenderer } from '../components/SignalRenderer.js';
import { InstructionPanel } from '../components/InstructionPanel.js';
import { ProgressTracker } from '../utils/ProgressTracker.js';

export class TeachingController {
  constructor() {
    this.signals = [];
    this.signalIndex = 0;
    this.renderer = new SignalRenderer();
    this.instructions = new InstructionPanel();
    this.progress = new ProgressTracker();
  }
  async startSession() {
    this.signals = await loadHandSignalsData();
    this.signalIndex = 0;
    const current = this.signals[this.signalIndex];
    const root = document.getElementById('app');
    root.innerHTML = '';
    const stage = document.createElement('div');
    stage.className = 'row';

    const visual = document.createElement('div');
    visual.className = 'card';
    this.renderer.displaySignal(visual, current);

    const instr = document.createElement('div');
    instr.className = 'card';
    this.instructions.showInstructions(instr, current);

    stage.appendChild(visual);
    stage.appendChild(instr);

    const next = document.createElement('button');
    next.textContent = 'Next';
    next.addEventListener('click', () => this.next());

    root.appendChild(stage);
    root.appendChild(next);

    this.progress.markAsViewed(current);
  }
  next() {
    this.signalIndex = (this.signalIndex + 1) % this.signals.length;
    const current = this.signals[this.signalIndex];
    const cards = document.querySelectorAll('.card');
    if (cards[0]) this.renderer.displaySignal(cards[0], current);
    if (cards[1]) this.instructions.showInstructions(cards[1], current);
    this.progress.markAsViewed(current);
  }
}
