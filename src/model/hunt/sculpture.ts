/**
 * Hunt facade, Karl Bitter's sculpture and the carved trim (1901–1902): six portrait medallions in the arches' spandrels, a helmeted head of Athena on each
 * keystone, hoods over the four niches with panels and string courses on the piers between the column pairs, and four caryatids on the flanking wings.
 * The heads, portraits and figures are blocked out as simple masses at their measured sizes; the niches stay empty (exterior.md H13).
 * Evidence: S7 (Schneider 2019) at 1:1 (medallions 1.8 m at Y 18.6, 4.96 m off each arch's axis; keystones from Y 18.4 to the cornice; caryatids 3.2 m tall).
 */
import * as THREE from 'three';

import type { StepDef } from '../../build/types.js';
import { palette } from '../palette.js';
import { keystone, lathe, MeshBuilder, moulding, ProfilePen } from '../lib/index.js';
import { HUNT_MEDALLION_CENTRE_Y, HUNT_MEDALLION_DIAMETER, HUNT_PAIR_AXIS_SPACING } from '../frame.js';
import { ARCH_OUTER_SPAN, ARCH_SPRING_Y, ARCHIVOLT_BAND, BAY_X, EXT_FACE_Z, EXT_NORTH_X, EXT_SOUTH_X, PAIR_X, PAVILION_HALF, PILASTER_W, WALL_Z } from './dims.js';
import { at, box, medallionDisc, scaled } from './shapes.js';
import { NICHE } from './walls.js';

const lazy = <T>(make: () => T): (() => T) => {
  let value: T | undefined;
  return () => (value ??= make());
};

/** A smooth ellipsoid cap (half or more), for heads and busts: radii rx, ry, rz, its flat back at z = 0. */
function ellipsoidInto(b: MeshBuilder, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number): void {
  const mark = b.vertexCount;
  const rows: THREE.Vector3[][] = [];
  for (let j = 0; j <= 6; j++) {
    const phi = (j / 6) * (Math.PI / 2);
    const row: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      const theta = (i / 12) * Math.PI * 2;
      row.push(new THREE.Vector3(rx * Math.cos(phi) * Math.cos(theta), ry * Math.cos(phi) * Math.sin(theta), rz * Math.sin(phi)));
    }
    rows.push(row);
  }
  b.grid(rows);
  b.transform(mark, new THREE.Matrix4().makeTranslation(cx, cy, cz));
}

/** A portrait medallion: the moulded disc and a bust in low relief. Faces +Z, origin at its centre on the wall. */
const medallion = lazy(() => {
  const b = new MeshBuilder();
  const r = HUNT_MEDALLION_DIAMETER / 2;
  b.append(medallionDisc(r, 0.26, 32));
  ellipsoidInto(b, 0.02, 0.12, 0.15, r * 0.34, r * 0.42, 0.2);
  ellipsoidInto(b, 0, -r * 0.42, 0.15, r * 0.5, r * 0.22, 0.12);
  return b.build();
});

/** A helmeted head on the keystone's face: face, crest and cheek-guards as low masses. Origin at the keystone's bottom centre, on its face plane. */
const athena = lazy(() => {
  const b = new MeshBuilder();
  ellipsoidInto(b, 0, 0.75, 0, 0.36, 0.48, 0.34);
  ellipsoidInto(b, 0, 1.22, -0.05, 0.42, 0.26, 0.3);
  b.box([-0.08, 1.3, -0.1], [0.08, 1.62, 0.3]);
  return b.build();
});

/** A draped caryatid with a basket capital, about 3.2 m tall, a lathe body flattened front to back. Origin at its base centre. */
const caryatid = lazy(() => {
  const pen = new ProfilePen(0, 0)
    .to(0.4, 0)
    .to(0.4, 0.18)
    .to(0.32, 0.22)
    .to(0.3, 1.2)
    .to(0.24, 1.7)
    .to(0.3, 2.1)
    .to(0.33, 2.3)
    .to(0.14, 2.42)
    .to(0.17, 2.55)
    .to(0.18, 2.75)
    .to(0.12, 2.86)
    .to(0.3, 2.9)
    .to(0.34, 3.05)
    .to(0.42, 3.2)
    .to(0, 3.2);
  const g = lathe(pen.open(), { segments: 14 });
  g.applyMatrix4(new THREE.Matrix4().makeScale(1, 1, 0.62));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
});

/** The hood over a niche: a small cornice swept across and returned to the wall. Origin at the niche's top centre on the wall face. */
const nicheHood = lazy(() =>
  moulding({
    profile: 'cornice-plain',
    path: [
      [-1.0, 0, 0],
      [-1.0, 0, 0.3],
      [1.0, 0, 0.3],
      [1.0, 0, 0],
    ],
    height: 0.38,
    projection: 0.2,
  }),
);

export const sculptureSteps: readonly StepDef[] = [
  {
    id: 'hunt-sculpture',
    chapter: 'hunt-1902',
    year: '1902',
    title: "Carve Bitter's medallions, masks and caryatids",
    detail: "Karl Bitter's six portrait medallions of old masters fill the spandrels, a head of Athena crowns each keystone, and four caryatids stand on the wings for painting, sculpture, architecture and music.",
    motion: { kind: 'pop' },
    stagger: 'x',
    build(kit) {
      const offset = 4.96;
      const keyY = ARCH_SPRING_Y + ARCH_OUTER_SPAN / 2;
      const key = keystone({ width: 0.95, height: 1.5, taper: 0.3, projection: 0.42 });
      for (const x of BAY_X) {
        for (const s of [-1, 1]) kit.add(medallion(), palette.limestone, at(x + s * offset, HUNT_MEDALLION_CENTRE_Y, WALL_Z));
        kit.add(key, palette.limestone, at(x, keyY - 0.05, WALL_Z + ARCHIVOLT_BAND * 0.25));
        kit.add(athena(), palette.limestone, at(x, keyY - 0.05, WALL_Z + ARCHIVOLT_BAND * 0.25 + 0.45));
      }
      // The piers between each pair's columns: hood over the niche, a string course at the imposts and a raised panel above.
      const between = HUNT_PAIR_AXIS_SPACING - PILASTER_W - 0.05;
      for (const x of PAIR_X) {
        kit.add(nicheHood(), palette.limestone, at(x, NICHE.top, WALL_Z));
        box(kit, palette.limestone, [x - 0.18, NICHE.top - 0.42, WALL_Z], [x + 0.18, NICHE.top + 0.05, WALL_Z + 0.22]);
        box(kit, palette.limestone, [x - between / 2, ARCH_SPRING_Y - 0.4, WALL_Z], [x + between / 2, ARCH_SPRING_Y - 0.05, WALL_Z + 0.18]);
        box(kit, palette.limestone, [x - between / 2 + 0.25, 13.8, WALL_Z], [x + between / 2 - 0.25, 16.6, WALL_Z + 0.09]);
      }
      // Caryatids on the wings, flanking each wing's middle panel, on corbels under the dentilled cornice.
      for (const [x0, x1] of [
        [EXT_SOUTH_X, -PAVILION_HALF],
        [PAVILION_HALF, EXT_NORTH_X],
      ] as const) {
        const cx = (x0 + x1) / 2;
        for (const s of [-1, 1]) {
          const x = cx + s * 3.55;
          box(kit, palette.limestone, [x - 0.5, 13.4, EXT_FACE_Z], [x + 0.5, 13.9, EXT_FACE_Z + 0.75]);
          kit.add(caryatid(), palette.limestone, scaled(x, 13.9, EXT_FACE_Z + 0.42, 1.45, 1, 1.1));
        }
      }
    },
  },
];
