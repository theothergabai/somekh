import { TeachingController } from './controllers/TeachingController.js';
import { PracticeController } from './controllers/PracticeController.js';
import { SingleModeController } from './controllers/SingleModeController.js';

export function setupRoutes(navigate) {
  const render = async () => {
    const root = document.getElementById('app');
    const hash = window.location.hash || '#/';
    if (hash === '#/' || hash === '') {
      navigate('#/single');
      return;
    }
    if (hash === '#/home' || hash === '#/single') {
      const controller = new SingleModeController();
      await controller.start();
      return;
    }
    if (hash === '#/teach') {
      const controller = new TeachingController();
      await controller.startSession();
      return;
    }
    if (hash === '#/practice') {
      const controller = new PracticeController();
      await controller.startQuiz();
      return;
    }
  };

  window.addEventListener('hashchange', render);
  window.addEventListener('render:home', () => {});
  render();
}
