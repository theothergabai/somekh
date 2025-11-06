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
  }

  render(signal, { showSignal = true, showSymbol = false } = {}) {
    const root = document.getElementById('app');
    root.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'card';

    // Flip card container
    const flipCard = document.createElement('div');
    flipCard.className = 'flip-card';
    flipCard.style.cursor = 'pointer';
    flipCard.style.position = 'relative';
    const handleFlip = (e) => { e.stopPropagation(); if (this.onFlip) this.onFlip(); };
    flipCard.addEventListener('click', handleFlip);
    flipCard.tabIndex = 0;
    flipCard.setAttribute('role', 'button');
    flipCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFlip(e); }
    });

    const flipInner = document.createElement('div');
    flipInner.className = 'flip-inner';
    if (showSymbol && !showSignal) flipInner.classList.add('flipped');
    this.flipInnerEl = flipInner;

    const front = document.createElement('div');
    front.className = 'flip-face flip-front';
    this.renderer.displaySignal(front, signal, { showTitle: false, showSignal: true, showSymbol: false, symbolSize: '4rem' });

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
      b.style.padding = '0';
      b.style.width = '40px';
      b.style.height = '40px';
      b.style.border = 'none';
      b.style.background = 'transparent';
      b.style.color = 'rgba(230,237,243,0.4)';
      b.style.fontSize = '34px';
      b.style.lineHeight = '40px';
      b.style.cursor = 'pointer';
      b.style.zIndex = '5';
      b.style.transition = 'color 0.2s ease';
      b.addEventListener('mouseenter', () => { b.style.color = '#60a5fa'; });
      b.addEventListener('mouseleave', () => { b.style.color = 'rgba(230,237,243,0.4)'; });
      return b;
    };
    const prevBtn = mkNavBtn('‹');
    prevBtn.style.left = '8px';
    prevBtn.title = 'Back';
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); this.onPrev && this.onPrev(); });
    const nextBtnSide = mkNavBtn('›');
    nextBtnSide.style.right = '8px';
    nextBtnSide.title = 'Next';
    nextBtnSide.addEventListener('click', (e) => { e.stopPropagation(); this.onNext && this.onNext(); });

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

