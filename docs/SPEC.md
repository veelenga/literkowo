# Literkowo spec

This page describes the game as it is on `main` today.
The code is the source of truth. Each section names the file that owns its values.
The numbers here are current values, not fixed rules. They can change in the owning file.
When a pull request changes behaviour, it updates this page in the same pull request.

The game takes input from a physical keyboard through `keydown` events (`src/game/Game.ts`).
Touch screens can also type through a hidden input, see [Mobile and tablets](#mobile-and-tablets).

## Regions and levels

Owner: `src/course/catalog.ts`.

| Region id  | Name (pl / uk)                   | Theme     | Keys per level          | Word languages |
| ---------- | -------------------------------- | --------- | ----------------------- | -------------- |
| `polana`   | Polana / Галявина                | meadow    | `fj`, `dk`, `sl`, `a;`  | pl, en         |
| `las`      | Las / Ліс                        | forest    | `gh`, `ei`, `ru`        | pl, en         |
| `gory`     | Góry / Гори                      | mountains | `ty`, `wo`, `qp`        | pl, en         |
| `jaskinia` | Jaskinia / Печера                | cave      | `vm`, `cn`, `xz`, `b,.` | pl, en         |
| `wyspa`    | Wyspa Ogonków / Острів Хвостиків | island    | `ąęó`, `łść`, `żźń`     | pl             |

- Today there are five regions. Each one ends with a boss level that adds no new keys.
- Level ids are `<region>-<number>`, counted from 1. The bosses are `polana-5`, `las-4`, `gory-4`, `jaskinia-5` and `wyspa-4`.
- A region lists the word languages it supports. Wyspa Ogonków teaches Polish letters, so English word profiles do not see it.
- With the current regions, Polish word profiles get 17 key levels and 5 bosses, 22 levels in total. English word profiles get 14 key levels and 4 bosses, 18 in total.
- A level allows every key introduced up to and including that level (`src/course/course.ts`).
- The first level is always open. Every other level opens once the previous level in the course has at least one star (`src/course/course.ts`).
- Polish letters are typed with right Alt. Ctrl with Alt also counts as right Alt, so AltGr works on Windows (`src/game/Game.ts`, `src/course/fingers.ts`).

## Level flow

Owners: `src/app/App.ts`, `src/course/progress.ts`, `src/game/LevelPlan.ts`, `src/game/Game.ts`.

1. Story card. The intro plays before the first level. A boss scene plays before each boss. An after scene plays when a boss is beaten with at least one star. The finale replaces the after scene for the last boss of the course. Each scene plays once per profile. Speakers are Sowa Klara, Felek and Mrok (`src/story/story.ts`).
2. Learn card, for key levels only. It shows the new keys, the finger for each key and a hands diagram. Enter starts the level (`src/ui/LearnCard.ts`).
3. Camera intro of 1.8 seconds. Typing is ignored until it ends.
4. Warm-up. 8 single letters from the level's new keys, speed 0.55, one every 1.5 seconds. A letter that reaches the player is removed and costs nothing.
5. Words. `10 + 2 × region index` words. Speed `0.7 + 0.025 × level order`. The spawn interval starts at 3.4 seconds and drops by 0.06 per level order, never below 1.8. A word that reaches the player costs a life and counts as a mistake.
6. Boss, for boss levels only, with no learn card and no warm-up. One boss that needs `6 + 2 × region index` words, so 6, 8, 10, 12 and 14. Base speed `0.32 + 0.05 × region index`. Each hit knocks it back and makes it 12% faster. When it reaches the player, it jumps back to distance 9 and the player loses a life (`src/game/Boss.ts`).
7. Result card. It shows stars, score, accuracy, words per minute and letters freed, with buttons for the next level when there is one, retry and map (`src/ui/LevelResult.ts`).

Region index counts from 0 for `polana`. Level order counts every level of the catalog from 0 for `polana-1`, bosses included.

Rules during a level:

- At most 6 enemies are on screen at once. The player has 3 lives. Losing the last life ends the level as lost.
- Typing follows every enemy whose word starts with the letters typed so far, a key that fits none of them is a mistake, and when a word is done every enemy with that same word is done too while the others go back to untyped (`src/game/Targeting.ts`).
- Escape pauses and resumes. Pause also suspends audio. The pause card also has a resume button, and touch screens get a pause button in the HUD.
- Words (`src/course/WordSource.ts`): when at least 12 words from `src/course/wordLists.ts` fit the allowed keys, about half of the words are real words. The rest are generated strings of 2 to 5 letters, where about half of the letters come from the new keys. Boss words are real words of 4 or more letters when at least 12 fit, otherwise generated strings of 5 to 7 letters. New words and warm-up letters prefer a first letter that no enemy on the board is waiting for.

Stars, with the current thresholds (`src/course/scoring.ts`):

| Accuracy         | Stars |
| ---------------- | ----- |
| level lost       | 0     |
| won, below 85%   | 0     |
| won, 85% or more | 1     |
| won, 93% or more | 2     |
| won, 97% or more | 3     |

- Accuracy is `hits / (hits + mistakes)`. Words per minute is correct letters divided by 5, per active minute (`src/game/SessionStats.ts`).
- The best result per level is kept, compared by stars first and score second. Total score and letters freed add up on every attempt (`src/course/progress.ts`).

## Profiles

Owners: `src/profiles/Profile.ts`, `src/profiles/profileSchema.ts`, `src/profiles/ProfileStore.ts`.

- Several profiles per device, stored as a JSON array in localStorage under `literkowo.profiles`.
- Schema version is 2 (`PROFILE_SCHEMA_VERSION`). Version 1 profiles are migrated on load. A shape change bumps the version and adds a migration.
- Entries that cannot be read are dropped, and the raw value is copied to `literkowo.profiles.backup` first.
- Fields: id, name (up to 16 characters, `src/ui/ProfileScreen.ts`), avatar, word language, total score, letters freed, seen stories and the best result per level.
- Word language is set per profile. Today the choices are Polish (default) and English (`WORD_LANGUAGES` in `src/profiles/Profile.ts`).
- Avatars are character skins: 18 Kenney Blocky Characters with ids `a` to `r`. Portraits are in `public/characters`, 3D models in `public/models/characters` (`src/game/Player.ts`).
- Other keys: `literkowo.activeProfile`, `literkowo.uiLanguage`, `literkowo.sound`, `literkowo.music`, `literkowo.reloadedAfterPreloadError`.
- When localStorage is blocked, storage falls back to memory for the session (`src/storage.ts`).

## Scoring

Owners: `src/game/SessionStats.ts`, `src/game/combo.ts`.

- Points are added when a word is complete: `letters × 10 × multiplier × fever bonus`.
- Combo grows by 1 for each correct letter. A mistake or a lost life sets it back to 0.
- Multiplier is `1 + floor(combo / 5)`, at most 5.
- Fever starts at combo 15 and doubles points. It ends on a mistake or a lost life. A gold ring spins around the player while it lasts (`src/game/Game.ts`).
- Callouts appear when the combo reaches exactly these values:

| Combo | Kind     | Polish   | Ukrainian |
| ----- | -------- | -------- | --------- |
| 5     | `super`  | Super!   | Супер!    |
| 10    | `mega`   | Mega!    | Мега!     |
| 15    | `ultra`  | Ultra!   | Ультра!   |
| 20    | `legend` | Legenda! | Легенда!  |
| 30    | `master` | Mistrz!  | Майстер!  |

A callout stays for 0.9 seconds and the fever banner for 1.4 seconds (`src/ui/Callouts.ts`).

## Enemy types

Owners: `src/game/mechanics/EnemyTypes.ts`, `src/game/mechanics/enemyTypes/kinds.ts`, `src/game/mechanics/enemyTypes/factory.ts`.

- During the words phase, a fresh normal spawn turns into a special enemy with a chance of 25% (`SPECIAL_SHARE`). The chance is split by weight between the unlocked types: jumper 3, the others 2 each (`KIND_WEIGHTS`).
- The special enemy takes the place of the spawn, so the word count of the phase stays the same. A balloon that floats away counts as done.
- The boss, power words, merged enemies and minions are never replaced. Special enemies never merge.
- At most 1 special enemy is on the board in Polana, and at most 3 in later regions.
- The first time a type appears in a level, its name shows as a callout. Each type also has a short hint in `src/i18n/features/enemyTypes.ts`.

| Type      | Name (pl / uk)       | From       | Word                        | Movement                                                     | Rule                                                                                                                                           |
| --------- | -------------------- | ---------- | --------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `jumper`  | Skoczek / Стрибунець | `polana-3` | one new key, 4 to 7 times   | hops 1 unit at a time, at the normal word speed              | Each letter makes it hop in place and shrink.                                                                                                  |
| `balloon` | Balonik / Кулька     | `polana-3` | 3 to 5 letters              | starts at distance 6, rises 0.42 per second, drifts sideways | Above height 7 it floats away, with no mistake and no lost life. Popped, it pays double word points.                                           |
| `bat`     | Nietoperz / Кажан    | `las-1`    | 3 to 4 letters              | flies an arc at height 2.5, at 2.5 × the word speed          | At the far side it drops a bomb. When the bomb lands, the hero loses a life and the camera shakes. Typed before that, it tumbles and shatters. |
| `swarm`   | Rój / Рій            | `gory-1`   | 5 to 7 letters, one per bug | walks at 1.25 × the word speed and jitters                   | Letters go in order and the next one glows. Each letter pops one bug.                                                                          |

A type stays unlocked in every later region.

## Worlds

Owners: `src/game/themes.ts` for visuals, `src/game/environment/biomes/<theme>.ts` for the landscape, `src/audio/music/themes.ts` for music.

| Theme       | Region        | Enemy shape | Ambient particles | Tempo | Calm mode | Boss mode |
| ----------- | ------------- | ----------- | ----------------- | ----- | --------- | --------- |
| `meadow`    | Polana        | crystal     | drift             | 92    | ionian    | aeolian   |
| `forest`    | Las           | wisp        | blink             | 76    | dorian    | phrygian  |
| `mountains` | Góry          | shard       | fall              | 84    | lydian    | aeolian   |
| `cave`      | Jaskinia      | orb         | rise              | 70    | aeolian   | phrygian  |
| `island`    | Wyspa Ogonków | shell       | none              | 100   | ionian    | dorian    |

Each theme also sets enemy colours, sky, fog, light and a fixed random seed for the landscape. Island music has a swing of 0.2, the others have none.

## Audio

Owners: `src/audio/Sfx.ts`, `src/audio/Music.ts`, `src/audio/music/themes.ts`.

- All sound is generated live with Web Audio. There are no audio files.
- Audio unlocks when the player presses Play on the profile screen, because browsers need a user gesture (`src/app/App.ts`).
- Music has one arrangement per theme, built from bass, drum, pad, motif, noise bed and sporadic layers. It plays during levels and stops on the map.
- Key levels use the calm mood. Boss levels use the boss mood: tempo × 1.15, the boss mode, and extra kick, tom and ostinato layers.
- Up to 8 music voices play at once. Tracks crossfade over 1.5 seconds.
- Intensity runs from 0 to 1. It follows `combo / 20` and is 1 during fever (`src/app/App.ts`). Higher intensity brightens the mix and brings in a sparkle layer.
- Sound effects: hit (pitch climbs a pentatonic scale with the combo), mistake, word, callout, fever, life lost, boss hit, level complete and level failed.
- One sound toggle, in the HUD and on the map, switches music and effects together (`src/ui/SoundToggle.ts`).

## Interface languages

Owners: `src/i18n/translations.ts`, `src/i18n/i18n.ts`.

- Today the interface is in Polish (default) and Ukrainian. The language switch is on the profile screen. The choice is saved under `literkowo.uiLanguage`.
- Interface language and word language are separate settings.
- Region names and story lines carry every interface language next to the data (`src/course/catalog.ts`, `src/story/story.ts`).
- A new interface language needs a new entry in `src/i18n/translations.ts` and text in the region and story data.

## Mobile and tablets

Owners: `src/styles.css`, `src/ui/TouchTyping.ts`, `src/ui/keyboardFit.ts`, `src/ui/KeyboardHint.ts`, `src/game/arena.ts`, `vite.config.ts`.

The course still assumes a physical keyboard. A tablet with a Bluetooth keyboard is the main target. A phone plays the game without the keyboard hint.

Layout:

- Phones are screens up to 600 px wide or up to 480 px tall. Tablets are up to 1024 px wide.
- On tablets and phones the HUD shows score, combo, hearts and progress. On a phone in portrait it takes two rows.
- The keyboard hint is hidden on phones and smaller on tablets in portrait.
- On a phone in portrait the map trail runs from top to bottom.
- Touch targets are at least 44 px on touch screens. Hover effects apply only on devices that can hover.
- The app is `100dvh` tall. The HUD, the keyboard hint, the map header and overlays stay inside the safe area insets.
- The camera keeps a horizontal field of view of at least 62 degrees, so the whole spawn arc stays in frame on narrow and portrait screens. The vertical field of view grows when needed and never drops below 42 degrees (`src/game/arena.ts`).

Touch input:

- With a coarse pointer, a level adds a hidden input to the stage. A tap on the stage or on the "Stuknij, aby pisać" pill focuses it and opens the native keyboard.
- Characters from its `input` events go to `Game.typeCharacter`, the same path that `keydown` uses. During a composition only the new characters count. Backspace does nothing.
- The keyboard hint is tappable. Right Alt is sticky: tap it, then a letter, to type the Polish letter.
- While the native keyboard is open, the level screen follows the visual viewport, so the scene and the keyboard hint stay above it. The keyboard counts as open when the visual viewport is at least 150 px shorter than the page and the page is not zoomed (`src/ui/keyboardFit.ts`).
- The pill hides while the native keyboard is open. It hides for the rest of the session once a key arrives while the native keyboard is closed, which means a physical keyboard.
- Resuming from the pause card focuses the hidden input again.

Performance:

- In auto quality, touch screens get the low preset: pixel ratio at most 1, dynamic resolution down to 0.75, no MSAA, no bloom and a 512 px shadow map (`src/game/quality.ts`).
- The live 3D portrait preview is off on touch screens. They show the static portrait (`src/ui/LivePreview.ts`).

Install and offline:

- `vite-plugin-pwa` writes the web manifest: name Literkowo, standalone display, theme colour `#070b1a`, background `#050816`, start URL and scope from the base path.
- The service worker precaches the build and caches files under `models/` at runtime, cache first. It registers only in production builds (`src/app/serviceWorker.ts`).
- Icons come from `public/icon.svg` and `public/icon-maskable.svg` through `npm run icons`.

## Dev shortcut

Owners: `src/app/devShortcut.ts`, `src/app/App.ts`.

- In development only, `?level=<id>` starts a level directly, for example `http://localhost:5173/?level=jaskinia-5`.
- It uses a temporary profile named Test with the first character and Polish words. Story and learn cards are skipped. Results are not saved.
- An unknown id opens the profile screen. Production builds ignore the parameter.

## Planned

Not built yet. In this order:

1. Power words
2. Merging enemies
3. Boss phases and attacks
4. Mid-wave events
5. Coins shop and pets
6. Runner segments
7. Sibling race and arena
