/**
 * The site grid: a rectilinear grid over the site whose lines include every block vertex, every zone edge and every plaza outline, so each
 * axis-aligned wall of the footprint falls on a cell edge and the ground stops exactly on the outline (docs/design/spec.md, World frame: block lines are walls).
 * Cells crossed by one of the few slanted outline edges (the Lehman Wing's chamfers) are clipped against it.
 * From the cells it builds the terrain surfaces, the vertical faces where zones of different height meet (curbs, retaining walls), the excavation faces
 * round the footprint, the site's outer edge, and the building pad.
 */
import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Uint32BufferAttribute, Vector2, Vector3 } from 'three';

import {
  FOUNTAIN_CENTRE_X,
  FOUNTAIN_CENTRE_Z,
  FOUNTAIN_SIZE,
  GROUND_FLOOR_Y,
  GROVE_CENTRE_X_INNER,
  GROVE_CENTRE_X_OUTER,
  GROVE_CENTRE_Z,
  GROVE_SIZE_X,
  GROVE_SIZE_Z,
  SITE_MAX_X,
  SITE_MIN_X,
  SITE_MIN_Z,
  STEPS_BOTTOM_Z,
  STEPS_HALF_WIDTH,
} from '../frame.js';
import { MeshBuilder, sheet } from '../lib/index.js';
import { BLOCKS, FOOTPRINT_XS, FOOTPRINT_ZS, SLANTED_EDGES, insideOutline, side } from './footprint.js';
import type { Point, SlantedEdge } from './footprint.js';
import { GROUND_MAX_Z, ZONE_XS, ZONE_ZS, isGrass, terrainY, zoneAt } from './ground.js';
import type { Zone } from './ground.js';

/** The building pad's top: just under the lowest floor of every block (the ground floor, frame.ts GROUND_FLOOR_Y), so later floors cover it. */
export const PAD_Y = GROUND_FLOOR_Y - 0.1;
/** Grid spacing between the required lines, metres. */
const STEP = 2.5;
/** A regular line closer than this to a required line is dropped, so no cell is a sliver unless two required lines are that close. */
const MIN_GAP = 0.35;
/** Where the front steps begin: the hunt worker builds everything at Z < +3.5 in front of the pavilion (coordinator, 2026-10-11). */
const STEPS_FRONT_Z = 3.5;

function lines(min: number, max: number, required: readonly number[]): number[] {
  const req = [...new Set(required.filter((v) => v >= min && v <= max).map((v) => Math.round(v * 1e6) / 1e6))].sort((a, b) => a - b);
  const all = [...req];
  for (let v = min; v <= max + 1e-9; v += STEP) {
    if (!req.some((r) => Math.abs(r - v) < MIN_GAP)) all.push(Math.round(v * 1e6) / 1e6);
  }
  return [...new Set(all)].sort((a, b) => a - b);
}

const plazaXs = [STEPS_HALF_WIDTH, FOUNTAIN_CENTRE_X - FOUNTAIN_SIZE / 2, FOUNTAIN_CENTRE_X + FOUNTAIN_SIZE / 2, GROVE_CENTRE_X_INNER - GROVE_SIZE_X / 2, GROVE_CENTRE_X_INNER + GROVE_SIZE_X / 2, GROVE_CENTRE_X_OUTER - GROVE_SIZE_X / 2, GROVE_CENTRE_X_OUTER + GROVE_SIZE_X / 2];
const plazaZs = [STEPS_FRONT_Z, STEPS_BOTTOM_Z, FOUNTAIN_CENTRE_Z - FOUNTAIN_SIZE / 2, FOUNTAIN_CENTRE_Z + FOUNTAIN_SIZE / 2, GROVE_CENTRE_Z - GROVE_SIZE_Z / 2, GROVE_CENTRE_Z + GROVE_SIZE_Z / 2];

/** Grid lines along X and Z. */
export const GRID_XS: readonly number[] = lines(SITE_MIN_X, SITE_MAX_X, [SITE_MIN_X, SITE_MAX_X, ...FOOTPRINT_XS, ...ZONE_XS, ...plazaXs, ...plazaXs.map((x) => -x)]);
export const GRID_ZS: readonly number[] = lines(SITE_MIN_Z, GROUND_MAX_Z, [SITE_MIN_Z, GROUND_MAX_Z, ...FOOTPRINT_ZS, ...ZONE_ZS, ...plazaZs]);

export interface Cell {
  readonly i: number;
  readonly j: number;
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
  /** The zone of the part outside the footprint, or null when the whole cell is inside it. */
  readonly zone: Zone | null;
  /** For a cell a slanted edge crosses: the edge and the two parts. */
  readonly cut: { readonly edge: SlantedEdge; readonly outside: readonly Point[]; readonly inside: readonly Point[] } | null;
}

/** Sutherland–Hodgman against one line: keeps the part of `polygon` where sign · side ≥ 0. */
function clip(polygon: readonly Point[], edge: SlantedEdge, sign: number): Point[] {
  const out: Point[] = [];
  for (let k = 0; k < polygon.length; k += 1) {
    const p = polygon[k] ?? [0, 0];
    const q = polygon[(k + 1) % polygon.length] ?? p;
    const sp = sign * side(edge.a, edge.b, p[0], p[1]);
    const sq = sign * side(edge.a, edge.b, q[0], q[1]);
    if (sp >= 0) out.push(p);
    if ((sp >= 0) !== (sq >= 0)) {
      const t = sp / (sp - sq);
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return out;
}

function crossing(edge: SlantedEdge, x0: number, x1: number, z0: number, z1: number): boolean {
  const lo = (u: number, v: number): number => Math.min(u, v);
  const hi = (u: number, v: number): number => Math.max(u, v);
  if (hi(edge.a[0], edge.b[0]) <= x0 || lo(edge.a[0], edge.b[0]) >= x1 || hi(edge.a[1], edge.b[1]) <= z0 || lo(edge.a[1], edge.b[1]) >= z1) return false;
  const s = [side(edge.a, edge.b, x0, z0), side(edge.a, edge.b, x1, z0), side(edge.a, edge.b, x1, z1), side(edge.a, edge.b, x0, z1)];
  return Math.min(...s) < -1e-9 && Math.max(...s) > 1e-9;
}

function area(polygon: readonly Point[]): number {
  let a = 0;
  for (let k = 0; k < polygon.length; k += 1) {
    const p = polygon[k] ?? [0, 0];
    const q = polygon[(k + 1) % polygon.length] ?? p;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

function classify(): Cell[] {
  const cells: Cell[] = [];
  for (let j = 0; j + 1 < GRID_ZS.length; j += 1) {
    for (let i = 0; i + 1 < GRID_XS.length; i += 1) {
      const x0 = GRID_XS[i] ?? 0;
      const x1 = GRID_XS[i + 1] ?? 0;
      const z0 = GRID_ZS[j] ?? 0;
      const z1 = GRID_ZS[j + 1] ?? 0;
      const edge = SLANTED_EDGES.find((e) => crossing(e, x0, x1, z0, z1));
      if (edge === undefined) {
        const cx = (x0 + x1) / 2;
        const cz = (z0 + z1) / 2;
        cells.push({ i, j, x0, x1, z0, z1, zone: insideOutline(cx, cz) ? null : zoneAt(cx, cz), cut: null });
        continue;
      }
      const rect: Point[] = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
      const outside = clip(rect, edge, edge.outside);
      const inside = clip(rect, edge, -edge.outside);
      const ox = outside.reduce((s, p) => s + p[0], 0) / Math.max(1, outside.length);
      const oz = outside.reduce((s, p) => s + p[1], 0) / Math.max(1, outside.length);
      const open = Math.abs(area(outside)) > 1e-9 && !insideOutline(ox, oz);
      cells.push({ i, j, x0, x1, z0, z1, zone: open ? zoneAt(ox, oz) : null, cut: { edge, outside, inside } });
    }
  }
  return cells;
}

/** The classified cells, built once. */
export const CELLS: readonly Cell[] = classify();

/** The cell at grid index (i, j), or undefined outside the grid. */
export function cellAt(i: number, j: number): Cell | undefined {
  if (i < 0 || j < 0 || i + 1 >= GRID_XS.length || j + 1 >= GRID_ZS.length) return undefined;
  return CELLS[j * (GRID_XS.length - 1) + i];
}

// ---------------------------------------------------------------- surfaces

/** An indexed surface with smooth normals averaged over its own faces (zones never share vertices, so curbs and walls stay sharp). */
class Surface {
  private readonly positions: number[] = [];
  private readonly indices: number[] = [];
  private readonly ids = new Map<string, number>();

  vertex(key: string, x: number, y: number, z: number): number {
    const known = this.ids.get(key);
    if (known !== undefined) return known;
    const id = this.positions.length / 3;
    this.positions.push(x, y, z);
    this.ids.set(key, id);
    return id;
  }

  /** A convex polygon given counter-clockwise in (x, z) with z up; emitted facing +Y. */
  fan(ids: readonly number[]): void {
    const first = ids[0];
    if (first === undefined) return;
    for (let k = ids.length - 1; k > 1; k -= 1) this.indices.push(first, ids[k] ?? first, ids[k - 1] ?? first);
  }

  build(): BufferGeometry {
    const normals = new Float32Array(this.positions.length);
    const a = new Vector3();
    const b = new Vector3();
    const c = new Vector3();
    for (let t = 0; t < this.indices.length; t += 3) {
      const ia = this.indices[t] ?? 0;
      const ib = this.indices[t + 1] ?? 0;
      const ic = this.indices[t + 2] ?? 0;
      a.fromArray(this.positions, ia * 3);
      b.fromArray(this.positions, ib * 3).sub(a);
      c.fromArray(this.positions, ic * 3).sub(a);
      const n = b.cross(c);
      for (const v of [ia, ib, ic]) {
        normals[v * 3] = (normals[v * 3] ?? 0) + n.x;
        normals[v * 3 + 1] = (normals[v * 3 + 1] ?? 0) + n.y;
        normals[v * 3 + 2] = (normals[v * 3 + 2] ?? 0) + n.z;
      }
    }
    for (let v = 0; v < normals.length; v += 3) {
      const len = Math.hypot(normals[v] ?? 0, normals[v + 1] ?? 0, normals[v + 2] ?? 0);
      if (len > 1e-12) {
        normals[v] = (normals[v] ?? 0) / len;
        normals[v + 1] = (normals[v + 1] ?? 0) / len;
        normals[v + 2] = (normals[v + 2] ?? 0) / len;
      } else normals[v + 1] = 1;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    geometry.setIndex(new Uint32BufferAttribute(this.indices, 1));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }
}

/** A vertical quad from `bottom` to `top` heights over the segment p → q, turned to face the horizontal direction `toward`. */
function wallQuad(builder: MeshBuilder, p: Point, q: Point, bottomP: number, topP: number, bottomQ: number, topQ: number, toward: Point): void {
  if (topP - bottomP < 1e-4 && topQ - bottomQ < 1e-4) return;
  const quad = [new Vector3(p[0], bottomP, p[1]), new Vector3(q[0], bottomQ, q[1]), new Vector3(q[0], topQ, q[1]), new Vector3(p[0], topP, p[1])];
  // As listed, the quad faces (−ez, 0, ex) for e = q − p; reverse it when that points away from `toward`.
  const ex = q[0] - p[0];
  const ez = q[1] - p[1];
  if (-ez * toward[0] + ex * toward[1] < 0) quad.reverse();
  builder.polygon(quad);
}

export interface GroundGeometry {
  /** Park and island terrain (grass). */
  readonly grass: BufferGeometry;
  /** The graded street band and drives (bare earth until paved). */
  readonly bare: BufferGeometry;
  /** Faces where a paved zone drops to another: curb faces and the drives' edges. */
  readonly curbs: BufferGeometry;
  /** Faces where the park stands above another zone: retaining walls. */
  readonly walls: BufferGeometry;
  /** The excavation's faces round the footprint, from the ground down to the pad, facing into it; and the site's outer edge. */
  readonly cuts: BufferGeometry;
  /** The building pad over the whole footprint, facing up. */
  readonly pad: BufferGeometry;
}

function buildPad(): BufferGeometry {
  // The blocks tile the outline, so triangulating each one covers the footprint once.
  const builder = new MeshBuilder();
  for (const block of BLOCKS) {
    const contour = block.polygon.map(([x, z]) => new Vector2(x, z));
    for (const [a = 0, b = 0, c = 0] of ShapeUtils.triangulateShape(contour, [])) {
      const pa = block.polygon[a] ?? [0, 0];
      const pb = block.polygon[b] ?? [0, 0];
      const pc = block.polygon[c] ?? [0, 0];
      const tri = [new Vector3(pa[0], PAD_Y, pa[1]), new Vector3(pb[0], PAD_Y, pb[1]), new Vector3(pc[0], PAD_Y, pc[1])];
      // Face up whichever way the block's polygon winds.
      if ((pb[0] - pa[0]) * (pc[1] - pa[1]) - (pc[0] - pa[0]) * (pb[1] - pa[1]) > 0) tri.reverse();
      builder.polygon(tri);
    }
  }
  return builder.build();
}

function buildGround(): GroundGeometry {
  const grass = new Surface();
  const bare = new Surface();
  const curbs = new MeshBuilder();
  const walls = new MeshBuilder();
  const cuts = new MeshBuilder();
  const heights = new Map<string, number>();
  const nodeKey = (zone: Zone, x: number, z: number): string => `${zone}|${x.toFixed(4)}|${z.toFixed(4)}`;
  const h = (zone: Zone, x: number, z: number): number => {
    const key = nodeKey(zone, x, z);
    let y = heights.get(key);
    if (y === undefined) {
      y = terrainY(zone, x, z);
      heights.set(key, y);
    }
    return y;
  };

  for (const cell of CELLS) {
    const { x0, x1, z0, z1, zone } = cell;
    if (zone === null) continue;
    const surface = isGrass(zone) ? grass : bare;
    const outline: readonly Point[] = cell.cut?.outside ?? [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
    surface.fan(outline.map(([x, z]) => surface.vertex(nodeKey(zone, x, z), x, h(zone, x, z), z)));
    if (cell.cut !== null) {
      // The excavation along the slanted line: the outline's points that lie on it, facing the inside part.
      const { a, b } = cell.cut.edge;
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const [p, q] = cell.cut.outside.filter(([x, z]) => Math.abs(side(a, b, x, z)) / length < 1e-6);
      const inside = cell.cut.inside;
      if (p !== undefined && q !== undefined && inside.length > 0) {
        const cx = inside.reduce((sum, v) => sum + v[0], 0) / inside.length;
        const cz = inside.reduce((sum, v) => sum + v[1], 0) / inside.length;
        wallQuad(cuts, p, q, PAD_Y, h(zone, p[0], p[1]), PAD_Y, h(zone, q[0], q[1]), [cx - (p[0] + q[0]) / 2, cz - (p[1] + q[1]) / 2]);
      }
      continue;
    }
    // Each side: the site's outer edge, the excavation where the neighbour is inside the footprint, or a face where two zones meet.
    for (const [di, dj] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ] as const) {
      const other = cellAt(cell.i + di, cell.j + dj);
      const p: Point = di === 1 ? [x1, z0] : di === -1 ? [x0, z1] : dj === 1 ? [x1, z1] : [x0, z0];
      const q: Point = di === 1 ? [x1, z1] : di === -1 ? [x0, z0] : dj === 1 ? [x0, z1] : [x1, z0];
      const toward: Point = [di, dj];
      if (other === undefined || (other.zone === null && other.cut === null)) {
        // Earth down to the pad's level, facing out of the site or into the footprint.
        wallQuad(cuts, p, q, PAD_Y, h(zone, p[0], p[1]), PAD_Y, h(zone, q[0], q[1]), toward);
        continue;
      }
      if (other.cut !== null || other.zone === null || other.zone === zone || di < 0 || dj < 0) continue;
      // One face per shared edge, from the lower zone's level up to the higher one's, facing the lower zone.
      const a0 = h(zone, p[0], p[1]);
      const a1 = h(zone, q[0], q[1]);
      const b0 = h(other.zone, p[0], p[1]);
      const b1 = h(other.zone, q[0], q[1]);
      const otherHigher = b0 + b1 > a0 + a1;
      // The park standing above a paved zone is held by a retaining wall; a paved zone or the island stepping down has a curb.
      const target = (otherHigher ? other.zone : zone) === 'park' ? walls : curbs;
      const facing: Point = otherHigher ? [-di, -dj] : toward;
      wallQuad(target, p, q, Math.min(a0, b0), Math.max(a0, b0), Math.min(a1, b1), Math.max(a1, b1), facing);
    }
  }
  // The terrain and the pad are sheets, surfaces with no inside (../lib/sheet.ts); the curbs, walls and cuts are faces along vertical lines.
  return { grass: sheet(grass.build()), bare: sheet(bare.build()), curbs: curbs.build(), walls: walls.build(), cuts: cuts.build(), pad: sheet(buildPad()) };
}

let ground: GroundGeometry | null = null;

/** The ground's geometries, built on first use and shared by every step that needs them. */
export function groundGeometry(): GroundGeometry {
  ground ??= buildGround();
  return ground;
}
