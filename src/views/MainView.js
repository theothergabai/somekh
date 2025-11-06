export class MainView {
  constructor({ onStartTeaching, onStartPractice } = {}) {
    this.onStartTeaching = onStartTeaching;
    this.onStartPractice = onStartPractice;
  }
  render(root) {
    root.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'row';

    const teach = document.createElement('div');
    teach.className = 'card';
    teach.innerHTML = `<h2>Teaching Mode</h2><p>Learn the 20 hand signals with visuals and text instructions.</p>`;
    const teachBtn = document.createElement('button');
    teachBtn.textContent = 'Start Teaching';
    teachBtn.addEventListener('click', () => this.onStartTeaching && this.onStartTeaching());
    teach.appendChild(teachBtn);

    const practice = document.createElement('div');
    practice.className = 'card';
    practice.innerHTML = `<h2>Practice Mode</h2><p>Test your knowledge with a quick quiz.</p>`;
    const practiceBtn = document.createElement('button');
    practiceBtn.textContent = 'Start Practice';
    practiceBtn.className = 'secondary';
    practiceBtn.addEventListener('click', () => this.onStartPractice && this.onStartPractice());
    practice.appendChild(practiceBtn);

    wrap.appendChild(teach);
    wrap.appendChild(practice);
    root.appendChild(wrap);
  }
}
