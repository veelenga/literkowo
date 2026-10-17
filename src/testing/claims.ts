import { PageClasses } from '../game/claims/PageClasses';
import { TimeScale } from '../game/claims/TimeScale';
import type { MechanicContext } from '../game/mechanics/Mechanic';

export type ClaimContext = Pick<MechanicContext, 'claimTimeScale' | 'claimPageClass'>;

export interface FakeClaims {
  readonly timeScale: TimeScale;
  readonly context: ClaimContext;
  hasPageClass(name: string): boolean;
}

export function fakeClaims(): FakeClaims {
  const timeScale = new TimeScale();
  const page = document.createElement('div').classList;
  const pageClasses = new PageClasses(page);
  return {
    timeScale,
    context: {
      claimTimeScale: (scale) => timeScale.claim(scale),
      claimPageClass: (name) => pageClasses.claim(name),
    },
    hasPageClass: (name) => page.contains(name),
  };
}
