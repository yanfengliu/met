/**
 * Every placeholder can be labelled in the finished model (docs/design/spec.md, Collection: Labels): the whole sequence's Timeline at t = N, the page's
 * picker over it (src/viewer/pick.ts, with the timeline's tags) and, for each of the 94 artworks, a visitor standing before it: the eye 1.6 m over the
 * floor its placement names, `STAND` metres out from the object's front along the way it faces, looking at the object's middle. From there the walking
 * eye's look target (src/walk/look.ts) is that artwork, within its 6 m reach, and so is what the orbit view's click query (src/viewer/art-label.ts
 * `ARTWORK_QUERY`) meets along the same ray: no wall, glass that is no artwork's, or other artwork stands between, and a vitrine's glass answers for
 * the object inside it.
 * Bound: one eye per artwork, on its axis, which is not shown to be one the walker reaches (src/model/reach.test.ts shows each artwork the look target
 * from a place the walker reaches; review 17, F44); artworks seen from the side or from far off are the e2e's (tests/e2e/labels.spec.ts) and the hit
 * query's own tests'. The ray's endpoint is the object's middle, which a hollow form could miss, so the test asks for the artwork's tag, not for the object piece.
 */
import { Layers, Ray, Vector3 } from 'three';
import { beforeAll, describe, expect, it } from 'vitest';

import { SEQUENCE } from '../../build/sequence.js';
import { Timeline } from '../../build/timeline.js';
import { ARTWORK_QUERY } from '../../viewer/art-label.js';
import { ModelPicker } from '../../viewer/pick.js';
import { GeometryBvhs } from '../../walk/bvh-cache.js';
import { LOOK_REACH, lookTarget } from '../../walk/look.js';
import { artworkPieces, entryOf } from './place.js';
import type { CollectionStepDef } from './place.js';
import { SPACES_A } from './spaces-a.js';
import { SPACES_B } from './spaces-b.js';

const DEFS: readonly CollectionStepDef[] = [...SPACES_A, ...SPACES_B];
/** How far before the object's front the visitor stands, metres: a step back from the plinth, well inside the look target's reach. */
const STAND = 1.5;
const EYE = 1.6;

let picker: ModelPicker;

beforeAll(() => {
  const timeline = new Timeline(SEQUENCE);
  timeline.evaluate(timeline.n);
  picker = new ModelPicker(timeline.steps.flatMap((s) => s.meshes), new GeometryBvhs(), Math.min(0, timeline.bounds.min.y) - 0.5, { enabled: false, height: 0 }, new Layers(), (mesh, i) => timeline.tagOf(mesh, i));
}, 120_000);

describe('labelling every placeholder in the finished model', () => {
  it(`finds each artwork as the look target and as the click query's answer from ${String(STAND)} m before it`, () => {
    const problems: string[] = [];
    let checked = 0;
    for (const def of DEFS) {
      for (const at of def.placements) {
        const entry = entryOf(at.id);
        const object = artworkPieces(entry, at)[0];
        if (object === undefined) {
          problems.push(`${String(at.id)}: no pieces`);
          continue;
        }
        const middle = new Vector3(0, 0.5, 0).applyMatrix4(object.matrix);
        const front = new Vector3(Math.sin(at.facing), 0, Math.cos(at.facing));
        const eye = new Vector3(middle.x, at.floor + EYE, middle.z).addScaledVector(front, entry.size.d / 2 + STAND);
        const look = middle.clone().sub(eye).normalize();
        const name = `${def.space} ${String(at.id)} (${entry.title.slice(0, 40)})`;
        const target = lookTarget((ray, query) => picker.hit(ray, query), eye, look);
        if (target?.kind !== 'artwork' || target.id !== String(at.id)) problems.push(`${name}: the look target is ${target === null ? 'nothing' : `${target.kind} ${target.id} at ${target.distance.toFixed(2)} m`}`);
        else if (target.distance > LOOK_REACH.artwork) problems.push(`${name}: found ${target.distance.toFixed(2)} m off, past the reach`);
        const clicked = picker.hit(new Ray(eye, look), ARTWORK_QUERY);
        if (clicked?.tag?.id !== String(at.id)) problems.push(`${name}: the click query meets ${clicked === null ? 'nothing' : `${String(clicked.tag?.kind)} ${String(clicked.tag?.id)}`}`);
        checked += 1;
      }
    }
    expect(checked).toBe(94);
    expect(problems).toEqual([]);
  });
});
