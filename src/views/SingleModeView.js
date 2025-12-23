import { SignalRenderer } from '../components/SignalRenderer.js';

export class SingleModeView {
  constructor({ onReset, onCheck, onNext, onPrev, onFlip, onToggleSymbolsFirst } = {}) {
    this.onReset = onReset;
    this.onCheck = onCheck;
    this.onNext = onNext;
    this.onPrev = onPrev;
    this.onFlip = onFlip;
    this.onToggleSymbolsFirst = onToggleSymbolsFirst;
    this.renderer = new SignalRenderer();
    this.flipInnerEl = null;
    this._lastWasSymbol = false;
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
    // Update stack edge colors
    const flipCard = this.flipInnerEl?.parentElement;
    if (flipCard) {
      flipCard.classList.toggle('stack-flipped', flipped);
    }
    this._lastWasSymbol = flipped;
  }

  render(signal, { showSignal = true, showSymbol = false, advanceFront = false, preferBase = false, mirror = false, symbolsFirst = false, deletedCount = 0 } = {}) {
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
      // Don't flip if clicking in bottom third of card (where reset button is)
      const rect = flipCard.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      if (clickY > rect.height * 0.67) return;
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
    
    // Mark flipCard for stack color
    if (isFlipped) flipCard.classList.add('stack-flipped');

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
    flipCard.appendChild(mkCornerBtn({ kind: 'flip', title: 'Flip', onClick: () => this.onFlip && this.onFlip(), svg: flipSvg }));
    flipCard.appendChild(mkCornerBtn({ kind: 'remove', title: 'Remove', onClick: () => this.onCheck && this.onCheck(), svg: trashSvg }));

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
    // Slight outside offset so it doesn't overlap content
    prevBtn.style.left = '-12px';
    prevBtn.title = 'Back';
    prevBtn.setAttribute('aria-label', 'Previous');
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); this.onPrev && this.onPrev(); });
    prevBtn.addEventListener('pointerup', (e) => { e.stopPropagation(); this.onPrev && this.onPrev(); });
    prevBtn.addEventListener('touchend', (e) => { e.stopPropagation(); this.onPrev && this.onPrev(); });
    const nextBtnSide = mkNavBtn('›');
    nextBtnSide.style.right = '-12px';
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

    // Reset button positioned under trash can (bottom right of card)
    const resetBtn = document.createElement('button');
    resetBtn.title = 'Reset';
    resetBtn.textContent = '↻';
    resetBtn.style.position = 'absolute';
    resetBtn.style.right = '-6px';
    resetBtn.style.bottom = '-52px';
    resetBtn.style.padding = '0';
    resetBtn.style.width = '40px';
    resetBtn.style.height = '40px';
    resetBtn.style.border = 'none';
    resetBtn.style.background = 'transparent';
    resetBtn.style.color = 'rgba(230,237,243,0.4)';
    resetBtn.style.fontSize = '22px';
    resetBtn.style.lineHeight = '40px';
    resetBtn.style.cursor = 'pointer';
    resetBtn.style.zIndex = '20';
    resetBtn.style.transition = 'color 0.2s ease';
    resetBtn.addEventListener('mouseenter', () => { resetBtn.style.color = '#60a5fa'; });
    resetBtn.addEventListener('mouseleave', () => { resetBtn.style.color = 'rgba(230,237,243,0.4)'; });
    let resetTouchStart = false;
    resetBtn.addEventListener('touchstart', (e) => { e.stopPropagation(); resetTouchStart = true; }, { passive: true });
    resetBtn.addEventListener('touchend', (e) => {
      e.stopPropagation();
      if (resetTouchStart) { resetTouchStart = false; this.onReset && this.onReset(); }
    }, { passive: true });
    resetBtn.addEventListener('click', (e) => { e.stopPropagation(); this.onReset && this.onReset(); });
    
    // Deleted count badge below reset button
    const countBadge = document.createElement('div');
    countBadge.textContent = deletedCount;
    countBadge.style.position = 'absolute';
    countBadge.style.right = '2px';
    countBadge.style.bottom = '-76px';
    countBadge.style.width = '28px';
    countBadge.style.height = '18px';
    countBadge.style.fontSize = '12px';
    countBadge.style.lineHeight = '18px';
    countBadge.style.textAlign = 'center';
    countBadge.style.color = 'rgba(230,237,243,0.5)';
    countBadge.style.zIndex = '20';
    flipCard.appendChild(resetBtn);
    flipCard.appendChild(countBadge);

    const toggle = document.createElement('div');
    toggle.className = 'pack-toggle';
    toggle.setAttribute('role', 'button');
    toggle.setAttribute('aria-label', 'Toggle starting side');
    const left = document.createElement('div');
    left.className = 'side';
    left.textContent = 'א֙';
    const swap = document.createElement('div');
    swap.className = 'swap';
    swap.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M16 3l4 4-4 4" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 7H10a6 6 0 0 0 0 12h1" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/><path d="M8 21l-4-4 4-4" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 17h10a6 6 0 0 0 0-12h-1" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/></svg>`;
    const right = document.createElement('div');
    right.className = 'side';
    const p = document.createElement('img');
    p.alt = '';
    p.src = './assets/png/pashta.png';
    right.appendChild(p);
    const applyActive = () => {
      left.classList.toggle('active', !!symbolsFirst);
      right.classList.toggle('active', !symbolsFirst);
    };
    applyActive();
    const toggleIfNeeded = (wantSymbolsFirst) => {
      if (!!symbolsFirst === !!wantSymbolsFirst) return;
      this.onToggleSymbolsFirst && this.onToggleSymbolsFirst();
    };
    const stop = (e) => { try { e.stopPropagation(); e.preventDefault(); } catch {} };
    left.addEventListener('click', (e) => { stop(e); toggleIfNeeded(true); });
    right.addEventListener('click', (e) => { stop(e); toggleIfNeeded(false); });
    toggle.appendChild(left);
    toggle.appendChild(swap);
    toggle.appendChild(right);

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

