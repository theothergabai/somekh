export class SignalRenderer {
  displaySignal(container, signal, options = {}) {
    container.innerHTML = '';
    const showTitle = options.showTitle !== false;
    const showSignal = options.showSignal !== false; // default true
    const title = document.createElement('h3');
    title.textContent = signal?.name || 'Signal';
    const img = document.createElement('img');
    img.alt = signal?.name || 'Signal';
    // choose media with fallback: explicit -> randomized variants -> inferred gif -> inferred png -> placeholder
    const id = signal?.id;
    const placeholder = 'https://via.placeholder.com/640x360?text=Signal';
    let triedPng = false;
    let triedGif = false;
    const trySet = (src) => { img.src = src; };
    const tryGif = () => { if (id && !triedGif) { triedGif = true; trySet(`./assets/signals/${id}.gif`); return true; } return false; };
    const tryPng = () => { if (id && !triedPng) { triedPng = true; trySet(`./assets/signals/${id}.png`); return true; } return false; };
    const tryRandomVariant = () => {
      // Prefer explicit mediaVariants from data if provided
      const list = Array.isArray(signal?.mediaVariants) ? [...signal.mediaVariants] : [];
      // Also support implicit numbered variants: id-1.gif/png ... id-9.gif/png
      for (let n = 1; n <= 9; n++) {
        list.push(`./assets/signals/${id}-${n}.gif`);
        list.push(`./assets/signals/${id}-${n}.png`);
      }
      if (list.length === 0) return false;
      // choose a random one and set; onerror will continue fallback chain
      const choice = list[Math.floor(Math.random() * list.length)];
      trySet(choice);
      return true;
    };
    img.onerror = () => {
      // fall back gif -> png -> placeholder
      if (!triedGif && tryGif()) return;
      if (!triedPng && tryPng()) return;
      if (img.src !== placeholder) img.src = placeholder;
    };
    if (signal?.media) {
      trySet(signal.media);
    } else if (id && tryRandomVariant()) {
      // attempted a variant; errors will chain to gif/png/placeholder
    } else if (!tryGif()) {
      if (!tryPng()) {
        trySet(placeholder);
      }
    }

    const symbolWrap = document.createElement('div');
    symbolWrap.style.marginTop = '8px';
    symbolWrap.style.display = 'flex';
    symbolWrap.style.gap = '12px';
    symbolWrap.style.alignItems = 'center';
    symbolWrap.style.justifyContent = 'center';

    const sym = signal?.symbol;
    const showSymbol = options.showSymbol !== false;
    if (showSymbol && sym) {
      // Keep Hebrew order and positioning consistent
      symbolWrap.dir = 'rtl';
      if (typeof sym === 'string' && sym.startsWith('./')) {
        const symbolImg = document.createElement('img');
        symbolImg.alt = signal?.symbolAlt || `${signal?.name} symbol`;
        symbolImg.src = sym;
        symbolImg.style.maxWidth = '96px';
        symbolWrap.appendChild(symbolImg);
      } else {
        const aleph = '\u05D0'; // Aleph base for Hebrew combining marks
        const fontSize = options.symbolSize || '3rem';
        const lineHeight = '1.2';
        const isCombiningMark = (ch) => /[\u0300-\u036F\u0591-\u05C7]/.test(ch);
        // Support multiple symbols separated by whitespace; if not, extract individual combining marks
        let tokens = String(sym).trim().split(/\s+/).filter(Boolean);
        if (tokens.length <= 1) {
          const extracted = Array.from(String(sym)).filter((ch) => isCombiningMark(ch));
          if (extracted.length > 1) tokens = extracted;
        }
        const renderToken = (t) => {
          const el = document.createElement('div');
          const isComb = isCombiningMark(t);
          el.textContent = isComb ? `${aleph}${t}` : t;
          el.style.fontSize = fontSize;
          el.style.lineHeight = lineHeight;
          el.style.display = 'inline-flex';
          el.style.width = '1.5ch';
          el.style.justifyContent = 'center';
          el.style.unicodeBidi = 'isolate';
          el.style.direction = 'rtl';
          symbolWrap.appendChild(el);
        };
        if (tokens.length <= 1) {
          renderToken(tokens[0] || String(sym));
        } else {
          for (const t of tokens) renderToken(t);
        }
      }
    }

    if (showTitle) container.appendChild(title);
    if (showSignal) container.appendChild(img);
    if (showSymbol && sym) container.appendChild(symbolWrap);
  }
}
