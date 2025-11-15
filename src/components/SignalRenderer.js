import { MediaVariantRegistry } from '../data/SignalsDatabase.js';

let __spinnerStylesAdded = false;
function __ensureSpinnerStyles() {
  if (__spinnerStylesAdded) return;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes signal-spin { to { transform: rotate(360deg); } }
    .signal-media { position: relative; display: flex; align-items: center; justify-content: center; min-height: 200px; width: 100%; }
    .signal-spinner { position: absolute; width: 48px; height: 48px; border: 4px solid rgba(148,163,184,0.5); border-top-color: #60a5fa; border-radius: 9999px; animation: signal-spin 0.9s linear infinite; z-index: 1; pointer-events: none; inset: 0; margin: auto; }
    /* Info button and modal for symbol side */
    .signal-info-btn { position: absolute; left: 8px; top: 8px; z-index: 400; width: 36px; height: 36px; border-radius: 9999px; border: 1px solid #eab308; background:#fef08a; color:#0b1220; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; font-weight:900; font-style: italic; box-shadow: 0 2px 8px rgba(0,0,0,0.25); font-size: 24px; line-height: 1; font-family: Georgia, "Times New Roman", serif; }
    .signal-info-btn:hover { background:#fde047; }
    .signal-info-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(2,6,23,0.6); display: flex; align-items: center; justify-content: center; padding: 16px; }
    .signal-info-modal { max-width: 520px; width: min(92vw, 520px); background:#0f172a; border:1px solid #334155; border-radius:12px; box-shadow: 0 20px 48px rgba(0,0,0,0.45); }
    .signal-info-head { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:12px 14px; border-bottom:1px solid #1f2937; }
    .signal-info-title { margin:0; font-size:16px; font-weight:600; color:#e6edf3; }
    .signal-info-close { width:30px; height:30px; border-radius:9999px; border:1px solid #334155; background:#1f2937; color:#e6edf3; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; }
    .signal-info-close:hover { background:#273449; }
    .signal-info-body { padding:14px; color:#e6edf3; line-height:1.6; }
    .signal-info-body .line { margin: 6px 0; }
    .signal-info-body[dir='rtl'] { direction: rtl; text-align: right; }
  `;
  document.head.appendChild(style);
  __spinnerStylesAdded = true;
}

let __siluqRefWidth = null;
const __variantIndexById = new Map();
const __lastSrcById = new Map();
const __mirrorById = new Map();

export class SignalRenderer {
  displaySignal(container, signal, options = {}) {
    // Ensure shared styles (including info button/modal) are available
    try { __ensureSpinnerStyles(); } catch {}
    container.innerHTML = '';
    const showTitle = options.showTitle !== false;
    const showSignal = options.showSignal !== false; // default true
    const title = document.createElement('h3');
    title.textContent = signal?.name || 'Signal';
    const img = document.createElement('img');
    // Suppress visible alt fallback to avoid flashing English name; keep accessibility via aria-label
    img.alt = '';
    if (signal?.name) img.setAttribute('aria-label', signal.name);
    img.style.display = 'block';
    img.style.opacity = '0';
    img.decoding = 'async';
    img.loading = 'eager';
    // media wrapper + spinner (only when showing signal)
    let mediaWrap = null;
    let spinner = null;
    if (showSignal) {
      __ensureSpinnerStyles();
      mediaWrap = document.createElement('div');
      mediaWrap.className = 'signal-media';
      spinner = document.createElement('div');
      spinner.className = 'signal-spinner';
      spinner.style.display = 'block';
      mediaWrap.appendChild(spinner);
      mediaWrap.appendChild(img);
    }

    const hideSpinner = () => { if (spinner) spinner.style.display = 'none'; };
    const showSpinner = () => { if (spinner) spinner.style.display = 'block'; };

    img.onload = () => {
      img.style.opacity = '1';
      img.style.display = 'block';
      // If there is a video element currently shown, hide it when image loads
      try {
        const v = container && container.__signalVideoEl;
        if (v) {
          v.style.opacity = '0';
        }
      } catch {}
      try {
        const id = signal?.id;
        if (id && img.currentSrc) __lastSrcById.set(id, img.currentSrc);
      } catch {}
      // Keep spinner visible if we're still showing the inline placeholder
      const cur = (img.currentSrc || img.src || '').toString();
      const isPlaceholder = cur.startsWith('data:image/svg+xml');
      if (!isPlaceholder) hideSpinner();
      // Cap the displayed width to a reference width if available
      const applyCap = (ref) => {
        if (ref && Number.isFinite(ref)) {
          const cap = Math.max(1, Math.floor(ref));
          // Set CSS variable on container so CSS can uniformly constrain width
          container.style.setProperty('--signal-max-width', cap + 'px');
        }
      };
      if (__siluqRefWidth != null) {
        applyCap(__siluqRefWidth);
      } else if (img.naturalWidth) {
        // Use this image's width as the initial reference
        __siluqRefWidth = img.naturalWidth;
        applyCap(__siluqRefWidth);
      }
    };
    // Attach early so spinner can paint before network begins
    if (showTitle) container.appendChild(title);
    if (showSignal) container.appendChild(mediaWrap || img);

    if (showSignal) {
      // choose media with fallback: explicit -> randomized variants -> inferred gif -> inferred png -> placeholder
      const id = signal?.id;
      const placeholder = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="100%" height="100%" fill="%23111b2a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="system-ui, sans-serif" font-size="20">Loading unavailable</text></svg>`
      );
      // Seed with last known good IMAGE or placeholder to avoid blank frame.
      // Do not seed the IMG with an MP4 URL (will error and cause spinner churn).
      const last = id && __lastSrcById.get(id);
      const isImgUrl = !!(last && /\.(?:gif|png|jpe?g|webp)(?:[?#].*)?$/i.test(last));
      const seed = (isImgUrl ? last : null) || placeholder;
      img.src = seed;
      img.style.opacity = '1';
      // Sync mirror state from external control (controller) on every render
      try {
        if (id && options && 'mirror' in options) {
          __mirrorById.set(id, !!options.mirror);
        }
      } catch {}
      // Kick off background probing for this id so future flips have base ready (no numbered variants on first run)
      let ensurePromise = null;
      try { if (id) ensurePromise = MediaVariantRegistry.ensure(id, { max: 0 }); } catch {}
      // base loader helper is defined below as tryBase
      const trySet = (src) => {
        const final = src; // keep as-is to leverage browser cache
        console.log('[variants] set', { id, src: final });
        const wrap = mediaWrap || container;
        const applyMirror = (el) => {
          try {
            const mirrored = !!(id && __mirrorById.get(id));
            el.style.transformOrigin = 'center';
            el.style.transform = mirrored ? 'scaleX(-1)' : 'scaleX(1)';
          } catch {}
        };
        // If already showing this URL, don't reassign; just hide spinner
        try {
          const vid = container && container.__signalVideoEl;
          const curImg = (img.currentSrc || img.src || '').toString();
          const curVid = vid && (vid.currentSrc || vid.src || '');
          if (final && (final === curImg || final === curVid)) {
            if (vid && vid.style.opacity !== '0') applyMirror(vid); else applyMirror(img);
            hideSpinner();
            return;
          }
        } catch {}
        // We will actually change media now; show spinner
        showSpinner();
        // If MP4: use a video element path
        if (/\.mp4(?:[?#].*)?$/i.test(final)) {
          let dispatched = false;
          // Prepare or reuse a hidden video element
          const makeVideo = () => {
            const v = document.createElement('video');
            v.autoplay = true; v.muted = true; v.loop = true; v.playsInline = true; v.controls = false;
            v.setAttribute('playsinline', '');
            v.preload = 'metadata';
            v.style.display = 'block';
            v.style.maxWidth = 'min(100%, var(--signal-max-width, 420px), 90vw)';
            v.style.maxHeight = '100%';
            v.style.borderRadius = img.style.borderRadius || '8px';
            v.style.opacity = '0';
            v.style.visibility = 'hidden';
            v.style.objectFit = 'contain';
            v.style.background = 'transparent';
            // Collapse box until ready to avoid any black rectangle flash
            v.style.width = '0px';
            v.style.height = '0px';
            return v;
          };
          const ensureVideo = () => {
            let v = container.__signalVideoEl;
            if (!v || v.removed) {
              v = makeVideo();
              container.__signalVideoEl = v;
            }
            // Re-attach if it was detached by an innerHTML clear
            if (!v.isConnected) {
              if (mediaWrap) {
                mediaWrap.appendChild(v);
              } else {
                container.appendChild(v);
              }
            }
            return v;
          };
          const v = ensureVideo();
          const onReady = () => {
            try { __lastSrcById.set(id, final); } catch {}
            v.style.opacity = '1';
            v.style.visibility = 'visible';
            v.style.width = '';
            v.style.height = '';
            img.style.display = 'none';
            hideSpinner();
            v.removeEventListener('loadeddata', onReady);
            v.removeEventListener('canplaythrough', onReady);
            try { v.play?.(); } catch {}
            // Apply width cap from video if we don't have a reference yet
            try {
              if (__siluqRefWidth == null && v.videoWidth) {
                __siluqRefWidth = v.videoWidth;
                const cap = Math.max(1, Math.floor(__siluqRefWidth));
                container.style.setProperty('--signal-max-width', cap + 'px');
              }
            } catch {}
            applyMirror(v);
          };
          const onError = () => {
            if (final === placeholder && id && __lastSrcById.get(id)) {
              hideSpinner();
              return;
            }
            if (!dispatched) { dispatched = true; img.dispatchEvent(new Event('error')); }
            v.removeEventListener('error', onError);
          };
          v.addEventListener('loadeddata', onReady, { once: true });
          v.addEventListener('canplaythrough', onReady, { once: true });
          v.addEventListener('error', onError, { once: true });
          // Defer src set so spinner can paint
          if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => { v.src = final; v.load?.(); });
          } else {
            setTimeout(() => { v.src = final; v.load?.(); }, 0);
          }
          return;
        }
        // Otherwise treat as image (GIF or placeholder)
        const loader = new Image();
        loader.decoding = 'async';
        loader.onload = () => {
          __lastSrcById.set(id, final);
          img.src = final;
          applyMirror(img);
        };
        let dispatched = false;
        loader.onerror = () => {
          // If we're trying to set placeholder but we already have a last src, keep the last and just hide spinner
          if (final === placeholder && id && __lastSrcById.get(id)) {
            hideSpinner();
            return;
          }
          if (!dispatched) {
            dispatched = true;
            img.dispatchEvent(new Event('error'));
          }
        };
        // schedule after a frame to allow spinner paint
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => { loader.src = final; });
        } else {
          setTimeout(() => { loader.src = final; }, 0);
        }
      };
      const baseRoot = typeof MediaVariantRegistry?.assetBase === 'function' ? MediaVariantRegistry.assetBase() : './assets/signals';
      // Base preference: MP4 first, then GIF
      const baseMp4 = id ? `${baseRoot}/${id}.mp4` : null;
      const baseGif = id ? `${baseRoot}/${id}.gif` : null;
      let triedBase = false;
      const tryBase = () => {
        if (!id || triedBase) return false;
        triedBase = true;
        // If registry already knows list, pick whichever base exists there; else prefer MP4
        const list = MediaVariantRegistry?.get?.(id);
        const pick = Array.isArray(list)
          ? (list.includes(baseMp4) ? baseMp4 : (list.includes(baseGif) ? baseGif : (baseMp4 || baseGif)))
          : (baseMp4 || baseGif);
        if (pick) { trySet(pick); return true; }
        return false;
      };

      // If asked to prefer base (first view or flip-back), try base immediately and defer other attempts to onerror
      const preferBaseNow = options.preferBase === true;
      if (preferBaseNow) {
        // Prefer the first registry variant (likely MP4) if available, else try base GIF
        const list0 = MediaVariantRegistry?.get?.(id);
        // First display mirror: follow external control if provided, else un-mirrored
        try { if (id) __mirrorById.set(id, options && 'mirror' in options ? !!options.mirror : false); } catch {}
        if (Array.isArray(list0) && list0.length > 0) {
          trySet(list0[0]);
        } else {
          tryBase();
        }
        // After ensure resolves, re-attempt using the first discovered variant if still on placeholder/seed
        if (ensurePromise && typeof ensurePromise.then === 'function') {
          ensurePromise.then(() => {
            try {
              const listNow = MediaVariantRegistry?.get?.(id);
              if (!Array.isArray(listNow) || listNow.length === 0) return;
              const curSrc = (img.currentSrc || img.src || '').toString();
              const showingPlaceholder = curSrc.startsWith('data:image/svg+xml');
              const wrap = mediaWrap || container;
              const vid = wrap && wrap.__signalVideoEl;
              const videoVisible = !!(vid && vid.currentSrc && vid.style.opacity !== '0');
              if (showingPlaceholder && !videoVisible) {
                trySet(listNow[0]);
              }
            } catch {}
          });
        }
      }
      // Choose a media variant using the pre-probed registry (falls back to data-provided variants)
      const chooseVariant = () => {
        let list = MediaVariantRegistry?.get?.(id);
        if (!Array.isArray(list) || list.length === 0) {
          list = Array.isArray(signal?.mediaVariants) ? [...signal.mediaVariants] : [];
        }
        if (!Array.isArray(list) || list.length === 0) return null;

        const advance = options.advanceVariant === true;
        const preferBase = options.preferBase === true;
        if (!__variantIndexById.has(id)) {
          __variantIndexById.set(id, 0);
          // ensure initial mirror: follow external control if provided; else default false
          try {
            if (id && !__mirrorById.has(id)) {
              __mirrorById.set(id, options && 'mirror' in options ? !!options.mirror : false);
            }
          } catch {}
        }
        if (preferBase) {
          const baseMp4C = `${baseRoot}/${id}.mp4`;
          const baseGifC = `${baseRoot}/${id}.gif`;
          let baseIdx = list.indexOf(baseMp4C);
          if (baseIdx < 0) baseIdx = list.indexOf(baseGifC);
          if (baseIdx >= 0) {
            __variantIndexById.set(id, baseIdx);
            return list[baseIdx];
          }
        }
        if (advance) {
          const current = __variantIndexById.get(id) ?? 0;
          const next = list.length > 1 ? ((current + 1) % list.length) : current;
          __variantIndexById.set(id, next);
          console.log('[variants] advance', { id, from: current, to: next });
          // If only one variant exists, toggle mirror flag to simulate carousel
          // Skip toggling if mirror is controlled externally via options
          if (list.length <= 1 && !(options && 'mirror' in options)) {
            try {
              if (id) __mirrorById.set(id, !(__mirrorById.get(id) || false));
            } catch {}
          }
        }
        const idx = __variantIndexById.get(id) ?? 0;
        return list[idx];
      };

      // onerror: try other variants from registry, then base gif/png, then placeholder
      let variantFallbackTries = 0;
      img.onerror = () => {
        const list = MediaVariantRegistry?.get?.(id);
        if (Array.isArray(list) && list.length > 0) {
          // If we haven't tried the current index yet (including single-item lists), try it
          const currentIdx = __variantIndexById.get(id) ?? 0;
          const currentUrl = list[currentIdx];
          const cur = (img.currentSrc || img.src || '').toString();
          const vidCur = container && container.__signalVideoEl && container.__signalVideoEl.currentSrc;
          const alreadyShowing = (cur && currentUrl && cur === currentUrl) || (vidCur && currentUrl && vidCur === currentUrl);
          if (!alreadyShowing) {
            variantFallbackTries++;
            trySet(currentUrl);
            return;
          }
          if (list.length > 1 && variantFallbackTries < list.length - 1) {
            const nextIdx = (currentIdx + 1) % list.length;
            __variantIndexById.set(id, nextIdx);
            variantFallbackTries++;
            trySet(list[nextIdx]);
            return;
          }
        }
        // If we haven't tried base yet, try it now once (MP4 preferred, then GIF)
        if (tryBase()) return;
        // If we already have a last good media, keep it and just hide spinner
        if (id && __lastSrcById.get(id)) { hideSpinner(); return; }
        // As a last resort, show inline placeholder
        if (img.src !== placeholder) { trySet(placeholder); return; }
        hideSpinner();
      };

      if (signal?.media) {
        trySet(signal.media);
      } else if (id) {
        if (!preferBaseNow) {
          const v = chooseVariant();
          if (v) {
            trySet(v);
          } else {
            // Try base once before any placeholder
            if (!tryBase()) {
              // Keep current lastSrc if available; otherwise placeholder
              if (id && __lastSrcById.get(id)) { hideSpinner(); }
              else { trySet(placeholder); }
            }
          }
        }
      } else {
        if (!tryBase()) {
          if (id && __lastSrcById.get(id)) { hideSpinner(); }
          else { trySet(placeholder); }
        }
      }
    }

    // No external reference fetch: cap will be derived from first successful media

    const symbolWrap = document.createElement('div');
    symbolWrap.style.marginTop = '8px';
    symbolWrap.style.display = 'flex';
    symbolWrap.style.gap = '12px';
    symbolWrap.style.alignItems = 'center';
    symbolWrap.style.justifyContent = 'center';
    symbolWrap.style.position = 'relative';

    const sym = signal?.symbol;
    const showSymbol = options.showSymbol !== false;
    if (showSymbol && sym) {
      symbolWrap.dir = 'rtl';
      if (typeof sym === 'string' && sym.startsWith('./')) {
        const symbolImg = document.createElement('img');
        symbolImg.alt = signal?.symbolAlt || `${signal?.name} symbol`;
        symbolImg.src = sym;
        symbolImg.style.maxWidth = '96px';
        symbolWrap.appendChild(symbolImg);
      } else {
        // Render the provided Unicode string as-is, preserving spaces
        const fontSize = options.symbolSize || '3rem';
        const el = document.createElement('div');
        el.className = 'symbol-text';
        const symStr = String(sym);
        // Preserve parentheses order by wrapping the entire parenthetical block as LTR
        if (symStr.includes('(') && symStr.includes(')')) {
          const frag = document.createDocumentFragment();
          const parts = symStr.split(/(\(.*?\))/g);
          for (const part of parts) {
            if (!part) continue;
            if (part.startsWith('(') && part.endsWith(')')) {
              const s = document.createElement('span');
              s.setAttribute('dir','ltr');
              s.style.direction = 'ltr';
              s.style.unicodeBidi = 'isolate';
              // Wrap with LRM on both sides to keep parentheses visible and ordered on iOS
              const LRM = '\u200E';
              s.style.fontFamily = '-apple-system, system-ui, "Segoe UI", Roboto, Arial, sans-serif';
              s.textContent = LRM + part + LRM;
              frag.appendChild(s);
            } else {
              frag.appendChild(document.createTextNode(part));
            }
          }
          el.appendChild(frag);
        } else {
          el.textContent = symStr;
        }
        el.style.fontSize = fontSize;
        el.style.lineHeight = '1.35';
        el.style.whiteSpace = 'pre';
        el.style.unicodeBidi = 'isolate';
        el.style.direction = 'rtl';
        el.style.fontFeatureSettings = "'mark' 1, 'mkmk' 1";
        el.style.display = 'inline-block';
        el.style.overflow = 'visible';
        symbolWrap.appendChild(el);

        // Add an info button if info is available for this signal
        try {
          const info = signal && signal.info;
          const infoLines = info && (info.he || info.en);
          const hasInfo = Array.isArray(infoLines) && infoLines.length > 0;
          if (hasInfo) {
            const btn = document.createElement('button');
            btn.className = 'signal-info-btn';
            btn.type = 'button';
            btn.setAttribute('aria-label', 'More info');
            btn.textContent = 'i';
            // Do not let this click bubble to any parent flip handler
            btn.style.pointerEvents = 'auto';
            const stopDown = (e) => { try { e.stopImmediatePropagation(); e.stopPropagation(); } catch(_){} };
            // Prevent flip on press, but allow click to still fire for opening
            btn.addEventListener('pointerdown', stopDown, { capture: true });
            btn.addEventListener('pointerdown', stopDown);
            btn.addEventListener('mousedown', stopDown, { capture: true });
            btn.addEventListener('mousedown', stopDown);
            btn.addEventListener('touchstart', stopDown, { capture: true });
            btn.addEventListener('touchstart', stopDown);
            btn.addEventListener('click', (e) => {
              // Let click be the single opener across desktop/mobile
              try { e.stopPropagation(); } catch(_){}
              // Build overlay
              const overlay = document.createElement('div');
              overlay.className = 'signal-info-overlay';
              overlay.addEventListener('click', () => { try { document.body.removeChild(overlay); } catch {} });
              const modal = document.createElement('div'); modal.className = 'signal-info-modal'; modal.addEventListener('click', (ev) => ev.stopPropagation());
              const body = document.createElement('div'); body.className = 'signal-info-body';
              const lang = (info && info.he) ? 'he' : 'en';
              if (lang === 'he') {
                body.setAttribute('dir','rtl');
                body.style.textAlign = 'right';
                body.style.unicodeBidi = 'isolate';
              } else {
                body.setAttribute('dir','ltr');
                body.style.textAlign = 'left';
                body.style.unicodeBidi = 'isolate';
              }
              const lines = infoLines;
              lines.forEach((ln) => { const d = document.createElement('div'); d.className='line'; d.textContent = String(ln || ''); body.appendChild(d); });
              modal.appendChild(body); overlay.appendChild(modal);
              document.body.appendChild(overlay);
              try { e.preventDefault(); } catch(_){}
            });
            // Ensure the face container can anchor the absolute button at the card corner
            try { if (getComputedStyle(container).position === 'static') container.style.position = 'relative'; } catch {}
            container.appendChild(btn);
          }
        } catch {}
      }
    }

    // Title and media already appended above
    if (showSymbol && sym) container.appendChild(symbolWrap);
  }
}
