import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/jetbrains-mono/800.css';
import './styles.css';
import { App } from './app/App';
import { reloadOnceOnPreloadError } from './app/preloadRecovery';
import { registerServiceWorker } from './app/serviceWorker';
import { FINGER_COLORS } from './course/fingers';
import { fitAboveKeyboard } from './ui/keyboardFit';
import { applyReducedMotion } from './ui/motionPreference';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing #app root');

for (const [finger, color] of Object.entries(FINGER_COLORS)) {
  document.documentElement.style.setProperty(`--finger-${finger}`, color);
}

reloadOnceOnPreloadError();
registerServiceWorker();
fitAboveKeyboard();
applyReducedMotion();
new App(root).start();
