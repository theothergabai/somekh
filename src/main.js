import { setupRoutes } from './router.js?v=20251107';
import { SignalsDatabase } from './data/SignalsDatabase.js?v=20251107';

export const app = {
  db: null,
  root: null,
  async initialize() {
    this.root = document.getElementById('app');
    this.db = new SignalsDatabase();
    await this.db.loadFromFile();
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
