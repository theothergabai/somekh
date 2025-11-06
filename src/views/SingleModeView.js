import { SignalRenderer } from '../components/SignalRenderer.js';

export class SingleModeView {
  constructor({ onReset, onCheck, onNext, onFlip } = {}) {
    this.onReset = onReset;
    this.onCheck = onCheck;
    this.onNext = onNext;
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

    const actions = document.createElement('div');
    actions.className = 'row';
    actions.style.justifyContent = 'center';

    const resetBtn = document.createElement('button');
    resetBtn.title = 'Reset';
    resetBtn.textContent = '↻';
    resetBtn.addEventListener('click', () => this.onReset && this.onReset());

    const checkBtn = document.createElement('button');
    checkBtn.title = 'Check (remove from carousel)';
    checkBtn.textContent = '✓';
    checkBtn.className = 'secondary';
    checkBtn.addEventListener('click', () => this.onCheck && this.onCheck());

    const nextBtn = document.createElement('button');
    nextBtn.title = 'Next';
    nextBtn.textContent = '→';
    nextBtn.addEventListener('click', () => this.onNext && this.onNext());

    // Optional: small status placeholder for remaining count, can be set by controller in future if needed
    const spacer = document.createElement('div');
    spacer.style.flex = '1';

    actions.appendChild(resetBtn);
    actions.appendChild(checkBtn);
    actions.appendChild(nextBtn);
    actions.appendChild(spacer);

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

