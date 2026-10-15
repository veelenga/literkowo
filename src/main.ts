import './styles.css';
import { App } from './app/App';
import { FINGER_COLORS } from './course/fingers';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing #app root');

for (const [finger, color] of Object.entries(FINGER_COLORS)) {
  document.documentElement.style.setProperty(`--finger-${finger}`, color);
}

new App(root).start();
