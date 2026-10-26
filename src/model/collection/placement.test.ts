/**
 * The collection placed in the finished model (docs/design/spec.md, Collection): the whole sequence's Timeline at t = N, and apart from it the model
 * without the collection's steps, as a collision world (solid pieces, three-mesh-bvh) and a picker (drawn pieces). Every artwork's every piece (object,
 * plinth, vitrine, frame) is checked by its real bounds, at its final matrix:
 * - it stands at t = N: its step is complete, every mesh of it drawn in full;
 * - a standing artwork's floor, under its footprint's middle and corners, is the level its placement names, within 12 mm (no float, no sinking);
 * - a hung one has a wall behind its back, within 4 cm, at its middle and corners;
 * - no other solid piece passes through any of its pieces (vertical lines 0.1 m apart over each piece, crossings and insides);
 * - it is 1 m clear of the walking routes R1–R4 (src/model/hunt/routes.ts) and M1's R5 into gallery 600 (beyond the walker's radius), of the
 *   Weston door's passage, of the swing of the doors that open (the Hunt central arch's three, the Weston door), of M1's doorway into gallery 600
 *   and its Dendur gate threshold, and of the Dendur pool;
 * - the step's artworks stand at least 5 cm apart in plan, which their shared material needs (material.ts);
 * - the placeholders take at most 110 meshes and 600,000 triangles of the model's budgets.
 * Bound: lines 0.1 m apart miss a solid thinner than that between them; a footprint is its pieces' boxes, not their curves; routes and door swings are
 * plan shapes on their floor, compared with artworks within 1 m of that floor. M1's R5, doorway and gate are restated here until M1 is merged.
 */
import { Box3, Layers, Ray, Vector3 } from 'three';
import type { InstancedMesh } from 'three';
import { beforeAll, describe, expect, it } from 'vitest';

import { SEQUENCE } from '../../build/sequence.js';
import { Timeline } from '../../build/timeline.js';
import type { BuiltStep } from '../../build/timeline.js';
import { ModelPicker } from '../../viewer/pick.js';
import { GeometryBvhs } from '../../walk/bvh-cache.js';
import { CollisionWorld, collisionMeshes } from '../../walk/collision.js';
import type { GroundHit } from '../../walk/collision.js';
import { BODY } from '../../walk/walker.js';
import { WESTON_DOOR } from '../core/weston-facade.js';
import { MAIN_FLOOR_Y, SACKLER_MAX_Z, SECOND_FLOOR_Y } from '../frame.js';
import { OPENINGS } from '../hunt/arches.js';
import { SCREEN_Z } from '../hunt/dims.js';
import { ROUTE_R1, ROUTE_R2, ROUTE_R3, ROUTE_R4 } from '../hunt/routes.js';
import type { Route } from '../hunt/routes.js';
import { PLATFORM_Y, POOL } from '../roche-north/plan.js';
import { SPACES } from './picks.js';
import { entryOf, stepArtworks } from './place.js';
import type { ArtPiece, CollectionStepDef } from './place.js';
import { SPACES_A } from './spaces-a.js';
import { SPACES_B } from './spaces-b.js';

const DEFS: readonly CollectionStepDef[] = [...SPACES_A, ...SPACES_B];
/** Clearance from a corridor beyond the walker's body, and from a door's swing (metres). */
const CLEARANCE = 1;
/** The placeholders' share of the model's budgets (docs/design/spec.md, Budgets; plan 2, review 0, F9). */
const MAX_MESHES = 110;
const MAX_TRIANGLES = 600_000;
/** M1's route R5 up the Grand Staircase and through the cross hall's new doorway into gallery 600 (walker walk2, 2026-10-25), until it is merged. */
const ROUTE_R5: Route = { id: 'R5 (M1)', points: [[0, -24.7], [0, -72.5]], startY: MAIN_FLOOR_Y, endY: SECOND_FLOOR_Y };
const ROUTES: readonly Route[] = [ROUTE_R1, ROUTE_R2, ROUTE_R3, ROUTE_R4, ROUTE_R5];

/** A plan rectangle on a floor level, kept clear by `margin`: a door's swing, a passage through a door. */
interface Zone {
  readonly name: string;
  readonly y: number;
  readonly min: readonly [number, number];
  readonly max: readonly [number, number];
  readonly margin: number;
}

const HUNT_DOOR_Z = SCREEN_Z + 0.07;
const widest = Math.max(...OPENINGS.map(([a, b]) => b - a));
const ZONES: readonly Zone[] = [
  // The central arch's doors swing either way, each leaf at most an opening wide.
  { name: 'Hunt central doors swing', y: MAIN_FLOOR_Y, min: [OPENINGS[0]?.[0] ?? 0, HUNT_DOOR_Z - widest], max: [OPENINGS[2]?.[1] ?? 0, HUNT_DOOR_Z + widest], margin: CLEARANCE },
  { name: 'Weston door swing', y: MAIN_FLOOR_Y, min: [WESTON_DOOR.x - WESTON_DOOR.width, WESTON_DOOR.z - WESTON_DOOR.width / 2], max: [WESTON_DOOR.x + WESTON_DOOR.width, WESTON_DOOR.z + WESTON_DOOR.width / 2], margin: CLEARANCE },
  { name: 'Weston door passage', y: MAIN_FLOOR_Y, min: [WESTON_DOOR.x - 6, WESTON_DOOR.z - WESTON_DOOR.width / 2], max: [WESTON_DOOR.x + 6, WESTON_DOOR.z + WESTON_DOOR.width / 2], margin: CLEARANCE + BODY.radius },
  // M1's changes (walker walk2, 2026-10-25): the doorway from the cross hall into gallery 600 with its returns, and the Dendur gate's threshold and rail.
  { name: 'gallery 600 doorway (M1)', y: SECOND_FLOOR_Y, min: [-2.05, -70.0], max: [2.05, -66.79], margin: CLEARANCE },
  { name: 'Dendur gate (M1)', y: PLATFORM_Y, min: [131.5, -71.0], max: [135.5, -64.0], margin: CLEARANCE },
  // The Dendur pool's basin and its arms along the terrace, whose edge M1 rebuilds.
  { name: 'Dendur pool', y: PLATFORM_Y - 0.5, min: [POOL.minX, POOL.basinMinZ], max: [POOL.maxX, SACKLER_MAX_Z], margin: CLEARANCE },
  { name: 'Dendur pool, south arm', y: PLATFORM_Y - 0.5, min: [POOL.minX, POOL.armMinZ], max: [POOL.armSouthMaxX, POOL.basinMinZ], margin: CLEARANCE },
  { name: 'Dendur pool, north arm', y: PLATFORM_Y - 0.5, min: [POOL.armNorthMinX, POOL.armMinZ], max: [POOL.maxX, POOL.basinMinZ], margin: CLEARANCE },
];

let timeline: Timeline;
let world: CollisionWorld;
let picker: ModelPicker;
/** Which step each instance of the collision world belongs to, for messages. */
let owners: string[];

beforeAll(() => {
  timeline = new Timeline(SEQUENCE);
  timeline.evaluate(timeline.n);
  const ids = new Set(DEFS.map((d) => d.id));
  const rest = timeline.steps.filter((s) => !ids.has(s.def.id));
  const bvhs = new GeometryBvhs();
  world = new CollisionWorld(bvhs);
  const meshes = collisionMeshes(rest, rest.length);
  world.build(meshes);
  const stepOf = new Map<InstancedMesh, string>(rest.flatMap((s) => s.meshes.map((m) => [m, s.def.id] as const)));
  owners = meshes.flatMap((m) => Array.from({ length: m.count }, () => stepOf.get(m) ?? '?'));
  picker = new ModelPicker(rest.flatMap((s) => s.meshes), bvhs, -100, { enabled: false, height: 0 }, new Layers());
}, 120_000);

/** The world point of a piece's local unit-box point (x, z in −0.5..0.5, y in 0..1). */
const at = (piece: ArtPiece, x: number, y: number, z: number): Vector3 => new Vector3(x, y, z).applyMatrix4(piece.matrix);
const boxOf = (piece: ArtPiece): Box3 => {
  piece.geometry.computeBoundingBox();
  return (piece.geometry.boundingBox ?? new Box3()).clone().applyMatrix4(piece.matrix);
};
/** A piece's footprint in plan: its unit box's four bottom corners. */
const footprint = (piece: ArtPiece): [number, number][] => [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([x = 0, z = 0]) => {
  const p = at(piece, x, 0, z);
  return [p.x, p.z];
});

function segmentDistance(p: readonly [number, number], a: readonly [number, number], b: readonly [number, number]): number {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dz));
}

function inside(p: readonly [number, number], poly: readonly (readonly [number, number])[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi = 0, zi = 0] = poly[i] ?? [];
    const [xj = 0, zj = 0] = poly[j] ?? [];
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

/** Plan distance between a convex polygon and a segment: 0 when they touch. */
function polygonToSegment(poly: readonly (readonly [number, number])[], a: readonly [number, number], b: readonly [number, number]): number {
  if (inside(a, poly) || inside(b, poly)) return 0;
  let best = Number.POSITIVE_INFINITY;
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length] ?? p;
    best = Math.min(best, segmentDistance(p, a, b), segmentDistance(q, a, b), segmentDistance(a, p, q), segmentDistance(b, p, q));
    // Crossing edges.
    const d1 = (q[0] - p[0]) * (a[1] - p[1]) - (q[1] - p[1]) * (a[0] - p[0]);
    const d2 = (q[0] - p[0]) * (b[1] - p[1]) - (q[1] - p[1]) * (b[0] - p[0]);
    const d3 = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    const d4 = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]);
    if (d1 * d2 < 0 && d3 * d4 < 0) best = 0;
  });
  return best;
}

interface Artwork {
  readonly def: CollectionStepDef;
  readonly index: number;
  readonly id: number;
  readonly pieces: readonly ArtPiece[];
}

const ARTWORKS: readonly Artwork[] = DEFS.flatMap((def) => stepArtworks(def).pieces.map((pieces, index) => ({ def, index, id: def.placements[index]?.id ?? 0, pieces })));
const name = (a: Artwork): string => `${a.def.space} ${String(a.id)} (${entryOf(a.id).title.slice(0, 40)})`;

describe('the collection at t = N', () => {
  it('places every pick once, in its own space’s step, and builds each step in full', () => {
    const placed = DEFS.flatMap((d) => d.placements.map((p) => `${d.space}:${String(p.id)}`)).sort();
    const picked = SPACES.flatMap((s) => s.picks.map((p) => `${s.id}:${String(p.id)}`)).sort();
    expect(placed).toEqual(picked);
    const problems: string[] = [];
    for (const def of DEFS) {
      const step: BuiltStep | undefined = timeline.steps.find((s) => s.def.id === def.id);
      if (step === undefined) {
        problems.push(`${def.id}: not in the sequence`);
        continue;
      }
      const pieces = stepArtworks(def).pieces.reduce((n, p) => n + p.length, 0);
      if (step.pieceCount !== pieces) problems.push(`${def.id}: ${String(step.pieceCount)} pieces, expected ${String(pieces)}`);
      for (const mesh of step.meshes) if (!mesh.visible || mesh.count !== mesh.instanceMatrix.count) problems.push(`${mesh.name}: ${String(mesh.count)} of ${String(mesh.instanceMatrix.count)} drawn at t = N`);
    }
    expect(problems).toEqual([]);
  });

  it('stands every standing artwork on the floor its placement names', () => {
    const problems: string[] = [];
    const hit: GroundHit = { y: 0, normalX: 0, normalY: 1, normalZ: 0 };
    for (const art of ARTWORKS) {
      const placement = art.def.placements[art.index];
      if (placement === undefined || entryOf(art.id).display === 'wall') continue;
      const base = art.pieces.find((p) => p.role === 'plinth') ?? art.pieces[0];
      if (base === undefined) continue;
      for (const [x, z] of [[0, 0], [-0.45, -0.45], [0.45, -0.45], [0.45, 0.45], [-0.45, 0.45]] as const) {
        const p = at(base, x, 0, z);
        // The highest floor within 2 cm round the point, so the joint between two floor slabs does not read as a hole.
        let floor = Number.NEGATIVE_INFINITY;
        for (const [dx, dz] of [[0, 0], [0.02, 0], [-0.02, 0], [0, 0.02], [0, -0.02]] as const) {
          if (world.groundBelow(p.x + dx, placement.floor + 0.3, p.z + dz, 1.2, hit)) floor = Math.max(floor, hit.y);
        }
        if (Math.abs(floor - placement.floor) > 0.012) problems.push(`${name(art)} at (${p.x.toFixed(2)}, ${p.z.toFixed(2)}): floor ${Number.isFinite(floor) ? floor.toFixed(3) : 'none'}, placed at ${placement.floor.toFixed(3)}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('hangs every hung artwork against its wall', () => {
    const problems: string[] = [];
    for (const art of ARTWORKS) {
      const placement = art.def.placements[art.index];
      const object = art.pieces[0];
      if (placement === undefined || object === undefined || entryOf(art.id).display !== 'wall') continue;
      const back = new Vector3(-Math.sin(placement.facing), 0, -Math.cos(placement.facing));
      for (const [x, y] of [[0, 0.5], [-0.45, 0.05], [0.45, 0.05], [0.45, 0.95], [-0.45, 0.95]] as const) {
        const p = at(object, x, y, -0.5);
        const d = picker.distance(new Ray(p.clone().addScaledVector(back, -0.002), back));
        if (d === null || d > 0.04) problems.push(`${name(art)} at (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}): wall ${d === null ? 'none' : `${d.toFixed(3)} m`} behind it`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('lets no other solid piece pass through any piece of an artwork', () => {
    const problems: string[] = [];
    for (const art of ARTWORKS) {
      for (const piece of art.pieces) {
        const box = boxOf(piece);
        const bottom = box.min.y + 0.01;
        const top = box.max.y - 0.01;
        const size = new Vector3().setFromMatrixScale(piece.matrix);
        const nx = Math.max(2, Math.ceil(size.x / 0.1));
        const nz = Math.max(2, Math.ceil(size.z / 0.1));
        let reported = false;
        for (let i = 0; i <= nx && !reported; i++) {
          for (let k = 0; k <= nz && !reported; k++) {
            // Inset 1 cm from the piece's own sides.
            const u = -0.5 + (i / nx) * (1 - 0.02 / size.x) + 0.01 / size.x;
            const v = -0.5 + (k / nz) * (1 - 0.02 / size.z) + 0.01 / size.z;
            const p = at(piece, u, 0, v);
            for (const c of world.crossings(p.x, p.z, bottom, top)) {
              const through = c.heights.some((y) => y > bottom && y < top);
              const within = c.heights.filter((y) => y < bottom).length % 2 === 1;
              if (through || within) {
                problems.push(`${name(art)}, its ${piece.role} at (${p.x.toFixed(2)}, ${p.z.toFixed(2)}), ${bottom.toFixed(2)}..${top.toFixed(2)}: ${owners[c.instance] ?? '?'} ${through ? 'crosses it' : 'encloses it'} (${c.heights.map((y) => y.toFixed(2)).join(', ')})`);
                reported = true;
                break;
              }
            }
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('keeps every artwork 1 m clear of the walking routes, the Weston passage and the doors’ swings', () => {
    const problems: string[] = [];
    for (const art of ARTWORKS) {
      const floor = art.def.placements[art.index]?.floor ?? 0;
      const polys = art.pieces.map(footprint);
      for (const route of ROUTES) {
        if (floor < Math.min(route.startY, route.endY) - 1 || floor > Math.max(route.startY, route.endY) + 1) continue;
        const need = CLEARANCE + BODY.radius;
        route.points.forEach((a, i) => {
          const b = route.points[i + 1];
          if (b === undefined) return;
          const d = Math.min(...polys.map((poly) => polygonToSegment(poly, a, b)));
          if (d < need) problems.push(`${name(art)}: ${d.toFixed(2)} m from route ${route.id}, segment ${String(i)}; needs ${need.toFixed(2)}`);
        });
      }
      for (const zone of ZONES) {
        if (Math.abs(floor - zone.y) > 1) continue;
        const [x0, z0] = zone.min;
        const [x1, z1] = zone.max;
        const rect: [number, number][] = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
        const d = Math.min(...polys.flatMap((poly) => rect.map((p, i) => polygonToSegment(poly, p, rect[(i + 1) % 4] ?? p))), ...polys.flatMap((poly) => poly.map((p) => (inside(p, rect) ? 0 : Number.POSITIVE_INFINITY))));
        if (d < zone.margin) problems.push(`${name(art)}: ${d.toFixed(2)} m from the ${zone.name}; needs ${zone.margin.toFixed(2)}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it(`keeps the placeholders within ${String(MAX_MESHES)} meshes and ${String(MAX_TRIANGLES)} triangles`, () => {
    const ids = new Set(DEFS.map((d) => d.id));
    const meshes = timeline.steps.filter((s) => ids.has(s.def.id)).flatMap((s) => s.meshes);
    const triangles = meshes.reduce((sum, m) => sum + Math.floor((m.geometry.index?.count ?? m.geometry.getAttribute('position').count) / 3) * m.instanceMatrix.count, 0);
    expect(meshes.length).toBeLessThanOrEqual(MAX_MESHES);
    expect(triangles).toBeLessThanOrEqual(MAX_TRIANGLES);
  });

  it('stands each step’s artworks at least 5 cm apart in plan, as their shared material needs', () => {
    const problems: string[] = [];
    for (const def of DEFS) {
      const { surfaces } = stepArtworks(def);
      surfaces.forEach((a, i) => {
        surfaces.forEach((b, j) => {
          if (j > i && Math.hypot(a.x - b.x, a.z - b.z) < 0.05) problems.push(`${def.id}: artworks ${String(i)} and ${String(j)} ${Math.hypot(a.x - b.x, a.z - b.z).toFixed(3)} m apart`);
        });
      });
    }
    expect(problems).toEqual([]);
  });
});
