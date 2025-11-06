export class FeedbackDisplay {
  showFeedback(isCorrect) {
    const el = document.createElement('div');
    el.className = 'card';
    el.textContent = isCorrect ? 'Correct!' : 'Incorrect';
    document.getElementById('app').appendChild(el);
    setTimeout(() => el.remove(), 800);
  }
}
