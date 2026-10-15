import { levelProgress } from '../../course/xp';
import { i18n } from '../../i18n/i18n';
import { totalStars, type Profile } from '../../profiles/Profile';
import { arenaButton } from '../arena/arenaParts';
import { characterAvatar } from '../CharacterAvatar';
import { el, icon, svg } from '../dom';
import { coinIcon, levelDisc, rankName, xpBar } from '../progression';
import { shopButton } from '../shopParts';
import { soundToggle } from '../SoundToggle';

const BACK_ICON_PATH =
  'M14.7 5.3a1 1 0 0 1 0 1.4L9.4 12l5.3 5.3a1 1 0 0 1-1.4 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.4 0z';

interface HeaderActions {
  onSwitchPlayer: () => void;
  onShop: () => void;
  onArena: () => void;
}

export function mapHeader(profile: Profile, actions: HeaderActions): HTMLElement {
  const t = i18n.t;
  return el(
    'header',
    { class: 'map-header' },
    playerChip(profile, actions.onSwitchPlayer),
    el('h1', { class: 'map-logo', text: t.appName }),
    el(
      'div',
      { class: 'map-stats' },
      statPill(icon('star', 'stat-icon stat-icon-star'), totalStars(profile), t.stars),
      statPill(coinIcon('stat-icon coin-icon'), profile.coins, t.features.progression.coins),
      arenaButton(profile, actions.onArena),
      shopButton(profile, actions.onShop),
      soundToggle(),
    ),
  );
}

function playerChip(profile: Profile, onSwitchPlayer: () => void): HTMLElement {
  const t = i18n.t;
  const { level, fraction } = levelProgress(profile.xp);
  return el(
    'button',
    {
      class: 'profile-chip',
      title: t.switchPlayer,
      'aria-label': `${t.switchPlayer}: ${profile.name}`,
      onClick: onSwitchPlayer,
    },
    backIcon(),
    el(
      'span',
      { class: 'map-avatar' },
      characterAvatar(profile.avatar),
      levelDisc(level, 'map-level'),
    ),
    el(
      'span',
      { class: 'profile-chip-text' },
      el('strong', { class: 'profile-chip-name', text: profile.name }),
      el('small', { class: 'profile-chip-rank', text: rankName(level) }),
      xpBar(fraction, 'xp-bar xp-bar-thin map-xp').element,
    ),
  );
}

function statPill(symbol: SVGElement, value: number, label: string): HTMLElement {
  return el(
    'div',
    { class: 'stat-pill', title: label, 'aria-label': `${label}: ${value}` },
    symbol,
    el('strong', { text: String(value) }),
  );
}

function backIcon(): SVGSVGElement {
  return svg(
    'svg',
    { viewBox: '0 0 24 24', class: 'profile-chip-back', 'aria-hidden': 'true' },
    svg('path', { d: BACK_ICON_PATH }),
  );
}
