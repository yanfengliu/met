/**
 * The ground under a walker's footprint (docs/design/spec.md, Walk mode: Ground), for ./walker.ts: the surface under the body's centre or, over a gap or
 * groove there, the lower rim of a pair of opposite side probes STRADDLE (0.3 m) out, whichever is higher, so a body bridges a gap narrower than itself
 * yet falls off an edge as soon as its centre passes it; and whether pieces were built under its sides, for the walker's check after a build.
 * Bound: four pairs of probes, along X, along Z and on both diagonals, 0.6 m apart; a pair bridges a groove where both its probes stand on the rims,
 * so a groove under 0.27 m wide (0.3 m × cos 22.5°) is bridged wherever the centre stands in it, at any angle to the axes.
 */
import type { GroundHit } from './collision.js';
import type { WalkWorld } from './walker.js';

/** How far out the side probes stand, metres: a gap narrower than twice this is bridged. */
export const STRADDLE = 0.3;
const DIAGONAL = STRADDLE * Math.SQRT1_2;
/** One of each pair of opposite side probes; the other is its negative. */
const SIDES: readonly (readonly [number, number])[] = [[STRADDLE, 0], [0, STRADDLE], [DIAGONAL, DIAGONAL], [DIAGONAL, -DIAGONAL]];

export class Footing {
  private readonly sideA: GroundHit = { y: 0, normalY: 1, normalX: 0, normalZ: 0 };
  private readonly sideB: GroundHit = { y: 0, normalY: 1, normalX: 0, normalZ: 0 };

  constructor(private readonly world: WalkWorld) {}

  /**
   * The ground under a body whose centre stands at (x, z), from height `top` down `length`, into `hit`: under the centre, or the lower rim of a pair of
   * opposite side probes where that is higher (a gap or groove under the centre). The side probes run only when the centre finds nothing at `level` or above.
   */
  ground(x: number, z: number, top: number, length: number, level: number, hit: GroundHit): boolean {
    const found = this.world.groundBelow(x, top, z, length, hit);
    if (found && hit.y >= level) return true;
    return this.rims(x, z, top, length, hit, found ? hit.y : Number.NEGATIVE_INFINITY) || found;
  }

  /** Into `hit`, the highest lower rim of a pair of opposite side probes of a body at (x, z), from `top` down `length`, where one is higher than `above`. */
  rims(x: number, z: number, top: number, length: number, hit: GroundHit, above = Number.NEGATIVE_INFINITY): boolean {
    const { world, sideA, sideB } = this;
    let best = above;
    for (const [dx, dz] of SIDES) {
      if (!world.groundBelow(x + dx, top, z + dz, length, sideA) || !world.groundBelow(x - dx, top, z - dz, length, sideB)) continue;
      const rim = sideA.y <= sideB.y ? sideA : sideB;
      if (rim.y > best) {
        Object.assign(hit, rim);
        best = rim.y;
      }
    }
    return best > above;
  }

  /** Whether a piece numbered `from` or later crosses the line under one of the side probes of a body at (x, z) over `low` and at most `top`. */
  builtUnder(x: number, z: number, low: number, top: number, from: number): boolean {
    const meets = (px: number, pz: number): boolean => this.world.crossings(px, pz, low, top).some((p) => p.instance >= from && p.heights.some((h) => h > low && h <= top));
    return SIDES.some(([dx, dz]) => meets(x + dx, z + dz) || meets(x - dx, z - dz));
  }
}
