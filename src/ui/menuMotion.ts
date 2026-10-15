import { currentQuality } from '../game/quality';
import { prefersReducedMotion } from './dom';

const STATIC_QUALITY = 'low';

export function hasAmbientMotion(): boolean {
  return !prefersReducedMotion() && currentQuality().level !== STATIC_QUALITY;
}
