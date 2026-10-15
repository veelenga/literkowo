import type { Tally } from '../course/counters';
import { ENEMY_TYPE_TAG } from './mechanics/enemyTypes/kinds';
import { POWER_TAG } from './mechanics/powerWords/PowerEnemy';

export class RunTally implements Tally {
  words = 0;
  powerWords = 0;
  specialEnemies = 0;
  bossesBeaten = 0;

  recordWord(tags: ReadonlySet<string>): void {
    this.words += 1;
    if (tags.has(POWER_TAG)) this.powerWords += 1;
    if (tags.has(ENEMY_TYPE_TAG)) this.specialEnemies += 1;
  }

  recordBossBeaten(): void {
    this.bossesBeaten += 1;
  }

  snapshot(): Tally {
    const { words, powerWords, specialEnemies, bossesBeaten } = this;
    return { words, powerWords, specialEnemies, bossesBeaten };
  }
}
