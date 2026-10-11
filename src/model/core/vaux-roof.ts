/**
 * The top of the Vaux and Mould building: the skylit upper galleries (today European Paintings galleries 600, 601, 619, 620 and 635-640), the flat
 * roofs round their skylights, and the pitched roof over the central hall's nave, the brown roof the 2018 orthophoto shows on the axis
 * (exterior.md S5; Original_Met.jpg shows the 1880 central block's raised, skylit roof between the pavilions).
 */
import { Vector3 } from 'three';

import type { Kit } from '../../build/types.js';
import { palette } from '../palette.js';
import { A_HALF, HALL_NAVE_ROOF_EAVES_Y, PARTY_WALL, ROOF_Y, VAUX_HALL_EAST_Z, VAUX_HALL_WALL, VAUX_HALL_WEST_Z } from './constants.js';
import { galleryWalls, laylightFrames, roofWithSkylights } from './galleries.js';
import { INNER_EAST_Z, INNER_WEST_Z, INTERIOR, NAVE_OUTER_X, type Rect } from './layout.js';
import { barMatrix } from './skylights.js';
import { UNIT_BOX, addBox } from './shapes.js';
import { NAVE_RIDGE_Y } from './vaux-shell.js';

const [AX0, , AX1] = INTERIOR.a;
const HALL_WEST_FACE = VAUX_HALL_WEST_Z - VAUX_HALL_WALL;
const HALL_EAST_FACE = VAUX_HALL_EAST_Z + VAUX_HALL_WALL;
const OVERHANG = 0.35;
const THICKNESS = 0.28;

/** Second-floor gallery walls and laylight frames of block A. */
export function vauxGalleries(kit: Kit): void {
  galleryWalls(kit, 'a');
  laylightFrames(kit, 'a');
}

/** Block A's flat roofs and skylights (the nave and the end walls left open), then the nave roof: two lead slopes and a ridge roll. */
export function vauxRoof(kit: Kit): void {
  const open: Rect[] = [
    [-NAVE_OUTER_X, HALL_WEST_FACE, NAVE_OUTER_X, HALL_EAST_FACE],
    [AX0, HALL_WEST_FACE, AX1, VAUX_HALL_WEST_Z],
    [AX0, VAUX_HALL_EAST_Z, AX1, HALL_EAST_FACE],
  ];
  roofWithSkylights(kit, 'a', open);
  // Lead over the tops of the side walls, which the wings' roofs meet, and over the end walls beside the nave.
  for (const x of [-A_HALF, A_HALF - PARTY_WALL]) addBox(kit, palette.roofLead, x, ROOF_Y, INNER_WEST_Z, x + PARTY_WALL, ROOF_Y + 0.05, INNER_EAST_Z, 1);
  for (const [z0, z1] of [
    [HALL_WEST_FACE, VAUX_HALL_WEST_Z],
    [VAUX_HALL_EAST_Z, HALL_EAST_FACE],
  ] as const) {
    addBox(kit, palette.roofLead, AX0, ROOF_Y, z0, -NAVE_OUTER_X, ROOF_Y + 0.05, z1, 1);
    addBox(kit, palette.roofLead, NAVE_OUTER_X, ROOF_Y, z0, AX1, ROOF_Y + 0.05, z1, 1);
  }
  const z0 = HALL_WEST_FACE - 0.15;
  const z1 = HALL_EAST_FACE + 0.15;
  const zc = (z0 + z1) / 2;
  const tan = (NAVE_RIDGE_Y - HALL_NAVE_ROOF_EAVES_Y) / NAVE_OUTER_X;
  for (const side of [-1, 1]) {
    // The underside runs over the gable's raking edge, from the eaves (overhanging the nave wall) up to the ridge.
    const eave = new Vector3(side * (NAVE_OUTER_X + OVERHANG), HALL_NAVE_ROOF_EAVES_Y - OVERHANG * tan, zc);
    const ridge = new Vector3(0, NAVE_RIDGE_Y, zc);
    const axis = ridge.clone().sub(eave).normalize();
    const normal = new Vector3(side * axis.y, -side * axis.x, 0);
    const lift = normal.clone().multiplyScalar(THICKNESS / 2);
    kit.add(UNIT_BOX, palette.roofLead, barMatrix(eave.clone().add(lift), ridge.clone().add(lift), z1 - z0, THICKNESS, normal), 2);
  }
  kit.add(UNIT_BOX, palette.roofLead, barMatrix(new Vector3(0, NAVE_RIDGE_Y + 0.2, z0), new Vector3(0, NAVE_RIDGE_Y + 0.2, z1), 0.42, 0.3, new Vector3(0, 1, 0)), 3);
}
