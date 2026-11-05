/**
 * Headless checks of the core area's steps (src/model/core/): ids, titles and chapters, every piece inside the core blocks, the area budget
 * (350,000 triangles counting instances, 130 instanced meshes, 1 step light; coordinator's assignment, 2026-10-11) and finite matrices.
 * `openWall` with each kind of hole and `holeLining` are closed, and the faces they stand on look down (`levelFaces`; red with `openWall`'s bottom
 * wound up). `openWall` refuses doors less than 1 mm apart, touching or overlapping, on every call before its cache, and leaves each opening clear in
 * its front and back faces, by their areas, by every triangle clipped against each opening it leaves (no area more than 0.01 mm inside it), and by
 * nine lines along Z through it (red with a crossing pair taken: the front face 92.8 m² where it should cover 86.2 m²), whichever cache entry came
 * first (red with a key that read a niche's depth as a door's).
 * Bound: geometry is built in Node without WebGL, so counts and bounds are exact but nothing here looks at a rendered pixel.
 * Blocks: core-1880-a, core-1888-b and core-1894-c tile X −49.7..49.4, Z −138.3..−69.0 (exterior.md section 2). A piece may overstep that by
 * 0.3 m; trim (any non-brick piece) on the west face (into the Lehman court and the park) and on Weston's south face (into the Petrie Court)
 * may project up to 1.5 m (coordinator, 2026-10-11), but for the porch of Weston's door, which stands 2.25 m out to its pilasters' faces and
 * 2.85 m to its cornice's front as the April 1888 drawing and the court's photographs show it (work unit 17, docs/research/interior.md, Weston's 1888
 * door): trim lying wholly within 3.5 m of the door's middle along the front (Z −100.97, where the floor map has it: constants.ts
 * `WESTON_PAVILION_Z`, work unit 19) and under Y 13.2 (9.1 m over the main floor; its railing's top stands 8.5 m over it) may reach 2.9 m into the court.
 * And Weston's two end blocks, which project into the court 1.2 m in brick, 1.32 m to their pilasters' faces and 1.95 m to the front's cornice returned
 * round them, as Heckscher's figs. 26, 28 and 35 and the court's photographs show them (work unit 21; weston-ends.ts): pieces lying wholly within an
 * end block's stretch, for trim from the arched bay's outer edge, where the block's mitred cornice starts, and for brick from the block's own inner
 * end, to the court's end (from constants.ts, as the porch's stretch is), and under the coping's top, may reach 1.35 m in brick and 2.0 m in trim.
 * Red with the blocks projecting 1.5 m. The east block runs on 4.06 m past the blocks' east line, to the court's east end (work unit 22): east of that
 * line only a piece of that stretch may stand, and only wholly in front of the front's face (X −49.7), where Hunt's podium and south wall stand
 * behind it from 1898 and 1899. Red with the coping carried back 0.25 m over those 4.06 m (and 1 m, as it is over the wall behind the rest of the block).
 * Both end blocks run 19.75 m and mirror each other about the door, piece for piece, but for the east block's coping, which divides where the
 * blocks' east line crosses it: each of its two lengths is the west's coping mirrored and cut there, the second stopping at the front's face (red with
 * the east block ending on that line, as it did before work unit 22, with a 1 m gap between the two lengths, and with the second's overhang lost).
 * The court wall's openings centre on the door, so the court's two ends stand symmetric about it.
 */
import { Box3, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';

import { collectStep } from '../../build/kit.js';
import { Timeline } from '../../build/timeline.js';
import type { StepDef } from '../../build/types.js';
import { MeshBuilder } from '../lib/builder.js';
import { levelFaces, openAlong } from '../lib/check.js';
import { palette } from '../palette.js';
import { holeLining, holeOutline, openWall } from './arches.js';
import { core } from './materials.js';
import type { Hole } from './arches.js';
import { KRAVIS_EAST_Z } from '../frame.js';
import { COURT_OPENINGS_Z } from '../roche-south/kravis.js';
import { B_SOUTH_X, COPING_TOP_Y, EAST_Z, PARAPET_Y, WESTON_ARCH_BAY, WESTON_EAST_END_Z, WESTON_END_FROM, WESTON_PAVILION_HALF, WESTON_PAVILION_Z, WESTON_WEST_END_Z } from './constants.js';
import { END_BLOCKS, westonEndTrim, westonEndWalls } from './weston-ends.js';
import { europeanPaintingsGlazing2023Steps, medievalHallSteps, vauxSteps, westonTuckermanSteps } from './index.js';

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ARRAYS: readonly (readonly [string, readonly StepDef[]])[] = [
  ['vaux-mould-1880', vauxSteps],
  ['weston-tuckerman-1894', westonTuckermanSteps],
  ['mckim-mead-white-1926', medievalHallSteps],
  ['koch-plaza-2014', europeanPaintingsGlazing2023Steps],
];
const ALL: readonly StepDef[] = ARRAYS.flatMap(([, steps]) => steps);
const BLOCKS = { x0: -49.7, x1: 49.4, z0: -138.3, z1: -69.0 } as const;
const SLACK = 0.3;
const TRIM = 1.5;
/** The stretch of Weston's south face where its porch stands, and how far trim there may reach into the Petrie Court (see the header). */
const PORCH = { z0: WESTON_PAVILION_Z - 3.5, z1: WESTON_PAVILION_Z + 3.5, y1: 13.2, reach: 2.9 } as const;
/** How far Weston's end blocks may reach into the Petrie Court, up to the coping's top, and their stretches along the front (see the header). */
const END_REACH = { brick: 1.35, trim: 2.0, y1: COPING_TOP_Y + 0.01 } as const;
const stretches = (from: number): readonly (readonly [number, number])[] => [
  [WESTON_WEST_END_Z, WESTON_PAVILION_Z - from],
  [WESTON_PAVILION_Z + from, WESTON_EAST_END_Z],
];
/** Trim's stretches start at the arched bays' outer edges, where the blocks' mitred cornices start; brick's at the blocks' own inner ends. */
const END_STRETCHES = { trim: stretches(WESTON_PAVILION_HALF + WESTON_ARCH_BAY - 0.01), brick: stretches(WESTON_END_FROM - 0.01) } as const;
const BUDGET = { triangles: 350_000, meshes: 130, lights: 1 } as const;

describe('core steps', () => {
  it('have unique kebab-case ids, short titles and details, and name the chapter they are composed into', () => {
    const ids = ALL.map((s) => s.id);
    expect(ids.filter((id) => !KEBAB.test(id))).toEqual([]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    expect(ALL.filter((s) => s.title.length === 0 || s.title.length > 48).map((s) => s.id)).toEqual([]);
    expect(ALL.filter((s) => (s.detail?.length ?? 0) > 200).map((s) => s.id)).toEqual([]);
    for (const [chapter, steps] of ARRAYS) expect(steps.filter((s) => s.chapter !== chapter).map((s) => s.id)).toEqual([]);
    expect(vauxSteps.length).toBeGreaterThan(0);
  });

  it('keep every piece inside the core blocks (trim may reach into the Lehman and Petrie courts)', () => {
    const problems: string[] = [];
    for (const step of ALL) {
      const { pieces } = collectStep(step);
      pieces.forEach((piece, i) => {
        const g = piece.geometry;
        if (g.boundingBox === null) g.computeBoundingBox();
        const box = (g.boundingBox ?? new Box3()).clone().applyMatrix4(piece.matrix);
        const trim = piece.material !== palette.brick && piece.material !== core.vauxBrick;
        const west = BLOCKS.z0 - box.min.z;
        const south = BLOCKS.x0 - box.min.x;
        const porch = trim && box.min.z >= PORCH.z0 && box.max.z <= PORCH.z1 && box.max.y <= PORCH.y1;
        const end = box.max.y <= END_REACH.y1 && END_STRETCHES[trim ? 'trim' : 'brick'].some(([z0, z1]) => box.min.z >= z0 - 1e-6 && box.max.z <= z1 + 1e-6);
        // East of the blocks' east line, only the east block, in front of the front's face (see the header).
        const pastEast = end && box.max.x <= BLOCKS.x0 + 1e-6;
        const bad =
          box.max.x > BLOCKS.x1 + SLACK ||
          (box.max.z > BLOCKS.z1 + SLACK && !pastEast) ||
          west > (trim ? TRIM : SLACK) + 1e-6 ||
          south > (porch ? PORCH.reach : end ? (trim ? END_REACH.trim : END_REACH.brick) : trim ? TRIM : SLACK) + 1e-6 ||
          box.min.y < -30 ||
          box.max.y > 60;
        if (bad) problems.push(`${step.id} piece ${String(i)} (${piece.material.name}): ${box.min.toArray().map((v) => v.toFixed(2)).join(', ')} to ${box.max.toArray().map((v) => v.toFixed(2)).join(', ')}`);
      });
    }
    expect(problems).toEqual([]);
  });

  it("make Weston's two end blocks match: 19.75 m each, mirror images about the door, piece for piece but for the east block's coping", () => {
    const [west, east] = END_BLOCKS;
    if (west === undefined || east === undefined) throw new Error('two end blocks');
    const length = (b: typeof west): number => Math.abs(b.outer - b.inner);
    expect(length(west)).toBeCloseTo(19.75, 2);
    expect(length(east)).toBeCloseTo(length(west), 9);
    expect((west.outer + east.outer) / 2).toBeCloseTo(WESTON_PAVILION_Z, 9);
    expect(east.outer, "the east block ends at the court's east end (frame.ts KRAVIS_EAST_Z)").toBeCloseTo(KRAVIS_EAST_Z, 6);
    const openings = COURT_OPENINGS_Z.reduce((a, z) => a + z, 0) / COURT_OPENINGS_Z.length;
    expect(openings, "the court wall's openings, and so the court's two ends, centre on the door (roche-south/kravis.ts)").toBeCloseTo(WESTON_PAVILION_Z, 6);
    const step: StepDef = {
      id: 'weston-end-blocks',
      chapter: 'weston-tuckerman-1894',
      title: 'End blocks',
      motion: { kind: 'grow' },
      build(kit) {
        westonEndWalls(kit);
        westonEndTrim(kit);
      },
    };
    const pieces = collectStep(step).pieces.map((piece) => {
      const g = piece.geometry;
      if (g.boundingBox === null) g.computeBoundingBox();
      return { box: (g.boundingBox ?? new Box3()).clone().applyMatrix4(piece.matrix), material: piece.material.name };
    });
    const coping = (p: (typeof pieces)[number]): boolean => Math.abs(p.box.min.y - PARAPET_Y) < 1e-6 && Math.abs(p.box.max.y - COPING_TOP_Y) < 1e-6;
    const westPieces = pieces.filter((p) => p.box.max.z < WESTON_PAVILION_Z);
    const eastPieces = pieces.filter((p) => p.box.min.z > WESTON_PAVILION_Z);
    expect(westPieces.length + eastPieces.length, 'every piece on one side of the door').toBe(pieces.length);
    const mirrored = (b: Box3): Box3 => new Box3(new Vector3(b.min.x, b.min.y, 2 * WESTON_PAVILION_Z - b.max.z), new Vector3(b.max.x, b.max.y, 2 * WESTON_PAVILION_Z - b.min.z));
    const near = (a: Box3, b: Box3): boolean => a.min.distanceTo(b.min) < 1e-6 && a.max.distanceTo(b.max) < 1e-6;
    const show = (b: Box3): string => [...b.min.toArray(), ...b.max.toArray()].map((v) => v.toFixed(3)).join(', ');
    // The east block's coping divides where the blocks' east line crosses it (weston-ends.ts `backed`): over the wall behind the block it is the west's
    // coping mirrored, to that line; past it, before Hunt's south wall, the same but stopping at the front's face.
    const westCoping = westPieces.filter(coping);
    const eastCoping = eastPieces.filter(coping).sort((a, b) => a.box.min.z - b.box.min.z);
    expect([westCoping.length, eastCoping.length], 'coping pieces, west and east').toEqual([1, 2]);
    const m = mirrored(westCoping[0]?.box ?? new Box3());
    const expected = [new Box3(m.min, new Vector3(m.max.x, m.max.y, EAST_Z)), new Box3(new Vector3(m.min.x, m.min.y, EAST_Z), new Vector3(B_SOUTH_X, m.max.y, m.max.z))];
    expect(eastCoping.map((p) => show(p.box)), "the east block's two coping lengths").toEqual(expected.map(show));
    const westRest = westPieces.filter((p) => !coping(p));
    const eastRest = eastPieces.filter((p) => !coping(p));
    expect(eastRest.length, 'pieces on each side but the copings').toBe(westRest.length);
    const left = [...westRest];
    const unmatched = eastRest.filter((p) => {
      const i = left.findIndex((w) => w.material === p.material && near(w.box, mirrored(p.box)));
      if (i < 0) return true;
      left.splice(i, 1);
      return false;
    });
    expect(unmatched.map((p) => `${p.material} ${p.box.min.toArray().map((v) => v.toFixed(3)).join(', ')}`), 'east pieces with no mirror in the west block').toEqual([]);
  });

  it('stay within the area budget with finite matrices', () => {
    const timeline = new Timeline(ALL);
    const stats = timeline.stats();
    expect(stats.triangles, 'triangles at t = N').toBeLessThanOrEqual(BUDGET.triangles);
    expect(stats.meshes, 'instanced meshes').toBeLessThanOrEqual(BUDGET.meshes);
    expect(stats.lights, 'step lights').toBeLessThanOrEqual(BUDGET.lights);
    const bad = timeline.steps.flatMap((s) => s.meshes).filter((m) => !Array.from(m.instanceMatrix.array).every(Number.isFinite));
    expect(bad.map((m) => m.name)).toEqual([]);
    console.log(`core: ${String(stats.steps)} steps, ${String(stats.pieces)} pieces, ${String(stats.meshes)} meshes, ${String(stats.triangles)} triangles, ${String(stats.lights)} lights`);
  });
});

describe('the core walls and linings, closed along vertical lines (src/model/lib/check.ts openAlong; work unit 3, review 2, F14)', () => {
  const up = new Vector3(0, 1, 0);
  /** The faces a piece stands on at height `y`: there are some, and every one looks down. */
  const standsOn = (geometry: BufferGeometry, y: number): void => {
    const faces = levelFaces(geometry, y);
    expect(faces.length, `faces at y ${String(y)}`).toBeGreaterThan(0);
    expect(faces.filter((ny) => ny > -0.999), `faces at y ${String(y)} not looking down`).toEqual([]);
  };

  it('openWall: a door through it, a blind niche on its floor, windows of each head and a round window, with and without its ends', () => {
    const holes: Hole[] = [
      { x: -6, width: 1.6, height: 3 },
      { head: 'round', x: -3, width: 1.2, height: 2.5, depth: 0.2 },
      { head: 'segmental', x: 0, y: 1, width: 1, height: 2 },
      { head: 'pointed', x: 2, y: 1, width: 1, height: 2.5 },
      { x: 4.5, y: 1.2, width: 1, height: 2 },
      { head: 'circle', x: 6.5, y: 3, width: 1, height: 1 },
    ];
    for (const openEnds of [false, true]) {
      const wall = openWall({ width: 16, height: 6, thickness: 0.8, holes, openEnds });
      expect(openAlong(wall, up), `openEnds ${String(openEnds)}`).toBeNull();
      standsOn(wall, 0);
    }
  });

  /**
   * How many surfaces of `wall` the line along Z through (x, y) crosses, told apart by depth: a face's edges count, and faces meeting there at one depth
   * count once. Faces along Z (jambs, sills, heads) have no area seen along the line.
   */
  const across = (wall: BufferGeometry, x: number, y: number): number => {
    const position = wall.getAttribute('position');
    const index = wall.getIndex();
    const depths: number[] = [];
    for (let k = 0; k + 2 < (index?.count ?? position.count); k += 3) {
      const [a, b, c] = [0, 1, 2].map((j) => new Vector3().fromBufferAttribute(position, index === null ? k + j : index.getX(k + j)));
      if (a === undefined || b === undefined || c === undefined) continue;
      const area = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
      if (Math.abs(area) < 1e-12) continue;
      const u = ((b.x - x) * (c.y - y) - (c.x - x) * (b.y - y)) / area;
      const v = ((c.x - x) * (a.y - y) - (a.x - x) * (c.y - y)) / area;
      if (u >= -1e-9 && v >= -1e-9 && u + v <= 1 + 1e-9) depths.push(u * a.z + v * b.z + (1 - u - v) * c.z);
    }
    return depths.sort((p, q) => p - q).filter((z, i) => i === 0 || z - (depths[i - 1] ?? 0) > 1e-6).length;
  };

  type Flat = readonly (readonly [number, number])[];
  const shoelace = (pts: Flat): number => Math.abs(pts.reduce((sum, p, i) => sum + p[0] * (pts[(i + 1) % pts.length]?.[1] ?? 0) - (pts[(i + 1) % pts.length]?.[0] ?? 0) * p[1], 0)) / 2;

  /** The triangles of `wall` in the plane z = `z` that look along `facing` (+1 or −1 on Z), seen along Z. */
  const facesIn = (wall: BufferGeometry, z: number, facing: number): Flat[] => {
    const position = wall.getAttribute('position');
    const index = wall.getIndex();
    const out: Flat[] = [];
    for (let k = 0; k + 2 < (index?.count ?? position.count); k += 3) {
      const [a, b, c] = [0, 1, 2].map((j) => new Vector3().fromBufferAttribute(position, index === null ? k + j : index.getX(k + j)));
      if (a === undefined || b === undefined || c === undefined || [a, b, c].some((p) => Math.abs(p.z - z) > 1e-6)) continue;
      if (Math.sign(new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).z) === facing) out.push([a, b, c].map((p) => [p.x, p.y] as const));
    }
    return out;
  };

  /**
   * The area of the face `tri` inside the convex `outline` (counter-clockwise) less a band `band` wide along its edges: none for a face that only meets
   * the opening's edge, rounding of float positions aside.
   */
  const inside = (tri: Flat, outline: Flat, band: number): number => {
    let poly: Flat = tri;
    outline.forEach(([px, py], i) => {
      const [qx, qy] = outline[(i + 1) % outline.length] ?? [px, py];
      const length = Math.hypot(qx - px, qy - py);
      if (length < 1e-12 || poly.length === 0) return;
      // How far a point lies inside the edge p → q, less the band (Sutherland–Hodgman against the edge moved in by the band).
      const depth = ([x, y]: readonly [number, number]): number => ((qx - px) * (y - py) - (qy - py) * (x - px)) / length - band;
      const kept: [number, number][] = [];
      poly.forEach((a, k) => {
        const b = poly[(k + 1) % poly.length] ?? a;
        const [da, db] = [depth(a), depth(b)];
        if (da >= 0) kept.push([a[0], a[1]]);
        if (da >= 0 !== db >= 0) kept.push([a[0] + ((b[0] - a[0]) * da) / (da - db), a[1] + ((b[1] - a[1]) * da) / (da - db)]);
      });
      poly = kept;
    });
    return poly.length < 3 ? 0 : shoelace(poly);
  };

  /**
   * What is wrong with the front and back faces of a `width` × `height` × `thickness` wall with `holes` on its base. Each face's area must be the wall's
   * less the openings it leaves (every hole on the front, the through holes on the back), within 1e-5 m², ten times the rounding measured. No triangle
   * of a face may reach into an opening it leaves, by more than 0.01 mm from the opening's edge, by any area at all. On nine lines along Z spread over
   * each opening, a door through the wall meets no surface, and a blind niche two: its back and the wall's.
   * Bound: a face that lies within 0.01 mm of an opening's edge is not seen.
   */
  const doorways = (wall: BufferGeometry, width: number, height: number, thickness: number, holes: readonly Hole[]): string[] => {
    const through = (h: Hole): boolean => h.depth === undefined || h.depth >= thickness;
    const problems: string[] = [];
    const sides = [
      { name: 'front', faces: facesIn(wall, 0, 1), leaves: holes },
      { name: 'back', faces: facesIn(wall, -thickness, -1), leaves: holes.filter(through) },
    ];
    for (const { name, faces, leaves } of sides) {
      const got = faces.reduce((sum, f) => sum + shoelace(f), 0);
      const want = width * height - leaves.reduce((sum, h) => sum + shoelace(holeOutline(h, 12)), 0);
      if (Math.abs(got - want) > 1e-5) problems.push(`the ${name} face covers ${got.toFixed(5)} m², where it should cover ${want.toFixed(5)}`);
      for (const h of leaves) {
        const outline = holeOutline(h, 12);
        const covered = faces.reduce((sum, f) => sum + inside(f, outline, 1e-5), 0);
        if (covered > 0) problems.push(`the ${name} face reaches ${covered.toExponential(2)} m² into the opening at x ${String(h.x)}`);
      }
    }
    for (const h of holes) {
      for (const dx of [-0.31, 0.04, 0.27]) {
        for (const fy of [0.22, 0.53, 0.76]) {
          const [x, y] = [(h.x ?? 0) + dx * h.width, fy * h.height];
          const met = across(wall, x, y);
          if (met !== (through(h) ? 0 : 2)) problems.push(`the line through (${x.toFixed(3)}, ${y.toFixed(3)}) in the opening at x ${String(h.x)} meets ${String(met)} surfaces`);
        }
      }
    }
    return problems;
  };

  /** `holes`' wall with one more face, the corners `pts` counter-clockwise seen from the front, in the front plane, or the back plane looking back. */
  const withFace = (holes: readonly Hole[], pts: Flat, back = false): BufferGeometry => {
    const b = new MeshBuilder();
    b.append(openWall({ width: 20, height: 5, thickness: 1, holes }));
    const corners = pts.map(([x, y]) => new Vector3(x, y, back ? -1 : 0));
    b.polygon(back ? corners.reverse() : corners);
    return b.build();
  };

  it("across counts a face whose edge runs through its line: a square's fan diagonal through its middle (review 4, F21)", () => {
    const square = new MeshBuilder();
    square.polygon([new Vector3(0, 0, 0), new Vector3(2, 0, 0), new Vector3(2, 2, 0), new Vector3(0, 2, 0)]);
    expect(across(square.build(), 1, 1)).toBe(1);
  });

  it('openWall: doors stand at least 1 mm apart, each opening clear in the front and back faces; doors that touch or overlap are refused (reviews 0 to 4, F2, F7, F11, F15, F17, F20)', () => {
    const apart: Hole[][] = [
      [{ x: -1.0005, width: 2, height: 3 }, { x: 1.0005, width: 2, height: 3 }],
      [{ x: 0, width: 2.2, height: 3 }, { x: 2.31, width: 2.4, height: 3 }],
      [{ head: 'round', x: -1.3, width: 2, height: 3 }, { head: 'pointed', x: 0.75, width: 2, height: 3.5 }],
      [{ head: 'round', x: -1.0005, width: 2, height: 3 }, { head: 'segmental', x: 1.0005, width: 2, height: 2.6, depth: 0.3 }],
    ];
    for (const holes of apart) {
      const wall = openWall({ width: 20, height: 5, thickness: 1, holes });
      expect(openAlong(wall, up), `doors at x ${holes.map((h) => String(h.x)).join(' and ')}`).toBeNull();
      expect(doorways(wall, 20, 5, 1, holes), `doors at x ${holes.map((h) => String(h.x)).join(' and ')}`).toEqual([]);
    }
    // Controls, each a face laid in a doorway of the pairs above, which must be found: across the first doorway; strips 20 µm and 3 µm wide up its
    // middle and one 49 µm tall across it (reviews 3 and 4); a post 33 µm wide in the back plane; and a triangle of 0.99 cm² under a round door's crown.
    const [first = [], , arched = []] = apart;
    const controls: [string, BufferGeometry, readonly Hole[]][] = [
      ['a face across the doorway', withFace(first, [[-2.0005, 0], [-0.0005, 0], [-0.0005, 3], [-2.0005, 3]]), first],
      ['a strip 20 µm wide', withFace(first, [[-1.00051, 0], [-1.00049, 0], [-1.00049, 3], [-1.00051, 3]]), first],
      ["a strip 3 µm wide, under the area check's tolerance", withFace(first, [[-1.0005015, 0], [-1.0004985, 0], [-1.0004985, 3], [-1.0005015, 3]]), first],
      ['a strip 49 µm tall', withFace(first, [[-2.0005, 1], [-0.0005, 1], [-0.0005, 1.000049], [-2.0005, 1.000049]]), first],
      ['a post 33 µm wide in the back plane', withFace(first, [[-1.0005165, 0], [-1.0004835, 0], [-1.0004835, 3], [-1.0005165, 3]], true), first],
      ['a triangle of 0.99 cm² under the crown', withFace(arched, [[-1.31, 2.98], [-1.29, 2.98], [-1.3, 2.9899]]), arched],
    ];
    for (const [what, wall, holes] of controls) expect(doorways(wall, 20, 5, 1, holes).length, `problems found with ${what}`).toBeGreaterThan(0);
    // Touching, touching with each sum rounded a little the other side (2.3 − 1.2 at 1.1), 0.5 mm apart, 1 cm over each other, and one inside the other.
    const refused: [Hole[], string][] = [
      [[{ x: -1, width: 2, height: 3 }, { x: 1, width: 2, height: 3 }], 'openWall: the doors at x -1 (2 wide) and x 1 (2 wide) touch; keep doors at least 1 mm apart.'],
      [[{ x: 0, width: 2.2, height: 3 }, { x: 2.3, width: 2.4, height: 3 }], 'the doors at x 0 (2.2 wide) and x 2.3 (2.4 wide) touch;'],
      [[{ x: 0, width: 2, height: 3 }, { x: 2.0005, width: 2, height: 3 }], 'stand 0.5 mm apart;'],
      [[{ x: 0, width: 2, height: 3 }, { x: 1.99, width: 2, height: 3 }], 'openWall: the doors at x 0 (2 wide) and x 1.99 (2 wide) overlap by 10 mm; keep doors at least 1 mm apart.'],
      [[{ x: 0, width: 6, height: 3 }, { x: 1, width: 2, height: 2 }], 'overlap by 2000 mm;'],
    ];
    for (const [holes, message] of refused) expect(() => openWall({ width: 20, height: 5, thickness: 1, holes })).toThrow(message);
  });

  it('openWall: checks its doors on every call, not only on the first of a cache key, which rounds to the millimetre (review 2, F12)', () => {
    // Both walls' keys read the second door at x 2.001.
    openWall({ width: 31, height: 5, thickness: 1, holes: [{ x: 0, width: 2, height: 3 }, { x: 2.0012, width: 2, height: 3 }] });
    expect(() => openWall({ width: 31, height: 5, thickness: 1, holes: [{ x: 0, width: 2, height: 3 }, { x: 2.0006, width: 2, height: 3 }] })).toThrow('stand 0.6 mm apart');
  });

  it('openWall: never serves a blind niche for a door through the wall, or the other way, whichever its cache saw first (review 3, F19)', () => {
    // Depths 0.9996 and 1 m round alike, but the first makes a niche in a 1 m wall and the second a door; each width is a cache key of its own.
    for (const [width, depths] of [[42, [0.9996, 1]], [43, [1, 0.9996]]] as const) {
      for (const depth of depths) {
        const holes: Hole[] = [{ x: 0, width: 2, height: 3, depth }];
        expect(doorways(openWall({ width, height: 5, thickness: 1, holes }), width, 5, 1, holes), `depth ${String(depth)} after ${String(depths[0])}`).toEqual([]);
      }
    }
  });

  it('holeLining, square and round', () => {
    const square = holeLining({ width: 2.4, height: 3.2 }, { width: 2, height: 3 }, 0.6);
    const round = holeLining({ head: 'round', y: 0.4, width: 2.4, height: 3.2 }, { head: 'round', y: 0.4, width: 2, height: 3 }, 0.6);
    expect(openAlong(square, up)).toBeNull();
    expect(openAlong(round, up)).toBeNull();
    standsOn(square, 0);
    standsOn(round, 0.4);
  });
});
