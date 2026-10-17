# Mechanics

A mechanic is one gameplay feature in one module. The game owns the rules (spawning, typing, lives, phases) and calls each mechanic at fixed points. A mechanic changes the game only through the `MechanicContext` it gets in its constructor. `Fever.ts` is the reference.

## Add a mechanic

1. Create `src/game/mechanics/<Name>.ts` with a class that implements `Mechanic` and takes `MechanicContext` (or a `Pick` of it) in the constructor.
2. Add it to `MECHANICS` in `index.ts`. That is the only shared line you touch here.
3. Add a test next to it. Use `fakeMechanicContext(overrides)` from `src/testing/mechanicContext.ts`, so no WebGL is needed. Pass `random: randomFrom(() => value)` from `src/random.ts` to choose the rolls. Pass `fakeClaims().context` from `src/testing/claims.ts` to check the time scale and the page classes.

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
- `phase` (the current phase of the run plan, `src/game/RunPlan.ts`), `playing`, `shields`, `guards`, `lives` (the hearts left), `maxLives` (the hearts of the run plan), `theme`, `sfx`, `words` (the run's `WordSource`, with the keys and lengths of the current phase), `level` and `language` (the profile word language).
- `phase.modifiers`: the run modifiers that `withModifiers` in `src/game/modifiers.ts` puts on every phase of a plan. That function also applies the plan side (one heart, long words), and `Modifiers.ts` applies the board side (fog labels, darkness for the whole run).
- `allMechanicsUnlocked`: true when the run plan opens every mechanic, as the arena does. A mechanic that unlocks by `level` must then run as unlocked, see `hasForestMechanics` in `actionEvents/regions.ts` and `availableKinds` in `enemyTypes/kinds.ts`.
- `equipped`: the ids of the pet and the hat the profile wears (`src/course/shop.ts` has their specs). The game already puts the hat on the hero.
- `random`: the `RandomSource` of the run (`src/random.ts`). Take your own stream in the constructor with `context.random.stream('<name>')` and draw every choice that changes gameplay from it: words, kinds, directions, timers. A run with a seed (`seed` in the run plan) then plays the same on every device, and one mechanic never shifts the draws of another. Purely visual effects may keep `Math.random`.

Actions:

- `createLabel()`: a word label element, needed to build your own `Enemy`.
- `addEnemy(enemy, radius?)`: puts an enemy on the board. With `radius` it lands on the spawn arc, without it keeps its position.
- `removeEnemy(enemy)`: takes an enemy off the board without points. The phase still ends once every spawn happened and the board is empty. Do not remove the boss.
- `spawnWord(word?)`: spawns a normal enemy on the spawn arc, with the next word from `words` when none is given. That word prefers a first letter no enemy on the board is waiting for. Returns it.
- `claimTimeScale(scale)`: slows or speeds enemy movement and spawn timers until you call the release function it returns. The hero and effects keep real time. Claims of all mechanics overlap: the world runs at the lowest claim that is still held, and at `1` when none is. A blast that ends inside a boss stun hands time back to the stun.
- `claimPageClass(name)`: puts a class on the page body until you call the release function it returns. The class stays while any mechanic still holds it, so a boss darkness that ends never lifts the darkness of a `darkness` run. Never write `document.body.classList` yourself.
- Release every claim when your effect ends and in `dispose`. A release works once, so calling it again is safe. `HeldClaim` in `src/game/claims/HeldClaim.ts` keeps at most one claim: `hold()` takes it when it is not held yet and `release()` gives it back.
- `shakeCamera(strength, seconds)`: `0.18` for `0.25` s is a lost life.
- `announce(text, style, accent?)`: shows text over the game. `style` is `'callout'`, `'banner'` or `'warning'`, `accent` is any CSS color.
- `loseLife()`: costs a life like an enemy reaching the hero, unless a shield absorbs it. In a run plan whose `hitCost` is `combo`, such as the placement test, it only breaks the combo.
- `absorbNextHit()`: adds one shield. Each shield cancels one `loseLife`.
- `guardNextHit()`: adds one guard. A guard keeps the heart of the next `loseLife`, but the hit still counts as a mistake and breaks the combo, so accuracy stays the same. Guards go before shields.
- `restoreLife()`: gives back one lost heart. Returns `false` and does nothing when every heart is still there.
- `addCoins(amount)`: adds coins to this run, for example from a balloon or a chest. They reach `GameResult.coins` and the profile with the level's other coins.
- `boostRewards({ coins, xp })`: scales the XP of the whole run and the coin payout of the run, for example `1.2` for 20% more. The XP grows during the run. The coin factor reaches `GameResult.coinBoost` and scales the whole payout after the run, bonuses included (`levelCoins` in `src/course/coins.ts`, `arenaPayout` in `src/arena/economy.ts`). Each factor stays between 1 and the cap in `MAX_BOOST` (`src/course/powers.ts`).
- `stats.keepFeverOnSlips(slips)`: the next `slips` mistakes during the fever keep it going. They still count as mistakes and still break the combo.

Enemies also offer `tags` (a `Set<string>` for your own markers), `spawnIndex` (the number of the spawn in the run's spawn script, from 0, the same for every run with the same seed; enemies that replace a spawn as it lands, such as special enemies and twins, share its number, and enemies a mechanic adds on its own have none), `typedLength` (letters typed so far), `currentSpeed` (its speed with the speed scale, 0 while frozen), `setSpeedScale(scale)`, `freeze(seconds)` (stops and dims), `isFrozen`, `burstPosition` and `setLabelMode('full' | 'firstLetter' | 'hidden')`. `firstLetter` shows the typed part and the next letter and masks the rest.

## Composition points

Each feature adds its own files and touches at most one line in each shared index.

- **Translations**: add `src/i18n/features/<name>.ts` exporting `{ pl, uk }` where `uk` is typed as `typeof pl`. Then add one import and one `<name>: <name>[language],` line in `src/i18n/features/index.ts`. Read it as `i18n.t.features.<name>`. Copy is natural Polish and Ukrainian, no dashes, no all caps.
- **Sounds**: use the generic `sfx` methods instead of editing `Sfx.ts`: `chimes(midis, spacing, decay)`, `impact(strength)` with strength from 0 to 1, `sweep(fromMidi, toMidi, seconds)`, `sparkle()`.
- **Styles**: keep CSS next to the UI code that uses it and import it there, for example `src/ui/<name>.css` imported from your module. Do not edit `styles.css`. Announcement styles live in `src/ui/callouts.css`, enemy labels are `.word-label` elements you can add classes to.
