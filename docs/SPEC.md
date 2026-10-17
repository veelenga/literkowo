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
- `review`: comes after every two new keys of a region (`KEYS_PER_REVIEW`) and mixes all known keys. Its focus keys are the keys since the previous review. A key left over at the end of a region gets its own review, so a review always comes right before the boss. Every review ends with a mini boss, see [Boss phases](#boss-phases).
- `boss`: the last level of each region. It adds no keys, and its focus keys are all keys of the region.

More rules:

- Level ids are `<region>-<number>`, counted from 1 in each region.
- Polish word profiles get 37 learn, 37 practice, 20 review and 5 boss levels, 99 in total. English word profiles get 28 learn, 28 practice, 15 review and 4 boss levels, 75 in total.
- A region lists the word languages it supports. Wyspa Ogonków teaches Polish letters, so English word profiles do not see it.
- A level allows every key introduced up to and including that level (`src/course/course.ts`).
- Which levels are open (`src/course/course.ts`). A level is won when it has at least one star.
  - Before any win only the first level is open.
  - After that, every level up to 3 levels past the furthest won level is open (`OPEN_AHEAD`), so a child can try ahead.
  - A placement opens every level of the placed regions and the first level of the next region, see [Placement test](#placement-test).
  - Reviews and bosses are gates, and the open window never goes past a gate without a star. A review opens only when every practice level before it in its region is won, and a boss only when the review before it is won. A gate that cannot open yet stays locked, and so do the levels after it.
  - For example, with `polana-1` won, `polana-2` is open and the review `polana-3` is locked. With `polana-1` to `polana-3` won, `polana-4`, `polana-5` and `polana-6` are open.
  - The current level is the first open level without a star after the furthest win or the placement (from the first level of the placed region when it is the last region), or the first open level without a star when none is left ahead. The map marks it with the hero and the Play tag. The other open levels look the same but have no marker.
  - The result card offers the next level only when it is open.
- Polish letters are typed with right Alt. Ctrl with Alt also counts as right Alt, so AltGr works on Windows (`src/game/Game.ts`, `src/course/fingers.ts`).

All levels:

Every review in the table ends with a mini boss.

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

Owners: `src/app/App.ts`, `src/course/progress.ts`, `src/game/RunPlan.ts`, `src/game/LevelPlan.ts`, `src/game/Game.ts`, `src/game/HeroHealth.ts` (lives, shields, guards and the hit cost), `src/game/PhaseRunner.ts` (phases, spawn timing, time limits and progress).

The game runs a run plan: its phases by index, its lives, what a hit on the hero costs (`hitCost`: a life, or only the combo), its XP factor, and the keys and word lengths of each phase (`src/course/wordRules.ts`). A phase can have a time limit in seconds (`seconds`): it then ends when the time is up instead of when its words are cleared. A whole plan can have a time limit too (`seconds` on the plan): the run then ends as won when that much play time has passed, the HUD progress shows the time left of the run instead of the phase, and `GameResult.seconds` holds the play time without the intro. A plan can stop early from the records of the finished phases (`continuesAfter`). A plan can carry run modifiers, see [Run modifiers](#run-modifiers). `src/game/LevelPlan.ts` builds the plan of a course level.

1. Story card. The intro plays before the first level. A boss scene plays before each boss. An after scene plays when a boss is beaten with at least one star. The finale replaces the after scene for the last boss of the course. Each scene plays once per profile. Speakers are Sowa Klara, Felek and Mrok (`src/story/story.ts`).
2. Learn card, for every level except bosses (`src/ui/LearnCard.ts`). Enter starts the level. The ✕ button in the top right corner, a 44 px touch target with the label "Wróć do mapy" / "Повернутися до мапи", and Escape close the card and go back to the map without starting the level. Like Enter, Escape waits 600 ms after the card opens. A story card before the level still plays first and stays seen when the learn card is closed.
   - Learn level: "Nowy klawisz" / "Нова клавіша" ("Nowe klawisze" / "Нові клавіші" for `f` `j`), the new key with its finger and mastery status, the hands diagram and the hint to put the fingers on the home row.
   - Practice level: "Trening" / "Тренування", the key and one line: "Ćwiczymy w krótkich słowach. Najpierw dokładnie, potem szybko!" / "Тренуємося на коротких словах. Спершу точно, потім швидко!".
   - Review level: "Powtórka" / "Повторення", the reviewed keys and one line: "Powtarzamy wszystkie poznane klawisze. Na końcu czeka Mały Strażnik!" / "Повторюємо всі вивчені клавіші. Наприкінці чекає Малий Вартовий!".
3. Camera intro of 1.8 seconds. Typing is ignored until it ends.
4. Warm-up. Single letters from the level's focus keys. A letter that reaches the player is removed and costs nothing.
5. Main phase. A learn level runs a learn phase, practice and review levels run a words phase. A word that reaches the player costs a life and counts as a mistake. Counts, the pace and the word stages are in [Difficulty](#difficulty).
6. Boss. A boss level has only the region boss, with no learn card and no warm-up. A review level ends with a mini boss once its words are cleared. A boss needs the number of words in [Difficulty](#difficulty). Each hit knocks it back and makes it 12% faster. When it reaches the player, it jumps back to distance 9 and the player loses a life (`src/game/Boss.ts`). The HUD shows its health in the progress bar.
7. Result card. It shows stars, score, accuracy, words per minute and letters freed, the XP bar with the XP and coins earned, the keys row (see [Key mastery](#key-mastery)), the treasure chips (see [Shop](#shop)), and buttons for the next level when there is one, retry and map (`src/ui/LevelResult.ts`, `src/ui/ResultProgress.ts`). Enter presses the main button, marked with ⏎: the next level when there is one, retry after a run without stars and the map otherwise, and, like Enter on the learn card, it is ignored for the first 600 ms so keys pressed at the end of the level do not skip either card.

Rules during a level:

- At most 6 enemies are on screen at once (`MAX_ENEMIES` in `src/game/board.ts`). The cap holds back the level's own spawns and event pieces. Enemies that other features add, such as twins, splitter halves, chicks, power words, bombers and minions, can join a full board.
- The player has 3 lives (`LEVEL_LIVES` in `src/game/LevelPlan.ts`). Losing the last life ends the level as lost.
- The progress bar counts a spawn as done once every enemy it turned into has left the board, so a spawn that becomes twins or a special enemy still counts as one. Enemies that features add later, such as power words or bombers, do not change it (`src/game/SpawnGroups.ts`).
- Typing follows every enemy whose word starts with the letters typed so far, a key that fits none of them is a mistake, and when a word is done every enemy with that same word is done too while the others go back to untyped (`src/game/Targeting.ts`).
- Escape pauses and resumes, and Enter resumes too. Pause also suspends audio. The pause card also has a resume button, a quiet "Ustawienia" / "Налаштування" button with a gear and the key heatmap, and touch screens get a pause button in the HUD. In an endless arena run the card also has a quiet "Zakończ" / "Завершити" button, see [Arena](#arena). The settings button opens the [Settings](#settings) screen over the paused level, and while it is open Escape goes back to the pause card. Graphics quality is picked there, not on the pause card.
- Every correct letter fires a bolt from the hero to the nearest enemy being typed, and every finished word gets a lightning strike with a soft crack and a small camera punch, 30 ms apart when several words finish on one key (`src/game/mechanics/HeroStrikes.ts`). The strikes turn from the world's accent colour toward gold as the combo grows and are fully golden in fever, while a glow under the hero charges with the combo up to 15.
- Words (`src/course/WordSource.ts`): the main phase of a level runs its word stages in order, see [Difficulty](#difficulty). Each stage takes a share of the phase's words and has its own kind and length limits (`src/course/wordStages.ts`). In the first half of a stage the longest word is one letter shorter, as long as the stage keeps at least two lengths, so `2 to 4` starts as `2 to 3`.
  - `combos`: a generated string with at least one focus key, the other letters from the focus keys about half of the time and from all known keys otherwise, for example `f` `fj` `jf` `fjj`.
  - `focusWords`: a real word with a focus key about half of the time when at least 3 such words fit, otherwise a combo.
  - `words`: when at least 12 words from `src/course/wordLists.ts` fit the allowed keys and the length limits, about half of the words are real words, preferring words with a focus key. The rest are generated strings within the generated length limits, where about half of the letters come from the focus keys.
- Easy to type first (`src/course/typability.ts`): every move between two letters gets a score from the finger map in `src/course/fingers.ts`. The hands taking turns score 1, a doubled letter 0.8, two fingers of one hand 0.5 and one finger pressing two different keys 0. A word scores the average of its moves, and when focus keys are given, only the moves into and out of a focus key count. A generated string or combo is the easiest of 4 random draws of the same length, so `fj` and `jf` show often and `fr` or `ju` almost never. A real word is picked with a weight of its weak key weight times `0.25 + score` around the focus keys, so words that are easy around the new key come more often while the new key keeps its bias.
- Boss words are real words of 4 or more letters when at least 12 fit, otherwise generated strings of 5 to 7 letters. New words and warm-up letters prefer a first letter that no enemy on the board is waiting for. Generated letters and real words lean toward the player's weak keys, see [Key mastery](#key-mastery). Words that features add, such as minions, use the full length limits of the level.
- The learn phase is calm. Special enemies, mid-wave events, speed surges, bombers, twins, power words and merging run only in the words phase and in boss fights, so learn levels have none of them.
- Slow motions and screen looks can overlap. The world runs at the slowest slow motion that is still on, and each one ends on its own clock, so a bomber blast never cuts a boss stun short. A screen look such as darkness or the surge glow stays on while any feature still holds it (`src/game/claims`).

Stars, with the current thresholds (`src/course/scoring.ts`). They are judged on the accuracy rounded to a whole percent, the same number the result card and the HUD show, so 92.5% shows as 93% and earns 2 stars:

| Accuracy         | Stars |
| ---------------- | ----- |
| level lost       | 0     |
| won, below 85%   | 0     |
| won, 85% or more | 1     |
| won, 93% or more | 2     |
| won, 97% or more | 3     |

- Accuracy is `hits / (hits + mistakes)`. Words per minute is correct letters divided by 5, per active minute (`src/game/SessionStats.ts`).
- The best result per level is kept, compared by stars first and score second. Total score and letters freed add up on every attempt (`src/course/progress.ts`).

### Run modifiers

Owners: `src/game/modifiers.ts`, `src/game/mechanics/Modifiers.ts`.

`withModifiers(plan, modifiers)` marks every phase of a plan with its modifiers (`modifiers` on the phase) and applies the plan side. The `Modifiers` mechanic applies the board side. The daily challenge uses them, and modifiers in free play can reuse them later.

| Modifier    | Effect                                                                                                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fog`       | Every word label shows the typed part and the next letter, the rest is dots, the same labels as the boss fog (`firstLetter`)                                                                                       |
| `darkness`  | The boss darkness for the whole run: the keyboard hint on bigger screens fades out and the built-in phone keyboard stays usable without finger colours or the next key glow. It stays on when a boss darkness ends |
| `oneHeart`  | The plan has at most one heart                                                                                                                                                                                     |
| `longWords` | Words and generated words have 5 to 8 letters (`LONG_WORDS`), without staged lengths, and the spawn gap is twice as long (`LONG_WORD_GAP`)                                                                         |

### Seeded runs

Owners: `src/random.ts`, `src/game/SpawnScript.ts`, `src/game/PhaseRunner.ts`, `src/game/Game.ts`.

A run plan can carry a `seed`, a whole number. `hashSeed` in `src/random.ts` makes one from parts such as a date and a key set. Course levels, the endless arena and the placement test have no seed and stay random. The [Daily challenge](#daily-challenge) is seeded with `hashSeed([local date, key set])`. With a seed:

- The same on every device, whatever the child types: the words of the run's own spawns, their order, their angles on the spawn arc and their spawn index (`spawnIndex` on the enemy, counted from 0 over the whole run, the boss included). Every key weighs the same and spawns do not avoid letters already on the board, so weak keys and the board never change the words.
- The same timing inside a phase: a spawn comes at the same moment after its phase starts, unless the board is full or a power slows time. A phase starts when the one before is cleared, so a slower child meets the same words a little later.
- The same while the play is the same: special enemies and twins, the time and kind of mid-wave events, boss words and boss attacks. Each mechanic draws from its own stream of the seed, and every phase starts the spawn and event streams again, so a change in one never shifts another.
- Can drift: power words and bombers use the seed too, but they wait for room on the board, so they can show up a few seconds later.
- Not seeded: looks and sound, such as enemy colours, confetti, particles, camera shake, trails and music.

## Difficulty

Owner: `src/course/difficulty.ts`. Every pace and length limit comes from the kind of the level and its place in the course.

Position is `order / (number of levels − 1)`, from 0 at `polana-1` to 1 at `wyspa-24`. Order counts every level of the catalog from 0, bosses included, so an English course ends at `jaskinia-24`, position 0.76. A value written as "a to b" grows in a straight line from a at position 0 to b at position 1.

| Value       | Learn                                                                  | Practice                                                              | Review                 |
| ----------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------- |
| Warm-up     | 5 letters, 1.6 s apart                                                 | 5 letters, 1.5 s apart                                                | 5 letters, 1.5 s apart |
| Main phase  | `learn`                                                                | `words`                                                               | `words`                |
| Words       | 12 to 18                                                               | 12 to 18                                                              | 12 to 20               |
| Word stages | `combos` 1 to 3 letters for 60% of the words, then `focusWords` 2 to 3 | `focusWords` 2 to 3 letters for 20% of the words, then `words` 2 to 4 | `words` 2 to 5 letters |

Pace:

- The course has one pace that grows without jumps. Every learn, practice and review level walks one step of it, and a boss walks none (`PACE_STEPS`). A level starts at the pace the level before it ended with.
- The pace at step progress `p`, from 0 at the start of `polana-1` to 1 at the end of the last review, is a word speed of 0.42 to 1.2 (`WORD_SPEED`) and a spawn interval of 4.4 to 1.9 seconds (`SPAWN_INTERVAL`), both taken at `p^1.5` (`PACE_EASING`). So Polana grows slowly and the later regions carry the growth.
- The main phase eases the speed and the spawn interval of each new enemy from the start pace of the level to its end pace, by the number of enemies sent (`rampTo` and `tempoAt` in `src/game/RunPlan.ts`). The warm-up runs at the start pace.
- An enemy walks 9.4 units from the spawn arc to the hero. That takes about 22.4 seconds at the start of `polana-1`, 22.1 seconds at the end of `polana-3`, 19.4 seconds at the end of Polana, 16.1 at the end of Las, 13.3 at the end of Góry, 10.1 at the end of Jaskinia and 7.8 at the end of Wyspa Ogonków.

More rules:

- Word counts are rounded.
- Generated words of a `words` stage have at most `round(3 to 5)` letters (`GENERATED_MAX_LENGTH`) and never more than the stage allows, so early levels get generated strings of at most 3 letters. Real words and combos use the full length of the stage.
- Boss: `round(4 to 14)` words (`BOSS_HITS`), so 6, 7, 9, 12 and 14 for the five bosses, at speed 0.3 to 0.52 (`BOSS_SPEED`). Other enemies in a boss fight use 2 to 5 letters.
- Mini boss of a review: `round(3 to 5)` words (`MINI_BOSS_HITS`), so 3 in Polana and `las-5`, 4 from `las-10` to `jaskinia-23` and 5 in Wyspa Ogonków, at 0.8 times the speed the review ends with (`MINI_BOSS_SPEED_SHARE`), but never faster than the boss of its region (`BOSS_SPEED` at the boss level). So the `polana-3` mini boss runs at 0.34, just below the Polana boss, and every later mini boss runs at the speed of its region boss. Its words are the review's own words.
- Apart from warm-ups and the rush and meteor events, single letters show only in learn levels.

## Action events

Owners: `src/game/mechanics/SpeedSurge.ts`, `src/game/mechanics/Bombers.ts`, `src/game/mechanics/Twins.ts`.

Speed surges:

- They run in the words phase and in boss fights. The first one comes 20 seconds after the phase starts. The next ones follow every 40 seconds in Polana, 25 seconds in Wyspa Ogonków, and evenly in between for the other regions. During the boss rage the countdown runs twice as fast.
- A warning, "Przyspieszenie!" / "Прискорення!", and a rising sweep come 1.5 seconds before the surge.
- For 7 seconds every enemy except the boss moves 1.8 times faster, also enemies that appear during the surge. Short cube trails follow the enemies and the screen edges glow red. Then every speed goes back to normal.
- A surge is skipped while any enemy is frozen, and it ends early when a freeze lands.

Bombers:

- From Las on, and in every arena run, in the words phase and in boss fights. One comes about every 40 to 50 seconds while enemies are on the board, and at most one is on the board at a time.
- A bomber is 1.7 times bigger and moves at 0.55 times the phase speed. Its word has 6 to 9 letters: a boss word when one fits, otherwise letters from the allowed keys. A lit fuse sparks on top and ticks faster and faster from 7 units away.
- Typing its word detonates it: slow motion at 0.3 for 0.6 seconds, a camera shake and a shockwave. A longer slow motion, such as a boss stun, goes on after it. Every enemy within 4.5 units shatters and scores its normal word points. The boss never shatters. Other bombers in range go off 0.25 seconds later. When 3 or more enemies go down, a banner shows "Bum! x3" / "Бум! x3".
- A bomber that reaches the player costs a life and knocks every other enemy 4 units back. The helmet hat defuses it just before, see [Item powers](#item-powers).

Twins:

- From Las on, and in every arena run, in the words phase, about one spawn in eight becomes 2 to 4 smaller twins in a line or a V. They share one word and bob in step.
- They finish together on the same key. Each twin after the first adds the points of one more word, and a callout shows "Bliźniaki x3!" / "Близнюки x3!" with a spark arc between them.
- Twins that reach the player cost at most one life per group.
- Twins can briefly put more than 6 enemies on the board.

## Profiles

Owners: `src/profiles/Profile.ts`, `src/profiles/profileSchema.ts`, `src/profiles/ProfileStore.ts`.

- Several profiles per device, stored as a JSON array in localStorage under `literkowo.profiles`.
- The game can be open in several tabs or windows at once, such as the installed app and a browser tab. Every save reads the stored list first and changes only its own profile, so a tab never wipes or reverts the other profiles. When two tabs save the same profile, the last save wins.
- A tab listens for changes that other tabs save. The profile screen refreshes its cards at once, but keeps a name that is being typed in the new profile panel. The map, the arena and the shop load the newest saved copy of the profile when they open. A running level is never interrupted.
- Schema version is 8 (`PROFILE_SCHEMA_VERSION`). Older profiles are migrated on load: version 1 moves the best score into the total score, version 2 seeds XP with `round(totalScore / 10)`, version 3 starts with empty key statistics, version 4 gets the starter inventory and nothing equipped, version 5 moves level results onto the course with one key per level (`src/profiles/courseMigration.ts`), version 6 gets an empty arena record, version 7 gets counters seeded from what it already has (`src/profiles/countersMigration.ts`). Every migrated profile also gets every trophy it already earned. A shape change bumps the version and adds a migration.
- Each migration is one step in the `MIGRATIONS` table of `src/profiles/profileSchema.ts`. A step reads the raw stored data of its version and keeps the course and shop data it needs frozen inside the step, so a later change to levels or prices never changes how an old profile migrates.
- Seeded counters: bosses beaten from boss levels with a star, coins earned from the coins plus the version 8 price of every owned item, perfect levels and the best speed from level results with stars, and the current skin as played. Words, power words and special enemies start at 0, since older profiles did not count them.
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
- Fields: id, name (up to 16 characters, `src/ui/ProfileScreen.ts`), avatar, word language, total score, letters freed, XP, coins, seen stories, the best result per level, the key statistics, the inventory, the equipped items, the arena record (see [Arena](#arena)) and the counters (see [Trophies](#trophies)).
- Inventory: owned pets, hats, skins and earned trophies, as id lists. Unknown ids are dropped on load. Every profile owns the 6 starter skins and its current avatar.
- Equipped: at most one pet and one hat. An id the inventory does not own is dropped on load.
- Word language is set per profile. Today the choices are Polish (default) and English (`WORD_LANGUAGES` in `src/profiles/Profile.ts`).
- Avatars are character skins: 18 Kenney Blocky Characters with ids `a` to `r`. Portraits are in `public/characters`, 3D models in `public/models/characters` (`src/game/Player.ts`). The skins `a` to `f` are free. The new profile picker shows the other 12 with a lock badge: the price in coins, or the level where the rank opens them. Locked skins cannot be picked there, they come from the shop.
- Other keys: `literkowo.activeProfile`, `literkowo.uiLanguage`, `literkowo.sound`, `literkowo.music`, `literkowo.quality`, `literkowo.onScreenKeyboard`, `literkowo.reducedMotion`, `literkowo.reloadedAfterPreloadError`, `literkowo.rotateHintSeen`. The settings among them belong to the device, not to a profile, see [Settings](#settings).
- When a write cannot reach localStorage, because storage is blocked or full, the value stays in memory for the session and `writeStorage` reports it (`src/storage.ts`). The first profile save of a session that stays in memory shows a small notice at the bottom of the screen: "Postęp nie zapisze się na tym urządzeniu. Zapisz go do pliku w ustawieniach" / "Поступ не збережеться на цьому пристрої. Збережи його у файл у налаштуваннях". It does not block the game, fades out after 8 seconds or on a tap, and comes at most once per session (`src/app/saveWatch.ts`, `src/ui/Notice.ts`, copy in `src/i18n/features/notice.ts`). The notice and the rotate hint share one pill (`src/ui/hintPill.ts`).
- Progress can be saved to a file and loaded back from one in the [Settings](#settings).
- After the first profile save of a session that reaches localStorage, the game asks the browser to keep its storage with `navigator.storage.persist()`, unless it is kept already (`src/persistentStorage.ts`). The game never waits for the answer, and a refusal or a browser without the API changes nothing.

## Scoring

Owners: `src/game/SessionStats.ts`, `src/game/combo.ts`.

- Points are added when a word is complete: `letters × 10 × multiplier × fever bonus`.
- Combo grows by 1 for each correct letter. A mistake or a lost life sets it back to 0.
- Multiplier is `1 + floor(combo / 5)`, at most 5.
- Fever starts at combo 15 and doubles points. It ends on a mistake or a lost life, unless the laurel hat keeps it, see [Item powers](#item-powers). A gold ring spins around the player while it lasts (`src/game/mechanics/Fever.ts`).
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
| `freeze` | Mróz / Мороз      | ❄️   | lód, mróz, zima, szron              | ice, frost, snow     | Every enemy on the board, the boss included, freezes for 3 seconds (`FREEZE_SECONDS`), 4.5 with the beanie hat.                                                                         |
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

The region boss fight has three phases by the boss's health: the words left out of the words needed (`src/game/mechanics/bossPhases/phases.ts`). Each phase shows its banner the first time a hit lands in it.

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

Mini boss (`src/game/mechanics/bossPhases/MiniBossFight.ts`):

- Every review level ends with a mini boss: a `boss` phase with `miniBoss` set in the plan (`src/game/LevelPlan.ts`). It starts once the review's words are cleared.
- It is the region's boss model at 1.7 times the size of an enemy instead of 2.4 (`MINI_BOSS_SCALE` in `src/game/Boss.ts`), with the hits and speed in [Difficulty](#difficulty).
- As it arrives, the banner "Mały Strażnik!" / "Малий Вартовий!" shows. The last hit plays a short fanfare and the callout "Mały Strażnik pokonany!" / "Малого Вартового переможено!" shows, then the level ends.
- It fights in one phase: no armour, weak point or rage banners, no stun, no minions and no signature attacks. Speed surges keep their calm pace next to it.
- Stars of a review still come from accuracy. A mini boss that reaches the hero jumps back and costs a life like the region boss.

Score, XP and accuracy:

- Attacks never cost a life and never count as a mistake.
- A boss hit, also of a mini boss, gives XP with tag factor 3 and a minion with factor 1, see [Progression](#progression). Minions score and pay coins like any word, and cost a life when they reach the hero.

## Enemy types

Owners: `src/game/mechanics/EnemyTypes.ts`, `src/game/mechanics/enemyTypes/kinds.ts`, `src/game/mechanics/enemyTypes/factory.ts`, one class per type in `src/game/mechanics/enemyTypes`.

- During the words phase, a fresh normal spawn turns into a special enemy with a chance of 25% (`SPECIAL_SHARE`). The chance is split by weight between the unlocked types: jumper 3, nest 1, the others 2 each (`KIND_WEIGHTS`).
- The special enemy takes the place of the spawn, so the word count of the phase stays the same. A balloon that floats away or a thief that escapes counts as done.
- Only plain spawns without a tag are replaced. The boss, the mini boss, power words, merged enemies, minions, twins, bombers, chicks, splitter halves and event pieces stay as they are. Special enemies never merge.
- At most 1 special enemy is on the board in Polana, and at most 3 in later regions. Bull, nest and thief also come one at a time (`KIND_LIMITS`).
- The first time a type appears in a level, its name shows as a callout. Each type also has a short hint in `src/i18n/features/enemyTypes.ts`.
- In an arena run every type is unlocked and up to 3 special enemies can be on the board, see [Arena](#arena). In a course level a type unlocks with the learn level of its key, see the table. Special enemies only replace spawns in the words phase, so the first one shows in the practice level of that key. When a profile's course never teaches that key, the type unlocks with its fallback key instead. English word profiles never see Wyspa Ogonków, so they meet the chameleon with `x` in `jaskinia-11` and the nest with `b` in `jaskinia-16` (`src/game/mechanics/enemyTypes/kinds.ts`).

| Type        | Name (pl / uk)          | From                        | Word                                     | Movement                                                                    | Rule                                                                                                                                                                   |
| ----------- | ----------------------- | --------------------------- | ---------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jumper`    | Skoczek / Стрибунець    | `s`, `polana-9`             | one focus key, 4 to 7 times              | hops 1 unit at a time, at the normal word speed                             | Each letter makes it hop in place and shrink.                                                                                                                          |
| `balloon`   | Balonik / Кулька        | `s`, `polana-9`             | 3 to 5 letters                           | starts at distance 6, rises 0.42 per second, drifts sideways                | Above height 7 it floats away, with no mistake and no lost life. Popped, it pays double word points.                                                                   |
| `bat`       | Nietoperz / Кажан       | `g`, `las-1`                | 3 to 4 letters                           | flies an arc at height 2.5, at 2.5 × the word speed                         | At the far side it drops a bomb. When the bomb lands, the hero loses a life and the camera shakes. Typed before that, it tumbles and shatters.                         |
| `ghost`     | Duch / Привид           | `e`, `las-6`                | 3 to 5 letters                           | walks at 0.9 × the word speed and drifts sideways                           | It fades out and back in on a 3 second cycle. Its label shows only while it is solid, but it can be typed at any time. The horns hat keeps it solid.                   |
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

- Once in each words phase, one event starts with a banner. A course level has one words phase. It starts at a random moment between one third and two thirds of `count × spawnInterval` of the phase. Each event is equally likely.
- A phase can ask for another number of events (`events` in `src/game/RunPlan.ts`). Several events split the middle third of the phase evenly, and each one waits until the one before has sent all its pieces. Arena waves use this, see [Arena](#arena).
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
- The XP of each word is then scaled by the XP factor of the run plan and rounded again. Course levels use 1 (`LEVEL_XP_FACTOR` in `src/game/LevelPlan.ts`), the arena 0.4 to 0.25 by preset, and the placement test 0, see [Placement test](#placement-test). An XP hat scales the XP of the whole run by at most 10%, see [Item powers](#item-powers).
- A floating "+12 XP" rises from the enemy on each completed word that earns XP, and the HUD shows the XP of the run next to the score, unless the run plan pays no XP. The level number sits on the avatar button of the HUD.
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

- During a level each completed word gives 1 coin, the coins per word of the run plan. The arena pays less per word, see [Arena](#arena). Mechanics add more with `addCoins(amount)`: 15 for a treasure chest, 5 for a thief caught with its loot, 15 more for a chest doubled by the piggy. Run coins never go down. The run total is `GameResult.coins`, and the coin factor of the equipped hat is `GameResult.coinBoost`.
- After the level: the run coins, plus 10 for a won level, plus 5 per star. A coin hat scales this whole sum by its share, rounded down, so "Monety +10%" is what the result card shows (`levelCoins` in `src/course/coins.ts`, see [Item powers](#item-powers)).

The result card fills the XP bar from the old progress to the new one. When a level is crossed it shows a "Nowy poziom!" / "Новий рівень!" banner with the rank name, confetti that stays inside the card, and the level complete and sparkle sounds. The coins earned sit in a pill next to the XP. The map header and the profile cards show the level, the rank, a thin XP bar and the coins.

## Key mastery

Owners: `src/course/keyStats.ts`, `src/course/mastery.ts`, `src/game/KeyTracker.ts`.

The game keeps statistics for every key of the course, Polish letters included, so finished regions still have work in them.

Recording, during a level (`src/game/KeyTracker.ts`):

- Only keys allowed in the level count. Keys are the lower case characters the game sees.
- A hit counts for the typed key. A mistake counts for the hinted next key, the one the on screen keyboard highlights: the letter the nearest followed enemy is waiting for, or else the letter the nearest enemy is waiting for. Only with no enemy on the board does it count for the typed key.
- A lost life is not a keystroke and does not count.
- Speed is the time from the previous correct key to this hit. Gaps over 2 seconds are ignored. It is the plain average for the first samples and then a moving average over about 50 hits.
- The statistics are added to the profile after every attempt, won or lost, and after every placement test. The dev shortcut does not save them.

Stored per key, with no keystroke history: hits, misses, the outcome of the last 30 keystrokes as a bit mask, the moving speed with its sample count, and the last 10 days the key was practised as ISO dates in local time.

Mastery levels (`src/course/mastery.ts`):

| Level      | Polish       | Ukrainian    | Rule                                                                  |
| ---------- | ------------ | ------------ | --------------------------------------------------------------------- |
| `none`     | Nowy klawisz | Нова клавіша | no keystroke yet                                                      |
| `learning` | Uczysz się   | Вчишся       | any other key                                                         |
| `solid`    | Pewnie       | Впевнено     | at least 10 recent keystrokes and 90% accuracy over the last 30       |
| `mastered` | Opanowany    | Опановано    | 30 recent keystrokes, 97% accuracy, speed on target, 3 different days |

- Speed target: at most 900 ms between keys, or 1400 ms for Polish letters typed with right Alt.
- The solid and mastered checks use the accuracy rounded to a whole percent, the same number the learn card, the result card and the heatmap show, so a key showing 90% always has solid accuracy and a key showing 97% always has mastered accuracy.
- 97% of 30 keystrokes means at most one mistake in the last 30 keystrokes, since 29 of 30 rounds to 97%. A second mistake drops the key to `solid` until its last 30 keystrokes have at most one mistake again.
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

Owners: `src/course/shop.ts` (catalogue, prices, powers and trophies), `src/course/powers.ts` (power kinds and strength units), `src/course/inventory.ts` (buying and equipping), `src/course/trophies.ts`, `src/course/counters.ts`, `src/arena/goals.ts`, `src/ui/ShopScreen.ts`, copy in `src/i18n/features/shop.ts`.

The shop opens from several places, and its back button returns to where it was opened from and names it (`ShopExit` in `src/ui/ShopScreen.ts`):

| Opened from                                                                      | Back button         | Opens on      |
| -------------------------------------------------------------------------------- | ------------------- | ------------- |
| the bag button "Sklep" / "Крамниця" in the map header                            | "Mapa" / "Мапа"     | the first tab |
| the quiet "Sklep" / "Крамниця" link next to Play on the profile screen           | "Gracze" / "Гравці" | the first tab |
| the shop link next to the coins in the arena screen header                       | "Arena" / "Арена"   | the first tab |
| a trophy chip on the result card of a level                                      | "Mapa" / "Мапа"     | the trophies  |
| the "Nowość w sklepie" / "Новинка в крамниці" chip on the result card of a level | "Mapa" / "Мапа"     | the first tab |
| a trophy chip or the news chip on the arena result card                          | "Arena" / "Арена"   | as above      |

A green dot on the map header button means something can be bought or claimed right now. Leaving a level result for the shop still plays the after scene of a beaten boss first. Coming back to the arena screen keeps the chosen key set and preset.

Layout:

- On the left, "Twój bohater" / "Твій герой" shows the hero in 3D with the equipped hat and pet, swaying slowly (`src/ui/portraits/OutfitView.ts`). Touch screens and reduced motion get a still frame. Until the model loads, the portrait shows.
- Tabs: "Zwierzaki" / "Улюбленці", "Czapki" / "Шапки", "Postacie" / "Персонажі", "Trofea" / "Трофеї". The coins sit in the header.
- Each item card shows a rendered preview, the name, for pets and hats a gold line with a bolt icon that says what the item does (see [Item powers](#item-powers)), and a short description. Pets and hats are rendered once per session in an offscreen studio, hats on a plain cube head (`src/ui/portraits/ItemStudio.ts`). Skins use the character portraits.
- The shop fills the screen and never scrolls as a page. The hero shrinks to the height that is left, and only the item list under the tabs scrolls, when it does not fit. Screens up to 800 px tall get smaller cards. In portrait up to 900 px wide the hero is a strip above the tabs, and on phones in landscape it is a narrow column next to them.

Item states and actions:

| State          | Card shows                                                                                                                               |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `equipped`     | "W użyciu" / "Обрано" and, for pets and hats, "Zdejmij" / "Зняти"                                                                        |
| `owned`        | "Weź ze sobą" for a pet, "Załóż" for a hat, "Wybierz" for a skin                                                                         |
| `buyable`      | "Kup" / "Купити" with the price                                                                                                          |
| `claimable`    | "Odbierz" / "Забрати", for rank items once the rank is reached and arena items once the arena goal is reached                            |
| `tooExpensive` | the price and "Brakuje 45" / "Бракує 45", no button                                                                                      |
| `rankLocked`   | a lock badge with the rank's first level and "Ranga: Uczeń" / "Ранг: Учень"                                                              |
| `arenaLocked`  | a lock badge with the wave or a star for gold, and "Arena: fala 15" / "Арена: хвиля 15" or "Arena: złoty medal" / "Арена: золота медаль" |

- Buying or claiming puts the item on at once, with chimes, a sparkle and confetti on the card. A skin becomes the profile's avatar.
- Every change is saved to the profile right away.
- Arena goals count any key set and difficulty: the most waves cleared in one endless run, or a gold medal in any of them (`hasReachedArenaGoal` in `src/arena/goals.ts`).

Economy. With the gradual course a won level pays about 35 coins: about 33 with one star, 38 with two and 43 with three, so the whole Polish course pays about 3300, 3800 and 4300 coins. The first hat takes about 2 levels and the first pet 4 to 6. Every coin item together costs 12135 coins, about three times the whole course, so the full shop takes many weeks of levels, replays and arena coins. `src/course/shop.test.ts` checks the first pet and these totals. Coin hats raise every payout by at most 25%, so even the crown cuts the time to the full shop by only a fifth.

Pets act in the level and hats work all the time, see [Item powers](#item-powers) for each rule. The strength is a count per level, seconds, a share or simply on.

| Pet        | Polish    | Ukrainian  | Unlock                     | Power          | Strength               |
| ---------- | --------- | ---------- | -------------------------- | -------------- | ---------------------- |
| `cube-cat` | Kostka    | Кубик      | 160 coins                  | `zap`          | 1 per level            |
| `piggy`    | Skarbonka | Скарбничка | 250 coins                  | `doubleChest`  | 1 per level            |
| `bee`      | Bzyczek   | Дзижчик    | 320 coins                  | `popBalloon`   | 3 per level            |
| `star`     | Gwiazdka  | Зірочка    | rank Uczeń                 | `restoreHeart` | 1 per level            |
| `puppy`    | Piesek    | Цуценя     | 400 coins                  | `catchThief`   | 2 per level            |
| `ghost`    | Duszek    | Привидик   | 480 coins                  | `catchGhost`   | 2 per level            |
| `penguin`  | Pingwinek | Пінгвінчик | 700 coins                  | `freezeBoard`  | 2 seconds, 1 per level |
| `dragon`   | Smoczek   | Дракончик  | 900 coins                  | `catchBat`     | 2 per level            |
| `robot`    | Robocik   | Роботик    | rank Strażnik Słów         | `catchBomber`  | 1 per level            |
| `shadow`   | Cień      | Тінь       | arena: 15 waves in one run | `stopNear`     | 2 seconds              |

| Hat          | Polish               | Ukrainian         | Unlock                  | Power         | Strength         |
| ------------ | -------------------- | ----------------- | ----------------------- | ------------- | ---------------- |
| `cap`        | Czapka z daszkiem    | Кепка             | 75 coins                | `coins`       | +10%             |
| `headphones` | Słuchawki            | Навушники         | 200 coins               | `xp`          | +5%              |
| `horns`      | Różki                | Ріжки             | 350 coins               | `solidGhosts` | on               |
| `halo`       | Aureola              | Німб              | 600 coins               | `bossGuard`   | 1 per boss fight |
| `beanie`     | Czapka z pomponem    | Шапка з помпоном  | 800 coins               | `longFreeze`  | +50%             |
| `wizard`     | Kapelusz czarodzieja | Капелюх чарівника | rank Łowca Liter        | `xp`          | +10%             |
| `helmet`     | Hełm rycerza         | Шолом лицаря      | 1100 coins              | `defuse`      | on               |
| `pirate`     | Kapelusz pirata      | Капелюх пірата    | 1500 coins              | `coins`       | +20%             |
| `crown`      | Korona               | Корона            | rank Legenda            | `coins`       | +25%             |
| `laurel`     | Wieniec laurowy      | Лавровий вінок    | arena: first gold medal | `feverSlip`   | 1 per level      |

Skins are named "Postać 7" / "Персонаж 7" by their place in the roster. They have no power.

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

### Trophies

Trophies are awarded after every attempt, after buying or claiming an item and when an older profile is migrated. They are never taken away.

| Trophy                                  | Polish                   | Ukrainian          | Rule                                                     |
| --------------------------------------- | ------------------------ | ------------------ | -------------------------------------------------------- |
| `first-boss`                            | Pogromca bossa           | Переможець боса    | at least one star on any boss level                      |
| `region-<id>`                           | the region's name        | the region's name  | at least one star on every level of that region          |
| `level-10`, `level-25`, `level-50`      | Poziom 10                | Рівень 10          | the player level reached                                 |
| `mastered-region`                       | Mistrz klawiszy          | Майстер клавіш     | every new key of one region mastered                     |
| `arena-wave-10`, `arena-wave-20`        | Fala 10                  | Хвиля 10           | the waves cleared in one arena run                       |
| `arena-gold`                            | Złoty medal              | Золота медаль      | a gold medal in the arena                                |
| `stamps-7`, `stamps-30`                 | 7 pieczątek              | 7 печаток          | daily challenge stamps in total                          |
| `week-streak-4`                         | 4 tygodnie z rzędu       | 4 тижні поспіль    | the best run of weeks in a row with 3 daily stamps       |
| `star-streak-5`                         | Gwiezdna seria           | Зіркова серія      | three stars on 5 levels in a row of the profile's course |
| `every-region-three-stars`              | Gwiazda wszystkich krain | Зірка всіх країв   | three stars on every level of the profile's course       |
| `perfect-level`                         | Bez pomyłki              | Без помилок        | a level won at 100% accuracy                             |
| `wpm-20`, `wpm-30`, `wpm-40`            | Tempo 20                 | Темп 20            | words per minute in a level with at least one star       |
| `words-500`, `words-2000`, `words-5000` | 500 słów                 | 500 слів           | words typed in total, in levels and the arena            |
| `bosses-10`                             | Łowca bossów             | Мисливець на босів | bosses beaten: region bosses and arena boss waves        |
| `power-words-50`                        | Złote słowa              | Золоті слова       | power words typed                                        |
| `special-enemies-100`                   | Łowca stworków           | Ловець істот       | special enemies typed, see [Enemy types](#enemy-types)   |
| `coins-1000`                            | Skarbnik                 | Скарбник           | coins earned in total, purchases do not count against it |
| `starter-skins`                         | Przebieraniec            | Перевдягайко       | a level or arena run with each of the six starter skins  |
| `first-item`                            | Pierwszy zakup           | Перша покупка      | one pet, hat or skin from the shop, bought or claimed    |
| `five-items`                            | Kolekcjoner              | Колекціонер        | five of them                                             |

Counters (`src/course/counters.ts`, `src/game/RunTally.ts`). The game tallies each run and the profile adds it up after every attempt, won or lost:

| Counter          | Adds up                                                                          |
| ---------------- | -------------------------------------------------------------------------------- |
| `wordsTyped`     | every typed word, boss hits included                                             |
| `powerWords`     | typed power words                                                                |
| `specialEnemies` | typed special enemies. Pet catches and blasts do not count                       |
| `bossesBeaten`   | bosses beaten in a level or an arena boss wave                                   |
| `coinsEarned`    | the coins of each level and arena run                                            |
| `perfectLevels`  | levels won with at least one star at 100% accuracy                               |
| `bestWpm`        | the best words per minute of a level with at least one star, arena runs excluded |
| `skinsPlayed`    | the skins a level or arena run was played with                                   |

The trophy tab shows "Trofea: 3 z 32" / "Трофеї: 3 з 32" and every trophy with its name and the rule as its hint. Earned trophies glow in their colour. Locked ones are grey, and when the rule can be measured they show a bar in the trophy's colour with "312 z 500" / "312 з 500" (`trophyProgress` in `src/course/trophies.ts`). The first boss, the mastered region and the arena gold show "Jeszcze przed tobą" / "Ще попереду" instead.

The result card adds a chip "Nowy skarb: Polana" / "Новий скарб: Галявина" for each trophy of the attempt, and "Nowość w sklepie" / "Новинка в крамниці" when an item became affordable or claimable. These chips are buttons with a small › mark that open the shop as in the table above (`src/ui/resultTreasures.ts`). On touch screens each chip button reaches 44 px tall without changing the card layout.

## Arena

Owners: `src/arena` (`keySets.ts`, `difficulty.ts`, `endlessPlan.ts`, `medals.ts`, `economy.ts`, `record.ts`, `progress.ts`), `src/game/mechanics/ArenaWaves.ts`, `src/app/ArenaFlow.ts`, `src/ui/arena/ArenaScreen.ts`, `src/ui/arena/ArenaResult.ts`, `src/ui/arena/arenaParts.ts`, `src/ui/arena.css`, copy in `src/i18n/features/arena.ts`.

The arena, "Arena" / "Арена", is extra play next to the course, open from the first day so that a child who can already type is never bored. It holds three modes: the [Placement test](#placement-test) "Sprawdzian" / "Перевірка", the [Daily challenge](#daily-challenge) "Wyzwanie dnia" / "Виклик дня" and "Bez końca" / "Без кінця": waves that never end, until the last heart is gone. The course stays the only place to learn new keys.

Opening:

- The arena is always open. Map header: the "Arena" / "Арена" button sits next to the shop button in the same style, only the icon on phones. While today's daily challenge has no finished try, it shows a small green dot.

Screen:

- The hero card on the left shows the hero in 3D and the endless records of the chosen key set, one row per open difficulty.
- Three mode tabs sit at the top, with an icon and a name: "Sprawdzian" / "Перевірка", "Wyzwanie dnia" / "Виклик дня" and "Bez końca" / "Без кінця". The daily tab carries the green dot while today waits. The screen opens on "Bez końca", or on the mode the child just played when it comes back from a result card or the shop.
- One panel under the tabs shows the chosen mode, and it has the one big Play button of the screen. Enter plays the chosen mode, Escape goes back to the map.
- "Bez końca": the key set chips with the keys of the chosen set, the difficulty chips with the lock hint, the rule line, the best wave with its medal, and Play.
- "Wyzwanie dnia": the key set chips while the day has no finished try, then the daily card (see [Daily challenge](#daily-challenge)).
- "Sprawdzian": a chip per stage with the region names, the rule "Pisz słowa, które widzisz. Każdy etap trwa 12 sekund." / "Друкуй слова, які бачиш. Кожен етап триває 12 секунд.", the home row hint, the pill "Zaczynasz tutaj: Las" / "Починаєш тут: Ліс" once the profile has a placement, and Play, which starts the test at once.
- On phones the tabs stack the icon over the name and the panel fills the width. In landscape the hero card hides and the endless panel puts the key set and the difficulty side by side.

Key sets:

- The first region is always open. Every other region opens once its boss level is open, which means every key of the region was introduced. A placement opens the boss levels of every placed region, so it opens their key sets too.
- A key set holds the allowed keys of its region's boss level, so every key up to and including that region. English word profiles never get Wyspa Ogonków.
- The screen starts on the highest key set. The theme, the music and the boss of a run are those of the key set's region. The game runs the run with that boss level as its level.

Difficulty presets (`src/arena/difficulty.ts`):

| Level | Id       | Name (pl / uk)         | Speed  | Spawn gap | Hearts | Special share | Events per wave | Boss           | Coins  | XP factor |
| ----- | -------- | ---------------------- | ------ | --------- | ------ | ------------- | --------------- | -------------- | ------ | --------- |
| 1     | `calm`   | Spokojnie / Спокійно   | × 0.8  | × 1.2     | 3      | 10%           | 1               | none           | × 1    | 0.4       |
| 2     | `normal` | Normalnie / Звичайно   | × 1    | × 1       | 3      | 25%           | 1               | none           | × 1.25 | 0.4       |
| 3     | `fast`   | Szybko / Швидко        | × 1.2  | × 0.85    | 3      | 35%           | 1               | every 5th wave | × 1.5  | 0.3       |
| 4     | `frenzy` | Szaleństwo / Шаленство | × 1.35 | × 0.75    | 1      | 50%           | 2               | every 5th wave | × 2    | 0.25      |

- Spokojnie and Normalnie are open with the arena. Szybko opens with a silver medal on Normalnie with any key set, and Szaleństwo with a silver on Szybko.
- A locked chip shows a lock badge, and a hint under the chips names what opens the first locked preset: "Srebro na poziomie Normalnie otworzy Szybko" / "Срібло на рівні Звичайно відкриє Швидко".

Endless waves (`src/arena/endlessPlan.ts`):

- Wave 1 starts at the course pace of the key set's boss level, which is the pace the region's last review ends with (see [Difficulty](#difficulty)), times the preset's speed and spawn gap.
- Wave `n` has `8 + 2n` words, at most 30.
- Each wave is 5% faster than the one before, up to 1.8 times wave 1.
- The spawn interval shrinks 5% per wave, down to 85% of wave 1 (`SPAWN_GAP`). The floor keeps the XP rule below.
- Words have at least 2 letters. The longest word has 3 letters in waves 1 to 3 and grows by one letter every three waves, up to 8 from wave 16. Generated words use the same lengths.
- Every key of the key set is a focus key, and weak keys get more weight as in the course.
- Every mechanic runs from wave 1, whatever the course progress: every enemy type with up to 3 special enemies at once, bombers, twins, speed surges, power words and merging. The run plan says so with `allMechanicsUnlocked`. Special enemies replace a spawn at the preset's share.
- Mid-wave events start at wave 3, with the preset's number of events per wave. Two events in one wave share the middle third of it, one after the other.
- On presets with a boss, every fifth wave is the key set region's boss with its phases and signature attacks, with the region boss's number of words and its speed times the preset speed. A beaten boss wave grants a shield, the same bubble as the power word Tarcza, with the callout "Tarcza za bossa!" / "Щит за боса!".
- Each wave after the first starts with 4 calm seconds without spawns (`CALM_SECONDS`).
- Each wave starts with a chime and the banner "Fala 4" / "Хвиля 4". The HUD progress label shows the wave, the HUD has as many hearts as the preset, and the music switches to the boss mood during a boss wave.
- Pause works as in a level, and the pause card has a quiet "Zakończ" / "Завершити" button that ends the run on purpose. The "Mapa" / "Мапа" button in the HUD opens that pause card instead of leaving, so a run is never lost by accident. The run ends when the last heart is gone or when the child ends it. An ended run counts like a lost one: the waves cleared so far are the result, with the same medal, record, XP and coins. Waves cleared count every wave that was finished, boss waves included.

Medals (`src/arena/medals.ts`):

- A medal is the lower of two grades. Waves cleared: 3 for bronze, 6 for silver, 10 for gold. Accuracy: the star thresholds on the rounded percent, 85, 93 and 97. Rushing never earns gold.
- Bronze is `#d08a4a`, silver `#c9d4ea` and gold the accent colour (`.medal` in `src/ui/arena.css`).

Coins and XP (`src/arena/economy.ts`):

- Each word pays half a coin times the preset's coin factor, and the run's word coins are rounded down. Chests and caught thieves pay as in a level.
- Each medal pays once per key set and difficulty: bronze 20, silver 40, gold 80. A run that skips a medal pays every medal up to the new one.
- A new best wave, more waves cleared than before on that key set and difficulty, pays 15.
- A coin hat scales the whole payout of the run, words, chests, thieves, medals and the new best wave together, rounded down (`arenaPayout`).
- XP is word XP times the preset's XP factor. Faster presets pay less XP per word, so they never pay more XP per minute.
- Rule: arena XP per minute stays within 1.25 times the course practice XP per minute at the same accuracy and course position (`XP_RATE_CAP`). `src/arena/xpPerMinute.test.ts` simulates the real XP formulas at 93, 95 and 97% accuracy, for every key set, preset and run length up to 60 waves, against the last practice level of the key set's region.
- XP, score, letters freed, key statistics and counters are added to the profile after every run, and trophies are awarded, as after a level (`src/arena/progress.ts`). Item powers that work a number of times per level start again at every wave.

Arena screen (`src/ui/arena/ArenaScreen.ts`):

- It copies the shop: a header with the back button "Mapa" / "Мапа", the title, a quiet shop link with the bag and "Sklep" / "Крамниця" (only the bag on phones) and the coins. On the left the hero in 3D with the equipped hat and pet, and under it the best wave and medal of the chosen key set for each open preset.
- On the right: the key set chips with region names and the keys under them across the top. Below them two columns: the [Daily challenge](#daily-challenge) card on the left, and on the right the difficulty chips over the mode card "Bez końca" / "Без кінця" with its rule line, the best wave of the chosen key set and preset ("Rekord: fala 9" / "Рекорд: хвиля 9", or "Jeszcze bez rekordu" / "Ще без рекорду") with its medal, and a gold Play button. The daily card is as tall as that column, with its Play at the bottom.
- The screen fills the window without scrolling, with the hero column and the setup side by side. The hero shrinks to the height that is left.
- Tablets in portrait: the hero is a strip on top, with the portrait on the left and the record pills next to it.
- Phones in portrait: one column without the hero, in this order: the key set chips with the keys on one line, the daily card, the difficulty chips in one row, and the mode card. The field labels hide and the chip rows carry them as their names for screen readers. The mode card shows the name and the rule, then the record and Play in one row.
- Phones in landscape: no hero column. The key set chips and the difficulty chips share the top row, without labels, the keys line and the hint under the difficulty chips. Then the daily card as one row and the mode card as one row: the icon, the name with the record, the rule, and Play at the right.
- Coming back from a run keeps the chosen key set and preset.

Result card (`src/ui/arena/ArenaResult.ts`), in the result panel of a level:

- The title is "Nowy rekord!" / "Новий рекорд!" on a new best wave, with confetti and a sparkle. Otherwise it is "Dobra robota!" / "Гарна робота!" with a medal and "Mrok był szybszy" / "Морок був швидший" without one.
- The medal takes the place of the stars, with a hint naming what the next medal needs: "Srebro. Złoto: fala 10 i 97%" / "Срібло. Золото: хвиля 10 і 97%", or "Złoto! To najlepszy medal" / "Золото! Це найкраща медаль".
- Tiles for "Fale" / "Хвилі" (waves cleared), points and accuracy. The XP bar and the coins of the run with every payout, trophy chips, then "Jeszcze raz" / "Ще раз" as the main button and "Arena" back to the arena screen. Enter presses the main button 600 ms after the card opens (`KEY_READY_MS` in `src/ui/overlay.ts`).
- On phones in landscape the medal sits next to the title, at 44 px, like the stars of a level.

Record, part of profile schema 7 (`src/arena/record.ts`):

```ts
type Medal = 0 | 1 | 2 | 3; // none, bronze, silver, gold

interface ArenaRecord {
  placement?: { regionId: string; date: string };
  endless: Record<string, EndlessBest>; // "<key set>/<difficulty>", for example "las/normal"
  medalsPaid: Record<string, Medal>; // same keys, the highest medal already paid
  daily?: DailyRecord;
}

interface EndlessBest {
  wave: number; // waves cleared in the best run
  score: number;
  accuracy: number;
  medal: Medal; // the best medal of any run
  date: string; // local ISO date of the best run
  runs: number;
}
```

- The best run has the most waves cleared, then the most points.
- `daily` is filled by the [Daily challenge](#daily-challenge).
- Broken entries and unknown fields are dropped on load, such as the unused `tracks`, `shadowWins` and `modifierWins` of older saves.

## Daily challenge

Owners: `src/arena/daily.ts` (tries, stamps, chests, weeks in a row), `src/arena/formats.ts` (formats and medals), `src/arena/dailyPlan.ts`, `src/arena/dailyProgress.ts`, `src/arena/week.ts` (local days and ISO weeks), `src/arena/timeAttack.ts`, `src/app/ArenaFlow.ts`, `src/ui/arena/DailyCard.ts`, `src/ui/arena/stampRow.ts`, `src/ui/arena/DailyResult.ts`, `src/ui/daily.css`, copy in `src/i18n/features/daily.ts`.

"Wyzwanie dnia" / "Виклик дня" is a short run with a new rule every day, on the arena screen. It is there to bring a child back for a few minutes a day, without punishing a missed day.

The day:

- One challenge per key set per local day. Days and weeks follow the local clock of the device. Weeks run from Monday to Sunday and are named by their ISO week, for example `2026-W42`. All date logic takes an injectable clock, so tests cover midnight, the turn of a week and of a year.
- The run is seeded with the local date and the key set (`dailySeed` in `src/arena/dailyPlan.ts`), so brothers and sisters on the same key set get the same words at the same moments, see [Seeded runs](#seeded-runs). Every try of the day replays the same words.
- The run uses the Normalnie values: speed, spawn gap, special enemies, events, coins and XP, see [Arena](#arena). There is no difficulty choice.
- A child gets 3 tries a day (`DAILY_TRIES`) and the best one counts: the higher medal, then the higher score.
- A try counts when the run ends by time, by losing all hearts, or by beating the last boss on Saturday. Leaving through the pause card or the map button does not use a try.
- The first finished try fixes the key set of the day. After that the daily card stays on that key set whatever chip is chosen, and its key set pill names it. The next day the card follows the chip again.

Formats, by weekday (`DAILY_FORMATS`):

| Day | Format (pl / uk)           | Length    | Rule                                                                                                                                                                                                                                                                                                                                                                      |
| --- | -------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mon | Mgła / Туман               | 3 minutes | Arena waves with the `fog` modifier: labels show only the next letter                                                                                                                                                                                                                                                                                                     |
| Tue | Dwie minuty / Дві хвилини  | 2 minutes | Time attack: one `test` phase, as in the placement test, with no hearts. The board keeps 4 real words (`TIME_ATTACK_BOARD`) of 3 to 5 letters and refills as soon as one leaves. They walk at 0.8 times the speed of the region's last practice level. An enemy that reaches the hero vanishes and breaks the combo. Special enemies, events and other mechanics stay off |
| Wed | Ciemność / Темрява         | 3 minutes | Arena waves with the `darkness` modifier: no keyboard hint for the whole run                                                                                                                                                                                                                                                                                              |
| Thu | Długie słowa / Довгі слова | 3 minutes | Arena waves with the `longWords` modifier at the Spokojnie speed factor                                                                                                                                                                                                                                                                                                   |
| Fri | Jedno serce / Одне серце   | 3 minutes | Arena waves with the `oneHeart` modifier at the Spokojnie speed factor                                                                                                                                                                                                                                                                                                    |
| Sat | Bossowie / Боси            | 3 minutes | Three short boss fights in a row: 6 words, Mały Strażnik with 4 hits, 6 words, Mały Strażnik with 5 hits, 6 words, then the region boss with its words but at most 8 hits (`BOSS_FIGHTS`). Breaks after the first start with 3 calm seconds, and a beaten boss grants the arena shield. Beating the last boss ends the try                                                |
| Sun | Wielka fala / Велика хвиля | 3 minutes | Plain arena waves                                                                                                                                                                                                                                                                                                                                                         |

- The run plan has the length as its time limit, so the HUD bar and count show the time left of the whole run, "2:41". On phones the count shows also below 400 px. Losing all hearts ends a try early.
- Words, waves, calm seconds and mid-wave events follow the endless waves of the key set, see [Arena](#arena).

Medal (`dailyMedal` in `src/arena/formats.ts`):

- The lower of two grades, as in the arena. Time: 1, 2 or 3 minutes survived (`MINUTE_GRADES`), and a try that ended by time or by beating the last boss gets the full grade. Tuesday grades the pace instead: 10, 15 or 20 words per minute (`PACE_GRADES`), the speed the HUD shows. Accuracy: the star thresholds on the rounded percent, 85, 93 and 97.

Stamps and chests (`withDailyTry` in `src/arena/daily.ts`):

- The first finished try of a day puts a stamp on the week card. There is no daily streak and missing a day never takes anything away.
- 3 stamps in a week open a chest with 40 coins and 5 stamps another with 100 (`WEEK_CHESTS`). Each chest pays once per week.
- "Tygodnie z rzędu" / "Тижнів поспіль" counts weeks in a row with at least 3 stamps. It grows when the third stamp of a week comes, starting again at 1 when last week had fewer. The card shows it while this or last week has 3 stamps, and hides it at 0.
- The family chest, "Rodzinna skrzynia" / "Сімейна скриня": when all the profiles on the device together have 10 stamps in a week, every profile that stamped that week gets 30 coins, once per week (`FAMILY_CHEST`). A profile gets it when it opens the arena screen or finishes a daily, whichever comes first.

Coins and XP (`dailyPayout` in `src/arena/economy.ts`):

- The run pays as in the arena: half a coin per word times the Normalnie coin factor, chests and thieves as in a level, and a coin hat scales them. XP is word XP times 0.4.
- Flat amounts on top, never scaled by a hat: 20 for the stamp, 10, 20 or 40 for a bronze, silver or gold medal, the chests and the family chest. A better medal later that day pays only the difference, so a medal never pays twice.
- XP, score, letters freed, key statistics, counters and trophies are added after every finished try, as after an arena run.

Daily card (`src/ui/arena/DailyCard.ts`), first on the arena screen:

- A calendar icon on bigger screens, "Wyzwanie dnia: Mgła" / "Виклик дня: Туман", the rule of the format, the week as 7 stamp circles under "Pn Wt Śr Cz Pt So Nd" / "Пн Вт Ср Чт Пт Сб Нд": gold with a check when stamped, an accent ring for today, dim for the days ahead. The circles are 36 px, 32 px on phones.
- A row with the length "3 minuty" / "3 хвилини" or "2 minuty" / "2 хвилини", the key set, "Próby: 1 z 3" / "Спроби: 1 з 3" (tries used) and "Tygodnie z rzędu: 2" / "Тижнів поспіль: 2".
- "Dziś: Ola złoto, Staś brąz" / "Сьогодні: Оля золото, Стась бронза": every profile on the device that finished a try today with its best medal, hidden when nobody did.
- With two profiles or more, a thin bar "Rodzinna skrzynia" / "Сімейна скриня" with "6 z 10" / "6 з 10", green once this profile's family chest of the week is open.
- Play, or after the third try a quiet note "Nowe wyzwanie jutro" / "Новий виклик завтра". There is no countdown.
- On phones the card is a compact grid: the stamps sit next to Play. In landscape it is one row and the device board and the family bar hide.

Result card (`src/ui/arena/DailyResult.ts`), the arena result card with a daily variant:

- "Najlepsza próba dnia!" / "Найкраща спроба дня!" when the try is the best of the day and has a medal, with confetti. Otherwise "Dobra robota!" / "Гарна робота!" with a medal and "Mrok był szybszy" / "Морок був швидший" without one.
- The medal with the next goal: "Srebro. Złoto: 3 minuty i 97%" / "Срібло. Золото: 3 хвилини і 97%", or on Tuesday "Brąz. Srebro: 15 słów na minutę i 93%" / "Бронза. Срібло: 15 слів за хвилину і 93%".
- Tiles for words, the time survived as "2:41" (the pace on Tuesday) and accuracy, the XP bar, then the coins: "Za słowa" / "За слова", "Pieczątka" / "Печатка", "Medal" / "Медаль", "Skrzynia" / "Скриня" and "Rodzinna skrzynia" / "Сімейна скриня", each shown when it paid.
- "Jeszcze raz" / "Ще раз" as the main button while tries remain, with "Arena" next to it. After the third try "Nowe wyzwanie jutro" / "Новий виклик завтра" stands in its place and "Arena" is the main button.

Signals:

- The map arena button shows a small green dot, without the pulse of the shop dot, while the arena is open and today's daily has no finished try. Its label adds "Wyzwanie dnia czeka" / "Виклик дня чекає".
- The profile card shows a 22 px medal in its top right corner once today's daily is done, with "Wyzwanie dnia: Złoto" / "Виклик дня: Золото" as its label.

Record (`DailyRecord` in `src/arena/record.ts`):

```ts
interface DailyRecord {
  date: string; // local day of the last finished try
  keySet: string; // the key set of that day
  tries: number; // finished tries that day
  best?: { score: number; accuracy: number; seconds: number; medal: Medal };
  stamps: string[]; // stamped days of this and last week
  chests: string[]; // chests paid in this and last week: "2026-W42/3", "2026-W42/5", "2026-W42/family"
  weekStreak: number;
  bestWeekStreak: number;
  totalStamps: number;
}
```

- A new day starts with 3 tries and no best try. Only finished tries write the record, so it always has the key set of its day.

## Placement test

Owners: `src/arena/placement.ts` (stages, words, pass rules), `src/arena/placementPlan.ts`, `src/arena/timeAttack.ts` (the time attack phase, shared with the daily challenge), `src/arena/placementProgress.ts`, `src/game/PhaseMeter.ts`, `src/game/mechanics/PlacementStages.ts`, `src/app/PlacementFlow.ts`, `src/ui/placement` (`PlacementIntro.ts`, `PlacementResult.ts`, `FingersCard.ts`), `src/ui/placement.css`, copy in `src/i18n/features/placement.ts`.

The placement test, "Sprawdzian" / "Перевірка", lets a child who can already type skip the regions they know. It is short, it uses real words only, and it can only move a child forward.

Stages:

- One stage per region of the profile's word language: five for Polish words, four for English words. Each stage lasts 12 seconds (`STAGE_SECONDS`).
- Stage `k` uses the allowed keys of the boss level of region `k`, so every key up to and including that region. Its focus keys are the keys of region `k`.
- The board keeps up to 3 words (`STAGE_BOARD_SIZE`, `boardSize` in the run plan), and as soon as a word leaves the board the next one comes, like a time attack. When the child is slower, a new word still comes after the stage's gap, at most 20 words a stage (`STAGE_WORD_LIMIT`). The pace is steady, with no ramp: the speed and spawn gap the last practice level of the region ends with (`stagePracticeTempo`), a gap of 4.2 seconds in Polana down to 1.9 in Wyspa Ogonków. So a child at the mastery pace meets about 6 words in Polana and a fast typist more than 10. Words that are still on the board when a stage ends stay and keep walking into the next stage.
- No hearts are lost (`hitCost: 'combo'` in the run plan). An enemy that reaches the hero vanishes, counts once for the stage and breaks the combo. It is not a mistake.
- Every mechanic is off: the stages are `test` phases, where special enemies, events, surges, bombers, twins, power words and merging never run and pets rest. Each stage starts with a chime and the banner "Etap 2: Las" / "Етап 2: Ліс".

Words:

- Only real words from `src/course/wordLists.ts`, never generated strings (`realWordsOnly` in the word rules). A word fits a stage when all its letters are in the stage's keys.
- Words with a key of the stage's own region come first, picked like other real words: weak keys weigh more and words that are easy to type come more often, see [Level flow](#level-flow). A stage without such a word takes any fitting word.
- Words have 3 to 5 letters. A stage with fewer than 12 fitting words of that length widens to 2 to 6 letters (`MIN_STAGE_WORDS`). Today no stage needs it:

| Stage | Polish words of 3 to 5 letters | with a key of the region | English words of 3 to 5 letters | with a key of the region |
| ----- | ------------------------------ | ------------------------ | ------------------------------- | ------------------------ |
| 1     | 20                             | 20                       | 14                              | 14                       |
| 2     | 58                             | 38                       | 50                              | 36                       |
| 3     | 99                             | 41                       | 84                              | 34                       |
| 4     | 147                            | 48                       | 128                             | 44                       |
| 5     | 191                            | 44                       |                                 |                          |

Pass rules (`stagePassed`). The game keeps a record per phase: correct keys, mistakes, enemies that reached the hero, and the time between correct keys (`PhaseMeter`). A key's time runs from the correct key before it, or from the moment a word lands on an empty board, so waiting for the next word never counts. A stage passes when all of these hold:

- at least one correct key;
- accuracy of at least 95% on the rounded percent, the number the cards show;
- the mean time between correct keys is at most 900 ms, the mastery target, or 1400 ms in the Wyspa Ogonków stage, which adds the Polish letters (see [Key mastery](#key-mastery));
- at most one enemy reached the hero.

The test stops at the first failed stage, so a beginner is done after 12 seconds. The result is the last passed region, or none.

What a placement opens (`recordPlacement`, `src/course/course.ts`):

- A passed placement writes `profile.arena.placement = { regionId, date }` with the last passed region. A retake only moves a child forward: a lower result keeps the old placement and its date.
- Every level of the placed regions opens, and the first level of the next region too. The current level is that first level, for example `las-1` after a placement in Polana. After a placement in the last region every level is open and the current level is the first level of that region without a star, `wyspa-1` for Polish words and `jaskinia-1` for English words. Wins open the usual window from there.
- A placement in a region the word language does not have counts as the last region before it, so Wyspa Ogonków counts as Jaskinia for English words.
- Stars, trophies and boss stories still need real play. The skipped levels have no stars, and the boss scenes still play before each boss.
- The arena gets a key set for every placed region (see [Arena](#arena)).
- The keystrokes of the test go into the key statistics like those of a level, so weak keys get more weight later.
- The test pays like an arena run on Normalnie: XP at the Normalnie factor (`PLACEMENT_XP_FACTOR`), coins per word at the Normalnie rate (`PLACEMENT_COINS_PER_WORD`), boosted by the equipped items, and the score, the letters freed and the counters grow as in any run (`withArenaRun`). It gives no stars and no medal.

Map:

- A level a placement covered that has no star is skipped: it shows its normal colour face with a dashed border and a dashed ring around it, no stars and no pulse. It stays open, so a child can go back to it.

Screens:

- Create form: "Zacznij naukę" / "Почни навчання" creates the profile as before, and "Umiem już pisać" / "Я вже вмію друкувати" next to it creates the profile and opens the test. On narrow phones the two sit side by side and the cancel button moves to the top right corner of the panel.
- Arena: the "Sprawdzian" / "Перевірка" tab of the [Arena](#arena) shows the stages and starts the test with Play, always, so a child can retake it any time.
- Intro card, in the learn card panel, only on the way from the create form: "Sprawdzian" / "Перевірка", a chip per stage with the region names, "Pisz słowa, które widzisz. Każdy etap trwa 12 sekund." / "Друкуй слова, які бачиш. Кожен етап триває 12 секунд.", the home row hint and the Start button "Zaczynamy" / "Починаємо". Enter starts, Escape and the ✕ button "Zamknij" / "Закрити" close the card and stay on the profile screen.
- During the test the HUD progress label shows "Etap 2 z 5" / "Етап 2 з 5", also on phones, and the bar is a time bar that empties over the 12 seconds, with the seconds left as the count. The HUD has no hearts.
- Result card, in the result panel: the headline "Zaczynasz tutaj: Las" / "Починаєш тут: Ліс" with the region after the profile's placement, which an earlier and better test may have set (the last region after a full pass), or "Zaczniemy od początku. Tak będzie najlepiej!" / "Почнемо з початку. Так буде найкраще!" without a placement. A row of region chips, lit for each passed stage and dim for the others, one hint line, the accuracy tile and the speed tile in words per minute from the typing time of the test. Buttons: "Na mapę" / "На мапу", the main button, and "Arena" / "Арена" when the profile has a placement. Confetti and a sparkle play after a placement.
- Fingers card, once per profile after the first placement (stored as `placement-fingers` in the seen stories): "Palce na start" / "Пальці на старт", a small keyboard with every skipped key in its finger colour and the Polish letters as marks on their base keys, the hands with those fingers lit, "Tak palce sięgają do pominiętych klawiszy. Każdy kolor to jeden palec." / "Так пальці дістають до пропущених клавіш. Кожен колір означає один палець." and the Start button. Start, Enter, Escape and ✕ all continue to where the result card was left for, the map or the arena. Skipped keys are the keys of the learn levels the placement covered that have no star.
- All three cards ignore Enter and Escape for the first 600 ms (`KEY_READY_MS`). On the result card Enter and Escape go to the map. On phones they fit without scrolling in portrait and landscape: in landscape the fingers card puts the keyboard next to the hands.

## Item powers

Owners: `src/game/mechanics/ItemPowers.ts`, `src/game/mechanics/itemPowers` (`Pet.ts` for the pet in the scene, one file per power in `pet` and `hat`), `src/course/powers.ts`, card lines and callouts in `src/i18n/features/shop.ts`.

Every pet and every hat has exactly one power, as a kind and a strength in the catalogue, see [Shop](#shop). Skins have none.

- Strength units (`STRENGTH_UNITS`): a count per level from 1 to 3, seconds, a share where `0.2` means 20%, or `1` for a power that is simply on.
- A count per level starts again at every arena wave.
- Limits: XP boosts at most 10% and coin boosts at most 25% (`MAX_BOOST` in `src/course/powers.ts`, also checked by `src/course/shop.test.ts`). No power raises accuracy or stars and no power types for the player. A power that keeps a heart still counts the hit as a mistake and breaks the combo.
- Each power shows when it works: a callout in the item's colour, and for pets a pounce with a bolt in the pet's colour.
- The card line uses "Raz" / "Раз", "Dwa razy" / "Двічі" and "Trzy razy" / "Тричі" for the count, for example "Dwa razy na poziom łapie nietoperza" / "Двічі за рівень ловить кажана".

The pet:

- With a pet equipped, it floats next to the hero's shoulder, follows with a short lag, bobs and turns with the hero.
- A catch: the pet pounces, a bolt in the pet's colour flies to the enemy, and the enemy freezes for 0.14 seconds (`ZAP_DELAY`). Then it shatters and scores its normal word points, with no XP and no coins, and the callout shows. Special enemies also play their own pop. If the enemy was typed before the bolt lands, the catch is not used up.
- The pet never catches the boss or a word the player has started typing.

| Pet power      | Callout (pl / uk)                     | Rule                                                                                                                                                                                               |
| -------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zap`          | Pomocnik! / Помічник!                 | With the combo at 5 or more outside the warm up, it catches the enemy nearest to the hero.                                                                                                         |
| `catchBat`     | Nietoperz złapany! / Кажана спіймано! | Catches a bat 1 second after it shows (`NOTICE_SECONDS`), while it still has its bomb.                                                                                                             |
| `catchGhost`   | Duch przegoniony! / Привида прогнано! | Catches a ghost 1 second after it shows.                                                                                                                                                           |
| `catchThief`   | Złodziej złapany! / Злодія спіймано!  | Catches a running thief 1.6 units before it would steal (`THIEF_CATCH_LEAD`), so it steals nothing.                                                                                                |
| `popBalloon`   | Balonik złapany! / Кульку спіймано!   | Pops a balloon within 1 unit of floating away (`BALLOON_CATCH_MARGIN`). It scores normal word points, not the double points of a typed balloon.                                                    |
| `catchBomber`  | Lont zgaszony! / Ґніт погашено!       | Catches a bomber 1 second after it shows, with no blast.                                                                                                                                           |
| `doubleChest`  | Podwójny skarb! / Подвійний скарб!    | A typed treasure chest pays its 15 coins once more.                                                                                                                                                |
| `restoreHeart` | Nowe serce! / Нове серце!             | At combo 15 or more, when a heart is missing, it gives one back.                                                                                                                                   |
| `freezeBoard`  | Zamrożone! / Заморожено!              | Once per level, when an enemy that can cost a heart comes within 4 units of the hero (`DANGER_DISTANCE`), every enemy, the boss included, freezes for the strength in seconds. Not in the warm up. |
| `stopNear`     | Stop! / Стоп!                         | Each time the combo reaches exactly 10, the enemies within 5 units (`NEAR_RADIUS`) that can cost a heart freeze for the strength in seconds.                                                       |

Enemies that can cost a heart are all but power words, thieves and balloons.

| Hat power     | Callout (pl / uk)                      | Rule                                                                                                                                                                                                                                                   |
| ------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `coins`       | Monety +20% / Монети +20%              | The whole coin payout of the run grows by the share, rounded down: words, chests, thieves, the bonus for winning and the stars, and in the arena the medals and the new best wave. The callout shows when the level starts.                            |
| `xp`          | XP +10% / XP +10%                      | The XP of the run grows by the share, rounded. The pop over each word still shows the word's own XP. The callout shows when the level starts.                                                                                                          |
| `solidGhosts` | Duch nie zniknie! / Привид не зникне!  | Ghosts stay solid and their labels stay visible. The callout shows for the first ghost.                                                                                                                                                                |
| `longFreeze`  | Mocny mróz! / Міцний мороз!            | The Mróz power word freezes for 3 × (1 + share) seconds.                                                                                                                                                                                               |
| `bossGuard`   | Tarcza na bossa! / Щит на боса!        | At the start of each boss fight, also arena boss waves, the hero gets guards up to the strength, shown as a bubble in the hat's colour. A guard keeps the heart of the next hit, but the hit counts as a mistake. Guards go before power word shields. |
| `defuse`      | Bomba rozbrojona! / Бомбу знешкоджено! | A bomber 0.4 units before it reaches the hero (`DEFUSE_DISTANCE`) fizzles out in smoke: no blast, no knockback and no lost heart, but it counts as a mistake.                                                                                          |
| `feverSlip`   | Szał trwa! / Шал триває!               | Up to the strength per level, a mistake during the fever keeps the fever. It still counts as a mistake and breaks the combo.                                                                                                                           |

Game hooks used by the powers are listed in `src/game/mechanics/README.md`: `boostRewards`, `restoreLife`, `guardNextHit` with `guards`, and `stats.keepFeverOnSlips`.

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
- Each profile is a card with the rendered portrait under a spotlight, a small tag in the top left corner with the language of its words ("Słowa po polsku" / "Слова польською" or "Słowa po angielsku" / "Слова англійською"), the name, the level, the rank, a thin XP bar, pills for stars and coins, and the medal of today's [Daily challenge](#daily-challenge) once it is done. The tag hides on phones.
- The selected card lifts, glows and shows the hero in 3D with the equipped hat and pet, swaying slowly. It uses the same outfit view as the shop (`src/ui/portraits/OutfitView.ts`). The play panel opens right under the row of the selected card, and cards from later rows move below it. The panel holds only the name, the line "Słowa po polsku" / "Слова польською" or "Słowa po angielsku" / "Слова англійською" under it, and the big Play button. Enter plays.
- The narrow dashed new profile card opens the create panel, which takes the place of the cards until the profile is created or the panel is cancelled: a large live preview of the chosen character that switches with every pick, the name field, the word language chips "Język słów" / "Мова слів" with "Polski" / "Польська" and "Angielski" / "Англійська", the 18 characters, the main button "Zacznij naukę" / "Почни навчання" and next to it "Umiem już pisać" / "Я вже вмію друкувати", which also creates the profile and opens the [Placement test](#placement-test). On narrow phones the cancel button moves to the top right corner of the panel.
- With four profiles the cards fit in one row, and the screen fits without scrolling from 1280 by 720 up. Screens up to 900 px tall get a smaller logo and tighter spacing, and screens up to 800 px tall also smaller cards, a smaller create panel and 9 characters per row.
- Long names and rank names end with an ellipsis on the cards.
- The top right corner holds the interface language switch "PL" / "UA" and a round gear button that opens the [Settings](#settings).
- The word language belongs to a profile for good: it is chosen when the profile is created, and a child who wants the other words makes another profile. The shop, the placement test and the deletion live inside the profile: the shop and the [Arena](#arena) in the map header, the delete button in the [Settings](#settings) opened from the map.

Map:

- The map is one tall scene. The regions are stacked from top to bottom as bands that blend into each other: meadow, forest, mountains, cave and island. Locked bands are dimmed.
- The map is compact: a band of 16 levels fits in a 1280 by 720 window, and the whole Polish course is about a quarter of the height it had with one stop per row (`JOURNEY_SPACING` in `src/ui/map/journeyLayout.ts`).
- One winding road runs in a snake, two stops per row: each row runs to the other side, and the road turns around in a wide curve to the next row. The rows wave a little. The walked part, up to the stop of the last open level, is gold.
- A learn level is a smaller satellite of the practice level of the same key, joined to it by a short dashed link that turns gold once the learn level has a star (`stopRoles`). It hangs on the side the row comes from, so the road reads learn, then practice. Review levels and bosses are full stops on the road, bosses bigger.
- The row of the current level gets extra room above it for the hero.
- Each band starts with a sign: the chapter number with the stars earned out of the total and the mastery meter in one row, the region name, and a short mood line (`src/i18n/features/worldMap.ts`). Phones show the badges under the name and no mood line. The sign sits on the side away from where the road enters the band.
- Levels are round badges with their focus keys. Learn levels carry a ✨ badge and review levels a 👑 badge for their mini boss, and the title names the kind and the keys, for example "Trening D" / "Тренування D" (`src/ui/levelKind.ts`). Unlocked learn, practice and review levels show the key dots under the keys, see [Key mastery](#key-mastery). Bosses have a crown. Locked levels show a lock, and their title says what to win first: "Wygraj poziomy przed powtórką" / "Виграй рівні перед повторенням" on a review whose practice levels are not all won, "Wygraj powtórkę przed bossem" / "Виграй повторення перед босом" on a boss whose review is not won, and "Najpierw ukończ wcześniejsze poziomy" / "Спочатку пройди попередні рівні" on any other level outside the open window (`lockReason` in `src/course/course.ts`). Levels with stars glow in the region colour and show their stars on a pill across their lower edge. The open levels pulse. Levels a placement skipped have a dashed ring, see [Placement test](#placement-test). The current level also has a Play tag, and the hero stands on it.
- The hero on the current level wears the equipped hat and has the equipped pet in front of its hip, a little larger than in the game. The hero is framed like the plain portrait, so it keeps the same size, and a hat rises above the marker. It is a rendered image, not a live 3D view, so the map stays light on phones (`src/ui/OutfitAvatar.ts`, `src/ui/portraits/OutfitStudio.ts`). Until the image is ready, and when it cannot be rendered, the plain portrait shows. Each outfit is rendered once per session and kept in memory, so reopening the map shows it at once. With nothing equipped the hero is the plain portrait.
- The header stays at the top: the avatar with the level number, the name, the rank and a thin XP bar, then stars, coins, the arena button, the shop button, the settings gear and the sound toggle. A tap on the avatar goes back to the profiles. The settings gear has the label "Ustawienia" / "Налаштування" only on screens wider than 1100 px, so the player name keeps its room on tablets. The shop button has the bag and the label "Sklep" / "Крамниця", only the bag on phones, and the green dot when something can be bought or claimed.
- On open the map scrolls smoothly to the current level, or to the last open level when all levels have stars. Levels pop in as they scroll into view, at most 12 steps of 70 ms apart. With reduced motion the scroll is instant and nothing pops in.
- Tab moves through the levels in course order, learn satellites included.
- The silhouettes of each band move at different speeds while scrolling, except in the low quality preset.

## Keyboard control

Owners: `onShortcutKeys` in `src/ui/overlay.ts`, `src/ui/shortcutHint.ts` and the screens below.

A typing game never needs the mouse, so every menu works with the keyboard alone.

- Shortcut keys listen while their screen or card is shown and stop when it closes.
- They do nothing while an overlay covers the screen, while Ctrl, Alt or Meta is held, or while a text field has focus. Escape still works in a text field.
- Enter on a focused button presses that button instead. Held arrow keys repeat, other keys do not.

| Screen      | Keys                                                                                                                                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profiles    | Left and Right pick the previous or next profile and wrap around, Enter plays, Escape closes the create panel                                                                                                               |
| Map         | Enter plays the current level, or the last open level when all have stars. The arrow keys move the focus along the road through the open levels, Right and Down forward, Left and Up back. Escape goes back to the profiles |
| Arena       | Left and Right change the key set, Up picks a harder and Down an easier open level, Enter plays, Escape goes back to the map                                                                                                |
| Shop        | Escape goes back to where the shop was opened from                                                                                                                                                                          |
| Story card  | Enter or Space shows the next line                                                                                                                                                                                          |
| Learn card  | Enter starts the level and Escape goes back to the map, both ignored for the first 600 ms                                                                                                                                   |
| Placement   | Intro and fingers card: Enter starts and Escape closes. Result card: Enter and Escape go to the map. All ignored for the first 600 ms                                                                                       |
| Level       | Escape pauses                                                                                                                                                                                                               |
| Pause card  | Enter or Escape resumes                                                                                                                                                                                                     |
| Settings    | Escape goes back to where the settings were opened from, and from the pause card it never resumes the level                                                                                                                 |
| Result card | Enter presses the main button, ignored for the first 600 ms                                                                                                                                                                 |

- Key hints: the Play button of the profiles, the Play tag on the map, the Play button of the arena, the learn card, the placement cards, the pause card and the result cards show ⏎. The back buttons of the shop and the arena show Esc.
- Hints hide on touch screens without a mouse (`--touch-only` in `src/ui/screenSizes.css`) and on phones.

## Audio

Owners: `src/audio/Sfx.ts`, `src/audio/Music.ts`, `src/audio/music/themes.ts`.

- All sound is generated live with Web Audio. There are no audio files.
- Audio unlocks when the player presses Play on the profile screen, because browsers need a user gesture (`src/app/App.ts`).
- Music has one arrangement per theme, built from bass, drum, pad, motif, noise bed and sporadic layers. It plays during levels and stops on the map.
- The mood follows the phase: boss phases use the boss mood, everything else the calm mood. So learn, practice and review levels are calm, boss levels and arena boss waves use the boss mood: tempo × 1.15, the boss mode, and extra kick, tom and ostinato layers.
- Up to 8 music voices play at once. Tracks crossfade over 1.5 seconds.
- Intensity runs from 0 to 1. It follows `combo / 20` and is 1 during fever (`src/app/App.ts`). Higher intensity brightens the mix and brings in a sparkle layer.
- Sound effects: hit (pitch climbs a pentatonic scale with the combo), mistake, word, callout, fever, life lost, boss hit, level complete and level failed.
- One sound toggle, in the HUD and on the map, switches music and effects together (`src/ui/SoundToggle.ts`). The [Settings](#settings) screen switches effects and music one by one.

## Settings

Owners: `src/ui/SettingsScreen.ts`, `src/ui/settingsControls.ts`, `src/ui/settingsParts.ts`, `src/ui/settings.css`, copy in `src/i18n/features/settings.ts`. Progress backup: `src/ui/backupControls.ts`, `src/app/progressBackup.ts`, `src/profiles/progressFile.ts`, copy in `src/i18n/features/progressBackup.ts`.

The settings screen "Ustawienia" / "Налаштування" opens from three places:

- the gear in the map header, next to the sound toggle,
- the round gear next to the language switch on the profile screen,
- the "Ustawienia" / "Налаштування" button on the pause card. There it opens on its own layer over the paused level, which stays paused.

It reuses the shop header: the back button "Wróć" / "Назад" and the title, without coins. The back button and Escape return to where the screen was opened from: the map, the profile screen or the pause card. Escape on the settings screen never reaches the level underneath, so it does not resume the game.

Each setting is a row with a label, an optional hint, and segmented chips or a switch. Settings belong to the device and are shared by all profiles.

When the screen opens from the map it ends with the row "Profil" / "Профіль": the hint names the profile, "Ola. Usunięcie kasuje cały postęp na tym urządzeniu" / "Ola. Видалення стирає весь поступ на цьому пристрої", and the quiet red button "Usuń profil" / "Видалити профіль" asks "Na pewno usunąć ten profil?" / "Точно видалити цей профіль?" and then removes the profile and returns to the profile screen. The row is absent when the settings open from the profile screen or the pause card.

When the screen opens from the map or the profile screen, the row "Kopia postępu" / "Копія поступу" comes right before the profile row, with the hint "Postęp wszystkich profili w jednym pliku. Profile z pliku zastąpią te same profile tutaj" / "Поступ усіх профілів в одному файлі. Профілі з файлу замінять такі самі профілі тут" and two quiet buttons. The row is absent on the pause card.

- "Zapisz do pliku" / "Зберегти у файл" downloads every profile as `literkowo-<day>.json`, for example `literkowo-2026-10-17.json` with the local day. The file holds the same JSON array as `literkowo.profiles`, taken from the profiles in memory, so it also works when localStorage is blocked.
- "Wczytaj z pliku" / "Завантажити з файлу" opens the file picker for JSON. The file goes through the same parsing as stored profiles (`parseProfiles`), so a file from an older version is migrated. A file larger than 5 MB, one that is not a list, an empty list, or a list with an entry that cannot be read is rejected: nothing changes and the notice says "Tego pliku nie da się wczytać" / "Цей файл не вдається завантажити".
- A good file is merged by profile id. A profile from the file replaces the one with the same id and keeps its place, new profiles come after the ones already on the device, and no profile is removed. The result is saved, the app returns to the profile screen and the notice says "Postęp wczytany" / "Поступ завантажено". The notice is the same pill as the one for progress that cannot be saved, see [Profiles](#profiles).

| Setting                                          | Choices                      | Storage key                  | Applies             |
| ------------------------------------------------ | ---------------------------- | ---------------------------- | ------------------- |
| "Jakość grafiki" / "Якість графіки"              | Auto, Wysoka, Średnia, Niska | `literkowo.quality`          | from the next level |
| "Efekty dźwiękowe" / "Звукові ефекти"            | switch, on by default        | `literkowo.sound`            | at once             |
| "Muzyka" / "Музика"                              | switch, on by default        | `literkowo.music`            | at once             |
| "Język gry" / "Мова гри"                         | Polski, Українська           | `literkowo.uiLanguage`       | at once             |
| "Klawiatura na ekranie" / "Клавіатура на екрані" | Auto, Zawsze, Nigdy          | `literkowo.onScreenKeyboard` | from the next level |
| "Mniej animacji" / "Менше анімації"              | Auto, Zawsze                 | `literkowo.reducedMotion`    | at once             |

- Graphics quality: Auto picks a preset for the device (`src/game/quality.ts`). The hint says "Nowa jakość zadziała od następnego poziomu" / "Нова якість діятиме з наступного рівня".
- Sound effects and music switch one by one. The sound toggle on the map and in the HUD still switches both together.
- Interface language: the screen redraws in the chosen language right away. Language names are written in their own language.
- On screen keyboard, with the hint "Na telefonie. Zadziała od następnego poziomu" / "На телефоні. Діятиме з наступного рівня": see Touch input in [Mobile and tablets](#mobile-and-tablets).
- Reduced motion, with the hint "Auto słucha ustawień urządzenia" / "Авто враховує налаштування пристрою": Auto follows the system setting, Zawsze turns reduced motion on whatever the system says.
- Phones: one column. Chip rows put the chips under the label at full width, switch rows keep the switch next to the label.

## Interface languages

Owners: `src/i18n/languages.ts`, `src/i18n/translations.ts`, `src/i18n/i18n.ts`.

- Today the interface is in Polish (default) and Ukrainian. The language switch is on the profile screen and on the [Settings](#settings) screen. The choice is saved under `literkowo.uiLanguage`. A saved value that is not in the list falls back to Polish.
- `UI_LANGUAGES` in `src/i18n/languages.ts` is the one list of interface languages, with the short labels of the profile screen switch. Both switches, the saved choice and the structured data of the page are built from it.
- Interface language and word language are separate settings. The word language is fixed per profile at creation.
- Region names and story lines carry every interface language next to the data (`src/course/catalog.ts`, `src/story/story.ts`).
- A new interface language needs a new entry in `UI_LANGUAGES` and its label, then the type checker points to every text that needs it: `src/i18n/translations.ts`, the feature texts, and the region and story data.

## Mobile and tablets

Owners: `src/styles.css`, `src/ui/screenSizes.css`, `src/ui/TouchTyping.ts`, `src/ui/keyboardFit.ts`, `src/ui/KeyboardHint.ts`, `src/ui/keyboardLayout.ts`, `src/ui/stageInsets.ts`, `src/ui/formFactor.ts`, `src/ui/RotateHint.ts`, `src/game/board.ts`, `vite.config.ts`.

The course still assumes a physical keyboard. A tablet with a Bluetooth keyboard is the main target. A phone plays the game with a built-in keyboard on the screen.

Layout:

- Phones are screens up to 600 px wide or up to 480 px tall. Tablets are up to 1024 px wide. The screen size breakpoints are named once in `src/ui/screenSizes.css` as custom media (`postcss-custom-media`), and `src/ui/formFactor.ts` mirrors the phone query for code.
- On tablets the HUD shows score, combo, hearts and progress.
- On phones the HUD is one translucent strip 44 px tall at the top: avatar with the player level, score, combo, hearts, and small buttons for the native keyboard, pause and sound. The progress bar is a 3 px line along the bottom edge of the strip. The phase name is hidden, except in a timed phase or run such as the placement test and the daily challenge, the count shows when the screen is at least 400 px wide or the progress is timed, and the XP of the run shows next to the score when it is wider than 600 px. Buttons in the strip are 36 px wide and as tall as the strip.
- The keyboard hint is smaller on tablets in portrait.
- On a phone the learn card and the result card fit without scrolling, at 390 by 660 px in portrait and 750 by 342 px in landscape, also with landscape safe area insets of 47 px at the sides and 21 px at the bottom.
- In portrait both cards use smaller keycaps, a smaller hands diagram and full width buttons. Each result shows its label and value on one line. When the rank, the XP and the coins do not fit in one row of the result, the XP and the coins move to a second row.
- In landscape the learn card puts the hands diagram next to the keycaps. The result card puts the stars next to the title, the four results in one row, the XP bar in one row with the level and the rewards, and the buttons side by side. It hides the stars hint and shows the level up banner on one line. Overlays keep an 8 px margin above and below. The pause card puts the key heatmap next to the title and the resume button.
- Menus and overlays fit without a page scroll at 1280 by 720 and larger, at 1024 by 768, on a tablet in portrait and on phones in both orientations, also after a level up with every treasure chip. Only the journey map, the shop list and the trophy list scroll. On screens up to 900 px tall the result card is wider, with the four results in one row, the buttons side by side and smaller chips. On screens up to 800 px tall the learn card and the pause card are smaller too.
- On phones the profile screen shows a smaller logo and no tagline. The profile cards sit three in a row in portrait and five in a row in landscape, with the level and the stars under the name. The play panel keeps the name, the word language line and Play in one row. In landscape the section title is hidden, and the logo hides while the create panel is open.
- Touch targets are at least 44 px on touch screens, except the 36 px wide HUD buttons on phones. Hover effects apply only on devices that can hover.
- The app is `100dvh` tall. The HUD, the keyboard hint, the map header and overlays stay inside the safe area insets.
- The camera keeps a horizontal field of view of at least 62 degrees, so the whole spawn arc stays in frame on narrow and portrait screens. The vertical field of view grows when needed and never drops below 42 degrees (`src/game/board.ts`).
- On phones the camera frames the arena in the band of the stage that the HUD and the native keyboard do not cover, with a 16 px gutter at the sides so whole enemies stay in frame. The view is offset so the arena centre sits in the middle of that band, and the band keeps at least 40% of the stage (`frameBoard`). Word labels stay below the HUD by the label height and above the covered bottom.

Touch input:

- With a coarse pointer, a level adds a hidden input to the stage. It has `enterkeyhint="done"` and sits outside any form.
- Characters from its `input` events go to `Game.typeCharacter`, the same path that `keydown` uses. During a composition only the new characters count. Backspace does nothing.
- Phones with a coarse pointer type on the built-in keyboard by default. The on screen keyboard setting changes that, see [Settings](#settings): Auto keeps this rule, Zawsze shows the built-in keyboard on every phone sized screen, also without a coarse pointer, and Nigdy types on the native keyboard, which a tap on the stage or the HUD keyboard button opens, as on tablets. The choice is read when a level starts (`usesBuiltInKeyboard` in `src/ui/formFactor.ts`). The built-in keyboard is a compact QWERTY with three rows (`qwertyuiop`, `asdfghjkl;`, `zxcvbnm,.` and a right Alt), lower case labels, fixed at the bottom above the safe area. Keys are 32 to 46 px tall, 40 px at most in landscape, and the keyboard takes at most 40% of the screen height, or 34% in landscape, unless that would make the keys shorter than 32 px. The stage sits above it. The next expected key glows as on the keyboard hint.
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
- Reduced motion means the system asks for it or the "Mniej animacji" / "Менше анімації" setting is on Zawsze (`prefersReducedMotion` in `src/ui/motionPreference.ts`). When it is forced, the page gets the `data-reduced-motion` attribute and every CSS animation and transition is cut to 1 ms, as with the system setting.

Install and offline:

- `vite-plugin-pwa` writes the web manifest: name Literkowo, the site description, the categories education, games and kids, a wide screenshot, standalone display, theme colour `#070b1a`, background `#050816`, start URL and scope from the base path.
- The service worker precaches the build and caches files under `models/` at runtime, network first. Online it always asks the site, through the browser cache, so a model or texture replaced in place reaches players on the next load. Offline, or when the site does not answer within 4 seconds, it serves the cached copy. Only responses with status 200 are cached, at most 64 files. The cache name stays `literkowo-models`, so installed apps reuse their cache instead of leaving an old one behind. It registers only in production builds (`src/app/serviceWorker.ts`).
- The precache takes scripts, styles, HTML, SVG, PNG and fonts only. Navigation requests for a path with a file extension skip the app shell fallback (`FILE_REQUEST` in `vite.config.ts`), so `robots.txt`, `sitemap.xml`, `llms.txt` and the JPEG images always come fresh from the network.
- Icons come from `public/icon.svg` and `public/icon-maskable.svg` through `npm run icons`.

## Search and sharing

Owners: `src/seo/site.ts` (every string, url and image), `src/seo/vitePlugin.ts`, `src/seo/headTags.ts`, `src/seo/structuredData.ts`, `src/seo/fallback.ts`, `src/seo/sitemap.ts`, `public/robots.txt`, `public/llms.txt`, `public/llms-full.txt`, `scripts/og.mjs`.

- The page has one URL, `https://veelenga.github.io/literkowo/`, in Polish (`lang="pl"`). The interface language switches inside the page, so there are no `hreflang` links. Open Graph names `pl_PL` as the locale and `uk_UA` and `en_US` as alternates.
- A Vite plugin adds to the head: the title "Literkowo: gra do nauki pisania na klawiaturze dla dzieci", the Polish description, `robots` with index and follow, the canonical link, Open Graph and Twitter card tags with `og.jpg` (1200 by 630) first and `og-square.jpg` (1200 by 1200), and structured data typed `VideoGame` and `WebApplication`: free, for players from 9, interface in Polish and Ukrainian.
- The search phrases in Polish, English and Ukrainian are in `SEARCH_PHRASES`. They fill the keywords of the structured data, and the fallback text and `llms.txt` use them in sentences. There is no meta keywords tag.
- Until the game mounts, the app root holds a short description in Polish, Ukrainian and English and a noscript note. The app replaces it on start.
- The build writes `sitemap.xml` with the build date and the share images. `robots.txt` allows every crawler, points to the sitemap and sets the content signals `search=yes, ai-input=yes, ai-train=no`.
- Crawlers read `robots.txt` only at the root of a host. On GitHub Pages that is the `veelenga.github.io` user site, so its `robots.txt` needs the sitemap line and the content signals as well. The file here takes over on a custom domain.
- `llms.txt` follows llmstxt.org, and `llms-full.txt` adds a short description of every feature. Both are written by hand, so a pull request that adds or changes a feature updates them too.
- `npm run og` renders the share images, `public/screenshot.jpg` and the README image from a live island arena run with a hero in the wizard hat and the dragon pet. The image alt texts in `src/seo/site.ts` describe that scene.

## Content security policy

Owner: `src/seo/contentSecurityPolicy.ts`.

- GitHub Pages cannot send response headers, so the policy is a `<meta http-equiv="Content-Security-Policy">` tag. The Vite plugin puts it first in the head, in the dev server and in the build.
- The build policy is `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`.
- The dev server adds `style-src-elem 'self' 'unsafe-inline'`, because it injects the CSS as `<style>` tags, and `worker-src 'self' blob:`, because its client waits for a restarted server from a blob shared worker. Inline style attributes stay blocked there too, so the dev server shows the same violations as the build.
- Everything loads from the site itself. Images allow `data:` because the hero, outfit and item portraits are rendered to data URLs. Fonts allow `data:` because the build inlines the smallest font files into the CSS. The character models and their textures are separate files fetched from the site, and the service worker is a script from the site.
- No code writes markup or style attributes as text. Word labels are built from elements with `textContent`. The `style` prop of `el` and the swarm glyph positions go through the element's style declaration, which the policy allows. Only `trustedSvg` in `src/ui/dom.ts` parses markup, and it takes the static map art.
- A meta tag cannot set `frame-ancestors`, `report-uri` or `sandbox`, so the page cannot forbid framing.
- A remote origin, a blob URL, a web worker or an inline script needs a change to the policy, otherwise the browser blocks it. The browser smoke test fails on the console error that a blocked request writes.

## Dev shortcut

Owners: `src/app/devShortcut.ts`, `src/app/App.ts`.

- In development only, `?level=<id>` starts a level directly, for example `http://localhost:5173/?level=jaskinia-24` for the cave boss. Every level id is in the table under [Regions and levels](#regions-and-levels).
- It uses a temporary profile named Test. It takes the word language, the character, the inventory and the equipped pet and hat of the active profile, or the first character with Polish words and without items when there is none. Story and learn cards are skipped. Results are not saved.
- In development only, `?arena=<key set>-<difficulty>` starts an endless arena run directly, for example `http://localhost:5173/?arena=las-2` for Las on Normalnie. The key set is a region id and the difficulty is the preset level from 1 to 4, see [Arena](#arena). It uses the same temporary profile, so the arena does not need to be open and results are not saved. A key set that the word language of the active profile does not have, such as Wyspa Ogonków with English words, opens the profile screen.
- In development only, `?daily=<key set>` starts today's [Daily challenge](#daily-challenge) directly, for example `http://localhost:5173/?daily=las`, and `&weekday=<0..6>` forces the format of a weekday, 0 for Monday, for example `?daily=las&weekday=1` for Dwie minuty. It uses the same temporary profile, so results are not saved.
- In development only, `?placement=1` starts the [Placement test](#placement-test) directly with the same temporary profile, without the intro card. Results are not saved.
- An unknown id, arena value or daily key set opens the profile screen. Production builds ignore the parameters.

## Planned

Not built yet. In this order:

1. More arena modes: a race against a shadow and modifiers in free play.
2. Daily training: short sessions built from weak keys, with spaced repetition and streaks.
3. Typing test with certificates.
4. New chapters after the letters: capitals, numbers, punctuation, sentences and speed.
5. Runner segments.
6. Own avatars from Ready Player Me, deferred.
