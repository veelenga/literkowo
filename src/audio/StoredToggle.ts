import { readStorage, writeStorage } from '../storage';

const ON = 'on';
const OFF = 'off';

export class StoredToggle {
  private value: boolean | undefined;

  constructor(private readonly key: string) {}

  get enabled(): boolean {
    this.value ??= readStorage(this.key) !== OFF;
    return this.value;
  }

  set(enabled: boolean): void {
    this.value = enabled;
    writeStorage(this.key, enabled ? ON : OFF);
  }
}
