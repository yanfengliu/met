/**
 * The porch of Weston's 1888 south front (history.md section 3) at the middle of its entrance pavilion on X −49.7, facing the Petrie Court: Weston
 * and Tuckerman's revised design for the south entrance of April 1888 (Heckscher fig. 29), as the court's photographs show it built
 * (interior-images.md #33, #35 and #43; interior.md, Weston's 1888 door). A projecting aedicule of Ionic pilasters on pedestals round the
 * square-headed doorway, under a carved frieze and a modillioned cornice that carry a balcony with a copper pipe railing.
 * Measured on fig. 29 (Heckscher's reproduction, 29.6 px a metre) from the doorway's middle and the porch floor, the main floor: pedestals ±1.87 to
 * ±2.95 m across the front and 0.96 m tall; the shafts about ±1.97 to ±2.75 m, plain to 3.19 m and fluted above; the capitals' top at 5.81 m; the
 * architrave, the frieze and the cornice to 7.31 m, the cornice's corona out to ±3.46 m; a top block to 7.6 m, the balcony's floor; the doorway
 * 3.29 m wide and 4.91 m tall in an architrave about 0.20 m wide. The drawing's plan is cut off along the porch's front, before the wall, so the
 * porch's depth, 2.25 m to its pilasters' faces, comes from three other readings: the 1888 first-floor plan (Heckscher fig. 26) about 2.2 m, the east side in #35 against the
 * porch's height about 2.3 m, and the railing in #33 about 2.0 m from post to post, its posts set in from the top block's edges. In #33 at full size
 * each front corner is a pier with a fluted pilaster on its front and on its side, the capital turning the corner; in #35 and fig. 110 each side is
 * that pilaster, a blind panel and a narrower pilaster against the wall. The door's leaves stand in the doorway near the porch's front (`DOOR`), so
 * the porch is a vestibule closed at its front; behind them the doorway runs on through the porch, its reveals and soffit in the porch's stone, and
 * through the 1888 wall's lined opening into gallery 529 (weston-facade.ts).
 * Frame: u along the front from the doorway's middle (toward +Z), y up from the main floor (L1), d out from the brick face into the court (toward −X).
 */
import { Matrix4 } from 'three';
import type { BufferGeometry, Material } from 'three';

import type { Kit } from '../../build/types.js';
import { entablature, MeshBuilder, ORDER_PROPORTIONS, pilasterParts, surround } from '../lib/index.js';
import type { V3 } from '../lib/index.js';
import { palette } from '../palette.js';
import { openWall } from './arches.js';
import { B_SOUTH_X, L1, WESTON_PAVILION_Z } from './constants.js';
import { core } from './materials.js';
import { FACING, addBox, cylinder, keyOf, memo, placed } from './shapes.js';

/** The doorway's middle along the front: the pavilion's, where the floor map has the door (constants.ts `WESTON_PAVILION_Z`). */
const CENTRE_Z = WESTON_PAVILION_Z;

/**
 * The doorway (interior.md, Weston's 1888 door): its opening as fig. 29 draws it, 3.29 m wide and 4.91 m from the porch floor to its head; its
 * architrave's width (0.19 to 0.22 m drawn) and how far it stands proud of the porch's front (estimated); where the door's frame stands, its front
 * `frame` behind the architrave's face, so that the leaves' hinges, on their back face 0.095 m behind the frame's front (src/model/lib/window.ts
 * `doorUnit`: a 0.12 m frame, 0.07 m leaves in its middle), stand 0.345 m behind it, where #33 at full size shows the lit gap at the east leaf's hinge,
 * open a quarter turn, about 0.35 m behind it (interior-images.md #33); and the stone lining of the 1888 wall's hole behind the porch and the threshold
 * under that (weston-facade.ts).
 */
export const DOOR = { width: 3.29, height: 4.91, trim: 0.2, proud: 0.08, frame: 0.25, lining: 0.15, threshold: 0.03 } as const;

/**
 * The porch's measures in its frame (see the header): measured on fig. 29 where nothing says otherwise. Estimates: the depth (three readings), the
 * pilasters' projection, the narrower pilasters' width and place, the pedestals' front and cap, and the railing.
 */
export const PORCH = {
  /** The pilasters' faces, out from the brick face: the porch's depth. */
  depth: 2.25,
  /** The body behind the pilasters: half its width, its depth and its height, the capitals' top. */
  body: { half: 2.63, depth: 2.13, height: 5.81 },
  /**
   * The front and side pilasters: face width, projection, flutes, and the front pair's centres. The shafts are drawn 0.76 to 0.78 m wide; at 0.72 m the
   * parts library's Attic base, 1.5 times as wide, is the drawn pedestals' width and clears the doorway's architrave. The library's Ionic capital is
   * 0.36 widths tall, 0.26 m, where the drawing's runs 0.52 m with its necking, and its base 0.36 m, where the drawn base runs 0.47 m.
   */
  pilaster: { width: 0.72, projection: 0.12, flutes: 7, u: 2.39 },
  /** The narrower pilasters against the wall (#35 and fig. 110, estimated): face width, flutes and centre out from the wall. */
  anta: { width: 0.38, flutes: 4, d: 0.31 },
  /** The pedestals: their inner and outer edges across the front, their front (estimated), height and cap (estimated). */
  pedestal: { inner: 1.85, outer: 2.95, front: 2.45, height: 0.96, cap: 0.12 },
  /** Where the shafts' fluting starts. */
  fluted: 3.19,
  /** The entablature from the capitals' top: architrave, frieze and modillioned cornice, 3 : 3 : 4 (the parts library's `entablature`). */
  entablature: 1.5,
  /** The balcony's floor, the top block's top. */
  top: 7.6,
} as const;

/** The entablature's path, along the pilasters' faces; its cornice reaches out as far as it is tall (the parts library's `entablature`). */
const EDGE = PORCH.body.half + PORCH.pilaster.projection;
const CORNICE = PORCH.entablature * 0.4;

/**
 * How far the porch reaches along the front from the doorway's middle, and from what height over the main floor: its pedestals, up to their cap; its
 * side pilasters' faces, their capitals a few centimetres more; the entablature's frieze; the cornice's bed mouldings, from the frieze's top
 * (`corniceFrom`) up to the soffit (`soffit`); its corona over the soffit; and its top moulding, the furthest. The cornice's shares are the parts
 * library's (profiles.ts `corniceProfile` with modillions: its bed face 0.24 of its projection out, its soffit at half its height, its corona 0.8 out).
 */
export const PORCH_REACH = {
  pedestals: PORCH.pedestal.outer,
  sides: EDGE,
  frieze: EDGE + PORCH.entablature * 0.012,
  bed: EDGE + 0.24 * CORNICE,
  corona: EDGE + 0.8 * CORNICE,
  cornice: EDGE + CORNICE,
  corniceFrom: PORCH.body.height + PORCH.entablature - CORNICE,
  soffit: PORCH.body.height + PORCH.entablature - CORNICE / 2,
} as const;

/** The door frame's front, out from the brick face: the architrave's face, on the porch body's front, less `DOOR.frame` (1.96 m). */
export const DOOR_FRAME_OUT = PORCH.body.depth + DOOR.proud - DOOR.frame;

/** The porch's frame in the world: the brick face at the doorway's middle on the main floor, its front toward the court. */
const FRAME = placed(B_SOUTH_X, L1, CENTRE_Z, FACING.south);

/** A part placed at (u, y, d) in the porch's frame, turned `yaw` about the vertical: 0 faces the court, −π/2 the west side's way, π/2 the east's. */
function at(u: number, y: number, d: number, yaw = 0): Matrix4 {
  return FRAME.clone().multiply(placed(u, y, d, yaw));
}

/** A box between two corners (u, y, d) of the porch's frame, in either order. */
function box(kit: Kit, material: Material, [u0, y0, d0]: V3, [u1, y1, d1]: V3, order: number): void {
  addBox(kit, material, B_SOUTH_X - d1, L1 + y0, CENTRE_Z + u0, B_SOUTH_X - d0, L1 + y1, CENTRE_Z + u1, order);
}

/** A disc `size` across and `depth` deep standing out of a face, along `toward` (the face's outward axis in the porch's frame) from (u, y, d). */
function disc(u: number, y: number, d: number, toward: '+d' | '-u' | '+u', size: number, depth: number): Matrix4 {
  const turn = new Matrix4().makeRotationX(Math.PI / 2);
  if (toward === '-u') turn.makeRotationZ(Math.PI / 2);
  if (toward === '+u') turn.makeRotationZ(-Math.PI / 2);
  return at(u, y, d).multiply(turn).multiply(new Matrix4().makeScale(size, depth, size));
}

/**
 * A porch pilaster as one piece: Ionic, from its foot on the pedestal, its shaft plain to `plain` over its foot and fluted above, its capital's top at
 * `height` over its foot (fig. 29; interior-images.md #33). Two of the parts library's pilasters share the shaft: the plain one's base and shaft, the
 * fluted one's shaft and capital. Origin as the library's: the bottom centre of its back face, its face toward +Z.
 */
function splitPilaster(width: number, flutes: number, plain: number, height: number): BufferGeometry {
  return memo(`westonPilaster:${keyOf(width, flutes, plain, height)}`, () => {
    const projection = PORCH.pilaster.projection;
    const capital = ORDER_PROPORTIONS.ionic.capital * width;
    const lower = pilasterParts({ order: 'ionic', width, projection, height: plain + capital, fluted: false });
    const upper = pilasterParts({ order: 'ionic', width, projection, height: height - plain, fluted: true, flutes, base: 'none' });
    const b = new MeshBuilder();
    if (lower.base !== undefined) b.append(lower.base);
    b.append(lower.shaft);
    const up = new Matrix4().makeTranslation(0, plain, 0);
    b.append(upper.shaft, up);
    b.append(upper.capital, up);
    return b.build();
  });
}

/**
 * The porch's masonry that stands once, as one piece, in the porch's frame (the core's budget of meshes): the body, a wall whose front is the plane
 * the front pilasters stand on, back to the brick face, with the doorway through it; the doorway's architrave on that front; and the entablature
 * round the front and both sides, back to the wall, with its modillions.
 */
function masonry(): BufferGeometry {
  return memo('westonPorchMasonry', () => {
    const { body } = PORCH;
    const b = new MeshBuilder();
    b.append(openWall({ width: 2 * body.half, height: body.height, thickness: body.depth, holes: [{ width: DOOR.width, height: DOOR.height }] }), placed(0, 0, body.depth));
    b.append(surround({ width: DOOR.width, height: DOOR.height, trim: DOOR.trim, projection: DOOR.proud, sill: false, head: 'none' }), placed(0, 0, body.depth));
    const run = entablature({ path: [[-EDGE, 0, 0], [-EDGE, 0, PORCH.depth], [EDGE, 0, PORCH.depth], [EDGE, 0, 0]], height: PORCH.entablature, modillions: true, dentils: false });
    const on = placed(0, body.height, 0);
    b.append(run.moulding, on);
    if (run.modillion !== undefined) for (const m of run.modillions) b.append(run.modillion, on.clone().multiply(m));
    return b.build();
  });
}

/**
 * The porch's stonework, from its pedestals to the balcony's floor (see the header); its railing is `westonRailing`. Under the facade step's `order`
 * stagger the pedestals come first, then the pilasters, then the body rising to its entablature, the panels and roundels, and the balcony's block.
 */
export function westonPorch(kit: Kit): void {
  const stone = core.westonStone;
  const { body, pedestal: ped, pilaster: p, anta } = PORCH;
  kit.add(masonry(), stone, FRAME, 3);
  // Over the doorway's architrave, up to the capitals, a frieze panel with a row of paterae (#33's band of paterae).
  const panel = { y0: DOOR.height + DOOR.trim + 0.06, y1: body.height - 0.06, d: body.depth + 0.03 };
  box(kit, stone, [-(DOOR.width / 2 + DOOR.trim), panel.y0, body.depth], [DOOR.width / 2 + DOOR.trim, panel.y1, panel.d], 4);
  const roundel = cylinder(20);
  for (let k = -3; k <= 3; k++) kit.add(roundel, stone, disc(k * 0.5, (panel.y0 + panel.y1) / 2, panel.d, '+d', 0.16, 0.05), 4);
  const die = ped.height - ped.cap;
  const front = splitPilaster(p.width, p.flutes, PORCH.fluted - ped.height, body.height - ped.height);
  const narrow = splitPilaster(anta.width, anta.flutes, PORCH.fluted - ped.height, body.height - ped.height);
  for (const s of [-1, 1]) {
    // Pedestals: a die and a cap across the front either side of the doorway, and along the side back to the wall.
    box(kit, stone, [s * ped.inner, 0, body.depth], [s * ped.outer, die, ped.front], 1);
    box(kit, stone, [s * body.half, 0, 0], [s * ped.outer, die, body.depth], 1);
    box(kit, stone, [s * ped.inner, die, body.depth], [s * (ped.outer + 0.04), ped.height, ped.front + 0.04], 1);
    box(kit, stone, [s * body.half, die, 0], [s * (ped.outer + 0.04), ped.height, body.depth], 1);
    // The corner pier's two pilasters, on the front and on the side, and the narrower one against the wall. The corner's two are pieces apart: their
    // shafts meet face to face, but their bases (to 0.12 m over the pedestal for their plinths) and capitals (the top 0.26 m) run into each other
    // there, as one moulding turning the corner would (#33). Every piece stays closed and the walk reads each alone; a cut through the overlap (0.96
    // to 1.32 m or 5.55 to 5.81 m over the main floor) caps each piece it crosses, so there one's stone shows inside the other's cap.
    kit.add(front, stone, at(s * p.u, ped.height, body.depth), 2);
    kit.add(front, stone, at(s * body.half, ped.height, body.depth - p.width / 2, (s * Math.PI) / 2), 2);
    kit.add(narrow, stone, at(s * body.half, ped.height, anta.d, (s * Math.PI) / 2), 2);
    // The blind panel between them: a band at the fluting's foot and a raised frame round the panel above and the one below it, the lower clear of the
    // pilasters' bases (0.36 m, half a width) and the upper of their capitals.
    const d0 = anta.d + anta.width / 2;
    const d1 = body.depth - p.width;
    const face = s * (body.half + 0.025);
    box(kit, stone, [s * body.half, PORCH.fluted - 0.12, d0], [face, PORCH.fluted + 0.12, d1], 4);
    for (const [y0, y1] of [
      [ped.height + p.width / 2 + 0.06, PORCH.fluted - 0.22],
      [PORCH.fluted + 0.22, body.height - 0.35],
    ] as const) {
      for (const [a, b] of [
        [[d0 + 0.08, y0], [d1 - 0.08, y0 + 0.06]],
        [[d0 + 0.08, y1 - 0.06], [d1 - 0.08, y1]],
        [[d0 + 0.08, y0 + 0.06], [d0 + 0.14, y1 - 0.06]],
        [[d1 - 0.14, y0 + 0.06], [d1 - 0.08, y1 - 0.06]],
      ] as const) {
        box(kit, stone, [s * body.half, a[1], a[0]], [face, b[1], b[0]], 4);
      }
    }
  }
  // Inside the entablature, a block that fills it and rises above its cornice as the balcony's floor.
  box(kit, stone, [-EDGE, body.height, 0], [EDGE, PORCH.top, PORCH.depth], 6);
  // The frieze's carving read as its roundels (#33: oval paterae among garlands), on the front and both sides.
  const frieze = { y: body.height + PORCH.entablature * 0.45, out: PORCH.entablature * 0.012 };
  for (let k = -4; k <= 4; k++) kit.add(roundel, stone, disc(k * 0.6, frieze.y, PORCH.depth + frieze.out, '+d', 0.22, 0.04), 5);
  // Four along each side, evenly from 0.45 m off the wall to 0.3 m short of the front, clear of the frieze's mitred corner.
  const side = { from: 0.45, to: PORCH.depth - 0.3, count: 4 };
  for (const s of [-1, 1]) {
    for (let k = 0; k < side.count; k++) {
      const d = side.from + (k * (side.to - side.from)) / (side.count - 1);
      kit.add(roundel, stone, disc(s * (EDGE + frieze.out), frieze.y, d, s < 0 ? '-u' : '+u', 0.22, 0.04), 5);
    }
  }
}

/**
 * The balcony's railing: two rails of copper pipe on posts round the top block's front and sides, its posts 0.15 m in from the block's edges, four
 * across the front (interior-images.md #33 and #35; fig. 110). Its heights and pipe are estimates read against the porch in #33.
 */
export function westonRailing(kit: Kit): void {
  const pipe = cylinder(12);
  const green = palette.copperGreen;
  const r = { u: EDGE - 0.15, front: PORCH.depth - 0.15, back: 0.15, top: 0.9, mid: 0.45, size: 0.05 };
  const posts: (readonly [number, number])[] = [-r.u, -r.u / 3, r.u / 3, r.u].map((u) => [u, r.front] as const);
  posts.push([-r.u, r.back], [r.u, r.back]);
  for (const [u, d] of posts) kit.add(pipe, green, at(u, PORCH.top, d).multiply(new Matrix4().makeScale(r.size, r.top + r.size / 2, r.size)), 8);
  for (const y of [r.top, r.mid]) {
    const along = new Matrix4().makeRotationZ(-Math.PI / 2).multiply(new Matrix4().makeScale(r.size, 2 * r.u, r.size));
    kit.add(pipe, green, at(-r.u, PORCH.top + y, r.front).multiply(along), 8);
    const out = new Matrix4().makeRotationX(Math.PI / 2).multiply(new Matrix4().makeScale(r.size, r.front - r.back, r.size));
    for (const u of [-r.u, r.u]) kit.add(pipe, green, at(u, PORCH.top + y, r.back).multiply(out), 8);
  }
}
