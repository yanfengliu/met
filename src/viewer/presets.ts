/**
 * Camera presets (docs/design/spec.md, Page: View menu). Pure data and math, no DOM, so tests can check that every `focus.preset` names one.
 * A `fit` preset looks at the centre of the model's bounds from a direction, as close as it can with the whole box in view; it works for any model.
 * A `look` preset is an explicit camera in world metres: the `ref-*` and `int-*` ones are the research proposals (docs/research/exterior-images.md,
 * "Primary images and camera presets"; docs/research/interior-images.md, "Primary images"), to be nudged until renders line up with the photographs.
 * World frame: +X north (up Fifth Avenue), +Z east (toward Fifth Avenue; the main facade faces +Z), +Y up.
 */
import { MathUtils, Matrix4, Sphere, Vector3 } from 'three';
import type { Box3 } from 'three';

import type { Vec3 } from '../build/types.js';
import { GROUND_FLOOR_Y as LG, MAIN_FLOOR_Y as L1, SECOND_FLOOR_Y as L2 } from '../model/frame.js';

/** The vertical field of view when a preset sets none, in degrees. */
export const DEFAULT_FOV = 45;

export type PresetCamera =
  | { readonly kind: 'fit'; readonly direction: Vec3; readonly margin?: number }
  | {
      readonly kind: 'look';
      readonly position: Vec3;
      readonly target: Vec3;
      /** Vertical field of view in degrees; default DEFAULT_FOV. */
      readonly fov?: number;
      /** Screen-up direction for a view straight down or up, where +Y cannot be up; otherwise +Y. */
      readonly up?: Vec3;
    };

export interface ViewPreset {
  readonly id: string;
  readonly label: string;
  readonly group: 'exterior' | 'interior';
  readonly camera: PresetCamera;
}

const EYE = 1.6;
const look = (position: Vec3, target: Vec3, fov: number, up?: Vec3): PresetCamera => (up === undefined ? { kind: 'look', position, target, fov } : { kind: 'look', position, target, fov, up });
// The int-* proposals were measured on the decoded floor map, whose frame sits 3.1 m +Z of the world frame (docs/research/interior.md, correction of 2026-10-11).
const MAP_Z_SHIFT = -3.1;
const mapLook = (p: Vec3, t: Vec3, fov: number): PresetCamera => look([p[0], p[1], p[2] + MAP_Z_SHIFT], [t[0], t[1], t[2] + MAP_Z_SHIFT], fov);

export const PRESETS: readonly ViewPreset[] = [
  { id: 'front', label: 'Front, from Fifth Avenue', group: 'exterior', camera: { kind: 'fit', direction: [0, 0.16, 1], margin: 1 } },
  { id: 'aerial-ne', label: 'Aerial from north-east', group: 'exterior', camera: { kind: 'fit', direction: [1, 0.85, 1] } },
  { id: 'aerial-sw', label: 'Aerial from south-west', group: 'exterior', camera: { kind: 'fit', direction: [-1, 0.85, -1] } },
  // Slightly south of straight down, so north (+X) is up on screen.
  { id: 'top', label: 'Top, north up', group: 'exterior', camera: { kind: 'fit', direction: [-0.002, 1, 0], margin: 1.02 } },
  { id: 'ref-front-axis', label: 'Photo: front on the axis', group: 'exterior', camera: look([0, 1.7, 44], [0, 14, 0], 50) },
  { id: 'ref-front-street', label: 'Photo: front from the street', group: 'exterior', camera: look([2, 1.6, 44.5], [0, 11.9, 0], 52) },
  { id: 'ref-column-pair-north', label: 'Photo: north column pair', group: 'exterior', camera: look([60, 1.6, 40], [27, 20, 2], 14) },
  { id: 'ref-entrance-up', label: 'Photo: central arch from the landing', group: 'exterior', camera: look([-2, 5.3, 7], [0, 17, 0], 70) },
  { id: 'ref-fountain-north', label: 'Photo: from the north fountain', group: 'exterior', camera: look([46, 1.4, 21], [5, 9, 2], 55) },
  { id: 'ref-park-south', label: 'Photo: south side from the park', group: 'exterior', camera: look([-200, 3, -92], [-151.6, 9, -68], 50) },
  { id: 'ref-park-northwest', label: 'Photo: American Wing from the park', group: 'exterior', camera: look([175, 6, -140], [140, 12, -125], 50) },
  // Moved inside the site (SITE_MAX_X 200) from the research's (230, 6, -110); the fov narrows from 55 so the Sackler glass round the target keeps its size.
  { id: 'ref-park-north', label: 'Photo: north side from the park', group: 'exterior', camera: look([198, 6, -104], [153, 12, -72], 37) },
  // Park at the top, Fifth Avenue at the bottom, north to the right.
  { id: 'ref-plan-ortho', label: 'Photo: plan from above', group: 'exterior', camera: look([0, 600, -85], [0, 0, -85], 30, [0, 0, -1]) },
  { id: 'int-great-hall-balcony-south', label: 'Great Hall from the north balcony', group: 'interior', camera: mapLook([28.5, L2 + EYE, -14.5], [-30, L1 + 4, -14.5], 46) },
  { id: 'int-great-hall-floor-north', label: 'Great Hall floor, looking north', group: 'interior', camera: mapLook([-2, L1 + EYE, -12], [30, L1 + 9, -14.5], 55) },
  { id: 'int-grand-stair-west', label: 'Grand Staircase, looking west', group: 'interior', camera: mapLook([0, L2 + EYE, -27], [0, L2 + 3, -62], 68) },
  { id: 'int-dendur-se', label: 'Temple of Dendur from the south-east', group: 'interior', camera: mapLook([116, L1 + EYE, -55], [138, L1 + 5, -84], 46) },
  { id: 'int-engelhard-north', label: 'American Wing court, looking north', group: 'interior', camera: mapLook([60, L1 + EYE, -112.4], [94, L1 + 8, -112.4], 55) },
  { id: 'int-greek-roman-court', label: 'Greek and Roman court', group: 'interior', camera: mapLook([-136, L1 + EYE, -3], [-104, L1 + 2.5, -11], 45) },
  { id: 'int-arms-armor-court', label: 'Arms and Armor court', group: 'interior', camera: mapLook([58.5, L1 + EYE, -76.3], [93, L1 + 4.5, -76.3], 50) },
  { id: 'int-medieval-hall-east', label: 'Medieval Sculpture Hall, looking east', group: 'interior', camera: mapLook([0, L1 + EYE, -117], [0, L1 + 7, -80], 60) },
  { id: 'int-lehman-pyramid-up', label: 'Lehman Wing court, looking up', group: 'interior', camera: mapLook([0, LG + EYE, -147.7], [0.01, LG + 30, -147.69], 60) },
];

/** The preset the page opens with when the query names none. */
export const DEFAULT_PRESET = 'aerial-ne';

export function presetById(id: string): ViewPreset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}

export interface CameraPose {
  readonly position: Vector3;
  readonly target: Vector3;
  /** Vertical field of view in degrees. */
  readonly fov: number;
}

const UP = new Vector3(0, 1, 0);

/**
 * A camera looking at the centre of `box` from `direction` (toward the camera), as close as it can be with every corner of the box inside the view,
 * then `margin` times that distance. Tighter than a sphere fit for flat sites.
 */
export function fitBox(box: Box3, direction: Vector3, fovDeg: number, aspect: number, margin = 1): CameraPose {
  const centre = box.getCenter(new Vector3());
  const back = direction.clone().normalize();
  const basis = new Matrix4().lookAt(back, new Vector3(), Math.abs(back.y) > 0.999 ? new Vector3(1, 0, 0) : UP);
  const right = new Vector3().setFromMatrixColumn(basis, 0);
  const up = new Vector3().setFromMatrixColumn(basis, 1);
  const tanY = Math.tan(MathUtils.degToRad(fovDeg) / 2);
  const tanX = tanY * aspect;
  let distance = 0;
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        const v = new Vector3(x, y, z).sub(centre);
        const depth = v.dot(back);
        distance = Math.max(distance, depth + Math.abs(v.dot(right)) / tanX, depth + Math.abs(v.dot(up)) / tanY);
      }
    }
  }
  return { position: centre.clone().addScaledVector(back, Math.max(distance, 5) * margin), target: centre, fov: fovDeg };
}

/**
 * Where a preset puts the camera for a model with `bounds`, seen at `aspect`. The orbit controls keep +Y up, so a straight-down or straight-up view
 * with another `up` is taken from a hair beside the axis, on the side that turns that `up` to the top of the screen (the same image).
 */
export function resolvePreset(preset: ViewPreset, bounds: Box3, aspect: number): CameraPose {
  const camera = preset.camera;
  if (camera.kind === 'look') {
    const position = new Vector3(...camera.position);
    const target = new Vector3(...camera.target);
    if (camera.up !== undefined) position.addScaledVector(new Vector3(...camera.up).normalize(), -1e-3 * position.distanceTo(target));
    return { position, target, fov: camera.fov ?? DEFAULT_FOV };
  }
  const box = bounds.isEmpty() ? new Sphere(new Vector3(), 50).getBoundingBox(bounds.clone()) : bounds;
  return fitBox(box, new Vector3(...camera.direction), DEFAULT_FOV, aspect, camera.margin ?? 1.05);
}
