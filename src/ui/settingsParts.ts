import { i18n } from '../i18n/i18n';
import { el, svg } from './dom';
import './settings.css';

const GEAR_PATH =
  'M9.9 4.18L10.34 1.53L13.66 1.53L14.1 4.18A8.1 8.1 0 0 1 16.05 4.99L18.23 3.42L20.58 5.77L19.01 7.95A8.1 8.1 0 0 1 19.82 9.9L22.47 10.34L22.47 13.66L19.82 14.1A8.1 8.1 0 0 1 19.01 16.05L20.58 18.23L18.23 20.58L16.05 19.01A8.1 8.1 0 0 1 14.1 19.82L13.66 22.47L10.34 22.47L9.9 19.82A8.1 8.1 0 0 1 7.95 19.01L5.77 20.58L3.42 18.23L4.99 16.05A8.1 8.1 0 0 1 4.18 14.1L1.53 13.66L1.53 10.34L4.18 9.9A8.1 8.1 0 0 1 4.99 7.95L3.42 5.77L5.77 3.42L7.95 4.99A8.1 8.1 0 0 1 9.9 4.18ZM12 8.7A3.3 3.3 0 1 0 12 15.3A3.3 3.3 0 1 0 12 8.7Z';

export function gearIcon(className: string): SVGSVGElement {
  return svg(
    'svg',
    { viewBox: '0 0 24 24', class: className, 'aria-hidden': 'true' },
    svg('path', { d: GEAR_PATH, 'fill-rule': 'evenodd' }),
  );
}

export function settingsHeaderButton(onOpen: () => void): HTMLElement {
  const label = i18n.t.features.settings.open;
  return el(
    'button',
    {
      class: 'header-button settings-button',
      type: 'button',
      title: label,
      'aria-label': label,
      onClick: onOpen,
    },
    gearIcon('header-button-icon'),
    el('span', { class: 'header-button-label', text: label }),
  );
}

export function settingsGearButton(onOpen: () => void): HTMLElement {
  const label = i18n.t.features.settings.open;
  return el(
    'button',
    { class: 'settings-gear', type: 'button', title: label, 'aria-label': label, onClick: onOpen },
    gearIcon('settings-gear-icon'),
  );
}

export function settingsTextButton(onOpen: () => void): HTMLElement {
  return el(
    'button',
    { class: 'button button-ghost settings-text-button', type: 'button', onClick: onOpen },
    gearIcon('settings-text-icon'),
    i18n.t.features.settings.open,
  );
}
