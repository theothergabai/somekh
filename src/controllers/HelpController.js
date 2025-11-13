export class HelpController {
  constructor() {
    this.root = null;
    this.lang = 'he';
    this.data = null;
    this._abort = null;
    this._session = null;
    this._onHashChange = null;
    this._onKeyDown = null;
  }
  async start() {
    this.root = document.getElementById('app');
    // Render skeleton immediately, then load data and re-render
    this.render(true);
    const session = Symbol('help');
    this._session = session;
    // Install fast-path listeners: exit on hash change and on Escape
    this._onHashChange = () => {
      if (window.location.hash !== '#/help') {
        try { this._abort?.abort(); } catch {}
        this._session = null;
        if (this.root) this.root.innerHTML = '';
        // Remove listeners
        try {
          window.removeEventListener('hashchange', this._onHashChange);
          document.removeEventListener('keydown', this._onKeyDown, true);
        } catch {}
      }
    };
    this._onKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Navigate back to single immediately
        try { this._abort?.abort(); } catch {}
        this._session = null;
        window.location.hash = '#/single';
        e.stopPropagation();
        e.preventDefault();
      }
    };
    window.addEventListener('hashchange', this._onHashChange);
    document.addEventListener('keydown', this._onKeyDown, true);
    this.loadData()
      .then(() => {
        if (this._session !== session) return;
        if (window.location.hash !== '#/help') return;
        this.render();
      })
      .catch(() => {
        if (this._session !== session) return;
        if (window.location.hash !== '#/help') return;
        this.render();
      });
  }
  async loadData() {
    try {
      // Cancel any previous in-flight request
      try { this._abort?.abort(); } catch {}
      this._abort = new AbortController();
      const res = await fetch('./src/data/help.json', { cache: 'no-cache', signal: this._abort.signal });
      this.data = await res.json();
    } catch (e) {
      this.data = { en: { title: 'Help', body: 'Content unavailable.' }, he: { title: 'עזרה', body: 'התוכן אינו זמין.' } };
    }
  }
  setLang(l) {
    this.lang = l;
    this.render();
  }
  render(loading = false) {
    const d = (this.data && this.data[this.lang]) || { title: loading ? '…' : '', body: loading ? 'Loading…' : '' };
    const wrapper = document.createElement('div');
    wrapper.className = 'help-wrap';
    // Set direction based on language
    if (this.lang === 'he') {
      wrapper.setAttribute('dir', 'rtl');
    } else {
      wrapper.setAttribute('dir', 'ltr');
    }

    const bar = document.createElement('div');
    bar.className = 'help-bar';

    const tabs = document.createElement('div');
    tabs.className = 'help-tabs';

    const btnHe = document.createElement('button');
    btnHe.textContent = 'עב';
    btnHe.className = this.lang === 'he' ? 'on' : '';
    btnHe.onclick = () => this.setLang('he');

    const btnEn = document.createElement('button');
    btnEn.textContent = 'EN';
    btnEn.className = this.lang === 'en' ? 'on' : '';
    btnEn.onclick = () => this.setLang('en');

    tabs.appendChild(btnHe);
    tabs.appendChild(btnEn);

    const title = document.createElement('h2');
    title.className = 'help-title';
    title.textContent = d.title || '';

    const body = document.createElement('div');
    body.className = 'help-body';
    const bodyText = Array.isArray(d.body) ? d.body.join('\n') : (d.body || '');
    // Build DOM nodes per line to avoid any HTML interpretation and preserve punctuation exactly
    const lines = bodyText.split('\n');
    lines.forEach((line, idx) => {
      if (line === '' && idx !== lines.length - 1) {
        body.appendChild(document.createElement('br'));
        return;
      }
      const p = document.createElement('div');
      p.textContent = line;
      body.appendChild(p);
    });

    const back = document.createElement('a');
    back.href = '#/single';
    back.className = 'help-back';
    back.textContent = '←';
    back.addEventListener('click', (e) => {
      // Navigate immediately and abort help load
      try { this._abort?.abort(); } catch {}
      this._session = null;
      // Allow hash change to proceed
    }, { passive: true });

    bar.appendChild(back);
    bar.appendChild(tabs);

    wrapper.appendChild(bar);
    wrapper.appendChild(title);
    wrapper.appendChild(body);

    const style = document.createElement('style');
    style.textContent = `
      .help-wrap { max-width: 960px; margin: 0 auto; padding: 16px; }
      .help-bar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }
      .help-tabs { display:flex; gap:8px; }
      .help-tabs button { background:#1f2937; color:#e6edf3; border:1px solid #334155; padding:8px 10px; border-radius:8px; cursor:pointer; }
      .help-tabs button.on { background:#273449; }
      .help-title { margin: 8px 0 12px; text-align:center; }
      .help-body { background:#0f172a; border:1px solid #1f2937; border-radius:10px; padding:16px; line-height:1.6; }
      .help-wrap[dir='rtl'] .help-body { direction: rtl; text-align: right; }
      .help-wrap[dir='ltr'] .help-body { direction: ltr; text-align: left; }
      .help-back { text-decoration:none; display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:9999px; background:#1f2937; border:1px solid #334155; color:#e6edf3; }
      .help-back:hover { background:#273449; }
    `;

    this.root.innerHTML = '';
    this.root.appendChild(style);
    this.root.appendChild(wrapper);
  }
}
