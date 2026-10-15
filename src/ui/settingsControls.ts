import { el } from './dom';

const ACTIVE_CLASS = 'is-active';
const ON_CLASS = 'is-on';
const SWITCH_ROLE = 'switch';

export interface ChoiceChipsOptions<T extends string> {
  readonly label: string;
  readonly choices: readonly T[];
  readonly current: T;
  readonly names: Readonly<Record<T, string>>;
  readonly onPick: (choice: T) => void;
}

export interface SwitchOptions {
  readonly label: string;
  readonly enabled: boolean;
  readonly onChange: (enabled: boolean) => void;
}

export function choiceChips<T extends string>(options: ChoiceChipsOptions<T>): HTMLElement {
  const { label, choices, current, names, onPick } = options;
  const chips = choices.map((choice) =>
    el('button', {
      class: 'chip',
      type: 'button',
      text: names[choice],
      onClick: () => {
        mark(choice);
        onPick(choice);
      },
    }),
  );
  function mark(selected: T): void {
    chips.forEach((chip, index) => {
      const active = choices[index] === selected;
      chip.classList.toggle(ACTIVE_CLASS, active);
      chip.setAttribute('aria-pressed', String(active));
    });
  }
  mark(current);
  return el(
    'div',
    { class: 'segmented segmented-wide settings-chips', 'aria-label': label },
    ...chips,
  );
}

export function switchToggle({ label, enabled, onChange }: SwitchOptions): HTMLButtonElement {
  let on = enabled;
  const button = el(
    'button',
    {
      class: 'switch',
      type: 'button',
      'aria-label': label,
      onClick: () => {
        on = !on;
        render();
        onChange(on);
      },
    },
    el('span', { class: 'switch-knob', 'aria-hidden': 'true' }),
  );
  function render(): void {
    button.classList.toggle(ON_CLASS, on);
    button.setAttribute('aria-checked', String(on));
  }
  button.setAttribute('role', SWITCH_ROLE);
  render();
  return button;
}
