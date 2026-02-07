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
        // Remove listeners but DON'T clear root - let router handle rendering
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

    // Only show button to switch to the OTHER language
    if (this.lang === 'he') {
      const btnEn = document.createElement('button');
      btnEn.textContent = 'EN';
      btnEn.onclick = () => this.setLang('en');
      tabs.appendChild(btnEn);
    } else {
      const btnHe = document.createElement('button');
      btnHe.textContent = 'עב';
      btnHe.onclick = () => this.setLang('he');
      tabs.appendChild(btnHe);
    }

    const title = document.createElement('h2');
    title.className = 'help-title';
    title.textContent = d.title || '';

    const body = document.createElement('div');
    body.className = 'help-body';
    const bodyText = Array.isArray(d.body) ? d.body.join('\n') : (d.body || '');
    const lines = bodyText.split('\n');
    // Detect Q&A blocks (lines starting with --)
    const qaBlocks = [];
    for (let i = 0; i < lines.length; ) {
      const line = lines[i] || '';
      if (/^\s*--\s*/.test(line)) {
        const q = line.replace(/^\s*--\s*/, '');
        const ans = [];
        i++;
        while (i < lines.length && !/^\s*--\s*/.test(lines[i] || '')) {
          ans.push(lines[i] || '');
          i++;
        }
        qaBlocks.push({ q, a: ans });
      } else {
        // Not a question; treat as a standalone paragraph
        qaBlocks.push({ q: null, a: [line] });
        i++;
      }
    }
    const hasQA = qaBlocks.some(b => b.q);
    const makeTextDiv = (txt) => {
      const p = document.createElement('div');
      if (this.lang === 'he') {
        // Normalize for iOS RTL without invisible bidi codepoints that may render as tofu
        let t = String(txt || '');
        // Replace clockwise arrow symbol with ↻
        t = t.replaceAll('\u27F3', '\u21BB');
        // Map ASCII angle brackets to single guillemets
        t = t.replace(/</g, '‹').replace(/>/g, '›');
        // Replace straight quotes with Hebrew punctuation
        t = t.replace(/\"/g, '״').replace(/'/g, '׳');
        // Build content with spans for LTR runs so iOS keeps ordering without control chars
        p.dir = 'rtl'; p.style.direction = 'rtl'; p.style.unicodeBidi = 'isolate';
        const RLM = '\u200F';
        const frag = document.createDocumentFragment();
        // Split on ASCII/number/% runs (exclude period and comma so punctuation stays in RTL flow)
        const parts = t.split(/([A-Za-z0-9%+\-:=/\\]+)/g);
        // Frame with RLM at both ends to stabilize punctuation
        frag.appendChild(document.createTextNode(RLM));
        for (const part of parts) {
          if (!part) continue;
          if (/^[A-Za-z0-9%+\-:=/\\]+$/.test(part)) {
            const span = document.createElement('span');
            span.setAttribute('dir', 'ltr');
            span.style.direction = 'ltr';
            span.style.unicodeBidi = 'isolate';
            span.textContent = part;
            frag.appendChild(span);
          } else {
            frag.appendChild(document.createTextNode(part));
          }
        }
        frag.appendChild(document.createTextNode(RLM));
        p.appendChild(frag);
      } else {
        p.dir = 'ltr'; p.style.direction = 'ltr'; p.style.unicodeBidi = 'isolate';
        p.textContent = txt || '';
      }
      return p;
    };
    if (hasQA) {
      qaBlocks.forEach(({ q, a }) => {
        if (q) {
          const hasContent = Array.isArray(a) && a.some(ln => (ln || '').trim() !== '');
          if (hasContent) {
            const det = document.createElement('details');
            const sum = document.createElement('summary');
            // Put the question text directly in <summary> to keep the marker inline
            if (this.lang === 'he') {
              sum.dir = 'rtl'; sum.style.direction = 'rtl'; sum.style.unicodeBidi = 'isolate';
              const RLM = '\u200F'; sum.textContent = RLM + (q || '') + RLM;
            } else {
              sum.dir = 'ltr'; sum.style.direction = 'ltr'; sum.style.unicodeBidi = 'isolate';
              sum.textContent = q || '';
            }
            det.appendChild(sum);
            // Answer lines: preserve blank lines as <br>
            a.forEach((ln) => {
              if (ln === '') { det.appendChild(document.createElement('br')); }
              else { det.appendChild(makeTextDiv(ln)); }
            });
            body.appendChild(det);
          } else {
            // No answer content: show question as plain line (no arrow)
            const qDiv = makeTextDiv(q);
            qDiv.className = 'qa-question';
            body.appendChild(qDiv);
          }
        } else {
          // Standalone paragraph
          if (a.length === 1 && a[0] === '') body.appendChild(document.createElement('br'));
          else a.forEach(ln => body.appendChild(makeTextDiv(ln)));
        }
      });
    } else {
      // Fallback: simple per-line rendering
      lines.forEach((line, idx) => {
        if (line === '' && idx !== lines.length - 1) { body.appendChild(document.createElement('br')); return; }
        body.appendChild(makeTextDiv(line));
      });
    }

    const back = document.createElement('a');
    back.href = '#/single';
    back.className = 'help-back';
    // Arrow points in reading direction: ← for Hebrew (RTL), → for English (LTR)
    back.textContent = this.lang === 'he' ? '←' : '→';
    back.addEventListener('click', (e) => {
      // Navigate immediately and abort help load
      try { this._abort?.abort(); } catch {}
      this._session = null;
      // Allow hash change to proceed
    }, { passive: true });

    // RTL wrapper reverses flexbox visual order
    // Hebrew (RTL): tabs first in DOM appears on right, back second appears on left
    // English (LTR): tabs first in DOM appears on left, back second appears on right
    bar.appendChild(tabs);
    bar.appendChild(back);

    wrapper.appendChild(bar);
    wrapper.appendChild(title);
    wrapper.appendChild(body);

    // Footer with links and version
    const footer = document.createElement('div');
    footer.className = 'help-footer';
    
    const pdfLink = document.createElement('a');
    pdfLink.href = 'https://drive.google.com/file/d/1cGAMcxf5Vo9fnsIwAJDXch_j58SONHpZ/view?usp=sharing';
    pdfLink.target = '_blank';
    pdfLink.rel = 'noopener noreferrer';
    pdfLink.title = 'Download PDF';
    pdfLink.className = 'help-link';
    pdfLink.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="#FFFFFF"/>
      <path d="M14 3v4a1 1 0 0 0 1 1h4" fill="none" stroke="#CBD5E1" stroke-width="1"/>
      <rect x="3" y="14.2" width="10.2" height="6" rx="1.2" fill="#EF4444"/>
      <path d="M5 18.9v-3h1.5c.6 0 1 .4 1 1s-.4 1-1 1H6v1H5zm3.4-3H10c1 0 1.7.7 1.7 1.5S11 19.9 10 19.9H8.4v-4zM10 18.9c.4 0 .7-.3.7-.6s-.3-.6-.7-.6h-.6v1.2H10zm2.8-3h2.5v1h-1.5v.6h1.4v1h-1.4v1.4h-1v-4z" fill="#FFFFFF"/>
    </svg>`;
    
    const emailLink = document.createElement('a');
    emailLink.href = 'mailto:theothergabai@gmail.com';
    emailLink.title = 'Email';
    emailLink.className = 'help-link';
    emailLink.textContent = '✉️';
    
    const version = document.createElement('span');
    version.className = 'help-version';
    // Get version from script tag query param
    try {
      const scripts = Array.from(document.getElementsByTagName('script'));
      const me = scripts.find(s => (s.getAttribute('src') || '').includes('/src/main.js'));
      if (me) {
        const src = new URL(me.getAttribute('src'), window.location.href);
        const v = src.searchParams.get('v');
        if (v) version.textContent = v;
      }
    } catch {}
    
    // Checkbox to control show-on-startup
    const checkWrap = document.createElement('label');
    checkWrap.className = 'help-startup-check';
    checkWrap.style.cssText = 'display: flex; align-items: center; gap: 6px; cursor: pointer; color: rgba(230,237,243,0.7); font-size: 13px;';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.style.cssText = 'width: 16px; height: 16px; cursor: pointer;';
    // Check if user has opted out of showing help on startup
    const hideOnStartup = localStorage.getItem('help_hide_on_startup') === '1';
    checkbox.checked = hideOnStartup;
    checkbox.addEventListener('change', () => {
      localStorage.setItem('help_hide_on_startup', checkbox.checked ? '1' : '0');
    });
    const checkLabel = document.createElement('span');
    checkLabel.textContent = this.lang === 'he' ? 'אל תציג בהפעלה' : "Don't show on startup";
    checkWrap.appendChild(checkbox);
    checkWrap.appendChild(checkLabel);
    
    // Top row: PDF, email, version
    const footerTop = document.createElement('div');
    footerTop.style.cssText = 'display: flex; align-items: center; justify-content: center; gap: 16px;';
    footerTop.appendChild(pdfLink);
    footerTop.appendChild(emailLink);
    footerTop.appendChild(version);
    
    // Bottom row: checkbox
    const footerBottom = document.createElement('div');
    footerBottom.style.cssText = 'display: flex; align-items: center; justify-content: center; margin-top: 12px;';
    footerBottom.appendChild(checkWrap);
    
    footer.style.flexDirection = 'column';
    footer.appendChild(footerTop);
    footer.appendChild(footerBottom);
    wrapper.appendChild(footer);

    const style = document.createElement('style');
    style.textContent = `
      .help-wrap { max-width: 960px; margin: 0 auto; padding: 16px; }
      .help-bar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }
      .help-tabs { display:flex; gap:8px; }
      .help-tabs button { background:#1f2937; color:#e6edf3; border:1px solid #334155; padding:8px 10px; border-radius:8px; cursor:pointer; }
      .help-tabs button.on { background:#273449; }
      .help-title { margin: 8px 0 12px; text-align:center; }
      .help-body { background:#0f172a; border:1px solid #1f2937; border-radius:10px; padding:16px; line-height:1.6; }
      .help-wrap[dir='rtl'] .help-body { direction: rtl; text-align: right; font-family: -apple-system, system-ui, "Segoe UI", Roboto, Arial, sans-serif !important; font-feature-settings: normal !important; font-variant-ligatures: none !important; font-size: 18px !important; }
      .help-wrap[dir='ltr'] .help-body { direction: ltr; text-align: left; font-family: -apple-system, system-ui, "Segoe UI", Roboto, Arial, sans-serif !important; font-feature-settings: normal !important; font-variant-ligatures: none !important; font-size: 18px !important; }
      .help-back { text-decoration:none; display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:9999px; background:#1f2937; border:1px solid #334155; color:#e6edf3; }
      .help-back:hover { background:#273449; }
      .qa-question { margin: 8px 0; padding: 8px 0; font-weight: 600; }
      /* Q&A styling */
      .help-body details { margin: 8px 0; padding: 8px 10px; border: 1px solid #1f2937; border-radius: 8px; background: rgba(17,24,39,0.35); }
      .help-body summary { cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; list-style: none; }
      .help-body summary::-webkit-details-marker { display: none; }
      /* LTR default: right-pointing caret rotates down on open */
      .help-wrap[dir='ltr'] .help-body summary::before { content: '▸'; display: inline-block; transform: translateY(1px); transition: transform 0.2s ease; }
      .help-wrap[dir='ltr'] .help-body details[open] summary::before { transform: rotate(90deg) translateY(0); }
      /* RTL: use left-pointing caret, rotate -90deg on open */
      .help-wrap[dir='rtl'] .help-body summary::before { content: '◂'; display: inline-block; transform: translateY(1px); transition: transform 0.2s ease; }
      .help-wrap[dir='rtl'] .help-body details[open] summary::before { transform: rotate(-90deg) translateY(0); }
      .qa-question { margin: 8px 0; padding: 8px 0; font-weight: 600; }
      /* Footer with links and version */
      .help-footer { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 16px; padding: 12px 0; }
      .help-link { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 9999px; background: #1f2937; border: 1px solid #334155; color: #e6edf3; text-decoration: none; font-size: 18px; }
      .help-link:hover { background: #273449; }
      .help-version { color: rgba(230,237,243,0.4); font-size: 12px; }
    `;

    this.root.innerHTML = '';
    this.root.appendChild(style);
    this.root.appendChild(wrapper);
  }
}
