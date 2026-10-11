/**
 * Stagger: the order a step's pieces arrive in, and each piece's window of the step's local progress `f` (docs/design/spec.md, Timeline position).
 * Keys are ranked over their distinct values, so pacing is even whatever the spacing of the pieces: rank r of R starts at r / (R - 1) * (1 - d) and lasts d.
 * Bound: windows depend only on the keys, so equal keys give equal windows, a smaller key never starts later, and every window lies inside [0, 1].
 */
import type { Stagger } from './types.js';

/** The shortest window a piece gets, as a fraction of its step. A step with fewer than 4 distinct keys gives each key 1 / R of it. */
export const MIN_WINDOW = 0.25;

/** Spatial keys are rounded to this many metres, so the parts of a composite piece arrive together. */
export const KEY_QUANTUM = 0.01;

/** What a stagger needs to know about one piece. */
export interface StaggerInput {
  /** World bounding-box centre. */
  readonly cx: number;
  readonly cy: number;
  readonly cz: number;
  /** The `order` argument of `Kit.add`, or the call's index within the step. */
  readonly order: number;
}

function quantize(value: number): number {
  return Math.round(value / KEY_QUANTUM) * KEY_QUANTUM;
}

/** One key per piece; smaller keys arrive first. `centreX`/`centreZ` are the centre of the step's bounds, for `radial`. */
export function staggerKeys(stagger: Stagger, pieces: readonly StaggerInput[], centreX: number, centreZ: number): Float64Array {
  const keys = new Float64Array(pieces.length);
  pieces.forEach((piece, i) => {
    switch (stagger) {
      case 'order':
        keys[i] = piece.order;
        break;
      case 'x':
        keys[i] = quantize(piece.cx);
        break;
      case '-x':
        keys[i] = quantize(-piece.cx);
        break;
      case 'z':
        keys[i] = quantize(piece.cz);
        break;
      case '-z':
        keys[i] = quantize(-piece.cz);
        break;
      case 'y':
        keys[i] = quantize(piece.cy);
        break;
      case 'radial':
        keys[i] = quantize(Math.hypot(piece.cx - centreX, piece.cz - centreZ));
        break;
      case 'none':
        keys[i] = 0;
        break;
    }
  });
  return keys;
}

/** Each piece's window of local progress: it is hidden while `f <= start`, moving while `start < f < end`, and at rest from `end` on. */
export interface Windows {
  readonly start: Float64Array;
  readonly end: Float64Array;
  /** The window length shared by every piece of the step. */
  readonly duration: number;
  /** The number of distinct keys. */
  readonly ranks: number;
}

export function windowsFromKeys(keys: Float64Array): Windows {
  const distinct = Array.from(new Set(keys)).sort((a, b) => a - b);
  const ranks = distinct.length;
  const rankOf = new Map<number, number>();
  distinct.forEach((key, rank) => rankOf.set(key, rank));
  const duration = ranks === 0 ? 1 : Math.max(MIN_WINDOW, 1 / ranks);
  const start = new Float64Array(keys.length);
  const end = new Float64Array(keys.length);
  keys.forEach((key, i) => {
    const rank = rankOf.get(key) ?? 0;
    const a = ranks <= 1 ? 0 : (rank / (ranks - 1)) * (1 - duration);
    start[i] = a;
    end[i] = Math.min(1, a + duration);
  });
  return { start, end, duration, ranks };
}
