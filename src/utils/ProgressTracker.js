import { ProgressStorage } from '../storage/ProgressStorage.js';

export class ProgressTracker {
  constructor() {
    this.storage = new ProgressStorage();
    this.viewed = new Set(this.storage.load()?.viewed || []);
  }
  markAsViewed(signal) {
    if (!signal?.id) return;
    this.viewed.add(signal.id);
    this.storage.save({ viewed: Array.from(this.viewed) });
  }
}
