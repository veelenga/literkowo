import { writeFile } from 'node:fs/promises';
import { URL, fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { createServer } from 'vite';

const ROOT = new URL('../', import.meta.url);
const DEV_PORT = 5421;
const DEV_ORIGIN = `http://localhost:${DEV_PORT}`;
const COMPOSE_URL = `${DEV_ORIGIN}/og-compose.html`;
const FONT_STYLESHEETS = [
  '/node_modules/@fontsource/nunito/800.css',
  '/node_modules/@fontsource/nunito/900.css',
];
const GPU_ARGS = process.platform === 'darwin' ? ['--use-angle=metal'] : [];

const PROFILES_KEY = 'literkowo.profiles';
const ACTIVE_PROFILE_KEY = 'literkowo.activeProfile';
const QUALITY_KEY = 'literkowo.quality';
const QUALITY = 'high';
const HERO_NAME = 'Ola';
const HERO_AVATAR = 'c';
const HERO_HAT = 'wizard';
const HERO_PET = 'dragon';
const OWNED_PETS = ['cube-cat', 'bee', 'star', 'dragon'];
const OWNED_HATS = ['cap', 'headphones', 'wizard'];
const HERO_COINS = 1240;
const HERO_XP = 30000;
const LEVELS_WON = 112;
const TWO_STAR_EVERY = 5;
const WON_RESULT = { score: 480, accuracy: 0.97, wpm: 24 };
const ARENA_BESTS = {
  'wyspa/calm': { wave: 12, score: 7300, accuracy: 0.98, medal: 3, runs: 3 },
  'wyspa/normal': { wave: 8, score: 6200, accuracy: 0.95, medal: 2, runs: 5 },
  'jaskinia/normal': { wave: 7, score: 5400, accuracy: 0.96, medal: 2, runs: 4 },
  'las/calm': { wave: 11, score: 6100, accuracy: 0.98, medal: 3, runs: 2 },
};
const ARENA_DATE = '2026-10-01';
const RANDOM_SEED = 20261016;

const BATTLE_PATH = '/?arena=wyspa-3';
const BATTLE_VIEWPORT = { width: 1600, height: 840 };
const BATTLE_SCALE = 1.5;
const HERO_SCREEN = { x: 0.5, y: 0.47 };
const BOT_REACH = 0.12;
const BOT_KEY_MS = 110;
const BUSY_LABELS = 7;
const MIN_BUSY_LABELS = 5;
const BUSY_STEP_MS = 30_000;
const BUSY_POLL_MS = 250;
const ATTEMPT_TIMEOUT_MS = 120_000;
const BATTLE_ATTEMPTS = 4;
const PAUSE_SETTLE_MS = 500;
const STRIKE_FADE_MS = 700;
const WORD_LABEL = '.word-label';
const TYPED_LETTERS = '.done, .is-done';
const HEART = '.heart';
const LOST_HEART_CLASS = 'is-lost';
const GAME_CHROME = ['.hud', '.keyboard'];
const ALWAYS_HIDDEN = ['.overlay', '.callouts'];

const SCREEN_VIEWPORT = { width: 1024, height: 576 };
const SCREEN_SETTLE_MS = 2500;

const SHARE_CROP = { left: 0.1, top: 0.02, width: 0.8, height: 0.8 };
const SQUARE_CROP = { left: 0.2375, top: 0, width: 0.525, height: 1 };
const COMPOSER_VIEWPORT = { width: 1600, height: 1200 };
const README_WIDTH = 1600;
const README_IMAGE = 'docs/screenshot.jpg';
const README_TILES = [
  { screen: 'map', caption: 'Journey map' },
  { screen: 'arena', caption: 'Arena' },
  { screen: 'shop', caption: 'Shop' },
];
const PUBLIC_DIR = 'public/';
const SHARE_MAX_KB = 300;
const SQUARE_MAX_KB = 400;
const SCREENSHOT_MAX_KB = 400;
const README_MAX_KB = 400;
const JPEG_START_QUALITY = 88;
const JPEG_MIN_QUALITY = 50;
const JPEG_QUALITY_STEP = 4;
const KB = 1024;

function rootPath(path) {
  return fileURLToPath(new URL(path, ROOT));
}

async function loadSiteData(server) {
  const site = await server.ssrLoadModule('/src/seo/site.ts');
  const { translations } = await server.ssrLoadModule('/src/i18n/translations.ts');
  const { LEVELS } = await server.ssrLoadModule('/src/course/catalog.ts');
  const { createProfile } = await server.ssrLoadModule('/src/profiles/Profile.ts');
  return { site, copy: translations[site.SITE_LANGUAGE], levels: LEVELS, createProfile };
}

function heroProfile({ levels, createProfile }) {
  const base = createProfile(HERO_NAME, HERO_AVATAR);
  const levelResults = Object.fromEntries(
    levels
      .slice(0, LEVELS_WON)
      .map((level, index) => [
        level.id,
        { ...WON_RESULT, stars: index % TWO_STAR_EVERY === 0 ? 2 : 3 },
      ]),
  );
  const endless = Object.fromEntries(
    Object.entries(ARENA_BESTS).map(([key, best]) => [key, { ...best, date: ARENA_DATE }]),
  );
  const medalsPaid = Object.fromEntries(
    Object.entries(ARENA_BESTS).map(([key, best]) => [key, best.medal]),
  );
  return {
    ...base,
    coins: HERO_COINS,
    xp: HERO_XP,
    seenStories: ['intro'],
    levelResults,
    inventory: { ...base.inventory, pets: OWNED_PETS, hats: OWNED_HATS },
    equipped: { pet: HERO_PET, hat: HERO_HAT },
    arena: { ...base.arena, endless, medalsPaid },
  };
}

function seedStorage([entries, seed]) {
  for (const [key, value] of entries) localStorage.setItem(key, value);
  let state = seed;
  Math.random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function openPage(browser, profile, viewport, deviceScaleFactor, seed = RANDOM_SEED) {
  const page = await browser.newPage({ viewport, deviceScaleFactor });
  const entries = [
    [PROFILES_KEY, JSON.stringify([profile])],
    [ACTIVE_PROFILE_KEY, profile.id],
    [QUALITY_KEY, QUALITY],
  ];
  await page.addInitScript(seedStorage, [entries, seed]);
  return page;
}

function hideRule(selectors) {
  return `${selectors.join(', ')} { visibility: hidden !important; transition: none !important; }`;
}

function startBot([hero, reach, keyMs, labelSelector, doneSelector]) {
  const typeable = /[\p{L};,.]/u;
  let target;
  const remaining = (label) => {
    const copy = label.cloneNode(true);
    copy.querySelectorAll(doneSelector).forEach((part) => part.remove());
    return [...copy.textContent].filter((char) => typeable.test(char));
  };
  const distance = (label) => {
    const box = label.getBoundingClientRect();
    const x = box.x + box.width / 2 - innerWidth * hero.x;
    return Math.hypot(x, box.bottom - innerHeight * hero.y);
  };
  const isLive = (label) =>
    label?.isConnected && !label.hidden && label.getBoundingClientRect().width > 0;
  const nearest = () =>
    [...document.querySelectorAll(labelSelector)]
      .filter((label) => isLive(label) && remaining(label).length > 0)
      .sort((first, second) => distance(first) - distance(second))
      .find((label) => distance(label) < innerWidth * reach);
  return setInterval(() => {
    if (!isLive(target) || remaining(target).length === 0) target = nearest();
    const key = target && remaining(target)[0];
    if (key) window.dispatchEvent(new KeyboardEvent('keydown', { key }));
  }, keyMs);
}

function boardState([labelSelector, heartSelector, lostHeartClass]) {
  const isShown = (label) => !label.hidden && label.getBoundingClientRect().width > 0;
  const labels = [...document.querySelectorAll(labelSelector)].filter(isShown).length;
  const hearts = [...document.querySelectorAll(heartSelector)];
  const gameOver =
    hearts.length > 0 && hearts.every((heart) => heart.classList.contains(lostHeartClass));
  return { labels, gameOver };
}

async function playUntilBusy(page) {
  const start = Date.now();
  while (Date.now() - start < ATTEMPT_TIMEOUT_MS) {
    const steps = Math.floor((Date.now() - start) / BUSY_STEP_MS);
    const wanted = Math.max(MIN_BUSY_LABELS, BUSY_LABELS - steps);
    const { labels, gameOver } = await page.evaluate(boardState, [
      WORD_LABEL,
      HEART,
      LOST_HEART_CLASS,
    ]);
    if (gameOver) return false;
    if (labels >= wanted) return true;
    await page.waitForTimeout(BUSY_POLL_MS);
  }
  return false;
}

async function captureBattleAttempt(browser, profile, seed) {
  const page = await openPage(browser, profile, BATTLE_VIEWPORT, BATTLE_SCALE, seed);
  try {
    await page.goto(`${DEV_ORIGIN}${BATTLE_PATH}`);
    await page.addStyleTag({ content: hideRule(ALWAYS_HIDDEN) });
    await page.locator(WORD_LABEL).first().waitFor();
    const bot = await page.evaluate(startBot, [
      HERO_SCREEN,
      BOT_REACH,
      BOT_KEY_MS,
      WORD_LABEL,
      TYPED_LETTERS,
    ]);
    if (!(await playUntilBusy(page))) return undefined;
    await page.evaluate((id) => clearInterval(id), bot);
    await page.waitForTimeout(STRIKE_FADE_MS);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(PAUSE_SETTLE_MS);
    const withChrome = await page.screenshot();
    await page.addStyleTag({ content: hideRule(GAME_CHROME) });
    const clean = await page.screenshot();
    return { clean, withChrome };
  } finally {
    await page.close();
  }
}

async function captureBattle(browser, profile) {
  for (let attempt = 0; attempt < BATTLE_ATTEMPTS; attempt += 1) {
    const battle = await captureBattleAttempt(browser, profile, RANDOM_SEED + attempt);
    if (battle) return battle;
    console.log(`Battle attempt ${attempt + 1} ended before the board got busy`);
  }
  throw new Error('The battle never got busy enough for a picture');
}

async function captureScreens(browser, profile) {
  const page = await openPage(browser, profile, SCREEN_VIEWPORT, 1);
  await page.goto(DEV_ORIGIN);
  await page.locator('.play-panel').waitFor();
  await page.keyboard.press('Enter');
  await page.locator('.map-screen').waitFor();
  await page.waitForTimeout(SCREEN_SETTLE_MS);
  const map = await page.screenshot();
  await page.locator('.arena-button').click();
  await page.locator('.arena-screen').waitFor();
  await page.waitForTimeout(SCREEN_SETTLE_MS);
  const arena = await page.screenshot();
  await page.locator('.arena-screen .shop-link').click();
  await page.locator('.shop-screen:not(.arena-screen)').waitFor();
  await page.waitForTimeout(SCREEN_SETTLE_MS);
  const shop = await page.screenshot();
  await page.close();
  return { map, arena, shop };
}

async function crop(image, area) {
  const { width, height } = await sharp(image).metadata();
  const region = {
    left: Math.round(width * area.left),
    top: Math.round(height * area.top),
    width: Math.round(width * area.width),
    height: Math.round(height * area.height),
  };
  return sharp(image).extract(region).png().toBuffer();
}

function dataUrl(image) {
  return `data:image/png;base64,${image.toString('base64')}`;
}

function escapeHtml(text) {
  return text.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);
}

const BASE_STYLE = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #050816; font-family: Nunito, sans-serif; color: #e6ecff; }
  .frame { position: relative; overflow: hidden; }
  .scene { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .shade { position: absolute; inset: 0; }
  .copy { position: absolute; display: flex; }
  .details { display: flex; flex-direction: column; gap: 16px; }
  .logo {
    padding: 0 0.08em 0.08em;
    font-weight: 900;
    line-height: 1;
    letter-spacing: -0.035em;
    background: linear-gradient(180deg, #fff6d8 0%, #ffbe2e 52%, #ff8a1f 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 6px 0 #c25b00) drop-shadow(0 22px 34px rgba(255, 138, 31, 0.35));
  }
  .tagline { font-weight: 800; line-height: 1.25; text-shadow: 0 2px 12px rgba(5, 8, 22, 0.8); }
  .badges { display: flex; gap: 12px; list-style: none; }
  .badges li {
    padding: 8px 20px;
    border: 2px solid rgba(255, 190, 46, 0.6);
    border-radius: 999px;
    background: rgba(12, 18, 44, 0.72);
    color: #ffd77a;
    font-weight: 800;
  }
`;

function shareCard({ scene, copy, badges, layout }) {
  return `
    <div class="frame ${layout}">
      <img class="scene" src="${dataUrl(scene)}" />
      <div class="shade"></div>
      <div class="copy">
        <div class="logo">${escapeHtml(copy.appName)}</div>
        <div class="details">
          <p class="tagline">${escapeHtml(copy.tagline)}</p>
          <ul class="badges">${badges.map((badge) => `<li>${escapeHtml(badge)}</li>`).join('')}</ul>
        </div>
      </div>
    </div>`;
}

const SHARE_STYLE = `
  .wide { width: 1200px; height: 630px; }
  .wide .shade {
    background: linear-gradient(0deg, rgba(5, 8, 22, 0.95) 0%, rgba(5, 8, 22, 0.84) 24%, rgba(5, 8, 22, 0) 50%);
  }
  .wide .copy { left: 56px; right: 56px; bottom: 44px; align-items: flex-end; gap: 40px; }
  .wide .logo { font-size: 112px; }
  .wide .tagline { font-size: 30px; }
  .wide .badges li { font-size: 20px; }
  .square { width: 1200px; height: 1200px; }
  .square .shade {
    background: linear-gradient(0deg, rgba(5, 8, 22, 0.95) 0%, rgba(5, 8, 22, 0.82) 28%, rgba(5, 8, 22, 0) 55%);
  }
  .square .copy { left: 80px; right: 80px; bottom: 80px; flex-direction: column; align-items: center; gap: 22px; text-align: center; }
  .square .details { align-items: center; gap: 22px; }
  .square .logo { font-size: 168px; }
  .square .tagline { font-size: 44px; }
  .square .badges li { font-size: 28px; padding: 10px 26px; }
`;

function readmeSheet({ hero, tiles }) {
  const figures = tiles
    .map(
      ({ image, caption }) =>
        `<figure><img src="${dataUrl(image)}" /><figcaption>${escapeHtml(caption)}</figcaption></figure>`,
    )
    .join('');
  return `
    <div class="sheet">
      <img class="hero" src="${dataUrl(hero)}" />
      <div class="tiles">${figures}</div>
    </div>`;
}

const README_STYLE = `
  .sheet { width: ${README_WIDTH}px; padding: 20px; display: flex; flex-direction: column; gap: 16px; background: #070b1a; }
  .sheet img { display: block; width: 100%; border-radius: 16px; border: 2px solid rgba(255, 255, 255, 0.08); }
  .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  figure { position: relative; }
  figcaption {
    position: absolute;
    left: 14px;
    bottom: 14px;
    padding: 6px 16px;
    border-radius: 999px;
    background: rgba(7, 11, 26, 0.86);
    color: #ffd77a;
    font-size: 22px;
    font-weight: 800;
  }
`;

async function render(page, { body, style, selector }) {
  const fonts = FONT_STYLESHEETS.map((href) => `<link rel="stylesheet" href="${href}" />`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8" />${fonts}<style>${BASE_STYLE}${style}</style></head><body>${body}</body></html>`;
  await page.route(COMPOSE_URL, (route) => route.fulfill({ contentType: 'text/html', body: html }));
  await page.goto(COMPOSE_URL);
  await page.evaluate(() => document.fonts.ready);
  const image = await page.locator(selector).screenshot();
  await page.unroute(COMPOSE_URL);
  return image;
}

async function saveJpeg(image, path, { width, height, maxKb }) {
  const resized = sharp(image).resize(width, height);
  for (
    let quality = JPEG_START_QUALITY;
    quality >= JPEG_MIN_QUALITY;
    quality -= JPEG_QUALITY_STEP
  ) {
    const jpeg = await resized.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
    if (jpeg.length <= maxKb * KB) {
      await writeFile(rootPath(path), jpeg);
      console.log(`${path}: ${Math.round(jpeg.length / KB)} KB at quality ${quality}`);
      return;
    }
  }
  throw new Error(`${path} does not fit in ${maxKb} KB`);
}

async function renderShareImages(composer, scene, { site, copy }) {
  const cards = [
    { image: site.SHARE_IMAGE, crop: SHARE_CROP, layout: 'wide', maxKb: SHARE_MAX_KB },
    { image: site.SQUARE_IMAGE, crop: SQUARE_CROP, layout: 'square', maxKb: SQUARE_MAX_KB },
  ];
  for (const { image, crop: area, layout, maxKb } of cards) {
    const card = shareCard({
      scene: await crop(scene, area),
      copy,
      badges: site.SHARE_IMAGE_BADGES,
      layout,
    });
    const rendered = await render(composer, { body: card, style: SHARE_STYLE, selector: '.frame' });
    await saveJpeg(rendered, `${PUBLIC_DIR}${image.path}`, { ...image, maxKb });
  }
}

async function renderReadmeImage(composer, hero, screens) {
  const tiles = README_TILES.map(({ screen, caption }) => ({ image: screens[screen], caption }));
  const sheet = await render(composer, {
    body: readmeSheet({ hero, tiles }),
    style: README_STYLE,
    selector: '.sheet',
  });
  await saveJpeg(sheet, README_IMAGE, { width: README_WIDTH, maxKb: README_MAX_KB });
}

const server = await createServer({
  root: rootPath('.'),
  logLevel: 'warn',
  server: { port: DEV_PORT, strictPort: true },
});
await server.listen();
const browser = await chromium.launch({ args: GPU_ARGS });

try {
  const data = await loadSiteData(server);
  const profile = heroProfile(data);
  const battle = await captureBattle(browser, profile);
  const screens = await captureScreens(browser, profile);
  const composer = await browser.newPage({ viewport: COMPOSER_VIEWPORT });
  await renderShareImages(composer, battle.clean, data);
  const { SCREENSHOT } = data.site;
  await saveJpeg(battle.withChrome, `${PUBLIC_DIR}${SCREENSHOT.path}`, {
    ...SCREENSHOT,
    maxKb: SCREENSHOT_MAX_KB,
  });
  await renderReadmeImage(composer, battle.withChrome, screens);
} finally {
  await browser.close();
  await server.close();
}
