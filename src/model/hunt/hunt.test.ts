/**
 * The Hunt chapter's own checks, headless (collectStep and Timeline, no WebGL): step ids, titles and order; every piece inside block hunt-d with the pavilion's
 * projection; the eight columns at the settled pair positions; the area's budget; finite matrices; every lunette grille bar inside its aperture, as a part
 * (vertices within the outline, by at most half a bar at the bars' end corners) and as placed (within the arch's intrados, above its springing).
 * Bounds: the block test checks each piece's world bounding box (a box overstepping a corner of an L-shaped edge counts against the nearer edge only);
 * the wings' front allowance is the spec's moulding rule (up to 1.5 m beyond the line), and pieces of the walls step get 2 cm. Budgets are this area's share
 * from the coordinator (650,000 triangles counting instances, 170 instanced meshes, 2 step lights).
 * The walk routes (plan docs/work/1_first-person-walk, M2; the whole walks are in routes.test.ts): the central doors' glazing is passable to the walk mode
 * and looks like the palette's, while the palette and the other glazing stay solid; the floor is whole behind the three arches' screens and under the
 * Grand Staircase's end arch, flush with the main and the second floor (a 10 cm plan grid over each area, against this area's walk collision at t = N,
 * src/walk/collision.ts).
 * The 1880 east front's openings (work unit 23, reviews 0 and 1): a 9 by 9 grid of lines through each clear opening the front lists
 * (src/model/core/vaux-east.ts eastOpenings: the main floor passage, the corridors, the outer passages, the north second-floor door, gallery 600's
 * doorway below its springing), 5 cm in from its edges, from the wall's inner face to 0.5 m past its outer face, meets no piece of the core's or this
 * wing's steps. Red with the second-floor door back at X 10.3, 2.6 m wide (the cross hall's side partition in it), and with the north outer head
 * not cut for the door (its stones in it). Bound: only the openings the module lists; a hole cut in the wall without being listed is not seen.
 */
import { Box3, Vector3 } from 'three';
import type { Material } from 'three';
import { describe, expect, it } from 'vitest';

import { collectStep } from '../../build/kit.js';
import type { CollectedPiece } from '../../build/kit.js';
import { Timeline } from '../../build/timeline.js';
import { GeometryBvhs } from '../../walk/bvh-cache.js';
import { CollisionWorld, collisionMeshes } from '../../walk/collision.js';
import type { GroundHit } from '../../walk/collision.js';
import { HUNT_COLUMN_AXIS_Z, HUNT_COLUMN_COUNT, HUNT_PAIR_AXIS_SPACING, HUNT_PAIR_CENTRE_X_INNER, HUNT_PAIR_CENTRE_X_OUTER } from '../frame.js';
import { columnParts } from '../lib/index.js';
import { HUNT_COLUMN_DIAMETER_LOWER, HUNT_COLUMN_DIAMETER_UPPER, HUNT_COLUMN_HEIGHT } from '../frame.js';
import { palette } from '../palette.js';
import { ENTRANCE_DOOR_Z, LUNETTE_GRILLE } from './arches.js';
import { ARCH_CROWN_Y, ARCH_INNER_SPAN, ARCH_SPRING_Y, BACK_Z, BAY_X, CROSS_HALL_FRONT_Z, MAIN, SCREEN_HEAD_Y, SCREEN_Z, SECOND, STAIR_TOP_Z, WALL_BACK_Z } from './dims.js';
import { greatHallDesk1970Steps, huntSteps } from './index.js';
import { lunetteGrille } from './shapes.js';
import { vauxSteps, westonTuckermanSteps } from '../core/index.js';
import { INNER_EAST_Z } from '../core/layout.js';
import { eastOpenings } from '../core/vaux-east.js';

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOLERANCE = 0.3;
/** Block hunt-d (exterior.md section 2) and the pavilion's allowed projection (coordinator, 2026-10-11). */
const BLOCK = { south: -49.7, north: 49.4, back: BACK_Z, wingFrontSouth: -1.9, wingFrontNorth: -2.0, pavilion: 30.4, pavilionFront: 1.2, projection: 3.5 } as const;
const MOULDING_ALLOWANCE = 1.5;
const BUDGET = { triangles: 650_000, meshes: 170, lights: 2 } as const;

/** Every step this area builds: Hunt's chapter and, composed into the 1975 chapter, Roche's desk in the Great Hall. */
const AREA = [...huntSteps, ...greatHallDesk1970Steps];

function boxes(stepIndex: number): Box3[] {
  const step = AREA[stepIndex];
  if (step === undefined) return [];
  return collectStep(step).pieces.map((piece) => {
    const g = piece.geometry;
    if (g.boundingBox === null) g.computeBoundingBox();
    return (g.boundingBox ?? new Box3()).clone().applyMatrix4(piece.matrix);
  });
}

/**
 * How far a world box oversteps the block's outline (0 when inside), and along which edge. On the building's outer outline (the wings' fronts and the
 * pavilion's sides in front of them) mouldings may project up to 1.5 m (spec, Build-step API); walls get the 0.3 m tolerance only. The seams on X −49.7
 * and +49.4 and the back on Z −66.79 (dims.ts BACK_Z, the core's east face) get the tolerance only, and so does the pavilion's projection line at Z +3.5.
 */
function overstep(b: Box3, stepId: string): { by: number; edge: string } {
  const allowance = stepId === 'hunt-walls' ? 0 : MOULDING_ALLOWANCE - TOLERANCE;
  const out: { by: number; edge: string }[] = [
    { by: BLOCK.south - b.min.x, edge: 'south seam X −49.7' },
    { by: b.max.x - BLOCK.north, edge: 'north seam X +49.4' },
    { by: BLOCK.back - b.min.z, edge: 'back Z −66.79' },
    { by: b.max.z - BLOCK.projection, edge: 'pavilion projection Z +3.5' },
  ];
  for (const side of [-1, 1] as const) {
    const front = side < 0 ? BLOCK.wingFrontSouth : BLOCK.wingFrontNorth;
    const beyond = side < 0 ? -BLOCK.pavilion - b.min.x : b.max.x - BLOCK.pavilion;
    if (beyond <= TOLERANCE) continue;
    // Part of the box lies in front of a wing: either it stays behind the wing's face (with the allowance), or it is a moulding returning off the pavilion's side.
    const inFront = b.max.z - front - allowance;
    const offSide = beyond - allowance;
    out.push({ by: Math.min(inFront, offSide), edge: `${side < 0 ? 'south' : 'north'} wing front Z ${String(front)} / pavilion side X ${String(side * BLOCK.pavilion)}` });
  }
  return out.reduce((worst, o) => (o.by > worst.by ? o : worst), { by: 0, edge: '' });
}

describe('Hunt steps', () => {
  it('has unique kebab-case ids in chapter hunt-1902 (the 1970 desk in roche-steps-lehman-1975), titles of at most 48 characters and details of at most 200', () => {
    const ids = AREA.map((s) => s.id);
    expect(ids.filter((id) => !KEBAB.test(id))).toEqual([]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(huntSteps.filter((s) => s.chapter !== 'hunt-1902').map((s) => s.id)).toEqual([]);
    expect(greatHallDesk1970Steps.map((s) => [s.id, s.chapter, s.year])).toEqual([['great-hall-desk', 'roche-steps-lehman-1975', '1970']]);
    expect(AREA.filter((s) => s.title.length === 0 || s.title.length > 48).map((s) => s.id)).toEqual([]);
    expect(AREA.filter((s) => (s.detail?.length ?? 0) > 200).map((s) => s.id)).toEqual([]);
  });

  it('builds in constructional order: foundations first, the Great Hall and staircase before the roof, the roof last of 1902', () => {
    const ids = huntSteps.map((s) => s.id);
    expect(ids[0]).toBe('hunt-foundations');
    const roof = ids.indexOf('hunt-roof');
    for (const id of ['hunt-walls', 'hunt-columns', 'great-hall-floor', 'great-hall-domes', 'grand-stair-vault', 'hunt-galleries']) expect(ids.indexOf(id), id).toBeLessThan(roof);
    expect(ids[ids.length - 1], 'the roof is the last step of 1902').toBe('hunt-roof');
  });

  it('keeps every piece inside block hunt-d, the pavilion front within Z +3.5', () => {
    const offenders: string[] = [];
    AREA.forEach((step, i) => {
      boxes(i).forEach((b, k) => {
        const o = overstep(b, step.id);
        if (o.by > TOLERANCE + 1e-6) offenders.push(`${step.id} piece ${String(k)}: ${o.by.toFixed(2)} m past the ${o.edge}`);
      });
    });
    expect(offenders).toEqual([]);
  });

  it(`raises ${String(HUNT_COLUMN_COUNT)} columns in four coupled pairs at the settled positions`, () => {
    const index = huntSteps.findIndex((s) => s.id === 'hunt-columns');
    const step = huntSteps[index];
    if (step === undefined) throw new Error('no hunt-columns step');
    const shaft = columnParts({ diameter: HUNT_COLUMN_DIAMETER_LOWER, height: HUNT_COLUMN_HEIGHT, taper: HUNT_COLUMN_DIAMETER_UPPER / HUNT_COLUMN_DIAMETER_LOWER, detail: 'medium' }).shaft;
    const axes = collectStep(step)
      .pieces.filter((p) => p.geometry === shaft)
      .map((p) => new Vector3().setFromMatrixPosition(p.matrix))
      .sort((a, b) => a.x - b.x);
    expect(axes).toHaveLength(HUNT_COLUMN_COUNT);
    const half = HUNT_PAIR_AXIS_SPACING / 2;
    const expected = [-HUNT_PAIR_CENTRE_X_OUTER, -HUNT_PAIR_CENTRE_X_INNER, HUNT_PAIR_CENTRE_X_INNER, HUNT_PAIR_CENTRE_X_OUTER].flatMap((c) => [c - half, c + half]);
    axes.forEach((a, i) => {
      expect(a.x).toBeCloseTo(expected[i] ?? Number.NaN, 6);
      expect(a.z).toBeCloseTo(HUNT_COLUMN_AXIS_Z, 6);
    });
    // Equal bays and the photographed spacing (0.225 of a bay in S7).
    expect(HUNT_PAIR_CENTRE_X_OUTER / HUNT_PAIR_CENTRE_X_INNER).toBeCloseTo(3, 6);
    expect(HUNT_PAIR_AXIS_SPACING / (2 * HUNT_PAIR_CENTRE_X_INNER)).toBeCloseTo(0.2254, 2);
  });

  it(`stays within ${String(BUDGET.triangles)} triangles, ${String(BUDGET.meshes)} instanced meshes and ${String(BUDGET.lights)} step lights, with finite matrices`, () => {
    const timeline = new Timeline(AREA);
    const stats = timeline.stats();
    expect(stats.triangles).toBeLessThanOrEqual(BUDGET.triangles);
    expect(stats.meshes).toBeLessThanOrEqual(BUDGET.meshes);
    expect(stats.lights).toBeLessThanOrEqual(BUDGET.lights);
    const bad = timeline.steps.flatMap((s) => s.meshes).filter((m) => !Array.from(m.instanceMatrix.array).every(Number.isFinite));
    expect(bad.map((m) => m.name)).toEqual([]);
  });
});

/** How far (x, y) lies outside a lunette of `span` (a semicircle of radius span / 2) over a rectangle `base` tall, origin at the bottom centre; 0 inside. */
function outsideLunette(x: number, y: number, span: number, base: number): number {
  const r = span / 2;
  return Math.max(0, -y, y <= base ? Math.abs(x) - r : Math.hypot(x, y - base) - r);
}

describe('lunette grilles', () => {
  // A bar ends on the last point of its line inside the outline, so only the corners of its end faces may stand out, by half its width.
  it.each([
    ['the Hunt lunettes', LUNETTE_GRILLE.span, LUNETTE_GRILLE.base, LUNETTE_GRILLE.cell, LUNETTE_GRILLE.bar, LUNETTE_GRILLE.depth],
    ['a small one over a tall base', 3, 1.2, 0.3, 0.04, 0.05],
    ['a coarse one over a short base', 6, 0.5, 0.55, 0.06, 0.08],
  ])('keeps every bar of %s inside its aperture', (_, span, base, cell, bar, depth) => {
    const position = lunetteGrille(span, base, cell, bar, depth).getAttribute('position');
    expect(position.count).toBeGreaterThan(0);
    let worst = 0;
    let deepest = 0;
    for (let i = 0; i < position.count; i++) {
      worst = Math.max(worst, outsideLunette(position.getX(i), position.getY(i), span, base));
      deepest = Math.max(deepest, Math.abs(position.getZ(i)));
    }
    expect(worst, 'furthest any vertex lies outside the outline, metres').toBeLessThanOrEqual(bar / 2 + 1e-9);
    expect(deepest).toBeLessThanOrEqual(depth / 2 + 1e-9);
  });

  it('keeps each placed grille inside its arch: above the springing and within the intrados', () => {
    const step = huntSteps.find((s) => s.id === 'hunt-windows');
    if (step === undefined) throw new Error('The Hunt chapter has no step hunt-windows.');
    const g = LUNETTE_GRILLE;
    const grille = lunetteGrille(g.span, g.base, g.cell, g.bar, g.depth);
    const pieces = collectStep(step).pieces.filter((p) => p.geometry === grille);
    expect(pieces.length, 'grilles in hunt-windows').toBe(3);
    const half = ARCH_INNER_SPAN / 2;
    const position = grille.getAttribute('position');
    const v = new Vector3();
    for (const piece of pieces) {
      const cx = piece.matrix.elements[12];
      let top = -Infinity;
      let bottom = Infinity;
      let reach = 0;
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i).applyMatrix4(piece.matrix);
        top = Math.max(top, v.y);
        bottom = Math.min(bottom, v.y);
        reach = Math.max(reach, v.y >= ARCH_SPRING_Y ? Math.hypot(v.x - cx, v.y - ARCH_SPRING_Y) : Math.abs(v.x - cx));
      }
      expect(bottom, `bottom of the grille at X ${cx.toFixed(2)}`).toBeGreaterThanOrEqual(ARCH_SPRING_Y - g.bar / 2);
      expect(top, `top of the grille at X ${cx.toFixed(2)}`).toBeLessThanOrEqual(ARCH_CROWN_Y);
      expect(reach, `grille at X ${cx.toFixed(2)}: furthest from the arch centre`).toBeLessThanOrEqual(half);
    }
  });
});

function worldBox(piece: CollectedPiece): Box3 {
  if (piece.geometry.boundingBox === null) piece.geometry.computeBoundingBox();
  return (piece.geometry.boundingBox ?? new Box3()).clone().applyMatrix4(piece.matrix);
}

/** What a material looks like: everything its JSON records but its identity (uuid, name) and its flags (userData). */
const IDENTITY = new Set(['uuid', 'name', 'userData', 'metadata']);
function look(material: Material): string {
  return JSON.stringify(Object.entries(material.toJSON()).filter(([key]) => !IDENTITY.has(key)));
}

let area: CollisionWorld | undefined;
/** This area's walk collision at t = N, built as the page builds it (src/walk/collision.ts). */
function areaWorld(): CollisionWorld {
  if (area === undefined) {
    const timeline = new Timeline(AREA);
    timeline.evaluate(timeline.n);
    area = new CollisionWorld(new GeometryBvhs());
    area.build(collisionMeshes(timeline.steps, timeline.n));
  }
  return area;
}

/**
 * Points of a 10 cm plan grid over [x0, x1] × [z0, z1] where the first solid surface below `level` (5 mm slack) is not at `level`. The grid sits 3 mm
 * off round coordinates, so no point falls exactly on a seam between two pieces, where float32 instance matrices can leave a sliver of 1e-7 m.
 */
function holes(x0: number, x1: number, z0: number, z1: number, level: number): string[] {
  const out: string[] = [];
  const hit: GroundHit = { y: 0, normalX: 0, normalY: 1, normalZ: 0 };
  for (let i = 0; x0 + 0.003 + i * 0.1 <= x1; i++) {
    for (let j = 0; z0 + 0.003 + j * 0.1 <= z1; j++) {
      const [x, z] = [x0 + 0.003 + i * 0.1, z0 + 0.003 + j * 0.1];
      const found = areaWorld().groundBelow(x, level + 0.005, z, 10, hit);
      if (!found || hit.y < level - 0.005) out.push(`(${x.toFixed(2)}, ${z.toFixed(2)}): ${found ? `floor at Y ${hit.y.toFixed(3)}` : 'nothing within 10 m below'}`);
    }
  }
  return out;
}

describe('the walk routes through the wing', () => {
  it("opens the central doors: their leaves solid, their frames, the bronze beside them and their transom lights passable, all looking like the palette's; the palette and the other glazing stay solid", () => {
    const step = huntSteps.find((s) => s.id === 'hunt-windows');
    if (step === undefined) throw new Error('The Hunt chapter has no step hunt-windows.');
    const pieces = collectStep(step).pieces;
    const half = ARCH_INNER_SPAN / 2;
    const doors = pieces.filter((p) => {
      const b = worldBox(p);
      return b.min.x >= -half && b.max.x <= half && b.min.y >= MAIN - 1e-6 && b.max.y <= SCREEN_HEAD_Y + 1e-6 && Math.abs(b.getCenter(new Vector3()).z - ENTRANCE_DOOR_Z) < 0.3;
    });
    expect(doors, "the central arch's door pieces: three doors, each a bronze frame, its transom light, the bronze of its leaves and their glass, and bronze either side").toHaveLength(18);
    expect(doors.filter((p) => p.tag !== null).map((p) => p.tag?.id), 'the leaves, metal and glass, tagged as their doorway').toEqual(['hunt-entrance-south', 'hunt-entrance-south', 'hunt-entrance-middle', 'hunt-entrance-middle', 'hunt-entrance-north', 'hunt-entrance-north']);
    // The leaves are solid wherever the door layer turns them (src/walk/door-world.ts, work unit 2, M2b); what is fixed round them stays open to a walker.
    expect(doors.filter((p) => (p.tag !== null) === (p.material.userData['solid'] === false)).map((p) => `${p.material.name}${p.tag === null ? '' : ' (a leaf)'}`), 'leaves a walker passes, or fixed door pieces it cannot').toEqual([]);
    expect(new Set(doors.map((p) => look(p.material))), "the doors' looks: the palette's bronze and dark glass").toEqual(new Set([look(palette.bronze), look(palette.glassDark)]));
    const others = pieces.filter((p) => !doors.includes(p) && p.material.userData['solid'] === false);
    expect(others.map((p) => p.material.name), 'passable pieces of hunt-windows other than the doors').toEqual([]);
    // Only the glazing and frame entries: the palette's water and foliage are passable on purpose (src/model/palette.ts, Walking).
    const glazing = { glass: palette.glass, glassDark: palette.glassDark, bronze: palette.bronze, metalDark: palette.metalDark };
    expect(Object.entries(glazing).flatMap(([key, m]) => (m.userData['solid'] === false ? [key] : [])), 'passable palette materials of glazing and frames').toEqual([]);
  });

  it("lays the floor whole behind each arch's screen, flush with the main floor from the top step to the hall's marble", () => {
    const half = ARCH_INNER_SPAN / 2;
    const found = BAY_X.flatMap((x) => holes(x - half + 0.05, x + half - 0.05, WALL_BACK_Z - 0.3, SCREEN_Z - 0.02, MAIN));
    expect(found.slice(0, 4), `${String(found.length)} points behind the screens with no floor at Y ${MAIN.toFixed(2)}`).toEqual([]);
  });

  it("carries the second floor whole from the Grand Staircase's top landing under the end wall's arch into the cross hall", () => {
    // The end wall's arch is 5.4 m wide (stair.ts); the cross hall runs on west of it.
    const found = holes(-2.6, 2.6, CROSS_HALL_FRONT_Z - 2, STAIR_TOP_Z - 0.02, SECOND);
    expect(found.slice(0, 4), `${String(found.length)} points at the head of the stair with no floor at Y ${SECOND.toFixed(2)}`).toEqual([]);
  });
});

/** Whether the segment from `o` along `d`, up to `length`, meets the triangle (a, b, c) (Möller–Trumbore). */
function segmentMeets(o: Vector3, d: Vector3, length: number, a: Vector3, b: Vector3, c: Vector3): boolean {
  const e1 = new Vector3().subVectors(b, a);
  const e2 = new Vector3().subVectors(c, a);
  const p = new Vector3().crossVectors(d, e2);
  const det = e1.dot(p);
  if (Math.abs(det) < 1e-12) return false;
  const s = new Vector3().subVectors(o, a);
  const u = s.dot(p) / det;
  if (u < 0 || u > 1) return false;
  const q = new Vector3().crossVectors(s, e1);
  const v = d.dot(q) / det;
  if (v < 0 || u + v > 1) return false;
  const t = e2.dot(q) / det;
  return t > 0 && t < length;
}

describe("the 1880 east front's openings", () => {
  it('are clear through the core’s east wall and half a metre on into the Hunt wing (work unit 23, reviews 0 and 1)', () => {
    // A grid of 9 by 9 lines through each clear opening the front lists (src/model/core/vaux-east.ts eastOpenings), 5 cm in from its edges, from the
    // wall's inner face to 0.5 m past its outer face, against every piece of the core's and the wing's steps: a piece there stands in the opening.
    const openings = eastOpenings();
    expect(openings.map((o) => o.name).length, 'openings: the main floor passage on the axis, a corridor and a passage each side, the north second-floor door, the doorway').toBe(7);
    const z0 = INNER_EAST_Z + 0.01;
    const length = BACK_Z + 0.5 - z0;
    const steps = [...AREA, ...vauxSteps, ...westonTuckermanSteps];
    const problems = new Set<string>();
    const corner = [new Vector3(), new Vector3(), new Vector3()] as const;
    const along = new Vector3(0, 0, 1);
    for (const step of steps) {
      collectStep(step).pieces.forEach((piece, i) => {
        const g = piece.geometry;
        if (g.boundingBox === null) g.computeBoundingBox();
        const box = (g.boundingBox ?? new Box3()).clone().applyMatrix4(piece.matrix);
        if (box.min.z > z0 + length || box.max.z < z0) return;
        const near = openings.filter((o) => box.max.x > o.x0 && box.min.x < o.x1 && box.max.y > o.y0 && box.min.y < o.y1);
        if (near.length === 0) return;
        const position = g.getAttribute('position');
        const index = g.index;
        const count = index === null ? position.count : index.count;
        const triangles: [Vector3, Vector3, Vector3][] = [];
        for (let t = 0; t + 2 < count; t += 3) {
          corner.forEach((c, k) => c.fromBufferAttribute(position, index === null ? t + k : index.getX(t + k)).applyMatrix4(piece.matrix));
          triangles.push([corner[0].clone(), corner[1].clone(), corner[2].clone()]);
        }
        for (const o of near) {
          for (let ix = 0; ix < 9; ix++) {
            for (let iy = 0; iy < 9; iy++) {
              const x = o.x0 + 0.05 + ((o.x1 - o.x0 - 0.1) * ix) / 8;
              const y = o.y0 + 0.05 + ((o.y1 - o.y0 - 0.1) * iy) / 8;
              const from = new Vector3(x, y, z0);
              if (triangles.some(([a, b, c]) => segmentMeets(from, along, length, a, b, c))) problems.add(`${step.id} piece ${String(i)} (${piece.material.name}) in the ${o.name}`);
            }
          }
        }
      });
    }
    expect([...problems]).toEqual([]);
  });
});
