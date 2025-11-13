import { setupRoutes } from './router.js';
import { SignalsDatabase, MediaVariantRegistry } from './data/SignalsDatabase.js';

export const app = {
  db: null,
  root: null,
  async initialize() {
    this.root = document.getElementById('app');
    this.db = new SignalsDatabase();
    await this.db.loadFromFile();
    setupRoutes(this.navigate.bind(this));
    // Provide source to registry so it can probe lazily per id
    try { MediaVariantRegistry.setSource(this.db.getAll()); } catch {}
    // Expose for console debugging
    try {
      window.__mv = MediaVariantRegistry;
      window.__mvList = (id) => (MediaVariantRegistry && MediaVariantRegistry.get && MediaVariantRegistry.get(id)) || [];
    } catch {}
    // Hide page-level boot loader now that app is initialized
    try { const boot = document.getElementById('boot-loader'); if (boot) boot.style.display = 'none'; } catch {}
    // Wire global Symbols-first toggle (header ☯ button)
    try {
      const btn = document.getElementById('symbols-first-toggle');
      if (btn) btn.addEventListener('click', () => {
        try { window.dispatchEvent(new Event('symbols-first-toggle')); } catch {}
      });
    } catch {}
    // Make the header Help button toggle help on/off
    try {
      const help = document.querySelector('.header-help');
      if (help) help.addEventListener('click', (e) => {
        e.preventDefault();
        const hash = window.location.hash || '#/single';
        if (hash === '#/help') this.navigate('#/single'); else this.navigate('#/help');
      });
    } catch {}
    this.navigate('#/single');
    // Warm help.json cache in background (non-blocking)
    try { fetch('./src/data/help.json', { cache: 'no-cache' }).catch(() => {}); } catch {}
  },
  navigate(route) {
    window.location.hash = route;
  }
};

window.addEventListener('DOMContentLoaded', () => {
  app.initialize();
});
