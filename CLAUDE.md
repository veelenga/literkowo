# Literkowo

A browser typing game for children. TypeScript, Vite, three.js and Web Audio.
Today the interface is in Polish and Ukrainian, and the typing words are in Polish and English.
`main` deploys to GitHub Pages on every push.
These instructions are for AI agents and for people.

## Read first

- Read `docs/INTENT.md` and `docs/SPEC.md` before you change gameplay.
- When behaviour changes, update `docs/SPEC.md` in the same pull request.
- When a feature is added or changes, update `public/llms.txt` and `public/llms-full.txt` in the same pull request.
- Accuracy comes before speed. A new mechanic must keep careful typing as the best way to win.

## Commands

- `nvm use` picks the Node version from `.nvmrc`.
- `npm install` installs dependencies.
- `npm run dev` starts Vite on `http://localhost:5173`.
- `http://localhost:5173/?level=<id>` starts a level directly in dev. Ids are `<region>-<number>`, for example `?level=polana-1` (learn), `?level=polana-2` (practice), `?level=polana-3` (review) and `?level=polana-19` (boss). The full level table is in `docs/SPEC.md`.
- `http://localhost:5173/?arena=<key set>-<difficulty>` starts an endless arena run directly in dev, for example `?arena=las-2`. The key set is a region id and the difficulty is 1 to 4, see Arena in `docs/SPEC.md`.
- `http://localhost:5173/?daily=<key set>` starts today's daily challenge directly in dev, for example `?daily=las`. Add `&weekday=<0..6>` to force the format of a weekday, 0 for Monday, for example `?daily=las&weekday=1`. See Daily challenge in `docs/SPEC.md`.
- `http://localhost:5173/?placement=1` starts the placement test directly in dev, see Placement test in `docs/SPEC.md`.
- `npm test` runs the Vitest unit tests.
- `npm run lint` checks types, ESLint and Prettier.
- `npm run format` fixes formatting.
- `npm run build` type checks and builds into `dist`.
- `npm run icons` renders the app icons in `public` from `icon.svg` and `icon-maskable.svg`. Commit the PNG files it writes.
- `npm run og` plays an island arena run in Chromium and renders the share images `public/og.jpg` and `public/og-square.jpg`, the screenshot `public/screenshot.jpg` and the README image `docs/screenshot.jpg`. Run `npx playwright install chromium` once before the first run. The run is live, so every render is a little different. Look at the images and commit them.

## Workflow

- Never commit to `main`.
- One branch per feature, made from the latest `main`. Name it `<type>/<short-name>`, for example `feat/power-words`.
- Use one git worktree per parallel task, under `../literkowo-wt/<name>`:
  `git fetch origin && git worktree add ../literkowo-wt/power-words -b feat/power-words origin/main`
- Each worktree needs its own `npm install`. When port 5173 is taken, Vite picks the next free port, so use the URL it prints.
- Remove the worktree after the merge with `git worktree remove ../literkowo-wt/<name>`.
- Commits are atomic and follow conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
- No co-author lines and no "Generated with" lines in commits or pull requests.
- Land changes through the `/pr` skill. Agents push and open pull requests only when asked.

## Pull requests

The description follows `.github/pull_request_template.md` and has three sections:

- What: one or two sentences on what changed.
- Why: one sentence on why.
- Screenshots: required when the change is visible in the game, such as a level, the map or an overlay. Otherwise write "none".

Screenshots:

1. Run `npm run dev` and open the changed screen. Use `?level=<id>` to jump straight to a level.
2. Capture it with the Claude in Chrome screenshot tool: the `computer` tool with `action: "screenshot"` and `save_to_disk: true`. The result gives the saved path.
3. Screenshots never go into `main`. They live on the orphan `screenshots` branch, one image per pull request.
   Open it in a worktree once, from the main checkout: `git fetch origin && git worktree add ../literkowo-wt/screenshots screenshots`.
   If that worktree already exists, update it with `git -C ../literkowo-wt/screenshots pull`.
4. Copy the image into that worktree as `<branch-name>.jpg`, with each `/` in the branch name replaced by `-`.
   If the saved file is a PNG, convert it on macOS: `sips -s format jpeg <saved file> --out ../literkowo-wt/screenshots/<branch-name>.jpg`.
5. Commit it there with `chore: screenshot for <branch>` and push the `screenshots` branch.
   When you capture again, overwrite the same file. Replace, do not accumulate.
6. Link it in the pull request body with the raw URL:
   `https://raw.githubusercontent.com/veelenga/literkowo/screenshots/<file>`

## Verify before a pull request

Run these checks yourself before you open the pull request. They do not go into the description.

- `npm run lint`
- `npm test`
- `npm run build`
- A manual check of the changed flow in the browser.

CI runs lint, unit tests, the build and a browser smoke test on every pull request. The manual check of the changed flow is still on the author.

## Parallel development

This is the agreed structure, so that feature branches rarely touch the same files.
The `src/game/mechanics` folder arrives with an in-flight foundation branch. Follow this layout once it lands.

- A gameplay feature is one mechanics module in `src/game/mechanics`, registered with one line in `src/game/mechanics/index.ts`.
- Feature text goes in `src/i18n/features/<feature>.ts`, with every interface language side by side.
- Feature CSS goes in its own file, imported by the feature's UI module.
- Feature sounds are built from the generic `Sfx` helpers. Do not add feature methods to `Sfx.ts`.
- Shared files change only in foundation work: `src/game/Game.ts`, `src/i18n/translations.ts`, `src/styles.css`, `src/audio/Sfx.ts`.
- When a feature needs a new hook in a shared file, land that hook first as a small foundation pull request.
- Tests sit next to the code as `*.test.ts`. Shared test helpers live in `src/testing`.

## Code rules

These mirror the global rules in brief.

- No comments. The only exception is one short line for a non-obvious constraint the code cannot express.
- Named constants instead of magic numbers and strings.
- Small functions with one job. Early returns instead of deep nesting.
- No `any`. No `as` casts except `as const`.
- Prefer a well maintained library over custom code when it makes things simpler.
- Build for the long term. No stopgaps that are meant to be replaced later.
- Run `npm run format` after changes.

Copy rules:

- No words in all capitals. Use sentence case, for example "Next level".
- No dashes in interface copy, in any language.
- Update every interface language together, in the same commit. Today that is Polish and Ukrainian.
- Only words that are safe for kids, in copy, stories and word lists.

## Assets

- Only CC0 or permissively licensed assets: models, images and fonts.
- Credit every asset in the Credits section of `README.md`.
