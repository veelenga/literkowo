import { music } from '../audio/Music';
import { sfx } from '../audio/Sfx';
import { i18n } from '../i18n/i18n';
import { el, icon } from './dom';

export function soundToggle(): HTMLButtonElement {
  const button = el('button', { class: 'sound-toggle', title: i18n.t.sound });
  const render = () => {
    const enabled = isSoundEnabled();
    button.replaceChildren(icon(enabled ? 'soundOn' : 'soundOff', 'sound-toggle-icon'));
    button.classList.toggle('is-muted', !enabled);
    button.setAttribute('aria-pressed', String(!enabled));
  };
  button.addEventListener('click', () => {
    setSoundEnabled(!isSoundEnabled());
    render();
  });
  render();
  return button;
}

function isSoundEnabled(): boolean {
  return music.enabled || sfx.enabled;
}

function setSoundEnabled(enabled: boolean): void {
  music.setEnabled(enabled);
  sfx.setEnabled(enabled);
}
