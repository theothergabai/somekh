import { SignalRenderer } from '../components/SignalRenderer.js';

export class SingleModeView {
  constructor({ onReset, onCheck, onNext, onPrev, onFlip, onToggleSymbolsFirst, onEnterReview, onExitReview } = {}) {
    this.onReset = onReset;
    this.onCheck = onCheck;
    this.onNext = onNext;
    this.onPrev = onPrev;
    this.onFlip = onFlip;
    this.onToggleSymbolsFirst = onToggleSymbolsFirst;
    this.onEnterReview = onEnterReview;
    this.onExitReview = onExitReview;
    this.renderer = new SignalRenderer();
    this.flipInnerEl = null;
    this._lastWasSymbol = false;
    this._symbolsFirst = false; // track deck mode for stack color
  }

  renderLoading() {
    const root = document.getElementById('app');
    root.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'card';

    const flipCard = document.createElement('div');
    flipCard.className = 'flip-card';
    flipCard.style.position = 'relative';
    flipCard.style.overflow = 'visible';

    const front = document.createElement('div');
    front.className = 'flip-face flip-front';
    // Show immediate spinner/placeholder without any id
    this.renderer.displaySignal(front, null, { showTitle: false, showSignal: true, showSymbol: false, symbolSize: '4rem' });

    flipCard.appendChild(front);
    card.appendChild(flipCard);
    root.appendChild(card);
  }

  // Animate flip without re-rendering
  setFlipped(flipped) {
    if (this.flipInnerEl) {
      this.flipInnerEl.classList.toggle('flipped', flipped);
    }
    // Stack color only changes based on deck mode (symbolsFirst), not individual flip
    // So we don't toggle stack-flipped here
    this._lastWasSymbol = flipped;
  }

  render(signal, { showSignal = true, showSymbol = false, advanceFront = false, preferBase = false, mirror = false, symbolsFirst = false, deletedCount = 0, reviewMode = false } = {}) {
    const root = document.getElementById('app');
    root.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'card';

    const stack = document.createElement('div');
    stack.style.display = 'flex';
    stack.style.flexDirection = 'column';
    stack.style.alignItems = 'center';
    stack.style.justifyContent = 'center';

    // Flip card container
    const flipCard = document.createElement('div');
    flipCard.className = 'flip-card';
    flipCard.style.cursor = 'pointer';
    flipCard.style.position = 'relative';
    flipCard.style.overflow = 'visible';
    const handleFlip = (e) => {
      // Don't flip if clicking a button or control
      if (e.target.closest('button') || e.target.closest('.card-corner-btn') || e.target.closest('.nav-chev')) return;
      // Only flip if clicking in top half of card
      const rect = flipCard.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      if (clickY > rect.height * 0.5) return;
      e.stopPropagation();
      if (this.onFlip) this.onFlip();
    };
    flipCard.addEventListener('click', handleFlip);
    flipCard.tabIndex = 0;
    flipCard.setAttribute('role', 'button');
    flipCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFlip(e); }
    });

    // Swipe navigation (left/right) using Pointer Events
    let startX = 0, startY = 0, tracking = false, swallowClick = false;
    const activateThreshold = 12;   // px before considering it a gesture
    const navigateThreshold = 56;   // px to trigger prev/next

    const onPointerDown = (e) => {
      // Skip pointer capture for buttons - let them handle their own clicks
      if (e.target.closest('button') || e.target.closest('.card-corner-btn')) return;
      tracking = true;
      swallowClick = false;
      startX = e.clientX;
      startY = e.clientY;
      flipCard.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e) => {
      if (!tracking) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      // Horizontal intent and beyond activation threshold: swallow clicks and prevent flip
      if (Math.abs(dx) > activateThreshold && Math.abs(Math.abs(dx) - Math.abs(dy)) > 4) {
        swallowClick = true;
        e.preventDefault();
      }
    };
    const onPointerUp = (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      flipCard.releasePointerCapture?.(e.pointerId);
      if (swallowClick) {
        // Decide navigation only if clearly horizontal and beyond threshold
        if (Math.abs(dx) > Math.max(navigateThreshold, Math.abs(dy))) {
          if (dx > 0) { this.onPrev && this.onPrev(); } else { this.onNext && this.onNext(); }
        }
        // prevent the click/flip after a swipe
        e.stopPropagation();
        e.preventDefault();
        swallowClick = false;
      }
    };
    flipCard.addEventListener('pointerdown', onPointerDown, { passive: true });
    flipCard.addEventListener('pointermove', onPointerMove, { passive: false });
    flipCard.addEventListener('pointerup', onPointerUp, { passive: false });
    flipCard.addEventListener('pointercancel', () => { tracking = false; swallowClick = false; });

    const flipInner = document.createElement('div');
    flipInner.className = 'flip-inner';
    const isFlipped = showSymbol && !showSignal;
    if (isFlipped) flipInner.classList.add('flipped');
    this.flipInnerEl = flipInner;
    this._symbolsFirst = symbolsFirst;
    
    // Stack color only changes based on deck mode (symbolsFirst), not individual card flip
    if (symbolsFirst) flipCard.classList.add('stack-flipped');

    const front = document.createElement('div');
    front.className = 'flip-face flip-front';
    const effectiveAdvance = !!advanceFront || (this._lastWasSymbol && showSignal && !showSymbol);
    this.renderer.displaySignal(front, signal, { showTitle: false, showSignal: true, showSymbol: false, symbolSize: '4rem', advanceVariant: effectiveAdvance, preferBase: !!preferBase, mirror: !!mirror });

    try {
      const id = signal && signal.id;
      if (id) {
        // Support combo signals with multiple pips (e.g. "kadma-azla" -> ["kadma", "azla"])
        const pips = signal.pips || [id];
        const pipIds = Array.isArray(pips) ? pips : [pips];
        
        // Upper-right corner: stack pips horizontally
        pipIds.forEach((pipId, i) => {
          const pip = document.createElement('img');
          pip.className = 'card-pip ur';
          pip.alt = '';
          pip.src = `./assets/png/${pipId}.png`;
          pip.style.width = '40px';
          pip.style.height = '40px';
          pip.style.right = `${16 + i * 44}px`;
          front.appendChild(pip);
        });
        
        // Lower-left corner: stack pips horizontally (mirrored)
        pipIds.forEach((pipId, i) => {
          const pip = document.createElement('img');
          pip.className = 'card-pip ll';
          pip.alt = '';
          pip.src = `./assets/png/${pipId}.png`;
          pip.style.width = '40px';
          pip.style.height = '40px';
          pip.style.left = `${16 + i * 44}px`;
          front.appendChild(pip);
        });
      }
    } catch {}

    const back = document.createElement('div');
    back.className = 'flip-face flip-back';
    back.innerHTML = '';
    try {

      const symRaw = (signal && (signal.symbol ?? signal.symbolAlt)) ?? '';
      const sym = String(symRaw).trim();
      if (sym) {
        const frame = document.createElement('div');
        frame.className = 'rev-frame';
        frame.style.zIndex = '1';
        const mk = (cls) => {
          const s = document.createElement('div');
          s.className = `rev-strip ${cls}`;
          const run = document.createElement('div');
          run.className = 'rev-run';
          run.textContent = (sym + '   ').repeat(30);
          s.appendChild(run);
          return s;
        };
        frame.appendChild(mk('top'));
        frame.appendChild(mk('bottom'));
        frame.appendChild(mk('left'));
        frame.appendChild(mk('right'));
        back.appendChild(frame);

        const center = document.createElement('div');
        center.className = 'symbol-text';
        center.textContent = String(sym);
        center.style.fontSize = '4rem';
        center.style.lineHeight = '1.2';
        center.style.color = '#0b1220';
        center.style.textShadow = '0 1px 0 rgba(255,255,255,0.55)';
        center.style.position = 'absolute';
        center.style.left = '50%';
        center.style.top = '50%';
        center.style.transform = 'translate(-50%, -50%)';
        center.style.textAlign = 'center';
        center.style.zIndex = '3';
        center.style.pointerEvents = 'none';
        center.style.unicodeBidi = 'isolate';
        center.style.direction = 'rtl';
        back.appendChild(center);
      } else {
        const center = document.createElement('div');
        center.className = 'symbol-text';
        center.textContent = '?';
        center.style.fontSize = '4rem';
        center.style.lineHeight = '1.2';
        center.style.color = '#0b1220';
        center.style.textShadow = '0 1px 0 rgba(255,255,255,0.55)';
        center.style.position = 'absolute';
        center.style.left = '50%';
        center.style.top = '50%';
        center.style.transform = 'translate(-50%, -50%)';
        center.style.textAlign = 'center';
        center.style.zIndex = '3';
        center.style.pointerEvents = 'none';
        back.appendChild(center);
      }
      // Info button on symbol side - positioned below the symbol, closer to center
      const info = signal && signal.info;
      const infoLines = info && (info.he || info.en);
      if (Array.isArray(infoLines) && infoLines.length > 0) {
        const btn = document.createElement('button');
        btn.className = 'signal-info-btn';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'More info');
        btn.textContent = 'i';
        // Position below center symbol
        btn.style.position = 'absolute';
        btn.style.left = '50%';
        btn.style.bottom = '20%';
        btn.style.top = 'auto';
        btn.style.transform = 'translateX(-50%)';
        btn.style.pointerEvents = 'auto';
        btn.style.fontFamily = '"Taamey David CLM", Georgia, serif';
        // Stop all events from bubbling to prevent flip
        const stopAll = (e) => { 
          e.stopImmediatePropagation(); 
          e.stopPropagation(); 
          e.preventDefault();
        };
        btn.addEventListener('pointerdown', stopAll, { capture: true });
        btn.addEventListener('pointerup', stopAll, { capture: true });
        btn.addEventListener('mousedown', stopAll, { capture: true });
        btn.addEventListener('mouseup', stopAll, { capture: true });
        btn.addEventListener('touchstart', stopAll, { capture: true, passive: false });
        btn.addEventListener('touchend', stopAll, { capture: true, passive: false });
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          const overlay = document.createElement('div');
          overlay.className = 'signal-info-overlay';
          overlay.addEventListener('click', () => { try { document.body.removeChild(overlay); } catch {} });
          const modal = document.createElement('div');
          modal.className = 'signal-info-modal';
          modal.addEventListener('click', (ev) => ev.stopPropagation());
          const body = document.createElement('div');
          body.className = 'signal-info-body';
          const lang = (info && info.he) ? 'he' : 'en';
          if (lang === 'he') {
            body.setAttribute('dir', 'rtl');
            body.style.textAlign = 'right';
          } else {
            body.setAttribute('dir', 'ltr');
            body.style.textAlign = 'left';
          }
          infoLines.forEach((ln) => {
            const d = document.createElement('div');
            d.className = 'line';
            d.textContent = String(ln || '');
            body.appendChild(d);
          });
          modal.appendChild(body);
          overlay.appendChild(modal);
          document.body.appendChild(overlay);
          e.preventDefault();
        });
        back.appendChild(btn);
      }
    } catch {}

    flipInner.appendChild(front);
    flipInner.appendChild(back);
    flipCard.appendChild(flipInner);

    const mkCornerBtn = ({ kind, title, onClick, svg }) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `card-corner-btn ${kind}`;
      b.title = title;
      b.setAttribute('aria-label', title);
      let btnTouchStart = false;
      b.addEventListener('touchstart', (e) => { e.stopPropagation(); btnTouchStart = true; }, { passive: true });
      b.addEventListener('touchend', (e) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent click from also firing
        if (btnTouchStart) { btnTouchStart = false; onClick && onClick(); }
      }, { passive: false });
      b.addEventListener('click', (e) => { e.stopPropagation(); onClick && onClick(); });
      const under = document.createElement('div');
      under.className = 'card-corner-under';
      const fold = document.createElement('div');
      fold.className = 'card-corner-fold';
      const icon = document.createElement('div');
      icon.className = 'card-corner-icon';
      icon.innerHTML = svg;
      b.appendChild(under);
      b.appendChild(fold);
      b.appendChild(icon);
      return b;
    };
    // Flip icon: bent arrow with dark back (semicircle) and light front with outline
    const flipSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 20 C4 20, 4 12, 4 12 A8 8 0 0 1 12 4" fill="#1e293b"/>
      <path d="M4 12 A8 8 0 0 1 12 4 L12 4 C12 4, 12 8, 12 8 A4 4 0 0 0 8 12 L8 12 C8 12, 4 12, 4 12 Z" fill="#1e293b"/>
      <path d="M12 4 L12 1 L20 6 L12 11 L12 8 A4 4 0 0 0 8 12 L4 12 A8 8 0 0 1 12 4 Z" fill="#ffffff" stroke="#1e293b" stroke-width="1.5"/>
    </svg>`;
    const trashSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 7h16" stroke="#0b1220" stroke-width="2" stroke-linecap="round"/><path d="M10 11v6" stroke="#0b1220" stroke-width="2" stroke-linecap="round"/><path d="M14 11v6" stroke="#0b1220" stroke-width="2" stroke-linecap="round"/><path d="M6 7l1 14h10l1-14" stroke="#0b1220" stroke-width="2" stroke-linejoin="round"/><path d="M9 7V4h6v3" stroke="#0b1220" stroke-width="2" stroke-linejoin="round"/></svg>`;
    const resetSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" fill="#0b1220"/></svg>`;
    flipCard.appendChild(mkCornerBtn({ kind: 'flip', title: 'Flip', onClick: () => this.onFlip && this.onFlip(), svg: flipSvg }));
    
    // In review mode: show reset icon in corner; in normal mode: show trash
    if (reviewMode) {
      const resetCornerBtn = mkCornerBtn({ kind: 'remove', title: 'Clear review deck', onClick: () => this.onReset && this.onReset(), svg: resetSvg });
      // Add count badge
      const countBadge = document.createElement('span');
      countBadge.textContent = deletedCount > 0 ? deletedCount : '';
      countBadge.style.position = 'absolute';
      countBadge.style.top = '50%';
      countBadge.style.left = '50%';
      countBadge.style.transform = 'translate(-50%, -50%)';
      countBadge.style.fontSize = '10px';
      countBadge.style.fontWeight = '700';
      countBadge.style.color = '#60a5fa';
      countBadge.style.background = 'rgba(255,255,255,0.9)';
      countBadge.style.padding = '1px 3px';
      countBadge.style.borderRadius = '3px';
      countBadge.style.pointerEvents = 'none';
      countBadge.style.zIndex = '35';
      resetCornerBtn.appendChild(countBadge);
      flipCard.appendChild(resetCornerBtn);
    } else {
      flipCard.appendChild(mkCornerBtn({ kind: 'remove', title: 'Remove', onClick: () => this.onCheck && this.onCheck(), svg: trashSvg }));
    }

    // Side navigation chevrons
    const mkNavBtn = (txt) => {
      const b = document.createElement('button');
      b.className = 'nav-chev';
      b.textContent = txt;
      b.style.position = 'absolute';
      b.style.top = '50%';
      b.style.transform = 'translateY(-50%)';
      // Large, finger-friendly hit area
      b.style.padding = '0';
      b.style.width = '56px';
      b.style.height = '56px';
      b.style.border = 'none';
      b.style.background = 'transparent';
      b.style.color = 'rgba(230,237,243,0.4)';
      b.style.fontSize = '34px';
      b.style.lineHeight = '56px';
      b.style.cursor = 'pointer';
      b.style.zIndex = '20';
      b.style.transition = 'color 0.2s ease';
      b.addEventListener('mouseenter', () => { b.style.color = '#60a5fa'; });
      b.addEventListener('mouseleave', () => { b.style.color = 'rgba(230,237,243,0.4)'; });
      const stop = (e) => { e.stopPropagation(); e.preventDefault(); };
      b.addEventListener('pointerdown', stop, { passive: false });
      b.addEventListener('touchstart', stop, { passive: false });
      return b;
    };
    const prevBtn = mkNavBtn('‹');
    // Position outside the deck
    prevBtn.style.left = '-60px';
    prevBtn.title = 'Back';
    prevBtn.setAttribute('aria-label', 'Previous');
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); this.onPrev && this.onPrev(); });
    prevBtn.addEventListener('pointerup', (e) => { e.stopPropagation(); this.onPrev && this.onPrev(); });
    prevBtn.addEventListener('touchend', (e) => { e.stopPropagation(); this.onPrev && this.onPrev(); });
    const nextBtnSide = mkNavBtn('›');
    nextBtnSide.style.right = '-60px';
    nextBtnSide.title = 'Next';
    nextBtnSide.setAttribute('aria-label', 'Next');
    nextBtnSide.addEventListener('click', (e) => { e.stopPropagation(); this.onNext && this.onNext(); });
    nextBtnSide.addEventListener('pointerup', (e) => { e.stopPropagation(); this.onNext && this.onNext(); });
    nextBtnSide.addEventListener('touchend', (e) => { e.stopPropagation(); this.onNext && this.onNext(); });

    flipCard.appendChild(prevBtn);
    flipCard.appendChild(nextBtnSide);

    const actions = document.createElement('div');
    actions.className = 'row';
    actions.style.justifyContent = 'center';
    actions.style.flexWrap = 'nowrap';

    // Bottom right below card: wastebasket with counter (normal mode only - to enter review)
    if (!reviewMode) {
      const bottomRightBtn = document.createElement('button');
      bottomRightBtn.type = 'button';
      bottomRightBtn.style.position = 'absolute';
      bottomRightBtn.style.right = '-6px';
      bottomRightBtn.style.bottom = '-50px';
      bottomRightBtn.style.width = '40px';
      bottomRightBtn.style.height = '48px';
      bottomRightBtn.style.background = 'transparent';
      bottomRightBtn.style.border = 'none';
      bottomRightBtn.style.cursor = 'pointer';
      bottomRightBtn.style.zIndex = '20';
      bottomRightBtn.style.display = 'flex';
      bottomRightBtn.style.flexDirection = 'column';
      bottomRightBtn.style.alignItems = 'center';
      bottomRightBtn.style.justifyContent = 'center';
      bottomRightBtn.style.padding = '0';
      // Normal mode: show wastebasket 🗑 with counter
      bottomRightBtn.innerHTML = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 7h16" stroke="rgba(230,237,243,0.6)" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M6 7l1 14h10l1-14" stroke="rgba(230,237,243,0.6)" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M9 7V4h6v3" stroke="rgba(230,237,243,0.6)" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>`;
      // Counter on solid background inside wastebasket
      const counter = document.createElement('span');
      counter.textContent = deletedCount > 0 ? deletedCount : '';
      counter.style.position = 'absolute';
      counter.style.top = '54%';
      counter.style.left = '50%';
      counter.style.transform = 'translate(-50%, -50%)';
      counter.style.fontSize = '12px';
      counter.style.fontWeight = '700';
      counter.style.color = deletedCount > 0 ? '#60a5fa' : 'rgba(230,237,243,0.5)';
      counter.style.pointerEvents = 'none';
      counter.style.background = 'rgba(2,6,23,0.85)';
      counter.style.padding = '1px 4px';
      counter.style.borderRadius = '4px';
      counter.style.minWidth = '16px';
      counter.style.textAlign = 'center';
      bottomRightBtn.appendChild(counter);
      bottomRightBtn.title = deletedCount > 0 ? 'Review deleted cards' : 'No deleted cards';
      bottomRightBtn.style.opacity = deletedCount > 0 ? '1' : '0.5';
      bottomRightBtn.addEventListener('click', (e) => { 
        e.stopPropagation(); 
        if (deletedCount > 0) this.onEnterReview && this.onEnterReview(); 
      });
      let touchStart = false;
      bottomRightBtn.addEventListener('touchstart', (e) => { e.stopPropagation(); touchStart = true; }, { passive: true });
      bottomRightBtn.addEventListener('touchend', (e) => {
        e.stopPropagation();
        if (touchStart) { touchStart = false; if (deletedCount > 0) this.onEnterReview && this.onEnterReview(); }
      }, { passive: true });
      flipCard.appendChild(bottomRightBtn);
    }
    
    // In review mode: main deck button below the card (bigger and lower)
    if (reviewMode) {
      const mainDeckBtn = document.createElement('button');
      mainDeckBtn.type = 'button';
      mainDeckBtn.innerHTML = `<svg width="44" height="56" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="0" width="16" height="22" rx="2" fill="#f8fafc" stroke="#94a3b8" stroke-width="1"/>
        <rect x="4" y="3" width="16" height="22" rx="2" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
        <rect x="7" y="6" width="16" height="22" rx="2" fill="#f8fafc" stroke="#64748b" stroke-width="1.5"/>
      </svg>`;
      mainDeckBtn.title = 'Return to main deck';
      mainDeckBtn.style.position = 'absolute';
      mainDeckBtn.style.right = '-8px';
      mainDeckBtn.style.bottom = '-110px';
      mainDeckBtn.style.background = 'transparent';
      mainDeckBtn.style.border = 'none';
      mainDeckBtn.style.cursor = 'pointer';
      mainDeckBtn.style.zIndex = '20';
      mainDeckBtn.style.padding = '0';
      mainDeckBtn.addEventListener('click', (e) => { e.stopPropagation(); this.onExitReview && this.onExitReview(); });
      let deckTouchStart = false;
      mainDeckBtn.addEventListener('touchstart', (e) => { e.stopPropagation(); deckTouchStart = true; }, { passive: true });
      mainDeckBtn.addEventListener('touchend', (e) => {
        e.stopPropagation();
        if (deckTouchStart) { deckTouchStart = false; this.onExitReview && this.onExitReview(); }
      }, { passive: true });
      flipCard.appendChild(mainDeckBtn);
    }

    // Animated mini card pack toggle
    const toggle = document.createElement('div');
    toggle.className = 'pack-toggle-anim';
    toggle.setAttribute('role', 'button');
    toggle.setAttribute('aria-label', 'Toggle starting side');
    toggle.style.cursor = 'pointer';
    
    // Mini card pack with flip animation
    const miniPack = document.createElement('div');
    miniPack.className = 'mini-pack';
    
    const miniInner = document.createElement('div');
    miniInner.className = 'mini-pack-inner';
    if (symbolsFirst) miniInner.classList.add('flipped');
    
    const miniFront = document.createElement('div');
    miniFront.className = 'mini-pack-face mini-pack-front';
    const frontImg = document.createElement('img');
    frontImg.src = './assets/png/pashta.png';
    frontImg.alt = '';
    miniFront.appendChild(frontImg);
    
    const miniBack = document.createElement('div');
    miniBack.className = 'mini-pack-face mini-pack-back';
    miniBack.textContent = 'א֙';
    
    miniInner.appendChild(miniFront);
    miniInner.appendChild(miniBack);
    miniPack.appendChild(miniInner);
    toggle.appendChild(miniPack);
    
    // Auto-flip animation every 5 seconds
    let autoFlipInterval = setInterval(() => {
      miniInner.classList.toggle('flipped');
    }, 5000);
    
    // Click to toggle
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      clearInterval(autoFlipInterval);
      this.onToggleSymbolsFirst && this.onToggleSymbolsFirst();
    });
    
    // Store interval for cleanup
    toggle._autoFlipInterval = autoFlipInterval;

    // Swipe/drag navigation with animation
    let dragStartX = null;
    let dragStartY = null;
    let isDragging = false;
    const onDragStart = (e) => {
      // Ignore if touching a button or corner control
      if (e.target.closest('button') || e.target.closest('.card-corner-btn')) return;
      const touch = e.touches ? e.touches[0] : e;
      dragStartX = touch.clientX;
      dragStartY = touch.clientY;
      isDragging = false;
      flipCard.style.transition = 'none';
    };
    const onDragMove = (e) => {
      if (dragStartX === null) return;
      const touch = e.touches ? e.touches[0] : e;
      const dx = touch.clientX - dragStartX;
      const dy = touch.clientY - dragStartY;
      // Only start visual drag if mostly horizontal
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        isDragging = true;
        // Limit drag distance and add resistance
        const limitedDx = Math.sign(dx) * Math.min(Math.abs(dx), 150) * 0.6;
        flipCard.style.transform = `translateX(${limitedDx}px)`;
      }
    };
    const onDragEnd = (e) => {
      // Also skip if this was on a button
      if (e.target.closest('button') || e.target.closest('.card-corner-btn')) return;
      if (dragStartX === null) return;
      const touch = e.changedTouches ? e.changedTouches[0] : e;
      const dx = touch.clientX - dragStartX;
      const dy = touch.clientY - dragStartY;
      const wasDragging = isDragging;
      dragStartX = null;
      dragStartY = null;
      isDragging = false;
      
      // Animate back or swipe out
      flipCard.style.transition = 'transform 0.25s ease-out';
      
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
        // Swipe out animation then navigate
        const direction = dx > 0 ? 1 : -1;
        flipCard.style.transform = `translateX(${direction * 120}px)`;
        setTimeout(() => {
          flipCard.style.transition = 'none';
          flipCard.style.transform = '';
          if (direction > 0) {
            this.onPrev && this.onPrev();
          } else {
            this.onNext && this.onNext();
          }
        }, 150);
      } else {
        // Snap back
        flipCard.style.transform = '';
      }
    };
    flipCard.addEventListener('mousedown', onDragStart);
    flipCard.addEventListener('mousemove', onDragMove);
    flipCard.addEventListener('mouseup', onDragEnd);
    flipCard.addEventListener('mouseleave', onDragEnd);
    flipCard.addEventListener('touchstart', onDragStart, { passive: true });
    flipCard.addEventListener('touchmove', onDragMove, { passive: true });
    flipCard.addEventListener('touchend', onDragEnd, { passive: true });

    stack.appendChild(flipCard);
    stack.appendChild(toggle);
    stack.appendChild(actions);
    card.appendChild(stack);
    root.appendChild(card);

    // Remember which face was shown in this render to infer flip-back next time
    this._lastWasSymbol = !!showSymbol && !showSignal;
  }

  renderEmpty() {
    const root = document.getElementById('app');
    root.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'card';

    const done = document.createElement('div');
    done.style.padding = '24px';
    done.style.textAlign = 'center';
    done.style.fontSize = '1.25rem';
    done.dir = 'rtl';
    done.style.fontFamily = "'EzraSIL-Embedded', 'Ezra SIL', 'Ezra SIL SR', 'Taamey David CLM', 'Noto Serif Hebrew', 'Noto Sans Hebrew', serif";
    done.style.fontFeatureSettings = "'mark' 1, 'mkmk' 1";
    done.textContent = 'הדרן עלך סימנים';

    const actions = document.createElement('div');
    actions.className = 'row';
    actions.style.justifyContent = 'center';

    const resetBtn = document.createElement('button');
    resetBtn.title = 'Reset';
    resetBtn.textContent = '↻';
    resetBtn.addEventListener('click', () => this.onReset && this.onReset());

    actions.appendChild(resetBtn);

    card.appendChild(done);
    card.appendChild(actions);
    root.appendChild(card);
  }
}

