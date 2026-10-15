import { i18n } from '../i18n/i18n';
import type { Speaker, StoryScene } from '../story/story';
import { el, prefersReducedMotion, restartAnimation } from './dom';
import { createOverlay, onWindowKey, type Overlay } from './overlay';

const PORTRAITS: Record<Speaker, string> = { owl: '🦉', fox: '🦊', shadow: '🌑' };
const REVEAL_INTERVAL_MS = 22;
const ADVANCE_KEYS = new Set(['Enter', ' ']);

class Typewriter {
  private text = '';
  private shown = 0;
  private timer = 0;

  constructor(private readonly target: HTMLElement) {}

  get isTyping(): boolean {
    return this.shown < this.text.length;
  }

  play(text: string): void {
    this.stop();
    this.text = text;
    this.shown = prefersReducedMotion() ? text.length : 0;
    this.render();
    if (this.isTyping) this.timer = window.setInterval(this.tick, REVEAL_INTERVAL_MS);
  }

  complete(): void {
    this.stop();
    this.shown = this.text.length;
    this.render();
  }

  stop(): void {
    window.clearInterval(this.timer);
  }

  private readonly tick = (): void => {
    this.shown += 1;
    this.render();
    if (!this.isTyping) this.stop();
  };

  private render(): void {
    this.target.textContent = this.text.slice(0, this.shown);
  }
}

export function storyCard(scene: StoryScene, onDone: () => void): Overlay {
  let index = 0;
  const portrait = el('div', { class: 'story-portrait' });
  const name = el('span', { class: 'story-name' });
  const ghost = el('span', { class: 'story-text-ghost', 'aria-hidden': 'true' });
  const live = el('span', { class: 'story-text-live' });
  const typewriter = new Typewriter(live);
  const dots = scene.lines.map(() => el('span', { class: 'story-dot' }));
  const button = el('button', { class: 'button button-primary', onClick: () => advance() });
  const dialogue = el(
    'div',
    { class: 'story-dialogue' },
    portrait,
    el(
      'div',
      { class: 'story-body' },
      name,
      el('p', { class: 'story-text' }, ghost, live),
      el(
        'div',
        { class: 'story-footer' },
        el('div', { class: 'story-dots', 'aria-hidden': 'true' }, ...dots),
        el(
          'div',
          { class: 'story-controls' },
          el('kbd', { class: 'kbd story-hint', text: '⏎', title: 'Enter' }),
          button,
        ),
      ),
    ),
  );

  const render = () => {
    const line = scene.lines[index];
    const t = i18n.t;
    const text = line.text[i18n.current];
    if (dialogue.dataset.speaker !== line.speaker) restartAnimation(portrait, 'is-entering');
    portrait.textContent = PORTRAITS[line.speaker];
    dialogue.dataset.speaker = line.speaker;
    name.textContent = t[line.speaker];
    ghost.textContent = text;
    typewriter.play(text);
    dots.forEach((dot, position) => dot.classList.toggle('is-active', position <= index));
    button.textContent = index === scene.lines.length - 1 ? t.continue : '→';
  };

  const advance = () => {
    if (typewriter.isTyping) return typewriter.complete();
    index += 1;
    if (index >= scene.lines.length) return onDone();
    render();
  };

  const stopListening = onWindowKey((event) => {
    if (!ADVANCE_KEYS.has(event.key)) return;
    event.preventDefault();
    advance();
  });

  render();
  return createOverlay(
    el('div', { class: 'overlay overlay-story' }, dialogue),
    () => typewriter.stop(),
    stopListening,
  );
}
