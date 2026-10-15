# Mechanics

A mechanic is one gameplay feature in one module. The game owns the rules (spawning, typing, lives, phases) and calls each mechanic at fixed points. A mechanic changes the game only through the `MechanicContext` it gets in its constructor. `Fever.ts` is the reference.

## Add a mechanic

1. Create `src/game/mechanics/<Name>.ts` with a class that implements `Mechanic` and takes `MechanicContext` (or a `Pick` of it) in the constructor.
2. Add it to `MECHANICS` in `index.ts`. That is the only shared line you touch here.
3. Add a test next to it. Use `fakeMechanicContext(overrides)` from `src/testing/mechanicContext.ts`, so no WebGL is needed.

## Hooks

All hooks are optional except `dispose`. Each mechanic gets them in the order it appears in `MECHANICS`.

| Hook                     | When                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `update(delta, elapsed)` | Every unpaused frame, also during the intro and after the level ends. `delta` is real time, not scaled. Check `context.playing` before gameplay logic. |
| `onSpawn(enemy)`         | After any enemy joins the board, including the boss and enemies added by mechanics.                                                                    |
| `onHit()`                | After a correct key, once `stats` has the new combo.                                                                                                   |
| `onMistake()`            | After the combo breaks: a wrong key or a lost life.                                                                                                    |
| `onWordComplete(enemy)`  | After a word is typed, before the enemy leaves (or before the boss takes the hit). Enemies with the same word complete on the same key, once each.     |
| `onEnemyReached(enemy)`  | When an enemy reaches the hero, before the game handles it. Remove the enemy here to handle it yourself: then no life is lost.                         |
| `onPhaseChange(phase)`   | When the level starts and when each next phase begins.                                                                                                 |
| `dispose()`              | When the game is destroyed. Remove your meshes from the scene and free their resources.                                                                |

## Context

Read only:

- `enemies`: live list of enemies on the board. Never mutate it, use the methods below.
- `player` (`object`, `jump()`, `hurt()`), `scene`, `particles.burst(position, color)`.
- `stats`: the `SessionStats` of this run. Scoring and the fever flag live there.
- `phase` (the current phase of the run plan, `src/game/RunPlan.ts`), `playing`, `shields`, `guards`, `theme`, `sfx`, `words` (the run's `WordSource`, with the keys and lengths of the current phase), `level` and `language` (the profile word language).
- `allMechanicsUnlocked`: true when the run plan opens every mechanic, as the arena does. A mechanic that unlocks by `level` must then run as unlocked, see `hasForestMechanics` in `actionEvents/regions.ts` and `availableKinds` in `enemyTypes/kinds.ts`.
- `equipped`: the ids of the pet and the hat the profile wears (`src/course/shop.ts` has their specs). The game already puts the hat on the hero.

Actions:

- `createLabel()`: a word label element, needed to build your own `Enemy`.
- `addEnemy(enemy, radius?)`: puts an enemy on the board. With `radius` it lands on the spawn arc, without it keeps its position.
- `removeEnemy(enemy)`: takes an enemy off the board without points. The phase still ends once every spawn happened and the board is empty. Do not remove the boss.
- `spawnWord(word?)`: spawns a normal enemy on the spawn arc, with the next word from `words` when none is given. That word prefers a first letter no enemy on the board is waiting for. Returns it.
- `setTimeScale(scale)`: slows or speeds enemy movement and spawn timers. The hero and effects keep real time. One shared value, so set it back to `1`.
- `shakeCamera(strength, seconds)`: `0.18` for `0.25` s is a lost life.
- `announce(text, style, accent?)`: shows text over the game. `style` is `'callout'`, `'banner'` or `'warning'`, `accent` is any CSS color.
- `loseLife()`: costs a life like an enemy reaching the hero, unless a shield absorbs it.
- `absorbNextHit()`: adds one shield. Each shield cancels one `loseLife`.
- `guardNextHit()`: adds one guard. A guard keeps the heart of the next `loseLife`, but the hit still counts as a mistake and breaks the combo, so accuracy stays the same. Guards go before shields.
- `restoreLife()`: gives back one lost heart. Returns `false` and does nothing when every heart is still there.
- `addCoins(amount)`: adds coins to this run, for example from a balloon or a chest. They reach `GameResult.coins` and the profile with the level's other coins.
- `boostRewards({ coins, xp })`: scales the coins and the XP of the whole run, for example `1.2` for 20% more. Each factor stays between 1 and the cap in `MAX_BOOST` (`src/game/RunRewards.ts`).
- `stats.keepFeverOnSlips(slips)`: the next `slips` mistakes during the fever keep it going. They still count as mistakes and still break the combo.

Enemies also offer `tags` (a `Set<string>` for your own markers), `typedLength` (letters typed so far), `setSpeedScale(scale)`, `freeze(seconds)` (stops and dims), `isFrozen`, `burstPosition` and `setLabelMode('full' | 'firstLetter' | 'hidden')`. `firstLetter` shows the typed part and the next letter and masks the rest.

## Composition points

Each feature adds its own files and touches at most one line in each shared index.

- **Translations**: add `src/i18n/features/<name>.ts` exporting `{ pl, uk }` where `uk` is typed as `typeof pl`. Then add one import and one `<name>: <name>[language],` line in `src/i18n/features/index.ts`. Read it as `i18n.t.features.<name>`. Copy is natural Polish and Ukrainian, no dashes, no all caps.
- **Sounds**: use the generic `sfx` methods instead of editing `Sfx.ts`: `chimes(midis, spacing, decay)`, `impact(strength)` with strength from 0 to 1, `sweep(fromMidi, toMidi, seconds)`, `sparkle()`.
- **Styles**: keep CSS next to the UI code that uses it and import it there, for example `src/ui/<name>.css` imported from your module. Do not edit `styles.css`. Announcement styles live in `src/ui/callouts.css`, enemy labels are `.word-label` elements you can add classes to.
