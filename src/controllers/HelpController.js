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
        // Normalize for iOS RTL: safer arrow, guillemets for <>, and isolate ASCII/number runs
        let t = String(txt || '');
        // Replace clockwise arrow symbol to a more widely supported one
        t = t.replaceAll('\u27F3', '\u21BB'); // ⟳ -> ↻
        // Map ASCII angle brackets to single guillemets
        t = t.replace(/</g, '‹').replace(/>/g, '›');
        // Wrap ASCII/number/% runs with LRI ... PDI to keep order inside RTL
        t = t.replace(/[A-Za-z0-9%+\-:=/.,]+/g, (m) => '\u2066' + m + '\u2069'); // LRI ... PDI
        p.dir = 'rtl'; p.style.direction = 'rtl'; p.style.unicodeBidi = 'isolate';
        const RLM = '\u200F'; p.textContent = RLM + t + RLM;
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
    `;

    this.root.innerHTML = '';
    this.root.appendChild(style);
    this.root.appendChild(wrapper);
  }
}
