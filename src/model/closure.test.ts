/**
 * The pieces the walk and the section cut read, each closed along vertical lines or a declared sheet (docs/design/spec.md, Build-step API: Solids and
 * sheets), on the real sequence at t = N. A piece that a vertical line crosses an odd number of times has no inside along it: the walk's settle never
 * finds a walker built into it there (Walk mode: When the build moves), and a cut through it there shows what lies under it (View menu). Work unit 3's
 * review 2 found two such builders (F13, F14), work unit 5 closed them, and work unit 6 closed every other.
 * Pieces: every piece of every mesh the walk collides with (src/walk/collision.ts `collisionMeshes`, the doors' closed leaves among them) or the cut caps
 * (src/viewer/section-cut.ts `capsMesh`, as src/main.ts picks them), as its step's mesh draws it, and each door's leaves apart, as the door layer's
 * stand-ins draw them (src/model/lib/window.ts `doorLeavesOf`), but the sheets their builders declare (src/model/lib/sheet.ts), which SHEETS counts by
 * step and material so that a new one is seen (10,028 sheet pieces in 53 pairs: glass, paving, roads, paths, the terrain, the pad and the upright
 * surfaces); the walk reads no inside in a sheet, whatever its crossings (`LineCrossings.sheet`, from `build` and `buildPieces` alike), and the cut
 * leaves it out. Pieces read alike form a shape: one geometry with one direction of world vertical in its frame. Counted at dc1a7dc: 870 shapes of
 * 16,766 pieces.
 * Five readings. The mesh's own, exact: along world vertical in each shape's frame (src/model/lib/check.ts `openAlong`); a shape every face of which
 * stands upright gives no crossing to read, so it must be a declared sheet (window and door panes, banners, the site's curbs and retaining walls
 * are). The walk's: its crossing query (`CollisionWorld.crossings`) on a collision world of the walked meshes, along four lines through each of up to
 * FACES (24) faces of each walked shape that are not vertical (one inside the face, one near each corner; 56,168 lines at 3165aa5), each meeting its
 * piece at that face an even number of times, with the walk's facings (`LineCrossings.facings`, which src/walk/footing.ts reads) one a crossing, as
 * many looking up as down, and holding the line inside where the faces' own winding does, to within 1e-5 m of the line (`insideApart`; work unit 13,
 * reviews 2 and 3: red with the facings turned over, all 0 or none, on all 57,352 lines, with the normals taken out by the matrix rather than its
 * inverse transpose, on 342, and with review 3's facings planted on one line of `vaux-west-front/core.granite`, on that line, which the comparison of
 * inside lengths this replaced passed). The faces' winding on the same lines: as many look up as look down, so a face wound the wrong way or doubled
 * fails, and no stretch where more look down than up above it, a pocket wound inside out where a surface folds through itself or stands out of its
 * part; and where parts of one piece overlap, which the parity rule reads as outside, no line runs through them for as long as settle's span
 * (BODY.height less STANDING), read on the shape's first walked piece and scaled to its walked piece that stretches the lines most (the most is
 * 0.76 m, a Hunt facade medallion's bust in its disc), so a walker built into a piece is found, but on a line the crossing rule reads once (its
 * bound, src/walk/crossing-rule.ts). And each upright face's inside: at seven points of every upright face of every shape (the lines' four and one near
 * the middle of each edge), BEHIND behind it and in front of it, the faces above wind to more inside behind it than in front, or to the same inside
 * on both sides, as within an overlap or where it lies face to face on another part of its piece, so a part with no top and no bottom, whose open
 * rims cancel along vertical lines, fails, and so does a face wound in, unless the face lies back to back on another, one side of a two-sided
 * membrane, which has no inside to lose. A face stands upright when lines along vertical see it at most BEHIND (0.1 mm) wide, twice its area in plan
 * over its longest edge in plan, in its frame. And each closed part's facing as drawn: its volume read along vertical by its faces
 * (src/model/lib/facing.ts `partVolumes`), each part on its own and those that close only together as one (4,774 parts at 3ac62d7: 4,726 of the
 * shapes, 48 of the doors' leaves), signed by its piece's matrix, which an instanced mesh does not turn back; no pocket on a grid of GRID (64) lines
 * a side over each shape and each door's leaves, nor on two lines beside each of their open edges (`inwardAlong`, each line cast again a hair aside
 * where it meets an edge), which read a part whose open ends line up along vertical lines and wind inside out between them, as `openAlong` reads such
 * a part closed; and no piece of the model, all 27,043 at 3ac62d7, mirrored by its matrix.
 * Red with an Attic base's bottom left out (src/model/lib/column.ts: 8 shapes open, also read open by the walk), with `openWall`'s bottom left out (14
 * shapes open and misread) or `archedPassage`'s feet (the gallery 600 passage in `grand-stair-vault`), with main's crossing rule, which counted hits
 * within 1 µm once (206 shapes misread), with the walk's instance numbering off by a mesh (863 shapes misread), with the urn plinth's underside
 * turned up (src/model/lib/fittings.ts: 169 lines unbalanced), with the medieval piers' half shafts made whole cylinders, half in the core (3.9 m of
 * overlap), with one Hunt medallion of each pair three times as tall (2.27 m, which the piece measured reads as 0.76 m), with the piers' core left
 * with no top and no bottom (38 points of upright faces with no inside), with the moon gate panel's foot, top and ends left out (504), with the Great
 * Hall pendentives' spandrels on their old points, apart from the curved faces' (8), with UNIT_TILE no sheet (2,008 shapes open, 7 SHEETS counts
 * off), with the window panes of src/model/lib/window.ts no sheet (19 upright shapes, 10 SHEETS counts off), with `upright`'s rule of review 3 (its
 * own check: a point read as not upright), with `extrudeOutline` taking the armour court gables' clockwise outline as given
 * (src/model/mmw/facade-parts.ts: 2 parts facing in, 48 lines through pockets), with the Dendur rolls' ends reversed
 * (src/model/roche-north/temple.ts: 2 pieces mirrored, facing in), with the Hunt arches' and Great Hall arches' soffits back on their 0.06 and 0.08 m
 * shells and `barrelVault`'s refusal off (58 lines), with the acanthus leaves' quads split along one diagonal (src/model/lib/acanthus.ts: 2 lines,
 * and 3 shapes on the grid), with Diana's bow left open (src/model/roche-north/figures.ts: 9 lines, 0.74 m long) and with `prism`'s side walls wound
 * in (src/model/roche-south/shapes.ts `sideQuads`: upright faces in 22 shapes).
 * Bound: `openAlong` joins ends nearer than 0.1 mm and leaves out open boundary under 1 mm in all, each in the geometry's own frame, so an opening
 * narrower or with less boundary is not seen; a piece its matrix scales up sees both larger (up to 99 times, the Hunt foundations' unit boxes). The
 * other readings try up to FACES faces a shape, spread evenly over those that are not vertical, on its first walked piece, and seven points of each
 * upright face; they see an opening, a wrong winding, an overlap, a pocket or a missing inside only under one of their lines or at one of their points.
 * The walk's reading takes its heights within 0.1 mm of the face and its inside within 1e-5 m, both read where the line lies, but the walk reads a
 * line in doubt 30 to 42 µm off (src/walk/crossing-rule.ts), where a face steeper than about 2.4, or 1 in 4 for the inside, would stray past them;
 * none of its 57,352 lines is in doubt for a piece it meets (measured for review 3). The overlap is read from the winding, so an overlap with a part
 * wound inside out is not seen, and the facing reading finds none. That reading sees a
 * part's sign in all, so one wound inside out among the outward parts it closes only together with can pass (its own bound). The grid sees a pocket only
 * under one of its lines, so one narrower than its cells that no open edge borders can be missed (Diana's open bow showed on 1 of the grid's 4,096
 * lines, and on 8 beside its open edges); lined-up open ends that wind to an inside between them, and a pocket narrower than 0.1 mm beside an open edge,
 * are not seen (`inwardAlong`'s bound). The upright reading passes a face wound in that lies face to face on another part of its piece.
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
import { BEHIND, backed, faceAcross, facesAlong, insideApart, upright, windingAbove, windingAlong, worldTriangles } from './closure-readings.js';
import { openAlong } from './lib/check.js';
import { inwardAlong, partVolumes } from './lib/facing.js';
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
/** Lines a side of the grid laid over each shape (`inwardAlong`). */
const GRID = 64;
/** The lines through a face, as weights of its corners: one inside it, off its centroid, and one near each corner, all off its edges. */
const LINES: readonly (readonly [number, number, number])[] = [
  [0.31, 0.33, 0.36],
  [0.94, 0.027, 0.033],
  [0.029, 0.94, 0.031],
  [0.032, 0.028, 0.94],
];
/** The points of an upright face where an inside is looked for: the lines' four, and one near the middle of each edge. */
const UPRIGHT_POINTS: readonly (readonly [number, number, number])[] = [...LINES, [0.485, 0.485, 0.03], [0.03, 0.485, 0.485], [0.485, 0.03, 0.485]];

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

  it('call a face upright when vertical lines see it at most BEHIND wide, a point or a segment in plan among them', () => {
    const [up, at] = [new Vector3(0, 1, 0), (x: number, y: number, z: number): Vector3 => new Vector3(x, y, z)];
    expect(upright(at(1, 2, 3), at(1, 2, 3), at(1, 2, 3), up), 'a point').toBe(true);
    expect(upright(at(0, 0, 0), at(1, 0, 0), at(0, 5, 0), up), 'standing in a vertical plane').toBe(true);
    expect(upright(at(0, 0, 0), at(5e-5, 20, 0), at(0, 0, 1), up), 'leaning 0.05 mm out over a 1 m edge in plan').toBe(true);
    expect(upright(at(0, 0, 0), at(0.001, 20, 0), at(0, 0, 1), up), '1 mm wide in plan, though 20 m tall').toBe(false);
    expect(upright(at(0, 0, 0), at(1, 0, 0), at(0, 0, 1), up), 'level').toBe(false);
  });

  it('declare every surface standing upright a sheet: a shape all of whose faces are vertical has no inside along any vertical line', () => {
    const upright = shapes.filter((shape) => !faceAcross(shape.geometry, shape.vertical));
    const named = upright.map((shape) => `${[...new Set(shape.pieces.map((p) => `${p.step}/${p.material}`))].join(', ')}: ${String(shape.pieces.length)} pieces, every face upright`);
    expect(named, 'surfaces standing upright, which pass the closure check with no crossing at all: declare them sheets with sheet() (src/model/lib/sheet.ts)').toEqual([]);
  });

  it('stand every upright face of a solid by its inside, behind it: a part with no top and no bottom has none, and a face wound in has it in front', () => {
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
        if (length < 1e-12 || !upright(a, b, c, vertical)) continue;
        n.divideScalar(length);
        // At the face's points, behind it and in front. A part wound wholly inside out reads −1 in front against 0 behind and passes; the facing test finds it.
        for (const [wa, wb, wc] of UPRIGHT_POINTS) {
          p.set(0, 0, 0).addScaledVector(a, wa).addScaledVector(b, wb).addScaledVector(c, wc);
          // A face looking out has more inside behind it than in front; one with the same inside on both sides stands within an overlap.
          const [front, behind] = [1, -1].map((side) => windingAbove(bvh, q.copy(p).addScaledVector(n, side * BEHIND), vertical, reach));
          if (front === undefined || behind === undefined || behind > front || (behind === front && behind !== 0)) continue;
          if (backed(geometry, k / 3, p, n)) continue;
          const at = p.clone().applyMatrix4(shape.pieces[0]?.world ?? new Matrix4());
          if ((bad += 1) === 1) first = `${front > behind ? 'its inside in front' : 'no inside on either side'} by X ${at.x.toFixed(2)}, Z ${at.z.toFixed(2)}, ${at.y.toFixed(2)} m up`;
        }
      }
      if (bad > 0) hollow.push(`${[...new Set(shape.pieces.map((pc) => `${pc.step}/${pc.material}`))].join(', ')}: ${String(bad)} points of upright faces with no inside behind them, the first with ${first}`);
    }
    expect(hollow, 'upright faces with no inside behind them: a part with no top and no bottom or a surface in a solid (close the part, or make the surface a sheet of its own), or a face wound in (turn it out)').toEqual([]);
  });

  it('face out as drawn: every closed part holds its inside behind its faces, its piece unmirrored by its matrix', () => {
    const inward: string[] = [];
    for (const shape of shapes) {
      // An instanced mesh draws a piece its matrix mirrors with its faces turned in, so the pieces are read by their matrices' sign.
      const bySign = new Map<number, Piece[]>();
      for (const piece of shape.pieces) {
        const sign = Math.sign(piece.world.determinant());
        bySign.set(sign, [...(bySign.get(sign) ?? []), piece].slice(0, 3));
      }
      for (const geometry of [shape.geometry, ...(doorLeavesOf(shape.geometry) ?? []).map((leaf) => leaf.geometry)]) {
        for (const part of partVolumes(geometry, shape.vertical)) {
          if (Math.abs(part.volume) <= part.noise) continue;
          for (const [sign, [first, ...more] = []] of bySign) {
            if (first === undefined || part.volume * sign > 0) continue;
            const at = part.at.clone().applyMatrix4(first.world);
            const what = `${[first, ...more].map((p) => `${p.step}/${p.material} piece ${String(p.slot)}`).join(', ')}${sign < 0 ? ', mirrored by its matrix' : ''}`;
            inward.push(`${what}: ${part.parts > 1 ? `${String(part.parts)} parts that close together` : 'a part'} of ${Math.abs(part.volume * first.world.determinant()).toFixed(4)} m³ faces in, by X ${at.x.toFixed(2)}, Z ${at.z.toFixed(2)}, ${at.y.toFixed(2)} m up`);
          }
        }
      }
    }
    expect(inward, "closed parts facing in as drawn: wind each part's faces to look out of it, and mirror a piece in its geometry, not its matrix").toEqual([]);
  });

  it('leave no piece of the model mirrored by its matrix, read here or not, which its instanced mesh would draw inside out', () => {
    const mirrored = timeline.steps.flatMap((step) =>
      step.meshes.flatMap((mesh) => {
        mesh.updateMatrixWorld(true);
        const world = (slot: number): Matrix4 => new Matrix4().fromArray(mesh.instanceMatrix.array, slot * 16).premultiply(mesh.matrixWorld);
        return Array.from({ length: mesh.count }, (_, slot) => slot).filter((slot) => world(slot).determinant() < 0).map((slot) => `${step.def.id} piece ${String(slot)}`);
      }),
    );
    expect(mirrored, 'pieces mirrored by their matrices: mirror them in their geometry (MeshBuilder.transform turns a mirrored copy back), or swap the ends that run backward').toEqual([]);
  });

  it(`fold nowhere: no line of a grid ${String(GRID)} a side over each shape and each door's leaves crosses a pocket wound inside out`, () => {
    const pockets: string[] = [];
    for (const shape of shapes) {
      const first = shape.pieces[0];
      if (first === undefined) continue;
      const where = [...new Set(shape.pieces.map((p) => `${p.step}/${p.material}`))].join(', ');
      const parts: [string, BufferGeometry][] = [['', shape.geometry], ...(doorLeavesOf(shape.geometry) ?? []).map((leaf, k): [string, BufferGeometry] => [` leaf ${String(k)}`, leaf.geometry])];
      for (const [what, geometry] of parts) {
        const found = inwardAlong(geometry, shape.vertical, GRID);
        if (found.at === null) continue;
        const at = found.at.clone().applyMatrix4(first.world);
        pockets.push(`${where}${what}: ${String(found.lines)} lines, the longest stretch ${(found.worst * first.stretch).toFixed(4)} m, by X ${at.x.toFixed(2)}, Z ${at.z.toFixed(2)}, ${at.y.toFixed(2)} m up`);
      }
    }
    expect(pockets, 'shapes with a stretch where more faces look down than up above it, a part open where its open ends line up or a surface folded through itself: close it, or keep it from folding').toEqual([]);
  });

  it('declare as sheets only what SHEETS counts', () => {
    const changed = [...new Set([...sheets.keys(), ...Object.keys(SHEETS)])]
      .sort()
      .filter((key) => (sheets.get(key) ?? 0) !== (SHEETS[key] ?? 0))
      .map((key) => `${key}: ${String(sheets.get(key) ?? 0)} sheet pieces, SHEETS counts ${String(SHEETS[key] ?? 0)}`);
    expect(changed, 'step/material with more or fewer declared sheets than SHEETS counts: is each a surface with no inside?').toEqual([]);
  });

  it("are read closed by the walk's own crossing query, its facings with them, as many faces looking up as down, and no overlap of their parts as long as the walker is tall", () => {
    const world = new CollisionWorld(new GeometryBvhs());
    world.build(walked);
    const firsts = new Map<InstancedMesh, number>();
    let count = 0;
    for (const mesh of walked) {
      firsts.set(mesh, count);
      count += mesh.count;
    }
    const misread: string[] = [];
    const misfaced: string[] = [];
    const unbalanced: string[] = [];
    const inward: string[] = [];
    let worst = { length: 0, where: '' };
    let lines = 0;
    const [a, b, c, n, p] = [new Vector3(), new Vector3(), new Vector3(), new Vector3(), new Vector3()];
    for (const shape of shapes) {
      const piece = shape.pieces.find((q) => walkedSet.has(q.mesh));
      if (piece === undefined) continue;
      const instance = (firsts.get(piece.mesh) ?? 0) + piece.slot;
      const tris = worldTriangles(shape.geometry, piece.world);
      // The overlaps measured on this piece, in the walked piece of the shape stretched most along its lines.
      const tallest = shape.pieces.reduce((most, q) => (walkedSet.has(q.mesh) && q.stretch > most.stretch ? q : most), piece);
      const stretch = tallest.stretch / piece.stretch;
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
          const line = world.crossings(p.x, p.z, -Infinity, Infinity).find((l) => l.instance === instance);
          const heights = line?.heights ?? [];
          const wrong = !heights.some((h) => Math.abs(h - p.y) < 1e-4) ? 'misses the face it was drawn through' : heights.length % 2 !== 0 ? 'is crossed an odd number of times' : null;
          if (wrong !== null && (bad += 1) === 1) first = `by X ${p.x.toFixed(2)}, Z ${p.z.toFixed(2)} ${wrong}: ${heights.map((h) => h.toFixed(3)).join(', ') || 'no crossing'}`;
          const faces = facesAlong(tris, p.x, p.z);
          const wound = windingAlong(faces);
          const where = `${piece.step}/${piece.material} by X ${p.x.toFixed(2)}, Z ${p.z.toFixed(2)}`;
          // The walk's own facings (src/walk/footing.ts `under` reads them): one a crossing, as many up as down, inside where the faces wind to it.
          const facings = line?.facings ?? [];
          const apart = insideApart(heights.map((h, i): [number, number] => [h, facings[i] ?? 0]), faces);
          if (facings.length !== heights.length || facings.reduce((sum, f) => sum + f, 0) !== 0 || apart > 1e-5) misfaced.push(`${where}: facings ${facings.join(', ') || 'none'} at ${heights.map((h) => h.toFixed(3)).join(', ') || 'no crossing'}, inside apart from the faces' winding over ${apart.toFixed(4)} m`);
          if (wound.sum !== 0) unbalanced.push(`${where}: its faces looking up and looking down differ by ${String(wound.sum)}`);
          if (wound.inward > 0) inward.push(`${where}: ${wound.inward.toFixed(4)} m with more faces looking down than up above it`);
          if (wound.overlap * stretch > worst.length) worst = { length: wound.overlap * stretch, where: `${where}${tallest === piece ? '' : `, scaled ${stretch.toFixed(2)} times to ${tallest.step}/${tallest.material} piece ${String(tallest.slot)}`}` };
        }
      }
      if (bad > 0) misread.push(`${piece.step}/${piece.material} piece ${String(piece.slot)}: ${String(bad)} lines misread, the first ${first}`);
    }
    expect(lines, 'lines tried').toBeGreaterThan(50_000);
    expect(misread, 'pieces the walk reads open: close them along vertical lines (see the crossing rule, src/walk/crossing-rule.ts)').toEqual([]);
    expect(misfaced.slice(0, 20), `lines whose walk facings do not hold them inside as the faces wind, ${String(misfaced.length)} in all: see src/walk/collision.ts crossings`).toEqual([]);
    expect(unbalanced.slice(0, 20), `lines whose faces looking up and looking down do not balance, ${String(unbalanced.length)} in all: wind each face to look out of its part`).toEqual([]);
    expect(inward.slice(0, 20), `lines through a part or a pocket of one wound inside out, ${String(inward.length)} in all: keep each surface from folding through itself`).toEqual([]);
    expect(worst.length, `the most a line runs through overlapping parts of one piece, ${worst.where}: keep overlaps shorter along vertical lines than settle's span, BODY.height less STANDING`).toBeLessThan(BODY.height - STANDING);
  });
});
