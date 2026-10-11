/**
 * Motion: where a piece is at its own progress `p` in (0, 1), and its arrival tint (docs/design/spec.md, Timeline position).
 * Every function here is pure: the same inputs give the same float32 bytes, which is what makes the timeline path-independent.
 * Bound: at `p = 1` the timeline writes the final matrix itself instead of calling `writeMovingMatrix`, so rest positions are exact by construction.
 */
import type { Motion } from './types.js';

/** The rise/drop distance when a step does not set one: the piece's own height, at least this many metres. */
export const MIN_TRAVEL = 3;

/** The smallest scale `grow` and `pop` write, so a just-started piece never has a singular matrix. */
export const MIN_SCALE = 1e-3;

/** Multiplies the material colour of a piece that has just started to arrive; fades to white as it lands. Values above 1 brighten. */
export const ARRIVAL_TINT: readonly [number, number, number] = [2, 1.15, 0.35];

/** The overshoot constant of `pop` (about 5% at the peak). */
const POP_BACK = 1.2;

/** World bounding box of one piece. */
export interface PieceBox {
  readonly minX: number;
  readonly minY: number;
  readonly minZ: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly maxZ: number;
}

export function easeOutCubic(p: number): number {
  const u = 1 - p;
  return 1 - u * u * u;
}

export function easeOutBack(p: number): number {
  const u = p - 1;
  return 1 + (POP_BACK + 1) * u * u * u + POP_BACK * u * u;
}

/**
 * Writes the three per-piece motion parameters at `out[offset..offset+2]`:
 * the offset at `p = 0` for `rise`, `drop` and `slide`; the pivot for `grow` (bounding-box bottom centre) and `pop` (bounding-box centre).
 */
export function writeMotionParams(motion: Motion, box: PieceBox, out: Float64Array, offset: number): void {
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  const cz = (box.minZ + box.maxZ) / 2;
  const travel = Math.max(box.maxY - box.minY, MIN_TRAVEL);
  switch (motion.kind) {
    case 'rise':
      out.set([0, -(motion.distance ?? travel), 0], offset);
      break;
    case 'drop':
      out.set([0, motion.distance ?? travel, 0], offset);
      break;
    case 'slide':
      out.set(motion.from, offset);
      break;
    case 'grow':
      out.set([cx, box.minY, cz], offset);
      break;
    case 'pop':
      out.set([cx, cy, cz], offset);
      break;
  }
}

/** The world box a piece sweeps at `p = 0`, for conservative culling bounds: the final box moved by the start offset, or the final box itself for scaling motions. */
export function startBox(kind: Motion['kind'], box: PieceBox, params: Float64Array, offset: number): PieceBox {
  if (kind === 'grow' || kind === 'pop') return box;
  const dx = params[offset] ?? 0;
  const dy = params[offset + 1] ?? 0;
  const dz = params[offset + 2] ?? 0;
  return {
    minX: box.minX + dx,
    minY: box.minY + dy,
    minZ: box.minZ + dz,
    maxX: box.maxX + dx,
    maxY: box.maxY + dy,
    maxZ: box.maxZ + dz,
  };
}

/**
 * Writes the moving matrix of one piece at progress `p` in (0, 1) into `out` (16 floats at `outOffset`), from its final matrix (16 doubles at `finalOffset`).
 * Final matrices are affine (bottom row 0, 0, 0, 1), as `Kit.add` checks.
 */
export function writeMovingMatrix(
  kind: Motion['kind'],
  p: number,
  finals: Float64Array,
  finalOffset: number,
  params: Float64Array,
  paramOffset: number,
  out: Float32Array,
  outOffset: number,
): void {
  for (let k = 0; k < 16; k += 1) out[outOffset + k] = finals[finalOffset + k] ?? 0;
  const a = params[paramOffset] ?? 0;
  const b = params[paramOffset + 1] ?? 0;
  const c = params[paramOffset + 2] ?? 0;
  switch (kind) {
    case 'rise':
    case 'drop':
    case 'slide': {
      const left = 1 - easeOutCubic(p);
      out[outOffset + 12] = (finals[finalOffset + 12] ?? 0) + a * left;
      out[outOffset + 13] = (finals[finalOffset + 13] ?? 0) + b * left;
      out[outOffset + 14] = (finals[finalOffset + 14] ?? 0) + c * left;
      break;
    }
    case 'grow': {
      // Scale world Y about the plane y = b: the matrix's Y row times s, plus (1 - s) * b in translation.
      const s = Math.max(MIN_SCALE, easeOutCubic(p));
      for (const k of [1, 5, 9]) out[outOffset + k] = s * (finals[finalOffset + k] ?? 0);
      out[outOffset + 13] = s * (finals[finalOffset + 13] ?? 0) + (1 - s) * b;
      break;
    }
    case 'pop': {
      // Scale uniformly about the point (a, b, c).
      const s = Math.max(MIN_SCALE, easeOutBack(p));
      for (const k of [0, 1, 2, 4, 5, 6, 8, 9, 10]) out[outOffset + k] = s * (finals[finalOffset + k] ?? 0);
      out[outOffset + 12] = s * (finals[finalOffset + 12] ?? 0) + (1 - s) * a;
      out[outOffset + 13] = s * (finals[finalOffset + 13] ?? 0) + (1 - s) * b;
      out[outOffset + 14] = s * (finals[finalOffset + 14] ?? 0) + (1 - s) * c;
      break;
    }
  }
}

/** Writes the arrival tint at progress `p` in (0, 1): the full tint just after the start, white at landing. */
export function writeTint(p: number, out: Float32Array, offset: number): void {
  const w = p * p;
  out[offset] = ARRIVAL_TINT[0] + (1 - ARRIVAL_TINT[0]) * w;
  out[offset + 1] = ARRIVAL_TINT[1] + (1 - ARRIVAL_TINT[1]) * w;
  out[offset + 2] = ARRIVAL_TINT[2] + (1 - ARRIVAL_TINT[2]) * w;
}

/** Light intensity factor at step progress `f`: 0 before the step, 1 once it is complete (smoothstep in between). */
export function lightRamp(f: number): number {
  if (f <= 0) return 0;
  if (f >= 1) return 1;
  return f * f * (3 - 2 * f);
}
