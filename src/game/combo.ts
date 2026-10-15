export type CalloutKind = 'super' | 'mega' | 'ultra' | 'legend' | 'master';

const CALLOUTS: ReadonlyArray<[combo: number, kind: CalloutKind]> = [
  [5, 'super'],
  [10, 'mega'],
  [15, 'ultra'],
  [20, 'legend'],
  [30, 'master'],
];

export const FEVER_COMBO = 15;
export const FEVER_MULTIPLIER = 2;

export function calloutFor(combo: number): CalloutKind | undefined {
  return CALLOUTS.find(([threshold]) => threshold === combo)?.[1];
}
