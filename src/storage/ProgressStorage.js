export class ProgressStorage {
  load() {
    try {
      const raw = localStorage.getItem('hand_signals_progress');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }
  save(data) {
    try {
      localStorage.setItem('hand_signals_progress', JSON.stringify(data || {}));
    } catch (_) {}
  }
}
