export class InstructionPanel {
  showInstructions(container, signal) {
    container.innerHTML = '';
    const title = document.createElement('h3');
    title.textContent = 'Instructions';
    const p = document.createElement('p');
    p.textContent = signal?.instructions || 'Follow the visual reference to learn this hand signal.';
    container.appendChild(title);
    container.appendChild(p);
  }
}
