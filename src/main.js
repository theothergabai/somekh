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
    // Runtime version override (watermark only): ?ver=... or localStorage '__versionOverride'
    try {
      const url = new URL(window.location.href);
      // Also support params inside the hash, e.g., #/single?ver=...&font=...
      const hash = window.location.hash || '';
      let hashParams = new URLSearchParams('');
      try {
        const qIndex = hash.indexOf('?');
        if (qIndex !== -1) {
          hashParams = new URLSearchParams(hash.substring(qIndex + 1));
        }
      } catch {}
      const qver = url.searchParams.get('ver') || hashParams.get('ver');
      if (qver) {
        try { localStorage.setItem('__versionOverride', qver); } catch {}
      }
      const override = qver || (localStorage.getItem('__versionOverride') || '').trim();
      if (override) {
        const wm = document.querySelector('.version-watermark');
        if (wm) wm.textContent = override;
      }
      // Runtime font override: ?font=ezra|taamey or localStorage '__fontOverride'
      const qfont = ((url.searchParams.get('font') || hashParams.get('font') || '')).toLowerCase();
      if (qfont === 'ezra' || qfont === 'taamey') {
        try { localStorage.setItem('__fontOverride', qfont); } catch {}
      }
      let fontPref = qfont || (localStorage.getItem('__fontOverride') || '').toLowerCase();
      // If no explicit font pref, infer from version override suffix for local testing
      if (!fontPref && override) {
        if (/\.2$/.test(override)) fontPref = 'taamey';
        else if (/\.3$/.test(override)) fontPref = 'ezra';
      }
      if (fontPref === 'ezra' || fontPref === 'taamey') {
        try { document.documentElement.setAttribute('data-font', fontPref); } catch {}
      }
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
