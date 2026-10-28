/**
 * The pieces the walk and the section cut read, each closed along vertical lines or a declared sheet (docs/design/spec.md, Build-step API: Solids and
 * sheets), on the real sequence at t = N. A piece that a vertical line crosses an odd number of times has no inside along it: the walk's settle never
 * finds a walker built into it there (Walk mode: When the build moves), and a cut through it there shows what lies under it (View menu). Work unit 3's
 * review 2 found two such builders (F13, F14), work unit 5 closed them, and work unit 6 closed every other.
 * Pieces: every piece of every mesh the walk collides with (src/walk/collision.ts `collisionMeshes`, the doors' closed leaves among them) or the cut caps
 * (src/viewer/section-cut.ts `capsMesh`, as src/main.ts picks them), as its step's mesh draws it, and each door's leaves apart, as the door layer's
 * stand-ins draw them (src/model/lib/window.ts `doorLeavesOf`), but the sheets their builders declare (src/model/lib/sheet.ts), which SHEETS counts by
 * step and material so that a new one is seen. Pieces read alike form a shape: one geometry with one direction of world vertical in its frame.
 * Three readings. The mesh's own, exact: along world vertical in each shape's frame (src/model/lib/check.ts `openAlong`). The walk's: its crossing query
 * (`CollisionWorld.crossings`) on a collision world of the walked meshes, along four lines through each of up to FACES faces of each walked shape that
 * are not vertical (one inside the face, one near each corner), each meeting its piece at that face an even number of times. And the faces' winding on
 * the same lines: as many look up as look down, so a face wound the wrong way or doubled fails, though a part wound wholly inside out does not (three
 * builders' parts are, an open finding of docs/work/6_closed-solids/plan.md); and where parts of one piece overlap, which the parity rule reads as
 * outside, no line runs through them for as long as settle's span (BODY.height less STANDING), so a walker built into a piece is found.
 * Red with an Attic base's bottom left out (src/model/lib/column.ts: 8 shapes open, also read open by the walk), with main's crossing rule, which counted
 * hits within 1 µm once (206 shapes misread), with the urn plinth's underside turned up (src/model/lib/fittings.ts: 169 lines unbalanced), with the
 * medieval piers' half shafts made whole cylinders, half in the core (3.9 m of overlap), and with UNIT_TILE no sheet (2,008 shapes open, 7 SHEETS counts
 * off).
 * Bound: `openAlong` joins ends nearer than 0.1 mm and leaves out open boundary under 1 mm in all, so an opening narrower than 0.1 mm or with less than
 * 1 mm of boundary is not seen. The other readings try up to FACES faces a shape, spread evenly over those that are not vertical, on its first walked
 * piece; they see an opening, a wrong winding or an overlap only under one of their lines. The overlap is read from the winding, so an overlap with a
 * part wound inside out is not seen; none of the three overlaps another part of its piece.
 */
import { Matrix3, Matrix4, Vector3 } from 'three';
import type { BufferGeometry, InstancedMesh, Material } from 'three';
import { describe, expect, it } from 'vitest';

import { SEQUENCE } from '../build/sequence.js';
import { Timeline } from '../build/timeline.js';
import { cappedBySection, capsMesh } from '../viewer/section-cut.js';
import { GeometryBvhs } from '../walk/bvh-cache.js';
import { CollisionWorld, collisionMeshes } from '../walk/collision.js';
import { BODY, STANDING } from '../walk/walker.js';
import { openAlong } from './lib/check.js';
import { isSheet } from './lib/sheet.js';
import { doorLeavesOf } from './lib/window.js';

/** Declared sheets at t = N by step and material (`step/material`); see the header. */
const SHEETS: Readonly<Record<string, number>> = {
  // Glass: lib/glazing.ts's panes, roche-south/shapes.ts UNIT_TRIANGLE, core/skylights.ts, the McKim, Mead & White roofs' ridges, the plaza poles' lenses.
  'american-roofs/rn-clearGlass': 10,
  'astor-court-skylight/glass': 1,
  'dendur-ceiling/rn-ceilingGlass': 10,
  'dendur-glass-wall/rn-stippledGlass': 10,
  'engelhard-curtain-wall/glassDark': 2,
  'engelhard-curtain-wall/rn-clearGlass': 1,
  'engelhard-glass-roof/rn-clearGlass': 7,
  'great-hall-domes/glass': 3,
  'greek-court-skylight/glass': 1,
  'hunt-roof/glass': 3,
  'lehman-gallery-glass/rocheSouthGlass': 16,
  'lehman-pyramid/rocheSouthGlass': 8,
  'mmw-north-roofs/glass': 1,
  'mmw-south-roofs/glass': 1,
  'petrie-glass/rocheSouthGlass': 9,
  'plaza-furniture/siteGlass': 8,
  'rockefeller-glass-wall/rocheSouthGlassFritted': 742,
  'rockefeller-skylights/rocheSouthGlass': 14,
  'rockefeller-skylights/rocheSouthLaylight': 11,
  'sackler-roof/rn-clearGlass': 10,
  'skylights-2023/core.glassBoth': 245,
  'wallace-glass/rocheSouthGlass': 10,
  // Laid on the ground: site/tiles.ts UNIT_TILE (paving, gutters, paint), site/paths.ts, and site/grid.ts's terrain and the building's pad.
  'plaza-paving/sitePlazaGranite': 2002,
  'site-east-sidewalk/siteSidewalk': 576,
  'site-fifth-avenue/asphalt': 1861,
  'site-fifth-avenue/siteGutter': 404,
  'site-fifth-avenue/sitePaint': 214,
  'site-pad/sitePad': 1,
  'site-park-paths/asphalt': 2,
  'site-park-paths/sitePathAsphalt': 1,
  'site-sidewalks/siteSidewalk': 2864,
  'site-terrain/grass': 1,
  'site-terrain/siteBareGround': 1,
  'site-transverse-cuts/asphalt': 657,
};

/** Faces tried in each walked shape. */
const FACES = 24;
/** The lines through a face, as weights of its corners: one inside it, off its centroid, and one near each corner, all off its edges. */
const LINES: readonly (readonly [number, number, number])[] = [
  [0.31, 0.33, 0.36],
  [0.94, 0.027, 0.033],
  [0.029, 0.94, 0.031],
  [0.032, 0.028, 0.94],
];

/** One piece as its mesh draws it: its step, its material's name, its mesh, its slot there and its world matrix. */
interface Piece {
  readonly step: string;
  readonly material: string;
  readonly mesh: InstancedMesh;
  readonly slot: number;
  readonly world: Matrix4;
}

/** One geometry as some of its pieces stand: world vertical in its frame, and those pieces. */
interface Shape {
  readonly geometry: BufferGeometry;
  readonly vertical: Vector3;
  readonly pieces: Piece[];
}

const timeline = new Timeline(SEQUENCE);
timeline.evaluate(timeline.n);
const walked = collisionMeshes(timeline.steps, timeline.n);
const walkedSet = new Set<InstancedMesh>(walked);

/** Every piece the walk or the cut reads at t = N, as shapes, and the sheets by step and material. */
function read(): { shapes: Shape[]; sheets: Map<string, number> } {
  const found = new Map<string, Shape>();
  const sheets = new Map<string, number>();
  const linear = new Matrix3();
  for (const step of timeline.steps) {
    for (const mesh of step.meshes) {
      const sheet = isSheet(mesh.geometry);
      // A sheet the cut would cap but for being a sheet is read too, so SHEETS sees it.
      if (!walkedSet.has(mesh) && !(sheet ? Array.isArray(mesh.material) || cappedBySection(mesh.material) : capsMesh(mesh))) continue;
      const materials: readonly Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const key = `${step.def.id}/${materials.map((m) => m.name).join('+')}`;
      if (sheet) {
        sheets.set(key, (sheets.get(key) ?? 0) + mesh.count);
        continue;
      }
      mesh.updateMatrixWorld(true);
      for (let slot = 0; slot < mesh.count; slot += 1) {
        const world = new Matrix4().fromArray(mesh.instanceMatrix.array, slot * 16).premultiply(mesh.matrixWorld);
        const vertical = new Vector3(0, 1, 0).applyMatrix3(linear.setFromMatrix4(world).invert()).normalize();
        if (vertical.y < 0) vertical.negate();
        // To six decimals, −0 read as 0, so pieces turned alike share a reading.
        const id = `${mesh.geometry.uuid} ${vertical.toArray().map((v) => String(Number(v.toFixed(6)) + 0)).join(',')}`;
        const shape = found.get(id) ?? { geometry: mesh.geometry, vertical, pieces: [] };
        shape.pieces.push({ step: step.def.id, material: materials.map((m) => m.name).join('+'), mesh, slot, world });
        found.set(id, shape);
      }
    }
  }
  return { shapes: [...found.values()], sheets };
}

const { shapes, sheets } = read();

/** A shape's triangles in world metres, as one of its pieces stands, nine numbers each. */
function worldTriangles(geometry: BufferGeometry, world: Matrix4): Float64Array {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const count = index?.count ?? position.count;
  const out = new Float64Array(count * 3);
  const v = new Vector3();
  for (let k = 0; k < count; k += 1) {
    v.fromBufferAttribute(position, index === null ? k : index.getX(k)).applyMatrix4(world);
    out.set([v.x, v.y, v.z], k * 3);
  }
  return out;
}

/**
 * Along the vertical line through (x, z), the triangles' crossings read by their winding (faces looking up entering, those looking down leaving, a
 * mirrored piece's turned back by `mirror`): the sum of their facings, and the length where their parity and their winding disagree on what is inside,
 * where parts overlap. Hits within 1 µm of height are read together.
 */
function windingAlong(tris: Float64Array, x: number, z: number, mirror: number): { sum: number; overlap: number } {
  const hits: [number, number][] = [];
  for (let o = 0; o < tris.length; o += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = [tris[o] ?? 0, tris[o + 1] ?? 0, tris[o + 2] ?? 0, tris[o + 3] ?? 0, tris[o + 4] ?? 0, tris[o + 5] ?? 0, tris[o + 6] ?? 0, tris[o + 7] ?? 0, tris[o + 8] ?? 0];
    // The face's normal Y, and the barycentric coordinates of (x, z) in its plan.
    const d = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    if (Math.abs(d) < 1e-14) continue;
    const w = ((bz - az) * (x - ax) - (bx - ax) * (z - az)) / d;
    const u = ((x - ax) * (cz - az) - (z - az) * (cx - ax)) / -d;
    if (u < -1e-12 || w < -1e-12 || u + w > 1 + 1e-12) continue;
    hits.push([ay + u * (by - ay) + w * (cy - ay), Math.sign(d) * mirror]);
  }
  hits.sort((p, q) => q[0] - p[0]);
  let winding = 0;
  let parity = 0;
  let overlap = 0;
  for (let k = 0; k < hits.length; ) {
    const top = hits[k]?.[0] ?? 0;
    let n = 0;
    for (; k < hits.length && top - (hits[k]?.[0] ?? 0) < 1e-6; k += 1, n += 1) winding += hits[k]?.[1] ?? 0;
    parity = (parity + n) % 2;
    const next = hits[k]?.[0];
    if (next !== undefined && winding !== 0 !== (parity === 1)) overlap += top - next;
  }
  return { sum: winding, overlap };
}

describe('the pieces the walk and the section cut read', () => {
  it('are read in every part of the model: hundreds of shapes, thousands of pieces', () => {
    expect(shapes.length, 'shapes the walk or the cut reads, sheets apart').toBeGreaterThan(800);
    expect(shapes.reduce((sum, s) => sum + s.pieces.length, 0), 'their pieces').toBeGreaterThan(15_000);
  });

  it('are closed along vertical lines but the sheets their builders declare (work unit 3, review 2, F13 and F14)', () => {
    const open: string[] = [];
    for (const shape of shapes) {
      const first = shape.pieces[0];
      if (first === undefined) continue;
      const where = [...new Set(shape.pieces.map((p) => `${p.step}/${p.material}`))].join(', ');
      // The piece itself, and a door's leaves apart, each turned about a vertical hinge, so world vertical lies alike in its frame.
      const parts: [string, BufferGeometry][] = [['', shape.geometry], ...(doorLeavesOf(shape.geometry) ?? []).map((leaf, k): [string, BufferGeometry] => [` leaf ${String(k)}`, leaf.geometry])];
      for (const [what, geometry] of parts) {
        const opening = openAlong(geometry, shape.vertical);
        if (opening === null) continue;
        const at = opening.at.clone().applyMatrix4(first.world);
        open.push(`${where}${what}: ${String(shape.pieces.length)} pieces with ${opening.length.toFixed(3)} m of open boundary, one by X ${at.x.toFixed(2)}, Z ${at.z.toFixed(2)}`);
      }
    }
    expect(open, 'pieces open along vertical lines: close them, or declare a true sheet with sheet() (src/model/lib/sheet.ts)').toEqual([]);
  });

  it('declare as sheets only what SHEETS counts', () => {
    const changed = [...new Set([...sheets.keys(), ...Object.keys(SHEETS)])]
      .sort()
      .filter((key) => (sheets.get(key) ?? 0) !== (SHEETS[key] ?? 0))
      .map((key) => `${key}: ${String(sheets.get(key) ?? 0)} sheet pieces, SHEETS counts ${String(SHEETS[key] ?? 0)}`);
    expect(changed, 'step/material with more or fewer declared sheets than SHEETS counts: is each a surface with no inside?').toEqual([]);
  });

  it("are read closed by the walk's own crossing query, as many faces looking up as down, and no overlap of their parts as long as the walker is tall", () => {
    const world = new CollisionWorld(new GeometryBvhs());
    world.build(walked);
    const firsts = new Map<InstancedMesh, number>();
    let count = 0;
    for (const mesh of walked) {
      firsts.set(mesh, count);
      count += mesh.count;
    }
    const misread: string[] = [];
    const unbalanced: string[] = [];
    let worst = { length: 0, where: '' };
    let lines = 0;
    const [a, b, c, n, p] = [new Vector3(), new Vector3(), new Vector3(), new Vector3(), new Vector3()];
    for (const shape of shapes) {
      const piece = shape.pieces.find((q) => walkedSet.has(q.mesh));
      if (piece === undefined) continue;
      const instance = (firsts.get(piece.mesh) ?? 0) + piece.slot;
      const tris = worldTriangles(shape.geometry, piece.world);
      const mirror = Math.sign(piece.world.determinant());
      // Its faces that are not vertical, as offsets into tris.
      const faces: number[] = [];
      for (let o = 0; o < tris.length; o += 9) {
        n.subVectors(b.fromArray(tris, o + 3), a.fromArray(tris, o)).cross(p.subVectors(c.fromArray(tris, o + 6), a));
        if (Math.abs(n.y) > 1e-6 * n.length()) faces.push(o);
      }
      const tried = Math.min(FACES, faces.length);
      let bad = 0;
      let first = '';
      for (let k = 0; k < tried; k += 1) {
        const o = faces[Math.floor(((k + 0.5) * faces.length) / tried)] ?? 0;
        a.fromArray(tris, o);
        b.fromArray(tris, o + 3);
        c.fromArray(tris, o + 6);
        for (const [wa, wb, wc] of LINES) {
          p.set(0, 0, 0).addScaledVector(a, wa).addScaledVector(b, wb).addScaledVector(c, wc);
          lines += 1;
          const heights = world.crossings(p.x, p.z, -Infinity, Infinity).find((l) => l.instance === instance)?.heights ?? [];
          const wrong = !heights.some((h) => Math.abs(h - p.y) < 1e-4) ? 'misses the face it was drawn through' : heights.length % 2 !== 0 ? 'is crossed an odd number of times' : null;
          if (wrong !== null && (bad += 1) === 1) first = `by X ${p.x.toFixed(2)}, Z ${p.z.toFixed(2)} ${wrong}: ${heights.map((h) => h.toFixed(3)).join(', ') || 'no crossing'}`;
          const wound = windingAlong(tris, p.x, p.z, mirror);
          const where = `${piece.step}/${piece.material} by X ${p.x.toFixed(2)}, Z ${p.z.toFixed(2)}`;
          if (wound.sum !== 0) unbalanced.push(`${where}: its faces looking up and looking down differ by ${String(wound.sum)}`);
          if (wound.overlap > worst.length) worst = { length: wound.overlap, where };
        }
      }
      if (bad > 0) misread.push(`${piece.step}/${piece.material} piece ${String(piece.slot)}: ${String(bad)} lines misread, the first ${first}`);
    }
    expect(lines, 'lines tried').toBeGreaterThan(50_000);
    expect(misread, 'pieces the walk reads open').toEqual([]);
    expect(unbalanced.slice(0, 20), `lines whose faces looking up and looking down do not balance, ${String(unbalanced.length)} in all`).toEqual([]);
    expect(worst.length, `the most a line runs through overlapping parts of one piece, ${worst.where}`).toBeLessThan(BODY.height - STANDING);
  });
});
