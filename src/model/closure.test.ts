/**
 * The pieces the walk and the section cut read, each closed along vertical lines or a declared sheet (docs/design/spec.md, Build-step API: Solids and
 * sheets), on the real sequence at t = N. A piece that a vertical line crosses an odd number of times has no inside along it: the walk's settle never
 * finds a walker built into it there (Walk mode: When the build moves), and a cut through it there shows what lies under it (View menu). Work unit 3's
 * review 2 found two such builders (F13, F14), work unit 5 closed them, and work unit 6 closed every other.
 * Pieces: every piece of every mesh the walk collides with (src/walk/collision.ts `collisionMeshes`, the doors' closed leaves among them) or the cut caps
 * (src/viewer/section-cut.ts `capsMesh`, as src/main.ts picks them), as its step's mesh draws it, and each door's leaves apart, as the door layer's
 * stand-ins draw them (src/model/lib/window.ts `doorLeavesOf`), but the sheets their builders declare (src/model/lib/sheet.ts), which SHEETS counts by
 * step and material so that a new one is seen; the walk reads no inside in a sheet, whatever its crossings, and the cut leaves it out. Pieces read alike
 * form a shape: one geometry with one direction of world vertical in its frame.
 * Four readings. The mesh's own, exact: along world vertical in each shape's frame (src/model/lib/check.ts `openAlong`); a shape every face of which
 * stands upright gives no crossing to read, so it must be a declared sheet. The walk's: its crossing query (`CollisionWorld.crossings`) on a collision
 * world of the walked meshes, along four lines through each of up to FACES faces of each walked shape that are not vertical (one inside the face, one
 * near each corner), each meeting its piece at that face an even number of times. The faces' winding on the same lines: as many look up as look down,
 * so a face wound the wrong way or doubled fails, though a part wound wholly inside out does not (two builders' parts are, an open finding the spec
 * names); and where parts of one piece overlap, which the parity rule reads as outside, no line runs through them for as long as settle's span
 * (BODY.height less STANDING), read on the shape's first walked piece and scaled to its walked piece that stretches the lines most, so a walker built
 * into a piece is found. And each upright face's inside: at the same four points of every upright face of every shape, BEHIND to one side or the other,
 * the faces above wind to an inside, so a part with no top and no bottom, whose open rims cancel along vertical lines, fails, unless the face lies back
 * to back on another, one side of a two-sided membrane, which has no inside to lose.
 * Red with an Attic base's bottom left out (src/model/lib/column.ts: 8 shapes open, also read open by the walk), with `openWall`'s bottom left out (14
 * shapes open and misread) or `archedPassage`'s feet (the gallery 600 passage), with main's crossing rule, which counted hits within 1 µm once (206
 * shapes misread), with the walk's instance numbering off by a mesh (863 shapes misread), with the urn plinth's underside turned up
 * (src/model/lib/fittings.ts: 169 lines unbalanced), with the medieval piers' half shafts made whole cylinders, half in the core (3.9 m of overlap), with
 * one Hunt medallion of each pair three times as tall (2.27 m, which the piece measured reads as 0.76 m), with the piers' core left with no top and no
 * bottom (30 points of its upright faces with no inside), with the moon gate panel's foot, top and ends left out (288), with UNIT_TILE no sheet (2,008
 * shapes open, 7 SHEETS counts off) and with the window panes of src/model/lib/window.ts no sheet (19 upright shapes, 10 SHEETS counts off).
 * Bound: `openAlong` joins ends nearer than 0.1 mm and leaves out open boundary under 1 mm in all, each in the geometry's own frame, so an opening
 * narrower or with less boundary is not seen; a piece its matrix scales up sees both larger (up to 99 times, the Hunt foundations' unit boxes). The
 * other readings try up to FACES faces a shape, spread evenly over those that are not vertical, on its first walked piece, and four points of each
 * upright face; they see an opening, a wrong winding, an overlap or a missing inside only under one of their lines. The overlap is read from the
 * winding, so an overlap with a part wound inside out is not seen; neither of the two overlaps another part of its piece, as their builders make them.
 */
import { DoubleSide, Matrix3, Matrix4, Ray, Vector3 } from 'three';
import type { BufferGeometry, InstancedMesh, Material } from 'three';
import type { MeshBVH } from 'three-mesh-bvh';
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
  // Standing upright, every face vertical: lib/window.ts's window and door panes, the site's curbs, retaining walls and excavation faces (site/grid.ts),
  // core/arches.ts's tympanum panels, the Arms and Armor Court's banners and the Astor Court's moon gate surround.
  'american-1924-walls/glassDark': 2,
  'american-walls/glassDark': 1,
  'armor-court-parade/mmwClothBlue': 5,
  'armor-court-parade/mmwClothGold': 6,
  'armor-court-parade/mmwClothRed': 5,
  'armor-court-vault/glass': 10,
  'astor-court-floor-walls/mmwPavingGrey': 1,
  'engelhard-bank-facade/glassDark': 2,
  'hunt-windows/glassDark': 17,
  'hunt-windows/huntDoorLeafGlass': 3,
  'medieval-hall-clerestory-vault/glass': 12,
  'mmw-north-windows/glassDark': 50,
  'mmw-south-windows/glassDark': 48,
  'site-terrain/siteExcavation': 1,
  'site-terrain/siteGranite': 1,
  'site-terrain/siteWallStone': 1,
  'vaux-openings/glassDark': 12,
  'vaux-west-front/brick': 7,
  'wings-openings/glassDark': 137,
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
  /** World metres along a vertical line per metre of that line in its geometry's frame (1 / |M⁻¹ ŷ|): what its overlaps along the line scale by. */
  readonly stretch: number;
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
        const along = new Vector3(0, 1, 0).applyMatrix3(linear.setFromMatrix4(world).invert());
        const vertical = along.clone().normalize();
        if (vertical.y < 0) vertical.negate();
        // To six decimals, −0 read as 0, so pieces turned alike share a reading.
        const id = `${mesh.geometry.uuid} ${vertical.toArray().map((v) => String(Number(v.toFixed(6)) + 0)).join(',')}`;
        const shape = found.get(id) ?? { geometry: mesh.geometry, vertical, pieces: [] };
        shape.pieces.push({ step: step.def.id, material: materials.map((m) => m.name).join('+'), mesh, slot, world, stretch: 1 / along.length() });
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

/** Whether some face of `geometry` crosses lines along `vertical`, a unit direction in its frame: a face that does not stand upright. */
function faceAcross(geometry: BufferGeometry, vertical: Vector3): boolean {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const [a, b, c] = [new Vector3(), new Vector3(), new Vector3()];
  for (let k = 0; k + 2 < (index?.count ?? position.count); k += 3) {
    const corner = (j: number): number => (index === null ? j : index.getX(j));
    a.fromBufferAttribute(position, corner(k));
    b.fromBufferAttribute(position, corner(k + 1)).sub(a);
    c.fromBufferAttribute(position, corner(k + 2)).sub(a);
    b.cross(c);
    if (Math.abs(b.dot(vertical)) > 1e-6 * b.length()) return true;
  }
  return false;
}

/** How far either side of an upright face its inside is looked for, in its geometry's frame. */
const BEHIND = 1e-4;

/**
 * The winding at `q`, in a geometry's frame, of the faces that a line along `vertical`, a unit direction, meets above it, from `reach` above it: +1 for
 * each looking up and −1 for each looking down, so 1 inside a closed part wound outward and 0 outside. Hits at one height that lie on edges of their
 * triangles and face one way count once, one surface met through an edge, as the walk's crossing query reads them.
 */
function windingAbove(bvh: MeshBVH, q: Vector3, vertical: Vector3, reach: number): number {
  const ray = new Ray(q.clone().addScaledVector(vertical, reach), vertical.clone().negate());
  const hits = bvh
    .raycast(ray, DoubleSide)
    .filter((h) => h.distance < reach)
    .map((h) => {
      const at = h.barycoord ?? undefined;
      return { d: h.distance, facing: Math.sign(h.face?.normal.dot(vertical) ?? 0), edge: at === undefined || Math.min(at.x, at.y, at.z) < 1e-9 };
    })
    .sort((p, r) => p.d - r.d);
  let winding = 0;
  let level: typeof hits = [];
  for (const hit of hits) {
    if (level.length > 0 && hit.d - (level[0]?.d ?? 0) >= 1e-6) level = [];
    if (hit.edge && level.some((l) => l.edge && l.facing === hit.facing)) continue;
    level.push(hit);
    winding += hit.facing;
  }
  return winding;
}

/** Whether another face of `geometry` lies back to back on face `face` at its point `p`: the face is one side of a two-sided membrane. */
function backed(geometry: BufferGeometry, face: number, p: Vector3, normal: Vector3): boolean {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const [a, b, c, n, r] = [new Vector3(), new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  for (let k = 0; k + 2 < (index?.count ?? position.count); k += 3) {
    if (k === face * 3) continue;
    const corner = (j: number): number => (index === null ? j : index.getX(j));
    a.fromBufferAttribute(position, corner(k));
    b.fromBufferAttribute(position, corner(k + 1)).sub(a);
    c.fromBufferAttribute(position, corner(k + 2)).sub(a);
    n.crossVectors(b, c);
    const length = n.length();
    if (length < 1e-12 || n.dot(normal) / length > -0.999) continue;
    r.subVectors(p, a);
    if (Math.abs(r.dot(n)) / length > 1e-6) continue;
    // Barycentric coordinates of p in the other face.
    const [bb, bc, cc, rb, rc] = [b.dot(b), b.dot(c), c.dot(c), r.dot(b), r.dot(c)];
    const d = bb * cc - bc * bc;
    const u = (cc * rb - bc * rc) / d;
    const w = (bb * rc - bc * rb) / d;
    if (u >= -1e-9 && w >= -1e-9 && u + w <= 1 + 1e-9) return true;
  }
  return false;
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

  it('declare every surface standing upright a sheet: a shape all of whose faces are vertical has no inside along any vertical line', () => {
    const upright = shapes.filter((shape) => !faceAcross(shape.geometry, shape.vertical));
    const named = upright.map((shape) => `${[...new Set(shape.pieces.map((p) => `${p.step}/${p.material}`))].join(', ')}: ${String(shape.pieces.length)} pieces, every face upright`);
    expect(named, 'surfaces standing upright, which pass the closure check with no crossing at all: declare them sheets with sheet() (src/model/lib/sheet.ts)').toEqual([]);
  });

  it('stand every upright face of a solid by its inside: a part with no top and no bottom has none and reads as outside', () => {
    const bvhs = new GeometryBvhs();
    const hollow: string[] = [];
    const [a, b, c, n, p, q] = [new Vector3(), new Vector3(), new Vector3(), new Vector3(), new Vector3(), new Vector3()];
    for (const shape of shapes) {
      const { geometry, vertical } = shape;
      const bvh = bvhs.get(geometry);
      if (geometry.boundingSphere === null) geometry.computeBoundingSphere();
      const reach = 3 * (geometry.boundingSphere?.radius ?? 0) + 1;
      const position = geometry.getAttribute('position');
      const index = geometry.getIndex();
      let bad = 0;
      let first = '';
      for (let k = 0; k + 2 < (index?.count ?? position.count); k += 3) {
        const corner = (j: number): number => (index === null ? j : index.getX(j));
        a.fromBufferAttribute(position, corner(k));
        b.fromBufferAttribute(position, corner(k + 1));
        c.fromBufferAttribute(position, corner(k + 2));
        n.subVectors(b, a).cross(q.subVectors(c, a));
        const length = n.length();
        if (length < 1e-12 || Math.abs(n.dot(vertical)) > 1e-6 * length) continue;
        n.divideScalar(length);
        // At the walk's four points of the face; a part wound inside out has its inside in front of its faces, so either side will do.
        for (const [wa, wb, wc] of LINES) {
          p.set(0, 0, 0).addScaledVector(a, wa).addScaledVector(b, wb).addScaledVector(c, wc);
          if ([1, -1].some((side) => windingAbove(bvh, q.copy(p).addScaledVector(n, side * BEHIND), vertical, reach) !== 0)) continue;
          if (backed(geometry, k / 3, p, n)) continue;
          if ((bad += 1) === 1) first = `by X ${p.x.toFixed(2)}, Y ${p.y.toFixed(2)}, Z ${p.z.toFixed(2)} in its frame`;
        }
      }
      if (bad > 0) hollow.push(`${[...new Set(shape.pieces.map((pc) => `${pc.step}/${pc.material}`))].join(', ')}: ${String(bad)} points of upright faces with no inside on either side, the first ${first}`);
    }
    expect(hollow, 'upright faces with nothing inside on either side, a part with no top and no bottom or a surface in a solid: close the part, or make the surface a sheet of its own').toEqual([]);
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
      // The overlaps measured on this piece, in the walked piece of the shape stretched most along its lines.
      const stretch = shape.pieces.reduce((most, q) => (walkedSet.has(q.mesh) ? Math.max(most, q.stretch) : most), piece.stretch) / piece.stretch;
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
          if (wound.overlap * stretch > worst.length) worst = { length: wound.overlap * stretch, where: `${where}${stretch > 1 + 1e-9 ? `, in a piece ${stretch.toFixed(2)} times as tall` : ''}` };
        }
      }
      if (bad > 0) misread.push(`${piece.step}/${piece.material} piece ${String(piece.slot)}: ${String(bad)} lines misread, the first ${first}`);
    }
    expect(lines, 'lines tried').toBeGreaterThan(50_000);
    expect(misread, 'pieces the walk reads open: close them along vertical lines (see the crossing rule, src/walk/collision.ts crossings)').toEqual([]);
    expect(unbalanced.slice(0, 20), `lines whose faces looking up and looking down do not balance, ${String(unbalanced.length)} in all: wind each face to look out of its part`).toEqual([]);
    expect(worst.length, `the most a line runs through overlapping parts of one piece, ${worst.where}: keep overlaps shorter along vertical lines than settle's span, BODY.height less STANDING`).toBeLessThan(BODY.height - STANDING);
  });
});
