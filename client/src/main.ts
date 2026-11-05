import './style.css';
import { Game } from './game';
import { UI } from './ui';

const ui = new UI();
const game = new Game(document.querySelector<HTMLCanvasElement>('#view')!, ui);

// Acceso para depurar desde la consola.
(window as unknown as { __cuboid: Game }).__cuboid = game;

ui.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = ui.nameInput.value.trim().slice(0, 16);
  ui.rememberName(name);
  ui.error('');
  ui.setJoining(true);
  try {
    await game.join(name);
    ui.hideTitle();
  } catch (err) {
    console.error(err);
    ui.error('No se pudo conectar con el servidor. ¿Está corriendo?');
  } finally {
    ui.setJoining(false);
  }
});

ui.again.addEventListener('click', async () => {
  try {
    await game.newMatch(ui.nameInput.value.trim().slice(0, 16));
  } catch (err) {
    console.error(err);
    location.reload();
  }
});
