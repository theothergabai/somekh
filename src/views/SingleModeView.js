import { SignalRenderer } from '../components/SignalRenderer.js';

export class SingleModeView {
  constructor({ onReset, onCheck, onNext, onPrev, onFlip } = {}) {
    this.onReset = onReset;
    this.onCheck = onCheck;
    this.onNext = onNext;
    this.onPrev = onPrev;
    this.onFlip = onFlip;
    this.renderer = new SignalRenderer();
    this.flipInnerEl = null;
    this._lastWasSymbol = false;
  }

  render(signal, { showSignal = true, showSymbol = false, advanceFront = false } = {}) {
    const root = document.getElementById('app');
    root.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'card';

    // Flip card container
    const flipCard = document.createElement('div');
    flipCard.className = 'flip-card';
    flipCard.style.cursor = 'pointer';
    flipCard.style.position = 'relative';
    flipCard.style.overflow = 'visible';
    const handleFlip = (e) => { e.stopPropagation(); if (this.onFlip) this.onFlip(); };
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
    if (showSymbol && !showSignal) flipInner.classList.add('flipped');
    this.flipInnerEl = flipInner;

    const front = document.createElement('div');
    front.className = 'flip-face flip-front';
    const effectiveAdvance = !!advanceFront || (this._lastWasSymbol && showSignal && !showSymbol);
    this.renderer.displaySignal(front, signal, { showTitle: false, showSignal: true, showSymbol: false, symbolSize: '4rem', advanceVariant: effectiveAdvance });

    const back = document.createElement('div');
    back.className = 'flip-face flip-back';
    this.renderer.displaySignal(back, signal, { showTitle: false, showSignal: false, showSymbol: true, symbolSize: '4rem' });

    flipInner.appendChild(front);
    flipInner.appendChild(back);
    flipCard.appendChild(flipInner);

    // Side navigation chevrons
    const mkNavBtn = (txt) => {
      const b = document.createElement('button');
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

    const resetBtn = document.createElement('button');
    resetBtn.title = 'Reset';
    resetBtn.textContent = '↻';
    resetBtn.style.padding = '0';
    resetBtn.style.width = '40px';
    resetBtn.style.height = '40px';
    resetBtn.style.border = 'none';
    resetBtn.style.background = 'transparent';
    resetBtn.style.color = 'rgba(230,237,243,0.4)';
    resetBtn.style.fontSize = '22px';
    resetBtn.style.lineHeight = '40px';
    resetBtn.style.cursor = 'pointer';
    resetBtn.style.transition = 'color 0.2s ease';
    resetBtn.addEventListener('mouseenter', () => { resetBtn.style.color = '#60a5fa'; });
    resetBtn.addEventListener('mouseleave', () => { resetBtn.style.color = 'rgba(230,237,243,0.4)'; });
    resetBtn.addEventListener('click', () => this.onReset && this.onReset());

    const checkBtn = document.createElement('button');
    checkBtn.title = 'Check (remove from carousel)';
    checkBtn.textContent = '✓';
    checkBtn.style.padding = '0';
    checkBtn.style.width = '40px';
    checkBtn.style.height = '40px';
    checkBtn.style.border = 'none';
    checkBtn.style.background = 'transparent';
    checkBtn.style.color = 'rgba(230,237,243,0.4)';
    checkBtn.style.fontSize = '22px';
    checkBtn.style.lineHeight = '40px';
    checkBtn.style.cursor = 'pointer';
    checkBtn.style.transition = 'color 0.2s ease';
    checkBtn.addEventListener('mouseenter', () => { checkBtn.style.color = '#60a5fa'; });
    checkBtn.addEventListener('mouseleave', () => { checkBtn.style.color = 'rgba(230,237,243,0.4)'; });
    checkBtn.addEventListener('click', () => this.onCheck && this.onCheck());


    actions.appendChild(resetBtn);
    actions.appendChild(checkBtn);

    card.appendChild(flipCard);
    card.appendChild(actions);
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

