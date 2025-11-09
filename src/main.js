import { setupRoutes } from './router.js';
import { SignalsDatabase, MediaVariantRegistry } from './data/SignalsDatabase.js';

export const app = {
  db: null,
  root: null,
  async initialize() {
    this.root = document.getElementById('app');
    this.db = new SignalsDatabase();
    await this.db.loadFromFile();
    // Pre-probe media variants for signals (max=5) at app start
    try { await MediaVariantRegistry.init(this.db.getAll(), { max: 5 }); } catch {}
    setupRoutes(this.navigate.bind(this));
    this.navigate('#/single');
  },
  navigate(route) {
    window.location.hash = route;
  }
};

window.addEventListener('DOMContentLoaded', () => {
  app.initialize();
});
