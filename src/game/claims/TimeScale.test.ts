import { describe, expect, it } from 'vitest';
import { NORMAL_TIME_SCALE, TimeScale } from './TimeScale';

const SLOW = 0.4;
const SLOWER = 0.3;
const BACKWARDS = -1;
const STOPPED = 0;

describe('TimeScale', () => {
  it('runs at normal speed without claims', () => {
    expect(new TimeScale().value).toBe(NORMAL_TIME_SCALE);
  });

  it('keeps the lowest scale while claims overlap, until both release', () => {
    const time = new TimeScale();
    const releaseSlow = time.claim(SLOW);
    const releaseSlower = time.claim(SLOWER);
    expect(time.value).toBe(SLOWER);
    releaseSlower();
    releaseSlow();
    expect(time.value).toBe(NORMAL_TIME_SCALE);
  });

  it('restores the remaining claim when the other releases', () => {
    const time = new TimeScale();
    const releaseSlow = time.claim(SLOW);
    const releaseSlower = time.claim(SLOWER);
    releaseSlower();
    expect(time.value).toBe(SLOW);
    releaseSlow();
    expect(time.value).toBe(NORMAL_TIME_SCALE);
  });

  it('keeps the lower claim when the higher one releases first', () => {
    const time = new TimeScale();
    const releaseSlow = time.claim(SLOW);
    time.claim(SLOWER);
    releaseSlow();
    expect(time.value).toBe(SLOWER);
  });

  it('releases a claim only once', () => {
    const time = new TimeScale();
    const releaseFirst = time.claim(SLOW);
    time.claim(SLOW);
    releaseFirst();
    releaseFirst();
    expect(time.value).toBe(SLOW);
  });

  it('never runs backwards', () => {
    const time = new TimeScale();
    time.claim(BACKWARDS);
    expect(time.value).toBe(STOPPED);
  });
});
