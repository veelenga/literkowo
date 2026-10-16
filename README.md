# Literkowo

A free typing adventure for kids: learn to touch type in Polish or English by beating word monsters in a blocky 3D world.

**Play:** https://veelenga.github.io/literkowo/

![Literkowo: the hero in a wizard hat with a dragon pet fights word monsters on the island, with the journey map, the arena and the shop below](docs/screenshot.jpg)

- **One new key per level.** A gradual course from `f j` on the home row to the Polish letters typed with right Alt, with finger hints, reviews and a boss at the end of each of the five worlds.
- **11 kinds of tricky enemies and real bosses.** Jumpers, ghosts, thieves, swarms, shields, bulls, chameleons and more, plus power words, bombers, mini bosses and region bosses with their own attacks.
- **Arena and shop.** Endless waves with medals once the first world is beaten, and coins that buy pets, hats and characters, each pet and hat with a small power.

Polish or Ukrainian interface, Polish or English words. Several player profiles on one device, with stars and progress saved in the browser. Music and sound effects are generated live. Free, with no ads and no account.

## Develop

```
nvm use
npm install
npm run dev
```

`nvm use` picks the Node LTS version from `.nvmrc`. `npm test` runs the unit tests, `npm run lint` checks types and formatting. In development, `?level=polana-1` on the dev URL starts a level directly.

`npm run e2e` builds the game and plays the first level in headless Chromium. Run `npx playwright install chromium` once before the first run.

`npm run og` plays a live arena run in Chromium and renders the link preview images in `public` and the image at the top of this page.

Contribution rules are in [CLAUDE.md](CLAUDE.md).

## Credits

- Characters: "Blocky Characters" by Kenney (kenney.nl), CC0
- Fonts: Nunito and JetBrains Mono via Fontsource, OFL
