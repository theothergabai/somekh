import { TeachingController } from './controllers/TeachingController.js';
import { PracticeController } from './controllers/PracticeController.js';
import { HelpController } from './controllers/HelpController.js';
import { SingleModeController } from './controllers/SingleModeController.js';

export function setupRoutes(navigate) {
  const render = async () => {
    const root = document.getElementById('app');
    const hash = window.location.hash || '#/';
    if (hash === '#/' || hash === '') {
      // Default to single, preserving no query here
      navigate('#/single');
      return;
    }
    // Recognize '#/single' with optional query string (e.g., '#/single?pack=bonus')
    if (hash === '#/home' || hash.startsWith('#/single')) {
      const controller = new SingleModeController();
      Promise.resolve().then(() => controller.start());
      return;
    }
    if (hash === '#/teach') {
      const controller = new TeachingController();
      Promise.resolve().then(() => controller.startSession());
      return;
    }
    if (hash === '#/practice') {
      const controller = new PracticeController();
      Promise.resolve().then(() => controller.startQuiz());
      return;
    }
    if (hash === '#/help') {
      const controller = new HelpController();
      Promise.resolve().then(() => controller.start());
      return;
    }
  };

  window.addEventListener('hashchange', render);
  window.addEventListener('render:home', () => {});
  render();
}
