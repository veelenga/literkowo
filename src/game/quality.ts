import { readStorage, writeStorage } from '../storage';
import { readDeviceProbe, type DeviceProbe } from './deviceProbe';

export const QUALITY_LEVELS = ['high', 'medium', 'low'] as const;
export type QualityLevel = (typeof QUALITY_LEVELS)[number];

export const AUTO_QUALITY = 'auto';
export const QUALITY_CHOICES = [AUTO_QUALITY, ...QUALITY_LEVELS] as const;
export type QualityChoice = (typeof QUALITY_CHOICES)[number];

export interface SceneDetail {
  readonly particles: number;
  readonly props: number;
  readonly extras: boolean;
}

export interface BloomSetting {
  readonly enabled: boolean;
  readonly scale: number;
}

export interface ShadowSetting {
  readonly mapSize: number;
  readonly soft: boolean;
}

export interface QualityPreset {
  readonly level: QualityLevel;
  readonly maxPixelRatio: number;
  readonly msaaSamples: number;
  readonly bloom: BloomSetting;
  readonly shadow: ShadowSetting;
  readonly detail: SceneDetail;
}

export const QUALITY_PRESETS: Readonly<Record<QualityLevel, QualityPreset>> = {
  high: {
    level: 'high',
    maxPixelRatio: 1.5,
    msaaSamples: 4,
    bloom: { enabled: true, scale: 0.5 },
    shadow: { mapSize: 2048, soft: true },
    detail: { particles: 1, props: 1, extras: true },
  },
  medium: {
    level: 'medium',
    maxPixelRatio: 1.25,
    msaaSamples: 2,
    bloom: { enabled: true, scale: 0.5 },
    shadow: { mapSize: 1024, soft: false },
    detail: { particles: 0.6, props: 0.75, extras: true },
  },
  low: {
    level: 'low',
    maxPixelRatio: 1,
    msaaSamples: 0,
    bloom: { enabled: false, scale: 0.5 },
    shadow: { mapSize: 512, soft: false },
    detail: { particles: 0.35, props: 0.5, extras: false },
  },
};

const STORAGE_KEY = 'literkowo.quality';
const LEVEL_RANK: Record<QualityLevel, number> = { low: 0, medium: 1, high: 2 };
const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|software|basic render/i;
const INTEGRATED_GPU = /apple|intel|mali|adreno|powervr/i;
const LOW_MEMORY_GB = 4;
const MEDIUM_MEMORY_GB = 8;
const LOW_CORES = 4;
const MEDIUM_CORES = 8;
const DENSE_PIXEL_RATIO = 2;

let detectedLevel: QualityLevel | undefined;

export function resolveQuality(probe: DeviceProbe): QualityLevel {
  return lowest([
    probe.coarsePointer ? 'low' : 'high',
    gpuLimit(probe.gpu),
    countLimit(probe.memoryGb, LOW_MEMORY_GB, MEDIUM_MEMORY_GB),
    countLimit(probe.cores, LOW_CORES, MEDIUM_CORES),
    probe.pixelRatio > DENSE_PIXEL_RATIO ? 'medium' : 'high',
  ]);
}

export function readQualityChoice(): QualityChoice {
  const stored = readStorage(STORAGE_KEY);
  return QUALITY_CHOICES.find((choice) => choice === stored) ?? AUTO_QUALITY;
}

export function saveQualityChoice(choice: QualityChoice): void {
  writeStorage(STORAGE_KEY, choice);
}

export function currentQuality(probe: () => DeviceProbe = readDeviceProbe): QualityPreset {
  const choice = readQualityChoice();
  if (choice !== AUTO_QUALITY) return QUALITY_PRESETS[choice];
  detectedLevel ??= resolveQuality(probe());
  return QUALITY_PRESETS[detectedLevel];
}

function gpuLimit(gpu: string | undefined): QualityLevel {
  if (gpu === undefined) return 'high';
  if (SOFTWARE_GPU.test(gpu)) return 'low';
  return INTEGRATED_GPU.test(gpu) ? 'medium' : 'high';
}

function countLimit(
  value: number | undefined,
  lowBelow: number,
  mediumBelow: number,
): QualityLevel {
  if (value === undefined) return 'high';
  if (value < lowBelow) return 'low';
  return value < mediumBelow ? 'medium' : 'high';
}

function lowest(levels: QualityLevel[]): QualityLevel {
  return levels.reduce((worst, level) => (LEVEL_RANK[level] < LEVEL_RANK[worst] ? level : worst));
}
