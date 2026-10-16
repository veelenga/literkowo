import { expect, test, type Locator, type Page } from '@playwright/test';

const PROFILE_NAME = 'Ola';
const INITIAL_SCORE = '0';
const LEVEL_START_TIMEOUT_MS = 40_000;
const MAX_OVERLAY_STEPS = 30;
const PROFILE_SCHEMA_VERSION = 7;
const PROFILES_KEY = 'literkowo.profiles';
const ACTIVE_PROFILE_KEY = 'literkowo.activeProfile';
const KEYBOARD_PROFILE_ID = 'keyboard-walk';
const CARD_KEY_READY_MS = 700;
const PLACEMENT_STAGES = 5;
const FIRST_STAGE_LABEL = 'Etap 1 z 5';
const FIRST_LEVEL_DONE = {
  'polana-1': { stars: 3, score: 120, accuracy: 0.98, wpm: 8 },
};

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

function stageCanvas(page: Page): Locator {
  return page.locator('.stage canvas');
}

function hudScore(page: Page): Locator {
  return page.locator('.hud-stat').first().locator('.hud-value');
}

async function createProfile(page: Page, name: string): Promise<void> {
  await page.locator('.profile-card-new').click();
  const panel = page.locator('.profile-panel');
  await panel.getByRole('textbox').fill(name);
  await expect(panel.locator('.avatar-option.is-active')).toHaveCount(1);
  await panel.locator('.button-primary').click();
  await expect(panel.locator('.panel-title')).toHaveText(name);
  await panel.locator('.button-primary').click();
}

async function advanceToStage(page: Page): Promise<void> {
  const stage = stageCanvas(page);
  const nextButton = page.locator('.overlay .button-primary');
  for (let step = 0; step < MAX_OVERLAY_STEPS; step += 1) {
    await expect(nextButton.or(stage).first()).toBeVisible({ timeout: LEVEL_START_TIMEOUT_MS });
    if (await stage.isVisible()) return;
    await nextButton.click();
  }
}

test('plays the first level with a new profile', async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);

  await test.step('shows the profile screen', async () => {
    await page.goto('/');
    await expect(page.locator('.profile-screen')).toBeVisible();
    await expect(page.locator('.profile-card-new')).toBeVisible();
  });

  await test.step('creates a profile and opens the map', async () => {
    await createProfile(page, PROFILE_NAME);
    await expect(page.locator('.map-screen')).toBeVisible();
    await expect(page.locator('.level-node.is-current')).toBeVisible();
    expect(await page.locator('.level-node:not([disabled])').count()).toBeGreaterThan(0);
  });

  await test.step(
    'starts the current level',
    async () => {
      await page.locator('.level-node.is-current').click();
      await advanceToStage(page);
      await expect(stageCanvas(page)).toBeVisible();
      await expect(page.locator('.word-label').first()).toHaveText(/\S/, {
        timeout: LEVEL_START_TIMEOUT_MS,
      });
    },
    { timeout: LEVEL_START_TIMEOUT_MS },
  );

  await test.step('scores by typing the first word', async () => {
    await expect(hudScore(page)).toHaveText(INITIAL_SCORE);
    const word = await page.locator('.word-label').first().innerText();
    await page.keyboard.type(word.trim());
    await expect(hudScore(page)).not.toHaveText(INITIAL_SCORE);
  });

  expect(consoleErrors).toEqual([]);
});

test('walks from the profiles into a level and back from pause with the keyboard only', async ({
  page,
}) => {
  const consoleErrors = collectConsoleErrors(page);
  const profile = {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id: KEYBOARD_PROFILE_ID,
    name: PROFILE_NAME,
    avatar: 'a',
    seenStories: ['intro'],
    levelResults: FIRST_LEVEL_DONE,
  };
  await page.addInitScript(
    ([profilesKey, activeKey, stored, activeId]) => {
      localStorage.setItem(profilesKey, stored);
      localStorage.setItem(activeKey, activeId);
    },
    [PROFILES_KEY, ACTIVE_PROFILE_KEY, JSON.stringify([profile]), KEYBOARD_PROFILE_ID],
  );

  await test.step('plays the selected profile with Enter', async () => {
    await page.goto('/');
    await expect(page.locator('.play-panel')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('.map-screen')).toBeVisible();
  });

  await test.step('moves along the map with the arrows and opens a level with Enter', async () => {
    const current = page.locator('.level-node.is-current');
    await page.keyboard.press('ArrowRight');
    await expect(current).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.level-node').first()).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(current).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('.learn-panel')).toBeVisible();
  });

  await test.step(
    'starts the level from the learn card with Enter',
    async () => {
      await page.waitForTimeout(CARD_KEY_READY_MS);
      await page.keyboard.press('Enter');
      await expect(stageCanvas(page)).toBeVisible({ timeout: LEVEL_START_TIMEOUT_MS });
      await expect(page.locator('.word-label').first()).toHaveText(/\S/, {
        timeout: LEVEL_START_TIMEOUT_MS,
      });
    },
    { timeout: LEVEL_START_TIMEOUT_MS },
  );

  await test.step('pauses with Escape and resumes with Enter', async () => {
    await page.keyboard.press('Escape');
    await expect(page.locator('.pause-panel')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('.pause-panel')).toHaveCount(0);
  });

  expect(consoleErrors).toEqual([]);
});

test('starts the placement test from the create form', async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);

  await test.step('creates a profile with the placement button', async () => {
    await page.goto('/');
    await page.locator('.profile-card-new').click();
    const panel = page.locator('.create-panel');
    await panel.getByRole('textbox').fill(PROFILE_NAME);
    await panel.locator('.knows-typing').click();
    await expect(page.locator('.placement-intro .stage-chip')).toHaveCount(PLACEMENT_STAGES);
  });

  await test.step(
    'runs the first stage with real words',
    async () => {
      await page.waitForTimeout(CARD_KEY_READY_MS);
      await page.keyboard.press('Enter');
      await expect(stageCanvas(page)).toBeVisible({ timeout: LEVEL_START_TIMEOUT_MS });
      await expect(page.locator('.progress-label')).toHaveText(FIRST_STAGE_LABEL);
      await expect(page.locator('.word-label').first()).toHaveText(/\S/, {
        timeout: LEVEL_START_TIMEOUT_MS,
      });
      const word = await page.locator('.word-label').first().innerText();
      await page.keyboard.type(word.trim());
      await expect(hudScore(page)).not.toHaveText(INITIAL_SCORE);
    },
    { timeout: LEVEL_START_TIMEOUT_MS },
  );

  expect(consoleErrors).toEqual([]);
});
