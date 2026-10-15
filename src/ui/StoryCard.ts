import { i18n } from '../i18n/i18n';
import type { Speaker, StoryScene } from '../story/story';
import { el } from './dom';

const PORTRAITS: Record<Speaker, string> = { owl: '🦉', fox: '🦊', shadow: '🌑' };

export function storyCard(scene: StoryScene, onDone: () => void): HTMLElement {
  let index = 0;
  const portrait = el('div', { class: 'story-portrait' });
  const name = el('strong', { class: 'story-name' });
  const text = el('p', { class: 'story-text' });
  const button = el('button', { class: 'button button-primary', onClick: () => advance() });
  const overlay = el(
    'div',
    { class: 'overlay overlay-story' },
    el(
      'div',
      { class: 'panel story-panel' },
      portrait,
      el('div', { class: 'story-body' }, name, text, el('div', { class: 'actions' }, button)),
    ),
  );

  const render = () => {
    const line = scene.lines[index];
    const t = i18n.t;
    portrait.textContent = PORTRAITS[line.speaker];
    portrait.className = `story-portrait is-${line.speaker}`;
    name.textContent = t[line.speaker];
    text.textContent = line.text[i18n.current];
    button.textContent = index === scene.lines.length - 1 ? t.continue : '→';
  };

  const advance = () => {
    index += 1;
    if (index >= scene.lines.length) return finish();
    render();
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      advance();
    }
  };

  const finish = () => {
    window.removeEventListener('keydown', onKey);
    overlay.remove();
    onDone();
  };

  window.addEventListener('keydown', onKey);
  render();
  return overlay;
}
