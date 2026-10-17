// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { PageClasses } from './PageClasses';

const DARK = 'is-dark';
const FAST = 'is-fast';

function setup() {
  const page = document.createElement('div').classList;
  return { page, classes: new PageClasses(page) };
}

describe('PageClasses', () => {
  it('adds the class with the first claim and removes it only with the last release', () => {
    const { page, classes } = setup();
    const releaseRun = classes.claim(DARK);
    const releaseAttack = classes.claim(DARK);
    expect(page.contains(DARK)).toBe(true);
    releaseAttack();
    expect(page.contains(DARK)).toBe(true);
    releaseRun();
    expect(page.contains(DARK)).toBe(false);
  });

  it('releases a claim only once', () => {
    const { page, classes } = setup();
    const releaseFirst = classes.claim(DARK);
    classes.claim(DARK);
    releaseFirst();
    releaseFirst();
    expect(page.contains(DARK)).toBe(true);
  });

  it('keeps each class to its own claims', () => {
    const { page, classes } = setup();
    const releaseDark = classes.claim(DARK);
    classes.claim(FAST);
    releaseDark();
    expect(page.contains(DARK)).toBe(false);
    expect(page.contains(FAST)).toBe(true);
  });

  it('removes every claimed class when all claims release at once', () => {
    const { page, classes } = setup();
    const releaseDark = classes.claim(DARK);
    classes.claim(FAST);
    classes.releaseAll();
    expect(page.contains(DARK)).toBe(false);
    expect(page.contains(FAST)).toBe(false);
    classes.claim(DARK);
    releaseDark();
    expect(page.contains(DARK)).toBe(true);
  });
});
