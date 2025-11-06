import { generateRandomQuestions } from '../utils/QuizGenerator.js';
import { QuizView } from '../views/QuizView.js';

export class PracticeController {
  constructor() {
    this.questions = [];
    this.view = new QuizView({
      onReveal: (q) => this.onReveal(q),
      onNext: () => this.next()
    });
    this.index = 0;
  }
  async startQuiz() {
    this.questions = await generateRandomQuestions(5);
    this.index = 0;
    this.view.displayQuestion(this.questions[this.index]);
  }
  onReveal(question) {
    // Reveal name and symbol (no scoring in this mode)
    this.view.reveal(question);
  }
  next() {
    this.index += 1;
    if (this.index < this.questions.length) {
      this.view.displayQuestion(this.questions[this.index]);
      return;
    }
    // Replenish with a fresh randomized set of the same length and continue
    const count = Math.max(1, this.questions.length);
    generateRandomQuestions(count).then((qs) => {
      this.questions = qs;
      this.index = 0;
      this.view.displayQuestion(this.questions[this.index]);
    });
  }
}
