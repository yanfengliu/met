/**
 * Every fit-out piece of the collection can be labelled in the finished model (docs/design/spec.md, Collection: Fit-out pieces and Labels): the whole
 * sequence's Timeline at t = N, the page's picker over it (src/viewer/pick.ts, with the timeline's tags) and, for each built part of each piece
 * (./fit-out.ts `FIT_OUT_PIECES`), the views of ./fit-out-testing.ts:
 * - on foot: from an eye 1.6 m over the view's feet, on the part's floor, looking at the view's aim, the walking eye's look target (src/walk/look.ts)
 *   is that artwork, within its 6 m reach: the gate from the terrace, the temple from its forecourt, Diana by her pedestal at the eye's height and by
 *   her figure looked up at, the loggia by a column, the choir screen by a post;
 * - by a click: along the ray from the view's orbit camera through its click point, the orbit view's click query (src/viewer/art-label.ts
 *   `ARTWORK_QUERY`) meets that artwork, the first surface on the ray: the temple, Diana and the screen from the camera presets that show them, the
 *   gate and the loggia, which no preset's view holds, from a camera in their own hall;
 * - what is not the object carries no card: a look at the flagstones of the temple's forecourt, at the base course under the temple, at the rail
 *   before the gate and at a lamp of the court meets an untagged surface within an artwork's reach, and finds no artwork;
 * - the card the page then shows is the record's own (src/ui/art-card.ts `cardContent`, as src/main.ts builds its cards from the catalogue): each
 *   piece's title, maker, date, medium, gallery, size and link, written out here from The Met's records as fetched on 2026-11-11.
 * Every piece has a view of each of its parts, and each view names the part's step, so a part without a view fails here.
 * Red (2026-11-11, each mutation made and undone): Diana's figure added untagged, as it was (the look up at her finds nothing, and the click on her
 * from the court's preset meets an untagged piece at 13.61 m); the court's lamps tagged as Diana, and the gate's rail and the forecourt's flagstones
 * as the temple (each is then met as an artwork within reach).
 * Bound: one eye and one camera per view, which are not shown to be ones the walker reaches (src/model/reach.test.ts walks to each part and looks at
 * it); the pixels of a real click and the card's element are the browser's (tests/e2e/labels.spec.ts). The picker holds the timeline's pieces alone,
 * without the door layer's stand-ins, as ./labels.test.ts's does: no door stands on these rays.
 */
import { Layers, Ray, Vector3 } from 'three';
import { beforeAll, describe, expect, it } from 'vitest';

import { SEQUENCE } from '../../build/sequence.js';
import { Timeline } from '../../build/timeline.js';
import type { Vec3 } from '../../build/types.js';
import { ART_CREDIT, cardContent } from '../../ui/art-card.js';
import { ARTWORK_QUERY } from '../../viewer/art-label.js';
import { ModelPicker } from '../../viewer/pick.js';
import type { PickHit } from '../../viewer/pick.js';
import { GeometryBvhs } from '../../walk/bvh-cache.js';
import { LOOK_REACH, lookTarget } from '../../walk/look.js';
import { MAIN_FLOOR_Y } from '../frame.js';
import { DIANA } from '../roche-north/figures.js';
import { DAIS_Y, GATE_RAIL, PLATFORM_Y, TEMPLE_AXIS_X, TEMPLE_BASE } from '../roche-north/plan.js';
import { FIT_OUT, FIT_OUT_PIECES, fitOutEntryOf } from './fit-out.js';
import { EYE, FIT_OUT_VIEWS, orbitPosition } from './fit-out-testing.js';

let picker: ModelPicker;
let timeline: Timeline;

beforeAll(() => {
  timeline = new Timeline(SEQUENCE);
  timeline.evaluate(timeline.n);
  picker = new ModelPicker(timeline.steps.flatMap((s) => s.meshes), new GeometryBvhs(), Math.min(0, timeline.bounds.min.y) - 0.5, { enabled: false, height: 0 }, new Layers(), (mesh, i) => timeline.tagOf(mesh, i));
}, 120_000);

const v = (p: Vec3): Vector3 => new Vector3(...p);
const eyeOf = (feet: Vec3): Vector3 => new Vector3(feet[0], feet[1] + EYE, feet[2]);
/** The step that built the piece a ray met. */
const stepOf = (hit: PickHit | null): string | null => timeline.steps.find((s) => hit !== null && s.meshes.includes(hit.mesh))?.def.id ?? null;
const told = (hit: PickHit | null): string => (hit === null ? 'nothing' : `${hit.tag === null ? 'an untagged piece' : `${hit.tag.kind} ${hit.tag.id}`} of step ${String(stepOf(hit))} at ${hit.distance.toFixed(2)} m`);

describe('labelling every fit-out piece in the finished model', () => {
  it('has a view of every built part of every fit-out piece', () => {
    const parts = FIT_OUT_PIECES.flatMap((piece) => piece.parts.map((part) => `${String(piece.id)} ${part.step}`)).sort();
    expect([...new Set(FIT_OUT_VIEWS.map((view) => `${String(view.id)} ${view.step}`))].sort()).toEqual(parts);
    // Each view stands on its part's floor, within a step of the level fit-out.ts names for it.
    for (const view of FIT_OUT_VIEWS) {
      const floor = FIT_OUT_PIECES.find((p) => p.id === view.id)?.parts.find((part) => part.step === view.step)?.floor ?? Number.NaN;
      expect(Math.abs(view.feet[1] - floor), view.name).toBeLessThanOrEqual(0.05);
    }
  });

  it('finds each part as the walking eye’s look target, within an artwork’s reach, from the floor before it', () => {
    const problems: string[] = [];
    for (const view of FIT_OUT_VIEWS) {
      const eye = eyeOf(view.feet);
      const look = v(view.aim).sub(eye).normalize();
      const target = lookTarget((ray, query) => picker.hit(ray, query), eye, look);
      if (target?.kind !== 'artwork' || target.id !== String(view.id)) problems.push(`${view.name}: the look target is ${target === null ? 'nothing' : `${target.kind} ${target.id} at ${target.distance.toFixed(2)} m`}`);
      else if (target.distance > LOOK_REACH.artwork) problems.push(`${view.name}: found ${target.distance.toFixed(2)} m off, past the reach`);
      else if (stepOf(target.hit) !== view.step) problems.push(`${view.name}: the eye met a piece of step ${String(stepOf(target.hit))}, not of ${view.step}`);
    }
    expect(problems).toEqual([]);
  });

  it('finds Diana’s own figure looked up at from the floor, not only her pedestal', () => {
    const view = FIT_OUT_VIEWS.find((candidate) => candidate.name.startsWith('Diana’s figure'));
    if (view === undefined) throw new Error('No view of Diana’s figure.');
    const eye = eyeOf(view.feet);
    const target = lookTarget((ray, query) => picker.hit(ray, query), eye, v(view.aim).sub(eye).normalize());
    expect(target?.id).toBe(String(FIT_OUT.diana));
    expect(target?.hit.mesh.geometry, 'the piece met is the figure').toBe(DIANA);
    expect(target?.distance ?? Number.POSITIVE_INFINITY).toBeLessThan(LOOK_REACH.artwork);
  });

  it('finds each part as the click query’s answer from an orbit camera that sees it', () => {
    const problems: string[] = [];
    for (const view of FIT_OUT_VIEWS) {
      const from = v(orbitPosition(view));
      const ray = new Ray(from, v(view.click).sub(from).normalize());
      const clicked = picker.hit(ray, ARTWORK_QUERY);
      const first = picker.hit(ray);
      if (clicked?.tag?.id !== String(view.id) || stepOf(clicked) !== view.step) problems.push(`${view.name}: the click query meets ${told(clicked)}; the first surface on the ray is ${told(first)}`);
      // Nothing stands before it on the ray, and the camera sees it from outside an artwork's walking reach, as an orbit view does.
      else if (first === null || Math.abs(first.distance - clicked.distance) > 1e-6) problems.push(`${view.name}: the click meets it at ${clicked.distance.toFixed(2)} m, behind ${told(first)}`);
      else if (clicked.distance <= LOOK_REACH.artwork) problems.push(`${view.name}: the orbit camera stands ${clicked.distance.toFixed(2)} m from it, inside the walking reach`);
    }
    expect(problems).toEqual([]);
  });

  it('labels nothing that is not the object: the forecourt’s flagstones, the base course under the temple, the rail before the gate, a lamp of the court', () => {
    const F = MAIN_FLOOR_Y;
    /** Standing in the forecourt 3 m before the temple's front, where the temple's view stands. */
    const forecourt: Vec3 = [TEMPLE_AXIS_X + 2.75, DAIS_Y + 0.04 + EYE, TEMPLE_BASE.maxZ + 1.955];
    const looks: readonly (readonly [string, Vec3, Vec3])[] = [
      // Down at the flagstones 1.2 m before the feet, and at the east face of the base course the temple stands on, 0.1 m over the dais.
      ['the forecourt’s flagstones', forecourt, [forecourt[0], DAIS_Y + 0.02, forecourt[2] - 1.2]],
      ['the base course under the temple', forecourt, [forecourt[0], DAIS_Y + 0.1, TEMPLE_BASE.maxZ]],
      // Down at the top rail before the gate's front, from the terrace on the axis.
      ['the rail before the gate', [TEMPLE_AXIS_X, PLATFORM_Y + EYE, GATE_RAIL.z + 2], [TEMPLE_AXIS_X, PLATFORM_Y + GATE_RAIL.height - 0.02, GATE_RAIL.z]],
      // At the post of the lamp standard west of Diana (roche-north/engelhard.ts: X 70.5, 3 m in from the court's west edge), from 2 m north of it.
      ['a lamp of the court', [72.5, F + EYE, -124.53], [70.5, F + 1.2, -124.53]],
    ];
    for (const [name, from, to] of looks) {
      const eye = v(from);
      const look = v(to).sub(eye).normalize();
      const met = picker.hit(new Ray(eye, look));
      expect(met === null ? null : met.tag, `${name}: the first surface on the ray carries no tag (met ${told(met)})`).toBeNull();
      expect(met?.distance ?? Number.POSITIVE_INFINITY, `${name}: within an artwork's reach, so a tag there would show a card`).toBeLessThan(LOOK_REACH.artwork);
      expect(lookTarget((ray, query) => picker.hit(ray, query), eye, look), name).toBeNull();
    }
  });

  it('shows each piece’s card from its record: title, maker, date, medium, gallery, size and link, as The Met gave them', () => {
    const cards = FIT_OUT_PIECES.map((piece) => {
      const { id, title, maker, date, medium, gallery, size, url } = cardContent(fitOutEntryOf(piece.id));
      return [id, title, maker, date, medium, gallery, size, url];
    });
    expect(cards).toEqual([
      // The record names no artist and no culture, so the card shows its date alone; "completed by 10 CE" is the record's own objectDate string.
      ['547802', 'The Temple of Dendur', null, 'completed by 10 CE', 'Aeolian sandstone', 'Gallery 131', 'H 640.1 × W 640.1 × D 1249.7 cm', 'https://www.metmuseum.org/art/collection/search/547802'],
      ['11998', 'Diana', 'Augustus Saint-Gaudens', '1892–93, cast 1928', 'Bronze, gilt', 'Gallery 700', 'H 258.4 × W 135.9 × D 35.9 cm', 'https://www.metmuseum.org/art/collection/search/11998'],
      // "Fravrile" is the record's spelling; the depths of the loggia and of the screen are the model's, which the card names as estimated.
      ['133', 'Architectural Elements from Laurelton Hall, Oyster Bay, New York', 'Louis C. Tiffany', 'ca. 1905', 'Limestone, ceramic, and Fravrile glass', 'Gallery 701', 'H 640.1 × W 701 × D 533 cm, depth estimated', 'https://www.metmuseum.org/art/collection/search/133'],
      ['201926', 'Choir screen from the Cathedral of Valladolid', 'Rafal Amezúa', 'completed ca. 1763', 'Iron: gilded and painted; limestone (base)', 'Gallery 305', 'H 1585 × W 1280.2 × D 50 cm, depth estimated', 'https://www.metmuseum.org/art/collection/search/201926'],
    ]);
    expect(ART_CREDIT).toBe('Object data: The Met Open Access, CC0');
  });
});
