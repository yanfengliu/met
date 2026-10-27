/**
 * Where the walk mode's walker can walk from a start (work unit 2, M4; docs/design/spec.md, Walk mode: No trap, no dead end): a flood fill over the walkable
 * floor in which every move is made by the real walker (./walker.ts) against a WalkWorld, the page's collision world or a fixture's.
 * A place is where the walker's feet stood at the end of a move, one per cell of a plan grid and band of height. From each place the fill tries the
 * centres of the four cells beside its own: the walker, put at rest on the place and set running toward the centre, is turned toward it every physics
 * step until it comes within ARRIVED of it or MOVE_STEPS steps pass, and wherever it then stands on the ground is a place. A move that leaves the ground
 * (off an edge higher than a step, onto a slope too steep to stand on) reaches nothing: the fill walks, it never falls or jumps. A move toward a cell that
 * already holds a place in the same band is not tried. Places are taken up in the order they were reached, or, given `toward`, nearest first by it,
 * so a fill that stops once its targets are met (`stop`) walks less of what lies away from them.
 * Bound: every place is reached by a chain of moves from the start, each a run of the real walker from where the last one ended, so a walker reaches every
 * place the fill reaches; the reverse does not hold, as a walker that comes at a passage on some other line than these moves can pass where they do not.
 * Cells of 0.5 m (the default) keep places on the two sides of a wall apart: the walker's centre stands its radius (0.35 m) off each face, so two such
 * centres lie 0.7 m and the wall's thickness apart, more than a cell's diagonal for any wall 1 cm thick. A run moves 4 cm a physics step, so a move
 * crosses a cell in about 12 steps.
 */
import { MOTION, Walker } from './walker.js';
import type { WalkInput, WalkWorld } from './walker.js';

export interface ReachOptions {
  /** The plan grid's cell, metres. Default 0.5. */
  readonly cell?: number;
  /** A place's band of height, metres: one place per cell and band. Default 0.3. */
  readonly band?: number;
  /** Whether the fill may walk to the plan point (x, z). Default: everywhere. */
  readonly inside?: (x: number, z: number) => boolean;
  /** Called with each new place's index and feet; the fill stops once it returns true. */
  readonly stop?: (place: number, x: number, y: number, z: number) => boolean;
  /** Which places to take up first: the least, as they stand when taken up (it may only grow for a place as the fill goes on). Default: the first reached. */
  readonly toward?: (x: number, y: number, z: number) => number;
}

/** At most this many physics steps a move: a third of a second, time to run 1.3 m. */
export const MOVE_STEPS = 40;
/** A move ends this close to the centre it heads for, metres. */
export const ARRIVED = 0.06;
/** `Walker.place` drops the feet from 1 m over the height it is given; a place is taken up again from 2 cm over its own feet. */
const PLACE_DROP = 1 - 0.02;
const RUN: WalkInput = Object.freeze({ forward: 1, right: 0, run: true });
const NEIGHBOURS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
/** A cell and band as one number: cells within ±1024 of the origin each way, bands within ±256. */
const key = (ix: number, iz: number, iy: number): number => ((ix + 1024) * 2048 + (iz + 1024)) * 512 + (iy + 256);
const planKey = (ix: number, iz: number): number => (ix + 1024) * 2048 + (iz + 1024);

/** A min-heap of places by priority. */
class Queue {
  private readonly items: number[] = [];
  private readonly keys: number[] = [];

  get size(): number {
    return this.items.length;
  }

  /** The least priority waiting, or Infinity. */
  get least(): number {
    return this.keys[0] ?? Number.POSITIVE_INFINITY;
  }

  push(item: number, priority: number): void {
    const { items, keys } = this;
    let i = items.length;
    items.push(item);
    keys.push(priority);
    while (i > 0) {
      const up = (i - 1) >> 1;
      if ((keys[up] ?? 0) <= priority) break;
      items[i] = items[up] ?? 0;
      keys[i] = keys[up] ?? 0;
      i = up;
    }
    items[i] = item;
    keys[i] = priority;
  }

  pop(): number {
    const { items, keys } = this;
    const top = items[0] ?? -1;
    const item = items.pop() ?? -1;
    const priority = keys.pop() ?? 0;
    if (items.length === 0) return top;
    let i = 0;
    for (;;) {
      const a = 2 * i + 1;
      if (a >= items.length) break;
      const b = a + 1 < items.length && (keys[a + 1] ?? 0) < (keys[a] ?? 0) ? a + 1 : a;
      if ((keys[b] ?? 0) >= priority) break;
      items[i] = items[b] ?? 0;
      keys[i] = keys[b] ?? 0;
      i = b;
    }
    items[i] = item;
    keys[i] = priority;
    return top;
  }
}

/** The places a fill reached: their feet, in the order reached, and the place each was reached from. */
export class Reach {
  /** x, y, z of each place's feet, three numbers a place. */
  readonly feet: number[] = [];
  /** The place each place was reached from; −1 for the start. */
  readonly from: number[] = [];
  private readonly byCell = new Map<number, number[]>();

  constructor(readonly cell: number) {}

  get count(): number {
    return this.from.length;
  }

  /** Place `i`'s feet as [x, y, z]. */
  at(i: number): [number, number, number] {
    return [this.feet[3 * i] ?? 0, this.feet[3 * i + 1] ?? 0, this.feet[3 * i + 2] ?? 0];
  }

  /** The places whose feet lie within `radius` of (x, z) in plan, nearest first. */
  near(x: number, z: number, radius: number): number[] {
    const found: [number, number][] = [];
    const span = Math.ceil(radius / this.cell);
    const cx = Math.floor(x / this.cell);
    const cz = Math.floor(z / this.cell);
    for (let ix = cx - span; ix <= cx + span; ix += 1) {
      for (let iz = cz - span; iz <= cz + span; iz += 1) {
        for (const i of this.byCell.get(planKey(ix, iz)) ?? []) {
          const d = Math.hypot((this.feet[3 * i] ?? 0) - x, (this.feet[3 * i + 2] ?? 0) - z);
          if (d <= radius) found.push([d, i]);
        }
      }
    }
    return found.sort((a, b) => a[0] - b[0]).map(([, i]) => i);
  }

  /** The nearest place to (x, z) in plan, any height, and its distance; null when nothing was reached. */
  nearest(x: number, z: number): { readonly place: number; readonly distance: number } | null {
    let best: { place: number; distance: number } | null = null;
    for (let i = 0; i < this.count; i += 1) {
      const d = Math.hypot((this.feet[3 * i] ?? 0) - x, (this.feet[3 * i + 2] ?? 0) - z);
      if (best === null || d < best.distance) best = { place: i, distance: d };
    }
    return best;
  }

  /** The places from the start to place `i`, the start first. */
  path(i: number): number[] {
    const out: number[] = [];
    for (let k = i; k >= 0; k = this.from[k] ?? -1) out.push(k);
    return out.reverse();
  }

  /** Adds a place; for the fill. */
  add(x: number, y: number, z: number, from: number): number {
    const i = this.count;
    this.feet.push(x, y, z);
    this.from.push(from);
    const k = planKey(Math.floor(x / this.cell), Math.floor(z / this.cell));
    const list = this.byCell.get(k);
    if (list === undefined) this.byCell.set(k, [i]);
    else list.push(i);
    return i;
  }
}

/**
 * Fills the floor reachable from the walker put down at (x, y, z) as `Walker.place` puts it (on the first surface under 1 m over that point, else on the
 * workspace ground at `floorY`), facing `yaw`.
 */
export function reach(world: WalkWorld, floorY: number, x: number, y: number, z: number, yaw: number, options: ReachOptions = {}): Reach {
  const cell = options.cell ?? 0.5;
  const band = options.band ?? 0.3;
  const inside = options.inside ?? ((): boolean => true);
  const walker = new Walker(world, floorY);
  const out = new Reach(cell);
  const seen = new Map<number, number>();
  const queue = new Queue();
  const toward = options.toward;
  const visit = (fx: number, fy: number, fz: number, from: number): boolean => {
    const k = key(Math.floor(fx / cell), Math.floor(fz / cell), Math.floor(fy / band));
    if (seen.has(k)) return false;
    const i = out.add(fx, fy, fz, from);
    seen.set(k, i);
    queue.push(i, toward === undefined ? i : toward(fx, fy, fz));
    return options.stop?.(i, fx, fy, fz) === true;
  };
  walker.place(x, y, z, yaw);
  if (visit(walker.feet.x, walker.feet.y, walker.feet.z, -1)) return out;
  while (queue.size > 0) {
    const head = queue.pop();
    const [px, py, pz] = out.at(head);
    if (toward !== undefined) {
      // Its priority may have grown since it was queued: if another place now comes first, it waits again.
      const now = toward(px, py, pz);
      if (now > queue.least) {
        queue.push(head, now);
        continue;
      }
    }
    const cx = Math.floor(px / cell);
    const cz = Math.floor(pz / cell);
    const iy = Math.floor(py / band);
    for (const [dx, dz] of NEIGHBOURS) {
      const tx = (cx + dx + 0.5) * cell;
      const tz = (cz + dz + 0.5) * cell;
      if (!inside(tx, tz) || seen.has(key(cx + dx, cz + dz, iy))) continue;
      const heading = Math.atan2(-(tx - px), -(tz - pz));
      walker.place(px, py - PLACE_DROP, pz, heading);
      walker.velocity.set(-Math.sin(heading) * MOTION.run, 0, -Math.cos(heading) * MOTION.run);
      let grounded = true;
      for (let s = 0; s < MOVE_STEPS; s += 1) {
        const ex = tx - walker.feet.x;
        const ez = tz - walker.feet.z;
        if (Math.hypot(ex, ez) < ARRIVED) break;
        walker.turn(wrap(Math.atan2(-ex, -ez) - walker.yaw), 0);
        walker.update(MOTION.fixedStep, RUN);
        if (!walker.onGround) {
          grounded = false;
          break;
        }
      }
      const { feet } = walker;
      if (grounded && inside(feet.x, feet.z) && visit(feet.x, feet.y, feet.z, head)) return out;
    }
  }
  return out;
}
