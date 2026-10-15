import { withRightAlt } from '../course/fingers';

export const RIGHT_ALT_KEY = 'alt';

export class RightAltLatch {
  private held = false;

  get latched(): boolean {
    return this.held;
  }

  press(key: string): string | undefined {
    if (key === RIGHT_ALT_KEY) {
      this.held = !this.held;
      return undefined;
    }
    const char = this.held ? withRightAlt(key) : key;
    this.held = false;
    return char;
  }
}
