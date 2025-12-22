import { setupRoutes } from './router.js';
import { SignalsDatabase, MediaVariantRegistry } from './data/SignalsDatabase.js';

export const app = {
  db: null,
  root: null,
  async setActivePack(pack) {
    // Bonus pack temporarily disabled
    const target = 'base';
    if (this.activePack === target && this.db && Array.isArray(this.db.getAll()) && this.db.getAll().length) {
      // Already loaded; still update hash and header UI
      try { localStorage.setItem('__activePack', target); } catch {}
      this.activePack = target;
      this.navigate(`#/single?pack=${encodeURIComponent(target)}`);
      return;
    }
    try { localStorage.setItem('__activePack', target); } catch {}
    this.activePack = target;
    // Reload DB with new pack
    try { await this.db.loadFromFile(this.activePack); } catch {}
    try { MediaVariantRegistry.setSource(this.db.getAll()); } catch {}
    this.navigate(`#/single?pack=${encodeURIComponent(target)}`);
  },
  async initialize() {
    this.root = document.getElementById('app');
    this.db = new SignalsDatabase();
    // Determine active pack: base | bonus
    let activePack = 'base';
    try {
      const url = new URL(window.location.href);
      const hash = window.location.hash || '';
      let hashParams = new URLSearchParams('');
      const idx = hash.indexOf('?');
      if (idx !== -1) hashParams = new URLSearchParams(hash.substring(idx + 1));
      // Bonus pack temporarily disabled
      activePack = 'base';
    } catch {}
    this.activePack = activePack;
    await this.db.loadFromFile(this.activePack);
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
    // Bonus pack UI temporarily disabled
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
      } else {
        try {
          const scripts = Array.from(document.getElementsByTagName('script'));
          const me = scripts.find(s => (s.getAttribute('src') || '').includes('/src/main.js'));
          if (me) {
            const src = new URL(me.getAttribute('src'), window.location.href);
            const v = src.searchParams.get('v');
            if (v) {
              const wm = document.querySelector('.version-watermark');
              if (wm) wm.textContent = v;
            }
          }
        } catch {}
      }
      // Always default to Taamey
      try { document.documentElement.setAttribute('data-font', 'taamey'); } catch {}
    } catch {}
    // Preserve current pack in the route for deep-linking
    try {
      const base = '#/single';
      const suffix = `?pack=${encodeURIComponent(this.activePack)}`;
      const want = base + suffix;
      // Only navigate if hash differs to avoid double renders
      if ((window.location.hash || '') !== want) this.navigate(want);
      else this.navigate(want);
    } catch {
      this.navigate('#/single');
    }
    // Warm help.json cache in background (non-blocking)
    try { fetch('./src/data/help.json', { cache: 'no-cache' }).catch(() => {}); } catch {}
  },
  navigate(route) {
    window.location.hash = route;
  },
  _installBonusUI() {
    const header = document.querySelector('header.container');
    if (!header) return;
    // Gift button (toggle bonus/base)
    let gift = document.getElementById('bonus-toggle');
    if (!gift) {
      gift = document.createElement('button');
      gift.id = 'bonus-toggle';
      gift.setAttribute('aria-label', 'Bonus');
      gift.title = 'קלפי בונוס – צירופים';
      gift.style.position = 'absolute';
      gift.style.top = '50%';
      gift.style.right = '60px';
      gift.style.transform = 'translateY(-50%)';
      gift.style.zIndex = '10';
      gift.style.fontSize = '18px';
      gift.style.lineHeight = '1';
      gift.style.color = '#0b1220';
      gift.style.background = '#86efac'; // green-300
      gift.style.border = '1px solid #22c55e';
      gift.style.width = '36px';
      gift.style.height = '36px';
      gift.style.display = 'inline-flex';
      gift.style.alignItems = 'center';
      gift.style.justifyContent = 'center';
      gift.style.borderRadius = '9999px';
      gift.style.boxShadow = '0 6px 18px rgba(0,0,0,0.20)';
      gift.style.cursor = 'pointer';
      gift.textContent = '🎁';
      const showTip = () => {
        const tip = document.createElement('div');
        tip.textContent = 'קלפי בונוס – צירופים';
        tip.style.position = 'absolute';
        tip.style.top = '100%';
        tip.style.right = '0';
        tip.style.marginTop = '8px';
        tip.style.whiteSpace = 'nowrap';
        tip.style.fontSize = '12px';
        tip.style.color = '#0b1220';
        tip.style.background = '#fef08a';
        tip.style.border = '1px solid #eab308';
        tip.style.padding = '4px 8px';
        tip.style.borderRadius = '6px';
        tip.style.boxShadow = '0 6px 18px rgba(0,0,0,0.20)';
        gift.appendChild(tip);
        setTimeout(() => tip.remove(), 1500);
      };
      gift.addEventListener('click', (e) => {
        e.preventDefault();
        const next = (this.activePack === 'bonus') ? 'base' : 'bonus';
        this.setActivePack(next);
      });
      gift.addEventListener('touchstart', () => showTip(), { passive: true });
      header.appendChild(gift);
    }
    // Unlock banner (in main container above #app)
    const main = document.querySelector('main.container');
    if (main && !document.getElementById('bonus-banner')) {
      const banner = document.createElement('div');
      banner.id = 'bonus-banner';
      banner.style.display = 'none';
      banner.style.margin = '12px 0 0';
      banner.style.padding = '10px 12px';
      banner.style.background = '#064e3b';
      banner.style.border = '1px solid #065f46';
      banner.style.borderRadius = '10px';
      banner.style.color = '#d1fae5';
      banner.style.display = 'flex';
      banner.style.alignItems = 'center';
      banner.style.justifyContent = 'space-between';
      const text = document.createElement('div');
      text.dir = 'rtl';
      text.textContent = 'נפתחה חבילת בונוס – קלפי צירופים';
      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '8px';
      const cta = document.createElement('button');
      cta.textContent = 'עבור לקלפי בונוס';
      cta.style.background = '#10b981';
      cta.style.border = '0';
      cta.style.padding = '6px 10px';
      cta.style.borderRadius = '8px';
      cta.style.cursor = 'pointer';
      cta.addEventListener('click', (e) => { e.preventDefault(); this.setActivePack('bonus'); });
      const close = document.createElement('button');
      close.textContent = '✕';
      close.setAttribute('aria-label', 'Dismiss');
      close.style.background = 'transparent';
      close.style.color = '#d1fae5';
      close.style.border = '1px solid #10b981';
      close.style.width = '32px';
      close.style.height = '32px';
      close.style.borderRadius = '9999px';
      close.style.cursor = 'pointer';
      close.addEventListener('click', () => { try { localStorage.setItem('__bonusBannerDismissed', '1'); } catch {}; banner.style.display = 'none'; });
      actions.appendChild(cta);
      actions.appendChild(close);
      banner.appendChild(text);
      banner.appendChild(actions);
      main.insertBefore(banner, main.firstChild);
    }
    // Listen for unlock events and hash changes
    try { window.addEventListener('bonus:unlocked', () => this._updateBonusUI()); } catch {}
    try { window.addEventListener('hashchange', () => this._updateBonusUI()); } catch {}
    this._updateBonusUI();
  },
  _updateBonusUI() {
    const unlocked = (localStorage.getItem('__bonusUnlocked') === '1');
    const gift = document.getElementById('bonus-toggle');
    const banner = document.getElementById('bonus-banner');
    const onBonus = this.activePack === 'bonus' || /[?#]pack=bonus/.test(window.location.hash || '') || /[?&]pack=bonus/.test(window.location.search || '');
    // Gift button visible when unlocked or if currently in bonus
    if (gift) gift.style.display = (unlocked || onBonus) ? 'inline-flex' : 'none';
    // Banner visible only when unlocked, not dismissed, and on base
    const dismissed = localStorage.getItem('__bonusBannerDismissed') === '1';
    if (banner) {
      banner.style.display = (unlocked && !dismissed && !onBonus) ? 'flex' : 'none';
    }
  }
};

// Expose for controllers and console access
try { window.app = app; } catch {}

window.addEventListener('DOMContentLoaded', () => {
  app.initialize();
});
