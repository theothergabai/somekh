import { TeachingController } from './controllers/TeachingController.js?v=20251107.4';
import { PracticeController } from './controllers/PracticeController.js?v=20251107.4';
import { HelpController } from './controllers/HelpController.js?v=20251107.4';
import { SingleModeController } from './controllers/SingleModeController.js?v=20251107.4';

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
    if (hash === '#/help') {
      const controller = new HelpController();
      await controller.start();
      return;
    }
  };

  window.addEventListener('hashchange', render);
  window.addEventListener('render:home', () => {});
  render();
}
