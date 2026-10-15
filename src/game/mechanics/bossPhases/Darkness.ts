import '../../../ui/bossPhases.css';
import { LingeringAttack } from './BossAttack';

export const DARKNESS_CLASS = 'is-darkness';
export const DARKNESS_SECONDS = 8;

export class Darkness extends LingeringAttack {
  constructor() {
    super(DARKNESS_SECONDS);
  }

  protected begin(): void {
    document.body.classList.add(DARKNESS_CLASS);
  }

  protected end(): void {
    document.body.classList.remove(DARKNESS_CLASS);
  }
}
