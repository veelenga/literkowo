# Literkowo

A browser typing game for children. TypeScript, Vite, three.js and Web Audio.
Today the interface is in Polish and Ukrainian, and the typing words are in Polish and English.
`main` deploys to GitHub Pages on every push.
These instructions are for AI agents and for people.

## Read first

- Read `docs/INTENT.md` and `docs/SPEC.md` before you change gameplay.
- When behaviour changes, update `docs/SPEC.md` in the same pull request.
- Accuracy comes before speed. A new mechanic must keep careful typing as the best way to win.

## Commands

- `nvm use` picks the Node version from `.nvmrc`.
- `npm install` installs dependencies.
- `npm run dev` starts Vite on `http://localhost:5173`.
- `http://localhost:5173/?level=<id>` starts a level directly in dev, for example `?level=polana-1`. Level ids are in `docs/SPEC.md`.
- `npm test` runs the Vitest unit tests.
- `npm run lint` checks types, ESLint and Prettier.
- `npm run format` fixes formatting.
- `npm run build` type checks and builds into `dist`.

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

The description is the minimum needed. `.github/pull_request_template.md` has the shape.

- One or two sentences on what changed and why.
- A checklist of what you verified, and what you could not verify.
- A screenshot whenever the change is visible in the game: a level, the map or an overlay.

Screenshots:

1. Run `npm run dev` and open the changed screen. Use `?level=<id>` to jump straight to a level.
2. Capture it with the Claude in Chrome screenshot tool: the `computer` tool with `action: "screenshot"` and `save_to_disk: true`. The result gives the saved path.
3. Copy that file to `docs/screenshots/<branch-name>.jpg`, with each `/` in the branch name replaced by `-`. If the saved file is a PNG, convert it on macOS: `sips -s format jpeg <saved file> --out docs/screenshots/<branch-name>.jpg`.
4. Commit it on the branch. When you capture again, overwrite the same file. Replace, do not accumulate.
5. Reference it in the pull request body with the raw URL:
   `https://raw.githubusercontent.com/veelenga/literkowo/<branch>/docs/screenshots/<file>`

## Verify before a pull request

- `npm run lint`
- `npm test`
- `npm run build`
- A manual check of the changed flow in the browser.

CI runs lint, unit tests, the build and a browser smoke test on every pull request. The manual check of the changed flow is still on the author.
Say in the pull request what you could not verify.

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
