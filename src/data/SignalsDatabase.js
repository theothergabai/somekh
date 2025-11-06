import { loadHandSignalsData } from './signals.js';

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
