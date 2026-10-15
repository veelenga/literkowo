import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DeviceProbe } from './deviceProbe';
import {
  QUALITY_PRESETS,
  currentQuality,
  readQualityChoice,
  resolveQuality,
  saveQualityChoice,
} from './quality';

const STORAGE_KEY = 'literkowo.quality';

const DESKTOP: DeviceProbe = {
  pixelRatio: 1,
  cores: 16,
  memoryGb: 8,
  gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
  coarsePointer: false,
};

const probe = (overrides: Partial<DeviceProbe>): DeviceProbe => ({ ...DESKTOP, ...overrides });

describe('resolveQuality', () => {
  it('picks high for a desktop with a discrete GPU', () => {
    expect(resolveQuality(DESKTOP)).toBe('high');
  });

  it('picks high when nothing is known about the device', () => {
    const unknown = { cores: undefined, memoryGb: undefined, gpu: undefined };
    expect(resolveQuality(probe(unknown))).toBe('high');
  });

  it.each([
    'ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)',
    'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'Mali-G78',
    'Adreno (TM) 650',
  ])('caps integrated or mobile GPU %s at medium', (gpu) => {
    expect(resolveQuality(probe({ gpu }))).toBe('medium');
  });

  it('picks low for a software renderer', () => {
    const gpu = 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)';
    expect(resolveQuality(probe({ gpu }))).toBe('low');
  });

  it('picks low for touch first devices', () => {
    expect(resolveQuality(probe({ coarsePointer: true }))).toBe('low');
  });

  it.each([
    [2, 'low'],
    [4, 'medium'],
    [8, 'high'],
  ] as const)('maps %d GB of memory to %s', (memoryGb, level) => {
    expect(resolveQuality(probe({ memoryGb }))).toBe(level);
  });

  it.each([
    [2, 'low'],
    [6, 'medium'],
    [8, 'high'],
  ] as const)('maps %d cores to %s', (cores, level) => {
    expect(resolveQuality(probe({ cores }))).toBe(level);
  });

  it('caps very dense screens at medium', () => {
    expect(resolveQuality(probe({ pixelRatio: 3 }))).toBe('medium');
  });

  it('takes the lowest of all limits', () => {
    expect(resolveQuality(probe({ gpu: 'Apple GPU', memoryGb: 2 }))).toBe('low');
  });
});

describe('quality choice', () => {
  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('defaults to auto', () => {
    expect(readQualityChoice()).toBe('auto');
  });

  it('ignores unknown stored values', () => {
    localStorage.setItem(STORAGE_KEY, 'ultra');
    expect(readQualityChoice()).toBe('auto');
  });

  it('persists an explicit choice', () => {
    saveQualityChoice('low');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('low');
    expect(readQualityChoice()).toBe('low');
  });

  it('uses the explicit preset without probing the device', () => {
    const readProbe = vi.fn(() => DESKTOP);
    saveQualityChoice('medium');
    expect(currentQuality(readProbe)).toBe(QUALITY_PRESETS.medium);
    expect(readProbe).not.toHaveBeenCalled();
  });

  it('probes once and reuses the detected preset for auto', () => {
    const readProbe = vi.fn(() => probe({ coarsePointer: true }));
    expect(currentQuality(readProbe)).toBe(QUALITY_PRESETS.low);
    expect(currentQuality(readProbe)).toBe(QUALITY_PRESETS.low);
    expect(readProbe).toHaveBeenCalledOnce();
  });
});

describe('quality presets', () => {
  it('step down in cost from high to low', () => {
    const { high, medium, low } = QUALITY_PRESETS;
    expect([high, medium, low].map((preset) => preset.maxPixelRatio)).toEqual([1.5, 1.25, 1]);
    expect([high, medium, low].map((preset) => preset.msaaSamples)).toEqual([4, 2, 0]);
    expect([high, medium, low].map((preset) => preset.shadow.mapSize)).toEqual([2048, 1024, 512]);
    expect(low.bloom.enabled).toBe(false);
    expect(low.detail.extras).toBe(false);
  });
});
