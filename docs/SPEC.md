# Literkowo spec

This page describes the game as it is on `main` today.
The code is the source of truth. Each section names the file that owns its values.
The numbers here are current values, not fixed rules. They can change in the owning file.
When a pull request changes behaviour, it updates this page in the same pull request.

The game takes input from a physical keyboard through `keydown` events (`src/game/Game.ts`).
Touch screens can also type through a hidden input, see [Mobile and tablets](#mobile-and-tablets).

## Regions and levels

Owner: `src/course/catalog.ts`.

| Region id  | Name (pl / uk)                   | Theme     | Keys in order                       | Levels | Word languages |
| ---------- | -------------------------------- | --------- | ----------------------------------- | ------ | -------------- |
| `polana`   | Polana / Галявина                | meadow    | `fj` `d` `k` `s` `l` `a` `;`        | 19     | pl, en         |
| `las`      | Las / Ліс                        | forest    | `g` `h` `e` `i` `r` `u`             | 16     | pl, en         |
| `gory`     | Góry / Гори                      | mountains | `t` `y` `w` `o` `q` `p`             | 16     | pl, en         |
| `jaskinia` | Jaskinia / Печера                | cave      | `v` `m` `c` `n` `x` `z` `b` `,` `.` | 24     | pl, en         |
| `wyspa`    | Wyspa Ogonków / Острів Хвостиків | island    | `ą` `ę` `ó` `ł` `ś` `ć` `ż` `ź` `ń` | 24     | pl             |

The course adds one new key per level. The only exception is the first level, which teaches `f` and `j` together, the two index fingers on the bumps.
The levels of a region are built from its keys, so the catalog lists keys and not levels. Every level has a kind and focus keys:

- `learn`: introduces one new key. Its focus key is the new key. The warm-up shows only that key, see [Difficulty](#difficulty).
- `practice`: comes right after the learn level of the same key, with real words of all known keys and a bias to the new key.
- `review`: comes after every two new keys of a region (`KEYS_PER_REVIEW`) and mixes all known keys. Its focus keys are the keys since the previous review. A key left over at the end of a region gets its own review, so a review always comes right before the boss.
- `boss`: the last level of each region. It adds no keys, and its focus keys are all keys of the region.

More rules:

- Level ids are `<region>-<number>`, counted from 1 in each region.
- Polish word profiles get 37 learn, 37 practice, 20 review and 5 boss levels, 99 in total. English word profiles get 28 learn, 28 practice, 15 review and 4 boss levels, 75 in total.
- A region lists the word languages it supports. Wyspa Ogonków teaches Polish letters, so English word profiles do not see it.
- A level allows every key introduced up to and including that level (`src/course/course.ts`).
- The first level is always open. Every other level opens once the previous level in the course has at least one star (`src/course/course.ts`).
- Polish letters are typed with right Alt. Ctrl with Alt also counts as right Alt, so AltGr works on Windows (`src/game/Game.ts`, `src/course/fingers.ts`).

All levels:

| Region     | Key     | Learn         | Practice      | Then                                     |
| ---------- | ------- | ------------- | ------------- | ---------------------------------------- |
| `polana`   | `f` `j` | `polana-1`    | `polana-2`    | review `polana-3`                        |
| `polana`   | `d`     | `polana-4`    | `polana-5`    |                                          |
| `polana`   | `k`     | `polana-6`    | `polana-7`    | review `polana-8`                        |
| `polana`   | `s`     | `polana-9`    | `polana-10`   |                                          |
| `polana`   | `l`     | `polana-11`   | `polana-12`   | review `polana-13`                       |
| `polana`   | `a`     | `polana-14`   | `polana-15`   |                                          |
| `polana`   | `;`     | `polana-16`   | `polana-17`   | review `polana-18`, boss `polana-19`     |
| `las`      | `g`     | `las-1`       | `las-2`       |                                          |
| `las`      | `h`     | `las-3`       | `las-4`       | review `las-5`                           |
| `las`      | `e`     | `las-6`       | `las-7`       |                                          |
| `las`      | `i`     | `las-8`       | `las-9`       | review `las-10`                          |
| `las`      | `r`     | `las-11`      | `las-12`      |                                          |
| `las`      | `u`     | `las-13`      | `las-14`      | review `las-15`, boss `las-16`           |
| `gory`     | `t`     | `gory-1`      | `gory-2`      |                                          |
| `gory`     | `y`     | `gory-3`      | `gory-4`      | review `gory-5`                          |
| `gory`     | `w`     | `gory-6`      | `gory-7`      |                                          |
| `gory`     | `o`     | `gory-8`      | `gory-9`      | review `gory-10`                         |
| `gory`     | `q`     | `gory-11`     | `gory-12`     |                                          |
| `gory`     | `p`     | `gory-13`     | `gory-14`     | review `gory-15`, boss `gory-16`         |
| `jaskinia` | `v`     | `jaskinia-1`  | `jaskinia-2`  |                                          |
| `jaskinia` | `m`     | `jaskinia-3`  | `jaskinia-4`  | review `jaskinia-5`                      |
| `jaskinia` | `c`     | `jaskinia-6`  | `jaskinia-7`  |                                          |
| `jaskinia` | `n`     | `jaskinia-8`  | `jaskinia-9`  | review `jaskinia-10`                     |
| `jaskinia` | `x`     | `jaskinia-11` | `jaskinia-12` |                                          |
| `jaskinia` | `z`     | `jaskinia-13` | `jaskinia-14` | review `jaskinia-15`                     |
| `jaskinia` | `b`     | `jaskinia-16` | `jaskinia-17` |                                          |
| `jaskinia` | `,`     | `jaskinia-18` | `jaskinia-19` | review `jaskinia-20`                     |
| `jaskinia` | `.`     | `jaskinia-21` | `jaskinia-22` | review `jaskinia-23`, boss `jaskinia-24` |
| `wyspa`    | `ą`     | `wyspa-1`     | `wyspa-2`     |                                          |
| `wyspa`    | `ę`     | `wyspa-3`     | `wyspa-4`     | review `wyspa-5`                         |
| `wyspa`    | `ó`     | `wyspa-6`     | `wyspa-7`     |                                          |
| `wyspa`    | `ł`     | `wyspa-8`     | `wyspa-9`     | review `wyspa-10`                        |
| `wyspa`    | `ś`     | `wyspa-11`    | `wyspa-12`    |                                          |
| `wyspa`    | `ć`     | `wyspa-13`    | `wyspa-14`    | review `wyspa-15`                        |
| `wyspa`    | `ż`     | `wyspa-16`    | `wyspa-17`    |                                          |
| `wyspa`    | `ź`     | `wyspa-18`    | `wyspa-19`    | review `wyspa-20`                        |
| `wyspa`    | `ń`     | `wyspa-21`    | `wyspa-22`    | review `wyspa-23`, boss `wyspa-24`       |

## Level flow

Owners: `src/app/App.ts`, `src/course/progress.ts`, `src/game/LevelPlan.ts`, `src/game/Game.ts`.

1. Story card. The intro plays before the first level. A boss scene plays before each boss. An after scene plays when a boss is beaten with at least one star. The finale replaces the after scene for the last boss of the course. Each scene plays once per profile. Speakers are Sowa Klara, Felek and Mrok (`src/story/story.ts`).
2. Learn card, for every level except bosses (`src/ui/LearnCard.ts`). Enter starts the level.
   - Learn level: "Nowy klawisz" / "Нова клавіша" ("Nowe klawisze" / "Нові клавіші" for `f` `j`), the new key with its finger and mastery status, the hands diagram and the hint to put the fingers on the home row.
   - Practice level: "Trening" / "Тренування", the key and one line: "Ćwiczymy w krótkich słowach. Najpierw dokładnie, potem szybko!" / "Тренуємося на коротких словах. Спершу точно, потім швидко!".
   - Review level: "Powtórka" / "Повторення", the reviewed keys and one line: "Powtarzamy wszystkie poznane klawisze. Dasz radę!" / "Повторюємо всі вивчені клавіші. Ти впораєшся!".
3. Camera intro of 1.8 seconds. Typing is ignored until it ends.
4. Warm-up. Single letters from the level's focus keys. A letter that reaches the player is removed and costs nothing.
5. Main phase. A learn level runs a learn phase, practice and review levels run a words phase. A word that reaches the player costs a life and counts as a mistake. Counts, speeds and lengths are in [Difficulty](#difficulty).
6. Boss, for boss levels only, with no learn card and no warm-up. One boss that needs the number of words in [Difficulty](#difficulty). Each hit knocks it back and makes it 12% faster. When it reaches the player, it jumps back to distance 9 and the player loses a life (`src/game/Boss.ts`).
7. Result card. It shows stars, score, accuracy, words per minute and letters freed, the XP bar with the XP and coins earned, the keys row (see [Key mastery](#key-mastery)), and buttons for the next level when there is one, retry and map (`src/ui/LevelResult.ts`, `src/ui/ResultProgress.ts`).

Rules during a level:

- At most 6 enemies are on screen at once (`MAX_ENEMIES` in `src/game/arena.ts`). The cap holds back the level's own spawns and event pieces. Enemies that other features add, such as twins, splitter halves, chicks, power words, bombers and minions, can join a full board.
- The player has 3 lives (`INITIAL_LIVES` in `src/game/Game.ts`). Losing the last life ends the level as lost.
- The progress bar counts a spawn as done once every enemy it turned into has left the board, so a spawn that becomes twins or a special enemy still counts as one. Enemies that features add later, such as power words or bombers, do not change it (`src/game/SpawnGroups.ts`).
- Typing follows every enemy whose word starts with the letters typed so far, a key that fits none of them is a mistake, and when a word is done every enemy with that same word is done too while the others go back to untyped (`src/game/Targeting.ts`).
- Escape pauses and resumes. Pause also suspends audio. The pause card also has a resume button and the key heatmap, and touch screens get a pause button in the HUD.
- Every correct letter fires a bolt from the hero to the nearest enemy being typed, and every finished word gets a lightning strike with a soft crack and a small camera punch, 30 ms apart when several words finish on one key (`src/game/mechanics/HeroStrikes.ts`). The strikes turn from the world's accent colour toward gold as the combo grows and are fully golden in fever, while a glow under the hero charges with the combo up to 15.
- Words (`src/course/WordSource.ts`): when at least 12 words from `src/course/wordLists.ts` fit the allowed keys and the length limits of the level, about half of the words are real words, preferring words with a focus key. The rest are generated strings within the generated length limits, where about half of the letters come from the focus keys. Boss words are real words of 4 or more letters when at least 12 fit, otherwise generated strings of 5 to 7 letters. New words and warm-up letters prefer a first letter that no enemy on the board is waiting for. Generated letters and real words lean toward the player's weak keys, see [Key mastery](#key-mastery).
- The learn phase teaches the new key in two halves. In the first half every enemy is a combo of 1 or 2 letters with the new key and maybe a known key, for example `f` `j` `fj` `jf` `ff` `jj`. In the second half the words have 2 or 3 letters with the new key: a real word about half of the time when at least 3 such words fit, otherwise a generated one.
- The learn phase is calm. Special enemies, mid-wave events, speed surges, bombers, twins, power words and merging run only in the words phase and in boss fights, so learn levels have none of them.

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

## Difficulty

Owner: `src/course/difficulty.ts`. Every pace and length limit comes from the kind of the level and its position in the course.

Position is `order / (number of levels − 1)`, from 0 at `polana-1` to 1 at `wyspa-24`. Order counts every level of the catalog from 0, bosses included, so an English course ends at `jaskinia-24`, position 0.76. A value written as "a to b" grows in a straight line from a at position 0 to b at position 1.

| Value          | Learn                        | Practice                    | Review                      |
| -------------- | ---------------------------- | --------------------------- | --------------------------- |
| Warm-up        | 8 letters, speed 0.42, 1.6 s | 5 letters, speed 0.5, 1.5 s | 5 letters, speed 0.5, 1.5 s |
| Main phase     | `learn`                      | `words`                     | `words`                     |
| Words          | 8 to 12                      | 10 to 16                    | 12 to 20                    |
| Speed          | 0.8 × word speed             | word speed                  | word speed                  |
| Spawn interval | 1.15 × spawn interval        | spawn interval              | spawn interval              |
| Word length    | 1 to 3 letters               | 2 to 4 letters              | 2 to 5 letters              |

- Word speed is 0.52 to 1.2 (`WORD_SPEED`). Spawn interval is 3.8 to 1.9 seconds (`SPAWN_INTERVAL`). Word counts are rounded.
- Generated words have at most `round(3 to 5)` letters (`GENERATED_MAX_LENGTH`) and never more than the kind allows, so early levels get generated strings of at most 3 letters. Real words use the full length of the kind.
- Boss: `round(4 to 14)` words (`BOSS_HITS`), so 6, 7, 9, 12 and 14 for the five bosses, at speed 0.3 to 0.52 (`BOSS_SPEED`). Other enemies in a boss fight use 2 to 5 letters.
- An enemy walks 9.4 units from the spawn arc to the hero. In the first level a letter takes about 22 seconds to reach the hero, and in the second level a word takes about 18 seconds. Before this course, a word in the first level took about 13 seconds.
- Apart from warm-ups and the rush and meteor events, single letters show only in learn levels.

## Action events

Owners: `src/game/mechanics/SpeedSurge.ts`, `src/game/mechanics/Bombers.ts`, `src/game/mechanics/Twins.ts`.

Speed surges:

- They run in the words phase and in boss fights. The first one comes 20 seconds after the phase starts. The next ones follow every 40 seconds in Polana, 25 seconds in Wyspa Ogonków, and evenly in between for the other regions. During the boss rage the countdown runs twice as fast.
- A warning, "Przyspieszenie!" / "Прискорення!", and a rising sweep come 1.5 seconds before the surge.
- For 7 seconds every enemy except the boss moves 1.8 times faster, also enemies that appear during the surge. Short cube trails follow the enemies and the screen edges glow red. Then every speed goes back to normal.
- A surge is skipped while any enemy is frozen, and it ends early when a freeze lands.

Bombers:

- From Las on, in the words phase and in boss fights. One comes about every 40 to 50 seconds while enemies are on the board, and at most one is on the board at a time.
- A bomber is 1.7 times bigger and moves at 0.55 times the phase speed. Its word has 6 to 9 letters: a boss word when one fits, otherwise letters from the allowed keys. A lit fuse sparks on top and ticks faster and faster from 7 units away.
- Typing its word detonates it: slow motion at 0.3 for 0.6 seconds, a camera shake and a shockwave. Every enemy within 4.5 units shatters and scores its normal word points. The boss never shatters. Other bombers in range go off 0.25 seconds later. When 3 or more enemies go down, a banner shows "Bum! x3" / "Бум! x3".
- A bomber that reaches the player costs a life and knocks every other enemy 4 units back.

Twins:

- From Las on, in the words phase, about one spawn in eight becomes 2 to 4 smaller twins in a line or a V. They share one word and bob in step.
- They finish together on the same key. Each twin after the first adds the points of one more word, and a callout shows "Bliźniaki x3!" / "Близнюки x3!" with a spark arc between them.
- Twins that reach the player cost at most one life per group.
- Twins can briefly put more than 6 enemies on the board.

## Profiles

Owners: `src/profiles/Profile.ts`, `src/profiles/profileSchema.ts`, `src/profiles/ProfileStore.ts`.

- Several profiles per device, stored as a JSON array in localStorage under `literkowo.profiles`.
- Schema version is 6 (`PROFILE_SCHEMA_VERSION`). Older profiles are migrated on load: version 1 moves the best score into the total score, version 2 seeds XP with `round(totalScore / 10)`, version 3 starts with empty key statistics, version 4 gets the starter inventory, nothing equipped and every trophy it already earned, version 5 moves level results onto the course with one key per level (`src/profiles/courseMigration.ts`). A shape change bumps the version and adds a migration.
- Version 5 and older had one level per two or three keys. Each old result moves to the new level that completes the same keys: the practice level of the last key of the old level, or the boss for an old boss. When the old result has at least one star, the new levels between the previous target and this one get the same result, so a finished region stays finished and the next open level is the first one the child has not played. A result without stars only moves to its target. XP, coins, scores, stories, key statistics, items and trophies stay as they are.

| Old level    | New target    | Also marked done               |
| ------------ | ------------- | ------------------------------ |
| `polana-1`   | `polana-2`    | `polana-1`                     |
| `polana-2`   | `polana-7`    | `polana-3` to `polana-6`       |
| `polana-3`   | `polana-12`   | `polana-8` to `polana-11`      |
| `polana-4`   | `polana-17`   | `polana-13` to `polana-16`     |
| `polana-5`   | `polana-19`   | `polana-18`                    |
| `las-1`      | `las-4`       | `las-1` to `las-3`             |
| `las-2`      | `las-9`       | `las-5` to `las-8`             |
| `las-3`      | `las-14`      | `las-10` to `las-13`           |
| `las-4`      | `las-16`      | `las-15`                       |
| `gory-1`     | `gory-4`      | `gory-1` to `gory-3`           |
| `gory-2`     | `gory-9`      | `gory-5` to `gory-8`           |
| `gory-3`     | `gory-14`     | `gory-10` to `gory-13`         |
| `gory-4`     | `gory-16`     | `gory-15`                      |
| `jaskinia-1` | `jaskinia-4`  | `jaskinia-1` to `jaskinia-3`   |
| `jaskinia-2` | `jaskinia-9`  | `jaskinia-5` to `jaskinia-8`   |
| `jaskinia-3` | `jaskinia-14` | `jaskinia-10` to `jaskinia-13` |
| `jaskinia-4` | `jaskinia-22` | `jaskinia-15` to `jaskinia-21` |
| `jaskinia-5` | `jaskinia-24` | `jaskinia-23`                  |
| `wyspa-1`    | `wyspa-7`     | `wyspa-1` to `wyspa-6`         |
| `wyspa-2`    | `wyspa-14`    | `wyspa-8` to `wyspa-13`        |
| `wyspa-3`    | `wyspa-22`    | `wyspa-15` to `wyspa-21`       |
| `wyspa-4`    | `wyspa-24`    | `wyspa-23`                     |

- Entries that cannot be read are dropped, and the raw value is copied to `literkowo.profiles.backup` first.
- Fields: id, name (up to 16 characters, `src/ui/ProfileScreen.ts`), avatar, word language, total score, letters freed, XP, coins, seen stories, the best result per level, the key statistics, the inventory and the equipped items.
- Inventory: owned pets, hats, skins and earned trophies, as id lists. Unknown ids are dropped on load. Every profile owns the 6 starter skins and its current avatar.
- Equipped: at most one pet and one hat. An id the inventory does not own is dropped on load.
- Word language is set per profile. Today the choices are Polish (default) and English (`WORD_LANGUAGES` in `src/profiles/Profile.ts`).
- Avatars are character skins: 18 Kenney Blocky Characters with ids `a` to `r`. Portraits are in `public/characters`, 3D models in `public/models/characters` (`src/game/Player.ts`). The skins `a` to `f` are free. The new profile picker shows the other 12 with a lock badge: the price in coins, or the level where the rank opens them. Locked skins cannot be picked there, they come from the shop.
- Other keys: `literkowo.activeProfile`, `literkowo.uiLanguage`, `literkowo.sound`, `literkowo.music`, `literkowo.reloadedAfterPreloadError`, `literkowo.rotateHintSeen`.
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

Announcements never overlap. Callouts stack downwards with the newest on top, and at most three of each style show at once: a fourth makes the oldest fade early. Banners take the centre slot and push callouts below them. Warnings sit above the banner slot.

## Power words

Owners: `src/game/mechanics/PowerWords.ts`, `src/game/mechanics/powerWords`, names in `src/i18n/features/powerWords.ts`.

- In the words phase and in boss fights, a power word joins from the spawn arc every 18 to 28 seconds (`SUMMON_INTERVAL`). Only one is on the board at a time. The timer runs only while none is on the board, and a due power word waits until another enemy is on the board.
- It is a gold enemy, 1.15 times bigger, with a pulsing halo and star sparks. It moves at 0.8 times the phase speed (`POWER_SPEED_SCALE`). Its label has the power's colour and the power's name as a tooltip.
- The power is random and never the same twice in a row. Boss fights have no storm (`src/game/mechanics/powerWords/powers.ts`).
- The word is a real word of the power in the profile's word language when one fits the allowed keys. Otherwise it is 4 to 6 letters from the allowed keys, and the label shows the power's icon (`src/game/mechanics/powerWords/choice.ts`).
- Typing it casts the power: a banner with the word in the power's colour, with the icon in front for generated letters, and the power's sound.
- It scores normal word points and 1 coin and gives XP with tag factor 2, see [Progression](#progression). Its letters count for accuracy like any word.
- A power word that reaches the hero vanishes, with no lost life and no mistake.

| Power    | Name (pl / uk)    | Icon | Polish words                        | English words        | Effect                                                                                                                                                                                  |
| -------- | ----------------- | ---- | ----------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `freeze` | Mróz / Мороз      | ❄️   | lód, mróz, zima, szron              | ice, frost, snow     | Every enemy on the board, the boss included, freezes for 3 seconds (`FREEZE_SECONDS`).                                                                                                  |
| `storm`  | Burza / Гроза     | ⚡   | burza, grom, piorun, błysk          | storm, bolt, spark   | Lightning strikes the 3 enemies nearest to the hero, 0.12 seconds apart, never the boss (`STRIKE_COUNT`). Each one shatters and scores its normal word points, with no XP and no coins. |
| `quake`  | Wstrząs / Поштовх | 💥   | wstrząs, tąpnięcie, trzęsienie, huk | quake, rumble, shake | Every enemy on the board, the boss included, is pushed 3 units back (`KNOCKBACK`), and the camera shakes.                                                                               |
| `shield` | Tarcza / Щит      | 🛡️   | tarcza, osłona, mur, zbroja         | shield, wall, guard  | A bubble around the hero takes the next lost life: no life is lost, no mistake counts and the combo stays. Shields stack until the end of the level.                                    |

## Merging enemies

Owners: `src/game/mechanics/MergeEnemies.ts`, `src/game/mechanics/mergeEnemies`, copy in `src/i18n/features/mergeEnemies.ts`.

- Enemies merge only in the words phase, and only plain ones. Special enemies, twins, bombers, power words, event pieces and merged enemies never merge.
- An enemy can merge while it is at least 4 units from the hero, not frozen and not being typed (`src/game/mechanics/mergeEnemies/rules.ts`).
- Two enemies fit together when their words joined have at most 10 letters. Each one drifts toward the nearest enemy it fits with within 4 units, at 0.4 units per second (`src/game/mechanics/mergeEnemies/huddle.ts`).
- When two that fit are within 1.3 units, they pull together for 0.35 seconds with a pulse. The fusion stops when one of them is typed, frozen or leaves the board.
- The merged enemy stands at the midpoint. Its word is the first word followed by the second. It is 1.6 times bigger, has two cores and moves at 0.6 times the phase speed. It flashes white, bursts in the colours of both enemies, and the warning "Fuzja!" / "Злиття!" shows with an impact sound.
- Typed, it scores its word points 3 times: the normal points plus 2 more (`MERGED_BONUS_WORDS`). It gives 1 coin and XP with tag factor 3. Its letters count for accuracy like any word.
- A merged enemy that reaches the hero costs one life.

## Boss phases

Owners: `src/game/mechanics/BossPhases.ts`, `src/game/mechanics/bossPhases`, copy in `src/i18n/features/bossPhases.ts`, darkness styles in `src/ui/bossPhases.css`.

The boss fight has three phases by the boss's health: the words left out of the words needed (`src/game/mechanics/bossPhases/phases.ts`). Each phase shows its banner the first time a hit lands in it.

| Phase       | Health          | Banner (pl / uk)               | Rule                                                                                                                                                                                                                                                                                          |
| ----------- | --------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `armour`    | above 66%       | Pancerz pęka! / Броня тріскає! | The boss fights as described in [Level flow](#level-flow).                                                                                                                                                                                                                                    |
| `weakPoint` | 66% down to 33% | Słaby punkt! / Слабке місце!   | Each hit that lands here stuns the boss: for 2.5 seconds the world runs at 0.4 speed, the boss stands still and a rising sweep plays (`STUN_SECONDS`, `SLOW_MOTION`). After a hit that leaves the boss here, its next word has 3 to 4 letters (`SHORT_LENGTH` in `src/course/WordSource.ts`). |
| `rage`      | below 33%       | Furia! / Лють!                 | The boss moves 1.3 times faster (`RAGE_SPEED`). A minion with a normal word joins at the boss phase speed as rage starts and then every 5 seconds, while fewer than 2 are alive (`MINION_INTERVAL`, `MAX_MINIONS`). Speed surges come twice as often, see [Action events](#action-events).    |

Signature attacks (`src/game/mechanics/bossPhases/SignatureAttacks.ts`, `AttackSchedule.ts`):

- The first strike comes 8 seconds after the fight starts, then one every 14 seconds, in every phase (`FIRST_STRIKE`, `STRIKE_INTERVAL`).
- 1.5 seconds before each strike, the warning "Mrok szykuje atak" / "Морок готує атаку" shows with a falling sweep. The strike plays an impact sound.
- The Polana boss has no attacks. Wyspa Ogonków takes its three attacks in turn.

| Attack       | Regions                 | Effect                                                                                                                          |
| ------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `darkness`   | Las, Wyspa Ogonków      | For 8 seconds the screen edges go dark and the keyboard hint hides (`DARKNESS_SECONDS`).                                        |
| `fog`        | Góry, Wyspa Ogonków     | For 8 seconds every label, also on new enemies, shows only the next letter of its word and dots for the rest (`FOG_SECONDS`).   |
| `earthquake` | Jaskinia, Wyspa Ogonków | The camera shakes, and every enemy except the boss jumps to a random place at the same distance from the hero, with dust puffs. |

Score, XP and accuracy:

- Attacks never cost a life and never count as a mistake.
- A boss hit gives XP with tag factor 3 and a minion with factor 1, see [Progression](#progression). Minions score and pay coins like any word, and cost a life when they reach the hero.

## Enemy types

Owners: `src/game/mechanics/EnemyTypes.ts`, `src/game/mechanics/enemyTypes/kinds.ts`, `src/game/mechanics/enemyTypes/factory.ts`, one class per type in `src/game/mechanics/enemyTypes`.

- During the words phase, a fresh normal spawn turns into a special enemy with a chance of 25% (`SPECIAL_SHARE`). The chance is split by weight between the unlocked types: jumper 3, nest 1, the others 2 each (`KIND_WEIGHTS`).
- The special enemy takes the place of the spawn, so the word count of the phase stays the same. A balloon that floats away or a thief that escapes counts as done.
- Only plain spawns without a tag are replaced. The boss, power words, merged enemies, minions, twins, bombers, chicks, splitter halves and event pieces stay as they are. Special enemies never merge.
- At most 1 special enemy is on the board in Polana, and at most 3 in later regions. Bull, nest and thief also come one at a time (`KIND_LIMITS`).
- The first time a type appears in a level, its name shows as a callout. Each type also has a short hint in `src/i18n/features/enemyTypes.ts`.
- A type unlocks with the learn level of its key, see the table. Special enemies only replace spawns in the words phase, so the first one shows in the practice level of that key. When a profile's course never teaches that key, the type unlocks with its fallback key instead. English word profiles never see Wyspa Ogonków, so they meet the chameleon with `x` in `jaskinia-11` and the nest with `b` in `jaskinia-16` (`src/game/mechanics/enemyTypes/kinds.ts`).

| Type        | Name (pl / uk)          | From                        | Word                                     | Movement                                                                    | Rule                                                                                                                                                                   |
| ----------- | ----------------------- | --------------------------- | ---------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jumper`    | Skoczek / Стрибунець    | `s`, `polana-9`             | one focus key, 4 to 7 times              | hops 1 unit at a time, at the normal word speed                             | Each letter makes it hop in place and shrink.                                                                                                                          |
| `balloon`   | Balonik / Кулька        | `s`, `polana-9`             | 3 to 5 letters                           | starts at distance 6, rises 0.42 per second, drifts sideways                | Above height 7 it floats away, with no mistake and no lost life. Popped, it pays double word points.                                                                   |
| `bat`       | Nietoperz / Кажан       | `g`, `las-1`                | 3 to 4 letters                           | flies an arc at height 2.5, at 2.5 × the word speed                         | At the far side it drops a bomb. When the bomb lands, the hero loses a life and the camera shakes. Typed before that, it tumbles and shatters.                         |
| `ghost`     | Duch / Привид           | `e`, `las-6`                | 3 to 5 letters                           | walks at 0.9 × the word speed and drifts sideways                           | It fades out and back in on a 3 second cycle. Its label shows only while it is solid, but it can be typed at any time.                                                 |
| `thief`     | Złodziej / Злодій       | `r`, `las-11`               | 3 letters, then 6 letters on the way out | runs at 2.2 × the word speed, flees at half that                            | At the hero it steals 100 points, or what there is, and runs back out with a new word. Typed on the way out, it returns the points and 5 coins. It never costs a life. |
| `swarm`     | Rój / Рій               | `t`, `gory-1`               | 5 to 7 letters, one per bug              | walks at 1.25 × the word speed and jitters                                  | Letters go in order and the next one glows. Each letter pops one bug.                                                                                                  |
| `splitter`  | Rozszczep / Розщеп      | `w`, `gory-6`               | two short words joined, 6 to 8 letters   | walks at 0.8 × the word speed                                               | Typed, it splits at its place into two smaller halves, one per word, 1.35 × faster. Halves never split again.                                                          |
| `shield`    | Tarczownik / Щитоносець | `v`, `jaskinia-1`           | a 2 letter key, then 4 to 6 letters      | walks at 0.85 × the word speed                                              | The label shows the key on a shield and masks the word. Typing the key knocks the shield off with a clang and reveals the word.                                        |
| `bull`      | Byk / Бик               | `c`, `jaskinia-6`           | 4 to 5 letters                           | stamps at the spawn arc for 1.5 seconds, then charges at 3 × the word speed | Each correct letter knocks it back 1.2 units and stops it for 0.4 seconds.                                                                                             |
| `chameleon` | Kameleon / Хамелеон     | `ą`, `wyspa-1`, English `x` | 3 to 5 letters                           | walks at 0.9 × the word speed                                               | Every 2.5 seconds it swaps its word for another of the same length and changes colour. The first typed letter locks it.                                                |
| `nest`      | Gniazdo / Гніздо        | `ł`, `wyspa-8`, English `b` | 7 to 9 letters                           | sits still at distance 9.6                                                  | Every 4 seconds it hatches a chick with a 2 letter word that walks at 1.1 × the word speed, at most 3 alive. Typed, it pops all its chicks.                            |

A type stays unlocked in every later region.

## Mid-wave events

Owners: `src/game/mechanics/WaveEvents.ts`, `src/game/mechanics/waveEvents/events.ts`.

- Once per level, during the words phase, one event starts with a banner. It starts at a random moment between one third and two thirds of `count × spawnInterval` of the phase. Each event is equally likely.
- Event pieces join the board only while fewer than 6 enemies are on it, so a full board delays them. They stop when the phase changes, and no event runs next to a boss.
- Event pieces are never replaced by special enemies and never merge.

| Event     | Banner (pl / uk)                    | Pieces                                                                                                                                                                                                                                                                             |
| --------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rush`    | Fala! / Хвиля!                      | 6 words of one or two letters over 4 seconds, from the spawn arc at 1.15 × the word speed.                                                                                                                                                                                         |
| `meteors` | Deszcz meteorów! / Метеоритний дощ! | 8 single letters from the level's keys, one every 0.35 seconds. Each falls from height 11 with a trail for 1.2 seconds and lands 4.5 to 9 units from the hero. They can be typed in any order. After 6 seconds on the ground a meteor burns out, with no mistake and no lost life. |
| `chest`   | Skrzynia skarbów! / Скриня скарбів! | A chest with a 5 letter word walks across the arena at distance 5.5, 1.4 units per second, and leaves on the other side. Typed, it drops 15 coins with a "Skarb!" / "Скарб!" callout.                                                                                              |

## Progression

Owners: `src/course/xp.ts`, `src/course/coins.ts`, `src/game/RunRewards.ts`, `src/course/progress.ts`.

XP only grows. It drives the player level and the rank. A child never loses XP, also not in a lost level.

- Each completed word gives `letters × multiplier × fever bonus × tag factor` XP, rounded. The multiplier and the fever bonus are the ones from scoring, so XP follows the combo.
- Tag factor: a boss hit 3, `merged` 3, `power-word` 2, `minion` 1. Any other or unknown tag is 1. With several tags the highest factor counts.
- A floating "+12 XP" rises from the enemy on each completed word, and the HUD shows the XP of the run next to the score. The level number sits on the avatar button of the HUD.
- XP of the run is added to the profile after every attempt, won or lost.

Levels start at 1. The step from level `n` to `n + 1` costs `min(15000, round(100 × 1.12^(n - 1)))` XP.

| Level | Total XP |
| ----- | -------- |
| 2     | 100      |
| 3     | 212      |
| 4     | 337      |
| 5     | 477      |
| 6     | 634      |
| 7     | 810      |
| 8     | 1007     |
| 9     | 1228     |
| 10    | 1476     |
| 11    | 1753     |
| 20    | 6343     |
| 30    | 21456    |
| 40    | 68399    |
| 50    | 195821   |

From level 46 on, every step costs 15000 XP. A typical child earns about 5000 XP per hour (about 2000 letters at an average multiplier of 2.5), so level 50 takes about 40 hours.

Ranks by level band, names in `src/i18n/features/progression.ts`:

| Levels    | Id               | Polish            | Ukrainian             |
| --------- | ---------------- | ----------------- | --------------------- |
| 1 to 4    | `chick`          | Pisklę            | Пташеня               |
| 5 to 11   | `apprentice`     | Uczeń             | Учень                 |
| 12 to 21  | `letterHunter`   | Łowca Liter       | Мисливець за літерами |
| 22 to 34  | `wordGuardian`   | Strażnik Słów     | Вартовий слів         |
| 35 to 49  | `keyboardMaster` | Mistrz Klawiatury | Майстер клавіатури    |
| 50 and up | `legend`         | Legenda           | Легенда               |

Coins are a separate counter. They are spent in the [shop](#shop).

- During a level each completed word gives 1 coin. Mechanics add more with `addCoins(amount)`: 15 for a treasure chest, 5 for a thief caught with its loot. Run coins never go down. The run total is `GameResult.coins`.
- After the level: the run coins, plus 10 for a won level, plus 5 per star.

The result card fills the XP bar from the old progress to the new one. When a level is crossed it shows a "Nowy poziom!" / "Новий рівень!" banner with the rank name, confetti that stays inside the card, and the level complete and sparkle sounds. The coins earned sit in a pill next to the XP. The map header and the profile cards show the level, the rank, a thin XP bar and the coins.

## Key mastery

Owners: `src/course/keyStats.ts`, `src/course/mastery.ts`, `src/game/KeyTracker.ts`.

The game keeps statistics for every key of the course, Polish letters included, so finished regions still have work in them.

Recording, during a level (`src/game/KeyTracker.ts`):

- Only keys allowed in the level count. Keys are the lower case characters the game sees.
- A hit counts for the typed key. A mistake counts for the hinted next key, the one the on screen keyboard highlights: the letter the nearest followed enemy is waiting for, or else the letter the nearest enemy is waiting for. Only with no enemy on the board does it count for the typed key.
- A lost life is not a keystroke and does not count.
- Speed is the time from the previous correct key to this hit. Gaps over 2 seconds are ignored. It is the plain average for the first samples and then a moving average over about 50 hits.
- The statistics are added to the profile after every attempt, won or lost. The dev shortcut does not save them.

Stored per key, with no keystroke history: hits, misses, the outcome of the last 30 keystrokes as a bit mask, the moving speed with its sample count, and the last 10 days the key was practised as ISO dates in local time.

Mastery levels (`src/course/mastery.ts`):

| Level      | Polish       | Ukrainian    | Rule                                                                  |
| ---------- | ------------ | ------------ | --------------------------------------------------------------------- |
| `none`     | Nowy klawisz | Нова клавіша | no keystroke yet                                                      |
| `learning` | Uczysz się   | Вчишся       | any other key                                                         |
| `solid`    | Pewnie       | Впевнено     | at least 10 recent keystrokes and 90% accuracy over the last 30       |
| `mastered` | Opanowany    | Опановано    | 30 recent keystrokes, 97% accuracy, speed on target, 3 different days |

- Speed target: at most 900 ms between keys, or 1400 ms for Polish letters typed with right Alt.
- 97% of 30 keystrokes means the last 30 keystrokes of a mastered key have no mistake. One mistake drops it to `solid` until its last 30 keystrokes are clean again.
- A region's mastery share is the part of its new keys that are mastered.

Where it shows:

- Map: each region sign has a mastery meter next to the stars, with the mastered keys out of all new keys of the region. Each unlocked learn, practice and review level shows a dot per focus key in the colour of its level: grey none, orange learning, blue solid, green mastered.
- Learn card: under each keycap, the level of the key and its accuracy over the last 30 keystrokes when there is data.
- Result card: a "Klawisze" / "Клавіші" row with the two least accurate keys of the run that had a mistake, or "Bez pomyłek" / "Без помилок". A key that became mastered in the run gets a green badge, the sparkle sound and the callout "Opanowany: F" / "Опановано: F".
- Pause card: a heatmap of the keyboard, each key tinted by its accuracy over the last 30 keystrokes, from red at 70% or less to green at 100%, grey without data. A practised Polish letter shows as a small mark on its base key.

Weak keys in words (`src/course/WordSource.ts`, `keyWeight` in `src/course/mastery.ts`):

- Generated letters and real words are picked with a weight per key. A real word takes the highest weight of its letters.
- Weight is 1 for keys without data and for mastered keys. Otherwise it grows from 1 to 3 with the weakness of the key: accuracy from 97% down to 80%, or speed from the target up to twice the target, whichever is weaker.
- The weights follow the statistics live during the level.

## Shop

Owners: `src/course/shop.ts` (catalogue and prices), `src/course/inventory.ts` (buying and equipping), `src/course/trophies.ts`, `src/ui/ShopScreen.ts`, copy in `src/i18n/features/shop.ts`.

The shop opens from the bag button "Sklep" / "Крамниця" in the map header. A green dot on the button means something can be bought or claimed right now. The back button returns to the map.

Layout:

- On the left, "Twój bohater" / "Твій герой" shows the hero in 3D with the equipped hat and pet, swaying slowly (`src/ui/portraits/OutfitView.ts`). Touch screens and reduced motion get a still frame. Until the model loads, the portrait shows.
- Tabs: "Zwierzaki" / "Улюбленці", "Czapki" / "Шапки", "Postacie" / "Персонажі", "Trofea" / "Трофеї". The coins sit in the header.
- Each item card shows a rendered preview, the name and a short description. Pets and hats are rendered once per session in an offscreen studio, hats on a plain cube head (`src/ui/portraits/ItemStudio.ts`). Skins use the character portraits.

Item states and actions:

| State          | Card shows                                                                  |
| -------------- | --------------------------------------------------------------------------- |
| `equipped`     | "W użyciu" / "Обрано" and, for pets and hats, "Zdejmij" / "Зняти"           |
| `owned`        | "Weź ze sobą" for a pet, "Załóż" for a hat, "Wybierz" for a skin            |
| `buyable`      | "Kup" / "Купити" with the price                                             |
| `claimable`    | "Odbierz" / "Забрати", for rank items once the rank is reached              |
| `tooExpensive` | the price and "Brakuje 45" / "Бракує 45", no button                         |
| `rankLocked`   | a lock badge with the rank's first level and "Ranga: Uczeń" / "Ранг: Учень" |

- Buying or claiming puts the item on at once, with chimes, a sparkle and confetti on the card. A skin becomes the profile's avatar.
- Every change is saved to the profile right away.

Prices. A won Polana level pays about 30 to 45 coins, so the cap takes about 2 levels and the first pet about 4 to 6.

| Pet        | Polish   | Ukrainian | Unlock             |
| ---------- | -------- | --------- | ------------------ |
| `cube-cat` | Kostka   | Кубик     | 160 coins          |
| `bee`      | Bzyczek  | Дзижчик   | 320 coins          |
| `star`     | Gwiazdka | Зірочка   | rank Uczeń         |
| `ghost`    | Duszek   | Привидик  | 480 coins          |
| `robot`    | Robocik  | Роботик   | rank Strażnik Słów |
| `dragon`   | Smoczek  | Дракончик | 900 coins          |

| Hat          | Polish               | Ukrainian         | Unlock           |
| ------------ | -------------------- | ----------------- | ---------------- |
| `cap`        | Czapka z daszkiem    | Кепка             | 75 coins         |
| `headphones` | Słuchawki            | Навушники         | 200 coins        |
| `horns`      | Różki                | Ріжки             | 350 coins        |
| `wizard`     | Kapelusz czarodzieja | Капелюх чарівника | rank Łowca Liter |
| `halo`       | Aureola              | Німб              | 600 coins        |
| `crown`      | Korona               | Корона            | rank Legenda     |

Skins are named "Postać 7" / "Персонаж 7" by their place in the roster.

| Skins         | Unlock                     |
| ------------- | -------------------------- |
| `a` to `f`    | free, owned from the start |
| `g`, `h`, `i` | 200, 250, 300 coins        |
| `j`           | rank Uczeń                 |
| `k`, `l`      | 400, 500 coins             |
| `m`           | rank Łowca Liter           |
| `n`, `o`      | 650, 800 coins             |
| `p`           | rank Strażnik Słów         |
| `q`           | 1200 coins                 |
| `r`           | rank Mistrz Klawiatury     |

Pets and hats are built from chunky blocks in code, no model files (`src/game/cosmetics`). A hat is mounted on the head node of the character, scaled to the head's width (`mountOnHead` in `src/game/characterModel.ts`, `Player.setHat`).

Trophies are awarded after every attempt and when an older profile is migrated. They are never taken away.

| Trophy                             | Polish            | Ukrainian         | Rule                                            |
| ---------------------------------- | ----------------- | ----------------- | ----------------------------------------------- |
| `first-boss`                       | Pogromca bossa    | Переможець боса   | at least one star on any boss level             |
| `region-<id>`                      | the region's name | the region's name | at least one star on every level of that region |
| `level-10`, `level-25`, `level-50` | Poziom 10         | Рівень 10         | the player level reached                        |
| `mastered-region`                  | Mistrz klawiszy   | Майстер клавіш    | every new key of one region mastered            |

The trophy tab shows "Trofea: 3 z 10" / "Трофеї: 3 з 10", earned trophies in their colour and the others in grey with their hint.

The result card adds a chip "Nowy skarb: Polana" / "Новий скарб: Галявина" for each trophy of the attempt, and "Nowość w sklepie" / "Новинка в крамниці" when an item became affordable or claimable.

## Companion

Owners: `src/game/mechanics/Companion.ts`, `src/game/mechanics/companion`.

- With a pet equipped, it floats next to the hero's shoulder, follows with a short lag, bobs and turns with the hero.
- Once per level, when the combo is 5 or more outside the warm up, it zaps the enemy nearest to the hero that has no typed letters yet. The boss and the word the player is typing are never zapped.
- The pet pounces, a bolt in the pet's colour flies to the enemy, and the enemy freezes for 0.14 seconds. Then it shatters, scores its normal word points and the callout "Pomocnik!" / "Помічник!" shows. A zap gives no XP and no coins.
- If the enemy was typed before the bolt lands, the zap is not used up.

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

## Menus

Owners: `src/ui/ProfileScreen.ts`, `src/ui/LivePreview.ts`, `src/ui/landing/LandingBackdrop.ts`, `src/ui/landing/dockRow.ts`, `src/ui/WorldMap.ts`, `src/ui/OutfitAvatar.ts`, `src/ui/map/journeyLayout.ts`, `src/ui/map/regionArt.ts`.

Profile screen:

- Layered hills drift slowly behind the logo, and glowing letters float and twinkle over them. On devices that can hover, the hills lean a little toward the pointer.
- With reduced motion or the low quality preset the hills stand still and there are no letters (`src/ui/menuMotion.ts`).
- Each profile is a card with the rendered portrait under a spotlight, the name, the level, the rank, a thin XP bar, and pills for stars and coins.
- The selected card lifts, glows and shows the hero in 3D with the equipped hat and pet, swaying slowly. It uses the same outfit view as the shop (`src/ui/portraits/OutfitView.ts`). The play panel opens right under the row of the selected card, and cards from later rows move below it. The panel has a big Play button, then the word language chips and the delete button in a quieter row.
- The dashed new profile card opens the create panel in its place: a large live preview of the chosen character that switches with every pick, the name field, the 18 characters and a Create button.
- Long names and rank names end with an ellipsis on the cards.

Map:

- The map is one tall scene. The regions are stacked from top to bottom as bands that blend into each other: meadow, forest, mountains, cave and island. Locked bands are dimmed.
- One winding path runs through every level. The walked part, up to the first level without a star, is gold.
- Each band starts with a sign: the chapter number, the region name, a short mood line (`src/i18n/features/worldMap.ts`), the stars earned out of the total and the mastery meter. Signs switch sides from band to band, and the path passes each sign on the other side.
- Levels are round badges on the path with their focus keys. Learn levels carry a ✨ badge and review levels a 🔁 badge, and the title names the kind and the keys, for example "Trening D" / "Тренування D" (`src/ui/levelKind.ts`). Unlocked learn, practice and review levels show the key dots under the keys, see [Key mastery](#key-mastery). Bosses have a crown. Locked levels show a lock. Levels with stars glow in the region colour and show their stars. The current level pulses, has a Play tag, and the hero stands on it.
- The hero on the current level wears the equipped hat and has the equipped pet next to it, posed like the still frame of the outfit view. It is a rendered image, not a live 3D view, so the map stays light on phones (`src/ui/OutfitAvatar.ts`, `src/ui/portraits/OutfitStudio.ts`). Until the image is ready, and when it cannot be rendered, the plain portrait shows. Each outfit is rendered once per session and kept in memory, so reopening the map shows it at once. With nothing equipped the hero is the plain portrait.
- The header stays at the top: the avatar with the level number, the name, the rank and a thin XP bar, then stars, coins, the shop button and the sound toggle. A tap on the avatar goes back to the profiles. The shop button has the bag and the label "Sklep" / "Крамниця", only the bag on phones, and the green dot when something can be bought or claimed.
- On open the map scrolls smoothly to the current level, or to the last open level when all levels have stars. Levels pop in as they scroll into view. With reduced motion the scroll is instant and nothing pops in.
- The silhouettes of each band move at different speeds while scrolling, except in the low quality preset.

## Audio

Owners: `src/audio/Sfx.ts`, `src/audio/Music.ts`, `src/audio/music/themes.ts`.

- All sound is generated live with Web Audio. There are no audio files.
- Audio unlocks when the player presses Play on the profile screen, because browsers need a user gesture (`src/app/App.ts`).
- Music has one arrangement per theme, built from bass, drum, pad, motif, noise bed and sporadic layers. It plays during levels and stops on the map.
- Learn, practice and review levels use the calm mood. Boss levels use the boss mood: tempo × 1.15, the boss mode, and extra kick, tom and ostinato layers.
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

Owners: `src/styles.css`, `src/ui/TouchTyping.ts`, `src/ui/keyboardFit.ts`, `src/ui/KeyboardHint.ts`, `src/ui/keyboardLayout.ts`, `src/ui/stageInsets.ts`, `src/ui/formFactor.ts`, `src/ui/RotateHint.ts`, `src/game/arena.ts`, `vite.config.ts`.

The course still assumes a physical keyboard. A tablet with a Bluetooth keyboard is the main target. A phone plays the game with a built-in keyboard on the screen.

Layout:

- Phones are screens up to 600 px wide or up to 480 px tall. Tablets are up to 1024 px wide. `src/ui/formFactor.ts` mirrors the phone query for code.
- On tablets the HUD shows score, combo, hearts and progress.
- On phones the HUD is one translucent strip 44 px tall at the top: avatar with the player level, score, combo, hearts, and small buttons for the native keyboard, pause and sound. The progress bar is a 3 px line along the bottom edge of the strip. The phase name is hidden, the count shows when the screen is at least 400 px wide, and the XP of the run shows next to the score when it is wider than 600 px. Buttons in the strip are 36 px wide and as tall as the strip.
- The keyboard hint is smaller on tablets in portrait.
- On a phone the learn card and the result card fit without scrolling, at 390 by 660 px in portrait and 750 by 342 px in landscape, also with landscape safe area insets of 47 px at the sides and 21 px at the bottom.
- In portrait both cards use smaller keycaps, a smaller hands diagram and full width buttons. When the rank, the XP and the coins do not fit in one row of the result, the XP and the coins move to a second row.
- In landscape the learn card puts the hands diagram next to the keycaps. The result card puts the stars next to the title, the four results in one row, the XP bar in one row with the level and the rewards, and the buttons side by side. It hides the stars hint and shows the level up banner on one line. Overlays keep an 8 px margin above and below.
- On screens up to 480 px tall the profile screen shows a smaller logo and no tagline, so the Play button stays in view.
- Touch targets are at least 44 px on touch screens, except the 36 px wide HUD buttons on phones. Hover effects apply only on devices that can hover.
- The app is `100dvh` tall. The HUD, the keyboard hint, the map header and overlays stay inside the safe area insets.
- The camera keeps a horizontal field of view of at least 62 degrees, so the whole spawn arc stays in frame on narrow and portrait screens. The vertical field of view grows when needed and never drops below 42 degrees (`src/game/arena.ts`).
- On phones the camera frames the arena in the band of the stage that the HUD and the native keyboard do not cover, with a 16 px gutter at the sides so whole enemies stay in frame. The view is offset so the arena centre sits in the middle of that band, and the band keeps at least 40% of the stage (`frameArena`). Word labels stay below the HUD by the label height and above the covered bottom.

Touch input:

- With a coarse pointer, a level adds a hidden input to the stage. It has `enterkeyhint="done"` and sits outside any form.
- Characters from its `input` events go to `Game.typeCharacter`, the same path that `keydown` uses. During a composition only the new characters count. Backspace does nothing.
- Phones with a coarse pointer type on the built-in keyboard by default: a compact QWERTY with three rows (`qwertyuiop`, `asdfghjkl;`, `zxcvbnm,.` and a right Alt), lower case labels, fixed at the bottom above the safe area. Keys are 32 to 46 px tall, 40 px at most in landscape, and the keyboard takes at most 40% of the screen height, or 34% in landscape, unless that would make the keys shorter than 32 px. The stage sits above it. The next expected key glows as on the keyboard hint.
- When a boss casts darkness, the built-in keyboard stays on the screen and can still be tapped, but its keys lose the finger colours and the next key glow until the darkness ends, while the keyboard hint on bigger screens fades out.
- The keyboard button in the phone HUD opens the native keyboard and closes it on the second tap. While the native keyboard is open the built-in one hides, the level screen reaches down to the bottom of the page so the scene shows behind the keyboard accessory bar, and the arena is framed above the keyboard.
- On tablets the keyboard hint is tappable, and a tap on the stage or on the "Stuknij, aby pisać" pill focuses the hidden input and opens the native keyboard. Phones have no pill and stage taps do nothing.
- Right Alt is sticky on both keyboards: tap it, then a letter, to type the Polish letter.
- While the native keyboard is open, the level screen follows the visual viewport, so the scene and the keyboard hint stay above it. The keyboard counts as open when the visual viewport is at least 150 px shorter than the page and the page is not zoomed (`src/ui/keyboardFit.ts`).
- The pill hides while the native keyboard is open. It hides for the rest of the session once a key arrives while the native keyboard is closed, which means a physical keyboard.
- Resuming from the pause card focuses the hidden input again on tablets.
- The first time the first level of the course starts on a phone held in portrait, a small pill below the HUD says "Obróć telefon, będzie wygodniej" / "Поверни телефон, буде зручніше". It is stored as seen under `literkowo.rotateHintSeen` as soon as it shows, so it never comes back. It fades out after 8 seconds, on a tap, or when the phone turns. A tablet or a phone held sideways does not show it and does not use it up.

Performance:

- In auto quality, touch screens get the low preset: pixel ratio at most 1, dynamic resolution down to 0.75, no MSAA, no bloom and a 512 px shadow map (`src/game/quality.ts`).
- On touch screens and with reduced motion, the 3D hero on the profile screen is a still frame (`src/ui/LivePreview.ts`). Until the model loads, the portrait shows.
- In the low preset the profile screen backdrop and the map layers stand still (`src/ui/menuMotion.ts`).

Install and offline:

- `vite-plugin-pwa` writes the web manifest: name Literkowo, standalone display, theme colour `#070b1a`, background `#050816`, start URL and scope from the base path.
- The service worker precaches the build and caches files under `models/` at runtime, cache first. It registers only in production builds (`src/app/serviceWorker.ts`).
- Icons come from `public/icon.svg` and `public/icon-maskable.svg` through `npm run icons`.

## Dev shortcut

Owners: `src/app/devShortcut.ts`, `src/app/App.ts`.

- In development only, `?level=<id>` starts a level directly, for example `http://localhost:5173/?level=jaskinia-24` for the cave boss. Every level id is in the table under [Regions and levels](#regions-and-levels).
- It uses a temporary profile named Test with Polish words. It takes the character, the inventory and the equipped pet and hat of the active profile, or the first character without items when there is none. Story and learn cards are skipped. Results are not saved.
- An unknown id opens the profile screen. Production builds ignore the parameter.

## Planned

Not built yet. In this order:

1. Endless arena, a daily challenge and a ghost race against a sibling, for players who can already type.
2. Daily training: short sessions built from weak keys, with spaced repetition and streaks.
3. Typing test with certificates.
4. New chapters after the letters: capitals, numbers, punctuation, sentences and speed.
5. Runner segments.
6. Own avatars from Ready Player Me, deferred.
