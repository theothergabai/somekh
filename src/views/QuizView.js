import { SignalRenderer } from '../components/SignalRenderer.js';

export class QuizView {
  constructor({ onReveal, onNext } = {}) {
    this.onReveal = onReveal;
    this.onNext = onNext;
    this.symbolContainer = null;
    this.nameContainer = null;
    this.renderer = new SignalRenderer();
  }
  displayQuestion(question) {
    const root = document.getElementById('app');
    root.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'card';

    const title = document.createElement('h2');
    title.textContent = 'Identify this hand signal';

    const visual = document.createElement('div');
    // render media with fallback, hide symbol and title until selection
    this.renderer.displaySignal(visual, question?.prompt, { showSymbol: false, showTitle: false });

    // Reveal button (shows name and symbol)
    const revealBtn = document.createElement('button');
    revealBtn.textContent = 'Reveal name';
    revealBtn.addEventListener('click', () => {
      revealBtn.disabled = true;
      this.onReveal && this.onReveal(question);
      nextBtn.disabled = false;
    });

    // Next button (disabled until reveal)
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.className = 'secondary';
    nextBtn.disabled = true;
    nextBtn.style.marginLeft = '8px';
    nextBtn.addEventListener('click', () => {
      this.onNext && this.onNext();
    });

    const actions = document.createElement('div');
    actions.className = 'row';
    actions.appendChild(revealBtn);
    actions.appendChild(nextBtn);

    // Home button (return to main menu)
    const homeBtn = document.createElement('button');
    homeBtn.textContent = 'Home';
    homeBtn.style.marginLeft = '8px';
    homeBtn.addEventListener('click', () => {
      window.location.hash = '#/home';
    });
    actions.appendChild(homeBtn);

    // Symbol container (hidden until selection)
    this.symbolContainer = document.createElement('div');
    this.symbolContainer.style.marginTop = '8px';
    this.symbolContainer.style.minHeight = '2.4rem';
    this.symbolContainer.hidden = true;

    // Name container (hidden until selection)
    this.nameContainer = document.createElement('div');
    this.nameContainer.style.marginTop = '4px';
    this.nameContainer.style.fontWeight = '600';
    this.nameContainer.hidden = true;

    card.appendChild(title);
    card.appendChild(visual);
    card.appendChild(actions);
    card.appendChild(this.nameContainer);
    card.appendChild(this.symbolContainer);
    root.appendChild(card);
  }
  reveal(question) {
    // reveal symbol for the prompt
    if (this.symbolContainer && question?.prompt) {
      const sym = question.prompt.symbol;
      this.symbolContainer.innerHTML = '';
      if (sym) {
        if (typeof sym === 'string' && sym.startsWith('./')) {
          const symbolImg = document.createElement('img');
          symbolImg.alt = question.prompt.symbolAlt || `${question.prompt.name} symbol`;
          symbolImg.src = sym;
          symbolImg.style.maxWidth = '96px';
          this.symbolContainer.appendChild(symbolImg);
        } else {
          const symbolText = document.createElement('div');
          const isCombining = /\p{M}/u.test(sym);
          const aleph = '\u05D0';
          symbolText.textContent = isCombining ? `${aleph}${sym}` : sym;
          symbolText.style.fontSize = '2rem';
          symbolText.style.lineHeight = '1.2';
          symbolText.dir = 'auto';
          this.symbolContainer.appendChild(symbolText);
        }
        this.symbolContainer.hidden = false;
      }
    }
    // reveal name for the prompt
    if (this.nameContainer && question?.prompt?.name) {
      this.nameContainer.textContent = question.prompt.name;
      this.nameContainer.hidden = false;
    }
  }
  showResults({ score, total }) {
    const root = document.getElementById('app');
    root.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'card';
    const h = document.createElement('h2');
    h.textContent = 'Practice complete';
    card.appendChild(h);
    root.appendChild(card);
  }
}
