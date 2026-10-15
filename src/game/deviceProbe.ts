export interface DeviceProbe {
  readonly pixelRatio: number;
  readonly cores: number | undefined;
  readonly memoryGb: number | undefined;
  readonly gpu: string | undefined;
  readonly coarsePointer: boolean;
}

const COARSE_POINTER_QUERY = '(pointer: coarse)';
const MASKED_RENDERER = /^webkit webgl$/i;

export function readDeviceProbe(): DeviceProbe {
  return {
    pixelRatio: window.devicePixelRatio,
    cores: navigator.hardwareConcurrency || undefined,
    memoryGb: readDeviceMemory(),
    gpu: readGpuName(),
    coarsePointer: hasCoarsePointer(),
  };
}

export function hasCoarsePointer(): boolean {
  return window.matchMedia(COARSE_POINTER_QUERY).matches;
}

function readDeviceMemory(): number | undefined {
  if (!('deviceMemory' in navigator)) return undefined;
  const memory = navigator.deviceMemory;
  return typeof memory === 'number' ? memory : undefined;
}

function readGpuName(): string | undefined {
  const gl = document.createElement('canvas').getContext('webgl');
  if (!gl) return undefined;
  try {
    return rendererName(gl);
  } finally {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

function rendererName(gl: WebGLRenderingContext): string | undefined {
  const name: unknown = gl.getParameter(gl.RENDERER);
  if (typeof name === 'string' && !MASKED_RENDERER.test(name)) return name;
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  const unmasked: unknown = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : undefined;
  return typeof unmasked === 'string' ? unmasked : undefined;
}
