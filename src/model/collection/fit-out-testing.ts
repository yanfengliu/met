/**
 * Test helpers for the fit-out pieces of the collection (imported only by tests: ./fit-out-labels.test.ts and tests/e2e/labels-landmarks.ts): for each
 * built part (./fit-out.ts `FIT_OUT_PIECES`), where a visitor stands before it and the point of it the eye looks at, and an orbit camera that sees
 * it with a point of it a click is made on. Positions are world metres from the model's own sources, each named, never from the floor map directly.
 * ./fit-out-labels.test.ts shows every view's rays meet the part in the finished model, so the browser tests stand where the model was checked.
 */
import type { Vec3 } from '../../build/types.js';
import { PRESETS } from '../../viewer/presets.js';
import { SCREEN_Z } from '../core/constants.js';
import { MAIN_FLOOR_Y } from '../frame.js';
import { BANK_DOOR_Z, COURT, DAIS_Y, GATE_DEPTH, GATE_Z, PLATFORM_Y, TEMPLE_AXIS_X, TEMPLE_BASE, TEMPLE_LENGTH, TEMPLE_WIDTH } from '../roche-north/plan.js';
import { FIT_OUT } from './fit-out.js';

/** The eye's height over the feet (src/walk/walker.ts `BODY.eye`), restated so this file imports no walk code. */
export const EYE = 1.6;

/** One way of looking at a built part of a fit-out piece: on foot, and from an orbit camera. */
export interface FitOutView {
  /** The Met's object ID of the piece. */
  readonly id: number;
  /** The part's build step (./fit-out.ts `FIT_OUT_PIECES`). */
  readonly step: string;
  readonly name: string;
  /** Where the visitor's feet stand, on the floor before the part, within an artwork's 6 m reach of `aim`. */
  readonly feet: Vec3;
  /** The point of the part the eye looks at, from `EYE` over the feet. */
  readonly aim: Vec3;
  /** An orbit camera that sees the part: a camera preset's, by its id, where one shows it; else a camera of the tests' own in the same hall. */
  readonly orbit: { readonly preset: string } | { readonly position: Vec3 };
  /** A point of the part seen from that camera, which an orbit-view click is made on. */
  readonly click: Vec3;
}

const F = MAIN_FLOOR_Y;
/** The temple's front (east) face: its base's middle along the axis plus half its length (roche-north/sackler.ts `temple`). */
const TEMPLE_Z = (TEMPLE_BASE.minZ + TEMPLE_BASE.maxZ) / 2;
const TEMPLE_FRONT_Z = TEMPLE_Z + TEMPLE_LENGTH / 2;
/** The temple stands on its base course, 0.15 m over the dais (roche-north/sackler.ts `temple`). */
const TEMPLE_FOOT_Y = DAIS_Y + 0.15;
/** The gate's front (east) face, toward the terrace. */
const GATE_FRONT_Z = GATE_Z + GATE_DEPTH / 2;
/**
 * The foot of the lowest stone of each part of the Temple of Dendur that carries its tag, world metres: the gate stands on the terrace's flagstones,
 * 0.15 m over the platform (roche-north/sackler.ts `gate`), the temple on its base course on the dais, 0.75 m higher. A section cut between the two
 * draws the foot of the gate and nothing of the temple, though they are one artwork (./fit-out-card.test.ts holds both numbers against the
 * finished model's pieces).
 */
export const DENDUR_FEET = { gate: PLATFORM_Y + 0.15, temple: TEMPLE_FOOT_Y } as const;
/** Diana's pedestal (roche-north/engelhard.ts `sculpture`): its axis, the half-width of its shaft and the height of its top, where the figure stands. */
const DIANA = { x: 71.0, z: BANK_DOOR_Z - 2.2, half: 0.5, top: F + 4.3, scale: 2.58 } as const;
/** The loggia's front, the plane of its columns' faces toward the court (roche-north/engelhard.ts `loggia`), and its lintel's foot. */
const LOGGIA_FRONT_X = COURT.minX - 0.25;
const LOGGIA_LINTEL_Y = F + 0.32 + 3.4 + 0.6;

export const FIT_OUT_VIEWS: readonly FitOutView[] = [
  {
    // From the terrace, 3 m before the gate's north pier (1.0 to 2.3 m off the axis), at the eye's height on its front face; clicked on that pier,
    // 4 m up, from a camera over the terrace: no preset's view holds the gate.
    id: FIT_OUT.templeOfDendur,
    step: 'dendur-gate',
    name: 'the gate of the Temple of Dendur, from the terrace',
    feet: [TEMPLE_AXIS_X + 1.65, PLATFORM_Y, GATE_FRONT_Z + 3],
    aim: [TEMPLE_AXIS_X + 1.65, PLATFORM_Y + EYE, GATE_FRONT_Z],
    orbit: { position: [TEMPLE_AXIS_X + 6, PLATFORM_Y + 7, GATE_FRONT_Z + 14] },
    click: [TEMPLE_AXIS_X + 1.65, PLATFORM_Y + 4, GATE_FRONT_Z],
  },
  {
    // From the forecourt on the dais, 3 m before the end of the temple's north side wall (2.3 to 3.2 m off the axis) on its front; clicked on the
    // south wall's outer face, 2 m up and 2 m west of its middle, clear of the side door, from the Dendur preset.
    id: FIT_OUT.templeOfDendur,
    step: 'dendur-temple',
    name: 'the Temple of Dendur, from its forecourt',
    feet: [TEMPLE_AXIS_X + 2.75, DAIS_Y + 0.04, TEMPLE_FRONT_Z + 3],
    aim: [TEMPLE_AXIS_X + 2.75, DAIS_Y + 0.04 + EYE, TEMPLE_FRONT_Z],
    orbit: { preset: 'int-dendur-se' },
    click: [TEMPLE_AXIS_X - TEMPLE_WIDTH / 2, TEMPLE_FOOT_Y + 2, TEMPLE_Z - 2],
  },
  {
    // From the court's floor 3 m north of the pedestal, at the eye's height on its shaft; clicked on the figure's hips, 0.52 of her height up her
    // axis, where she is widest, from the court's preset.
    id: FIT_OUT.diana,
    step: 'engelhard-sculpture',
    name: 'Diana’s pedestal, from the court’s floor',
    feet: [DIANA.x + DIANA.half + 3, F, DIANA.z],
    aim: [DIANA.x + DIANA.half, F + EYE, DIANA.z],
    orbit: { preset: 'int-engelhard-north' },
    click: [DIANA.x, DIANA.top + 0.52 * DIANA.scale, DIANA.z],
  },
  {
    // The figure herself from the same place: the eye turned up to her torso, 0.6 of her height up her axis, 5.6 m off.
    id: FIT_OUT.diana,
    step: 'engelhard-sculpture',
    name: 'Diana’s figure, looked up at from the court’s floor',
    feet: [DIANA.x + DIANA.half + 3, F, DIANA.z],
    aim: [DIANA.x, DIANA.top + 0.6 * DIANA.scale, DIANA.z],
    orbit: { preset: 'int-engelhard-north' },
    click: [DIANA.x - DIANA.half, F + 2.5, DIANA.z],
  },
  {
    // From the court's floor 3 m before the loggia's column 1.375 m north of its axis, at the eye's height; clicked on its lintel over the Favrile
    // band, from a camera in the court: the court's preset stands inside the loggia, looking out.
    id: FIT_OUT.laureltonLoggia,
    step: 'engelhard-loggia',
    name: 'the loggia from Laurelton Hall, from the court',
    feet: [LOGGIA_FRONT_X + 3.05, F, BANK_DOOR_Z + 1.375],
    aim: [LOGGIA_FRONT_X - 0.15, F + EYE, BANK_DOOR_Z + 1.375],
    orbit: { position: [76, F + 7, BANK_DOOR_Z] },
    click: [LOGGIA_FRONT_X + 0.15, LOGGIA_LINTEL_Y + 0.9, BANK_DOOR_Z + 1],
  },
  {
    // From the nave 3 m east of the screen, before the post 3.2 m north of its axis, at the eye's height; clicked on the lowest frieze's gilt
    // cornice on the west face, from the hall's preset.
    id: FIT_OUT.choirScreen,
    step: 'medieval-hall-choir-screen',
    name: 'the choir screen from Valladolid, from the nave',
    feet: [3.2, F, SCREEN_Z + 3],
    aim: [3.2, F + EYE, SCREEN_Z],
    orbit: { preset: 'int-medieval-hall-east' },
    click: [3, F + 4.87, SCREEN_Z - 0.16],
  },
];

/** The orbit camera's position of `view`: its preset's, which must be an explicit camera, or its own. */
export function orbitPosition(view: FitOutView): Vec3 {
  if ('position' in view.orbit) return view.orbit.position;
  const id = view.orbit.preset;
  const preset = PRESETS.find((p) => p.id === id);
  if (preset?.camera.kind !== 'look') throw new Error(`${view.name}: "${id}" is no camera preset with a position of its own (src/viewer/presets.ts).`);
  return preset.camera.position;
}
