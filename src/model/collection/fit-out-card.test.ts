/**
 * A clicked artwork's card against what the camera still draws of it, in the finished model (docs/design/spec.md, Collection: Labels and Fit-out
 * pieces; work unit 29, review 0, F1): the whole sequence's Timeline with the page's picker and label over it, wired as src/main.ts wires
 * them (`new ArtLabel(artworkPiecesIn(timeline.steps))`, and one cut that the picker and the label's view both read), clicked along the rays of
 * ./fit-out-testing.ts's orbit views.
 * - The Temple of Dendur and its gate are one artwork (The Met's 547802) built by two steps. The gate stands on the terrace, its lowest stones
 *   from 5.26 m; the temple on its base course on the dais, from 6.01 m. The temple clicked and the cut lowered to 5.5 m: the camera draws no stone
 *   of the temple and still the foot of the gate, and the card stays; with the cut under the gate's lowest stone it goes, and the cut off again does
 *   not bring it back.
 * - The gate clicked: the card stays at 5.5 m, where the gate is drawn, and goes with the cut under the gate.
 * - Whichever part was clicked, the card stays while the camera draws the other part alone. From the gate's side no cut makes that state: a cut
 *   draws what lies under it and the gate stands lower than the temple, so the gate is never cut away while the temple shows. The test takes the
 *   clicked part's meshes away as a layer would (by their `visible`), then the other part's, and puts both back.
 * - The class: of all the artworks in the sequence, the only one whose pieces sit in more than one step is the one ./fit-out.ts declares with two
 *   parts; the others' pieces sit in one step, most in several meshes of it. For every artwork the page's pieces are all the instances that carry
 *   its tag, in every step and mesh, and only those.
 * Each state that tells the rules apart is asserted under the rule the page had as well (the pieces of the clicked piece's own step alone, rebuilt
 * here), which loses the card there: the test shows on every run that these states still find the defect.
 * Red (2026-11-11, the mutation made and undone): with `artworkPiecesIn` gathering from the met piece's step alone, the temple's card goes at 5.5 m
 * (the first test), the card of a part taken away goes while the other is drawn (the third) and the temple's pieces found are 320 of its 425 (the
 * fourth); the second, the gate clicked, passes under either rule, as the reachable states from the gate's side do.
 * Bound: one click on each part; the cut is set as a number, not dragged (the cut control by real input is tests/e2e/labels.spec.ts's last
 * block). The picker holds the timeline's pieces alone, without the door layer's stand-ins: no door stands on these rays.
 */
import { Box3, Layers, Matrix4, Ray, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { beforeAll, describe, expect, it } from 'vitest';

import { SEQUENCE } from '../../build/sequence.js';
import { Timeline } from '../../build/timeline.js';
import type { BuiltStep } from '../../build/timeline.js';
import type { Vec3 } from '../../build/types.js';
import { ARTWORK_QUERY, ArtLabel, artworkInstances, drawnPiece } from '../../viewer/art-label.js';
import type { ArtInstance, DrawnView } from '../../viewer/art-label.js';
import { artworkPiecesIn } from '../../viewer/art-pieces.js';
import { ModelPicker } from '../../viewer/pick.js';
import type { PickHit } from '../../viewer/pick.js';
import { GeometryBvhs } from '../../walk/bvh-cache.js';
import { CATALOGUE } from './catalogue.js';
import { FIT_OUT, FIT_OUT_PIECES } from './fit-out.js';
import { DENDUR_FEET, FIT_OUT_VIEWS, orbitPosition } from './fit-out-testing.js';
import type { FitOutView } from './fit-out-testing.js';

const TEMPLE = String(FIT_OUT.templeOfDendur);
/** A cut between the gate's foot and the temple's: the height review 0 named. */
const BETWEEN = 5.5;

let timeline: Timeline;
let picker: ModelPicker;
/** The section cut, one object the picker and the label's view both read, as the page's is (src/main.ts `viewer.cut`). */
const cut = { enabled: false, height: 0 };
const view: DrawnView = { cut, layers: new Layers() };

beforeAll(() => {
  timeline = new Timeline(SEQUENCE);
  picker = new ModelPicker(timeline.steps.flatMap((s) => s.meshes), new GeometryBvhs(), Math.min(0, timeline.bounds.min.y) - 0.5, cut, view.layers, (mesh, i) => timeline.tagOf(mesh, i));
}, 120_000);

const v = (p: Vec3): Vector3 => new Vector3(...p);

function stepOf(id: string): BuiltStep {
  const step = timeline.steps.find((s) => s.def.id === id);
  if (step === undefined) throw new Error(`The sequence has no step "${id}".`);
  return step;
}

function viewOf(step: string): FitOutView {
  const found = FIT_OUT_VIEWS.find((candidate) => candidate.step === step);
  if (found === undefined) throw new Error(`./fit-out-testing.ts has no view of step "${step}".`);
  return found;
}

/** The orbit view's click on `part`'s view, the cut off: the artwork piece the page's click query meets. */
function clickOn(part: string): PickHit {
  cut.enabled = false;
  const at = viewOf(part);
  const from = v(orbitPosition(at));
  const hit = picker.hit(new Ray(from, v(at.click).sub(from).normalize()), ARTWORK_QUERY);
  if (hit?.tag?.id !== TEMPLE || !stepOf(part).meshes.includes(hit.mesh)) throw new Error(`${at.name}: the click met no piece of step ${part}.`);
  return hit;
}

/** A label as the page's, and one under the rule the page had (the pieces of the clicked piece's own step alone), both given the same click. */
function clicked(part: string): { readonly label: ArtLabel; readonly old: ArtLabel } {
  const label = new ArtLabel(artworkPiecesIn(timeline.steps));
  const old = new ArtLabel((hit, id) => {
    const step = timeline.steps.find((s) => s.meshes.includes(hit.mesh));
    return step === undefined ? [{ mesh: hit.mesh, instance: hit.instance }] : artworkInstances(step, id);
  });
  const hit = clickOn(part);
  label.click(hit);
  old.click(hit);
  return { label, old };
}

/** The card `label` shows after a frame with the cut off (`height` null) or at `height` metres. */
function shown(label: ArtLabel, height: number | null): string | null {
  cut.enabled = height !== null;
  cut.height = height ?? 0;
  label.frame(false, view);
  return label.id;
}

/** Whether the camera draws any tagged piece of `part` with the cut at `height`. */
function drawn(part: string, height: number): boolean {
  cut.enabled = true;
  cut.height = height;
  return artworkInstances(stepOf(part), TEMPLE).some((piece) => drawnPiece(piece, view));
}

const bounds = new Map<BufferGeometry, Box3>();
/** The foot of the lowest tagged piece of `part`: each piece's geometry bounds under its instance's matrix, measured here apart from the label. */
function footOf(part: string): number {
  const matrix = new Matrix4();
  return Math.min(...artworkInstances(stepOf(part), TEMPLE).map(({ mesh, instance }) => {
    const local = bounds.get(mesh.geometry) ?? new Box3().setFromBufferAttribute(mesh.geometry.getAttribute('position') as Parameters<Box3['setFromBufferAttribute']>[0]);
    bounds.set(mesh.geometry, local);
    return local.clone().applyMatrix4(matrix.fromArray(mesh.instanceMatrix.array, instance * 16)).min.y;
  }));
}

/** Shows or hides every mesh that holds a tagged piece of `part`. */
function setVisible(part: string, visible: boolean): void {
  for (const mesh of new Set(artworkInstances(stepOf(part), TEMPLE).map((piece) => piece.mesh))) mesh.visible = visible;
}

describe('a clicked artwork’s card against what the camera draws of it, in the finished model', () => {
  it('keeps the Temple of Dendur’s card, the temple clicked, under a cut at 5.5 m that leaves its gate’s foot alone drawn, and loses it under the gate', () => {
    // The two parts stand where ./fit-out-testing.ts says, the gate 0.75 m lower, and 5.5 m lies between their feet.
    expect([footOf('dendur-gate'), footOf('dendur-temple')].map((y) => y.toFixed(3))).toEqual([DENDUR_FEET.gate, DENDUR_FEET.temple].map((y) => y.toFixed(3)));
    expect([DENDUR_FEET.gate.toFixed(2), DENDUR_FEET.temple.toFixed(2)]).toEqual(['5.26', '6.01']);
    expect([drawn('dendur-temple', BETWEEN), drawn('dendur-gate', BETWEEN)], 'at 5.5 m: no stone of the temple drawn, the gate’s foot drawn').toEqual([false, true]);
    const { label, old } = clicked('dendur-temple');
    expect([shown(label, null), shown(old, null)]).toEqual([TEMPLE, TEMPLE]);
    expect(shown(label, 20), 'a cut over it all').toBe(TEMPLE);
    expect(shown(label, DENDUR_FEET.temple + 0.1), 'a cut through the temple’s lowest course').toBe(TEMPLE);
    expect(shown(label, BETWEEN), 'the cut at 5.5 m: the gate is still drawn').toBe(TEMPLE);
    expect(shown(old, BETWEEN), 'the same under the rule the page had: the card lost, the defect').toBeNull();
    expect(shown(label, DENDUR_FEET.gate + 0.01), 'a cut 1 cm over the gate’s foot').toBe(TEMPLE);
    expect(shown(label, DENDUR_FEET.gate - 0.01), 'a cut 1 cm under the gate’s foot, under every piece').toBeNull();
    expect(shown(label, null), 'not back once the cut is off').toBeNull();
  });

  it('keeps it, the gate clicked, at 5.5 m, and loses it under the gate', () => {
    const { label, old } = clicked('dendur-gate');
    expect([shown(label, null), shown(old, null)]).toEqual([TEMPLE, TEMPLE]);
    expect([shown(label, BETWEEN), shown(old, BETWEEN)], 'the gate, clicked, is itself drawn at 5.5 m').toEqual([TEMPLE, TEMPLE]);
    expect([shown(label, DENDUR_FEET.gate - 0.01), shown(old, DENDUR_FEET.gate - 0.01)], 'the cut under the gate').toEqual([null, null]);
  });

  it('keeps it while the camera draws the other part alone, whichever part was clicked, and loses it when neither is drawn', () => {
    const pairs = [['dendur-gate', 'dendur-temple'], ['dendur-temple', 'dendur-gate']] as const;
    const showBoth = (): void => {
      setVisible('dendur-gate', true);
      setVisible('dendur-temple', true);
    };
    try {
      for (const [met, other] of pairs) {
        const { label, old } = clicked(met);
        setVisible(met, false);
        expect([shown(label, null), shown(old, null)], `${met} clicked and taken away, ${other} drawn: the card stays, where the rule the page had loses it`).toEqual([TEMPLE, null]);
        setVisible(other, false);
        expect(shown(label, null), `${met} clicked, neither part drawn`).toBeNull();
        showBoth();
      }
    } finally {
      showBoth();
    }
  });

  it('finds every piece of every artwork, and only the temple’s in more than one step', () => {
    /** Each artwork's tagged instances as the timeline holds them: how many in each step, and the last of them to stand for a click. */
    const held = new Map<string, { readonly steps: Map<string, number>; last: ArtInstance }>();
    for (const step of timeline.steps) {
      step.meshes.forEach((mesh, m) => {
        step.tags[m]?.forEach((tag, instance) => {
          if (tag?.kind !== 'artwork') return;
          const of = held.get(tag.id) ?? { steps: new Map<string, number>(), last: { mesh, instance } };
          of.steps.set(step.def.id, (of.steps.get(step.def.id) ?? 0) + 1);
          of.last = { mesh, instance };
          held.set(tag.id, of);
        });
      });
    }
    expect(held.size, 'every catalogue entry is an artwork of the sequence').toBe(CATALOGUE.length);
    const several = [...held].filter(([, of]) => of.steps.size > 1).map(([id, of]) => `${id}: ${[...of.steps.keys()].sort().join(', ')}`);
    expect(several, 'the artworks built by more than one step are the fit-out pieces declared with more than one part').toEqual(FIT_OUT_PIECES.filter((piece) => piece.parts.length > 1).map((piece) => `${String(piece.id)}: ${piece.parts.map((part) => part.step).sort().join(', ')}`));
    expect(several).toEqual([`${TEMPLE}: dendur-gate, dendur-temple`]);
    // Whichever piece is met (here each artwork's last, so the temple's is in its second step), the pieces are all the tagged instances and no other.
    const piecesOf = artworkPiecesIn(timeline.steps);
    const problems: string[] = [];
    for (const [id, of] of held) {
      const pieces = piecesOf({ mesh: of.last.mesh, instance: of.last.instance, distance: 1, tag: { kind: 'artwork', id } }, id);
      const total = [...of.steps.values()].reduce((sum, n) => sum + n, 0);
      const own = pieces.filter((piece) => {
        const tag = timeline.tagOf(piece.mesh, piece.instance);
        return tag?.kind === 'artwork' && tag.id === id;
      }).length;
      if (pieces.length !== total || own !== total) problems.push(`${id}: ${String(pieces.length)} pieces found, ${String(own)} of them its own, of ${String(total)} tagged`);
    }
    expect(problems).toEqual([]);
  });
});
