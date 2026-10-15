import { afterEach, describe, expect, it } from 'vitest';
import { removeStorage } from '../storage';
import { ROTATE_HINT_KEY, rotateHint } from './RotateHint';

describe('rotateHint', () => {
  afterEach(() => {
    removeStorage(ROTATE_HINT_KEY);
    document.body.replaceChildren();
  });

  it('shows the hint until it is dismissed', () => {
    const hint = rotateHint();
    expect(hint?.textContent).toContain('Obróć telefon');
    expect(rotateHint()).toBeDefined();
  });

  it('remembers the dismissal and leaves', () => {
    const hint = rotateHint();
    if (!hint) throw new Error('Missing hint');
    document.body.append(hint);
    hint.click();
    expect(hint.isConnected).toBe(false);
    expect(rotateHint()).toBeUndefined();
  });
});
