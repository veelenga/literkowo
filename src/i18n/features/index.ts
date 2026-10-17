import type { UiLanguage } from '../languages';
import { bombers, speedSurge, twins } from './actionEvents';
import { arena } from './arena';
import { bossPhases } from './bossPhases';
import { course } from './course';
import { daily } from './daily';
import { enemyTypes } from './enemyTypes';
import { fever } from './fever';
import { mastery } from './mastery';
import { mergeEnemies } from './mergeEnemies';
import { notice } from './notice';
import { placement } from './placement';
import { powerWords } from './powerWords';
import { progressBackup } from './progressBackup';
import { progression } from './progression';
import { quality } from './quality';
import { settings } from './settings';
import { shop } from './shop';
import { touch } from './touch';
import { waveEvents } from './waveEvents';
import { worldMap } from './worldMap';

export function featureTexts(language: UiLanguage) {
  return {
    fever: fever[language],
    powerWords: powerWords[language],
    mergeEnemies: mergeEnemies[language],
    bossPhases: bossPhases[language],
    enemyTypes: enemyTypes[language],
    speedSurge: speedSurge[language],
    bombers: bombers[language],
    twins: twins[language],
    quality: quality[language],
    touch: touch[language],
    progression: progression[language],
    mastery: mastery[language],
    waveEvents: waveEvents[language],
    shop: shop[language],
    worldMap: worldMap[language],
    course: course[language],
    arena: arena[language],
    daily: daily[language],
    placement: placement[language],
    settings: settings[language],
    notice: notice[language],
    progressBackup: progressBackup[language],
  };
}
